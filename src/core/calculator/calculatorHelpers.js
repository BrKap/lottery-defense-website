export function formatNumber(num) {
  return num;
}

export function toNumber(value) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}


