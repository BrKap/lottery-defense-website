import catalog from '../../data/euna/calculator/optimizerCatalog.json';
import { getNextUpgradePrice, getIncrementalUpgradePrice, sanitizeInvestmentValue } from './spUpgradeHelpers';
import { calculateCriticalExpectation } from './criticalCalculation';
import { calculateUnitDamage } from './damageCalculation';

export const OPTIMIZER_ALGORITHMS = [{ id: 'amon-estimate', label: 'Amon estimate' }];
const same = (a, b) => Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
const labels = { AD: 'Attack Damage', AS: 'Attack Speed', CC: 'Critical Chance', CD: 'Critical Damage', MC: 'Multi Crit', FD: 'Final Damage', Accel: 'Acceleration', 'MT D': 'Multi-target Damage', 'MT C': 'Multi-target Chance', 'MT MC': 'Multi-target Crit', ETC: 'Shield Reduction' };

// Stage two is intentionally distinct from the approximate category sensitivities.
export function selectUpgradeRecommendations(categories, investments, groups, records = catalog) {
  const candidates = records.map(record => {
    const group = groups.find(g => g.id === record.groupId);
    const upgrade = group?.upgrades.find(u => u.id === record.upgradeId);
    const level = upgrade ? sanitizeInvestmentValue(upgrade, investments[record.groupId]?.[record.upgradeId] ?? 0) : 0;
    const nextPrice = upgrade ? getNextUpgradePrice(upgrade, level) : null;
    const category = categories.find(c => c.id === record.category);
    const reason = !upgrade ? 'Missing upgrade definition' : group.currency !== 'SP' ? 'EP is not comparable to SP'
      : level >= upgrade.maxInvestments ? 'Maxed' : nextPrice === null || !Number.isFinite(nextPrice) || nextPrice <= 0 ? 'Unknown or invalid price'
      : !category ? 'Effect not modeled' : category.reason ?? (!(record.weight > 0) ? 'No stat weight' : null);
    return { ...record, name: upgrade?.name ?? record.upgradeId, groupLabel: group?.label, level, currency: group?.currency,
      nextPrice, weightedPrice: !reason ? nextPrice / record.weight : null, reason, recommended: false };
  });
  const eligible = categories.filter(c => !c.reason && Number.isFinite(c.spPerPercent) && c.spPerPercent > 0 && candidates.some(u => u.category === c.id && !u.reason));
  const best = Math.min(...eligible.map(c => c.spPerPercent));
  const winningCategories = eligible.filter(c => same(c.spPerPercent, best)).map(c => c.id);
  const finalists = candidates.filter(c => !c.reason && winningCategories.includes(c.category));
  const cheapest = Math.min(...finalists.map(c => c.weightedPrice));
  for (const candidate of finalists) candidate.recommended = same(candidate.weightedPrice, cheapest);
  return { candidates, winningCategories, recommendations: candidates.filter(c => c.recommended).sort((a,b) => a.order-b.order) };
}

