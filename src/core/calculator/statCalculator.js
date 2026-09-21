import { DERIVED_STAT_KEYS, STAT_KEYS } from './statKeys';
import { getUpgradeValue } from './spUpgradeHelpers';

// Preserve empirical coefficients and operation order. Do not quantize every
// operation: verified fixed-point boundaries are not yet known. See
// Documentation/implementationprogress/calculation-evidence-and-precision.md.

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
    [STAT_KEYS.ACCELERATION]: toNumber(sourceResult.accelerationMultiplier),
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
      return { [STAT_KEYS.ACCELERATION]: 14.99 };

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
      return {};

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
  if (toNumber(rune?.runeLevel) !== 15) return {};
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
  const table = runeConstants.RUNE_ENCHANT_VALUE_TABLE ?? {};
  const enchantValueTable = { ...table, 9: table[8] };
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
      const rawBaseValue = toNumber(rune[row.baseField]);
      const baseValue = runeType === 'cosmos' && row.statKey === STAT_KEYS.ACCELERATION ? Math.min(10, rawBaseValue)
        : runeType === 'chaos' && row.statKey === STAT_KEYS.FINAL_DAMAGE ? Math.min(5, rawBaseValue) * (toNumber(rune.runeLevel) >= 10 && rune.runeBonusTen === '2x Final dmg' ? 2 : 1)
        : rawBaseValue;
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

    const seenBonuses = new Set();
    [
      { value: toNumber(rune.runeLevel) >= 10 ? rune.runeBonusTen : 'None', label: '+10' },
      { value: toNumber(rune.runeLevel) === 15 ? rune.runeBonusFifteen : 'None', label: '+15' },
      { value: rune.runeTran, label: '@tran' },
    ].forEach(({ value, label }) => {
      if (seenBonuses.has(value)) return;
      seenBonuses.add(value);
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
    for (const [statKey, value] of Object.entries(rune.manualModifiers ?? {})) {
      if (!['attackDamage', 'attackSpeed', 'critDamage', 'critChance'].includes(statKey)) continue;
      addStat(result, statKey, value);
      result.breakdown.push(createBreakdownEntry({ source: 'runes', entryId: runeEntryId, entryName: 'Manual rune modifier', statKey, appliedValue: toNumber(value) }));
    }
    result.flags = { ...result.flags, bypassSuperShield: Boolean(result.flags?.bypassSuperShield || (runeType === 'cosmos' && toNumber(rune.runeLevel) >= 10 && rune.runeBonusTen === '-SS & Refund')) };
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

export function calculateBuffSourceStats(buffState = null, settings = {}, units = []) {
  const result = createEmptySourceResult();
  const buffs = buffState ?? {};
  const present = unitId => units.some(u => u.unitId === unitId && toNumber(u.count) > 0);
  const grant = (name, values) => Object.entries(values).forEach(([statKey, value]) => {
    addStat(result, statKey, value);
    if (value) result.breakdown.push(createBreakdownEntry({ source: 'buffs', entryName: name, statKey, appliedValue: value }));
  });
  const team = settings.tocMode ? 0 : toNumber(buffs.teamBuffCount);
  grant('Full Team Buff', { attackDamage: team * 27, attackSpeed: team * 27, critChance: team * 13.5 });
  grant('Bless', { attackDamage: toNumber(buffs.bless) * 20 });
  grant('Power Banker', { attackDamage: (buffs.powerBanker ? 50 : 0) + (buffs.powerBankerPlus ? 60 : 0) });
  grant('Solo Crit Gem', { critChance: buffs.critGem ? 20 : 0 });
  grant('Artifact', { critChance: present('artifact') ? 20 : 0 });
  const factor = buffs.superBuff ? 1.33 : buffs.superBuffPlus ? 1.5 : 1;
  for (const [unitId, statKey, amount] of [['xelnaga-kerrigan','critChance',10],['amon','attackDamage',30],['terra-tron','critChance',10],['spec-ops-nova','attackSpeed',15],['spear-of-adun','critDamage',30],['overmind','critDamage',30]]) {
    if (present(unitId)) grant(unitId, { [statKey]: amount * factor });
  }
  return finalizeSourceResult(result);
}

export function calculateManualSourceStats(input = {}, name = 'manual') {
  const result = createEmptySourceResult();
  if (input.enabled) for (const [statKey, value] of Object.entries(input.stats ?? {})) {
    if (!(statKey in result.additiveStats)) continue;
    const combineMode = applyRuneStat(result, statKey, value);
    result.breakdown.push(createBreakdownEntry({ source: name, entryName: name, statKey, appliedValue: toNumber(value), combineMode }));
  }
  return finalizeSourceResult(result);
}

export function calculateProgressionSourceStats(settings = {}) {
  const result = createEmptySourceResult();
  const gp = Math.max(0, Math.min(400, toNumber(settings.gp)));
  addStat(result, 'attackDamage', Math.max(0, gp - 24) * 5);
  addStat(result, 'finalDamage', settings.title === 'The Zero' ? Math.max(0, Math.min(11, toNumber(settings.theZeroLevel)) - 3) * 2 : 0);
  result.breakdown.push(createBreakdownEntry({ source: 'progression', entryName: 'GP and The Zero', rawValue: settings, appliedValue: { ...result.additiveStats } }));
  result.gpCountThreshold = gp <= 8 ? 1 : gp <= 20 ? 2 : gp <= 32 ? 3 : 4;
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
    accelerationMultiplier: toNumber(rawStats[STAT_KEYS.ACCELERATION]),
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
  calculatorSettings = {},
  units = [],
  sandboxState = {},
  additionalRuneState = {},
  runeConstants = {},
  upgradeGroupMap = {},
}) {
  const runeSource = calculateRuneSourceStats(runeLoadouts, runeConstants);
  const spUpgradeSource = calculateSpUpgradeSourceStats(spInvestments, upgradeGroupMap);
  const difficultySource = calculateDifficultySourceStats(difficultyState);
  const tormentSource = calculateTormentSourceStats(tormentState);
  const buffSource = calculateBuffSourceStats(buffState, calculatorSettings, units);

  const sources = {
    runes: runeSource,
    spUpgrades: spUpgradeSource,
    difficulty: difficultySource,
    torment: tormentSource,
    buffs: buffSource,
    progression: calculateProgressionSourceStats(calculatorSettings),
    sandbox: calculateManualSourceStats(sandboxState, 'sandbox'),
    additionalRune: calculateManualSourceStats(additionalRuneState, 'additionalRune'),
  };

  const rawStats = mergeFinalSourceStats(Object.values(sources));
  const cappedStats = { ...rawStats, attackDamage: Math.min(4000, rawStats.attackDamage), multiCrit: Math.min(45, rawStats.multiCrit), armorReduction: Math.min(60, rawStats.armorReduction) };
  const flower = units.filter(u => u.unitId === 'flower').reduce((sum, u) => sum + toNumber(u.count), 0) >= 3;
  const unitAdjustedStats = { ...cappedStats, attackDamage: cappedStats.attackDamage + (flower ? 20 : 0), attackSpeed: cappedStats.attackSpeed + (flower ? 15 : 0), skillDamage: cappedStats.skillDamage + (flower ? 40 : 0) };
  const displayStats = calculateDisplayStats(cappedStats, tormentState);
  const combatStats = { ...calculateCombatStats(unitAdjustedStats, tormentState), stats: unitAdjustedStats,
    attackDamageFactor: 1 + unitAdjustedStats.attackDamage / 100, finalDamageFactor: 1 + unitAdjustedStats.finalDamage / 100,
    sdGemMultiplier: buffState?.sdGem === 'SD' ? 1.5 : buffState?.sdGem === 'SD+' ? 1.67 : 1,
    bypassSuperShield: Boolean(runeSource.flags?.bypassSuperShield), gpCountThreshold: sources.progression.gpCountThreshold,
    pendingEffects: units.some(u => u.unitId === 'overmind' && toNumber(u.count) > 0) ? ['Overmind uptime and stack effects'] : [],
  };

  return {
    sources,
    sourceBreakdown: flattenSourceBreakdowns(sources),
    rawStats,
    cappedStats,
    displayStats,
    combatStats,
  };
}
