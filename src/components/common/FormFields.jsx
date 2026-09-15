import React from 'react';
import { toNumber } from '../../core/calculator/calculatorHelpers';

export function InputField({ label, value, onChange, options }) {
  return (
    <label className="stacked-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NumberField({ label, value, onChange, min, max }) {
  return (
    <label className="stacked-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(toNumber(event.target.value))}
      />
    </label>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="stacked-checkbox-field">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
