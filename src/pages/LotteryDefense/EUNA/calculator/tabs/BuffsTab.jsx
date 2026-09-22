import React from 'react';
import { SUPPORT_OPTIONS } from '../../../../../core/calculator/supportCalculation';
import { ADDITIONAL_RUNE_STAT_KEYS, ADDITIONAL_RUNE_METHODS, canUseBless, getSuperBuffGem } from '../../../../../core/calculator/buffOptions';
const statLabels = { attackDamage: 'Attack Damage', attackSpeed: 'Attack Speed', critDamage: 'Critical Damage', critChance: 'Critical Chance', finalDamage: 'Final Damage', acceleration: 'Acceleration %', skillDamage: 'Skill Damage', armorReduction: 'Armor Reduction', multiCrit: 'Multi Crit' };
function ManualStats({ label, value, onChange, additional = false }) {
  const method = value.method ?? 'manual';
  const fields = additional ? ADDITIONAL_RUNE_STAT_KEYS : Object.keys(statLabels);
  return <section className="card"><h4>{label}</h4>
    <label><input type="checkbox" checked={value.enabled} onChange={e => onChange({ ...value, enabled: e.target.checked })} /> Enable {label}</label>
    {additional && <label className="stacked-field">Calculation method<select aria-label="Additional Rune calculation method" value={method} onChange={e => onChange({ ...value, method: e.target.value })}>
      {!ADDITIONAL_RUNE_METHODS.some(m => m.id === method) && <option value={method}>Saved method (unavailable)</option>}
      {ADDITIONAL_RUNE_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
    </select></label>}
    {additional && method !== 'manual' ? <p role="status">Automatic calculation from runes 1–5 is awaiting formulas. Test is excluded. No additional stats are applied; your manual inputs remain saved.</p> :
      <div className="placeholder-config-grid">{fields.map(key => <label className="stacked-field" key={key}>{statLabels[key]}
        <input aria-label={`${label} ${statLabels[key]}`} type="number" value={value.stats[key] ?? 0} disabled={!value.enabled} onChange={e => onChange({ ...value, stats: { ...value.stats, [key]: Number(e.target.value) || 0 } })} />
      </label>)}</div>}
  </section>;
}
export default function BuffsTab({ title, buffs, setBuffs, sandbox, setSandbox, additionalRune, setAdditionalRune }) {
  const update = (key, value) => setBuffs(current => ({ ...current, [key]: value }));
  return <section className="card tab-panel-card"><h3>Buffs</h3>
    <p>Unit merge buffs activate automatically from your build. Full Team Buff is inactive in ToC.</p>
    <div className="placeholder-config-grid">
      <label className="stacked-field">Full Team Buff<select value={buffs.teamBuffCount} onChange={e => update('teamBuffCount', Number(e.target.value))}>{[0,1,2].map(n => <option key={n}>{n}</option>)}</select></label>
      <label className="stacked-field">Bless<select disabled={!canUseBless(title)} value={buffs.bless} onChange={e => update('bless', Number(e.target.value))}>{[1,2,3].map(n => <option key={n}>{n}</option>)}</select>{!canUseBless(title) && <small>Requires Divine title or higher</small>}</label>
      <label className="stacked-field">SD Gem<select value={buffs.sdGem} onChange={e => update('sdGem', e.target.value)}>{['none','SD','SD+'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="stacked-field">Super Buff Gem<select value={getSuperBuffGem(buffs)} onChange={e => setBuffs(current => ({ ...current, superBuff: e.target.value === 'standard', superBuffPlus: e.target.value === 'plus' }))}>
        <option value="none">None</option><option value="standard">Super Buff Gem</option><option value="plus">Super Buff Gem +</option>
      </select></label>
      {[['critGem','Solo Crit Gem'],['powerBanker','Power Banker Gem'],['powerBankerPlus','Power Banker Gem +'],['selectUpgradeEnabled','Select Upgrade+'],['superShield','Super Shield'],['shieldMaster','Shield Master']].map(([key,label]) => <label key={key}><input type="checkbox" checked={buffs[key]} onChange={e => update(key,e.target.checked)} /> {label}</label>)}
    </div>
    {buffs.selectUpgradeEnabled && <p>Select Upgrade+ effect is awaiting calculation details.</p>}
    <p>SD Gem applies to supported skills, not the displayed base SD. Flower and Hybridlope counts come from Build Units.</p>
    <div className="placeholder-config-grid">{SUPPORT_OPTIONS.map(([key, label]) => <label className="stacked-field" key={key}>{label}
      <input type="number" min="0" max="999" step="1" value={buffs.supports?.[key] ?? 0} onChange={e => update('supports', { ...buffs.supports, [key]: Math.max(0, Math.min(999, Math.floor(Number(e.target.value) || 0))) })} />
    </label>)}</div>
    <ManualStats label="Sandbox" value={sandbox} onChange={setSandbox} />
    <ManualStats label="Additional Rune" value={additionalRune} onChange={setAdditionalRune} additional />
    <label><input type="checkbox" checked={buffs.purifierEnabled} onChange={e => update('purifierEnabled',e.target.checked)} /> Purifier</label><p>Purifier calculation unavailable.</p>
  </section>;
}
