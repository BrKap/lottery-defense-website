import React from 'react';
import { Route, Routes } from 'react-router-dom';
import SiteLayout from './components/layout/SiteLayout';
import HomePage from './pages/HomePage';
import GuidesPage from './pages/LotteryDefense/GuidesPage';
import RegionPage from './pages/LotteryDefense/RegionPage';
import VersionCalculatorPage from './pages/LotteryDefense/VersionCalculatorPage';

export default function App() {
  return (
    <SiteLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:versionId" element={<RegionPage />} />
        <Route path="/:versionId/guides" element={<GuidesPage />} />
        <Route path="/:versionId/calculator" element={<VersionCalculatorPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </SiteLayout>
  );
}
