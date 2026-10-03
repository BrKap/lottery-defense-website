import waveData from './enemyWaves.js';
// SC2_FIXED_4096: fail closed if generated precision provenance is replaced.
if (waveData.metadata.numericPolicy.model !== 'fixed_4096'
    || waveData.metadata.numericPolicy.rounding !== 'truncate-toward-zero')
  throw new Error('Enemy waves must come from the 1/4096 fixed-point extraction.');
const difficultyNames = ['Practice','Very Easy','Easy','Normal','Hard','Very Hard','Hell','Inferno','Lunatic','Holic','Epic','Ultimate','Impossible','The Final','Hall of Fame'];
const inflicted = [140,130,115,100,85,70,60,50,40,35,30,25,20,15,5];
const ad = [0,0,0,0,0,0,0,0,10,15,20,20,30,50,100];
const acceleration = [0,0,0,0,0,0,0,0,0,0,5,10,20,30,50];
export const DIFFICULTY_DATA = Object.fromEntries(difficultyNames.map((name,i) => [name,{ damageInflicted: inflicted[i], attackDamageSubtraction: ad[i], accelerationReduction: acceleration[i] }]));
const fd = [0,10,20,30,40,50,60,70,80,90,92,94,96,97,97,97,97,97,97,97,97];
const cd = [0,10,20,30,40,50,60,65,70,75,80,83,86,89,92,95,98,99,99,99,99];
export const TORMENT_DATA = Object.fromEntries(fd.map((value,i) => [i,{ key:i, label:i < 17 ? String(i) : ['M','LeS','LeSS','LeSSS'][i-17], finalDamageSubtraction:value, critDamageReduction:cd[i], damageTakenReduction:i === 18 ? 50 : i === 19 ? 75 : i === 20 ? 89.1 : 0, attackSpeedReduction:i === 19 ? 33 : i === 20 ? 66 : 0 }]));
// SC2_FIXED_4096: imported grid values; no interpolation or display rounding.
export const ENEMY_WAVE_METADATA = waveData.metadata;
export const ENEMY_WAVES = Object.fromEntries(Object.entries(waveData.tables).map(([mode, rows]) => [mode,
  Object.fromEntries(rows.map(values => {
    const row = Object.fromEntries(waveData.fields.map((field, i) => [field, values[i]]));
    if (values.some(value => typeof value === 'number' && (!Number.isFinite(value) || !Number.isInteger(value * 4096))))
      throw new Error(`Enemy wave ${mode}/${row.wave} contains a value outside the 1/4096 grid.`);
    return [row.wave, Object.freeze(row)];
  }))]));
export function getEnemyStats(mode, round, { doubleTime = true } = {}) {
  const row = Number.isInteger(round) && Object.hasOwn(ENEMY_WAVES, mode)
    && Object.hasOwn(ENEMY_WAVES[mode], round) ? ENEMY_WAVES[mode][round] : null;
  if (!row || mode === 'Hyper' && round > 115) return null;
  const dt = mode === 'ToC' || doubleTime;
  const rolling = mode === 'Eternal' || mode === 'Hyper';
  return { ...row, round, hp: row.hp, shield: row.shield, armor: row.armor,
    shieldArmor: row.shield_armor, count: row.full_clear_kills_per_lane,
    spawnedCount: row.spawned_creeps_per_lane, batches: row.spawn_batches,
    creepsPerBatch: row.base_creeps_per_batch, revivalMultiplier: row.revival_multiplier,
    interval: row[dt ? 'dt_interval_game_seconds' : 'base_interval_game_seconds'],
    spawnSeconds: row[dt ? 'dt_spawn_phase_game_seconds' : 'base_spawn_phase_game_seconds'],
    postSpawnSeconds: row[dt ? 'dt_post_spawn_game_seconds' : 'base_post_spawn_game_seconds'],
    seconds: row[dt ? 'dt_nominal_combat_game_seconds' : 'base_nominal_combat_game_seconds'],
    torment: row.toc_torment_after_round_start_update ?? 0, doubleTime: dt,
    creepCap: row.creep_penalty_threshold_per_lane, capCheckSeconds: row.creep_penalty_check_interval_game_seconds,
    lossRule: rolling ? 'periodic-creep-cap' : 'deadline-cleanup',
    dataConfidence: row.reachability === 'termination_boundary_unverified' ? 'end-boundary-unverified' : 'source-model',
  };
}
const tableFor = mode => Object.fromEntries(Object.keys(ENEMY_WAVES[mode])
  .filter(round => mode !== 'Hyper' || Number(round) <= 115).map(round => [round, getEnemyStats(mode, Number(round))]));
export const CLASSIC_ENEMIES = tableFor('Classic');
export const ETERNAL_ENEMIES = tableFor('Eternal');
export const HYPER_ENEMIES = tableFor('Hyper');
export const TOC_ENEMIES = tableFor('ToC');
