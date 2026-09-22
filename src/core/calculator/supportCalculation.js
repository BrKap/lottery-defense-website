import { calculateJewelStats } from './damageCalculation';

export const SUPPORT_OPTIONS = [['corruption', 'Corruption'], ['godOfTime', 'God of Time'], ['stukov', 'Stukov'], ['warfield', 'Warfield'], ['talTempest', 'Tal Tempest'], ['tassadar', 'Tassadar'], ['vessel', 'Vessel']];
const clampUptime = value => Math.max(0, Math.min(1, value));
const countOf = (units, id) => units.filter(u => u.unitId === id).reduce((sum, u) => sum + Number(u.count), 0);

export function calculateExposure(scenario) {
  const { enemy, mode } = scenario;
  const lateClassic = mode === 'Classic' && enemy.round >= 200;
  const spawned = enemy.count / (lateClassic ? 2 : 1);
  const spawnSeconds = enemy.seconds - 27;
  const spawnRate = spawned / spawnSeconds;
  const killRate = spawned / enemy.seconds;
  const netAliveGrowth = spawnRate - killRate;
  const mobSeconds = ((netAliveGrowth + netAliveGrowth * spawnSeconds) / 2) * spawnSeconds + 27 * spawned;
  const artifactLife = mobSeconds / spawned;
  const averageMobLife = artifactLife / (enemy.round >= 200 ? 2 : 1) - 1;
  return { spawned, spawnSeconds, spawnRate, killRate, netAliveGrowth, mobSeconds, artifactLife, averageMobLife, lateClassic };
}

export function calculateSupportCoverage(profile, scenario, buffs, units) {
  const exposure = calculateExposure(scenario);
  const stats = profile.combatStats.stats;
  const displaySD = profile.cappedStats.skillDamage;
  const inputs = buffs.supports ?? {};
  const counts = Object.fromEntries(SUPPORT_OPTIONS.map(([key]) => [key, Math.max(0, Math.min(999, Math.floor(Number(inputs[key] ?? 0))))]));
  const penalty = (1 - scenario.difficulty.accelerationReduction / 100) * (1 - scenario.torment.attackSpeedReduction / 100);
  const specialtyCooldown = profile.sources.spUpgrades.finalStats.cooldown;
  const artifactMana = (11.5 + specialtyCooldown * 0.05) * stats.acceleration * penalty;
  const ordinaryMana = artifactMana + (countOf(units, 'artifact') > 0 ? 9 : 0);
  const godOfTimeFactor = Math.max(0.5, 1 - 0.5 * counts.godOfTime * (13 + 0.01 * displaySD) / scenario.enemy.seconds);
  const helperSpeed = (1 + stats.attackSpeed / 100) * stats.acceleration * penalty * 1.1505;
  const helperIntervalRatio = 1.5 / helperSpeed * (1 + scenario.torment.attackSpeedReduction / 100);
  const coverage = {};
  const add = (key, uptime, percent) => { coverage[key] = { uptime: clampUptime(uptime), factor: 1 + clampUptime(uptime) * percent / 100 }; };
  const cast = (count, cost, duration, efficiency = 1, coverageEfficiency = 1) => scenario.enemy.seconds * ordinaryMana * count / cost * efficiency * duration / exposure.mobSeconds * coverageEfficiency;
  add('flower', countOf(units, 'flower') >= 3 ? 1 : 0, 10);
  add('hybridlope', cast(countOf(units, 'hybridlope'), 40, 15, 0.95), 30);
  add('stukov', cast(counts.stukov, 125, 5, 0.75, 0.75), 20);
  add('warfield', scenario.enemy.seconds / (1.3 * helperIntervalRatio) * counts.warfield * 0.1 * 2 / exposure.mobSeconds, 20);
  add('talTempest', cast(counts.talTempest, 125, Math.min(exposure.averageMobLife, 20), 0.8), 30);
  add('tassadar', cast(counts.tassadar, 150, 5), 10);
  add('vessel', cast(counts.vessel, 125, 15, 0.8), 30);
  const corruptionDuration = 15 + 0.01 * displaySD * profile.combatStats.sdGemMultiplier;
  // Retain the documented duration-versus-total-exposure branch, even at count 0.
  add('corruption', corruptionDuration / exposure.mobSeconds > 1 ? 1 : corruptionDuration * counts.corruption / scenario.enemy.seconds, 70);
  const positiveDebuffFactor = Object.values(coverage).reduce((product, item) => product * item.factor, 1);
  return { exposure, counts, coverage, artifactMana, ordinaryMana, godOfTimeFactor, helperIntervalRatio, corruptionDuration, positiveDebuffFactor };
}

export function resolveOvermind(profile, scenario, units, jewels, config) {
  const candidates = [];
  for (const unit of units.filter(u => u.unitId === 'overmind' && Number(u.count) > 0)) {
    if (!['default', 'uptime'].includes(unit.abilityMode ?? 'default')) return { status: 'unavailable', reason: 'Reselect the Overmind FD buff mode.' };
    const jewel = jewels.find(j => j.entryId === unit.jewel);
    if (unit.jewel !== 'none' && !jewel) return { status: 'unavailable', reason: 'Overmind jewel is unresolved.' };
    const result = calculateJewelStats(jewel, unit, config);
    if (result.status !== 'supported') return result;
    const lb = Number(unit.lb);
    const lbAcceleration = [0, 0, 0, 10, 20, 30, 30][lb];
    const acceleration = (1 + result.stats.acceleration / 100) * profile.combatStats.stats.acceleration * (1 + lbAcceleration / 100);
    const uptime = clampUptime(13.5 / (27 / acceleration / (1 - scenario.difficulty.accelerationReduction / 100) / (1 - scenario.torment.attackSpeedReduction / 100)));
    const scaled = unit.abilityMode === 'uptime';
    candidates.push({ entryId: unit.entryId, uptime, fd: 5 * (scaled ? uptime : 1) });
  }
  candidates.sort((a, b) => b.uptime - a.uptime);
  return { status: 'supported', selected: candidates[0] ?? null, candidates };
}

export function applyOvermindProfile(profile, selection) {
  const fd = selection?.fd ?? 0;
  const rawStats = { ...profile.rawStats, finalDamage: profile.rawStats.finalDamage + fd };
  const cappedStats = { ...profile.cappedStats, finalDamage: profile.cappedStats.finalDamage + fd };
  const stats = { ...profile.combatStats.stats, finalDamage: profile.combatStats.stats.finalDamage + fd };
  return { ...profile, rawStats, cappedStats,
    sourceBreakdown: [...profile.sourceBreakdown, ...(selection ? [{ source: 'buffs', entryName: 'Overmind', statKey: 'finalDamage', appliedValue: fd }] : [])],
    displayStats: { ...profile.displayStats, attackDamageWithFD: cappedStats.attackDamage * (1 + cappedStats.finalDamage / 100) },
    combatStats: { ...profile.combatStats, stats, finalDamageFactor: profile.combatStats.finalDamageFactor + fd / 100, pendingEffects: [] } };
}
