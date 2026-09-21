import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';
import { getRuneAffixOptions, canUseBless } from '../src/core/calculator/buffOptions.js';
const near = (a,b) => assert(Math.abs(a-b) < 1e-10, `${a} != ${b}`);
test('Profile stages and approved rune behavior', async t => withCalculatorModules(async ({ stats, runes }) => {
  const rune = input => ({...runes.createEmptyRuneData('slot-1'), ...input});
  const profile = input => stats.calculateProfileStats({ runeConstants: runes, ...input });
  await t.test('caps precede Flower; excess CC survives; Nydus is separate', () => {
    const input = { sandboxState: {enabled:true,stats:{attackDamage:5000,multiCrit:60,armorReduction:90,critChance:150,finalDamage:10}}, units:[{unitId:'flower',count:1},{unitId:'flower',count:2}] };
    const p = profile(input);
    assert.equal(p.rawStats.attackDamage,5000); assert.equal(p.cappedStats.attackDamage,4000);
    assert.equal(p.combatStats.stats.attackDamage,4020); assert.equal(p.combatStats.stats.skillDamage,40);
    assert.equal(p.cappedStats.multiCrit,45); assert.equal(p.cappedStats.armorReduction,60); assert.equal(p.cappedStats.critChance,150);
    near(p.combatStats.attackDamageFactor,41.2); near(p.displayStats.attackDamageWithFD,4400);
    assert.equal(profile({...input,units:[{unitId:'nydus',count:3}]}).combatStats.stats.attackDamage,4000);
  });
  await t.test('disabled manual inputs contribute nothing and retain their values', () => {
    const manual = {enabled:false,stats:{attackDamage:900,acceleration:30}};
    const p = profile({sandboxState:manual,additionalRuneState:{enabled:true,stats:{acceleration:20}}});
    assert.equal(p.rawStats.attackDamage,0); near(p.rawStats.acceleration,1.2); assert.equal(manual.stats.attackDamage,900);
    near(profile({sandboxState:{...manual,enabled:true},additionalRuneState:{enabled:true,stats:{acceleration:20}}}).rawStats.acceleration,1.56);
    assert.equal(profile({sandboxState:{enabled:true,stats:{acceleration:-100}}}).combatStats.accelerationMultiplier,0);
  });
  await t.test('unit presence buffs apply once, Super Buff precedence, ToC suppression', () => {
    const input = {calculatorSettings:{title:'Divine'},buffState:{teamBuffCount:2,bless:1,superBuff:true,superBuffPlus:true,critGem:true,powerBanker:true,powerBankerPlus:true}, units:[{unitId:'amon',count:1},{unitId:'amon',count:1},{unitId:'xelnaga-kerrigan',count:1},{unitId:'artifact',count:1}]};
    const p = profile(input); near(p.rawStats.attackDamage,223.9); near(p.rawStats.critChance,80.3);
    near(profile({...input,calculatorSettings:{title:'Divine',tocMode:true}}).rawStats.attackDamage,169.9);
  });
  await t.test('GP thresholds and Zero boundaries', () => {
    for (const [gp,count] of [[8,1],[9,2],[20,2],[21,3],[32,3],[33,4]]) assert.equal(profile({calculatorSettings:{gp}}).combatStats.gpCountThreshold,count);
    assert.equal(profile({calculatorSettings:{gp:25}}).rawStats.attackDamage,5);
    for (const [level,fd] of [[3,0],[4,2],[11,16]]) assert.equal(profile({calculatorSettings:{title:'The Zero',theZeroLevel:level}}).rawStats.finalDamage,fd);
    assert.equal(profile({calculatorSettings:{title:'Rookie',theZeroLevel:11}}).rawStats.finalDamage,0);
  });
  await t.test('unique bonuses still stack with selected race and manual rolls', () => {
    const r = stats.calculateRuneSourceStats([rune({runeLevel:'15',runeRaceUpgrade:'Zerg',runeBonusTen:'Every Race +1',runeBonusFifteen:'Every Race +1',manualModifiers:{attackDamage:-7}})],runes);
    assert.equal(r.finalStats.raceUpgradeZerg,2); assert.equal(r.finalStats.raceUpgradeTBio,1); assert.equal(r.finalStats.attackDamage,18);
  });
  await t.test('Cosmos/Chaos caps and flags are type and slot scoped', () => {
    const source = input => stats.calculateRuneSourceStats([rune(input)],runes);
    near(source({runeType:'cosmos',accelerationBase:'99'}).finalStats.acceleration,1.1);
    assert(source({runeType:'cosmos',runeLevel:'10',runeBonusTen:'-SS & Refund'}).flags.bypassSuperShield);
    assert(!source({runeType:'cosmos',runeLevel:'15',runeTran:'-SS & Refund'}).flags.bypassSuperShield);
    assert.equal(source({runeType:'chaos',runeLevel:'10',finalDamageBase:'99',runeBonusTen:'2x Final dmg'}).finalStats.finalDamage,10);
    assert.equal(source({runeType:'chaos',runeLevel:'15',finalDamageBase:'99',runeTran:'2x Final dmg'}).finalStats.finalDamage,5);
    assert.equal(runes.getRuneEnchantDisplayValue('attackDamage',9),'+60');
  });
  await t.test('SD gems remain separate skill multipliers', () => {
    const p = profile({buffState:{sdGem:'SD+'},sandboxState:{enabled:true,stats:{skillDamage:100}}});
    assert.equal(p.rawStats.skillDamage,100); assert.equal(p.combatStats.sdGemMultiplier,1.67);
  });
  await t.test('affix choices exclude opposite selection and keep None', () => {
    const options = runes.RUNE_BONUS_TEN_OPTIONS;
    assert(!getRuneAffixOptions(options,'3 MC','None').some(o => o.value === '3 MC'));
    assert(getRuneAffixOptions(options,'None','None').some(o => o.value === 'None'));
    assert(getRuneAffixOptions(options,'3 MC','3 MC').find(o => o.value === '3 MC').disabled);
    assert(runes.RUNE_TRAN_OPTIONS.some(o => o.value === '3 MC'));
  });
  await t.test('Bless is inactive below Divine without changing saved choice', () => {
    const buffState = {bless:3};
    assert(!canUseBless('Master')); assert(canUseBless('The Zero'));
    assert.equal(profile({buffState,calculatorSettings:{title:'Master'}}).rawStats.attackDamage,0);
    assert.equal(profile({buffState,calculatorSettings:{title:'Divine'}}).rawStats.attackDamage,60);
    assert.equal(buffState.bless,3);
  });
  await t.test('additional rune restricts stats and supports future methods without Test', () => {
    const input = {enabled:true,method:'manual',stats:{attackDamage:17,skillDamage:100,armorReduction:40,multiCrit:9}};
    const manual = stats.calculateAdditionalRuneSourceStats(input);
    assert.equal(manual.finalStats.attackDamage,17);
    for (const key of ['skillDamage','armorReduction','multiCrit']) assert.equal(manual.finalStats[key],0);
    const pending = stats.calculateAdditionalRuneSourceStats({...input,method:'automatic'});
    assert(pending.unavailable); assert.equal(pending.finalStats.attackDamage,0);
    const owned = runes.createInitialRuneLoadouts();
    const automatic = stats.calculateAdditionalRuneSourceStats({...input,method:'future'},owned,{future: rs => {
      assert.equal(rs.length,5); assert(!rs.some(r => r.slot === 'slot-6'));
      rs[0].attackDamageBase = '999';
      return {attackDamage:25,skillDamage:100};
    }});
    assert.equal(automatic.finalStats.attackDamage,25); assert.equal(automatic.finalStats.skillDamage,0);
    assert.equal(owned[0].attackDamageBase,'10'); assert.equal(input.stats.attackDamage,17);
    assert.equal(stats.calculateAdditionalRuneSourceStats({...input,enabled:false}).finalStats.attackDamage,0);
  });
}));
