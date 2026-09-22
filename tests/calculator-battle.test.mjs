import test from 'node:test';
import assert from 'node:assert/strict';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';
const near = (a, b) => assert(Math.abs(a - b) < Math.max(1e-9, Math.abs(b) * 1e-11), `${a} != ${b}`);

test('Support coverage and final battle calculations', async t => withCalculatorModules(async ({ config, state, stats, scenario, loadModule }) => {
  const { calculateBattle } = await loadModule('/src/core/calculator/battleCalculation.js');
  const { calculateExposure, calculateSupportCoverage } = await loadModule('/src/core/calculator/supportCalculation.js');
  const { calculateCriticalExpectation } = await loadModule('/src/core/calculator/criticalCalculation.js');
  const saved = state.createDefaultCalculatorState(config);
  const settings = { ...saved.calculatorSettings, round: 180, difficulty: 'Normal', penetrationEnabled: false };
  const unit = (id, overrides = {}) => ({ entryId: id, unitId: id, count: 1, rank: 'B', level: 0, armor: 0, lb: 0, jewel: 'none', abilityMode: 'default', overmindStacks: 0, xnkFixedAttacks: true, ...overrides });
  const run = (units = [], { options = {}, buffs = {}, profileStats = {}, jewels = saved.jewels } = {}) => {
    const s = { ...settings, ...options };
    const resolved = scenario.resolveScenario(s);
    const b = { ...saved.buffState, ...buffs };
    const profile = stats.calculateProfileStats({ units, calculatorSettings: s, buffState: b, difficultyState: resolved.difficulty, tormentState: resolved.torment, sandboxState: { enabled: true, stats: profileStats } });
    return calculateBattle({ units, profile, settings: s, buffs: b, jewels, config });
  };
  await t.test('exact lifetime helpers at Classic 180, 200 and ToC', () => {
    const e = calculateExposure(scenario.calculateScenario(settings));
    near(e.mobSeconds, 7974.367346938776); near(e.averageMobLife, 35.91836734693878); near(e.artifactLife, 36.91836734693878);
    const late = calculateExposure(scenario.calculateScenario({ ...settings, round: 200 }));
    assert.equal(late.spawned, 120); near(late.averageMobLife, late.artifactLife / 2 - 1); assert(late.lateClassic);
    const toc = calculateExposure(scenario.calculateScenario({ ...settings, tocMode: true, tocFloor: 70 }));
    assert.equal(toc.spawned, 161); assert(!toc.lateClassic); near(toc.averageMobLife, toc.artifactLife - 1);
  });
  await t.test('mana uses specialty cooldown, not displayed CDR or jewel CDR', () => {
    const s = scenario.calculateScenario(settings);
    const p = stats.calculateProfileStats({});
    p.sources.spUpgrades.finalStats.cooldown = 50;
    p.combatStats.stats.cooldown = 999;
    const c = calculateSupportCoverage(p, s, {}, [unit('artifact')]);
    near(c.artifactMana, 14); near(c.ordinaryMana, 23);
    near(calculateSupportCoverage(p, s, {}, []).ordinaryMana, 14);
  });
  await t.test('each support formula and multiplicative combined factor', () => {
    const b = run([unit('hybridlope'), unit('flower', { count: 3 })], { buffs: { supports: { stukov: 1, warfield: 1, talTempest: 1, tassadar: 1, vessel: 1, corruption: 1 } } });
    const m = 7974.367346938776;
    near(b.supports.coverage.hybridlope.uptime, 98 * 11.5 / 40 * 0.95 * 15 / m);
    near(b.supports.coverage.stukov.uptime, 98 * 11.5 / 125 * 0.75 * 5 / m * 0.75);
    near(b.supports.coverage.warfield.uptime, 98 / (1.3 * (1.5 / (1.15 * 1.1505))) * 0.1 * 2 / m);
    near(b.supports.coverage.talTempest.uptime, 98 * 11.5 / 125 * 0.8 * 20 / m);
    near(b.supports.coverage.tassadar.uptime, 98 * 11.5 / 150 * 5 / m);
    near(b.supports.coverage.vessel.uptime, 98 * 11.5 / 125 * 0.8 * 15 / m);
    near(b.supports.coverage.corruption.uptime, 15 / 98);
    assert.equal(b.supports.coverage.flower.factor, 1.1);
    near(b.scenario.requiredDps, 414367.3469387755 / Object.values(b.supports.coverage).reduce((a,e) => a * e.factor, 1));
    assert.equal(run([unit('nydus', { count: 3 })]).supports.coverage.flower.factor, 1);
    const capped = run([], { buffs: { supports: { vessel: 999, corruption: 999 } } });
    assert.equal(capped.supports.coverage.vessel.uptime, 1); assert.equal(capped.supports.coverage.corruption.uptime, 1);
  });
  await t.test('God of Time changes interval and caps at one-half', () => {
    const baseline = run([unit('amon')]);
    const b = run([unit('amon')], { buffs: { supports: { godOfTime: 1 } } });
    near(b.supports.godOfTimeFactor, 1 - 6.5 / 98);
    near(b.entries[0].details.interval / baseline.entries[0].details.interval, 1 - 6.5 / 98);
    assert.equal(run([unit('amon')], { buffs: { supports: { godOfTime: 999 } } }).supports.godOfTimeFactor, 0.5);
  });
  await t.test('Overmind FD/unique damage and independent capped AD stacks', () => {
    const b = run([unit('overmind', { abilityMode: 'uptime' }), unit('amon', { overmindStacks: 2 }), unit('amon', { entryId: 'second-amon', overmindStacks: 5 })]);
    near(b.overmind.selected.uptime, 0.5); near(b.profile.combatStats.stats.finalDamage, 2.5);
    assert.equal(b.entries[2].details.unitAD - b.entries[1].details.unitAD, 30);
    const withoutOvermind = run([unit('amon', { overmindStacks: 5 })]);
    assert.equal(withoutOvermind.entries[0].details.unitAD, 50);
    assert.equal(run([unit('amon', { overmindStacks: 99 })]).entries[0].details.unitAD, 50);
    const sapphire = saved.jewels.find(j => j.typeId === 'sapphire');
    const multiple = run([unit('overmind', { abilityMode: 'uptime' }), unit('overmind', { entryId: 'fast', abilityMode: 'uptime', jewel: sapphire.entryId })]);
    assert.equal(multiple.overmind.selected.entryId, 'fast'); assert.equal(multiple.entries[0].fullDps, 0); assert(multiple.entries[1].fullDps > 0);
    near(multiple.profile.combatStats.stats.finalDamage, 5);
    const n = state.normalizeCalculatorState({ ...saved, units: [unit('amon', { overmindStacks: 9 })] }, config);
    assert.equal(n.state.units[0].overmindStacks, 5); assert(n.state.recovered.some(r => r.path.endsWith('overmindStacks') && r.value === 9));
  });
  await t.test('Artifact uses spell ticks and mana uptime, not attack interval', () => {
    const b = run([unit('artifact')]);
    const critical = 1.2; // Artifact merge gives 20 CC; base CD stat is zero.
    const expected = 160 * 1.155 * 1.07 * critical * (36.91836734693878 * 6 / 4.5 * 216) / 94 * 0.575;
    near(b.entries[0].fullDps, expected);
    near(b.entries[0].details.artifact.uptime, 0.575);
    const fast = run([unit('artifact')], { profileStats: { attackSpeed: 100000 } });
    near(fast.entries[0].fullDps, expected);
    assert.equal(b.supports.ordinaryMana, 20.5); assert.equal(b.supports.artifactMana, 11.5);
    const late = run([unit('artifact')], { options: { round: 200 } });
    near(late.entries[0].details.artifact.ticks, late.supports.exposure.artifactLife * 6 / 4.5 * 120 * 1.8);
  });
  await t.test('adaptive XNK uses an independent chain baseline', () => {
    const b = run([unit('xelnaga-kerrigan', { xnkFixedAttacks: false }), unit('amon', { count: 100, lb: 6, armor: 1000 })]);
    assert(b.chainAttacks > 1 && b.chainAttacks < 5);
    near(b.entries[0].details.attacks, 1 + Math.min(4, b.scenario.requiredDps * 2.5 / b.chainBaseline));
    const fixed = run([unit('xelnaga-kerrigan'), unit('amon', { count: 100, lb: 6, armor: 1000 })]);
    near(fixed.chainBaseline, b.chainBaseline); assert.equal(fixed.entries[0].details.attacks, 5);
  });
  await t.test('mixed army MT exclusions, spread, uptime and spell-inclusive result', () => {
    const b = run([unit('amon'), unit('sarah-kerrigan'), unit('destroyer'), unit('xelnaga-kerrigan'), unit('void-thrasher', { armor: 100 })], { profileStats: { multiTargetDamage: 100, multiTargetChance: 50, multiTargetMultiCrit: 40 }, buffs: { supports: { corruption: 1 } } });
    const critical = calculateCriticalExpectation(b.profile.combatStats.stats).multiplier;
    const excluded = b.entries[1].fullDps + b.entries[2].fullDps + b.entries[3].fullDps / 5;
    const eligible = (b.referenceOrdinary - excluded) / critical + 0.01;
    const mt = eligible * 0.3 * (0.8 + 0.2 * critical) * Math.min(1, b.scenario.requiredDps / b.referenceOrdinary) * (1 + 0.3 * (b.scenario.combinedDebuffFactor - 1));
    near(b.multiTargetDps, mt); near(b.primaryDps, (b.ordinaryDps + 0.01 + mt) * 0.85);
    assert.equal(b.thrasherDps, Math.round(40000 * 1.55 * 11.5 / 125));
    near(b.spellInclusiveDps, b.primaryDps + b.thrasherDps);
    near(b.primaryCoverage, b.primaryDps / b.scenario.requiredDps * 100);
    near(b.spellCoverage, b.spellInclusiveDps / b.scenario.requiredDps * 100);
  });
  await t.test('spell FD excludes sandbox/progression/Overmind and avoids stale rune-AD mana', () => {
    const a = run([unit('void-thrasher')]);
    const b = run([unit('void-thrasher')], { profileStats: { finalDamage: 100, attackDamage: 1 } });
    assert.equal(a.thrasherDps, b.thrasherDps); assert.equal(a.supports.artifactMana, b.supports.artifactMana);
    const c = run([unit('void-thrasher'), unit('artifact')]);
    assert.equal(a.thrasherDps, c.thrasherDps);
  });
  await t.test('empty armies, unsupported scenarios and Purifier remain explicit', () => {
    const empty = run([], { profileStats: { multiTargetDamage: 100 } });
    assert.equal(empty.primaryDps, 0); assert.equal(empty.multiTargetDps, 0); assert.equal(empty.spellCoverage, 0);
    assert.equal(empty.purifier.status, 'unavailable');
    assert.equal(run([unit('amon')], { options: { gameMode: 'Hyper' } }).primaryDps, null);
    assert.equal(run([unit('amon', { jewel: 'missing' })]).primaryDps, null);
    const toc = run([unit('amon')], { options: { tocMode: true, tocFloor: 70 }, buffs: { teamBuffCount: 2 } });
    assert.equal(toc.status, 'supported'); assert.equal(toc.scenario.difficulty.damageInflicted, 2.5);
  });
}));
