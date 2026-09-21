import React, { useMemo } from 'react';
import { useCalculatorConfig } from '../../../../../core/calculator/CalculatorConfigContext';
import { splitJewelsByType } from '../../../../../core/calculator/jewelHelpers';

function JewelSelect({ value, options, onChange, label }) {
  const supported = options.some(option => option.value === String(value));
  return <select className="jewel-select" aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
    {!supported && <option value={value}>Saved value {value} — reselect</option>}
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}
function JewelCard({ jewel, config, onFieldChange, onRemove }) {
  const select = (field, label, options) => <div className="jewel-row" key={field}>
    <div className="jewel-row-label">{label}</div><div className="jewel-row-value">
      <JewelSelect label={`${jewel.name} ${label}`} value={jewel[field]} options={options} onChange={value => onFieldChange(jewel.entryId, field, value)} />
    </div></div>;
  return <article className="jewel-card">
    <div className="jewel-card-header"><div className="jewel-card-title-wrap">
      <h4 className="jewel-card-title">{jewel.name}</h4>
      {!jewel.legendary && <button type="button" className="jewel-remove-button" onClick={() => onRemove(jewel.entryId)}>Remove</button>}
    </div><div className="jewel-card-icon-shell">{jewel.icon ? <img src={jewel.icon} alt={jewel.name} className="jewel-card-icon" /> : <div className="jewel-card-icon-fallback">?</div>}</div></div>
    <div className="jewel-card-body">
      <label><input type="checkbox" checked={jewel.available !== false} onChange={event => onFieldChange(jewel.entryId, 'available', event.target.checked)} /> Available to equip</label>
      {config.JEWEL_EDITABLE_ROWS.map(row => select(row.key, row.label, config.JEWEL_STAT_OPTIONS[row.key]))}
      <p>{jewel.innateLabel}</p>
      {jewel.typeId === 'lapis' && select('innateAd', 'Innate AD', config.LAPIS_AD_OPTIONS)}
      {jewel.canUpgrade && select('jewelUpgrade', 'Jewel Upgrade', config.JEWEL_UPGRADE_OPTIONS)}
    </div>
  </article>;
}
export default function JewelsTab({ jewels, updateJewel, addNormalJewel, removeNormalJewel }) {
  const { calculator } = useCalculatorConfig();
  const { legendaryJewels, normalJewels } = useMemo(() => splitJewelsByType(jewels), [jewels]);
  return <section className="tab-panel-card jewels-tab-layout">
    <div className="section-heading-row card"><div><h3>Jewels</h3><p>Configure jewels and equip them on individual build entries. AD, AS, FD and acceleration apply to ordinary attacks. Special effects remain pending.</p></div></div>
    {[["Legendary Jewels", legendaryJewels], ["Square Jewels", normalJewels]].map(([label, entries]) => <div className="jewels-section" key={label}>
      <div className="jewels-section-header"><h4>{label}</h4></div>
      <div className="jewels-grid-layout">{entries.map(jewel => <JewelCard key={jewel.entryId} jewel={jewel} config={calculator} onFieldChange={updateJewel} onRemove={removeNormalJewel} />)}
        {label === 'Square Jewels' && <button type="button" className="jewel-add-card" aria-label="Add Square Jewel" onClick={() => addNormalJewel('square')}><span className="jewel-add-symbol" aria-hidden="true">+</span><span className="jewel-add-label">Add Square Jewel</span></button>}
      </div>
    </div>)}
  </section>;
}

