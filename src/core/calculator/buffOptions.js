export const ADDITIONAL_RUNE_STAT_KEYS = ['attackDamage', 'attackSpeed', 'critChance', 'critDamage', 'finalDamage', 'acceleration'];
export const ADDITIONAL_RUNE_METHODS = [
  { id: 'manual', label: 'Manual input' },
  { id: 'automatic', label: 'Automatic (formula pending)' },
];
export const canUseBless = title => ['Divine', 'The One', 'The One II', 'The Zero'].includes(title);
export const getSuperBuffGem = buffs => buffs.superBuff ? 'standard' : buffs.superBuffPlus ? 'plus' : 'none';

export function getRuneAffixOptions(options, oppositeValue, currentValue) {
  // Keep a conflicting legacy selection visible until the user changes it.
  return options.filter(option => option.value === 'None' || option.value !== oppositeValue || option.value === currentValue)
    .map(option => option.value !== 'None' && option.value === oppositeValue && option.value === currentValue
      ? { ...option, label: `${option.label} (saved duplicate — reselect)`, disabled: true } : option);
}