export function calculateUpgradeRecommendations({ algorithmId = 'amon-estimate', army, units, investments, config }) {
  const unavailable = reason => ({ status: 'unavailable', reason, algorithmId, categories: [], candidates: [], recommendations: [] });
  if (algorithmId !== 'amon-estimate') return unavailable('This optimization algorithm is not available.');
  if (army.status !== 'supported' || army.incomplete || !(army.ordinaryDps > 0)) return unavailable('Add a supported, damaging army before estimating upgrades.');
  const { profile, scenario } = army;
  const stats = profile.combatStats.stats;
  const groups = config.UPGRADE_GROUPS;
  const upgrade = (g, id) => groups.find(x => x.id === g)?.upgrades.find(x => x.id === id);
  const level = (g,id) => sanitizeInvestmentValue(upgrade(g,id), investments[g]?.[id] ?? 0);
  const route = (g,id,step) => {
    const u = upgrade(g,id), n = level(g,id);
    return { groupId:g, upgradeId:id, step, price: n + step <= u.maxInvestments ? getIncrementalUpgradePrice(u,n,step) : null,
      description: `${groups.find(x => x.id === g).label}: ${u.name} +${step} levels` };
  };
  const amonLevel = Number(units.find(u => u.unitId === 'amon' && u.count > 0)?.level ?? 0);
  const representative = calculateUnitDamage({ entryId:'optimizer-amon', unitId:'amon', count:1, rank:'X', level:amonLevel, armor:500, lb:0, jewel:'none' }, { profile, scenario, jewels:[], config, penetrationEnabled:false });
  if (!representative.details) return unavailable('Representative Amon calculation is unavailable.');
  const baseCrit = calculateCriticalExpectation(stats, scenario.torment.critDamageReduction).multiplier;
  const spread = army.mtDetails.spread;
  const partialDebuff = 1 + 0.3 * (scenario.combinedDebuffFactor - 1);
  const mtD = level('the-one-ii','mt-dmg') + 0.01;
  const mtC = 20 + level('the-one-ii','mt-chance') * 0.2;
  const mtMC = level('the-one-ii','mt-multi-crit') * 0.5;
  const mt = (normal, crit, damage = mtD, chance = mtC, multi = mtMC) => normal * damage/100 * chance/100 * (1-multi/100 + multi/100*crit) * spread * partialDebuff;
  // Include every active unit entry, including the later four unit types.
  const uncappedDps = army.entries.filter(e => e.count > 0 && e.details?.interval !== 0.0625).reduce((sum,e) => sum + e.fullDps,0);
  const speedFraction = Math.max(0, Math.min(1,(uncappedDps+1)/(army.referenceOrdinary+1)));
  const damageBase = representative.details.gradedBase;
  const evaluate = (changes = {}) => {
    const altered = { ...stats, ...changes };
    const ad = 40 + amonLevel*5 + 500 + altered.attackDamage + 15.5 - scenario.difficulty.attackDamageSubtraction;
    const hit = (1+ad/100)*(1+(altered.finalDamage-scenario.torment.finalDamageSubtraction)/100);
    const speed = (1+altered.attackSpeed/100)*altered.acceleration*(1-scenario.difficulty.accelerationReduction/100)*(1-scenario.torment.attackSpeedReduction/100)*1.1505;
    const expectation = calculateCriticalExpectation(altered,scenario.torment.critDamageReduction);
    // The high-CC proxy needs the +1 MC sensitivity even at the paid MC cap.
    // It is an estimate-only perturbation; the real combat cap remains 45.
    const crit = expectation.multiplier + Math.max(0, altered.multiCrit-45) * expectation.pMultiCrit * expectation.pCrit * expectation.reducedCD * 0.667 / 100;
    const normal = damageBase*hit*2*speed/0.31;
    return { normal, crit, dps:normal*crit + mt(normal,crit) };
  };
  const baseline = evaluate();
  if (!(baseline.dps > 0) || !Number.isFinite(baseline.dps)) return unavailable('The representative baseline is nonpositive or nonfinite.');
  const accelerationRoute = level('the-one','accel') === 150 ? route('infinite','accel-inf-',14) : route('the-one','accel',4);
  const accelerationRatio = accelerationRoute.groupId === 'the-one' ? 1.002424**4 : (1+(level('infinite','accel-inf-')+14)*0.000732)/(1+level('infinite','accel-inf-')*0.000732);
  const changes = { AD:{attackDamage:stats.attackDamage+10}, AS:{attackSpeed:stats.attackSpeed+5}, CC:{critChance:stats.critChance+5}, CD:{critDamage:stats.critDamage+15}, MC:{multiCrit:stats.multiCrit+1}, FD:{finalDamage:stats.finalDamage+1}, Accel:{acceleration:stats.acceleration*accelerationRatio} };
  const gains = Object.fromEntries(Object.entries(changes).map(([id, delta]) => [id,(evaluate(delta).dps + (id==='CC' ? 10 : 0))/baseline.dps-1]));
  gains.AS *= speedFraction; gains.Accel *= speedFraction;
  if (stats.critChance >= 300) gains.CC = gains.MC;
  const ccStep = stats.critChance+5 > 300 ? stats.critChance+5 >= 305 ? 40 : (300-stats.critChance)*2 : 10;
  const mcRoutes = [route('expert','multi-crit-i',1),route('the-one-ii','multi-crit-ii',1)].filter(r => r.price !== null).sort((a,b)=>a.price-b.price);
  const routes = {
    AD:level('professional','atk-dmg-iii') <= 140 ? route('professional','atk-dmg-iii',10) : level('the-one','atk-dmg-iv') < 200 ? route('the-one','atk-dmg-iv',10) : route('infinite','atk-dmg-inf-',25),
    AS:level('professional','atk-spd-iii') <= 140 ? route('professional','atk-spd-iii',10) : level('the-one','atk-spd-iv') < 200 ? route('the-one','atk-spd-iv',10) : route('infinite','atk-spd-inf-',25),
    CC:level('expert','crit-chance-ii') <= 140 ? route('expert','crit-chance-ii',10) : route('the-one','crit-chance-iii',ccStep),
    CD:level('expert','crit-dmg-i') <= 119 ? route('expert','crit-dmg-i',6) : level('the-one-ii','crit-dmg-ii') < 200 ? route('the-one-ii','crit-dmg-ii',10) : route('infinite','crit-dmg-inf-',30),
    MC:mcRoutes[0], FD:route('the-one','final-dmg',4), Accel:accelerationRoute,
    'MT D':route('the-one-ii','mt-dmg',10),'MT C':route('the-one-ii','mt-chance',10),'MT MC':route('the-one-ii','mt-multi-crit',10),ETC:route('infinite','reduce-shield',5),
  };
  // MT category perturbations use the actual army's eligible base, unlike the seven Amon sensitivities.
  const armyBase = army.referenceOrdinary + army.multiTargetDps;
  gains['MT D'] = (army.referenceOrdinary + mt(army.mtDetails.eligible,baseCrit,mtD+10))/armyBase-1;
  gains['MT C'] = (army.referenceOrdinary + mt(army.mtDetails.eligible,baseCrit,mtD,mtC+2))/armyBase-1;
  gains['MT MC'] = (army.referenceOrdinary + mt(army.mtDetails.eligible,baseCrit,mtD,mtC,mtMC+5))/armyBase-1;
  const shieldSaving = scenario.enemy.shield * 0.0025 / scenario.shieldMitigation * scenario.enemy.count / scenario.scenarioFactor / scenario.enemy.seconds;
  const shieldDifficulty = scenario.difficulty.damageInflicted < 99 ? 1-(100-scenario.difficulty.damageInflicted)/150 : 1;
  gains.ETC = shieldSaving/army.primaryDps;
  const steps = { AD:'+10 AD', AS:'+5 AS', CC:stats.critChance>=300 ? '+1 MC proxy (high CC)' : '+5 CC', CD:'+15 CD', MC:'+1 MC', FD:'+1 FD', Accel:`×${accelerationRatio.toFixed(6)} acceleration`, 'MT D':'+10 damage points', 'MT C':'+2 chance points', 'MT MC':'+5 crit points', ETC:'−0.25 shield percentage points' };
  const categories = Object.keys(labels).map(id => {
    const purchase = routes[id], gain = gains[id];
    const reason = !purchase || purchase.price === null ? 'Modeled purchase step exceeds cap or has no known price'
      : id === 'MC' && stats.multiCrit >= 45 ? 'Multi Crit cap reached'
      : id === 'ETC' && scenario.requiredDps/army.referenceOrdinary > 4 ? 'Requirement exceeds four times unit DPS'
      : id === 'ETC' && stats.shieldReduction + 0.25 > 100 ? 'Shield reduction limit reached'
      : !Number.isFinite(gain) || gain <= 0 ? 'No positive modeled gain' : null;
    const spPerPercent = reason ? null : purchase.price/gain/100*(id==='ETC' ? 0.85*shieldDifficulty : 1);
    return { id,label:labels[id],gain,modeledStep:steps[id],purchase,spPerPercent,reason };
  });
  const selection = selectUpgradeRecommendations(categories,investments,groups);
  return { status:'supported', algorithmId, categories, ...selection, baseline, speedFraction, amonLevel,
    reason:selection.recommendations.length ? null : 'No eligible SP recommendation for this model.' };
}
