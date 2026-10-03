// SC2_FIXED_4096: wide scaled integers; provisional truncation toward zero.
// Numeric representation only: this does not emulate game-loop scheduling or
// Galaxy overflow. Expected-value formulas declare their own analytic domains.
export const FIXED_SCALE = 4096n;
export const FIXED_STEP = 1 / 4096;
export const FIXED_POLICY = Object.freeze({ version: 'sc2-fixed-4096-v1', step: FIXED_STEP,
  rounding: 'truncate-toward-zero', engineRoundingVerified: false });

const policies = new Set(['truncate-toward-zero', 'nearest-half-away', 'ceil']);
function ratio(numerator, denominator, rounding) {
  if (!policies.has(rounding)) throw new TypeError('Unknown fixed-point rounding policy.');
  if (denominator === 0n) throw new RangeError('Fixed-point division by zero.');
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const whole = numerator / denominator, remainder = numerator % denominator;
  if (rounding === 'ceil') return whole + (remainder > 0n ? 1n : 0n);
  if (rounding === 'nearest-half-away' && (remainder < 0n ? -remainder : remainder) * 2n >= denominator)
    return whole + (numerator < 0n ? -1n : 1n);
  return whole;
}

export function fromDecimal(value, rounding = FIXED_POLICY.rounding) {
  if (!policies.has(rounding)) throw new TypeError('Unknown fixed-point rounding policy.');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Fixed-point input must be finite.');
  // SC2_FIXED_4096: an existing binary grid value is already exact. Converting
  // it through a shortened decimal string could incorrectly drop one grid unit.
  if (typeof value === 'number' && Number.isSafeInteger(value * Number(FIXED_SCALE)))
    return BigInt(value * Number(FIXED_SCALE));
  if (typeof value !== 'string' && typeof value !== 'number') throw new TypeError('Use an unscaled decimal string or number.');
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(String(value).trim());
  if (!match) throw new TypeError('Invalid fixed-point decimal.');
  const fraction = match[3] ?? '', exponent = Number(match[4] ?? 0) - fraction.length;
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) throw new RangeError('Decimal exponent is out of range.');
  let numerator = BigInt(match[2] + fraction) * FIXED_SCALE;
  if (match[1] === '-') numerator = -numerator;
  return exponent >= 0 ? ratio(numerator * 10n ** BigInt(exponent), 1n, rounding)
    : ratio(numerator, 10n ** BigInt(-exponent), rounding);
}
export const fixedAdd = (a, b) => a + b;
export const fixedSubtract = (a, b) => a - b;
export const fixedMultiply = (a, b, rounding = FIXED_POLICY.rounding) => ratio(a * b, FIXED_SCALE, rounding);
export const fixedDivide = (a, b, rounding = FIXED_POLICY.rounding) => ratio(a * FIXED_SCALE, b, rounding);
export const fixedCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export const fixedClamp = (value, low, high) => {
  if (low > high) throw new RangeError('Invalid fixed-point bounds.');
  return value < low ? low : value > high ? high : value;
};
export const fixedToInteger = value => value / FIXED_SCALE;
export function toNumber(value) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError('Fixed-point result exceeds exact numeric display range.');
  return Number(value) / Number(FIXED_SCALE);
}
// SC2_FIXED_4096: adapters for existing numeric APIs. Every operation converts
// operands and quantizes its result; wide totals can use the BigInt API directly.
export const q = value => toNumber(fromDecimal(value));
export const add = (a, b) => toNumber(fixedAdd(fromDecimal(a), fromDecimal(b)));
export const sub = (a, b) => toNumber(fixedSubtract(fromDecimal(a), fromDecimal(b)));
export const mul = (a, b) => toNumber(fixedMultiply(fromDecimal(a), fromDecimal(b)));
export const div = (a, b) => toNumber(fixedDivide(fromDecimal(a), fromDecimal(b)));
export const ceilDiv = (a, b) => toNumber(fixedDivide(fromDecimal(a), fromDecimal(b), 'ceil'));
