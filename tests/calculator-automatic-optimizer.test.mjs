import test from 'node:test';
import assert from 'node:assert/strict';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';

const unit = (id = 'amon', changes = {}) => ({ unitId: id, entryId: id, count: 1, rank: 'B', level: 0,
  armor: 0, lb: 0, jewel: 'none', xnkFixedAttacks: true, ...changes });

test('automatic optimizer preserves manual base, prices both currencies, and validates coverage', async () => {
  await withCalculatorModules(async ({ config, state, loadModule, helpers }) => {
    const { optimizeUpgrades } = await loadModule('/src/core/calculator/automaticUpgradeOptimizer.js');
    const saved = state.createDefaultCalculatorState(config);
    const baseInvestments = helpers.buildInitialInvestments(config.UPGRADE_GROUPS);
    baseInvestments.rookie['atk-dmg-i'] = 1;
    baseInvestments.divine['sp-bank'] = 1;
    baseInvestments.beginner.life = 1; // unknown-price utility base must block a false affordability claim
    const input = { settings: { ...saved.calculatorSettings, difficulty: 'Normal', round: 180,
      startingSp: 12000, startingEp: 1, xp: 30000 }, units: [unit()], jewels: saved.jewels,
      runeLoadouts: saved.runeLoadouts, buffs: saved.buffState, resourceSettings: saved.resourceSettings,
      sandboxState: saved.sandboxState, additionalRuneState: saved.additionalRuneState,
      baseInvestments, maxEvaluations: 120 };
    const unknown = await optimizeUpgrades(input);
    assert.equal(unknown.status, 'unavailable');
    assert.match(unknown.reason, /unknown price/i);
    baseInvestments.beginner.life = 0;
    const result = await optimizeUpgrades(input);
    assert.equal(result.status, 'supported', result.reason);
    assert(result.finalScore.coverage >= result.baseScore.coverage);
    assert(result.totals.totalSpOverall <= result.budget.availableSp);
    assert(result.totals.totalEpOverall <= result.budget.availableEp);
    assert.equal(result.investments.rookie['atk-dmg-i'] >= 1, true);
    assert.equal(result.investments.divine['sp-bank'], 1);
    assert(result.steps.every(step => [115, 180].includes(step.wave)));
    assert.deepEqual(result.schedule.map(row => row.wave), [115, 180]);
    assert(result.schedule.some(row => row.wave === 115 && row.availableSp > input.settings.startingSp));
    assert(result.nextUpgrade);
    assert.equal(result.nextUpgrade.wave, result.steps[0].wave);
    assert.equal(result.nextUpgrade.upgradeId, result.steps[0].upgradeId);
    assert.equal(result.steps[0].scoreContext, 'wave-scenario');
    assert.notEqual(result.steps[0].scoreBefore, result.baseScore.coverage);
    const recomputed = helpers.calculateUpgradeTotals(result.investments, config.UPGRADE_GROUPS);
    assert.deepEqual(recomputed.totalSpOverall, result.totals.totalSpOverall);
    assert.deepEqual(recomputed.totalEpOverall, result.totals.totalEpOverall);
  });
});

test('all strategies provide a bounded feasible result and general reference mode', async () => {
  await withCalculatorModules(async ({ config, state, loadModule }) => {
    const { optimizeUpgrades, OPTIMIZATION_STRATEGIES } = await loadModule('/src/core/calculator/automaticUpgradeOptimizer.js');
    const saved = state.createDefaultCalculatorState(config);
    const input = { settings: { ...saved.calculatorSettings, difficulty: 'Normal', round: 180,
      startingSp: 300, startingEp: 1, xp: 0 }, units: [unit()], jewels: saved.jewels,
      runeLoadouts: saved.runeLoadouts, buffs: saved.buffState, resourceSettings: saved.resourceSettings,
      sandboxState: saved.sandboxState, additionalRuneState: saved.additionalRuneState,
      baseInvestments: saved.spInvestments, maxEvaluations: 140 };
    for (const strategy of OPTIMIZATION_STRATEGIES) {
      const result = await optimizeUpgrades({ ...input, strategyId: strategy.id });
      assert.equal(result.status, 'supported', `${strategy.id}: ${result.reason}`);
      assert(result.finalScore.coverage >= result.baseScore.coverage);
      assert(result.totals.totalSpOverall <= result.budget.availableSp);
      assert(result.totals.totalEpOverall <= result.budget.availableEp);
      assert(result.nextUpgrade);
    }
    const missing = await optimizeUpgrades({ ...input, units: [] });
    assert.equal(missing.status, 'unavailable');
    const general = await optimizeUpgrades({ ...input, units: [], objectiveMode: 'general' });
    assert.equal(general.status, 'supported', general.reason);
    assert.equal(general.objectiveMode, 'general');
  });
});

