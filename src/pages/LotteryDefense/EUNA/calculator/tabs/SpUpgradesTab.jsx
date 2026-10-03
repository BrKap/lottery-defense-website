import React, { useMemo } from 'react';
import UpgradeRecommendations from '../UpgradeRecommendations';
import { formatCombatNumber } from '../../../../../core/calculator/calculatorHelpers';
import { OPTIMIZATION_STRATEGIES } from '../../../../../core/calculator/automaticUpgradeOptimizer';
import { useCalculatorConfig } from '../../../../../core/calculator/CalculatorConfigContext';
import {
  calculateUpgradeTotals,
  getNextUpgradePrice,
  getTotalUpgradePrice,
} from '../../../../../core/calculator/spUpgradeHelpers';

const showNumber = value => Number.isFinite(value) ? formatCombatNumber(value) : 'Unavailable';

function AutomaticOptimizer({ settings, setSettings, optimization, onOptimize, onPreview, onCancel, onUndo, onReset, blocked }) {
  const result = optimization.result;
  const next = result?.nextUpgrade;
  return <section className="automatic-optimizer" aria-label="Automatic upgrade optimizer">
    <h4>Automatic upgrades</h4>
    <p>Manual levels are required base upgrades. The optimizer adds combat upgrades using Starting SP, SP Bank payouts and EP from XP. XP is not spent. Utility and economy upgrades remain manual.</p>
    <div className="automatic-optimizer-controls">
      <label>Strategy <select value={settings.strategyId ?? 'full-greedy'} disabled={optimization.status === 'running'} onChange={event => setSettings(current => ({ ...current, strategyId: event.target.value }))}>
        {settings.strategyId && !OPTIMIZATION_STRATEGIES.some(strategy => strategy.id === settings.strategyId) && <option value={settings.strategyId}>Unavailable strategy</option>}
        {OPTIMIZATION_STRATEGIES.map(strategy => <option key={strategy.id} value={strategy.id}>{strategy.label}</option>)}
      </select></label>
      <label>Build model <select value={settings.objectiveMode ?? 'build'} disabled={optimization.status === 'running'} onChange={event => setSettings(current => ({ ...current, objectiveMode: event.target.value }))}>
        <option value="build">Entered build and jewels</option>
        <option value="general">General Amon reference</option>
      </select></label>
      <button type="button" onClick={onOptimize} disabled={blocked || optimization.status === 'running'}>Optimize upgrades</button>
      <button type="button" onClick={onPreview} disabled={blocked || optimization.status === 'running'}>Find next upgrade</button>
      {optimization.status === 'running' && <button type="button" onClick={onCancel}>Cancel</button>}
      {optimization.status === 'complete' && <button type="button" onClick={onUndo} disabled={optimization.stale}>Undo optimization</button>}
      <button type="button" onClick={onReset} disabled={blocked || optimization.status === 'running'}>Reset to base</button>
    </div>
    {optimization.status === 'running' && <div role="status" className="automatic-optimizer-progress">
      <progress aria-label="Optimization progress" max={optimization.progress?.maxEvaluations ?? 1} value={optimization.progress?.evaluations} />
      <span>Optimizing… {optimization.progress?.phase ?? ''}{optimization.progress?.wave != null && `, wave ${optimization.progress.wave}`} {Number.isFinite(optimization.progress?.evaluations) && `(${showNumber(optimization.progress.evaluations)} evaluations)`}</span>
    </div>}
    {optimization.status === 'cancelled' && <p role="status">Optimization cancelled. Upgrades were not changed.</p>}
    {['error', 'unavailable'].includes(optimization.status) && <p role="alert">{optimization.reason}</p>}
    {optimization.stale && <p role="status">Inputs changed since this result. Run the optimizer again for an up-to-date plan.</p>}
    {['complete', 'preview'].includes(optimization.status) && result && <>
      <p role="status">{optimization.status === 'complete' ? 'Optimization applied.' : 'Upgrade plan previewed; investments were not changed.'} {result.objectiveMode === 'general' ? 'Estimated reference coverage' : 'Build coverage'} at wave {result.scoredThroughWave}: {showNumber(result.baseScore?.coverage)}% → {showNumber(result.finalScore?.coverage)}%. SP spent: {showNumber(result.totals?.totalSpOverall)}; EP spent: {showNumber(result.totals?.totalEpOverall)}.{result.bounded && ' Search limit reached; this is the best feasible plan found.'}</p>
      {result.selectedWave !== result.scoredThroughWave && <p>Wave {result.selectedWave} has no enemy data. Upgrades were scored and scheduled through wave {result.scoredThroughWave}. Bank payouts after that checkpoint are counted in the selected-wave budget but cannot fund a scheduled purchase yet.</p>}
      {next && <p>Best next upgrade from your base: <strong>{next.groupLabel ?? next.groupId}: {next.name ?? next.upgradeId}</strong>{next.price != null && ` (${showNumber(next.price)} ${next.currency})`}{next.wave != null && ` at wave ${next.wave}`}.</p>}
      <details><summary>Upgrade schedule and details</summary>
        <p>Purchases are planned at supported waves through the selected wave, using each wave's enemy data. SP Bank pays every 10 waves; payouts from waves without enemy data accumulate until the next supported checkpoint.</p>
        {result.gpEarlyInfiniteHeuristic && <p>With GP estimates enabled, early Infinite upgrades received a heuristic priority. The GP estimate does not change paid upgrade prices.</p>}
        {(result.schedule ?? []).length ? <ol className="automatic-optimizer-schedule">{result.schedule.map((checkpoint, index) => <li key={`${checkpoint.wave}-${index}`}>
          <strong>Wave {checkpoint.wave}</strong> — coverage {showNumber(checkpoint.projectedCoverage)}%; available {showNumber(checkpoint.availableSp)} SP / {showNumber(checkpoint.availableEp)} EP; spent {showNumber(checkpoint.spentSp)} SP / {showNumber(checkpoint.spentEp)} EP.
          <ul>{checkpoint.purchases.map((purchase, purchaseIndex) => <li key={`${purchase.groupId}:${purchase.upgradeId}:${purchase.toLevel}:${purchaseIndex}`}>{purchase.name ?? purchase.upgradeId} {purchase.fromLevel} → {purchase.toLevel} ({showNumber(purchase.price)} {purchase.currency})</li>)}</ul>
        </li>)}</ol> : <p>No additional affordable combat levels improved coverage.</p>}
        {(result.skippedRecommendations ?? []).length > 0 && <p>{result.skippedRecommendations.length} Amon recommendations were skipped because the full battle calculation found no coverage gain.</p>}
        <p>{showNumber(result.evaluations)} combat evaluations.</p>
      </details>
    </>}
  </section>;
}

