import assert from 'node:assert/strict';
import { withCalculatorModules } from './load-calculator-modules.mjs';
import { ENEMY_WAVES, ENEMY_WAVE_METADATA } from '../../src/data/euna/calculator/enemyConstants.js';

// SC2_FIXED_4096: the live dataset must have fixed provenance and grid values.
assert.equal(ENEMY_WAVE_METADATA.numericPolicy.model, 'fixed_4096');
assert.equal(ENEMY_WAVE_METADATA.numericPolicy.rounding, 'truncate-toward-zero');
assert.equal(Object.values(ENEMY_WAVES).reduce((count, table) => count + Object.keys(table).length, 0), 990);
for (const table of Object.values(ENEMY_WAVES)) for (const row of Object.values(table))
  for (const value of Object.values(row)) if (typeof value === 'number') assert(Number.isInteger(value * 4096));

await withCalculatorModules(async ({ config }) => {
  const units = config.unitLibrary;
  const recipes = Object.values(config.UNIT_RECIPES);
  const unitIds = new Set(units.map(unit => unit.id));
  const recipeIds = new Set(recipes.map(recipe => recipe.unitId));

  assert.equal(units.length, 33, 'Unexpected unit count');
  assert.equal(unitIds.size, units.length, 'Unit IDs must be unique');
  assert.equal(recipeIds.size, recipes.length, 'Recipe IDs must be unique');

  for (const unit of units) {
    assert(unit.name, `${unit.id}: missing display name`);
    assert(Number.isFinite(unit.defensePen), `${unit.id}: invalid defense penetration`);
    if (unit.recipeId) {
      assert(config.UNIT_RECIPES[unit.recipeId], `${unit.id}: missing recipe ${unit.recipeId}`);
    }
  }

  for (const recipe of recipes) {
    for (const [ingredient, count] of Object.entries(recipe.ingredients)) {
      assert(Number.isInteger(count) && count >= 0, `${recipe.unitId}/${ingredient}: invalid count`);
    }
  }

  assert.equal(config.LEGENDARY_JEWELS.length, 21, 'Unexpected legendary jewel count');
  assert(config.JEWEL_TYPES.filter(jewel => jewel.id !== 'square').every(jewel => jewel.legendary && jewel.canUpgrade));

  const square = config.JEWEL_TYPES.find(jewel => jewel.id === 'square');
  assert(square, 'Square jewel is missing');
  assert(!square.legendary && !square.canUpgrade && square.upgradeFd === 0, 'Square jewel configuration is invalid');

  console.log(`Calculator data is valid: ${units.length} units, ${recipes.length} recipes, and ${config.JEWEL_TYPES.length} jewel types.`);
});
