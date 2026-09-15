import React, { useMemo } from 'react';
import { useCalculatorConfig } from '../../../../../core/calculator/CalculatorConfigContext';
import { splitJewelsByType } from '../../../../../core/calculator/jewelHelpers';

function JewelSelect({ value, options, onChange, className = '' }) {
  return (
    <select
      className={`jewel-select ${className}`.trim()}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => {
        const normalized = typeof option === 'string'
          ? { value: option, label: option }
          : option;

        return (
          <option key={normalized.value} value={normalized.value}>
            {normalized.label}
          </option>
        );
      })}
    </select>
  );
}

function JewelCard({
  jewel,
  editableRows,
  statOptions,
  upgradeOptions,
  onFieldChange,
  onRemove,
}) {
  return (
    <article className="jewel-card">
      <div className="jewel-card-header">
        <div className="jewel-card-title-wrap">
          <h4 className="jewel-card-title">{jewel.name}</h4>
          {!jewel.legendary && (
            <button
              type="button"
              className="jewel-remove-button"
              onClick={() => onRemove(jewel.entryId)}
            >
              Remove
            </button>
          )}
        </div>

        <div className="jewel-card-icon-shell">
          {jewel.icon ? (
            <img src={jewel.icon} alt={jewel.name} className="jewel-card-icon" />
          ) : (
            <div className="jewel-card-icon-fallback">?</div>
          )}
        </div>
      </div>

      <div className="jewel-card-body">
        {editableRows.map((row) => (
          <div key={row.key} className="jewel-row">
            <div className="jewel-row-label">{row.label}</div>
            <div className="jewel-row-value">
              <JewelSelect
                value={jewel[row.key]}
                options={statOptions}
                onChange={(value) => onFieldChange(jewel.entryId, row.key, value)}
              />
            </div>
          </div>
        ))}

        {jewel.legendary && (
          <div className="jewel-row jewel-row--legendary-static">
            <div className="jewel-row-label jewel-row-label--legendary">
              {jewel.legendaryStatLabel}
            </div>
            <div className="jewel-static-value jewel-static-value--legendary">
              {jewel.legendaryStatValue}
            </div>
          </div>
        )}

        {jewel.legendary && (
          <div className="jewel-row jewel-row--upgrade">
            <div className="jewel-row-label jewel-row-label--upgrade">
              Jewel Upgrade
            </div>
            <div className="jewel-row-value">
              <JewelSelect
                value={jewel.jewelUpgrade}
                options={upgradeOptions}
                onChange={(value) => onFieldChange(jewel.entryId, 'jewelUpgrade', value)}
                className="jewel-select--upgrade"
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function AddJewelCard({ onAdd }) {
  return (
    <button
      type="button"
      className="jewel-add-card"
      onClick={onAdd}
    >
      <span className="jewel-add-symbol">+</span>
      <span className="jewel-add-label">Add Normal Jewel</span>
    </button>
  );
}

export default function JewelsTab({
  jewels,
  updateJewel,
  addNormalJewel,
  removeNormalJewel,
}) {
  const { calculator } = useCalculatorConfig();
  const {
    JEWEL_EDITABLE_ROWS,
    JEWEL_STAT_OPTIONS,
    JEWEL_UPGRADE_OPTIONS,
  } = calculator;

  const { legendaryJewels, normalJewels } = useMemo(() => {
    return splitJewelsByType(jewels);
  }, [jewels]);

  return (
    <section className="tab-panel-card jewels-tab-layout">
      <div className="section-heading-row card">
        <div>
          <h3>Jewels</h3>
          <p>Configure legendary jewels first, then add any normal jewels below.</p>
        </div>
      </div>

      <div className="jewels-section">
        <div className="jewels-section-header">
          <h4>Legendary Jewels</h4>
        </div>

        <div className="jewels-grid-layout">
          {legendaryJewels.map((jewel) => (
            <JewelCard
              key={jewel.entryId}
              jewel={jewel}
              editableRows={JEWEL_EDITABLE_ROWS}
              statOptions={JEWEL_STAT_OPTIONS}
              upgradeOptions={JEWEL_UPGRADE_OPTIONS}
              onFieldChange={updateJewel}
              onRemove={removeNormalJewel}
            />
          ))}
        </div>
      </div>

      <div className="jewels-section">
        <div className="jewels-section-header">
          <h4>Normal Jewels</h4>
        </div>

        <div className="jewels-grid-layout">
          {normalJewels.map((jewel) => (
            <JewelCard
              key={jewel.entryId}
              jewel={jewel}
              editableRows={JEWEL_EDITABLE_ROWS}
              statOptions={JEWEL_STAT_OPTIONS}
              upgradeOptions={JEWEL_UPGRADE_OPTIONS}
              onFieldChange={updateJewel}
              onRemove={removeNormalJewel}
            />
          ))}

          <AddJewelCard onAdd={addNormalJewel} />
        </div>
      </div>
    </section>
  );
}
