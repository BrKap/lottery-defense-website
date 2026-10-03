import test from 'node:test';
import assert from 'node:assert/strict';
import { fromDecimal, toNumber, fixedMultiply, fixedDivide, fixedClamp, fixedToInteger, q, mul, FIXED_STEP } from '../src/core/calculator/fixedPoint.js';
import { CLASSIC_ENEMIES, ETERNAL_ENEMIES, HYPER_ENEMIES, TOC_ENEMIES, ENEMY_WAVES, ENEMY_WAVE_METADATA, getEnemyStats } from '../src/data/euna/calculator/enemyConstants.js';
import { LEGACY_CLASSIC_ENEMIES } from './fixtures/legacy-enemies.mjs';
import { calculateCriticalExpectation } from '../src/core/calculator/criticalCalculation.js';

test('fixed precision matches the Python model, including intermediates and signs', () => {
  assert.equal(FIXED_STEP, 0.000244140625);
  assert.equal(fromDecimal('0.7'), 2867n);
  assert.equal(fromDecimal('-0.7'), -2867n);
  assert.equal(q('0.00001'), 0);
  assert.equal(fromDecimal('1e-5'), 0n);
  assert.equal(fromDecimal('1.1', 'nearest-half-away'), 4506n);
  assert.equal(fromDecimal('-0.0001220703125', 'nearest-half-away'), -1n);
  assert.equal(mul(mul('0.7', '0.275'), 100), 19.23828125);
  assert.equal(mul(1540, '1.1'), 1693.7744140625);
  assert.equal(mul(mul('17.6', '0.7'), '0.275'), 3.386474609375);
  assert.equal(fixedDivide(fromDecimal(1), fromDecimal(3), 'ceil'), 1366n);
  assert.equal(fixedToInteger(fromDecimal('-2.9')), -2n);
  assert.equal(toNumber(fixedClamp(fromDecimal(-1), 0n, fromDecimal(1))), 0);
  assert.equal(toNumber(fixedMultiply(fromDecimal(50000), fromDecimal(480))), 24000000);
  for (const units of [878866435229n, 878866435230n, -878866435229n, 9007199254740991n])
    assert.equal(fromDecimal(toNumber(units)), units, 'Grid-to-number-to-grid must preserve every unit.');
  for (const value of [NaN, Infinity, '', 'bad', null]) assert.throws(() => fromDecimal(value));
  assert.throws(() => fixedDivide(1n, 0n));
  assert.throws(() => toNumber(10n ** 30n));
});

test('live wave tables contain the fixed extraction, not decimal or old observed data', () => {
  assert.equal(ENEMY_WAVE_METADATA.numericPolicy.model, 'fixed_4096');
  assert.equal(ENEMY_WAVE_METADATA.numericPolicy.rounding, 'truncate-toward-zero');
  assert.equal(ENEMY_WAVE_METADATA.hyperBasis, 'Eternal');
  assert.equal(Object.keys(CLASSIC_ENEMIES).length, 300);
  assert.equal(Object.keys(ETERNAL_ENEMIES).length, 300);
  assert.equal(Object.keys(HYPER_ENEMIES).length, 115);
  assert.equal(Object.keys(TOC_ENEMIES).length, 90);
  let count = 0;
  for (const table of Object.values(ENEMY_WAVES)) for (const row of Object.values(table)) {
    count++;
    for (const value of Object.values(row)) if (typeof value === 'number') assert(Number.isInteger(value * 4096));
  }
  assert.equal(count, 990);
  assert.equal(CLASSIC_ENEMIES[269].armor, 1693.7744140625);
  assert.equal(CLASSIC_ENEMIES[269].seconds, 79.3876953125);
  assert.notEqual(CLASSIC_ENEMIES[269].armor, LEGACY_CLASSIC_ENEMIES[269].armor);
  assert.equal(CLASSIC_ENEMIES[115].shield, 0);
  assert.equal(CLASSIC_ENEMIES[220].count, 308);
  assert.equal(TOC_ENEMIES[85].spawnedCount, 870);
});

test('mode modifiers select components and retain integer caps/counts', () => {
  for (let round = 1; round <= 115; round++) {
    const eternal = getEnemyStats('Eternal', round), hyper = getEnemyStats('Hyper', round);
    assert.equal(hyper.spawnedCount, eternal.spawnedCount);
    assert.equal(hyper.interval, eternal.interval);
    assert(hyper.postSpawnSeconds < eternal.postSpawnSeconds);
    assert.equal(hyper.hp, CLASSIC_ENEMIES[round].hp);
  }
  assert.equal(getEnemyStats('Classic', 270, { doubleTime: false }).seconds, 113.4326171875);
  assert.equal(getEnemyStats('ToC', 70, { doubleTime: false }).seconds, 59.91357421875);
  assert.equal(getEnemyStats('Classic', 200).spawnedCount, 120);
  assert.equal(getEnemyStats('Classic', 200).count, 240);
  assert.equal(getEnemyStats('Eternal', 50).creepCap, 32);
  assert.equal(getEnemyStats('Eternal', 200).creepCap, 39);
  assert.equal(getEnemyStats('Eternal', 219).creepCap, 20);
  assert.equal(getEnemyStats('Hyper', 116), null);
  assert.equal(getEnemyStats('ToC', 91), null);
});

test('critical scalar reductions use fixed precision while expectations retain empirical weights', () => {
  const result=calculateCriticalExpectation({critChance:150,multiCrit:3,critDamage:100},99);
  assert.equal(result.reducedCD,2.001953125);
  assert.equal(result.pMultiCrit,0.5);
  assert.equal(result.averageMC,1.5);
  assert.equal(result.multiplier,1+result.reducedCD/100+result.reducedCD*0.667*1.5/100);
});
