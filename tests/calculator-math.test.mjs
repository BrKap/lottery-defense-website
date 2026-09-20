import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';

const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/calculator-math-cases.json', import.meta.url), 'utf8'));
const near = (actual, expected, label) => {
  assert(Number.isFinite(actual), `${label}: not finite`);
  assert(Math.abs(actual - expected) <= Math.max(1e-10, Math.abs(expected) * 1e-10), `${label}: ${actual} != ${expected}`);
};
function statsMatch(actual, expected, id) {
  for (const [key, value] of Object.entries(expected)) near(actual[key], value, `${id}.${key}`);
}

test('Calculator stat and upgrade calculations', async t => {
  await withCalculatorModules(async ({ stats, runes, upgrades, helpers }) => {
    const baseRune = { ...runes.createEmptyRuneData('slot-1') };
    // Eliminate defaults so each case specifies all values that affect its arithmetic.
    for (const key of Object.keys(baseRune)) if (key.endsWith('Base') || key.endsWith('Bonus')) baseRune[key] = '0';
    for (const row of fixtures.runes) await t.test(row.id, () => {
      const actual = stats.calculateRuneSourceStats([{ ...baseRune, ...row.input }], runes);
      statsMatch(actual.finalStats, row.expected, row.id);
    });
    for (const row of fixtures.investments) await t.test(row.id, () => {
      const actual = stats.calculateSpUpgradeSourceStats(row.input, upgrades.UPGRADE_GROUP_MAP);
      statsMatch(actual.finalStats, row.expected, row.id);
    });
    for (const row of fixtures.costs) await t.test(row.id, () => {
      const upgrade = upgrades.UPGRADE_GROUP_MAP[row.group].upgrades.find(u => u.id === row.upgrade);
      assert(upgrade, row.id);
      near(helpers.getTotalUpgradePrice(upgrade, row.level), row.total, `${row.id}.total`);
      near(helpers.getNextUpgradePrice(upgrade, row.level), row.next, `${row.id}.next`);
    });
    await t.test('SP and EP remain separate currencies', () => {
      const totals = helpers.calculateUpgradeTotals({ rookie: { 'atk-dmg-i': 5 }, ep: { 'atk-dmg-e-': 14 } }, upgrades.UPGRADE_GROUPS);
      assert.equal(totals.totalSpOverall, 650);
      assert.equal(totals.totalEpOverall, 105);
    });
    await t.test('Profile multiplies independent acceleration sources', () => {
      const actual = stats.calculateProfileStats({ runeLoadouts: [{ ...baseRune, runeBonusTen: '15% Accel' }], runeConstants: runes, spInvestments: { infinite: { 'accel-inf-': 10 } }, upgradeGroupMap: upgrades.UPGRADE_GROUP_MAP });
      near(actual.rawStats.acceleration, 1.158418, 'profile acceleration');
    });
    await t.test('Investment helper rejects negative and fractional spending', () => {
      const upgrade = upgrades.UPGRADE_GROUP_MAP.rookie.upgrades.find(u => u.id === 'atk-dmg-i');
      assert.equal(helpers.sanitizeInvestmentValue(upgrade, -2), 0);
      assert.equal(helpers.sanitizeInvestmentValue(upgrade, 3.9), 3);
      assert.equal(helpers.sanitizeInvestmentValue(upgrade, 900), 5);
    });
  });
});
