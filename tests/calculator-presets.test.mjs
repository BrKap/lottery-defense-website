import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';

test('Portable JSON presets and complete build persistence', async t => withCalculatorModules(async ({ config, state, loadModule }) => {
  const {snapshotBuild,exportPreset,parsePreset,changePreset}=await loadModule('/src/core/calculator/presetHelpers.js');
  const rich=state.createDefaultCalculatorState(config);
  rich.calculatorSettings={...rich.calculatorSettings,presetName:'Review build',tocMode:true,tocFloor:81,round:270,runeSlot:'Test',startingSp:10000000};
  rich.units[0].overmindStacks=5; rich.units[0].xnkFixedAttacks=false; rich.units[1].jewel=rich.jewels[0].entryId;
  rich.jewels[0].jewelUpgrade='3'; rich.buffState.supports.stukov=2;
  rich.resourceSettings.gpEstimatesEnabled=true; rich.spInvestments.divine['sp-bank']=250;
  rich.additionalRuneState={...rich.additionalRuneState,enabled:true,method:'manual',stats:{attackDamage:123}};
  await t.test('full build round trip retains IDs, assignments and every calculation input', () => {
    const decoded=parsePreset(exportPreset(rich),config).build;
    assert.equal(decoded.units[0].overmindStacks,5); assert.equal(decoded.units[0].xnkFixedAttacks,false);
    assert.equal(decoded.units[1].jewel,decoded.jewels[0].entryId);
    assert.equal(decoded.buffState.supports.stukov,2); assert.equal(decoded.spInvestments.divine['sp-bank'],250);
    assert.equal(decoded.calculatorSettings.round,270); assert.equal(decoded.calculatorSettings.tocFloor,81);
    assert.equal(decoded.additionalRuneState.stats.attackDamage,123); assert(decoded.resourceSettings.gpEstimatesEnabled);
    assert.equal(decoded.optimizerSettings.algorithmId,'amon-estimate');
    assert(!('presetLibrary' in decoded)); assert(!('uiSettings' in decoded));
  });
  await t.test('new checkpoints edits, duplicate isolates them, rename and delete are reversible', () => {
    let current=changePreset(rich,{type:'new',name:'Fresh'},config);
    const original=current.presetLibrary.items.find(p=>p.name==='Review build').id;
    assert.equal(current.presetLibrary.items.length,2); assert.equal(current.spInvestments.divine['sp-bank'],0);
    current=changePreset(current,{type:'select',id:original},config);
    assert.equal(current.units[0].overmindStacks,5);
    current=changePreset(current,{type:'duplicate'},config);
    current.units[0].overmindStacks=2;
    current=changePreset(current,{type:'rename',name:'Copy edited'},config);
    const copy=current.presetLibrary.activeId;
    current=changePreset(current,{type:'select',id:original},config); assert.equal(current.units[0].overmindStacks,5);
    current=changePreset(current,{type:'select',id:copy},config); assert.equal(current.units[0].overmindStacks,2);
    current=changePreset(current,{type:'delete'},config); assert(!current.presetLibrary.items.some(p=>p.id===copy));
    current=changePreset(current,{type:'undo-delete'},config); assert.equal(current.calculatorSettings.presetName,'Copy edited'); assert.equal(current.units[0].overmindStacks,2);
    assert.equal(rich.presetLibrary.items.length,0);
  });
  await t.test('preset changes preserve the current calculator tab', () => {
    const current = changePreset({...rich, activeTab:'build-units'}, {type:'new'}, config);
    assert.equal(current.activeTab, 'build-units');
    assert(!config.TAB_OPTIONS.some(tab => tab.id === 'presets'));
  });
  await t.test('import creates a new preset without overwriting current build or nesting libraries', () => {
    const imported=changePreset(rich,{type:'import',raw:exportPreset(rich)},config);
    assert.equal(imported.presetLibrary.items.length,2);
    assert(imported.presetLibrary.items.every(p=>!p.build.presetLibrary));
    assert.equal(new Set(imported.presetLibrary.items.map(p=>p.id)).size,2);
    const storage=new Map(); const adapter={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
    state.saveCalculatorState(adapter,imported,{blocked:false});
    const loaded=state.loadCalculatorState(adapter,config).state;
    assert.equal(loaded.presetLibrary.activeId,imported.presetLibrary.activeId);
    assert.equal(loaded.units[0].overmindStacks,5);
  });
  await t.test('malformed, cross-region and future imports cannot replace a build', () => {
    for(const raw of ['broken','null','{}',JSON.stringify({...snapshotBuild(rich),versionId:'kr'}),JSON.stringify({...snapshotBuild(rich),schemaVersion:99}),JSON.stringify({...snapshotBuild(rich),units:null})]) assert.throws(()=>parsePreset(raw,config));
    const before=exportPreset(rich);
    assert.throws(()=>changePreset(rich,{type:'import',raw:'{}'},config));
    assert.equal(exportPreset(rich),before);
    const invalid=snapshotBuild(rich); invalid.units[0].overmindStacks=99;
    const preview=parsePreset(JSON.stringify(invalid),config); assert(preview.notes.length>0); assert.equal(preview.build.units[0].overmindStacks,5);
  });
  await t.test('bad library is recoverable and panel preferences persist independently', () => {
    const saved={...rich,presetLibrary:{activeId:'missing',items:[]},uiSettings:{panelDocked:false,panelMinimized:true,panelExtras:true}};
    const normalized=state.normalizeCalculatorState(saved,config).state;
    assert.equal(normalized.presetLibrary.items.length,0); assert(normalized.recovered.some(r=>r.path==='presetLibrary'));
    assert.deepEqual(normalized.uiSettings,saved.uiSettings);
    const next=changePreset(normalized,{type:'new'},config); assert.deepEqual(next.uiSettings,saved.uiSettings);
  });
  await t.test('global preset toolbar replaces the tab and KR remains placeholder', async () => {
    const {default:PresetToolbar}=await loadModule('/src/pages/LotteryDefense/EUNA/calculator/PresetToolbar.jsx');
    const html=renderToStaticMarkup(React.createElement(PresetToolbar,{state:rich,config,onAction:()=>{}}));
    assert.match(html,/Download preset JSON/); assert.match(html,/Import preset JSON/);
    assert.match(html,/New preset/); assert.match(html,/Duplicate preset/); assert.match(html,/Rename preset/);
    assert.match(html,/Delete preset/); assert.match(html,/Selected preset/);
    assert.doesNotMatch(html,/scaffold|sheet|Export Code/);
    const {krVersionConfig}=await loadModule('/src/data/kr/index.js'); assert.equal(krVersionConfig.status,'placeholder');
  });
}));
