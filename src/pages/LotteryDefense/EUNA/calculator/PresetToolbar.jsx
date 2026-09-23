import React, { useEffect, useState } from 'react';
import { exportPreset, parsePreset } from '../../../../core/calculator/presetHelpers';

export default function PresetToolbar({ state, config, onAction, blocked }) {
  const [name, setName] = useState(state.calculatorSettings.presetName);
  const [panel, setPanel] = useState(null);
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [exportUrl, setExportUrl] = useState('');
  const output = exportPreset(state);

  useEffect(() => setName(state.calculatorSettings.presetName), [state.calculatorSettings.presetName]);
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    setExportUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [output]);

  const act = (action, success) => {
    try {
      onAction(action);
      setPanel(null);
      setMessage(success);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggle = next => { setPanel(current => current === next ? null : next); setMessage(''); };

  return <section className="preset-toolbar card" aria-label="Preset management">
    <div className="preset-toolbar-main">
      <label className="preset-toolbar-picker">
        <span>Preset</span>
        <select aria-label="Selected preset" disabled={blocked} value={state.presetLibrary.activeId ?? ''} onChange={event => act({ type: 'select', id: event.target.value }, 'Preset selected.')}>
          {!state.presetLibrary.activeId && <option value="">{state.calculatorSettings.presetName}</option>}
          {state.presetLibrary.items.map(p => <option key={p.id} value={p.id}>{p.id === state.presetLibrary.activeId ? state.calculatorSettings.presetName : p.name}</option>)}
        </select>
      </label>
      <div className="preset-toolbar-actions">
        <button type="button" disabled={blocked} title="New preset" aria-label="New preset" onClick={() => act({ type: 'new' }, 'New preset created.')}>＋</button>
        <button type="button" disabled={blocked} title="Duplicate preset" aria-label="Duplicate preset" onClick={() => act({ type: 'duplicate' }, 'Preset duplicated.')}>⧉</button>
        <button type="button" disabled={blocked} title="Rename preset" aria-label="Rename preset" aria-expanded={panel === 'rename'} onClick={() => toggle('rename')}>✎</button>
        <a className="preset-toolbar-button" href={exportUrl || undefined} download={`${state.calculatorSettings.presetName.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'euna-build'}.json`} title="Download preset JSON" aria-label="Download preset JSON">↓</a>
        <button type="button" disabled={blocked} title="Import preset JSON" aria-label="Import preset JSON" aria-expanded={panel === 'import'} onClick={() => toggle('import')}>↑</button>
        <button type="button" disabled={blocked} title="Delete preset" aria-label="Delete preset" onClick={() => act({ type: 'delete' }, 'Preset deleted. You can undo this deletion.')}>🗑</button>
        {state.presetLibrary.deleted && <button type="button" disabled={blocked} onClick={() => act({ type: 'undo-delete' }, 'Preset restored.')}>Undo delete</button>}
      </div>
    </div>
    {panel === 'rename' && <form className="preset-toolbar-panel" onSubmit={event => { event.preventDefault(); if (name.trim()) act({ type: 'rename', name }, 'Preset renamed.'); }}>
      <label className="stacked-field">Preset name<input autoFocus value={name} maxLength={120} onChange={event => setName(event.target.value)} /></label>
      <button type="submit" disabled={blocked || !name.trim()}>Save name</button>
      <button type="button" onClick={() => setPanel(null)}>Cancel</button>
    </form>}
    {panel === 'import' && <div className="preset-toolbar-panel">
      <label className="stacked-field">Import JSON file<input type="file" accept=".json,application/json" disabled={blocked} onChange={async event => {
        const file = event.target.files?.[0]; setPreview(null); setRaw('');
        if (!file) return;
        try {
          if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Choose a .json file.');
          const text = await file.text();
          const validated = parsePreset(text, config);
          setRaw(text); setPreview(validated); setMessage('JSON validated. Review the build before adding.');
        } catch (error) { setMessage(error.message); }
      }} /></label>
      {preview && <div className="preset-import-preview">
        <p>Import: {preview.build.calculatorSettings.presetName}; {preview.build.units.length} unit entries. Region: EUNA. Schema: {preview.build.schemaVersion}.</p>
        {preview.notes.map((note, i) => <p key={i}>{note}</p>)}
        <button type="button" disabled={blocked} onClick={() => { act({ type: 'import', raw }, 'Preset imported.'); setPreview(null); }}>Add imported preset</button>
      </div>}
      <button type="button" onClick={() => setPanel(null)}>Cancel</button>
    </div>}
    {message && <p className="preset-toolbar-message" role="status">{message}</p>}
  </section>;
}
