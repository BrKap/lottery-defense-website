import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CalculatorConfigProvider } from '../../core/calculator/CalculatorConfigContext';
import { getVersionConfig } from '../../data/versions';
import LotteryDefenseCalculatorPage from './EUNA/LotteryDefenseCalculatorPage';

export default function VersionCalculatorPage() {
  const { versionId } = useParams();
  const versionConfig = getVersionConfig(versionId);

  if (!versionConfig) {
    return <Navigate to="/" replace />;
  }

  if (versionConfig.status !== 'working') {
    return (
      <section className="placeholder-page">
        <h2>{versionConfig.label} Calculator</h2>
        <p>Calculator data for this version is not ready yet.</p>
      </section>
    );
  }

  return (
    <CalculatorConfigProvider value={versionConfig}>
      <LotteryDefenseCalculatorPage versionConfig={versionConfig} />
    </CalculatorConfigProvider>
  );
}
