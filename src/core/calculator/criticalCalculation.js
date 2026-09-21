export function calculateCriticalExpectation(stats = {}, tormentReduction = 0, multiCritWeight = 1) {
  const cc = Math.max(0, Number(stats.critChance ?? 0));
  const mc = Math.max(0, Math.min(45, Number(stats.multiCrit ?? 0)));
  const pCrit = Math.min(cc, 100) / 100;
  const pMultiCrit = mc > 0 ? Math.min(cc / 3, 100) / 100 : 0;
  const extraMC = cc >= 300 ? Math.floor((cc - 300) / 20) : 0;
  const averageMC = mc * pMultiCrit + extraMC;
  const reducedCD = (100 + Number(stats.critDamage ?? 0)) * (1 - tormentReduction / 100);
  const multiplier = (1 - pCrit) + pCrit * (1 + reducedCD / 100 + reducedCD * 0.667 * averageMC * multiCritWeight / 100);
  return { pCrit, pMultiCrit, extraMC, averageMC, reducedCD, multiplier };
}
