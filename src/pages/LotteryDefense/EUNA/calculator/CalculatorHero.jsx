import React from 'react';
import { Link } from 'react-router-dom';

export default function CalculatorHero({ settings, versionConfig }) {
  return (
    <div className="calculator-hero card">
      <div>
        <div className="breadcrumb-row">
          <Link to={`/${versionConfig.id}`}>{versionConfig.name}</Link>
          <span>/</span>
          <span>Calculator</span>
        </div>
        <h2>{versionConfig.name} Calculator</h2>
        <p>
          UI scaffolding for the main dashboard, presets, and future DPS logic.
        </p>
      </div>
      <div className="hero-summary-pills">
        <span>Preset: {settings.presetName}</span>
      </div>
    </div>
  );
}
