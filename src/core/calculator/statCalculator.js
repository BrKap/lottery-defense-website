import { DERIVED_STAT_KEYS, STAT_KEYS } from './statKeys';
import { getUpgradeValue } from './spUpgradeHelpers';

const DEFAULT_TORMENT_STATE = {
  critDamageReduction: 0,
};

export function createEmptyProfileStats() {
  return {
    [STAT_KEYS.ATTACK_DAMAGE]: 0,
    [STAT_KEYS.ATTACK_SPEED]: 0,
    [STAT_KEYS.CRIT_CHANCE]: 0,
    [STAT_KEYS.CRIT_DAMAGE]: 0,
    [STAT_KEYS.MULTI_CRIT]: 0,
    [STAT_KEYS.ACCELERATION]: 1,
    [STAT_KEYS.FINAL_DAMAGE]: 0,
    [STAT_KEYS.ARMOR_PEN]: 0,
    [STAT_KEYS.SKILL_DAMAGE]: 0,
    [STAT_KEYS.MULTI_TARGET_DAMAGE]: 0,
    [STAT_KEYS.MULTI_TARGET_CHANCE]: 0,
    [STAT_KEYS.MULTI_TARGET_MULTI_CRIT]: 0,
    [STAT_KEYS.ARMOR_REDUCTION]: 0,
    [STAT_KEYS.SHIELD_REDUCTION]: 0,
    [STAT_KEYS.HEALTH_REDUCTION]: 0,
    [STAT_KEYS.MANA_REGEN]: 0,
    [STAT_KEYS.COOLDOWN]: 0,
    [STAT_KEYS.SP_PERCENT]: 0,
    [STAT_KEYS.SP_BANK]: 0,
    [STAT_KEYS.RACE_UPGRADE_T_BIO]: 0,
    [STAT_KEYS.RACE_UPGRADE_T_MECH]: 0,
    [STAT_KEYS.RACE_UPGRADE_P_BIO]: 0,
    [STAT_KEYS.RACE_UPGRADE_P_MECH]: 0,
    [STAT_KEYS.RACE_UPGRADE_ZERG]: 0,
    [STAT_KEYS.RACE_UPGRADE_NEUTRAL]: 0,
    [STAT_KEYS.RACE_UPGRADE_CAP_BONUS]: 0,
    [STAT_KEYS.OTHER]: 0,
  };
}

function createEmptyDerivedStats() {
  return {
    [DERIVED_STAT_KEYS.ATTACK_DAMAGE_WITH_FD]: 0,
    [DERIVED_STAT_KEYS.CRIT_DAMAGE_WITH_TORMENT]: 0,
    [DERIVED_STAT_KEYS.AVERAGE_MULTI_CRIT]: 0,
  };
}

