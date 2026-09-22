import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';
const near = (a,b) => assert(Math.abs(a-b) < Math.max(1e-9,Math.abs(b)*1e-10), `${a} != ${b}`);

test('Amon estimate and concrete upgrade recommendations', async t => withCalculatorModules(async ({ config, stats, state, scenario, loadModule }) => {
  const optimizer = await loadModule('/src/core/calculator/upgradeOptimizer.js');
  const { calculateBattle } = await loadModule('/src/core/calculator/battleCalculation.js');
  const saved = state.createDefaultCalculatorState(config);
  const settings = {...saved.calculatorSettings, round:180, difficulty:'Normal'};
  const unit = (id,changes={}) => ({unitId:id,entryId:id,count:1,rank:'B',level:0,armor:0,lb:0,jewel:'none',xnkFixedAttacks:true,...changes});
  const run = ({ investments={}, units=[unit('amon')], extra={} }={}) => {
    const resolved = scenario.resolveScenario(settings);
    const profile = stats.calculateProfileStats({calculatorSettings:settings,units,spInvestments:investments,upgradeGroupMap:config.UPGRADE_GROUP_MAP,sandboxState:{enabled:true,stats:extra},difficultyState:resolved.difficulty,tormentState:resolved.torment});
    const army = calculateBattle({units,profile,settings,buffs:saved.buffState,jewels:saved.jewels,config});
    return optimizer.calculateUpgradeRecommendations({army,units,investments,config});
  };
  await t.test('all 82 catalog records resolve; EP and utility candidates cannot win', () => {
    const r=run(); assert.equal(r.candidates.length,82);
    assert(r.candidates.every(c=>c.reason!=='Missing upgrade definition'));
    assert.equal(new Set(r.candidates.map(c=>`${c.groupId}:${c.upgradeId}`)).size,82);
    assert(r.candidates.filter(c=>c.currency==='EP').every(c=>c.reason==='EP is not comparable to SP'));
    assert(r.candidates.filter(c=>['Util','Combat'].includes(c.category)).every(c=>c.reason));
    assert(r.recommendations.length>0);
  });
  await t.test('captured independent Amon baseline and seven sensitivity targets', () => {
    const profile=stats.calculateProfileStats({sandboxState:{enabled:true,stats:{attackDamage:81,attackSpeed:61,critChance:33}}});
    const sc=scenario.calculateScenario(settings,profile);
    const army={status:'supported', ordinaryDps:0.01, referenceOrdinary:0.01, primaryDps:0.0085,multiTargetDps:0,entries:[], profile,scenario:sc,mtDetails:{spread:1,eligible:0.017518796992481205}};
    const r=optimizer.calculateUpgradeRecommendations({army,units:[unit('amon',{level:11})],investments:{},config});
    near(r.baseline.dps,228916.29662834463);
    const expected={AD:0.012634238787113228,AS:0.030748416456552574,CC:0.03763710373736884,CD:0.03721748545134673,MC:0.0182043127171021,FD:0.010000000000000009,Accel:0.0096349620416325,'MT D':0.035072631578947355,'MT C':0.00003854135338343667,'MT MC':0.000035615714285786026};
    for(const [id,gain] of Object.entries(expected)) near(r.categories.find(c=>c.id===id).gain,gain);
    assert.equal(r.recommendations[0].upgradeId,'multi-crit-i');
  });
  await t.test('specific AD upgrades change with investment and ties are deterministic', () => {
    const category=[{id:'AD',gain:0.1,spPerPercent:100,reason:null}];
    const select=investments=>optimizer.selectUpgradeRecommendations(category,investments,config.UPGRADE_GROUPS);
    assert.equal(select({}).recommendations[0].upgradeId,'atk-dmg-i');
    assert.equal(select({rookie:{'atk-dmg-i':5}}).recommendations[0].upgradeId,'atk-dmg-ii');
    const r=select({rookie:{'atk-dmg-i':2},amateur:{'atk-dmg-ii':1}});
    // Equal-price synthetic inputs isolate tie selection from sensitivity calculations.
    const groups=[{id:'g',label:'G',currency:'SP',upgrades:[{id:'a',name:'A',maxInvestments:2,costModel:{type:'linear',base:50,perLevel:0}},{id:'b',name:'B',maxInvestments:2,costModel:{type:'linear',base:100,perLevel:0}}]}];
    const records=[{order:2,groupId:'g',upgradeId:'b',category:'AD',weight:2},{order:1,groupId:'g',upgradeId:'a',category:'AD',weight:1}];
    assert.deepEqual(optimizer.selectUpgradeRecommendations(category,{},groups,records).recommendations.map(c=>c.upgradeId),['a','b']);
    assert(r.recommendations.every(c=>c.category==='AD'));
  });
  await t.test('winning category and weighted price are both required', () => {
    const r=optimizer.selectUpgradeRecommendations([{id:'AD',spPerPercent:100,reason:null},{id:'AS',spPerPercent:50,reason:null}],{},config.UPGRADE_GROUPS);
    assert(r.recommendations.every(c=>c.category==='AS'));
    assert(!r.candidates.find(c=>c.upgradeId==='atk-dmg-i').recommended);
  });
  await t.test('speed correction includes later unit types and suppresses capped speed gains', () => {
    const normal=run({units:[unit('laser-drill')]});
    assert(normal.speedFraction>0.99);
    const capped=run({units:[unit('laser-drill')],extra:{attackSpeed:100000}});
    assert(capped.speedFraction<0.001);
    assert(capped.categories.find(c=>c.id==='AS').gain<normal.categories.find(c=>c.id==='AS').gain);
  });
  await t.test('caps, zero and negative gains, unknown prices and unsupported inputs', () => {
    const full=Object.fromEntries(config.UPGRADE_GROUPS.map(g=>[g.id,Object.fromEntries(g.upgrades.map(u=>[u.id,u.maxInvestments]))]));
    assert.equal(run({investments:full}).recommendations.length,0);
    assert.equal(run({units:[]}).status,'unavailable');
    for (const gain of [0,-0.5]) {
      const r=optimizer.selectUpgradeRecommendations([{id:'AD',gain,spPerPercent:null,reason:'No positive modeled gain'}],{},config.UPGRADE_GROUPS);
      assert.equal(r.recommendations.length,0);
    }
    const max=run({extra:{multiCrit:45}}); assert.equal(max.categories.find(c=>c.id==='MC').reason,'Multi Crit cap reached');
    assert.equal(optimizer.calculateUpgradeRecommendations({algorithmId:'future'}).status,'unavailable');
    const nearCap=run({investments:{'the-one':{'final-dmg':99}}}); assert(nearCap.categories.find(c=>c.id==='FD').reason);
    const cc=run({extra:{critChance:310}}); near(cc.categories.find(c=>c.id==='CC').gain,cc.categories.find(c=>c.id==='MC').gain);
    const ccAtMcCap=run({extra:{critChance:310,multiCrit:45}});
    assert(ccAtMcCap.categories.find(c=>c.id==='CC').gain>0);
    assert.equal(ccAtMcCap.categories.find(c=>c.id==='MC').reason,'Multi Crit cap reached');
    const unknownGroup=[{id:'unknown',currency:'SP',upgrades:[{id:'ad',name:'AD',maxInvestments:10,costModel:{type:'unavailable'}}]}];
    const selection=optimizer.selectUpgradeRecommendations([{id:'AD',gain:0.1,spPerPercent:1}],{},unknownGroup,[{order:1,groupId:'unknown',upgradeId:'ad',category:'AD',weight:3}]);
    assert.equal(selection.recommendations.length,0); assert.equal(selection.candidates[0].reason,'Unknown or invalid price');
  });
  await t.test('shield five-level estimate is 0.25 points and expensive scenarios are excluded', () => {
    const r=run({units:[unit('amon',{count:300,armor:1000,lb:6})]});
    const shield=r.categories.find(c=>c.id==='ETC');
    assert.equal(shield.purchase.step,5); assert.match(shield.modeledStep,/0.25/); assert(shield.gain>0); assert.equal(shield.reason,null);
    assert.equal(run().categories.find(c=>c.id==='ETC').reason,'Requirement exceeds four times unit DPS');
  });
  await t.test('algorithm choice persists and the panel labels its approximation without provenance', async () => {
    saved.optimizerSettings={algorithmId:'future'};
    assert.equal(state.normalizeCalculatorState(saved,config).state.optimizerSettings.algorithmId,'future');
    const {default:Panel}=await loadModule('/src/pages/LotteryDefense/EUNA/calculator/UpgradeRecommendations.jsx');
    const r=run();
    const html=renderToStaticMarkup(React.createElement(Panel,{result:r,settings:{algorithmId:'amon-estimate'},setSettings:()=>{},onShowGroup:()=>{}}));
    assert.match(html,/Optimization algorithm/); assert.match(html,/does not spend SP/); assert.match(html,/Modeled step/);
    assert.doesNotMatch(html,/sheet|Calculate!|OldSpecialty!/i);
  });
}));
