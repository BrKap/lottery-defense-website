import test from 'node:test';
import assert from 'node:assert/strict';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';
const near = (a, b) => assert(Math.abs(a - b) < Math.max(1e-10, Math.abs(b) * 1e-11), `${a} != ${b}`);

test('Ordinary combat engine', async t => withCalculatorModules(async ({ config, state, stats, scenario, loadModule }) => {
  const damage = await loadModule('/src/core/calculator/damageCalculation.js');
  const { calculateCriticalExpectation: crit } = await loadModule('/src/core/calculator/criticalCalculation.js');
  const saved = state.createDefaultCalculatorState(config);
  const settings = { gameMode: 'Classic', round: 180, difficulty: 'Normal', torment: 0 };
  const enemy = scenario.calculateScenario(settings);
  const profile = stats.calculateProfileStats({});
  const unit = (unitId = 'amon', overrides = {}) => ({ entryId: `${unitId}-1`, unitId, count: 1, rank: 'B', level: 0, lb: 0, armor: 0, jewel: 'none', xnkFixedAttacks: true, ...overrides });
  const context = { profile, scenario: enemy, jewels: saved.jewels, config, penetrationEnabled: false };
  const calc = (u = unit(), overrides = {}) => damage.calculateUnitDamage(u, { ...context, ...overrides });
  const jewel = (id, overrides = {}) => ({ ...saved.jewels.find(j => j.typeId === id), ...overrides });
  await t.test('independent ordinary baseline and neutral/hybrid grades', () => {
    const a = calc();
    near(a.perUnitDps, 270 * 6.739428272 * 1.155 * 2 * 1.1505 / 0.5);
    const p = stats.calculateProfileStats({});
    p.combatStats.stats.raceUpgradePBio = 1;
    p.combatStats.stats.raceUpgradeTBio = 1;
    near(calc(unit(), { profile: p }).details.gradedBase, 270 * 7.414050869);
    near(calc(unit('hybrid-behemoth'), { profile: p }).details.gradedBase, 122.5 * 7.776752618);
    assert.equal(calc(unit('overmind'), { profile: p }).details.grade, 20);
    assert.equal(calc(unit('sarah-kerrigan')).details.attacks, 1);
    p.combatStats.stats.raceUpgradePBio = 2;
    near(calc(unit(), { profile: p }).details.gradedBase, 270 * 7.414050869);
  });
  await t.test('rank, level, armor, LB6 and additive FD', () => {
    const p = stats.calculateProfileStats({ sandboxState: { enabled: true, stats: { attackDamage: 100, finalDamage: 50 } } });
    const s = scenario.calculateScenario({ ...settings, difficulty: 'Epic', torment: 10 });
    const a = calc(unit('amon', { rank: 'RXD', level: 2, armor: 30, lb: 6 }), { profile: p, scenario: s });
    near(a.details.adFactor, 1 + (100 + 10 + 30 + 500 + 100 + 15.5 - 20) / 100);
    near(a.details.fdFactor, 1 + (50 + 30 - 92) / 100);
    near(a.details.speedMultiplier, 1.5 * 0.95 * 1.3 * 1.1505);
    assert(calc(unit('amon', { rank: 'D' })).details.provisionalRank);
    for (const [lb, ad, accel] of [[0,0,0],[1,50,0],[2,100,0],[3,175,10],[4,300,20],[5,500,30],[6,500,30]]) {
      const d = calc(unit('amon', { lb })).details;
      assert.equal(d.unitAD, ad); near(d.speedMultiplier, (1 + accel/100) * 1.1505);
      near(d.fdFactor, lb === 6 ? 1.3 : 1);
    }
  });
  await t.test('count bonuses aggregate independent entries by type', () => {
    const a = damage.calculateArmyDamage([unit('broodlord'), unit('broodlord', { entryId: 'second', rank: 'RXD' })], context);
    assert(a.entries.every(e => e.details.countBonus === 0));
    assert.equal(a.groups.length, 1); assert.equal(a.uniqueUnits, 1); assert.equal(a.totalUnits, 2);
    near(a.groups[0].totalDps, a.entries[0].fullDps + a.entries[1].fullDps);
    assert.notEqual(a.entries[0].perUnitDps, a.entries[1].perUnitDps);
    assert.equal(calc(unit('broodlord')).details.countBonus, 30);
    assert.equal(calc(unit('broodlord', { count: 9 })).details.countBonus, -10);
    const p = stats.calculateProfileStats({ calculatorSettings: { gp: 33 } });
    assert.equal(calc(unit('broodlord', { count: 4 }), { profile: p }).details.countBonus, 30);
    assert.equal(calc(unit('amon', { count: 9 })).details.countBonus, 0);
  });
  await t.test('crit expectation and excess CC boundaries', () => {
    assert.equal(crit({}).multiplier, 1);
    near(crit({ critChance: 100 }).multiplier, 2);
    near(crit({ critChance: 50, critDamage: 100 }).multiplier, 2);
    near(crit({ critChance: 300, multiCrit: 45 }).averageMC, 45);
    assert.equal(crit({ critChance: 319, multiCrit: 45 }).extraMC, 0);
    assert.equal(crit({ critChance: 320, multiCrit: 45 }).averageMC, 46);
    assert.equal(crit({ critChance: 320, multiCrit: 0 }).averageMC, 1);
    near(crit({ critChance: 100, critDamage: 100 }, 50).multiplier, 2);
    const c = { critChance: 300, multiCrit: 10 };
    near(crit(c, 0, 0.45).multiplier, 2 + 0.667 * 10 * 0.45);
    assert.equal(crit({ critChance: -5, multiCrit: -3 }).multiplier, 1);
    const p = stats.calculateProfileStats({ sandboxState: { enabled: true, stats: c } });
    near(p.combatStats.averageMultiCrit, 10); assert(p.combatStats.averageMultiCritReady);
  });
  await t.test('speed cap, modifiers, God of Time factor and relative penetration', () => {
    const p = stats.calculateProfileStats({ sandboxState: { enabled: true, stats: { attackSpeed: 100000 } } });
    assert.equal(calc(unit(), { profile: p }).details.interval, 0.0625);
    near(calc(unit('commando-raynor')).details.speedMultiplier, 1.1505 * 1.5);
    near(calc(unit('k5-kerrigan')).details.speedMultiplier, 1.1505 * 1.75);
    near(calc(unit(), { godOfTimeFactor: 0.8 }).details.interval, 0.5 * 0.8 / 1.1505);
    near(calc(unit(), { penetrationEnabled: true }).perUnitDps / calc().perUnitDps, 188 / 166);
    for (const [id, factor] of [['spec-ops-nova',0.85],['artanis',0.7],['talandar',0.7],['destroyer',0.8],['tal-mothership',0.7],['torrasque',0.55],['laser-drill',0.15]]) assert.equal(calc(unit(id)).details.damageAdjustment, factor);
  });
  await t.test('all jewel identities and approved exceptions', () => {
    for (const j of saved.jewels) assert.equal(damage.calculateJewelStats(j, unit(), config).status, 'supported');
    const js = (id, lb = 0, fields = {}) => damage.calculateJewelStats(jewel(id, fields), unit('amon', { lb }), config).stats;
    assert.equal(js('emerald',4).finalDamage, 0); assert.equal(js('emerald',5).finalDamage, 30);
    assert.equal(js('emerald',6,{jewelUpgrade:'5',finalDamage:'5'}).finalDamage, 45);
    assert.equal(js('garnet').attackSpeed, -30); assert.equal(js('garnet').attackDamage, 200);
    assert.equal(js('olivine',0,{jewelUpgrade:'5'}).finalDamage, 30);
    assert.equal(js('bloodstone',0,{attackDamage:'30',cooldown:'50'}).attackDamage, 30);
    const lapis = js('lapis',0,{innateAd:'80',attackDamage:'20',cooldown:'30',skillDamage:'40'});
    assert.equal(lapis.attackDamage, 100); assert.equal(lapis.cooldown, 30); assert.equal(lapis.skillDamage, 40);
    const square = { ...config.NORMAL_JEWEL_DEFAULT, finalDamage: '5', jewelUpgrade: '5' };
    assert.equal(damage.calculateJewelStats(square, unit(), config).stats.finalDamage, 5);
    const aqua = jewel('aquamarine');
    const a = calc(unit('amon',{rank:'RXD',jewel:aqua.entryId}),{jewels:[aqua]});
    assert.equal(a.details.unitAD,100);
    const selected = unit('amon',{rank:'B',jewel:aqua.entryId});
    assert.equal(calc(selected,{jewels:[aqua]}).details.effectiveRank,'RXD'); assert.equal(selected.rank,'B');
    assert.equal(damage.calculateJewelStats(jewel('garnet'),unit('artifact'),config).stats.attackDamage,0);
    assert.equal(damage.calculateJewelStats(jewel('ruby',{attackDamage:'11'}),unit(),config).status,'unavailable');
  });
  await t.test('pending specials, zero army and unsupported cases stay explicit', () => {
    for (const id of ['overmind','artifact']) assert.equal(calc(unit(id)).fullDps,null);
    assert.equal(calc(unit('artifact')).details.gradedBase,160);
    assert.equal(calc(unit('xelnaga-kerrigan',{xnkFixedAttacks:false})).status,'pending');
    assert.equal(calc(unit('amon',{jewel:'missing'})).status,'unavailable');
    assert.equal(calc(unit('amon',{rank:'unknown'})).status,'unavailable');
    assert.equal(calc(unit('amon',{count:0})).fullDps,0);
    const a = damage.calculateArmyDamage([],context); assert.equal(a.ordinaryDps,0); assert.equal(a.uniqueUnits,0);
    const mixed = damage.calculateArmyDamage([unit(),unit('artifact')],context); assert(mixed.incomplete); near(mixed.ordinaryDps,calc().fullDps);
    for (const u of config.unitLibrary) assert.notEqual(calc(unit(u.id)).status,'unavailable',u.id);
    assert.equal(calc(unit(),{scenario:scenario.calculateScenario({...settings,gameMode:'Hyper'})}).status,'unavailable');
  });
}));