export function createEmptySourceResult() {
  return {
    additiveStats: {
      ...createEmptyProfileStats(),
      [STAT_KEYS.ACCELERATION]: 0,
    },
    accelerationMultiplier: 1,
    breakdown: [],
    finalStats: createEmptyProfileStats(),
  };
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function addNumericStats(baseStats, addedStats) {
  const next = { ...baseStats };

  Object.entries(addedStats).forEach(([key, value]) => {
    next[key] = toNumber(next[key]) + toNumber(value);
  });

  return next;
}

function addStat(result, statKey, value) {
  const numericValue = toNumber(value);

  if (!statKey || numericValue === 0) {
    return;
  }

  result.additiveStats = addNumericStats(result.additiveStats, {
    [statKey]: numericValue,
  });
}

function finalizeSourceStats(sourceResult) {
  return {
    ...sourceResult.additiveStats,
    [STAT_KEYS.ACCELERATION]: toNumber(sourceResult.accelerationMultiplier) || 1,
  };
}

function finalizeSourceResult(sourceResult) {
  return {
    ...sourceResult,
    finalStats: finalizeSourceStats(sourceResult),
  };
}

function createBreakdownEntry({
  source,
  groupId = null,
  groupLabel = null,
  entryId = null,
  entryName = null,
  statKey = null,
  investedCount = null,
  rawValue = null,
  appliedValue = null,
  combineMode = 'additive',
}) {
  return {
    source,
    groupId,
    groupLabel,
    entryId,
    entryName,
    statKey,
    investedCount,
    rawValue,
    appliedValue,
    combineMode,
  };
}

function getRuneYellowBonusAmount(statKey, runeLevel) {
  const level = toNumber(runeLevel);

  if (
    statKey === STAT_KEYS.ATTACK_DAMAGE ||
    statKey === STAT_KEYS.ATTACK_SPEED ||
    statKey === STAT_KEYS.CRIT_CHANCE
  ) {
    return Math.min(level, 15);
  }

  if (statKey === STAT_KEYS.SP_PERCENT) {
    return level >= 9 ? 5 : 0;
  }

  return 0;
}

function getRuneBonusStats(optionValue, rune = null) {
  switch (optionValue) {
    case '50% Crit Dmg':
      return { [STAT_KEYS.CRIT_DAMAGE]: 50 };

    case '15% Accel':
      return { [STAT_KEYS.ACCELERATION]: 15 };

    case '3 MC':
      return { [STAT_KEYS.MULTI_CRIT]: 3 };

    case '2x BaseCC':
      return {
        [STAT_KEYS.CRIT_CHANCE]: toNumber(rune?.critChanceBase),
      };

    case 'Max Grade +5':
      return {};

    case '-25% Armor':
      return { [STAT_KEYS.ARMOR_REDUCTION]: 25 };

    case 'Every Race +1':
      return {
        [STAT_KEYS.RACE_UPGRADE_T_BIO]: 1,
        [STAT_KEYS.RACE_UPGRADE_T_MECH]: 1,
        [STAT_KEYS.RACE_UPGRADE_P_BIO]: 1,
        [STAT_KEYS.RACE_UPGRADE_P_MECH]: 1,
        [STAT_KEYS.RACE_UPGRADE_ZERG]: 1,
        [STAT_KEYS.RACE_UPGRADE_NEUTRAL]: 1,
        [STAT_KEYS.RACE_UPGRADE_CAP_BONUS]: 1,
      };

    case '15 AD on equip':
      return { [STAT_KEYS.ATTACK_DAMAGE]: 15 };

    case '-SS & Refund':
      return {};

    case '2x Final dmg':
      return {
        [STAT_KEYS.FINAL_DAMAGE]: toNumber(rune?.finalDamageBase),
      };

    default:
      return {};
  }
}

function applyRuneStat(result, statKey, value) {
  const numericValue = toNumber(value);

  if (!statKey || numericValue === 0) {
    return 'additive';
  }

  if (statKey === STAT_KEYS.ACCELERATION) {
    result.accelerationMultiplier *= 1 + numericValue / 100;
    return 'multiplicative';
  }

  addStat(result, statKey, numericValue);
  return 'additive';
}

function getRuneRaceStatKey(raceValue) {
  switch (raceValue) {
    case 'T Bio':
      return STAT_KEYS.RACE_UPGRADE_T_BIO;
    case 'T Mech':
      return STAT_KEYS.RACE_UPGRADE_T_MECH;
    case 'P Bio':
      return STAT_KEYS.RACE_UPGRADE_P_BIO;
    case 'P Mech':
      return STAT_KEYS.RACE_UPGRADE_P_MECH;
    case 'Zerg':
      return STAT_KEYS.RACE_UPGRADE_ZERG;
    case 'Neutral':
      return STAT_KEYS.RACE_UPGRADE_NEUTRAL;
    default:
      return null;
  }
}

function getRuneAwakeningStats(rune) {
  const awakening = rune?.runeAwakening ?? 'None';
  const stats = {};

  const add = (statKey, value) => {
    if (!statKey || !toNumber(value)) {
      return;
    }

    stats[statKey] = toNumber(stats[statKey]) + toNumber(value);
  };

  if (['A', 'B', 'C', 'D', 'E'].includes(awakening)) {
    add(STAT_KEYS.ATTACK_DAMAGE, toNumber(rune.attackDamageBase));
  }

  if (['B', 'C', 'D', 'E'].includes(awakening)) {
    add(STAT_KEYS.ATTACK_SPEED, toNumber(rune.attackSpeedBase));
  }

  if (['D', 'E'].includes(awakening)) {
    add(STAT_KEYS.CRIT_DAMAGE, 30);
  }

  if (awakening === 'E') {
    add(STAT_KEYS.ARMOR_REDUCTION, 10);
  }

  return stats;
}

function getRuneEnchantStats(rune, runeConstants = {}) {
  const enchantValueTable = runeConstants.RUNE_ENCHANT_VALUE_TABLE ?? {};
  const attackDamageLevel = toNumber(rune?.enchantAttackDamage);
  const attackSpeedLevel = toNumber(rune?.enchantAttackSpeed);
  const accelerationLevel = toNumber(rune?.enchantAcceleration);
  const totalDamageLevel = toNumber(rune?.enchantTotalDamage);
  const shieldReductionLevel = toNumber(rune?.enchantShieldReduction);
  const healthReductionLevel = toNumber(rune?.enchantHealthReduction);

  const attackDamageValues = enchantValueTable[attackDamageLevel] ?? enchantValueTable[0] ?? {};
  const attackSpeedValues = enchantValueTable[attackSpeedLevel] ?? enchantValueTable[0] ?? {};
  const accelerationValues = enchantValueTable[accelerationLevel] ?? enchantValueTable[0] ?? {};
  const totalDamageValues = enchantValueTable[totalDamageLevel] ?? enchantValueTable[0] ?? {};
  const shieldReductionValues = enchantValueTable[shieldReductionLevel] ?? enchantValueTable[0] ?? {};
  const healthReductionValues = enchantValueTable[healthReductionLevel] ?? enchantValueTable[0] ?? {};

  return {
    [STAT_KEYS.ATTACK_DAMAGE]: attackDamageValues.attackDamage,
    [STAT_KEYS.CRIT_CHANCE]: attackSpeedValues.critChance,
    [STAT_KEYS.ACCELERATION]: accelerationValues.acceleration,
    [STAT_KEYS.FINAL_DAMAGE]: totalDamageValues.finalDamage,
    [STAT_KEYS.SHIELD_REDUCTION]: shieldReductionValues.shieldReduction,
    [STAT_KEYS.HEALTH_REDUCTION]: healthReductionValues.healthReduction,
  };
}

export function calculateRuneSourceStats(runeLoadouts = [], runeConstants = {}) {
  const result = createEmptySourceResult();
  const runeLayouts = runeConstants.RUNE_LAYOUTS ?? {};

  runeLoadouts.forEach((rune, index) => {
    const runeType = String(rune?.runeType ?? '').toLowerCase();
    const runeLayout = runeLayouts[runeType];

    if (!runeType || !runeLayout) {
      return;
    }

    const runeEntryId = rune.id ?? `rune-${index}`;

    result.breakdown.push(
      createBreakdownEntry({
        source: 'runes',
        entryId: runeEntryId,
        entryName: `${runeType} (${rune.slot ?? `slot-${index + 1}`})`,
        rawValue: {
          runeLevel: rune.runeLevel,
          runeAwakening: rune.runeAwakening,
        },
      })
    );

    runeLayout.primaryRows.forEach((row) => {
      const baseValue = toNumber(rune[row.baseField]);
      const yellowValue = row.hasLevelYellowBonus
        ? getRuneYellowBonusAmount(row.statKey, rune.runeLevel)
        : 0;
      const pinkValue = row.pinkEnabled && row.bonusField
        ? toNumber(rune[row.bonusField])
        : 0;

      const totalValue = baseValue + yellowValue + pinkValue;

      if (totalValue === 0) {
        return;
      }

      const combineMode = applyRuneStat(result, row.statKey, totalValue);

      result.breakdown.push(
        createBreakdownEntry({
          source: 'runes',
          entryId: runeEntryId,
          entryName: `${runeType} ${row.label}`,
          statKey: row.statKey,
          rawValue: {
            base: baseValue,
            yellow: yellowValue,
            pink: pinkValue,
          },
          appliedValue: totalValue,
          combineMode,
        })
      );
    });

    const awakeningStats = getRuneAwakeningStats(rune);

    Object.entries(awakeningStats).forEach(([statKey, statValue]) => {
      const combineMode = applyRuneStat(result, statKey, statValue);

      result.breakdown.push(
        createBreakdownEntry({
          source: 'runes',
          entryId: runeEntryId,
          entryName: `${runeType} awakening ${rune.runeAwakening}`,
          statKey,
          rawValue: rune.runeAwakening,
          appliedValue: statValue,
          combineMode,
        })
      );
    });

    [
      { value: rune.runeBonusTen, label: '+10' },
      { value: rune.runeBonusFifteen, label: '+15' },
      { value: rune.runeTran, label: '@tran' },
    ].forEach(({ value, label }) => {
      const bonusStats = getRuneBonusStats(value, rune);

      Object.entries(bonusStats).forEach(([statKey, statValue]) => {
        const combineMode = applyRuneStat(result, statKey, statValue);

        result.breakdown.push(
          createBreakdownEntry({
            source: 'runes',
            entryId: runeEntryId,
            entryName: `${runeType} ${label} bonus`,
            statKey,
            rawValue: value,
            appliedValue: statValue,
            combineMode,
          })
        );
      });
    });

    const enchantStats = getRuneEnchantStats(rune, runeConstants);

    Object.entries(enchantStats).forEach(([statKey, statValue]) => {
      if (!toNumber(statValue)) {
        return;
      }

      const combineMode = applyRuneStat(result, statKey, statValue);

      result.breakdown.push(
        createBreakdownEntry({
          source: 'runes',
          entryId: runeEntryId,
          entryName: `${runeType} enchant`,
          statKey,
          rawValue: {
            enchantAttackDamage: rune.enchantAttackDamage,
            enchantAttackSpeed: rune.enchantAttackSpeed,
            enchantAcceleration: rune.enchantAcceleration,
            enchantTotalDamage: rune.enchantTotalDamage,
            enchantShieldReduction: rune.enchantShieldReduction,
            enchantHealthReduction: rune.enchantHealthReduction,
          },
          appliedValue: statValue,
          combineMode,
        })
      );
    });

    const raceStatKey = getRuneRaceStatKey(rune.runeRaceUpgrade);

    if (raceStatKey) {
      addStat(result, raceStatKey, 1);

      result.breakdown.push(
        createBreakdownEntry({
          source: 'runes',
          entryId: runeEntryId,
          entryName: `${runeType} race upgrade`,
          statKey: raceStatKey,
          rawValue: rune.runeRaceUpgrade,
          appliedValue: 1,
          combineMode: 'additive',
        })
      );
    }
  });

  return finalizeSourceResult(result);
}

function getSpAccelerationCombineMode(groupId) {
  if (groupId === 'the-one') {
    return 'multiplicative';
  }

  if (groupId === 'infinite') {
    return 'additive';
  }

  return 'additive';
}

function applySpAcceleration(result, groupId, investedCount, upgradeValue) {
  const combineMode = getSpAccelerationCombineMode(groupId);

  if (groupId === 'the-one') {
    result.accelerationMultiplier *= 1.002424 ** investedCount;
    return 'multiplicative';
  }

  if (groupId === 'infinite') {
    result.accelerationMultiplier *= 1 + upgradeValue;
    return 'additive';
  }

  result.accelerationMultiplier *= 1 + upgradeValue;
  return combineMode;
}

export function calculateSpUpgradeSourceStats(investments = {}, upgradeGroupMap = {}) {
  const result = createEmptySourceResult();

  Object.entries(investments).forEach(([groupId, groupInvestments]) => {
    const group = upgradeGroupMap[groupId];

    if (!group) {
      return;
    }

    group.upgrades.forEach((upgrade) => {
      const investedCount = toNumber(groupInvestments?.[upgrade.id]);

      if (!upgrade.statKey || investedCount <= 0) {
        return;
      }

      const upgradeValue = toNumber(getUpgradeValue(upgrade, investedCount));

      if (upgradeValue === 0 && upgrade.statKey !== STAT_KEYS.ACCELERATION) {
        return;
      }

      let combineMode = 'additive';
      let appliedValue = upgradeValue;

      if (upgrade.statKey === STAT_KEYS.ACCELERATION) {
        combineMode = applySpAcceleration(result, groupId, investedCount, upgradeValue);
        appliedValue = result.accelerationMultiplier;
      } else {
        addStat(result, upgrade.statKey, upgradeValue);
      }

      result.breakdown.push(
        createBreakdownEntry({
          source: 'spUpgrades',
          groupId,
          groupLabel: group.label,
          entryId: upgrade.id,
          entryName: upgrade.name,
          statKey: upgrade.statKey,
          investedCount,
          rawValue: upgradeValue,
          appliedValue,
          combineMode,
        })
      );
    });
  });

  return finalizeSourceResult(result);
}

export function calculateDifficultySourceStats(difficultyState = null) {
  const result = createEmptySourceResult();

  if (difficultyState) {
    result.breakdown.push(
      createBreakdownEntry({
        source: 'difficulty',
        entryName: 'difficultyState',
      })
    );
  }

  return finalizeSourceResult(result);
}

function normalizeTormentState(tormentState) {
  if (typeof tormentState === 'number') {
    return {
      ...DEFAULT_TORMENT_STATE,
      level: tormentState,
    };
  }

  if (tormentState && typeof tormentState === 'object') {
    return {
      ...DEFAULT_TORMENT_STATE,
      ...tormentState,
    };
  }

  return { ...DEFAULT_TORMENT_STATE };
}

export function calculateTormentSourceStats(tormentState = null) {
  const result = createEmptySourceResult();
  const normalizedTormentState = normalizeTormentState(tormentState);

  if (normalizedTormentState.level || normalizedTormentState.critDamageReduction) {
    result.breakdown.push(
      createBreakdownEntry({
        source: 'torment',
        entryName: 'tormentState',
        rawValue: normalizedTormentState,
      })
    );
  }

  return finalizeSourceResult(result);
}

export function calculateBuffSourceStats(buffState = null) {
  const result = createEmptySourceResult();

  if (buffState) {
    result.breakdown.push(
      createBreakdownEntry({
        source: 'buffs',
        entryName: 'buffState',
      })
    );
  }

  return finalizeSourceResult(result);
}

function mergeFinalSourceStats(sourceResults) {
  let mergedStats = {
    ...createEmptyProfileStats(),
    [STAT_KEYS.ACCELERATION]: 1,
  };

  sourceResults.forEach((sourceResult) => {
    const sourceFinalStats = sourceResult.finalStats ?? {};
    const additiveOnlyStats = { ...sourceFinalStats };

    delete additiveOnlyStats[STAT_KEYS.ACCELERATION];

    mergedStats = addNumericStats(mergedStats, additiveOnlyStats);
    mergedStats[STAT_KEYS.ACCELERATION] *= toNumber(
      sourceFinalStats[STAT_KEYS.ACCELERATION] ?? 1
    );
  });

  return mergedStats;
}

function calculateAttackDamageWithFD(rawStats) {
  const rawAttackDamage = toNumber(rawStats[STAT_KEYS.ATTACK_DAMAGE]);
  const finalDamage = toNumber(rawStats[STAT_KEYS.FINAL_DAMAGE]);

  return rawAttackDamage * (1 + finalDamage / 100);
}

function calculateCritDamageWithTorment(rawStats, tormentState = null) {
  const rawCritDamage = toNumber(rawStats[STAT_KEYS.CRIT_DAMAGE]);
  const normalizedTormentState = normalizeTormentState(tormentState);
  const tormentCritReduction = toNumber(normalizedTormentState.critDamageReduction);

  return rawCritDamage * (1 - tormentCritReduction / 100);
}

function calculateAverageMultiCrit(rawStats) {
  return {
    placeholder: true,
    value: toNumber(rawStats[STAT_KEYS.MULTI_CRIT]),
  };
}

function calculateDisplayStats(rawStats, tormentState = null) {
  const averageMultiCritResult = calculateAverageMultiCrit(rawStats);

  return {
    ...createEmptyDerivedStats(),
    [DERIVED_STAT_KEYS.ATTACK_DAMAGE_WITH_FD]: calculateAttackDamageWithFD(rawStats),
    [DERIVED_STAT_KEYS.CRIT_DAMAGE_WITH_TORMENT]: calculateCritDamageWithTorment(
      rawStats,
      tormentState
    ),
    [DERIVED_STAT_KEYS.AVERAGE_MULTI_CRIT]: averageMultiCritResult.value,
  };
}

function calculateCombatStats(rawStats, tormentState = null) {
  const averageMultiCritResult = calculateAverageMultiCrit(rawStats);

  return {
    rawAttackDamage: toNumber(rawStats[STAT_KEYS.ATTACK_DAMAGE]),
    profileAttackDamage: calculateAttackDamageWithFD(rawStats),
    rawCritDamage: toNumber(rawStats[STAT_KEYS.CRIT_DAMAGE]),
    critDamageWithTorment: calculateCritDamageWithTorment(rawStats, tormentState),
    averageMultiCrit: averageMultiCritResult.value,
    averageMultiCritReady: !averageMultiCritResult.placeholder,
    accelerationMultiplier: toNumber(rawStats[STAT_KEYS.ACCELERATION]) || 1,
  };
}

function flattenSourceBreakdowns(sources) {
  return Object.values(sources).flatMap((sourceResult) => sourceResult.breakdown ?? []);
}

export function calculateProfileStats({
  runeLoadouts = [],
  spInvestments = {},
  difficultyState = null,
  tormentState = null,
  buffState = null,
  runeConstants = {},
  upgradeGroupMap = {},
}) {
  const runeSource = calculateRuneSourceStats(runeLoadouts, runeConstants);
  const spUpgradeSource = calculateSpUpgradeSourceStats(spInvestments, upgradeGroupMap);
  const difficultySource = calculateDifficultySourceStats(difficultyState);
  const tormentSource = calculateTormentSourceStats(tormentState);
  const buffSource = calculateBuffSourceStats(buffState);

  const sources = {
    runes: runeSource,
    spUpgrades: spUpgradeSource,
    difficulty: difficultySource,
    torment: tormentSource,
    buffs: buffSource,
  };

  const rawStats = mergeFinalSourceStats(Object.values(sources));
  const displayStats = calculateDisplayStats(rawStats, tormentState);
  const combatStats = calculateCombatStats(rawStats, tormentState);

  return {
    sources,
    sourceBreakdown: flattenSourceBreakdowns(sources),
    rawStats,
    displayStats,
    combatStats,
  };
}
