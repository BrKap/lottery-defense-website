import { getEnemyStats, DIFFICULTY_DATA, TORMENT_DATA, ENEMY_WAVE_METADATA } from '../../data/euna/calculator/enemyConstants';
import { q, add, sub, mul, div, ceilDiv, FIXED_POLICY } from './fixedPoint';

const unavailable = (status, reason) => ({ status, reason, requiredDps: null });
const numeric = value => typeof value === 'number' || typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
export function resolveScenario(settings = {}) {
  const toc = settings.tocMode === true, mode = toc ? 'ToC' : settings.gameMode;
  if (!['Classic', 'Eternal', 'Hyper', 'ToC'].includes(mode)) return unavailable('unsupported', 'Choose a supported game mode.');
  const round = numeric(toc ? settings.tocFloor : settings.round);
  if (!Number.isInteger(round)) return unavailable('invalid', 'Choose a valid round or floor.');
  const enemy = getEnemyStats(mode, round, { doubleTime: settings.doubleTime !== false });
  if (!enemy) return unavailable('unsupported', 'No enemy data is available for this round or floor.');
  const difficulty = toc ? { damageInflicted:2.5, attackDamageSubtraction:0, accelerationReduction:0 }
    : Object.hasOwn(DIFFICULTY_DATA, settings.difficulty) ? DIFFICULTY_DATA[settings.difficulty] : null;
  if (!difficulty) return unavailable('unsupported', 'No data is available for this difficulty.');
  const tormentKey = toc ? enemy.torment : numeric(settings.torment);
  const torment = Number.isInteger(tormentKey) && Object.hasOwn(TORMENT_DATA, tormentKey) ? TORMENT_DATA[tormentKey] : null;
  if (!torment) return unavailable('invalid', 'Choose a torment level from 0 to 20.');
  return { status:'supported', mode, enemy, difficulty:{...difficulty}, torment:{...torment},
    numericPolicy: FIXED_POLICY, dataVersion: ENEMY_WAVE_METADATA.sourceSha256,
    rollingMode: enemy.lossRule === 'periodic-creep-cap' };
}

// SC2_FIXED_4096: scalar reduction/modifier arithmetic uses the provisional
// fixed helper. Accepted ToC/torment empirical coefficients remain evidence
// inputs; they are converted at their modeled damage-factor boundary.
export function calculateScenario(settings = {}, profile = {}, buffs = {}, debuffFactor = 1) {
  const scenario = resolveScenario(settings);
  if (scenario.status !== 'supported') return scenario;
  const stats = profile.combatStats?.stats ?? profile.cappedStats ?? profile;
  const armorReductionInput = Math.min(60, numeric(stats.armorReduction ?? 0));
  const shieldReduction = numeric(stats.shieldReduction ?? 0), healthReduction = numeric(stats.healthReduction ?? 0);
  if (![armorReductionInput,shieldReduction,healthReduction,debuffFactor].every(Number.isFinite) || shieldReduction > 100 || healthReduction > 100 || shieldReduction < 0 || healthReduction < 0 || armorReductionInput < 0 || debuffFactor <= 0) return unavailable('invalid', 'Reduction or debuff inputs are outside the supported calculation range.');
  try {
    const { enemy, difficulty, torment } = scenario;
    const armorReduction = q(armorReductionInput);
    const reducedHP = mul(enemy.hp, sub(1, div(healthReduction, 100)));
    const reducedShield = mul(enemy.shield, sub(1, div(shieldReduction, 100)));
    const effectiveArmor = mul(enemy.armor, sub(1, div(armorReduction, 100)));
    const effectiveShieldArmor = mul(enemy.shieldArmor, sub(1, div(armorReduction, 100)));
    // SC2_FIXED_4096: preserve the catalog coefficient boundary (.01), rather
    // than replacing the expression with algebraically equivalent 100/(100+A).
    const baselineMitigation = div(1, add(1, mul(effectiveArmor, '0.01')));
    const shieldMitigation = div(1, add(1, mul(effectiveShieldArmor, '0.01')));
    const bypass = profile.combatStats?.bypassSuperShield === true;
    const superShieldFactor = q(difficulty.damageInflicted < 61 && buffs.superShield && !bypass ? (buffs.shieldMaster ? '0.70' : '0.55') : 1);
    const combinedDebuffFactor = mul(debuffFactor, superShieldFactor);
    const scenarioFactor = mul(mul(mul(div(difficulty.damageInflicted, 100), sub(1, div(torment.damageTakenReduction, 100))), combinedDebuffFactor), enemy.intrinsic_damage_taken_fraction);
    if (scenarioFactor <= 0) return unavailable('invalid', 'Damage factors round to zero under the selected precision policy.');
    const workPerKill = add(div(reducedHP, baselineMitigation), div(reducedShield, shieldMitigation));
    const effectiveEnemyPool = mul(workPerKill, enemy.count);
    const equivalentWorkPerKill = div(workPerKill, scenarioFactor);
    // SC2_FIXED_4096: wide analytical totals stay on the grid without Galaxy
    // overflow; threshold rates round UP. Idle time before arrivals is not banked.
    const waveAverageDps = div(mul(equivalentWorkPerKill, enemy.count), enemy.seconds);
    let deadlineRequiredDps = null;
    if (!scenario.rollingMode) {
      const batchWork = mul(equivalentWorkPerKill, enemy.creepsPerBatch * enemy.revivalMultiplier);
      deadlineRequiredDps = 0;
      for (let batch = 0; batch < enemy.batches; batch++) {
        const arrival = mul(enemy.interval, batch * enemy.waits_per_batch);
        const available = sub(enemy.seconds, arrival);
        deadlineRequiredDps = Math.max(deadlineRequiredDps, ceilDiv(mul(batchWork, enemy.batches - batch), available));
      }
    }
    const requiredDps = deadlineRequiredDps;
    return { ...scenario, reducedHP, reducedShield, effectiveArmor, effectiveShieldArmor, armorReduction, baselineMitigation, shieldMitigation, superShieldFactor, combinedDebuffFactor, scenarioFactor, effectiveEnemyPool, equivalentWorkPerKill, waveAverageDps, deadlineRequiredDps, requiredDps,
      requirementStatus: scenario.rollingMode ? 'pending-carryover' : 'ideal-deadline',
      reason: scenario.rollingMode ? 'Enemy stats are available. Cap-safe DPS requires a multi-wave carryover simulation.' : null,
      requirementAssumptions: 'Ideal constant damage service; no travel, overkill, regeneration or scheduler delay.' };
  } catch (error) {
    if (!(error instanceof RangeError || error instanceof TypeError)) throw error;
    return unavailable('invalid', error.message);
  }
}

export function calculateRelativePenetration(scenario, penetrationPercent, enabled = true) {
  if (scenario.status !== 'supported' || !Number.isFinite(scenario.baselineMitigation)) return null;
  if (!enabled) return 1;
  const p = numeric(penetrationPercent);
  if (!Number.isFinite(p) || p < 0 || p > 100) return null;
  // SC2_FIXED_4096: penetration uses the same coefficient/order as armor above.
  const unitMitigation = div(1, add(1, mul(mul(scenario.effectiveArmor, sub(1, div(p, 100))), '0.01')));
  return div(unitMitigation, scenario.baselineMitigation);
}
