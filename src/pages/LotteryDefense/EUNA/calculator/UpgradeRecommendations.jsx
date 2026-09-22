import React from 'react';
import { OPTIMIZER_ALGORITHMS } from '../../../../core/calculator/upgradeOptimizer';
import { formatCombatNumber as number } from '../../../../core/calculator/calculatorHelpers';
const gainPercent = gain => !Number.isFinite(gain) ? 'Unavailable' : gain > 0 && gain*100 < 0.01 ? '<0.01' : number(gain*100);

export default function UpgradeRecommendations({ result, settings, setSettings, onShowGroup }) {
  if (!result) return null;
  return <section className="upgrade-recommendations" aria-label="Upgrade recommendations">
    <h4>Upgrade recommendations</h4>
    <label>Optimization algorithm <select value={settings.algorithmId} onChange={event => setSettings({ algorithmId:event.target.value })}>
      {!OPTIMIZER_ALGORITHMS.some(a => a.id === settings.algorithmId) && <option value={settings.algorithmId}>Unavailable algorithm</option>}
      {OPTIMIZER_ALGORITHMS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
    </select></label>
    <p>Estimates a stat category, then chooses its cheapest next SP upgrade per stat point. This does not spend SP or optimize a complete build or budget. EP and unknown prices are excluded.</p>
    {result.reason && <p role="status">{result.reason}</p>}
    {result.recommendations.map(candidate => <p key={`${candidate.groupId}:${candidate.upgradeId}`}>
      <strong>{candidate.groupLabel}: {candidate.name}</strong> — next level {candidate.level+1}, {number(candidate.nextPrice)} SP. <button type="button" onClick={() => onShowGroup(candidate.groupId)}>Show {candidate.name}</button>
    </p>)}
    {result.status === 'supported' && <details><summary>Estimate details and exclusions</summary>
      <p>Representative Amon: rank X, level {result.amonLevel}, 500 armor AD, no limit break or jewel, fixed 0.31 interval factor. Uses the first active Amon entry's level, or zero when absent. Speed-sensitive fraction: {number(result.speedFraction*100)}%.</p>
      <p>Purchase steps and stat weights are approximate. Near a cap, an unavailable full purchase step excludes that category. Critical Chance retains a +10 DPS adjustment below 300 CC and uses a Multi Crit proxy at 300+. Shield reduction estimates requirement savings. These gains describe the modeled steps, not the single recommended purchase.</p>
      <div className="sp-upgrade-table-wrapper"><table className="sp-upgrade-table"><thead><tr><th>Category</th><th>Modeled step</th><th>Gain %</th><th>Purchase route</th><th>SP per 1% gain</th></tr></thead><tbody>
        {result.categories.map(c => <tr key={c.id}><td>{c.label}</td><td>{c.modeledStep}</td><td>{gainPercent(c.gain)}</td><td>{c.purchase?.description ?? 'Unavailable'}{c.purchase?.price != null && ` (${number(c.purchase.price)} SP)`}</td><td>{c.reason ?? number(c.spPerPercent)}</td></tr>)}
      </tbody></table></div>
      <ul>{result.candidates.filter(c=>c.reason).map(c=><li key={`${c.groupId}:${c.upgradeId}`}>{c.groupLabel}: {c.name} — {c.reason}</li>)}</ul>
    </details>}
  </section>;
}
