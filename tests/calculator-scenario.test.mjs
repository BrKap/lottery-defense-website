import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';
import { CLASSIC_ENEMIES, TOC_ENEMIES, DIFFICULTY_DATA, TORMENT_DATA } from '../src/data/euna/calculator/enemyConstants.js';
const near = (a,b) => assert(Math.abs(a-b) <= Math.max(1e-10,Math.abs(b)*1e-12), `${a} != ${b}`);
test('Scenario resolution and equivalent required DPS', async t => withCalculatorModules(async ({scenario:api,stats}) => {
  const base = {gameMode:'Classic',difficulty:'Normal',torment:0,round:180,tocMode:false};
  const calculate = (settings={},profile={},buffs={},debuff=1) => api.calculateScenario({...base,...settings},profile,buffs,debuff);
  await t.test('baseline and separate armor fields', () => {
    const s = calculate();
    assert.equal(s.status,'supported'); near(s.requiredDps,414367.3469387755);
    near(s.baselineMitigation,100/188); assert.equal(s.effectiveEnemyPool,40608000);
    assert.equal(s.enemy.armor,88); assert.equal(s.enemy.shieldArmor,88);
  });
  await t.test('all supported keys and preserved exceptional records', () => {
    assert.equal(Object.keys(DIFFICULTY_DATA).length,15); assert.equal(Object.keys(TORMENT_DATA).length,21);
    assert.equal(Object.keys(CLASSIC_ENEMIES).length,12); assert.equal(Object.keys(TOC_ENEMIES).length,15);
    for (const difficulty of Object.keys(DIFFICULTY_DATA)) for (let torment=0;torment<=20;torment++) assert(Number.isFinite(calculate({difficulty,torment}).requiredDps));
    for (const round of Object.keys(CLASSIC_ENEMIES)) assert(Number.isFinite(calculate({round}).requiredDps));
    for (const tocFloor of Object.keys(TOC_ENEMIES)) assert(Number.isFinite(calculate({tocMode:true,tocFloor}).requiredDps));
    assert.equal(calculate({round:115}).enemy.shield,0.00001);
    assert.equal(calculate({round:269}).enemy.armor,1694); assert.equal(calculate({round:270}).enemy.armor,1570);
  });
  await t.test('ToC ignores inactive Classic inputs and selects floor torment', () => {
    const settings = {...base,gameMode:'Hyper',difficulty:'unknown',round:123,torment:99,tocMode:true,tocFloor:70};
    const s = api.calculateScenario(settings);
    assert.equal(s.status,'supported'); assert.equal(s.torment.key,5); assert.equal(s.difficulty.damageInflicted,2.5);
    assert.equal(s.difficulty.attackDamageSubtraction,0); assert.equal(s.difficulty.accelerationReduction,0);
    near(s.requiredDps,100000*161*16.3/0.025/60);
    assert.equal(settings.round,123); assert.equal(settings.torment,99);
  });
  await t.test('high torment penalties stay separate', () => {
    const baseline = calculate().requiredDps;
    for (const [torment,reduction,as] of [[18,50,0],[19,75,33],[20,89.1,66]]) {
      const s=calculate({torment}); near(s.requiredDps,baseline/(1-reduction/100));
      assert.equal(s.torment.attackSpeedReduction,as); assert.equal(s.torment.finalDamageSubtraction,97); assert.equal(s.torment.critDamageReduction,99);
    }
    const s = calculate({difficulty:'Epic',torment:19});
    const p = stats.calculateProfileStats({difficultyState:s.difficulty,tormentState:s.torment,sandboxState:{enabled:true,stats:{attackDamage:100,finalDamage:100,critDamage:100}}});
    near(p.combatStats.attackDamageFactor,1.8); near(p.combatStats.finalDamageFactor,1.03);
    near(p.combatStats.speedPenaltyFactor,0.95*0.67); near(p.displayStats.critDamageWithTorment,1);
  });
  await t.test('reductions, debuffs and Super Shield are applied exactly once', () => {
    const s=calculate({}, {armorReduction:25,shieldReduction:20,healthReduction:10});
    near(s.requiredDps,(45000+40000)*216*(1+88*0.75/100)/98);
    near(calculate({}, {}, {},1.3).requiredDps,calculate().requiredDps/1.3);
    const hell=calculate({difficulty:'Hell'}).requiredDps;
    near(calculate({difficulty:'Hell'}, {}, {superShield:true}).requiredDps,hell/0.55);
    near(calculate({difficulty:'Hell'}, {}, {superShield:true,shieldMaster:true}).requiredDps,hell/0.7);
    near(calculate({difficulty:'Hell'}, {combatStats:{stats:{},bypassSuperShield:true}}, {superShield:true}).requiredDps,hell);
    near(calculate({}, {}, {superShield:true}).requiredDps,calculate().requiredDps);
  });
  await t.test('penetration is relative mitigation, not another armor charge', () => {
    const s=calculate(); near(api.calculateRelativePenetration(s,25),188/166);
    assert.equal(api.calculateRelativePenetration(s,0),1); assert.equal(api.calculateRelativePenetration(s,25,false),1);
    assert.equal(api.calculateRelativePenetration(calculate({round:115}),100),1);
  });
  await t.test('unsupported and invalid selections never silently fall back', () => {
    for (const settings of [{gameMode:'Eternal'},{gameMode:'Hyper'},{round:123},{difficulty:'Unknown'},{tocMode:true,tocFloor:85},{tocMode:true,tocFloor:86}]) {
      const s=calculate(settings); assert.equal(s.status,'unsupported'); assert.equal(s.requiredDps,null);
    }
    for (const settings of [{round:''},{torment:21},{torment:1.5}]) assert.equal(calculate(settings).status,'invalid');
    assert.equal(calculate({}, {shieldReduction:101}).status,'invalid');
    assert.equal(calculate({}, {}, {},0).status,'invalid');
    assert.equal(calculate({}, {healthReduction:100,shieldReduction:100}).requiredDps,0);
  });
}));