test('shield reduction is an eligible coverage purchase', async () => {
  await withCalculatorModules(async ({ config, state, loadModule }) => {
    const { optimizeUpgrades } = await loadModule('/src/core/calculator/automaticUpgradeOptimizer.js');
    const saved = state.createDefaultCalculatorState(config);
    const shield = config.UPGRADE_GROUPS.find(group => group.id === 'infinite').upgrades.find(upgrade => upgrade.id === 'reduce-shield');
    const group = { id: 'infinite', currency: 'SP', upgrades: [shield] };
    const restricted = { ...config, UPGRADE_GROUPS: [group], UPGRADE_GROUP_MAP: { infinite: group } };
    const result = await optimizeUpgrades({ config: restricted,
      settings: { ...saved.calculatorSettings, difficulty: 'Normal', round: 180, startingSp: 400 },
      units: [unit()], jewels: saved.jewels, runeLoadouts: saved.runeLoadouts, buffs: saved.buffState,
      resourceSettings: { ...saved.resourceSettings, includeInfinite: false }, sandboxState: saved.sandboxState,
      additionalRuneState: saved.additionalRuneState, baseInvestments: { infinite: { 'reduce-shield': 0 } } });
    assert.equal(result.status, 'supported', result.reason);
    assert.equal(result.investments.infinite['reduce-shield'], 1);
    assert.equal(result.totals.totalSpOverall, 400);
    assert(result.finalScore.requiredDps < result.baseScore.requiredDps);
    assert(result.finalScore.coverage > result.baseScore.coverage);
  });
});

test('speed-capped units do not draw paid attack speed levels; Amon automation never buys a non-improving level', async () => {
  await withCalculatorModules(async ({ config, state, loadModule }) => {
    const { optimizeUpgrades } = await loadModule('/src/core/calculator/automaticUpgradeOptimizer.js');
    const saved = state.createDefaultCalculatorState(config);
    const rookie = config.UPGRADE_GROUPS.find(group => group.id === 'rookie');
    const group = { ...rookie, upgrades: rookie.upgrades.filter(upgrade => ['atk-dmg-i', 'atk-spd-i'].includes(upgrade.id)) };
    const restricted = { ...config, UPGRADE_GROUPS: [group], UPGRADE_GROUP_MAP: { rookie: group } };
    const input = { config: restricted,
      settings: { ...saved.calculatorSettings, difficulty: 'Normal', round: 180, startingSp: 50 },
      units: [unit()], jewels: saved.jewels, runeLoadouts: saved.runeLoadouts, buffs: saved.buffState,
      resourceSettings: saved.resourceSettings,
      sandboxState: { enabled: true, stats: { attackSpeed: 100000 } },
      additionalRuneState: saved.additionalRuneState, baseInvestments: { rookie: { 'atk-dmg-i': 0, 'atk-spd-i': 0 } } };
    const result = await optimizeUpgrades(input);
    assert.equal(result.status, 'supported', result.reason);
    assert.equal(result.investments.rookie['atk-dmg-i'], 1);
    assert.equal(result.investments.rookie['atk-spd-i'], 0);
    const amon = await optimizeUpgrades({ ...input, config, baseInvestments: saved.spInvestments,
      strategyId: 'amon-greedy', settings: { ...input.settings, startingSp: 150 }, maxEvaluations: 150 });
    assert.equal(amon.status, 'supported', amon.reason);
    assert(amon.steps.every(step => step.scoreAfter > step.scoreBefore));
    assert(amon.finalScore.coverage >= amon.baseScore.coverage);
  });
});