export default function SpUpgradesTab({
  activeGroupId,
  setActiveGroupId,
  investments,
  baseInvestments,
  onManualInvestment,
  resources,
  resourceSettings,
  setResourceSettings,
  recommendations,
  optimizerSettings,
  setOptimizerSettings,
  optimization,
  onOptimize,
  onPreviewOptimization,
  onCancelOptimization,
  onUndoOptimization,
  onResetOptimization,
  blocked,
}) {
  const { calculator } = useCalculatorConfig();
  const { UPGRADE_GROUPS } = calculator;
  const activeGroup =
    UPGRADE_GROUPS.find((group) => group.id === activeGroupId) ?? UPGRADE_GROUPS[0];

  const totals = useMemo(() => {
    return calculateUpgradeTotals(investments, UPGRADE_GROUPS);
  }, [investments, UPGRADE_GROUPS]);

  function updateInvestment(groupId, upgradeId, nextValue) {
    onManualInvestment(groupId, upgradeId, nextValue);
  }

  if (!activeGroup) {
    return (
      <section className="card tab-panel-card">
        <h3>SP Upgrade Pages</h3>
        <p>No upgrade groups found.</p>
      </section>
    );
  }

  const activeGroupTotal = totals.groupTotals[activeGroup.id] ?? 0;
  const isEpGroup = activeGroup.currency === 'EP';

  return (
    <section className="card tab-panel-card sp-upgrades-layout">
      <aside className="sp-upgrade-sidebar">
        {UPGRADE_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`sp-upgrade-side-tab ${
              group.id === activeGroup.id ? 'is-active' : ''
            }`}
            onClick={() => setActiveGroupId(group.id)}
          >
            {group.label}
          </button>
        ))}
      </aside>

      <div className="sp-upgrade-content">
        <div className="section-heading-row sp-upgrade-header">
          <div>
            <h3>{activeGroup.label} Upgrades</h3>
            <p>Track invested levels, costs and remaining resources.</p>
          </div>

          <div className="sp-upgrade-totals">
            <div className="stat-chip">
              <span className="stat-chip-label">
                Total {activeGroup.currency} invested in this tab
              </span>
              <strong>{activeGroupTotal}</strong>
            </div>

            <div className="stat-chip">
              <span className="stat-chip-label">Total SP invested overall</span>
              <strong>{totals.totalSpOverall}</strong>
            </div>

            <div className="stat-chip">
              <span className="stat-chip-label">Total EP invested overall</span>
              <strong>{totals.totalEpOverall}</strong>
            </div>
          </div>
        </div>

        <UpgradeRecommendations result={recommendations} settings={optimizerSettings} setSettings={setOptimizerSettings} onShowGroup={setActiveGroupId} />
        <AutomaticOptimizer settings={optimizerSettings} setSettings={setOptimizerSettings} optimization={optimization}
          onOptimize={onOptimize} onPreview={onPreviewOptimization} onCancel={onCancelOptimization} onUndo={onUndoOptimization} onReset={onResetOptimization} blocked={blocked} />
        {resources && <section aria-label="Resource budget">
          <h4>Resource budget</h4>
          {Object.entries({ gpEstimatesEnabled: 'Apply GP stat estimates' }).map(([key, label]) => <label key={key} style={{ display: 'block' }}>
            <input type="checkbox" checked={resourceSettings[key]} onChange={event => setResourceSettings(current => ({ ...current, [key]: event.target.checked }))} /> {label}
          </label>)}
          <p>GP estimates add a separate approximate contribution with a 25% margin. Paid Infinite levels always count against SP.</p>
          <p>SP Bank pays 1,000 SP per invested level at every multiple of 10 rounds, including the target round when applicable.{resources.bankPayouts !== null && ` ${resources.bankPayouts} payouts at this target.`}</p>
          <dl>
            {Object.entries({ 'Starting SP': resources.startingSp, 'Starting EP': resources.startingEp,
              'EP earned from XP': resources.earnedEp, 'Available EP': resources.availableEp,
              'Paid SP expense (all groups)': resources.spentSp, 'Available SP at target': resources.availableSp,
              'Remaining SP at target (all groups)': resources.remainingSp,
              'EP expense': resources.spentEp, 'Remaining EP': resources.remainingEp,
              'SP Bank return': resources.bankReturn, 'Bank return minus purchase cost': resources.bankNet,
              'XP equivalent of EP expense': resources.epXpEstimate,
            }).map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value === null ? 'Unavailable' : formatCombatNumber(value)}</dd></React.Fragment>)}
          </dl>
          {resources.unknownCostUpgrades.length > 0 && <p role="status">Affordability is unavailable because selected investments have unknown prices: {resources.unknownCostUpgrades.map(u => u.name).join(', ')}.</p>}
          <p>Bank and GP estimates use {resources.round} as the target {resources.gp.supported ? 'round or ToC floor' : 'selection'}. XP is persistent progress and grants one EP per 30,000 XP; spending EP does not consume XP. XP-to-SP conversion is not included.</p>
          {resourceSettings.gpEstimatesEnabled && (resources.gp.supported ? <p>Estimated levels per AD/AS/CD category: {formatCombatNumber(resources.gp.levels)}. Applied AD: {formatCombatNumber(resources.gp.stats.attackDamage)}; AS: {formatCombatNumber(resources.gp.stats.attackSpeed)}; CD: {formatCombatNumber(resources.gp.stats.critDamage)}.</p> : <p role="status">GP estimates are unavailable for this mode.</p>)}
        </section>}

        <div className="sp-upgrade-table-wrapper">
          {totals.unknownCostUpgrades.length > 0 && <p role="status">Totals include known costs only. Prices are unavailable for: {totals.unknownCostUpgrades.map(u => u.name).join(', ')}.</p>}
          <table className="sp-upgrade-table">
            <thead>
              <tr>
                <th>Count Invested</th>
                <th>Max Investments</th>
                <th>Upgrade</th>
                <th>Next {activeGroup.currency} Price</th>
                <th>Total {activeGroup.currency} Price</th>
              </tr>
            </thead>

            <tbody>
              {activeGroup.upgrades.map((upgrade) => {
                const investedCount = investments[activeGroup.id]?.[upgrade.id] ?? 0;
                const baseCount = baseInvestments?.[activeGroup.id]?.[upgrade.id] ?? investedCount;
                const nextPrice = getNextUpgradePrice(upgrade, investedCount);
                const totalPrice = getTotalUpgradePrice(upgrade, investedCount);

                return (
                  <tr key={upgrade.id} className={recommendations?.recommendations.some(c => c.groupId === activeGroup.id && c.upgradeId === upgrade.id) ? 'recommended-upgrade' : undefined}>
                    <td>
                      <input
                        type="number"
                        aria-label={`${activeGroup.label} ${upgrade.name} invested levels`}
                        min="0"
                        max={upgrade.maxInvestments}
                        value={investedCount}
                        onChange={(event) =>
                          updateInvestment(
                            activeGroup.id,
                            upgrade.id,
                            event.target.value
                          )
                        }
                        className="sp-upgrade-input"
                      />
                    </td>
                    <td>{upgrade.maxInvestments}</td>
                    <td>{upgrade.name}{investedCount > baseCount && <strong className="optimized-upgrade-label">+{investedCount - baseCount} optimized</strong>}{recommendations?.recommendations.some(c => c.groupId === activeGroup.id && c.upgradeId === upgrade.id) && <strong className="upgrade-recommendation-label">Recommended</strong>}</td>
                    <td>{investedCount >= upgrade.maxInvestments ? 'Maxed' : nextPrice ?? 'Unknown'}</td>
                    <td>{totalPrice ?? 'Unknown'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isEpGroup && (
          <p className="sp-upgrade-footnote">
            This page uses EP investments, so the current tab totals are displayed in EP.
          </p>
        )}
      </div>
    </section>
  );
}
