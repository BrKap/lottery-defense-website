import React from 'react';
const statLabels = { attackDamage: 'Attack Damage', attackSpeed: 'Attack Speed', critDamage: 'Critical Damage', critChance: 'Critical Chance', finalDamage: 'Final Damage', acceleration: 'Acceleration %', skillDamage: 'Skill Damage', armorReduction: 'Armor Reduction', multiCrit: 'Multi Crit' };
function ManualStats({ label, value, onChange }) {
  return <section className="card"><h4>{label}</h4>
    <label><input type="checkbox" checked={value.enabled} onChange={e => onChange({ ...value, enabled: e.target.checked })} /> Enable {label}</label>
    <div className="placeholder-config-grid">{Object.entries(statLabels).map(([key, text]) => <label className="stacked-field" key={key}>{text}
      <input aria-label={`${label} ${text}`} type="number" value={value.stats[key] ?? 0} disabled={!value.enabled} onChange={e => onChange({ ...value, stats: { ...value.stats, [key]: Number(e.target.value) || 0 } })} />
    </label>)}</div>
  </section>;
}
export default function BuffsTab({ buffs, setBuffs, sandbox, setSandbox, additionalRune, setAdditionalRune }) {
  const update = (key, value) => setBuffs(current => ({ ...current, [key]: value }));
  return <section className="card tab-panel-card"><h3>Buffs</h3>
    <p>Unit merge buffs activate automatically from your build. Full Team Buff is inactive in ToC.</p>
    <div className="placeholder-config-grid">
      {[['teamBuffCount','Full Team Buff'],['bless','Bless']].map(([key, label]) => <label className="stacked-field" key={key}>{label}<input type="number" min="0" step="1" value={buffs[key]} onChange={e => update(key, Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>)}
      <label className="stacked-field">SD Gem<select value={buffs.sdGem} onChange={e => update('sdGem', e.target.value)}>{['none','SD','SD+'].map(v => <option key={v}>{v}</option>)}</select></label>
      {[['critGem','Solo Crit Gem'],['powerBanker','Power Banker'],['powerBankerPlus','Power Banker +'],['superBuff','Super Buff'],['superBuffPlus','Super Buff +']].map(([key,label]) => <label key={key}><input type="checkbox" checked={buffs[key]} onChange={e => update(key,e.target.checked)} /> {label}</label>)}
    </div>
    <p>Super Buff takes precedence when both versions are selected. SD Gem applies to supported skills, not the displayed base SD. Overmind uptime and support spells are pending.</p>
    <ManualStats label="Sandbox" value={sandbox} onChange={setSandbox} />
    <ManualStats label="Additional Rune" value={additionalRune} onChange={setAdditionalRune} />
    <label><input type="checkbox" checked={buffs.purifierEnabled} onChange={e => update('purifierEnabled',e.target.checked)} /> Purifier</label><p>Purifier calculation unavailable.</p>
  </section>;
}
