import { RANK_BONUSES } from '../../data/euna/calculator/unitConstants';
import { calculateCriticalExpectation } from './criticalCalculation';
import { calculateRelativePenetration } from './scenarioCalculator';

const raceStats = { tBio: 'raceUpgradeTBio', tMech: 'raceUpgradeTMech', pBio: 'raceUpgradePBio', pMech: 'raceUpgradePMech', zerg: 'raceUpgradeZerg' };
const singleGrades = [6.739428272, 7.414050869];
const hybridGrades = [7.052873316, 7.406086858, 7.776752618];
const lbAD = [0, 50, 100, 175, 300, 500, 500];
const lbAccel = [0, 0, 0, 10, 20, 30, 30];
const noCountBonus = new Set(['xelnaga-kerrigan', 'amon', 'terra-tron', 'spec-ops-nova', 'spear-of-adun', 'overmind', 'artifact']);
const unavailable = (unit, reason) => ({ entryId: unit.entryId, unitId: unit.unitId, name: unit.name, count: Number(unit.count), status: 'unavailable', reason, perUnitDps: null, fullDps: null });

export function calculateJewelStats(jewel, unit, config) {
  const stats = { finalDamage: 0, acceleration: 0, attackSpeed: 0, attackDamage: 0, cooldown: 0, skillDamage: 0 };
  if (!jewel || unit.unitId === 'artifact') return { status: 'supported', stats };
  const type = config.JEWEL_TYPES.find(t => t.id === jewel.typeId);
  if (!type) return { status: 'unavailable', reason: 'Unknown jewel type. Reassign the jewel.' };
  for (const key of Object.keys(stats)) {
    if (!config.JEWEL_STAT_OPTIONS[key].some(o => o.value === String(jewel[key]))) return { status: 'unavailable', reason: 'Saved jewel rolls need reselection.' };
    stats[key] = Number(jewel[key]);
  }
  if (type.canUpgrade) {
    if (!config.JEWEL_UPGRADE_OPTIONS.some(o => o.value === String(jewel.jewelUpgrade))) return { status: 'unavailable', reason: 'Saved jewel upgrade needs reselection.' };
    stats.finalDamage += Number(jewel.jewelUpgrade) * type.upgradeFd;
  }
  if (type.condition.minimumLb === undefined || Number(unit.lb) >= type.condition.minimumLb) {
    for (const [key, value] of Object.entries(type.innateStats)) stats[key] += value;
  }
  if (type.condition.editableInnate === 'innateAd') {
    if (!config.LAPIS_AD_OPTIONS.some(o => o.value === String(jewel.innateAd))) return { status: 'unavailable', reason: 'Saved innate AD needs reselection.' };
    stats.attackDamage += Number(jewel.innateAd);
  }
  return { status: 'supported', stats, effectiveRank: type.condition.effectiveRank };
}

