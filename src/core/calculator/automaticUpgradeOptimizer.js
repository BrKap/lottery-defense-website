import * as jewelConstants from '../../data/euna/calculator/jewelConstants';
import * as mainConstants from '../../data/euna/calculator/mainConstants';
import * as runeConstants from '../../data/euna/calculator/runeConstants';
import * as upgradeConstants from '../../data/euna/calculator/spUpgradeConstants';
import * as unitConstants from '../../data/euna/calculator/unitConstants';
import { CLASSIC_ENEMIES, TOC_ENEMIES } from '../../data/euna/calculator/enemyConstants';
import { calculateBattle } from './battleCalculation';
import { calculateWaveBudget } from './resourceCalculation';
import { resolveScenario } from './scenarioCalculator';
import { calculateProfileStats } from './statCalculator';
import { calculateUpgradeRecommendations } from './upgradeOptimizer';
import { buildInitialInvestments, calculateUpgradeTotals, getNextUpgradePrice, getTotalUpgradePrice, sanitizeInvestmentValue } from './spUpgradeHelpers';

const defaultConfig = {
  ...mainConstants, ...jewelConstants, ...runeConstants, ...upgradeConstants, ...unitConstants,
  unitLibrary: unitConstants.UNIT_LIBRARY,
};

export const OPTIMIZATION_STRATEGIES = [
  { id: 'full-greedy', label: 'Build-aware greedy' },
  { id: 'amon-greedy', label: 'Amon estimate (automatic)' },
  { id: 'beam', label: 'Bounded lookahead' },
];

// A stat needs a verified route into the existing battle or requirement model.
// Economy, unimplemented OTHER effects, and bank levels remain manual base only.
const combatStats = new Set([
  'attackDamage', 'attackSpeed', 'critChance', 'critDamage', 'multiCrit',
  'acceleration', 'finalDamage', 'armorPen', 'skillDamage', 'multiTargetDamage',
  'multiTargetChance', 'multiTargetMultiCrit', 'armorReduction',
  'shieldReduction', 'healthReduction', 'cooldown',
  'raceUpgradeTBio', 'raceUpgradeTMech', 'raceUpgradePBio',
  'raceUpgradePMech', 'raceUpgradeZerg', 'raceUpgradeNeutral',
  'raceUpgradeCapBonus',
]);
const finiteNonnegative = value => Number.isFinite(value) && value >= 0;
const progressEvery = 24;
const TOLERANCE = 1e-10;
const cancelledResult = () => ({ status: 'cancelled', reason: 'Optimization was cancelled.' });

function cleanInvestments(investments, groups) {
  const result = buildInitialInvestments(groups);
  for (const group of groups) for (const upgrade of group.upgrades) {
    result[group.id][upgrade.id] = sanitizeInvestmentValue(upgrade, investments?.[group.id]?.[upgrade.id] ?? 0);
  }
  return result;
}

function withLevel(investments, candidate, level) {
  return { ...investments, [candidate.groupId]: { ...investments[candidate.groupId], [candidate.upgradeId]: level } };
}

function levelOf(investments, candidate) {
  return investments[candidate.groupId]?.[candidate.upgradeId] ?? 0;
}

function scoreFromArmy(army) {
  if (army.status !== 'supported' || army.incomplete || !finiteNonnegative(army.primaryCoverage) || !finiteNonnegative(army.primaryDps)) return null;
  return {
    coverage: army.primaryCoverage,
    primaryDps: army.primaryDps,
    requiredDps: army.scenario.requiredDps,
    spellInclusiveDps: army.spellInclusiveDps,
    spellCoverage: army.spellCoverage,
  };
}

function makeReferenceUnit() {
  return { entryId: 'optimizer-reference-amon', unitId: 'amon', count: 1, rank: 'X', level: 11,
    armor: 500, lb: 0, jewel: 'none', xnkFixedAttacks: true };
}

