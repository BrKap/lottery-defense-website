import catalog from './unitCatalog.json';
import recipes from './unitRecipes.json';

export const DATA_REVISION = 'euna-2026-09-21.1';
export const UNIT_LIBRARY = catalog.map(unit => ({ ...unit, attackSpeed: unit.baseInterval }));
export const UNIT_RECIPES = Object.fromEntries(recipes.map(recipe => [recipe.unitId, recipe]));
export const INGREDIENT_ALIASES = { Spart: 'goliath', Goliath: 'goliath' };
// Rank bonuses for D/C/A are not available yet, so they currently contribute zero.
export const RANK_BONUSES = {
  D: { ad: 0, as: 0, provisional: true }, C: { ad: 0, as: 0, provisional: true },
  B: { ad: 0, as: 0 }, A: { ad: 0, as: 0, provisional: true },
  S: { ad: 10, as: 0 }, SS: { ad: 20, as: 0 }, SSS: { ad: 30, as: 0 },
  X: { ad: 40, as: 0 }, XD: { ad: 50, as: 0 }, SXD: { ad: 50, as: 25 }, RXD: { ad: 100, as: 50 },
};
