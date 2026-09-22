import { calculateArmyDamage, summarizeArmyEntries } from './damageCalculation';
import { calculateScenario } from './scenarioCalculator';
import { calculateCriticalExpectation } from './criticalCalculation';
import { calculateSupportCoverage, resolveOvermind, applyOvermindProfile } from './supportCalculation';

const chainExcluded = new Set(['xelnaga-kerrigan', 'sarah-kerrigan', 'broodlord', 'spore-cannon', 'laserra', 'laser-drill']);
const unavailable = (profile, scenario, reason, units) => ({ ...summarizeArmyEntries(units.map(unit => ({ entryId: unit.entryId, unitId: unit.unitId, name: unit.name, count: Number(unit.count), status: 'unavailable', reason, perUnitDps: null, fullDps: null }))), status: 'unavailable', reason, profile, scenario, ordinaryDps: null, primaryDps: null, spellInclusiveDps: null, primaryCoverage: null, spellCoverage: null, incomplete: true });

export function calculateBattle({ units, profile: baseProfile, settings, buffs, jewels, config }) {
  let scenario = calculateScenario(settings, baseProfile, buffs);
  if (scenario.status !== 'supported') return unavailable(baseProfile, scenario, scenario.reason, units);
  const overmind = resolveOvermind(baseProfile, scenario, units, jewels, config);
  if (overmind.status !== 'supported') return unavailable(baseProfile, scenario, overmind.reason, units);
  const profile = applyOvermindProfile(baseProfile, overmind.selected);
  const supports = calculateSupportCoverage(profile, scenario, buffs, units);
  if (![supports.ordinaryMana, supports.godOfTimeFactor, supports.positiveDebuffFactor].every(Number.isFinite) || supports.ordinaryMana < 0) return unavailable(profile, scenario, 'Support inputs are outside the supported range.', units);
  scenario = calculateScenario(settings, profile, buffs, supports.positiveDebuffFactor);
  if (scenario.status !== 'supported') return unavailable(profile, scenario, scenario.reason, units);
  const ordinary = calculateArmyDamage(units, { profile, scenario, jewels, config, penetrationEnabled: settings.penetrationEnabled, godOfTimeFactor: supports.godOfTimeFactor });
  const entries = ordinary.entries.map(entry => ({ ...entry, details: entry.details ? { ...entry.details } : undefined }));
  const setDps = (entry, perUnitDps, count = entry.count) => {
    entry.perUnitDps = perUnitDps; entry.fullDps = perUnitDps * count; entry.status = 'supported'; entry.reason = null;
  };
  for (const entry of entries) {
    if (!entry.details) continue;
    const d = entry.details;
    if (entry.unitId === 'overmind') {
      const selected = entry.entryId === overmind.selected?.entryId;
      const value = d.hitDamage * d.attacks / d.interval * d.critical.multiplier * d.penetrationFactor;
      setDps(entry, value, selected ? 1 : 0);
      d.overmindUptime = overmind.candidates.find(c => c.entryId === entry.entryId)?.uptime ?? 0;
      d.uniqueContribution = selected;
    }
    if (entry.unitId === 'artifact') {
      const uptime = Math.min(1, 5 * supports.artifactMana * 0.90 / 90);
      const ticks = supports.exposure.artifactLife * 6 / 4.5 * supports.exposure.spawned * (supports.exposure.lateClassic ? 1.8 : 1);
      const hit = d.hitDamage * 1.07 * d.critical.multiplier;
      setDps(entry, hit * ticks / (scenario.enemy.seconds - 4) * uptime);
      d.artifact = { uptime, ticks, hit };
    }
  }
  // A separate, uncapped single-attack term avoids a cycle through final army DPS.
  const xnkEntries = entries.filter(e => e.unitId === 'xelnaga-kerrigan' && e.count > 0 && e.details);
  const chainBaseline = entries.filter(e => !chainExcluded.has(e.unitId)).reduce((sum, e) => sum + (e.fullDps ?? 0), 0)
    + xnkEntries.reduce((sum, e) => sum + e.details.hitDamage * e.details.critical.multiplier / (e.details.baseInterval * supports.godOfTimeFactor / e.details.speedMultiplier) * e.count, 0);
  const chainAttacks = 1 + Math.min(4, chainBaseline > 0 ? scenario.requiredDps * 2.5 / chainBaseline : 4);
  for (const entry of xnkEntries) {
    const input = units.find(u => u.entryId === entry.entryId);
    if (input.xnkFixedAttacks === false) {
      const d = entry.details;
      d.attacks = chainAttacks;
      setDps(entry, d.hitDamage * chainAttacks / d.interval * d.critical.multiplier * d.penetrationFactor);
    }
  }
  const army = summarizeArmyEntries(entries);
  if (army.incomplete) return { ...unavailable(profile, scenario, 'Resolve unavailable unit entries before using final totals.', units), ...army, profile, scenario, supports, overmind };
  const stats = profile.combatStats.stats;
  const critical = calculateCriticalExpectation(stats, scenario.torment.critDamageReduction).multiplier;
  const referenceOrdinary = army.ordinaryDps + 0.01;
  const excluded = entries.reduce((sum, e) => sum + (['destroyer', 'sarah-kerrigan'].includes(e.unitId) ? e.fullDps : e.unitId === 'xelnaga-kerrigan' && e.count > 0 ? e.fullDps / e.details.attacks : 0), 0);
  const eligible = critical > 0 ? (referenceOrdinary - excluded) / critical + 0.01 : 0;
  const spread = Math.min(1, scenario.requiredDps / referenceOrdinary);
  const mtChance = (20 + 0.2 * stats.multiTargetChance) / 100;
  const mtCritChance = 0.5 * stats.multiTargetMultiCrit / 100;
  const mt = eligible * stats.multiTargetDamage / 100 * mtChance * ((1 - mtCritChance) + mtCritChance * critical) * spread * (1 + 0.3 * (scenario.combinedDebuffFactor - 1));
  const hasArmy = army.totalUnits > 0;
  const multiTargetDps = hasArmy ? mt : 0;
  const primaryDps = hasArmy ? (referenceOrdinary + multiTargetDps) * 0.85 : 0;
  // FD for this spell comes only from paid specialty and the active rune.
  const spellFD = profile.sources.runes.finalStats.finalDamage + profile.sources.spUpgrades.finalStats.finalDamage;
  const thrasherEntries = units.filter(u => u.unitId === 'void-thrasher' && Number(u.count) > 0).map(unit => {
    const damagePerCast = 40000 * (0.55 + Number(unit.armor) / 100 + stats.skillDamage / 100) * (1 + (spellFD - scenario.torment.finalDamageSubtraction) / 100);
    const perUnitDps = damagePerCast * supports.artifactMana / 125;
    return { entryId: unit.entryId, damagePerCast, perUnitDps, fullDps: perUnitDps * Number(unit.count) };
  });
  const thrasherDps = Math.round(thrasherEntries.reduce((sum, e) => sum + e.fullDps, 0));
  const spellInclusiveDps = primaryDps + thrasherDps;
  if (![multiTargetDps, primaryDps, thrasherDps, spellInclusiveDps].every(v => Number.isFinite(v) && v >= 0)) return unavailable(profile, scenario, 'These stats do not produce finite nonnegative totals.', units);
  const coverage = value => scenario.requiredDps > 0 ? value / scenario.requiredDps * 100 : null;
  return { ...army, status: 'supported', profile, scenario, supports, overmind, chainBaseline, chainAttacks, referenceOrdinary, multiTargetDps, primaryDps, thrasherDps, thrasherEntries, spellInclusiveDps,
    primaryCoverage: coverage(primaryDps), spellCoverage: coverage(spellInclusiveDps), mtDetails: { eligible, spread, mtChance, mtCritChance }, purifier: { status: 'unavailable', reason: 'Replacement formula pending.' } };
}