function scoreCandidate(snapshot, investments, units, config, settings, resolved) {
  const runeLoadouts = snapshot.runeLoadouts ?? [];
  const activeRune = runeLoadouts.find(rune => rune.slot === settings.runeSlot) ?? runeLoadouts[0];
  const profile = calculateProfileStats({
    runeLoadouts: activeRune ? [activeRune] : [],
    spInvestments: investments,
    difficultyState: { difficulty: settings.difficulty, title: settings.title, ...resolved.difficulty },
    tormentState: { level: settings.torment, ...resolved.torment },
    buffState: snapshot.buffs,
    calculatorSettings: settings,
    resourceSettings: snapshot.resourceSettings,
    units,
    sandboxState: snapshot.sandboxState,
    additionalRuneState: snapshot.additionalRuneState,
    ownedRuneLoadouts: runeLoadouts,
    runeConstants: config,
    upgradeGroupMap: config.UPGRADE_GROUP_MAP,
  });
  const army = calculateBattle({ units, profile, settings, buffs: snapshot.buffs, jewels: snapshot.jewels ?? [], config });
  return { army, score: scoreFromArmy(army) };
}

function candidateDefinitions(groups) {
  return groups.flatMap((group, groupIndex) => group.upgrades.flatMap((upgrade, upgradeIndex) => {
    if (!combatStats.has(upgrade.statKey) || !['SP', 'EP'].includes(group.currency)) return [];
    return [{ groupId: group.id, upgradeId: upgrade.id, name: upgrade.name,
      currency: group.currency, groupIndex, upgradeIndex, upgrade }];
  }));
}

function compareMoves(a, b) {
  if (Math.abs(a.priority - b.priority) > TOLERANCE) return b.priority - a.priority;
  if (Math.abs(a.gain - b.gain) > TOLERANCE) return b.gain - a.gain;
  if (a.price !== b.price) return a.price - b.price;
  return a.definition.groupIndex - b.definition.groupIndex || a.definition.upgradeIndex - b.definition.upgradeIndex;
}

function buildCheckpoints(settings, targetRound) {
  const enemyTable = settings.tocMode ? TOC_ENEMIES : CLASSIC_ENEMIES;
  return Object.keys(enemyTable).map(Number).filter(wave => wave <= targetRound).sort((a, b) => a - b);
}

function makeStep(move, wave, scoreBefore, scoreAfter) {
  return { wave, groupId: move.definition.groupId, upgradeId: move.definition.upgradeId,
    name: move.definition.name, currency: move.definition.currency, fromLevel: move.fromLevel,
    toLevel: move.fromLevel + 1, price: move.price, scoreBefore, scoreAfter,
    scoreContext: 'wave-scenario' };
}

/**
 * Optimize paid levels while preserving every manual base level. The search is
 * bounded and asynchronous so a Worker can publish progress and receive cancel.
 * Final scores always come from calculateProfileStats -> calculateBattle.
 */
