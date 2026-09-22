import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withCalculatorModules } from '../scripts/calculator/load-calculator-modules.mjs';
const audit = JSON.parse(fs.readFileSync(new URL('./fixtures/calculator-resource-audit.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const recipeAudit = JSON.parse(fs.readFileSync(new URL('./fixtures/calculator-recipe-audit.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('Resource costs, estimates and ingredient totals', async t => withCalculatorModules(async ({ config, helpers, state, stats, loadModule }) => {
  const { calculateResources, calculateGpEstimate, calculateIngredients } = await loadModule('/src/core/calculator/resourceCalculation.js');
  const groups = config.UPGRADE_GROUPS;
  const find = (group, id) => groups.find(g => g.id === group).upgrades.find(u => u.id === id);
  const total = (g, id, n) => helpers.getTotalUpgradePrice(find(g, id), n);
  await t.test('all reference caps and ordinary arithmetic prices match the catalog', () => {
    const normalize = name => name.toLowerCase().replace('rev ll+', 'rev ii+').replace(/\s/g, '');
    const remaining = groups.flatMap(g => g.upgrades.map(u => ({ ...u, group: g.id })));
    for (const row of audit) {
      const index = remaining.findIndex(u => normalize(u.name) === normalize(row.name));
      assert(index >= 0, row.name);
      const [upgrade] = remaining.splice(index, 1);
      assert.equal(upgrade.maxInvestments, row.max, row.name);
      if (row.price) {
        for (const level of [0, 1, Math.min(row.max, 14), Math.min(row.max, 149)]) {
          if (row.name === 'Atk Dmg (E)' && level > 14) continue;
          const expected = level === 0 ? 0 : level * (2 * row.price.first + (level - 1) * row.price.step) / 2;
          assert.equal(helpers.getTotalUpgradePrice(upgrade, level), expected, `${row.name} at ${level}`);
        }
      }
    }
    assert(remaining.every(u => u.costModel.type === 'unavailable'));
  });
  await t.test('cumulative, next and incremental costs reconcile for every investment level', () => {
    for (const group of groups) for (const upgrade of group.upgrades) {
      let sum = 0;
      for (let n = 0; n < upgrade.maxInvestments; n++) {
        const price = helpers.getNextUpgradePrice(upgrade, n);
        if (upgrade.costModel.type === 'unavailable') { assert.equal(price, null); continue; }
        sum += price;
        assert.equal(helpers.getTotalUpgradePrice(upgrade, n + 1), sum, upgrade.name);
        assert.equal(helpers.getIncrementalUpgradePrice(upgrade, n, 3), helpers.getTotalUpgradePrice(upgrade, n + 3) - helpers.getTotalUpgradePrice(upgrade, n));
      }
      assert.equal(helpers.getNextUpgradePrice(upgrade, upgrade.maxInvestments), 0);
    }
  });
  await t.test('piecewise level 150, MC tables and EP level 14 use independent targets', () => {
    for (const id of ['atk-dmg-iv', 'atk-spd-iv']) {
      assert.equal(total('the-one', id, 150), 4023750);
      assert.equal(total('the-one', id, 151), 4077000);
      assert.equal(total('the-one', id, 200), 6686250);
    }
    assert.equal(total('the-one', 'crit-chance-iii', 150), 5700000);
    assert.equal(total('the-one', 'crit-chance-iii', 151), 5775750);
    const expert = [0,350,1050,2450,5250,10850,22050,44450,89250,139250,189250,239250,289250,339250,389250,439250,489250,539250,589250,639250,689250,789250,889250,989250,1089250,1189250];
    const one = [0,75000,150000,225000,300000,375000,600000,825000,1050000,1275000,1500000,2175000,2850000,3525000,4200000,4875000];
    expert.forEach((expected, n) => assert.equal(total('expert', 'multi-crit-i', n), expected));
    one.forEach((expected, n) => assert.equal(total('the-one-ii', 'multi-crit-ii', n), expected));
    assert.equal(total('ep', 'atk-dmg-e-', 13), 91);
    assert.equal(total('ep', 'atk-dmg-e-', 14), 105);
    assert.equal(total('ep', 'atk-dmg-e-', 15), 205);
    assert.equal(total('ep', 'atk-dmg-e-', 99), 8605);
  });
  await t.test('budgets keep currencies separate and withhold incomplete affordability', () => {
    const investment = { rookie: { 'atk-dmg-i': 2 }, ep: { 'atk-dmg-e-': 15 }, infinite: { 'atk-dmg-inf-': 2 } };
    const settings = { gameMode: 'Classic', round: 180, startingSp: 1000, xp: 999999999 };
    let r = calculateResources(settings, { includeInfinite: true }, investment, groups);
    assert.equal(r.budgetSp, 1140); assert.equal(r.remainingStart, -140); assert.equal(r.totalEpOverall, 205); assert.equal(r.epXpEstimate, 6150000);
    r = calculateResources(settings, { includeInfinite: false }, investment, groups);
    assert.equal(r.budgetSp, 140); assert.equal(r.remainingStart, 860);
    investment.infinite['xp-lotto'] = 1;
    assert.equal(calculateResources(settings, { includeInfinite: true }, investment, groups).remainingTarget, null);
    assert.equal(calculateResources(settings, { includeInfinite: false }, investment, groups).remainingTarget, 860);
    investment.rookie.exchange = 1;
    assert.equal(calculateResources(settings, { includeInfinite: false }, investment, groups).budgetSp, null);
  });
  await t.test('bank uses bounded investments, round 269 and ToC floor; zero is finite', () => {
    const settings = { gameMode: 'Classic', round: 269, tocFloor: 70, startingSp: 100000 };
    const options = { includeInfinite: true, bankEnabled: true };
    const r = calculateResources(settings, options, { divine: { 'sp-bank': 2 } }, groups);
    assert.equal(r.bankCost, 20050); assert.equal(r.bankReturn, 52000); assert.equal(r.remainingTarget, 131950);
    assert.equal(calculateResources({ ...settings, tocMode: true }, options, { divine: { 'sp-bank': 2 } }, groups).bankReturn, 14000);
    assert.equal(calculateResources(settings, options, {}, groups).bankNet, 0);
    assert.equal(calculateResources(settings, options, { divine: { 'sp-bank': 999 } }, groups).bankLevel, 250);
    assert.equal(calculateResources({ ...settings, gameMode: 'Hyper' }, options, {}, groups).bankReturn, null);
  });
  await t.test('purchased bank pays automatically at each ten-round boundary, including target', () => {
    const settings = { gameMode: 'Classic', round: 270, startingSp: 10000000 };
    const investments = { divine: { 'sp-bank': 250 } };
    const r = calculateResources(settings, { includeInfinite: true, bankEnabled: false }, investments, groups);
    assert.equal(r.bankPayouts, 27);
    assert.equal(r.bankCost, 4056250);
    assert.equal(r.bankReturn, 6750000);
    assert.equal(r.bankNet, 2693750);
    assert.equal(r.remainingStart, 5943750);
    assert.equal(r.remainingTarget, 12693750);
    for (const [round, payouts] of [[0,0],[9,0],[10,1],[19,1],[20,2],[115,11],[269,26],[270,27]]) {
      const result = calculateResources({ ...settings, round }, { includeInfinite: true }, investments, groups);
      assert.equal(result.bankReturn, payouts * 250000);
    }
  });
  await t.test('optional GP stats are independent from paid Infinite and use ToC floor', () => {
    const settings = { gameMode: 'Classic', round: 180, tocFloor: 70, gp: 13 };
    const gp = calculateGpEstimate(settings, { gpEstimatesEnabled: true });
    assert.equal(gp.levels, 13.5); near(gp.stats.attackDamage, 5.4); near(gp.stats.attackSpeed, 2.7); near(gp.stats.critDamage, 6.588);
    assert.equal(calculateGpEstimate({ ...settings, gp: 0 }, { gpEstimatesEnabled: true }).levels, 0);
    assert.equal(calculateGpEstimate({ ...settings, tocMode: true }, { gpEstimatesEnabled: true }).levels, 5.25);
    const input = { calculatorSettings: settings, spInvestments: { infinite: { 'atk-spd-inf-': 10 } }, upgradeGroupMap: config.UPGRADE_GROUP_MAP };
    near(stats.calculateProfileStats(input).rawStats.attackSpeed, 2);
    near(stats.calculateProfileStats({ ...input, resourceSettings: { gpEstimatesEnabled: true } }).rawStats.attackSpeed, 4.7);
  });
  await t.test('recipes count independent variants and supports, but only one Overmind', () => {
    const units = [{ unitId: 'overmind', count: 4 }, { unitId: 'overmind', count: 1 }, { unitId: 'xelnaga-kerrigan', count: 2 }];
    const r = calculateIngredients(units, config.UNIT_RECIPES, { stukov: 2 });
    assert.equal(r.ingredients.marine, 5); assert.equal(r.ingredients.goliath, 26); assert.equal(r.ingredients.hydralisk, 54);
    const variants = calculateIngredients([{ unitId: 'nova', count: 2 }, { unitId: 'tychus', count: 1 }, { unitId: 'gorgon-cruiser', count: 1 }, { unitId: 'hyperion', count: 1 }], config.UNIT_RECIPES);
    assert.equal(variants.ingredients.marine, 21); assert.equal(variants.ingredients.goliath, 12);
    const missing = calculateIngredients([{ unitId: 'artifact', count: 1 }, { unitId: 'flower', count: 0 }], config.UNIT_RECIPES);
    assert.equal(missing.incomplete, true); assert.equal(missing.missing.length, 1); assert.equal(missing.total, 0);
    assert.equal(calculateIngredients([], config.UNIT_RECIPES).total, 0);
  });
  await t.test('all 34 recipe coefficient rows, including each alternate unit, match', () => {
    const ingredientKeys = ['marine','ghost','marauder','goliath','diamond','tank','zealot','templar','archon','sentry','stalker','immortal','roach','lurker','hydralisk'];
    const aliases = { 'Void Trasher': 'void-thrasher', 'Special Ops Nova': 'spec-ops-nova' };
    assert.equal(recipeAudit.length, 34);
    for (const row of recipeAudit) {
      const id = aliases[row.name] ?? row.name.toLowerCase().replaceAll("'", '').replaceAll(' ', '-');
      const recipe = config.UNIT_RECIPES[id];
      assert(recipe, row.name);
      assert.deepEqual(ingredientKeys.map(key => recipe.ingredients[key]), row.values, row.name);
    }
  });
  await t.test('resource preferences persist through normalization', () => {
    const saved = state.createDefaultCalculatorState(config);
    saved.resourceSettings = { includeInfinite: false, bankEnabled: true, gpEstimatesEnabled: true };
    assert.deepEqual(state.normalizeCalculatorState(saved, config).state.resourceSettings, { includeInfinite: false, gpEstimatesEnabled: true });
  });
}));
