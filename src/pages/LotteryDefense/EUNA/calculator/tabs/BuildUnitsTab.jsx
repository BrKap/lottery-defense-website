import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCalculatorConfig } from '../../../../../core/calculator/CalculatorConfigContext';
import {
  formatCombatNumber as formatNumber,
  toNumber,
} from '../../../../../core/calculator/calculatorHelpers';

import { getEquippableJewels } from '../../../../../core/calculator/jewelHelpers';

export default function BuildUnitsTab({
  jewels,
  results = [],
  selectedUnitId,
  setSelectedUnitId,
  units,
  addUnit,
  removeUnit,
  updateUnit,
}) {
  const { calculator } = useCalculatorConfig();
  const { RANK_OPTIONS, unitLibrary } = calculator;
  const [detailsEntryId, setDetailsEntryId] = useState(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const detailsUnit = units.find(unit => unit.entryId === detailsEntryId);
  const detailsResult = results.find(result => result.entryId === detailsEntryId);
  const details = detailsResult?.details;
  const display = value => value == null ? 'Unavailable' : formatNumber(value);
  const closeDetails = () => { setDetailsEntryId(null); requestAnimationFrame(() => triggerRef.current?.focus()); };

  useEffect(() => {
    if (detailsEntryId) closeButtonRef.current?.focus();
  }, [detailsEntryId]);
  useEffect(() => {
    if (!detailsEntryId) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') closeDetails();
      if (event.key === 'Tab') {
        const controls = [...(dialogRef.current?.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])];
        if (!controls.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailsEntryId]);

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
              <th className="col-overmind">Overmind</th>
              <th className="col-jewel">Jewel</th>
              <th className="col-dps">Unit DPS</th>
              <th className="col-full-dps">Total DPS</th>
              <th className="col-actions">Remove</th>
            </tr>
          </thead>

          <tbody>
            {units.map((unit) => {
              const result = results.find(r => r.entryId === unit.entryId);
              return (
                <tr key={unit.entryId}>
                  <td className="unit-name-cell">
                    <div className="unit-name-and-info">
                      <span>{unit.name}</span>
                      <button className="unit-info-button" type="button" title={`Calculation details for ${unit.name}`} onClick={event => { triggerRef.current = event.currentTarget; setDetailsEntryId(unit.entryId); }} aria-label={`Calculation details for ${unit.name}`}>i</button>
                    </div>
                    {unit.unitId === 'xelnaga-kerrigan' && <label><input type="checkbox" checked={unit.xnkFixedAttacks !== false} onChange={e => updateUnit(unit.entryId, 'xnkFixedAttacks', e.target.checked)} /> Fixed five attacks</label>}
                    {unit.unitId === 'overmind' && <label>FD buff mode<select value={unit.abilityMode === 'uptime' ? 'uptime' : 'default'} onChange={e => updateUnit(unit.entryId, 'abilityMode', e.target.value)}><option value="default">Full +5 FD</option><option value="uptime">Scale FD by uptime</option></select></label>}
                    {result?.reason && <small role="status">{result.reason}</small>}
                  </td>

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

                  <td className="overmind-cell"><select aria-label={`${unit.name} Overmind AD stacks`} value={unit.overmindStacks ?? 0} onChange={e => updateUnit(unit.entryId, 'overmindStacks', Number(e.target.value))}>{[0,1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></td>
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
                    {result?.status === 'pending' ? 'Pending' : display(result?.perUnitDps)}
                  </td>

                  <td className="static-cell">
                    {result?.status === 'pending' && unit.count > 0 ? 'Pending' : display(result?.fullDps)}
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
                <td colSpan="11">
                  <div className="empty-table-message">
                    No unit entries yet. Add a unit above to start building.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {detailsUnit && createPortal(<div className="calculation-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeDetails(); }}>
        <section ref={dialogRef} className="calculation-modal card" role="dialog" aria-modal="true" aria-labelledby="calculation-modal-title">
          <div className="calculation-modal-heading">
            <div><h3 id="calculation-modal-title">{detailsUnit.name} calculation details</h3><p>{detailsResult?.reason || 'DPS breakdown for this build entry.'}</p></div>
            <button ref={closeButtonRef} type="button" onClick={closeDetails} aria-label="Close calculation details">×</button>
          </div>
          {details ? <>
            <dl className="calculation-detail-grid">
              <div><dt>Unit DPS</dt><dd>{display(detailsResult?.perUnitDps)}</dd></div>
              <div><dt>Total DPS</dt><dd>{display(detailsResult?.fullDps)}</dd></div>
              <div><dt>Hit Damage</dt><dd>{display(details.hitDamage)}</dd></div>
              <div><dt>AD %</dt><dd>{display(details.effectiveAD)}</dd></div>
              <div><dt>Base Weapon Speed</dt><dd>{detailsUnit.unitId === 'artifact' ? '—' : display(details.baseInterval)}</dd></div>
              <div><dt>Interval (s)</dt><dd>{detailsUnit.unitId === 'artifact' ? 'Spell' : details.interval.toFixed(4)}</dd></div>
              <div><dt>{detailsUnit.unitId === 'artifact' ? 'Ticks' : 'Hits'}</dt><dd>{display(details.attacks)}</dd></div>
            </dl>
            <div className="calculation-detail-notes">
              <p>Grade {details.grade}; base {formatNumber(details.gradedBase)}; effective rank {details.effectiveRank}{details.provisionalRank ? ' (provisional zero bonus)' : ''}.</p>
              <p>AD factor {details.adFactor.toFixed(4)}; FD factor {details.fdFactor.toFixed(4)}; count bonus {details.countBonus} AD.</p>
              <p>Crit factor {details.critical.multiplier.toFixed(4)}; average MC {details.critical.averageMC.toFixed(4)}; penetration factor {details.penetrationFactor.toFixed(4)}; damage adjustment {details.damageAdjustment}.</p>
              <p>Jewel: AD {details.jewelStats.attackDamage}, AS {details.jewelStats.attackSpeed}, FD {details.jewelStats.finalDamage}, acceleration {details.jewelStats.acceleration}%, CDR {details.jewelStats.cooldown}, SD {details.jewelStats.skillDamage}. CDR/SD are retained for supported special effects.</p>
              {details.overmindUptime !== undefined && <p>FD uptime: {(details.overmindUptime * 100).toFixed(2)}%. {details.uniqueContribution ? 'Selected unique contribution.' : 'Another Overmind supplies the unique contribution.'}</p>}
              {details.artifact && <p>Spell uptime: {(details.artifact.uptime * 100).toFixed(2)}%; ticks: {formatNumber(details.artifact.ticks)}.</p>}
            </div>
          </> : <p>Calculation details are unavailable for this entry.</p>}
        </section>
      </div>, document.body)}
    </section>
  );
}