export async function optimizeUpgrades(snapshot, { onProgress = () => {}, shouldCancel = () => false } = {}) {
  const startedAt = performance.now();
  const config = snapshot.config ?? defaultConfig;
  const groups = config.UPGRADE_GROUPS ?? [];
  const strategyId = snapshot.strategyId ?? 'full-greedy';
  if (!OPTIMIZATION_STRATEGIES.some(strategy => strategy.id === strategyId)) return { status: 'unavailable', reason: 'Choose a supported optimization strategy.' };
  const settings = snapshot.settings ?? {};
  const baseInvestments = cleanInvestments(snapshot.baseInvestments, groups);
  const baseTotals = calculateUpgradeTotals(baseInvestments, groups);
  if (baseTotals.unknownCostUpgrades.length) return { status: 'unavailable', reason: 'A mandatory base upgrade has an unknown price.', unknownCostUpgrades: baseTotals.unknownCostUpgrades };
  const rawTargetRound = snapshot.targetRound ?? (settings.tocMode ? settings.tocFloor : settings.round);
  const targetRound = Number(rawTargetRound);
  if (rawTargetRound == null || typeof rawTargetRound === 'string' && rawTargetRound.trim() === '' || !Number.isInteger(targetRound)) {
    return { status: 'unavailable', reason: 'Choose a valid round or floor.' };
  }
  // SC2_FIXED_4096: discrete wave selection must resolve an actual fixed-data
  // scenario. Never score an earlier wave as the selected unsupported target.
  const selected = resolveScenario(settings.tocMode ? { ...settings, tocFloor: targetRound } : { ...settings, round: targetRound });
  if (selected.status !== 'supported') return { status: 'unavailable', reason: selected.reason };
  if (selected.rollingMode) return { status: 'unavailable', reason: 'Rolling-mode optimization awaits the cap-safe carryover calculation.' };
  const checkpoints = buildCheckpoints(settings, targetRound);
  if (!checkpoints.length) return { status: 'unavailable', reason: 'No enemy data is available at or before the selected wave.' };
  const scoringRound = checkpoints.at(-1);
  const targetBudget = calculateWaveBudget(settings, baseInvestments, groups, targetRound);
  const startBudget = calculateWaveBudget(settings, baseInvestments, groups, 0);
  const availableSp = Number.isFinite(snapshot.availableSp) ? Math.max(0, snapshot.availableSp) : targetBudget.availableSp;
  const availableEp = Number.isFinite(snapshot.availableEp) ? Math.max(0, snapshot.availableEp) : targetBudget.availableEp;
  if (baseTotals.totalSpOverall > availableSp || baseTotals.totalEpOverall > availableEp) {
    return { status: 'unavailable', reason: 'Mandatory base upgrades exceed the target SP or EP budget.', baseTotals, budget: targetBudget };
  }
  if (baseTotals.totalSpOverall > startBudget.availableSp) {
    return { status: 'unavailable', reason: 'Mandatory base SP upgrades must fit Starting SP before the first wave.', baseTotals, startingSp: startBudget.availableSp };
  }
  const bankUpgrade = groups.find(group => group.id === 'divine')?.upgrades.find(upgrade => upgrade.id === 'sp-bank');
  const bankLevel = baseInvestments.divine?.['sp-bank'] ?? 0;
  const bankPrice = bankUpgrade ? getTotalUpgradePrice(bankUpgrade, bankLevel) : 0;
  if (bankPrice === null || bankPrice > startBudget.availableSp) {
    return { status: 'unavailable', reason: 'The mandatory SP Bank level cannot be purchased from Starting SP.', bankPrice, startingSp: startBudget.availableSp };
  }
  const inputUnits = snapshot.units ?? [];
  const hasEnteredDamagingUnit = inputUnits.some(unit => Number(unit.count) > 0);
  const general = snapshot.objectiveMode === 'general';
  if (!general && !hasEnteredDamagingUnit) return { status: 'unavailable', reason: 'Add a damaging build or select General estimate.' };
  const units = general ? [makeReferenceUnit()] : inputUnits;
  let state = baseInvestments;
  const targetSettings = settings.tocMode ? { ...settings, tocFloor: scoringRound } : { ...settings, round: scoringRound };
  const targetResolved = resolveScenario(targetSettings);
  if (targetResolved.status !== 'supported') return { status: 'unavailable', reason: targetResolved.reason };
  let last = scoreCandidate(snapshot, state, units, config, targetSettings, targetResolved);
  if (!last.score || (!general && !finiteNonnegative(last.army.ordinaryDps))) {
    return { status: 'unavailable', reason: general ? 'The reference Amon calculation is unavailable.' : 'Resolve incomplete build units or select General estimate.' };
  }
  if (!general && !(last.army.ordinaryDps > 0)) return { status: 'unavailable', reason: 'Add a damaging build or select General estimate.' };
  const baseScore = last.score;
  const definitions = candidateDefinitions(groups);
  const maxEvaluations = Math.max(1, Math.floor(Number(snapshot.maxEvaluations) || 3500));
  const maxMilliseconds = Math.max(100, Math.floor(Number(snapshot.maxMilliseconds) || 8000));
  let evaluations = 1;
  let bounded = false;
  let globalLimitReached = false;
  let gpHeuristicApplied = false;
  const skippedRecommendations = [];
  const skippedKeys = new Set();
  let spentSp = baseTotals.totalSpOverall;
  let spentEp = baseTotals.totalEpOverall;
  const steps = [];
  const schedule = [];
  const memo = new Map();
  const key = investments => `${currentWave}:${definitions.map(def => levelOf(investments, def)).join(',')}`;
  let currentWave = scoringRound;
  let currentSettings = targetSettings;
  let currentResolved = targetResolved;
  memo.set(key(state), last);
  const report = (phase, wave) => onProgress({ phase, wave, evaluations, maxEvaluations,
    bestCoverage: last?.score?.coverage ?? baseScore.coverage, spentSp, spentEp, elapsedMs: performance.now() - startedAt });
  const evaluate = async investments => {
    const cacheKey = key(investments);
    if (memo.has(cacheKey)) return memo.get(cacheKey);
    if (evaluations >= maxEvaluations || performance.now() - startedAt >= maxMilliseconds) {
      bounded = true; globalLimitReached = true; return null;
    }
    const result = scoreCandidate(snapshot, investments, units, config, currentSettings, currentResolved);
    evaluations += 1;
    memo.set(cacheKey, result);
    if (evaluations % progressEvery === 0) {
      report('search', currentWave);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return result;
  };
  const candidateMoves = async (investments, currentScore, waveBudget, remainingSp, remainingEp) => {
    const result = [];
    for (const definition of definitions) {
      if (shouldCancel()) return null;
      const fromLevel = levelOf(investments, definition);
      if (fromLevel >= definition.upgrade.maxInvestments) continue;
      const price = getNextUpgradePrice(definition.upgrade, fromLevel);
      const remaining = definition.currency === 'EP' ? remainingEp : remainingSp;
      if (!Number.isFinite(price) || price <= 0 || price > remaining + TOLERANCE) continue;
      const nextState = withLevel(investments, definition, fromLevel + 1);
      const tested = await evaluate(nextState);
      if (!tested) break;
      if (!tested.score) continue;
      const gain = tested.score.coverage - currentScore.coverage;
      if (!(gain > TOLERANCE)) continue;
      const currencyBudget = definition.currency === 'EP' ? Math.max(1, waveBudget.availableEp) : Math.max(1, waveBudget.availableSp);
      let priority = gain * currencyBudget / price;
      // GP grants stat equivalents, not paid price tiers. This small scheduling
      // preference is a declared heuristic, never counted as an exact DPS gain.
      if (snapshot.resourceSettings?.gpEstimatesEnabled && definition.groupId === 'infinite' && waveBudget.round < targetRound) {
        priority *= 1.02;
        gpHeuristicApplied = true;
      }
      result.push({ definition, fromLevel, price, gain, priority, investments: nextState, tested });
    }
    result.sort(compareMoves);
    return result;
  };
  const selectMove = async (moves, investments, currentResult, waveBudget, remainingSp, remainingEp) => {
    if (strategyId === 'amon-greedy') {
      // Amon's unchanged estimate ranks SP choices. The full battle model
      // guards against spending on a non-improving recommended level.
      // EP has no Amon formula and uses exact marginal coverage.
      const amon = calculateUpgradeRecommendations({ army: currentResult.army, units, investments, config });
      for (const recommendation of amon.recommendations) {
        const definition = definitions.find(candidate => candidate.groupId === recommendation.groupId && candidate.upgradeId === recommendation.upgradeId);
        if (!definition || definition.currency !== 'SP') continue;
        const fromLevel = levelOf(investments, definition);
        const price = getNextUpgradePrice(definition.upgrade, fromLevel);
        if (!Number.isFinite(price) || price <= 0 || price > remainingSp + TOLERANCE) continue;
        const nextState = withLevel(investments, definition, fromLevel + 1);
        const tested = await evaluate(nextState);
        if (!tested?.score) continue;
        if (!(tested.score.coverage > currentResult.score.coverage + TOLERANCE)) {
          const key = `${currentWave}/${definition.groupId}/${definition.upgradeId}`;
          if (!skippedKeys.has(key)) {
            skippedKeys.add(key);
            skippedRecommendations.push({ wave: currentWave, groupId: definition.groupId,
              upgradeId: definition.upgradeId, reason: 'Amon recommended this level, but the full battle model found no positive coverage gain.' });
          }
          continue;
        }
        return { definition, fromLevel, price, gain: tested.score.coverage - currentResult.score.coverage,
          priority: 0, investments: nextState, tested, approximate: true };
      }
      return moves.find(move => move.definition.currency === 'EP') ?? null;
    }
    let selected = moves[0] ?? null;
    if (strategyId === 'beam' && moves.length > 1 && !globalLimitReached) {
      // Two-ply bounded lookahead over the strongest first moves. This can
      // choose a weaker first purchase that forms a stronger affordable pair.
      let bestPair = -Infinity;
      for (const first of moves.slice(0, 3)) {
        const secondMoves = await candidateMoves(first.investments, first.tested.score, waveBudget,
          remainingSp - (first.definition.currency === 'SP' ? first.price : 0),
          remainingEp - (first.definition.currency === 'EP' ? first.price : 0));
        if (secondMoves === null) return null;
        const pairGain = first.gain + (secondMoves[0]?.gain ?? 0);
        if (pairGain > bestPair + TOLERANCE) { bestPair = pairGain; selected = first; }
        if (globalLimitReached) break;
      }
    }
    return selected;
  };
  const stageEvaluationLimit = Math.max(40, Math.floor(maxEvaluations / Math.max(1, checkpoints.length)));
  report('start', checkpoints[0]);
  for (const wave of checkpoints) {
    if (shouldCancel()) return cancelledResult();
    currentWave = wave;
    const rawBudget = calculateWaveBudget(settings, baseInvestments, groups, wave);
    const waveBudget = { ...rawBudget, availableSp: Math.min(availableSp, rawBudget.availableSp), availableEp: Math.min(availableEp, rawBudget.availableEp) };
    if (globalLimitReached) {
      schedule.push({ wave, availableSp: waveBudget.availableSp, availableEp: waveBudget.availableEp,
        spentSp, spentEp, purchases: [], scoreContext: 'wave-scenario', projectedCoverage: null, notEvaluated: true });
      continue;
    }
    currentSettings = settings.tocMode ? { ...settings, tocFloor: wave } : { ...settings, round: wave };
    currentResolved = resolveScenario(currentSettings);
    last = await evaluate(state);
    if (!last?.score) {
      if (globalLimitReached) {
        schedule.push({ wave, availableSp: waveBudget.availableSp, availableEp: waveBudget.availableEp,
          spentSp, spentEp, purchases: [], scoreContext: 'wave-scenario', projectedCoverage: null, notEvaluated: true });
        continue;
      }
      return { status: 'error', reason: `Wave ${wave} could not be scored by the battle calculator.` };
    }
    const purchases = [];
    const stageStartEvaluations = evaluations;
    while (!globalLimitReached && evaluations - stageStartEvaluations < stageEvaluationLimit) {
      if (shouldCancel()) return cancelledResult();
      const remainingSp = waveBudget.availableSp - spentSp;
      const remainingEp = waveBudget.availableEp - spentEp;
      if (remainingSp < 0 && remainingEp < 0) break;
      const moves = await candidateMoves(state, last.score, waveBudget, remainingSp, remainingEp);
      if (moves === null) return cancelledResult();
      if (!moves.length && strategyId !== 'amon-greedy') break;
      const selected = await selectMove(moves, state, last, waveBudget, remainingSp, remainingEp);
      if (shouldCancel()) return cancelledResult();
      if (!selected) break;
      const step = makeStep(selected, wave, last.score.coverage, selected.tested.score.coverage);
      purchases.push(step); steps.push(step);
      state = selected.investments;
      last = selected.tested;
      if (selected.definition.currency === 'EP') spentEp += selected.price;
      else spentSp += selected.price;
      report('purchase', wave);
    }
    const stageBounded = !globalLimitReached && evaluations - stageStartEvaluations >= stageEvaluationLimit;
    if (stageBounded) bounded = true;
    if (strategyId === 'beam' && purchases.length && !globalLimitReached && !stageBounded && !shouldCancel()) {
      // A one-for-one local swap of the final purchase is safe for the wave's
      // chronological ledger: earlier step scores and prices remain intact.
      const previousStep = purchases.at(-1);
      const previousDefinition = definitions.find(candidate => candidate.groupId === previousStep.groupId && candidate.upgradeId === previousStep.upgradeId);
      const reducedState = withLevel(state, previousDefinition, previousStep.fromLevel);
      const reduced = await evaluate(reducedState);
      if (reduced?.score) {
        const refundSp = previousStep.currency === 'SP' ? previousStep.price : 0;
        const refundEp = previousStep.currency === 'EP' ? previousStep.price : 0;
        const alternatives = await candidateMoves(reducedState, reduced.score, waveBudget,
          waveBudget.availableSp - spentSp + refundSp,
          waveBudget.availableEp - spentEp + refundEp);
        if (alternatives?.length) {
          const better = alternatives.reduce((best, move) => move.tested.score.coverage > best.tested.score.coverage + TOLERANCE ? move : best);
          if (better.tested.score.coverage > last.score.coverage + TOLERANCE) {
            purchases.pop(); steps.pop();
            spentSp -= refundSp; spentEp -= refundEp;
            const replacement = makeStep(better, wave, reduced.score.coverage, better.tested.score.coverage);
            purchases.push(replacement); steps.push(replacement);
            state = better.investments; last = better.tested;
            if (better.definition.currency === 'SP') spentSp += better.price;
            else spentEp += better.price;
            report('local-improvement', wave);
          }
        }
      }
    }
    schedule.push({ wave, availableSp: waveBudget.availableSp, availableEp: waveBudget.availableEp,
      spentSp, spentEp, purchases, scoreContext: 'wave-scenario',
      projectedCoverage: last.score.coverage, searchLimited: stageBounded || globalLimitReached });
  }
  if (shouldCancel()) return cancelledResult();
  const totals = calculateUpgradeTotals(state, groups);
  const finalBudget = { ...targetBudget, availableSp, availableEp };
  if (totals.unknownCostUpgrades.length || totals.totalSpOverall > availableSp + TOLERANCE || totals.totalEpOverall > availableEp + TOLERANCE) {
    return { status: 'error', reason: 'The final plan failed its SP or EP affordability check.' };
  }
  const validated = scoreCandidate(snapshot, state, units, config, targetSettings, targetResolved);
  if (!validated.score) return { status: 'error', reason: 'The final plan could not be validated by the battle calculator.' };
  // SC2_FIXED_4096: coverage remains an analytical ratio; reuse the verified
  // final target score for reporting when the search evaluation limit is hit.
  last = validated;
  const firstStep = steps[0];
  const nextUpgrade = firstStep ? { groupId: firstStep.groupId, upgradeId: firstStep.upgradeId,
    groupLabel: groups.find(group => group.id === firstStep.groupId)?.label, name: firstStep.name,
    currency: firstStep.currency, price: firstStep.price, wave: firstStep.wave,
    gain: firstStep.scoreAfter - firstStep.scoreBefore, projectedCoverage: firstStep.scoreAfter,
    approximate: strategyId === 'amon-greedy' && firstStep.currency === 'SP' } : null;
  const result = { status: 'supported', strategyId, objectiveMode: general ? 'general' : 'build',
    selectedWave: targetRound, scoredThroughWave: scoringRound,
    investments: state, baseScore, finalScore: validated.score, nextUpgrade, steps, schedule,
    totals, baseTotals, budget: finalBudget, evaluations, bounded,
    elapsedMs: performance.now() - startedAt,
    skippedRecommendations,
    gpEarlyInfiniteHeuristic: gpHeuristicApplied,
    scoreContext: 'wave-scenario' };
  report('complete', currentWave);
  return result;
}
