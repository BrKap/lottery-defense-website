import { getRuneImage } from '../images/imageImporter';
import { STAT_KEYS } from './mainConstants';

export const FLIP_DURATION_MS = 1000;

export const RUNE_TYPES = [
  { value: 'master', label: 'Master' },
  { value: 'ultimate', label: 'Ultimate' },
  { value: 'final', label: 'Final' },
  { value: 'winner', label: 'Winner' },
  { value: 'chaos', label: 'Chaos' },
  { value: 'cosmos', label: 'Cosmos' },
];

export const RUNE_SLOTS = [
  { value: 'slot-1', label: '1' },
  { value: 'slot-2', label: '2' },
  { value: 'slot-3', label: '3' },
  { value: 'slot-4', label: '4' },
  { value: 'slot-5', label: '5' },
  { value: 'slot-6', label: 'Test' }, /* Specifically for testing rune comparisons */
];

export const RUNE_AWAKENING_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
];

export const RUNE_LEVEL_OPTIONS = Array.from({ length: 16}, (_, index) => ({
  value: String(index),
  label: String(index),
}));

export const RUNE_ENCHANT_LEVEL_OPTIONS = Array.from(
  { length: 10 },
  (_, index) => ({
    value: String(index),
    label: String(index),
  })
);

export const RUNE_RACE_UPGRADE_OPTIONS = [
  { value: 'T Bio', label: 'T Bio' },
  { value: 'T Mech', label: 'T Mech' },
  { value: 'P Bio', label: 'P Bio' },
  { value: 'P Mech', label: 'P Mech' },
  { value: 'Zerg', label: 'Zerg' },
];

export const RUNE_BONUS_TEN_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Every Race +1', label: 'Every Race +1' },
  { value: '50% Crit Dmg', label: '50% Crit Dmg' },
  { value: '15% Accel', label: '15% Accel' },
  { value: '2x BaseCC', label: '2x BaseCC' },
  { value: '-25% Armor', label: '-25% Armor' },
  { value: '3 MC', label: '3 MC' },
  { value: 'Max Grade +5', label: 'Max Grade +5' },
  { value: '50% debuff remove', label: '50% Debuff Removal' },
  { value: '15 AD on equip', label: '15 AD on equip' },
  { value: '-SS & Refund', label: '-SS & Refund' },
  { value: '2x Final dmg', label: '2x Final dmg' },
];

export const RUNE_BONUS_FIFTEEN_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Every Race +1', label: 'Every Race +1' },
  { value: '50% Crit Dmg', label: '50% Crit Dmg' },
  { value: '15% Accel', label: '15% Accel' },
  { value: '2x BaseCC', label: '2x BaseCC' },
  { value: '-25% Armor', label: '-25% Armor' },
  { value: '3 MC', label: '3 MC' },
  { value: 'Max Grade +5', label: 'Max Grade +5' },
  { value: '50% debuff remove', label: '50% Debuff Removal' },
];

export const RUNE_TRAN_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Every Race +1', label: 'Every Race +1' },
  { value: '50% Crit Dmg', label: '50% Crit Dmg' },
  { value: '15% Accel', label: '15% Accel' },
  { value: '2x BaseCC', label: '2x BaseCC' },
  { value: '-25% Armor', label: '-25% Armor' },
  { value: '3 MC', label: '3 MC' },
  { value: 'Max Grade +5', label: 'Max Grade +5' },
  { value: '50% debuff remove', label: '50% Debuff Removal' },
  { value: '15 AD on equip', label: '15 AD on equip' },
];

function makeOptions(values) {
  return values.map((value) => ({
    value: String(value),
    label: String(value),
  }));
}

