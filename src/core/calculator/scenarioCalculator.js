import { CLASSIC_ENEMIES, TOC_ENEMIES, DIFFICULTY_DATA, TORMENT_DATA } from '../../data/euna/calculator/enemyConstants';

const unavailable = (status, reason) => ({ status, reason, requiredDps: null });
const numeric = value => typeof value === 'number' || typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
export function resolveScenario(settings = {}) {
  const toc = settings.tocMode === true;
  if (!toc && settings.gameMode !== 'Classic') return unavailable('unsupported', 'Required DPS is unavailable for this mode.');
  const round = numeric(toc ? settings.tocFloor : settings.round);
  if (!Number.isInteger(round)) return unavailable('invalid', 'Choose a valid round or floor.');
  const table = toc ? TOC_ENEMIES : CLASSIC_ENEMIES;
  const enemy = Object.hasOwn(table, round) ? table[round] : null;
  if (!enemy) return unavailable('unsupported', 'No enemy data is available for this round or floor.');
  const difficulty = toc ? { damageInflicted:2.5, attackDamageSubtraction:0, accelerationReduction:0 }
    : Object.hasOwn(DIFFICULTY_DATA, settings.difficulty) ? DIFFICULTY_DATA[settings.difficulty] : null;
  if (!difficulty) return unavailable('unsupported', 'No data is available for this difficulty.');
  const tormentKey = toc ? enemy.torment : numeric(settings.torment);
  const torment = Number.isInteger(tormentKey) && Object.hasOwn(TORMENT_DATA, tormentKey) ? TORMENT_DATA[tormentKey] : null;
  if (!torment) return unavailable('invalid', 'Choose a torment level from 0 to 20.');
  return { status:'supported', mode:toc ? 'ToC' : 'Classic', enemy:{...enemy}, difficulty:{...difficulty}, torment:{...torment} };
}

// Preserve operation order and empirical coefficients; do not quantize globally.
export function calculateScenario(settings = {}, profile = {}, buffs = {}, debuffFactor = 1) {
  const scenario = resolveScenario(settings);
  if (scenario.status !== 'supported') return scenario;
  const stats = profile.combatStats?.stats ?? profile.cappedStats ?? profile;
  const armorReduction = Math.min(60, numeric(stats.armorReduction ?? 0));
  const shieldReduction = numeric(stats.shieldReduction ?? 0), healthReduction = numeric(stats.healthReduction ?? 0);
  if (![armorReduction,shieldReduction,healthReduction,debuffFactor].every(Number.isFinite) || shieldReduction > 100 || healthReduction > 100 || debuffFactor <= 0) return unavailable('invalid', 'Reduction or debuff inputs are outside the supported calculation range.');
  const { enemy, difficulty, torment } = scenario;
  const reducedHP = enemy.hp * (1-healthReduction/100);
  const reducedShield = enemy.shield * (1-shieldReduction/100);
  const effectiveArmor = enemy.armor * (1-armorReduction/100);
  const effectiveShieldArmor = enemy.shieldArmor * (1-armorReduction/100);
  const baselineMitigation = 100/(100+effectiveArmor);
  const shieldMitigation = 100/(100+effectiveShieldArmor);
  const bypass = profile.combatStats?.bypassSuperShield === true;
  const superShieldFactor = difficulty.damageInflicted < 61 && buffs.superShield && !bypass ? (buffs.shieldMaster ? 0.70 : 0.55) : 1;
  const combinedDebuffFactor = debuffFactor * superShieldFactor;
  const scenarioFactor = difficulty.damageInflicted/100 * (1-torment.damageTakenReduction/100) * combinedDebuffFactor;
  const effectiveEnemyPool = (reducedHP/baselineMitigation + reducedShield/shieldMitigation) * enemy.count;
  const requiredDps = effectiveEnemyPool/scenarioFactor/enemy.seconds;
  if (!Number.isFinite(requiredDps) || requiredDps < 0) return unavailable('invalid', 'These inputs do not produce a finite damage requirement.');
  return { ...scenario, reducedHP, reducedShield, effectiveArmor, effectiveShieldArmor, armorReduction, baselineMitigation, shieldMitigation, superShieldFactor, combinedDebuffFactor, scenarioFactor, effectiveEnemyPool, requiredDps };
}

export function calculateRelativePenetration(scenario, penetrationPercent, enabled = true) {
  if (scenario.status !== 'supported' || !Number.isFinite(scenario.baselineMitigation)) return null;
  if (!enabled) return 1;
  const p = numeric(penetrationPercent);
  if (!Number.isFinite(p) || p < 0 || p > 100) return null;
  const unitMitigation = 100/(100+scenario.effectiveArmor*(1-p/100));
  return unitMitigation/scenario.baselineMitigation;
}
