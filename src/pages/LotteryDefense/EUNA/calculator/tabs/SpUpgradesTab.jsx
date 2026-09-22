import React, { useMemo } from 'react';
import UpgradeRecommendations from '../UpgradeRecommendations';
import { formatCombatNumber } from '../../../../../core/calculator/calculatorHelpers';
import { useCalculatorConfig } from '../../../../../core/calculator/CalculatorConfigContext';
import {
  calculateUpgradeTotals,
  getNextUpgradePrice,
  getTotalUpgradePrice,
  sanitizeInvestmentValue,
} from '../../../../../core/calculator/spUpgradeHelpers';

export default function SpUpgradesTab({
  activeGroupId,
  setActiveGroupId,
  investments,
  setInvestments,
  resources,
  resourceSettings,
  setResourceSettings,
  recommendations,
  optimizerSettings,
  setOptimizerSettings,
}) {
  const { calculator } = useCalculatorConfig();
  const { UPGRADE_GROUPS } = calculator;
  const activeGroup =
    UPGRADE_GROUPS.find((group) => group.id === activeGroupId) ?? UPGRADE_GROUPS[0];

  const totals = useMemo(() => {
    return calculateUpgradeTotals(investments, UPGRADE_GROUPS);
  }, [investments, UPGRADE_GROUPS]);

  function updateInvestment(groupId, upgradeId, nextValue) {
    setInvestments((current) => {
      const group = UPGRADE_GROUPS.find((entry) => entry.id === groupId);
      const upgrade = group?.upgrades.find((entry) => entry.id === upgradeId);

      if (!group || !upgrade) {
        return current;
      }

      const clampedValue = sanitizeInvestmentValue(upgrade, nextValue);

      return {
        ...current,
        [groupId]: {
          ...current[groupId],
          [upgradeId]: clampedValue,
        },
      };
    });
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
        {resources && <section aria-label="Resource budget">
          <h4>Resource budget</h4>
          {Object.entries({ includeInfinite: 'Include Infinite costs in budget', gpEstimatesEnabled: 'Apply GP stat estimates' }).map(([key, label]) => <label key={key} style={{ display: 'block' }}>
            <input type="checkbox" checked={resourceSettings[key]} onChange={event => setResourceSettings(current => ({ ...current, [key]: event.target.checked }))} /> {label}
          </label>)}
          <p>Budget options do not remove paid upgrade stats. GP estimates add a separate approximate contribution with a 25% margin.</p>
          <p>SP Bank pays 1,000 SP per invested level at every multiple of 10 rounds, including the target round when applicable.{resources.bankPayouts !== null && ` ${resources.bankPayouts} payouts at this target.`}</p>
          <dl>
            {Object.entries({ 'Starting SP': resources.startingSp, 'Known budget SP expense': resources.knownBudgetSp,
              'Remaining SP at start': resources.remainingStart, 'SP Bank return': resources.bankReturn,
              'Bank return minus purchase cost': resources.bankNet, 'Remaining SP at target': resources.remainingTarget,
              'EP expense': resources.totalEpOverall, 'XP estimate for EP expense': resources.epXpEstimate,
            }).map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value === null ? 'Unavailable' : formatCombatNumber(value)}</dd></React.Fragment>)}
          </dl>
          {resources.unknown.length > 0 && <p role="status">Remaining SP is unavailable because selected investments have unknown prices: {resources.unknown.map(u => u.name).join(', ')}.</p>}
          <p>Bank and GP estimates use {resources.round} as the target {resources.gp.supported ? 'round or ToC floor' : 'selection'}. EP stays separate from SP; the XP estimate does not spend your entered XP.</p>
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
                    <td>{upgrade.name}{recommendations?.recommendations.some(c => c.groupId === activeGroup.id && c.upgradeId === upgrade.id) && <strong className="upgrade-recommendation-label">Recommended</strong>}</td>
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
