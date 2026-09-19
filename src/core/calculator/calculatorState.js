import { buildInitialInvestments, sanitizeInvestmentValue } from './spUpgradeHelpers';
import { createUnitEntry } from './createUnitEntry';
import { createLegendaryJewelsState } from './jewelHelpers';

export const STORAGE_KEY = 'ld-euna-calculator-state';
export const SCHEMA_VERSION = 1;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = () => crypto.randomUUID();
const derivedUnitFields = ['id','name','race','weapon','baseDamage','attackSpeed','attacks','defensePen','mockDpsPerUnit','baseInterval','raceFlags','gradeModel','abilityId','maxCount','buffPolicy','damageAdjustment','speedAdjustment','recipeId','calculationStatus'];
export function unitInputs(unit) {
  const result = { ...unit };
  derivedUnitFields.forEach(key => delete result[key]);
  return result;
}
export function hydrateUnits(units, config) {
  return units.map(unit => ({ ...config.unitLibrary.find(template => template.id === unit.unitId), ...unit }));
}
export function createDefaultCalculatorState(config) {
  const zeroStats = { attackDamage: 0, attackSpeed: 0, critDamage: 0, critChance: 0, finalDamage: 0, acceleration: 0, skillDamage: 0, armorReduction: 0, multiCrit: 0 };
  return {
    schemaVersion: SCHEMA_VERSION, versionId: 'euna', dataRevision: config.DATA_REVISION,
    activeTab: 'main', selectedUnitId: config.unitLibrary[0]?.id ?? '', spActiveGroupId: config.UPGRADE_GROUPS[0]?.id,
    calculatorSettings: { title: 'Rookie', difficulty: 'Practice', torment: 0, round: 270, xp: 0, startingSp: 0,
      gameMode: 'Classic', tocMode: false, tocFloor: 70, gp: 0, theZeroLevel: 0,
      runeSlot: config.RUNE_SLOTS[0]?.value, presetName: 'Default EUNA Preset', penetrationEnabled: true },
    units: config.unitLibrary.filter((_, i) => [0,1,3].includes(i)).map(u => unitInputs(createUnitEntry(u))),
    jewels: createLegendaryJewelsState({ legendaryJewels: config.JEWEL_TYPES.filter(j => j.id !== 'square'), normalJewelDefault: config.NORMAL_JEWEL_DEFAULT }),
    runeLoadouts: config.createInitialRuneLoadouts().map(r => ({ ...r, manualModifiers: { attackDamage: 0, attackSpeed: 0, critDamage: 0, critChance: 0 } })), spInvestments: buildInitialInvestments(config.UPGRADE_GROUPS),
    buffState: { teamBuffCount: 0, bless: 0, sdGem: 'none', critGem: false, shieldMaster: false, superShield: false,
      powerBanker: false, powerBankerPlus: false, superBuff: false, superBuffPlus: false, purifierEnabled: false,
      supports: { corruption: 0, godOfTime: 0, stukov: 0, warfield: 0, talTempest: 0, tassadar: 0, vessel: 0 } },
    sandboxState: { enabled: false, stats: { ...zeroStats } }, additionalRuneState: { enabled: false, stats: { ...zeroStats } },
    resourceSettings: { includeInfinite: true, gpEstimatesEnabled: false, bankEnabled: false },
    recovered: [], migrationNotes: [],
  };
}

