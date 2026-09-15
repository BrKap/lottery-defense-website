import React, { useMemo } from 'react';
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
}) {
  const { calculator } = useCalculatorConfig();
  const { UPGRADE_GROUPS } = calculator;
  const activeGroup =
    UPGRADE_GROUPS.find((group) => group.id === activeGroupId) ?? UPGRADE_GROUPS[0];

  const totals = useMemo(() => {
    return calculateUpgradeTotals(investments, UPGRADE_GROUPS);
  }, [investments]);

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
            <p>Track invested levels and costs before wiring full stat calculations.</p>
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

        <div className="sp-upgrade-table-wrapper">
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
                  <tr key={upgrade.id}>
                    <td>
                      <input
                        type="number"
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
                    <td>{upgrade.name}</td>
                    <td>{nextPrice}</td>
                    <td>{totalPrice}</td>
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