export const RUNE_BASE_OPTIONS_BY_STAT = {
  [STAT_KEYS.ATTACK_DAMAGE]: makeOptions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  [STAT_KEYS.ATTACK_SPEED]: makeOptions([1, 2,3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  [STAT_KEYS.SKILL_DAMAGE]: makeOptions([1, 2,3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  [STAT_KEYS.CRIT_CHANCE]: makeOptions([1, 2,3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  [STAT_KEYS.CRIT_DAMAGE]: makeOptions([1, 2,3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
                                        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 
                                        31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]),
  [STAT_KEYS.FINAL_DAMAGE]: makeOptions([1, 2, 3, 4, 5]),
  [STAT_KEYS.ACCELERATION]: makeOptions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  [STAT_KEYS.SP_PERCENT]: makeOptions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
};

export const RUNE_PINK_OPTIONS_BY_STAT = {
  [STAT_KEYS.ATTACK_DAMAGE]: makeOptions([-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  [STAT_KEYS.ATTACK_SPEED]: makeOptions([-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  [STAT_KEYS.CRIT_CHANCE]: makeOptions([-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  [STAT_KEYS.CRIT_DAMAGE]: makeOptions([-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
};

export const RUNE_ICON_BY_TYPE = {
  master: getRuneImage('master'),
  ultimate: getRuneImage('ultimate'),
  final: getRuneImage('final'),
  winner: getRuneImage('winner'),
  chaos: getRuneImage('chaos'),
  cosmos: getRuneImage('cosmos'),
};

function buildRow({
  id,
  label,
  statKey,
  baseField,
  bonusField = null,
  pinkEnabled = false,
  hasLevelYellowBonus = false,
}) {
  return {
    id,
    label,
    statKey,
    baseField,
    bonusField,
    pinkEnabled,
    hasLevelYellowBonus,
  };
}

export const RUNE_LAYOUTS = {
  master: {
    primaryRows: [
      buildRow({
        id: 'attackDamage',
        label: 'Attack Damage',
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        baseField: 'attackDamageBase',
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'attackSpeed',
        label: 'Attack Speed',
        statKey: STAT_KEYS.ATTACK_SPEED,
        baseField: 'attackSpeedBase',
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'skillDamage',
        label: 'Skill Damage',
        statKey: STAT_KEYS.SKILL_DAMAGE,
        baseField: 'skillDamageBase',
      }),
    ],
  },

  ultimate: {
    primaryRows: [
      buildRow({
        id: 'attackDamage',
        label: 'Attack Damage',
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        baseField: 'attackDamageBase',
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'attackSpeed',
        label: 'Attack Speed',
        statKey: STAT_KEYS.ATTACK_SPEED,
        baseField: 'attackSpeedBase',
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'skillDamage',
        label: 'Skill Damage',
        statKey: STAT_KEYS.SKILL_DAMAGE,
        baseField: 'skillDamageBase',
      }),
      buildRow({
        id: 'critChance',
        label: 'Critical Chance',
        statKey: STAT_KEYS.CRIT_CHANCE,
        baseField: 'critChanceBase',
        hasLevelYellowBonus: true,
      }),
    ],
  },

  final: {
    primaryRows: [
      buildRow({
        id: 'attackDamage',
        label: 'Attack Damage',
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        baseField: 'attackDamageBase',
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'attackSpeed',
        label: 'Attack Speed',
        statKey: STAT_KEYS.ATTACK_SPEED,
        baseField: 'attackSpeedBase',
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'skillDamage',
        label: 'Skill Damage',
        statKey: STAT_KEYS.SKILL_DAMAGE,
        baseField: 'skillDamageBase',
      }),
      buildRow({
        id: 'critChance',
        label: 'Critical Chance',
        statKey: STAT_KEYS.CRIT_CHANCE,
        baseField: 'critChanceBase',
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'spPercent',
        label: 'SP %',
        statKey: STAT_KEYS.SP_PERCENT,
        baseField: 'spPercentBase',
        hasLevelYellowBonus: true,
      }),
    ],
  },

  winner: {
    primaryRows: [
      buildRow({
        id: 'attackDamage',
        label: 'Attack Damage',
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        baseField: 'attackDamageBase',
        bonusField: 'attackDamageBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'attackSpeed',
        label: 'Attack Speed',
        statKey: STAT_KEYS.ATTACK_SPEED,
        baseField: 'attackSpeedBase',
        bonusField: 'attackSpeedBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'critDamage',
        label: 'Critical Damage',
        statKey: STAT_KEYS.CRIT_DAMAGE,
        baseField: 'critDamageBase',
        bonusField: 'critDamageBonus',
        pinkEnabled: true,
      }),
      buildRow({
        id: 'critChance',
        label: 'Critical Chance',
        statKey: STAT_KEYS.CRIT_CHANCE,
        baseField: 'critChanceBase',
        bonusField: 'critChanceBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'spPercent',
        label: 'SP %',
        statKey: STAT_KEYS.SP_PERCENT,
        baseField: 'spPercentBase',
        hasLevelYellowBonus: true,
      }),
    ],
  },

  chaos: {
    primaryRows: [
      buildRow({
        id: 'attackDamage',
        label: 'Attack Damage',
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        baseField: 'attackDamageBase',
        bonusField: 'attackDamageBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'attackSpeed',
        label: 'Attack Speed',
        statKey: STAT_KEYS.ATTACK_SPEED,
        baseField: 'attackSpeedBase',
        bonusField: 'attackSpeedBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'critDamage',
        label: 'Critical Damage',
        statKey: STAT_KEYS.CRIT_DAMAGE,
        baseField: 'critDamageBase',
        bonusField: 'critDamageBonus',
        pinkEnabled: true,
      }),
      buildRow({
        id: 'finalDamage',
        label: 'FD',
        statKey: STAT_KEYS.FINAL_DAMAGE,
        baseField: 'finalDamageBase',
      }),
      buildRow({
        id: 'critChance',
        label: 'Critical Chance',
        statKey: STAT_KEYS.CRIT_CHANCE,
        baseField: 'critChanceBase',
        bonusField: 'critChanceBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'spPercent',
        label: 'SP %',
        statKey: STAT_KEYS.SP_PERCENT,
        baseField: 'spPercentBase',
        hasLevelYellowBonus: true,
      }),
    ],
  },

  cosmos: {
    primaryRows: [
      buildRow({
        id: 'attackDamage',
        label: 'Attack Damage',
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        baseField: 'attackDamageBase',
        bonusField: 'attackDamageBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'attackSpeed',
        label: 'Attack Speed',
        statKey: STAT_KEYS.ATTACK_SPEED,
        baseField: 'attackSpeedBase',
        bonusField: 'attackSpeedBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'critDamage',
        label: 'Critical Damage',
        statKey: STAT_KEYS.CRIT_DAMAGE,
        baseField: 'critDamageBase',
        bonusField: 'critDamageBonus',
        pinkEnabled: true,
      }),
      buildRow({
        id: 'acceleration',
        label: 'Accel',
        statKey: STAT_KEYS.ACCELERATION,
        baseField: 'accelerationBase',
      }),
      buildRow({
        id: 'critChance',
        label: 'Critical Chance',
        statKey: STAT_KEYS.CRIT_CHANCE,
        baseField: 'critChanceBase',
        bonusField: 'critChanceBonus',
        pinkEnabled: true,
        hasLevelYellowBonus: true,
      }),
      buildRow({
        id: 'spPercent',
        label: 'SP %',
        statKey: STAT_KEYS.SP_PERCENT,
        baseField: 'spPercentBase',
        hasLevelYellowBonus: true,
      }),
    ],
  },
};

export const RUNE_ENCHANT_ROWS = [
  { id: 'attackDamage', label: 'Attack Damage', field: 'enchantAttackDamage', valueKey: 'attackDamage' },
  { id: 'critChance', label: 'Critical Chance', field: 'enchantAttackSpeed', valueKey: 'critChance' },
  { id: 'acceleration', label: 'Acceleration', field: 'enchantAcceleration', valueKey: 'acceleration' },
  { id: 'totalDamage', label: 'Total Damage', field: 'enchantTotalDamage', valueKey: 'finalDamage' },
  { id: 'shieldReduction', label: 'Shield Reduction', field: 'enchantShieldReduction', valueKey: 'shieldReduction' },
  { id: 'healthReduction', label: 'HP Reduction', field: 'enchantHealthReduction', valueKey: 'healthReduction' },
];

export function getRuneEnchantDisplayValue(valueKey, enchantLevel) {
  const level = Number(enchantLevel) || 0;
  const row = RUNE_ENCHANT_VALUE_TABLE[level] ?? RUNE_ENCHANT_VALUE_TABLE[0];
  const value = Number(row?.[valueKey] ?? 0);

  return value > 0 ? `+${value}` : '+0';
}

export function getRuneBaseOptions(statKey) {
  return RUNE_BASE_OPTIONS_BY_STAT[statKey] ?? makeOptions([0]);
}

export function getRunePinkOptions(statKey) {
  return RUNE_PINK_OPTIONS_BY_STAT[statKey] ?? makeOptions([0]);
}

export function getRuneYellowValue(statKey, runeLevel) {
  const level = Number(runeLevel) || 0;

  if (
    statKey === STAT_KEYS.ATTACK_DAMAGE ||
    statKey === STAT_KEYS.ATTACK_SPEED ||
    statKey === STAT_KEYS.CRIT_CHANCE
  ) {
    return `+${Math.min(level, 15)}`;
  }

  if (statKey === STAT_KEYS.SP_PERCENT) {
    return level >= 9 ? '+5%' : '-';
  }

  return '-';
}

export function createEmptyRuneData(slotValue) {
  return {
    id: `rune-${slotValue}`,
    slot: slotValue,

    runeType: 'Winner',
    runeLevel: '0',
    runeAwakening: 'None',
    runeRaceUpgrade: 'None',
    runeBonusTen: 'None',
    runeBonusFifteen: 'None',
    runeTran: 'None',

    attackDamageBase: '10',
    attackDamageBonus: '0',

    attackSpeedBase: '10',
    attackSpeedBonus: '0',

    skillDamageBase: '5',

    critChanceBase: '10',
    critChanceBonus: '0',

    critDamageBase: '10',
    critDamageBonus: '0',

    finalDamageBase: '5',
    accelerationBase: '5',
    spPercentBase: '5',

    enchantAttackDamage: '0',
    enchantAttackSpeed: '0',
    enchantAcceleration: '0',
    enchantTotalDamage: '0',
    enchantShieldReduction: '0',
    enchantHealthReduction: '0',
  };
}

export const RUNE_ENCHANT_VALUE_TABLE = {
  0: { attackDamage: 0, critChance: 0, acceleration: 0, finalDamage: 0, shieldReduction: 0, healthReduction: 0 },
  1: { attackDamage: 4, critChance: 2, acceleration: 1, finalDamage: 1, shieldReduction: 1, healthReduction: 1 },
  2: { attackDamage: 8, critChance: 4, acceleration: 2, finalDamage: 2, shieldReduction: 2, healthReduction: 2 },
  3: { attackDamage: 16, critChance: 7, acceleration: 4, finalDamage: 3, shieldReduction: 4, healthReduction: 4 },
  4: { attackDamage: 24, critChance: 10, acceleration: 6, finalDamage: 4, shieldReduction: 6, healthReduction: 6 },
  5: { attackDamage: 40, critChance: 15, acceleration: 10, finalDamage: 5, shieldReduction: 10, healthReduction: 10 },
  6: { attackDamage: 50, critChance: 18, acceleration: 12, finalDamage: 6, shieldReduction: 12, healthReduction: 12 },
  7: { attackDamage: 55, critChance: 20, acceleration: 13, finalDamage: 6, shieldReduction: 13, healthReduction: 13 },
  8: { attackDamage: 60, critChance: 22, acceleration: 14, finalDamage: 7, shieldReduction: 14, healthReduction: 14 },
  9: { attackDamage: 65, critChance: 24, acceleration: 15, finalDamage: 8, shieldReduction: 15, healthReduction: 15 },
};

export function createInitialRuneLoadouts() {
  return RUNE_SLOTS.map((slot) => createEmptyRuneData(slot.value));
}

