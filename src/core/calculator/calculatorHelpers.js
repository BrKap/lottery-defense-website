export function formatNumber(num) {
  return num;
}

const combatNumberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export function formatCombatNumber(value) {
  return Number.isFinite(value) ? combatNumberFormatter.format(value) : 'Unavailable';
}

export function toNumber(value) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}


