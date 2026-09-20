import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withCalculatorModules } from '../scripts/calculator/load-modules.mjs';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
test('State: catalogs, migration and persistence', async t => withCalculatorModules(async ({ config, state: api, jewels, entries, helpers }) => {
  const defaults = () => api.createDefaultCalculatorState(config);
  await t.test('catalogs and approved unit identities', () => {
    assert.equal(config.unitLibrary.length, 33);
    assert.equal(new Set(config.unitLibrary.map(u => u.id)).size, 33);
    assert.equal(config.unitLibrary.find(u => u.id === 'sarah-kerrigan').attacks, 1);
    assert.equal(config.unitLibrary.find(u => u.id === 'overmind').race, 'Neutral');
    assert.equal(config.unitLibrary.find(u => u.id === 'artifact').baseDamage, null);
    assert.equal(config.JEWEL_TYPES.length, 22);
    assert.equal(defaults().jewels.length, 21);
    assert.equal(config.LEGENDARY_JEWELS.length, 21);
    assert(defaults().jewels.every(j => j.legendary));
    assert.equal(config.JEWEL_TYPES.find(j => j.id === 'square').upgradeFd, 0);
    assert.equal(config.JEWEL_TYPES.find(j => j.id === 'square').canUpgrade, false);
    assert.equal(config.RANK_BONUSES.D.ad, 0);
    assert(config.RANK_BONUSES.D.provisional);
    assert.equal(config.INGREDIENT_ALIASES.Spart, 'goliath');
  });
  await t.test('new units are B, independent, with exactly six rune slots', () => {
    const a = entries.createUnitEntry(config.unitLibrary[0]), b = entries.createUnitEntry(config.unitLibrary[0]);
    assert.equal(a.rank, 'B'); assert.notEqual(a.entryId, b.entryId);
    assert.equal(defaults().runeLoadouts.length, 6);
  });
  await t.test('legacy UI donationSp takes precedence over unused sp; slots and input IDs survive', () => {
    const original = defaults();
    original.calculatorSettings = { donationSp: 12345, sp: 0, gameMode: 'Standard', round: 123, runeSlot: 'slot-6' };
    original.units[0].rank = 'D'; original.units[0].jewel = 'jewel-a'; original.units[0].baseDamage = 90000;
    original.runeLoadouts[5].attackDamageBase = '123';
    const result = api.normalizeCalculatorState(original, config);
    assert.equal(result.state.calculatorSettings.startingSp, 12345);
    assert.equal(result.state.calculatorSettings.gameMode, 'Classic');
    assert.equal(result.state.calculatorSettings.round, 123);
    assert.equal(result.state.units[0].rank, 'D'); assert.equal(result.state.units[0].jewel, 'jewel-a');
    assert.equal(result.state.units[0].entryId, original.units[0].entryId);
    assert(!('baseDamage' in result.state.units[0]));
    assert.equal(api.hydrateUnits(result.state.units, config)[0].baseDamage, 100);
    assert.equal(result.state.runeLoadouts[5].attackDamageBase, '123');
    assert(result.notes.some(n => n.includes('unresolved jewel')));
  });
  await t.test('empty build stays empty; unknown records and invalid nested sections recover', () => {
    const result = api.normalizeCalculatorState({ units: [], jewels: [null], runeLoadouts: null, buffState: { supports: null }, extra: { userField: 'keep' } }, config);
    assert.equal(result.state.units.length, 0);
    assert.equal(result.state.jewels.length, 21);
    assert.equal(result.state.runeLoadouts.length, 6);
    assert.equal(result.state.buffState.supports.stukov, 0);
    assert.equal(result.state.extra.userField, 'keep');
    assert(result.state.recovered.length >= 3);
  });
  await t.test('unknown unit/upgrade preserved outside active calculations', () => {
    const result = api.normalizeCalculatorState({ units: [{ unitId: 'unknown', count: 2 }], spInvestments: { rookie: { mystery: 15, 'atk-dmg-i': 3 } } }, config);
    assert.equal(result.state.units.length, 0);
    assert.equal(result.state.spInvestments.rookie['atk-dmg-i'], 3);
    assert(result.state.recovered.some(r => r.path.endsWith('mystery')));
    assert(!('mystery' in result.state.spInvestments.rookie));
  });
  await t.test('Artifact cannot be added twice or have count above one; extras recover on import', () => {
    const template = config.unitLibrary.find(u => u.id === 'artifact');
    const units = api.appendBuildUnit([], template);
    assert.equal(api.appendBuildUnit(units, template).length, 1);
    assert.equal(api.updateBuildUnit(units, units[0].entryId, 'count', 99)[0].count, 1);
    const result = api.normalizeCalculatorState({ units: [{ ...units[0], count: 3 }, { ...units[0], entryId: 'second' }] }, config);
    assert.equal(result.state.units.length, 1); assert.equal(result.state.units[0].count, 1);
    assert(result.state.recovered.some(r => r.path === 'units.1'));
  });
  await t.test('duplicate IDs get repaired and Overmind entries remain independent', () => {
    const template = config.unitLibrary.find(u => u.id === 'overmind');
    const unit = entries.createUnitEntry(template);
    const result = api.normalizeCalculatorState({ units: [unit, { ...unit }] }, config);
    assert.equal(result.state.units.length, 2);
    assert.notEqual(result.state.units[0].entryId, result.state.units[1].entryId);
    assert.equal(template.buffPolicy, 'highest-uptime');
  });
  await t.test('legacy jewel-only edit round-trips and off-step rolls are not clamped', () => {
    const original = defaults(); original.jewels[0].attackSpeed = '13';
    const normalized = api.normalizeCalculatorState(original, config);
    assert.equal(normalized.state.jewels[0].attackSpeed, '13');
    const storage = memoryStorage(); storage.setItem(api.STORAGE_KEY, JSON.stringify(original));
    const loaded = api.loadCalculatorState(storage, config);
    const changed = { ...loaded.state, jewels: jewels.updateJewelField(loaded.state.jewels, loaded.state.jewels[0].entryId, 'finalDamage', '4') };
    api.saveCalculatorState(storage, changed, loaded);
    assert.equal(api.loadCalculatorState(storage, config).state.jewels[0].finalDamage, '4');
    assert.equal(storage.getItem(loaded.recoveryKey), JSON.stringify(original));
  });
  await t.test('jewel removal clears assignments; hidden equipped jewels remain selectable', () => {
    const s = defaults(), configArg = { jewelTypes: config.JEWEL_TYPES, normalJewelDefault: config.NORMAL_JEWEL_DEFAULT };
    s.jewels = jewels.addNormalJewel(s.jewels, configArg, 'square');
    const j = s.jewels.at(-1); s.units[0].jewel = j.entryId; j.available = false;
    assert(jewels.getEquippableJewels(s.jewels, j.entryId).some(o => o.value === j.entryId));
    assert(!jewels.getEquippableJewels(s.jewels).some(o => o.value === j.entryId));
    const removed = jewels.removeJewelAndAssignments(s, j.entryId);
    assert.equal(removed.units[0].jewel, 'none'); assert.equal(removed.jewels.length, 21);
    assert.equal(jewels.removeJewelAndAssignments(s, s.jewels[0].entryId), s);
  });
  await t.test('all new input sections round-trip, including signed manual modifiers', () => {
    const original = defaults(); original.buffState.supports.stukov = 3;
    original.sandboxState.enabled = true; original.sandboxState.stats.attackDamage = -20;
    original.additionalRuneState.stats.acceleration = 5; original.resourceSettings.gpEstimatesEnabled = true;
    original.calculatorSettings.tocFloor = 84; original.calculatorSettings.gp = 50;
    original.runeLoadouts[5].manualModifiers.attackDamage = -10;
    original.runeLoadouts[5].attackDamageBonus = '-10';
    const result = api.normalizeCalculatorState(original, config).state;
    for (const key of ['buffState','sandboxState','additionalRuneState','resourceSettings']) assert.deepEqual(result[key], original[key]);
    assert.equal(result.runeLoadouts[5].manualModifiers.attackDamage, -10);
    assert.equal(result.runeLoadouts[5].attackDamageBonus, '-10');
    assert.equal(result.calculatorSettings.tocFloor, 84);
  });
  await t.test('Square upgrades are recovered and old named jewels become legendary without losing rolls', () => {
    const s = defaults();
    s.jewels.find(j => j.typeId === 'lapis').legendary = false;
    s.jewels.find(j => j.typeId === 'lapis').attackDamage = '40';
    s.jewels.push({ typeId: 'square', entryId: 'old-square', jewelUpgrade: '5', finalDamage: '3' });
    const result = api.normalizeCalculatorState(s, config);
    const square = result.state.jewels.find(j => j.entryId === 'old-square');
    assert.equal(square.jewelUpgrade, '0'); assert.equal(square.finalDamage, '3');
    assert.equal(square.legendary, false); assert.equal(square.canUpgrade, false);
    assert(result.state.recovered.some(r => r.path.endsWith('jewelUpgrade') && r.value === '5'));
    const lapis = result.state.jewels.find(j => j.typeId === 'lapis');
    assert(lapis.legendary); assert.equal(lapis.attackDamage, '40');
  });
  await t.test('awakening edit raises level; clearing awakening does not lower it', () => {
    let runes = defaults().runeLoadouts;
    runes = api.updateRuneField(runes, 'slot-1', 'runeAwakening', 'A'); assert.equal(runes[0].runeLevel, '15');
    runes = api.updateRuneField(runes, 'slot-1', 'runeAwakening', 'None'); assert.equal(runes[0].runeLevel, '15');
  });
  await t.test('new unknown-price upgrades do not look free', () => {
    const upgrade = config.UPGRADE_GROUP_MAP.rookie.upgrades.find(u => u.id === 'exchange');
    assert.equal(helpers.getNextUpgradePrice(upgrade, 0), null);
    assert.equal(helpers.getTotalUpgradePrice(upgrade, 2), null);
    const totals = helpers.calculateUpgradeTotals({ rookie: { exchange: 2, 'atk-dmg-i': 5 } }, config.UPGRADE_GROUPS);
    assert.equal(totals.totalSpOverall, 650); assert.equal(totals.unknownCostUpgrades.length, 1);
  });
  await t.test('malformed/future/foreign saves are never overwritten', () => {
    for (const raw of ['{broken', 'null', '{"schemaVersion":99}', '{"versionId":"kr"}']) {
      const storage = memoryStorage(); storage.setItem(api.STORAGE_KEY, raw);
      const loaded = api.loadCalculatorState(storage, config); assert(loaded.blocked);
      api.saveCalculatorState(storage, loaded.state, loaded); assert.equal(storage.getItem(api.STORAGE_KEY), raw);
    }
  });
  await t.test('recovery write failure prevents replacing the original save', () => {
    const storage = memoryStorage(); const raw = '{"calculatorSettings":{"donationSp":999}}'; storage.setItem(api.STORAGE_KEY, raw);
    const loaded = api.loadCalculatorState(storage, config);
    const failing = { getItem: storage.getItem, setItem() { throw new Error('quota'); } };
    assert.throws(() => api.saveCalculatorState(failing, loaded.state, loaded), /quota/);
    assert.equal(storage.getItem(api.STORAGE_KEY), raw);
  });
  await t.test('serialized entries contain inputs, not stale template statistics', () => {
    const storage = memoryStorage(), s = defaults(); s.units = api.hydrateUnits(s.units, config);
    api.saveCalculatorState(storage, s, { blocked: false });
    const saved = JSON.parse(storage.getItem(api.STORAGE_KEY));
    assert.equal(saved.schemaVersion, 1); assert(!('baseDamage' in saved.units[0]));
  });
}));
