import React from 'react';
import { useCalculatorConfig } from '../../../../../core/calculator/CalculatorConfigContext';
import {
  formatNumber,
  toNumber,
} from '../../../../../core/calculator/calculatorHelpers';
import { calculateMockUnitDps } from "../../../../../core/calculator/damageCalculation";
import { getEquippableJewels } from '../../../../../core/calculator/jewelHelpers';

export default function BuildUnitsTab({
  jewels,
  selectedUnitId,
  setSelectedUnitId,
  units,
  addUnit,
  removeUnit,
  updateUnit,
}) {
  const { calculator } = useCalculatorConfig();
  const { RANK_OPTIONS, unitLibrary } = calculator;

  return (
    <section className="card tab-panel-card">
      <div className="section-heading-row">
        <div>
          <h3>Build Units</h3>
          <p>
            Detailed unit editor for build variants, jewels, ranks, and per-entry DPS.
          </p>
        </div>
      </div>

      <div className="section-heading-row unit-builder-top-row">
        <label className="stacked-field unit-builder-picker">
          <span>Add Unit</span>
          <select
            value={selectedUnitId}
            onChange={(event) => setSelectedUnitId(event.target.value)}
          >
            {unitLibrary.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>

        <div className="unit-builder-actions">
          <button className="primary-button add-button" type="button" onClick={addUnit}
            disabled={selectedUnitId === 'artifact' && units.some(u => u.unitId === 'artifact')}>
            Add Unit Entry
          </button>
        </div>
      </div>

      <div className="unit-table-scroll">
        <table className="unit-table build-units-table">
          <thead>
            <tr>
              <th className="col-unit">Unit</th>
              <th className="col-count">Count</th>
              <th className="col-rank">Rank</th>
              <th className="col-level">Lvl</th>
              <th className="col-armor">Armor</th>
              <th className="col-lb">LB</th>
              <th className="col-jewel">Jewel</th>
              <th className="col-damage">Damage</th>
              <th className="col-additional-damage">+ Damage</th>
              <th className="col-speed">Base Weapon Speed</th>
              <th className="col-speed_reduction">- Speed</th>
              <th className="col-hits">Hits</th>
              <th className="col-dps">DPS / Unit</th>
              <th className="col-full-dps">Full DPS</th>
              <th className="col-actions"></th>
            </tr>
          </thead>

          <tbody>
            {units.map((unit) => {
              const perUnitDps = calculateMockUnitDps(unit);
              const fullDps = perUnitDps * Number(unit.count ?? 0);

              return (
                <tr key={unit.entryId}>
                  <td className="unit-name-cell">{unit.name}</td>

                  <td>
                    <input
                      className="table-input input-xs"
                      type="number"
                      min="0"
                      max={unit.maxCount ?? 999}
                      value={unit.count ?? 1}
                      onChange={(event) =>
                        updateUnit(unit.entryId, 'count', toNumber(event.target.value))
                      }
                    />
                  </td>

                  <td>
                    <select
                      className="table-input input-sm"
                      value={unit.rank ?? ''}
                      onChange={(event) =>
                        updateUnit(unit.entryId, 'rank', event.target.value)
                      }
                    >
                      {(RANK_OPTIONS.includes(unit.rank) ? RANK_OPTIONS : [unit.rank, ...RANK_OPTIONS]).map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      className="table-input input-xs"
                      type="number"
                      min="0"
                      max="11"
                      value={unit.level ?? 0}
                      onChange={(event) =>
                        updateUnit(unit.entryId, 'level', toNumber(event.target.value))
                      }
                    />
                  </td>

                  <td>
                    <input
                      className="table-input input-sm"
                      type="number"
                      min="0"
                      max="1000"
                      value={unit.armor ?? 0}
                      onChange={(event) =>
                        updateUnit(unit.entryId, 'armor', toNumber(event.target.value))
                      }
                    />
                  </td>

                  <td>
                    <input
                      className="table-input input-xs"
                      type="number"
                      min="0"
                      max="6"
                      value={unit.lb ?? 0}
                      onChange={(event) =>
                        updateUnit(unit.entryId, 'lb', toNumber(event.target.value))
                      }
                    />
                  </td>

                  <td>
                    <select
                      className="table-input input-md"
                      value={unit.jewel ?? 'none'}
                      onChange={(event) =>
                        updateUnit(unit.entryId, 'jewel', event.target.value)
                      }
                    >
                      {getEquippableJewels(jewels, unit.jewel ?? 'none').map((jewel) => (
                        <option key={jewel.value} value={jewel.value}>
                          {jewel.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="static-cell">
                    {formatNumber(unit.baseDamage ?? 0)}
                  </td>

                  <td className="static-cell">
                    {unit.attackSpeed ?? 0}
                  </td>

                  <td className="static-cell">
                    {formatNumber(unit.attacks ?? 0)}
                  </td>

                  <td className="static-cell">
                    {formatNumber(perUnitDps)}
                  </td>

                  <td className="static-cell">
                    {formatNumber(fullDps)}
                  </td>

                  <td>
                    <button
                      className="ghost-button danger"
                      type="button"
                      onClick={() => removeUnit(unit.entryId)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}

            {units.length === 0 && (
              <tr>
                <td colSpan="13">
                  <div className="empty-table-message">
                    No unit entries yet. Add a unit above to start building.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