export function normalizeCalculatorState(saved, config) {
  const defaults = createDefaultCalculatorState(config);
  if (!object(saved)) return { state: defaults, notes: ['Saved build has an invalid format.'], blocked: true };
  if (!Number.isInteger(saved.schemaVersion ?? 0) || (saved.schemaVersion ?? 0) < 0 || (saved.schemaVersion ?? 0) > SCHEMA_VERSION || (saved.versionId && saved.versionId !== 'euna')) {
    return { state: defaults, notes: ['This build uses a different version. It has not been overwritten.'], blocked: true };
  }
  const notes = [], recovered = Array.isArray(saved.recovered) ? saved.recovered.filter(object) : [];
  const recover = (path, value, message) => {
    if (!recovered.some(r => r.path === path && JSON.stringify(r.value) === JSON.stringify(value))) recovered.push({ path, value });
    notes.push(message);
  };
  const finite = (value, fallback, path, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false) => {
    if (value === undefined) return fallback;
    const n = typeof value === 'number' || typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
    if (!Number.isFinite(n)) { recover(path, value, `${path}: invalid number restored to default.`); return fallback; }
    const result = Math.max(min, Math.min(max, integer ? Math.floor(n) : n));
    if (n !== result) recover(path, value, `${path}: out-of-range value retained in recovery.`);
    return result;
  };
  const merge = (base, incoming, path) => {
    if (incoming === undefined) return base;
    if (!object(incoming)) { recover(path, incoming, `${path}: invalid section retained in recovery.`); return base; }
    const result = { ...incoming };
    for (const [key, fallback] of Object.entries(base)) {
      const value = incoming[key], location = `${path}.${key}`;
      if (object(fallback)) result[key] = merge(fallback, value, location);
      else if (typeof fallback === 'number') result[key] = finite(value, fallback, location, /stats|manualModifiers/.test(path) ? -Number.MAX_SAFE_INTEGER : 0);
      else if (typeof fallback === 'boolean') {
        result[key] = typeof value === 'boolean' ? value : fallback;
        if (value !== undefined && typeof value !== 'boolean') recover(location, value, `${location}: invalid switch retained in recovery.`);
      } else result[key] = typeof value === 'string' ? value : fallback;
    }
    return result;
  };
  const state = { ...saved, ...defaults, recovered };
  // Unknown top-level fields survive round-trip without being interpreted.
  for (const key of Object.keys(saved)) if (!(key in defaults)) state[key] = saved[key];
  state.calculatorSettings = merge(defaults.calculatorSettings, saved.calculatorSettings, 'settings');
  const settings = state.calculatorSettings, old = object(saved.calculatorSettings) ? saved.calculatorSettings : {};
  settings.startingSp = finite(old.startingSp ?? old.donationSp ?? old.sp, 0, 'settings.startingSp');
  delete settings.donationSp; delete settings.sp;
  if (old.donationSp !== undefined || old.sp !== undefined) notes.push('Donation SP was migrated to Starting SP; the original save is available for recovery.');
  if (settings.gameMode === 'Standard') { settings.gameMode = 'Classic'; notes.push('Standard mode was renamed Classic.'); }
  settings.torment = finite(settings.torment, 0, 'settings.torment', 0, 20, true);
  settings.theZeroLevel = finite(settings.theZeroLevel, 0, 'settings.theZeroLevel', 0, 11, true);
  settings.gp = finite(settings.gp, 0, 'settings.gp', 0, 400, true);
  for (const [key, allowed] of Object.entries({ title: config.TITLES, difficulty: config.DIFFICULTIES, gameMode: config.GAME_MODES, round: config.CLASSIC_ROUNDS, tocFloor: config.TOC_FLOORS })) {
    if (!allowed.includes(settings[key])) notes.push(`Saved ${key} (${settings[key]}) has no supported option. Choose a supported value.`);
  }
  for (const key of ['buffState','sandboxState','additionalRuneState','resourceSettings']) state[key] = merge(defaults[key], saved[key], key);
  const list = (key, fallback) => {
    if (saved[key] === undefined) return fallback;
    if (Array.isArray(saved[key])) return saved[key];
    recover(key, saved[key], `${key}: invalid list retained in recovery.`); return fallback;
  };
  const jewelIds = new Set();
  state.jewels = list('jewels', defaults.jewels).flatMap((jewel, i) => {
    if (!object(jewel)) { recover(`jewels.${i}`, jewel, 'Invalid jewel retained in recovery.'); return []; }
    const typeId = jewel.typeId ?? jewel.id ?? (typeof jewel.name === 'string' ? jewel.name.toLowerCase() : 'square');
    const type = config.JEWEL_TYPES.find(t => t.id === typeId);
    if (!type) { recover(`jewels.${i}`, jewel, 'Unknown jewel type retained in recovery.'); return []; }
    let entryId = typeof jewel.entryId === 'string' && jewel.entryId ? jewel.entryId : id();
    if (jewelIds.has(entryId)) { recover(`jewels.${i}.entryId`, entryId, 'Duplicate jewel ID replaced; verify assignments.'); entryId = id(); }
    jewelIds.add(entryId);
    const result = { ...config.NORMAL_JEWEL_DEFAULT, ...jewel, ...type, entryId, available: jewel.available !== false };
    for (const key of [...config.JEWEL_EDITABLE_ROWS.map(r => r.key), 'jewelUpgrade','innateAd']) {
      const value = jewel[key] ?? result[key];
      result[key] = typeof value === 'string' || typeof value === 'number' ? String(value) : '0';
      const allowed = key === 'jewelUpgrade' ? config.JEWEL_UPGRADE_OPTIONS : key === 'innateAd' ? config.LAPIS_AD_OPTIONS : config.JEWEL_STAT_OPTIONS[key];
      if (!allowed.some(o => o.value === result[key])) notes.push(`${type.name}: saved ${key} ${result[key]} needs reselection.`);
    }
    if (type.id === 'square' && result.jewelUpgrade !== '0') {
      recover(`jewels.${i}.jewelUpgrade`, result.jewelUpgrade, 'Square jewels cannot be upgraded. The old upgrade value is retained in recovery.');
      result.jewelUpgrade = '0';
    }
    return [result];
  });
  for (const jewel of defaults.jewels) if (!state.jewels.some(j => j.typeId === jewel.typeId) &&
    (jewel.legendary || saved.dataRevision !== config.DATA_REVISION)) state.jewels.push(jewel);
  const entryIds = new Set(); let hasArtifact = false;
  state.units = list('units', defaults.units).flatMap((unit, i) => {
    const template = object(unit) && config.unitLibrary.find(t => t.id === unit.unitId);
    if (!template || (unit.unitId === 'artifact' && hasArtifact)) { recover(`units.${i}`, unit, 'Unknown unit or duplicate Artifact retained in recovery.'); return []; }
    if (unit.unitId === 'artifact') hasArtifact = true;
    const result = { ...unitInputs(createUnitEntry(template)), ...unitInputs(unit) };
    if (typeof result.entryId !== 'string' || !result.entryId || entryIds.has(result.entryId)) result.entryId = id();
    entryIds.add(result.entryId);
    for (const [key, max] of Object.entries({ count: template.maxCount ?? 999, level: 11, lb: 6, armor: 1000, overmindStacks: 999 })) result[key] = finite(result[key], 0, `units.${i}.${key}`, 0, max, key !== 'armor');
    if (!config.RANK_OPTIONS.includes(result.rank)) notes.push(`${template.name}: saved rank needs reselection.`);
    result.rank = typeof result.rank === 'string' ? result.rank : 'B';
    result.jewel = typeof result.jewel === 'string' ? result.jewel : 'none';
    if (result.jewel !== 'none' && !state.jewels.some(j => j.entryId === result.jewel)) notes.push(`${template.name}: unresolved jewel (${result.jewel}); reassign it in Build Units.`);
    return [result];
  });
  const incomingRunes = list('runeLoadouts', defaults.runeLoadouts);
  state.runeLoadouts = defaults.runeLoadouts.map(base => {
    const incoming = incomingRunes.find(r => object(r) && r.slot === base.slot);
    const result = { ...base, ...incoming, slot: base.slot };
    if (!config.RUNE_TYPES.some(t => t.value === String(result.runeType).toLowerCase())) {
      recover(`runes.${base.slot}`, incoming, 'Unknown rune type retained in recovery.'); return base;
    }
    for (const [key, fallback] of Object.entries(base)) if (typeof fallback === 'string' && typeof result[key] !== 'string' && typeof result[key] !== 'number') result[key] = fallback;
    result.manualModifiers = merge({ attackDamage: 0, attackSpeed: 0, critDamage: 0, critChance: 0 }, incoming?.manualModifiers, 'rune.manualModifiers');
    result.runeLevel = String(finite(result.runeLevel, 0, 'rune.level', 0, 15, true));
    for (const key of Object.keys(base)) if (key.endsWith('Base') || key.endsWith('Bonus') || key.startsWith('enchant')) result[key] = String(finite(result[key], Number(base[key]), `rune.${key}`, key.endsWith('Bonus') ? -Number.MAX_SAFE_INTEGER : 0, key.startsWith('enchant') ? 9 : Number.MAX_SAFE_INTEGER));
    return result;
  });
  incomingRunes.forEach((r, i) => { if (!object(r) || !defaults.runeLoadouts.some(d => d.slot === r.slot) || incomingRunes.findIndex(other => other?.slot === r.slot) !== i) recover(`runeLoadouts.${i}`, r, 'Extra rune record retained in recovery.'); });
  const runeIds = new Set();
  state.runeLoadouts.forEach(r => { if (typeof r.id !== 'string' || !r.id || runeIds.has(r.id)) r.id = id(); runeIds.add(r.id); });
  if (!config.RUNE_SLOTS.some(s => s.value === settings.runeSlot)) settings.runeSlot = defaults.calculatorSettings.runeSlot;
  const investments = object(saved.spInvestments) ? saved.spInvestments : {};
  if (saved.spInvestments !== undefined && !object(saved.spInvestments)) recover('spInvestments', saved.spInvestments, 'Invalid investments retained in recovery.');
  for (const group of config.UPGRADE_GROUPS) for (const upgrade of group.upgrades) {
    const value = investments[group.id]?.[upgrade.id];
    const safe = finite(value, 0, `investments.${group.id}.${upgrade.id}`, 0, upgrade.maxInvestments, true);
    state.spInvestments[group.id][upgrade.id] = sanitizeInvestmentValue(upgrade, safe);
  }
  for (const [groupId, values] of Object.entries(investments)) {
    const group = config.UPGRADE_GROUPS.find(g => g.id === groupId);
    if (!group || !object(values)) recover(`investments.${groupId}`, values, 'Unknown investment group retained in recovery.');
    else for (const [key, value] of Object.entries(values)) if (!group.upgrades.some(u => u.id === key)) recover(`investments.${groupId}.${key}`, value, 'Unknown upgrade retained in recovery.');
  }
  for (const [key, allowed] of Object.entries({ activeTab: config.TAB_OPTIONS.map(t => t.id), selectedUnitId: config.unitLibrary.map(u => u.id), spActiveGroupId: config.UPGRADE_GROUPS.map(g => g.id) })) state[key] = allowed.includes(saved[key]) ? saved[key] : defaults[key];
  state.migrationNotes = [...new Set([...(Array.isArray(saved.migrationNotes) ? saved.migrationNotes.filter(n => typeof n === 'string') : []), ...notes])];
  return { state, notes: state.migrationNotes, blocked: false,
    needsRecovery: saved.schemaVersion !== SCHEMA_VERSION || saved.dataRevision !== config.DATA_REVISION || notes.length > 0 };
}