export function calculateUnitDamage(unit, { profile, scenario, jewels, config, totalCount = Number(unit.count), penetrationEnabled = true, godOfTimeFactor = 1 }) {
  if (scenario.status !== 'supported') return unavailable(unit, scenario.reason);
  const stats = profile.combatStats.stats;
  const count = Number(unit.count), lb = Number(unit.lb), level = Number(unit.level), armor = Number(unit.armor);
  if (![count, lb, level, armor, godOfTimeFactor].every(Number.isFinite) || count < 0 || !Number.isInteger(count) || !Number.isInteger(lb) || lb < 0 || lb > 6 || level < 0 || armor < 0 || godOfTimeFactor <= 0) return unavailable(unit, 'Invalid unit inputs.');
  const template = config.unitLibrary.find(t => t.id === unit.unitId);
  if (!template) return unavailable(unit, 'Unknown unit.');
  const jewel = jewels.find(j => j.entryId === unit.jewel);
  if (unit.jewel && unit.jewel !== 'none' && !jewel && unit.unitId !== 'artifact') return unavailable(unit, 'Assigned jewel is missing. Reassign it.');
  const jewelResult = calculateJewelStats(jewel, unit, config);
  if (jewelResult.status !== 'supported') return unavailable(unit, jewelResult.reason);
  const j = jewelResult.stats;
  const rankName = jewelResult.effectiveRank ?? unit.rank;
  const rank = Object.hasOwn(RANK_BONUSES, rankName) ? RANK_BONUSES[rankName] : null;
  if (!rank) return unavailable(unit, 'Unknown rank. Reselect a supported rank.');
  const raceBonus = template.raceFlags.reduce((sum, flag) => sum + Number(stats[raceStats[flag]] ?? 0), 0);
  if (!Number.isFinite(raceBonus) || raceBonus < 0) return unavailable(unit, 'Invalid race upgrade.');
  const grade = template.gradeModel === 'artifact' ? 120 + Object.values(raceStats).reduce((sum, key) => sum + Number(stats[key] ?? 0), 0) : 20 + raceBonus;
  const table = template.gradeModel === 'hybrid' ? hybridGrades : singleGrades;
  // Approximate grade lookup uses the final supplied row above its upper bound.
  const gradeMultiplier = table[Math.min(table.length - 1, Math.floor(raceBonus))];
  const gradedBase = template.gradeModel === 'artifact' ? 100 + grade * 0.5 : template.baseDamage * gradeMultiplier;
  const countBonus = noCountBonus.has(unit.unitId) ? 0 : totalCount > 8 ? -10 * (totalCount - 8) : totalCount > 0 && totalCount <= (profile.combatStats.gpCountThreshold ?? 1) ? 30 : 0;
  const overmindAD = Math.max(0, Math.min(5, Math.floor(Number(unit.overmindStacks ?? 0)))) * 10;
  const unitAD = rank.ad + level * 5 + armor + lbAD[lb] + countBonus + j.attackDamage + overmindAD;
  const effectiveAD = unitAD + stats.attackDamage + 15.5 - scenario.difficulty.attackDamageSubtraction;
  const adFactor = 1 + effectiveAD / 100;
  const fdFactor = 1 + (stats.finalDamage + j.finalDamage + (lb === 6 ? 30 : 0) - scenario.torment.finalDamageSubtraction) / 100;
  const speedMultiplier = (1 + (stats.attackSpeed + rank.as + j.attackSpeed) / 100)
    * (1 - scenario.difficulty.accelerationReduction / 100) * stats.acceleration
    * (1 + lbAccel[lb] / 100) * (1 - scenario.torment.attackSpeedReduction / 100)
    * 1.1505 * (1 + j.acceleration / 100) * template.speedAdjustment;
  const uncappedInterval = template.baseInterval * godOfTimeFactor / speedMultiplier;
  const interval = count > 0 ? Math.max(0.0625, uncappedInterval) : uncappedInterval;
  const critical = calculateCriticalExpectation(stats, scenario.torment.critDamageReduction, ['artifact', 'destroyer'].includes(unit.unitId) ? 0.45 : 1);
  const penetrationFactor = calculateRelativePenetration(scenario, template.defensePen, penetrationEnabled);
  const hitDamage = gradedBase * adFactor * fdFactor;
  if (![speedMultiplier, interval, hitDamage, critical.multiplier, penetrationFactor].every(Number.isFinite) || speedMultiplier <= 0 || adFactor < 0 || fdFactor < 0 || critical.multiplier < 0) return unavailable(unit, 'These stats are outside the supported damage range.');
  const pending = unit.unitId === 'artifact' ? 'Artifact spell damage is pending.' : unit.unitId === 'overmind' ? 'Overmind damage and uptime are pending.' : unit.unitId === 'xelnaga-kerrigan' && !unit.xnkFixedAttacks ? 'Adaptive attack count is pending.' : null;
  const perUnitDps = pending ? null : hitDamage * template.attacks / interval * critical.multiplier * template.damageAdjustment * penetrationFactor;
  const fullDps = count === 0 ? 0 : perUnitDps === null ? null : perUnitDps * count;
  if (perUnitDps !== null && (!Number.isFinite(perUnitDps) || !Number.isFinite(fullDps))) return unavailable(unit, 'Damage exceeds the supported calculation range.');
  return { entryId: unit.entryId, unitId: unit.unitId, name: template.name, count, status: pending ? 'pending' : 'supported', reason: pending,
    perUnitDps, fullDps, details: { grade, gradeMultiplier, gradedBase, effectiveRank: rankName, provisionalRank: !!rank.provisional, jewelStats: j, unitAD, effectiveAD, countBonus, adFactor, fdFactor, hitDamage, speedMultiplier, baseInterval: template.baseInterval, interval, attacks: template.attacks, critical, penetrationFactor, damageAdjustment: template.damageAdjustment } };
}

export function calculateArmyDamage(units, context) {
  const counts = new Map();
  units.forEach(unit => counts.set(unit.unitId, (counts.get(unit.unitId) ?? 0) + Number(unit.count)));
  const entries = units.map(unit => calculateUnitDamage(unit, { ...context, totalCount: counts.get(unit.unitId) }));
  return summarizeArmyEntries(entries);
}

export function summarizeArmyEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const group = groups.get(entry.unitId) ?? { unitId: entry.unitId, name: entry.name, totalCount: 0, variants: 0, totalDps: 0, incomplete: false };
    group.totalCount += entry.count;
    group.variants++;
    group.totalDps += entry.fullDps ?? 0;
    group.incomplete ||= entry.count > 0 && entry.fullDps === null;
    groups.set(entry.unitId, group);
  }
  return { entries, groups: [...groups.values()].sort((a, b) => b.totalDps - a.totalDps), ordinaryDps: entries.reduce((sum, entry) => sum + (entry.fullDps ?? 0), 0),
    incomplete: entries.some(entry => entry.count > 0 && entry.fullDps === null), totalUnits: entries.reduce((sum, entry) => sum + entry.count, 0), uniqueUnits: [...groups.values()].filter(group => group.totalCount > 0).length };
}
