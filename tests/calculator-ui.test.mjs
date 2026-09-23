import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';

test('Calculator controls and shared result rendering', async t => withCalculatorModules(async ({ config, state, stats, scenario, loadModule }) => {
  const [{ default: BuffsTab }, { default: MainTab }, { CalculatorConfigProvider }] = await Promise.all([
    loadModule('/src/pages/LotteryDefense/EUNA/calculator/tabs/BuffsTab.jsx'),
    loadModule('/src/pages/LotteryDefense/EUNA/calculator/MainTab.jsx'),
    loadModule('/src/core/calculator/CalculatorConfigContext.jsx'),
  ]);
  const saved = state.createDefaultCalculatorState(config);
  const noop = () => {};
  const render = (component, props) => renderToStaticMarkup(React.createElement(CalculatorConfigProvider, { value: { calculator: config } }, React.createElement(component, props)));
  await t.test('Main and Build Units render the same calculated entry sums with aligned columns', async () => {
    const [{ default: BuildUnitsTab }, damage, { formatCombatNumber: formatNumber }] = await Promise.all([
      loadModule('/src/pages/LotteryDefense/EUNA/calculator/tabs/BuildUnitsTab.jsx'),
      loadModule('/src/core/calculator/damageCalculation.js'),
      loadModule('/src/core/calculator/calculatorHelpers.js'),
    ]);
    const units = [{ ...saved.units[0], entryId: 'one', unitId: 'amon', name: 'Amon' }];
    const result = scenario.calculateScenario(saved.calculatorSettings);
    const army = damage.calculateArmyDamage(units, { config, profile: stats.calculateProfileStats({}), scenario: result, jewels: saved.jewels });
    const main = render(MainTab, { calculatorSettings: saved.calculatorSettings, derivedStats: { requiredDps: result.requiredDps }, units, updateSetting: noop, activeRune: saved.runeLoadouts[0], buffs: saved.buffState, sandbox: saved.sandboxState, additionalRune: saved.additionalRuneState, scenario: result, army });
    const build = render(BuildUnitsTab, { jewels: saved.jewels, results: army.entries, units, selectedUnitId: 'amon', setSelectedUnitId: noop, addUnit: noop, removeUnit: noop, updateUnit: noop });
    const formatted = formatNumber(army.entries[0].fullDps);
    assert(main.includes(formatted)); assert(build.includes(formatted));
    assert.equal((build.match(/<th(?: |>|\n)/g) ?? []).length, 11);
    assert.equal((build.match(/<td(?: |>|\n)/g) ?? []).length, 11);
    assert.match(build, /Unit DPS/);
    assert.match(build, /Total DPS/);
    assert.match(build, /Calculation details for Amon/);
    assert.match(build, /<th class="col-actions">Remove<\/th>/);
    assert.doesNotMatch(build, /<th class="col-actions">Details<\/th>|>View<\/button>/);
    assert.match(build, /unit-name-and-info/);
    assert.doesNotMatch(build, /<summary>Calculation details<\/summary>/);
    assert.doesNotMatch(main + build, /mock|spreadsheet|Calculate!/i);
  });
  await t.test('buff controls render the corrected choices and restricted stats', () => {
    const html = render(BuffsTab, { title: 'Rookie', buffs: saved.buffState, setBuffs: noop, sandbox: saved.sandboxState, setSandbox: noop, additionalRune: saved.additionalRuneState, setAdditionalRune: noop });
    assert.match(html, /Bless<select disabled=""/);
    assert.match(html, /Full Team Buff<select[^>]*><option[^>]*>0<\/option><option[^>]*>1<\/option><option[^>]*>2<\/option>/);
    assert.match(html, /Super Buff Gem<select/);
    assert.match(html, /Select Upgrade\+/);
    assert.equal((html.match(/aria-label="Additional Rune (?!calculation)/g) ?? []).length, 6);
    assert.doesNotMatch(html, /aria-label="Additional Rune (Skill Damage|Armor Reduction|Multi Crit)"/);
  });
  await t.test('ToC replaces Round; unsupported floors cannot show a stale requirement', () => {
    const settings = { ...saved.calculatorSettings, tocMode: true, tocFloor: 85 };
    const result = scenario.calculateScenario(settings);
    const html = render(MainTab, { calculatorSettings: settings, derivedStats: { requiredDps: result.requiredDps }, units: [], updateSetting: noop, activeRune: saved.runeLoadouts[0], buffs: saved.buffState, sandbox: saved.sandboxState, additionalRune: saved.additionalRuneState, scenario: result });
    assert.match(html, /ToC Floor/);
    assert.doesNotMatch(html, />Round</);
    assert.match(html, /Unavailable/);
    assert.match(html, /No enemy data is available/);
    assert.doesNotMatch(html, /sheet|Calculate!|Enemies!/i);
  });
  await t.test('older buff choices recover without losing manual inputs or inactive scenarios', () => {
    saved.buffState.bless = 0;
    saved.buffState.teamBuffCount = 3;
    saved.additionalRuneState.method = 'future';
    saved.additionalRuneState.stats.attackDamage = 17;
    saved.calculatorSettings.round = 180;
    saved.calculatorSettings.tocFloor = 84;
    const normalized = state.normalizeCalculatorState(saved, config).state;
    assert.equal(normalized.buffState.bless, 1);
    assert.equal(normalized.buffState.teamBuffCount, 2);
    assert(normalized.recovered.some(r => r.path === 'buffState.bless' && r.value === 0));
    assert.equal(normalized.additionalRuneState.method, 'future');
    assert.equal(normalized.additionalRuneState.stats.attackDamage, 17);
    assert.equal(normalized.calculatorSettings.round, 180);
    assert.equal(normalized.calculatorSettings.tocFloor, 84);
  });
}));