test('each supported wave uses its own enemy scenario', async () => {
  await withCalculatorModules(async ({ config, state, loadModule }) => {
    const { optimizeUpgrades } = await loadModule('/src/core/calculator/automaticUpgradeOptimizer.js');
    const saved = state.createDefaultCalculatorState(config);
    const result = await optimizeUpgrades({
      settings: { ...saved.calculatorSettings, difficulty: 'Normal', round: 180, startingSp: 0, startingEp: 0, xp: 0 },
      units: [unit()], jewels: saved.jewels, runeLoadouts: saved.runeLoadouts,
      buffs: saved.buffState, resourceSettings: saved.resourceSettings,
      sandboxState: saved.sandboxState, additionalRuneState: saved.additionalRuneState,
      baseInvestments: saved.baseInvestments, maxEvaluations: 100,
    });
    assert.equal(result.status, 'supported', result.reason);
    assert.deepEqual(result.schedule.map(checkpoint => checkpoint.wave), [115, 180]);
    assert.notEqual(result.schedule[0].projectedCoverage, result.baseScore.coverage);
    assert.equal(result.schedule[1].projectedCoverage, result.finalScore.coverage);
  });
});

test('missing selected-wave enemy data uses earlier checkpoints and keeps later bank payouts unspent', async () => {
  await withCalculatorModules(async ({ config, state, loadModule, helpers }) => {
    const { optimizeUpgrades } = await loadModule('/src/core/calculator/automaticUpgradeOptimizer.js');
    const saved = state.createDefaultCalculatorState(config);
    const bank = config.UPGRADE_GROUPS.find(group => group.id === 'divine').upgrades.find(upgrade => upgrade.id === 'sp-bank');
    const group = { id: 'divine', currency: 'SP', upgrades: [bank] };
    const restricted = { ...config, UPGRADE_GROUPS: [group], UPGRADE_GROUP_MAP: { divine: group } };
    const baseInvestments = helpers.buildInitialInvestments(restricted.UPGRADE_GROUPS);
    baseInvestments.divine['sp-bank'] = 1;
    const input = { config: restricted, settings: { ...saved.calculatorSettings, difficulty: 'Normal',
      round: 120, startingSp: 12000 }, units: [unit()], jewels: saved.jewels,
      runeLoadouts: saved.runeLoadouts, buffs: saved.buffState, resourceSettings: saved.resourceSettings,
      sandboxState: saved.sandboxState, additionalRuneState: saved.additionalRuneState,
      baseInvestments, maxEvaluations: 100 };
    const result = await optimizeUpgrades(input);
    assert.equal(result.status, 'supported', result.reason);
    assert.equal(result.selectedWave, 120);
    assert.equal(result.scoredThroughWave, 115);
    assert.deepEqual(result.schedule.map(checkpoint => checkpoint.wave), [115]);
    assert.equal(result.schedule[0].availableSp, 23000);
    assert.equal(result.budget.availableSp, 24000);
    assert.equal(result.finalScore.coverage, result.schedule[0].projectedCoverage);
    assert.equal(result.steps.length, 0);

    const beforeFirstWave = await optimizeUpgrades({ ...input, settings: { ...input.settings, round: 114 } });
    assert.equal(beforeFirstWave.status, 'unavailable');
    assert.match(beforeFirstWave.reason, /No enemy data/i);
    const invalidWave = await optimizeUpgrades({ ...input, settings: { ...input.settings, round: '120.5' } });
    assert.equal(invalidWave.status, 'unavailable');
    assert.match(invalidWave.reason, /valid round/i);

    const toc = await optimizeUpgrades({ ...input, settings: { ...input.settings, tocMode: true, tocFloor: 85 } });
    assert.equal(toc.status, 'supported', toc.reason);
    assert.equal(toc.selectedWave, 85);
    assert.equal(toc.scoredThroughWave, 84);
    assert.equal(toc.schedule.at(-1).wave, 84);
    assert.equal(toc.schedule.some(checkpoint => checkpoint.wave === 85), false);
  });
});
