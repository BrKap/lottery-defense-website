function clampLevel(level, maxInvestments) {
  const numericLevel = Number(level);

  if (!Number.isFinite(numericLevel)) {
    return 0;
  }

  return Math.max(0, Math.min(maxInvestments, Math.floor(numericLevel)));
}

function getTierForLevel(tiers = [], level) {
  return tiers.find((tier) => level >= tier.start && level <= tier.end) ?? null;
}

function getValueForLevelFromModel(model, level) {
  if (!model) {
    return 0;
  }

  if (model.type === 'linear') {
    const base = Number(model.base ?? 0);
    const perLevel = Number(model.perLevel ?? 0);
    return base + level * perLevel;
  }

  if (model.type === 'table') {
    return Number(model.values?.[level] ?? 0);
  }

  if (model.type === 'tiered-linear') {
    const tier = getTierForLevel(model.tiers, level);

    if (!tier) {
      return 0;
    }

    const base = Number(tier.base ?? 0);
    const perLevel = Number(tier.perLevel ?? 0);
    return base + (level - tier.start) * perLevel;
  }

  return 0;
}

export function getUpgradeValue(upgrade, investedCount) {
  const clampedLevel = clampLevel(investedCount, upgrade.maxInvestments);

  if (clampedLevel <= 0) {
    return 0;
  }

  return getValueForLevelFromModel(upgrade.valueModel, clampedLevel);
}

export function getUpgradeCostForLevel(upgrade, level) {
  if (level < 0 || level >= upgrade.maxInvestments) {
    return 0;
  }

  if (upgrade.costModel?.type === 'unavailable') return null;

  return getValueForLevelFromModel(upgrade.costModel, level);
}

export function getNextUpgradePrice(upgrade, investedCount) {
  const clampedLevel = clampLevel(investedCount, upgrade.maxInvestments);

  if (clampedLevel >= upgrade.maxInvestments) {
    return 0;
  }

  return getIncrementalUpgradePrice(upgrade, clampedLevel, 1);
}

export function getIncrementalUpgradePrice(upgrade, investedCount, increment) {
  const start = clampLevel(investedCount, upgrade.maxInvestments);
  const end = clampLevel(start + Math.max(0, Math.floor(Number(increment) || 0)), upgrade.maxInvestments);
  if (end === start) return 0;
  const before = getTotalUpgradePrice(upgrade, start), after = getTotalUpgradePrice(upgrade, end);
  return before === null || after === null ? null : after - before;
}

export function getTotalUpgradePrice(upgrade, investedCount) {
  const clampedLevel = clampLevel(investedCount, upgrade.maxInvestments);
  if (clampedLevel > 0 && upgrade.costModel?.type === 'unavailable') return null;

  let total = 0;

  for (let level = 0; level < clampedLevel; level += 1) {
    total += getUpgradeCostForLevel(upgrade, level);
  }

  return total;
}

export function buildInitialInvestments(upgradeGroups = []) {
  const initial = {};

  upgradeGroups.forEach((group) => {
    initial[group.id] = {};

    group.upgrades.forEach((upgrade) => {
      initial[group.id][upgrade.id] = 0;
    });
  });

  return initial;
}

export function sanitizeInvestmentValue(upgrade, nextValue) {
  return clampLevel(nextValue, upgrade.maxInvestments);
}

export function calculateUpgradeTotals(investments, upgradeGroups = []) {
  let totalSpOverall = 0;
  let totalEpOverall = 0;

  const groupTotals = {};
  const unknownCostUpgrades = [];

  upgradeGroups.forEach((group) => {
    let groupTotal = 0;

    group.upgrades.forEach((upgrade) => {
      const investedCount = investments[group.id]?.[upgrade.id] ?? 0;
      const price = getTotalUpgradePrice(upgrade, investedCount);
      if (price === null) unknownCostUpgrades.push({ groupId: group.id, upgradeId: upgrade.id, name: upgrade.name });
      else groupTotal += price;
    });

    groupTotals[group.id] = groupTotal;

    if (group.currency === 'EP') {
      totalEpOverall += groupTotal;
    } else {
      totalSpOverall += groupTotal;
    }
  });

  return {
    totalSpOverall,
    totalEpOverall,
    groupTotals,
    unknownCostUpgrades,
  };
}

export function getAggregateUpgradeEffects(investments, upgradeGroups = []) {
  const totalsByStatKey = {};

  upgradeGroups.forEach((group) => {
    group.upgrades.forEach((upgrade) => {
      if (!upgrade.statKey) {
        return;
      }

      const investedCount = investments[group.id]?.[upgrade.id] ?? 0;
      const totalValue = getUpgradeValue(upgrade, investedCount);

      totalsByStatKey[upgrade.statKey] =
        (totalsByStatKey[upgrade.statKey] ?? 0) + totalValue;
    });
  });

  return totalsByStatKey;
}

export function exportSpUpgradeState(investments) {
  return JSON.stringify(investments);
}

export function importSpUpgradeState(rawValue, upgradeGroups = [], upgradeGroupMap = null) {
  const parsed = JSON.parse(rawValue);
  const clean = buildInitialInvestments(upgradeGroups);
  const groupsById =
    upgradeGroupMap ??
    Object.fromEntries(upgradeGroups.map((group) => [group.id, group]));

  Object.entries(parsed ?? {}).forEach(([groupId, groupValues]) => {
    const group = groupsById[groupId];

    if (!group || typeof groupValues !== 'object' || groupValues === null) {
      return;
    }

    group.upgrades.forEach((upgrade) => {
      const incomingValue = groupValues[upgrade.id] ?? 0;
      clean[groupId][upgrade.id] = sanitizeInvestmentValue(upgrade, incomingValue);
    });
  });

  return clean;
}
