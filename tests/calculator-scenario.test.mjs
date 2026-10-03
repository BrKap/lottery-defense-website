import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';
import { CLASSIC_ENEMIES, TOC_ENEMIES, DIFFICULTY_DATA, TORMENT_DATA } from '../src/data/euna/calculator/enemyConstants.js';
import { LEGACY_CLASSIC_ENEMIES } from './fixtures/legacy-enemies.mjs';
import { q, add, sub, mul, div, ceilDiv } from '../src/core/calculator/fixedPoint.js';
const grid = value => assert(Number.isInteger(value * 4096), String(value));
test('Fixed-grid scenarios, full coverage and mode-specific requirements', async t => withCalculatorModules(async ({scenario:api}) => {
  const base = {gameMode:'Classic',difficulty:'Normal',torment:0,round:180,tocMode:false};
  const calculate = (settings={},profile={},buffs={},debuff=1) => api.calculateScenario({...base,...settings},profile,buffs,debuff);
  await t.test('independent Decimal golden results match the JavaScript helper', () => {
    const fixture=JSON.parse(readFileSync(new URL('./fixtures/fixed-scenario-cases.json',import.meta.url),'utf8'));
    for (const row of fixture.cases) {
      const s=calculate({round:row.round,tocMode:row.mode==='ToC',tocFloor:row.round});
      assert.equal(s.requiredDps,row.requiredDps,`${row.mode}/${row.round}`);
      assert.equal(s.baselineMitigation,row.mitigation);
      assert.equal(s.enemy.seconds,row.seconds);
    }
  });
  await t.test('fixed baseline and historical comparison are distinct', () => {
    const s=calculate(); assert.equal(s.status,'supported');
    assert.equal(s.requiredDps,391674.31201171875);
    assert.equal(s.baselineMitigation,div(1,add(1,mul(88,'0.01'))));
    assert.equal(s.enemy.armor,88); assert.equal(s.enemy.shieldArmor,88);
    for (const value of [s.requiredDps,s.reducedHP,s.effectiveArmor,s.scenarioFactor,s.baselineMitigation]) grid(value);
    const old=LEGACY_CLASSIC_ENEMIES[180];
    assert.equal((old.hp+old.shield)*old.count*(1+old.armor/100)/old.seconds,414367.3469387755);
    assert.notEqual(s.requiredDps,414367.3469387755);
  });
  await t.test('all supported keys and exceptional source records', () => {
    assert.equal(Object.keys(DIFFICULTY_DATA).length,15); assert.equal(Object.keys(TORMENT_DATA).length,21);
    assert.equal(Object.keys(CLASSIC_ENEMIES).length,300); assert.equal(Object.keys(TOC_ENEMIES).length,90);
    for (const difficulty of Object.keys(DIFFICULTY_DATA)) for (let torment=0;torment<=20;torment++) assert(Number.isFinite(calculate({difficulty,torment}).requiredDps));
    for (let round=1;round<=300;round++) assert.equal(calculate({round}).status,'supported',String(round));
    for (let tocFloor=1;tocFloor<=90;tocFloor++) assert.equal(calculate({tocMode:true,tocFloor}).status,'supported',String(tocFloor));
    assert.equal(calculate({round:115}).enemy.shield,0);
    assert.equal(calculate({round:269}).enemy.armor,1693.7744140625); assert.equal(calculate({round:270}).enemy.armor,1570);
    assert.equal(calculate({round:220}).enemy.count,308);
  });
  await t.test('ToC ignores inactive selections, forces DT and uses floor torment', () => {
    const settings={...base,gameMode:'Hyper',difficulty:'unknown',round:123,torment:99,tocMode:true,tocFloor:70,doubleTime:false};
    const s=api.calculateScenario(settings); assert.equal(s.status,'supported');
    assert.equal(s.torment.key,5); assert.equal(s.difficulty.damageInflicted,2.5);
    assert.equal(s.enemy.seconds,59.91357421875); assert.equal(s.enemy.doubleTime,true);
    assert.equal(s.requiredDps,172655495.48706055);
    assert.equal(settings.round,123); assert.equal(settings.torment,99);
    assert.equal(calculate({tocMode:true,tocFloor:85}).enemy.count,870);
  });
  await t.test('torment penalties quantize at the damage-factor boundary', () => {
    for (const [torment,reduction,as] of [[18,50,0],[19,75,33],[20,89.1,66]]) {
      const s=calculate({torment}); assert.equal(s.scenarioFactor,sub(1,div(reduction,100)));
      assert.equal(s.torment.attackSpeedReduction,as); assert.equal(s.torment.finalDamageSubtraction,97); grid(s.requiredDps);
    }
  });
  await t.test('reductions/debuffs use intermediate fixed operations exactly once', () => {
    const s=calculate({}, {armorReduction:25,shieldReduction:20,healthReduction:10});
    assert.equal(s.reducedHP,mul(50000,sub(1,div(10,100))));
    assert.equal(s.reducedShield,mul(50000,sub(1,div(20,100))));
    assert.equal(s.effectiveArmor,66); assert.equal(s.requiredDps,294450.2150878906);
    assert.equal(calculate({}, {}, {},1.3).combinedDebuffFactor,q(1.3));
    assert.equal(calculate({difficulty:'Hell'}, {}, {superShield:true}).superShieldFactor,q('0.55'));
    assert.equal(calculate({difficulty:'Hell'}, {}, {superShield:true,shieldMaster:true}).superShieldFactor,q('0.70'));
    assert.equal(calculate({difficulty:'Hell'}, {combatStats:{stats:{},bypassSuperShield:true}}, {superShield:true}).superShieldFactor,1);
    assert.equal(calculate({}, {}, {superShield:true}).superShieldFactor,1);
  });
  await t.test('penetration shares the fixed armor formula', () => {
    const s=calculate(); assert.equal(api.calculateRelativePenetration(s,25),1.130615234375);
    assert.equal(api.calculateRelativePenetration(s,0),1); assert.equal(api.calculateRelativePenetration(s,25,false),1);
    assert.equal(api.calculateRelativePenetration(calculate({round:115}),100),1);
  });
  await t.test('deadline threshold covers every release-time suffix and rounds upward', () => {
    const s=calculate({tocMode:true,tocFloor:90});
    for (let batch=0;batch<s.enemy.batches;batch++) {
      const time=sub(s.enemy.seconds,mul(s.enemy.interval,batch));
      const work=mul(mul(s.equivalentWorkPerKill,s.enemy.creepsPerBatch),s.enemy.batches-batch);
      assert(s.requiredDps>=ceilDiv(work,time));
    }
    const totalWork=mul(s.equivalentWorkPerKill,s.enemy.count);
    assert(mul(s.requiredDps,s.enemy.seconds)>=totalWork);
    assert(mul(sub(s.requiredDps,1/4096),s.enemy.seconds)<totalWork);
  });
  await t.test('rolling stats are available without falsely promising cap safety', () => {
    for (const mode of ['Eternal','Hyper']) {
      const s=calculate({gameMode:mode,round:90}); assert.equal(s.status,'supported');
      assert.equal(s.requiredDps,null); assert.equal(s.requirementStatus,'pending-carryover');
      assert.equal(s.enemy.creepCap,40); assert.equal(s.enemy.capCheckSeconds,10); assert(s.waveAverageDps>0);
    }
  });
  await t.test('unsupported and invalid selections never silently fall back', () => {
    for (const settings of [{gameMode:'Unknown'},{gameMode:'Hyper',round:116},{round:301},{difficulty:'Unknown'},{tocMode:true,tocFloor:91}]) {
      const s=calculate(settings); assert.equal(s.status,'unsupported'); assert.equal(s.requiredDps,null);
    }
    for (const settings of [{round:''},{torment:21},{torment:1.5}]) assert.equal(calculate(settings).status,'invalid');
    for (const profile of [{shieldReduction:101},{healthReduction:-1}]) assert.equal(calculate({},profile).status,'invalid');
    assert.equal(calculate({}, {}, {},0).status,'invalid');
    assert.equal(calculate({}, {healthReduction:100,shieldReduction:100}).requiredDps,0);
  });
}));
