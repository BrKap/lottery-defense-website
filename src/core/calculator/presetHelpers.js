import { createDefaultCalculatorState, normalizeCalculatorState, SCHEMA_VERSION, unitInputs } from './calculatorState';
const fields = ['schemaVersion','versionId','dataRevision','calculatorSettings','units','jewels','runeLoadouts','spInvestments','buffState','sandboxState','additionalRuneState','resourceSettings','optimizerSettings','recovered'];
const clone = value => JSON.parse(JSON.stringify(value));
export function snapshotBuild(state) {
  const build = Object.fromEntries(fields.filter(key => state[key] !== undefined).map(key => [key, clone(state[key])]));
  build.units = clone(state.units.map(unitInputs));
  return build;
}
export const exportPreset = state => JSON.stringify(snapshotBuild(state), null, 2);
export function parsePreset(raw, config) {
  let input;
  try { input = JSON.parse(raw); } catch { throw new Error('Import is not valid JSON.'); }
  if (!input || input.versionId !== 'euna') throw new Error('Only EUNA builds can be imported here.');
  if (input.schemaVersion !== SCHEMA_VERSION) throw new Error('This build uses an unsupported schema version.');
  if (!input.calculatorSettings || !Array.isArray(input.units) || !Array.isArray(input.jewels) || !Array.isArray(input.runeLoadouts) || !input.spInvestments) throw new Error('The import is missing required build sections.');
  const result = normalizeCalculatorState(input, config);
  if (result.blocked) throw new Error('This build cannot be imported.');
  return { build:snapshotBuild(result.state), notes:result.notes };
}
export function changePreset(state, action, config) {
  const next = clone(state), library = next.presetLibrary;
  const name = value => String(value ?? '').trim().slice(0,120) || 'Untitled build';
  if (!library.activeId) {
    library.activeId = crypto.randomUUID();
    library.items.push({id:library.activeId, name:name(state.calculatorSettings.presetName), build:snapshotBuild(state)});
  }
  const current = library.items.find(p => p.id === library.activeId);
  current.name = name(state.calculatorSettings.presetName);
  current.build = snapshotBuild(state);
  if (action.type === 'rename') {
    next.calculatorSettings.presetName = name(action.name);
    current.name = next.calculatorSettings.presetName;
    current.build = snapshotBuild(next);
    return next;
  }
  let selected;
  if (action.type === 'select') selected = library.items.find(p=>p.id===action.id);
  else if (action.type === 'delete') {
    library.deleted = clone(current);
    library.items = library.items.filter(p=>p.id!==current.id);
    selected = library.items[0];
  } else if (action.type === 'undo-delete') {
    if (!library.deleted) return next;
    selected = {...library.deleted,id:crypto.randomUUID()}; library.items.push(selected); library.deleted=null;
  } else if (['new','duplicate','import'].includes(action.type)) {
    const build = action.type === 'new' ? snapshotBuild(createDefaultCalculatorState(config)) : action.type === 'import' ? parsePreset(action.raw,config).build : snapshotBuild(state);
    build.calculatorSettings.presetName = name(action.name ?? (action.type==='duplicate' ? `${current.name} copy` : action.type==='new' ? 'New build' : build.calculatorSettings.presetName));
    selected = {id:crypto.randomUUID(),name:build.calculatorSettings.presetName,build}; library.items.push(selected);
  } else throw new Error('Unknown preset action.');
  if (!selected && action.type !== 'delete') throw new Error('The selected preset is unavailable.');
  if (!selected) {
    selected = {id:crypto.randomUUID(),name:'New build',build:snapshotBuild(createDefaultCalculatorState(config))}; library.items.push(selected);
  }
  const imported = parsePreset(JSON.stringify(selected.build),config);
  library.activeId = selected.id;
  return {...next,...imported.build,calculatorSettings:{...imported.build.calculatorSettings,presetName:selected.name},presetLibrary:library,activeTab:'presets'};
}
