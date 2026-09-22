import React, { useEffect, useState } from 'react';
import { exportPreset, parsePreset } from '../../../../../core/calculator/presetHelpers';

export default function PresetsTab({ state, config, onAction, blocked }) {
  const [name,setName]=useState(state.calculatorSettings.presetName);
  const [raw,setRaw]=useState(''), [preview,setPreview]=useState(null), [message,setMessage]=useState('');
  useEffect(()=>setName(state.calculatorSettings.presetName),[state.calculatorSettings.presetName]);
  const act = action => { try { onAction(action); setMessage('Build saved.'); } catch(error) {setMessage(error.message);} };
  const output=exportPreset(state);
  const [exportUrl,setExportUrl]=useState('');
  useEffect(()=>{
    const url=URL.createObjectURL(new Blob([output],{type:'application/json'}));
    setExportUrl(url); return ()=>URL.revokeObjectURL(url);
  },[output]);
  return <section className="card tab-panel-card">
    <h3>Presets</h3><p>Build changes save automatically on this device. Export a build to keep a portable copy. Imports create a new preset.</p>
    {message && <p role="status">{message}</p>}
    <div className="preset-layout-grid">
      <article className="config-card"><h4>Saved builds</h4>
        <label className="stacked-field">Selected preset<select disabled={blocked} value={state.presetLibrary.activeId ?? ''} onChange={event=>act({type:'select',id:event.target.value})}>
          {!state.presetLibrary.activeId && <option value="">Current build (autosaved)</option>}
          {state.presetLibrary.items.map(p=><option key={p.id} value={p.id}>{p.id===state.presetLibrary.activeId ? state.calculatorSettings.presetName : p.name}</option>)}
        </select></label>
        <p>Current name: {state.calculatorSettings.presetName}</p>
        <label className="stacked-field">Preset name<input value={name} maxLength={120} onChange={event=>setName(event.target.value)} /></label>
        <div className="button-row-wrap">
          <button disabled={blocked} onClick={()=>act({type:'new',name:name===state.calculatorSettings.presetName ? 'New build' : name})}>New</button>
          <button disabled={blocked} onClick={()=>act({type:'duplicate'})}>Duplicate</button>
          <button disabled={blocked || !name.trim()} onClick={()=>act({type:'rename',name})}>Rename</button>
          <button disabled={blocked} onClick={()=>act({type:'delete'})}>Delete</button>
          {state.presetLibrary.deleted && <button disabled={blocked} onClick={()=>act({type:'undo-delete'})}>Undo delete</button>}
        </div>
        <p>New starts a default build and keeps the current one. The latest deleted preset can be restored with Undo delete.</p>
      </article>
      <article className="config-card"><h4>Export / Import</h4>
        <a href={exportUrl || undefined} download={`${state.calculatorSettings.presetName.replace(/[^a-zA-Z0-9_-]+/g,'-') || 'euna-build'}.json`}>Download JSON</a>
        <label className="stacked-field">Import JSON file<input type="file" accept=".json,application/json" disabled={blocked} onChange={async event=>{
          const file=event.target.files?.[0]; setPreview(null); setRaw('');
          if (!file) return;
          try { if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Choose a .json file.');
            const text=await file.text(); const validated=parsePreset(text,config);
            setRaw(text); setPreview(validated); setMessage('JSON validated. Review the build below before adding.');
          } catch(error) {setMessage(error.message);}
        }} /></label>
        {preview && <div><p>Import: {preview.build.calculatorSettings.presetName}; {preview.build.units.length} unit entries. Region: EUNA. Schema: {preview.build.schemaVersion}.</p>
          {preview.notes.map((note,i)=><p key={i}>{note}</p>)}
          <button disabled={blocked} onClick={()=>{act({type:'import',raw});setPreview(null);}}>Add imported preset</button>
        </div>}
      </article>
    </div>
    <p>Data revision: {config.DATA_REVISION}. Unsupported modes and unknown effects retain their unavailable status after import.</p>
  </section>;
}
