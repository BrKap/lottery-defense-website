import { calculateUpgradeTotals, getTotalUpgradePrice, sanitizeInvestmentValue } from './spUpgradeHelpers';

export function calculateGpEstimate(settings = {}, options = {}) {
  const round = Number(settings.tocMode ? settings.tocFloor : settings.round);
  const supported = settings.tocMode || settings.gameMode === 'Classic';
  const gp = Math.max(0, Number(settings.gp) || 0);
  const levels = supported && gp >= 1 ? (Math.floor((gp - 1) / 12) + 1) * Math.floor(round / 5) * 0.75 / 4 : 0;
  const enabled = Boolean(options.gpEstimatesEnabled && supported);
  return { supported, enabled, round, levels, stats: {
    attackDamage: enabled ? levels * 0.4 : 0,
    attackSpeed: enabled ? levels * 0.2 : 0,
    critDamage: enabled ? levels * 0.488 : 0,
  } };
}

export function calculateResources(settings, options, investments, groups) {
  const totals = calculateUpgradeTotals(investments, groups);
  const selectedGroups = groups.filter(g => g.currency !== 'EP' && (options.includeInfinite || g.id !== 'infinite'));
  const knownBudgetSp = selectedGroups.reduce((sum, g) => sum + totals.groupTotals[g.id], 0);
  const unknown = totals.unknownCostUpgrades.filter(u => selectedGroups.some(g => g.id === u.groupId));
  const budgetSp = unknown.length ? null : knownBudgetSp;
  const round = Number(settings.tocMode ? settings.tocFloor : settings.round);
  const supported = Boolean(settings.tocMode || settings.gameMode === 'Classic');
  const bankUpgrade = groups.find(g => g.id === 'divine')?.upgrades.find(u => u.id === 'sp-bank');
  const bankLevel = bankUpgrade ? sanitizeInvestmentValue(bankUpgrade, investments.divine?.['sp-bank'] ?? 0) : 0;
  const bankCost = bankUpgrade ? getTotalUpgradePrice(bankUpgrade, bankLevel) : 0;
  const bankPayouts = supported ? Math.max(0, Math.floor(round / 10)) : null;
  const bankReturn = supported ? bankLevel * 1000 * bankPayouts : null;
  const startingSp = Math.max(0, Number(settings.startingSp) || 0);
  return { ...totals, knownBudgetSp, budgetSp, unknown, startingSp, round, bankLevel, bankCost, bankReturn, bankPayouts,
    bankNet: bankReturn === null ? null : bankReturn - bankCost,
    remainingStart: budgetSp === null ? null : startingSp - budgetSp,
    remainingTarget: budgetSp === null || bankReturn === null ? null : startingSp + bankReturn - budgetSp,
    epXpEstimate: totals.totalEpOverall * 30000,
    gp: calculateGpEstimate(settings, options),
  };
}

export function calculateIngredients(units, recipes, supports = {}) {
  const ingredients = {}, missing = [], counted = new Set();
  const supportUnits = [['stukov', 'stukov'], ['warfield', 'warfield'], ['talTempest', 'tal-tempest'], ['tassadar', 'tassadar'], ['vessel', 'vessel']].map(([key, unitId]) => ({ unitId, count: supports[key] ?? 0 }));
  for (const unit of [...units, ...supportUnits]) {
    const count = Math.max(0, Math.floor(Number(unit.count) || 0));
    if (!count) continue;
    const recipe = recipes[unit.unitId];
    if (!recipe) { missing.push({ entryId: unit.entryId, name: unit.name ?? unit.unitId, count }); continue; }
    if (recipe.countPolicy === 'once-when-present' && counted.has(unit.unitId)) continue;
    counted.add(unit.unitId);
    const quantity = recipe.countPolicy === 'once-when-present' ? 1 : count;
    for (const [ingredient, amount] of Object.entries(recipe.ingredients)) ingredients[ingredient] = (ingredients[ingredient] ?? 0) + amount * quantity;
  }
  return { ingredients, missing, incomplete: missing.length > 0, total: Object.values(ingredients).reduce((sum, n) => sum + n, 0) };
}