export function loadCalculatorState(storage, config) {
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { state: createDefaultCalculatorState(config), notes: [], blocked: false };
    const result = normalizeCalculatorState(JSON.parse(raw), config);
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
    return { ...result, originalRaw: raw, recoveryKey: result.needsRecovery ? `${STORAGE_KEY}-recovery-${raw.length}-${hash >>> 0}` : null };
  } catch {
    return { state: createDefaultCalculatorState(config), notes: ['Saved data could not be loaded. Automatic saving is disabled to protect it.'], blocked: true, originalRaw: raw };
  }
}
export function saveCalculatorState(storage, state, loaded) {
  if (loaded.blocked) return;
  if (loaded.originalRaw && loaded.recoveryKey) {
    const existing = storage.getItem(loaded.recoveryKey);
    if (existing !== null && existing !== loaded.originalRaw) throw new Error('Recovery key collision; original retained.');
    if (existing === null) storage.setItem(loaded.recoveryKey, loaded.originalRaw);
  }
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION, units: state.units.map(unitInputs) }));
}
export function updateRuneField(runes, slot, field, value) {
  return runes.map(r => r.slot !== slot ? r : { ...r, [field]: value,
    ...(field === 'runeAwakening' && ['A','B','C','D','E'].includes(value) ? { runeLevel: '15' } : {}) });
}

export function updateBuildUnit(units, entryId, field, value) {
  return units.map(unit => {
    if (unit.entryId !== entryId) return unit;
    const max = { count: unit.unitId === 'artifact' ? 1 : 999, level: 11, lb: 6, armor: 1000 }[field];
    const next = max === undefined ? value : Math.max(0, Math.min(max, field === 'armor' ? Number(value) || 0 : Math.floor(Number(value) || 0)));
    return { ...unit, [field]: next };
  });
}
export function appendBuildUnit(units, template) {
  if (template.id === 'artifact' && units.some(u => u.unitId === 'artifact')) return units;
  return [...units, unitInputs(createUnitEntry(template))];
}
