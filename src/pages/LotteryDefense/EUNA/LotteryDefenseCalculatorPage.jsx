import React, { useEffect, useMemo, useState } from 'react';
import './styles/ld-euna-index.css';
import {
  addNormalJewel,
  removeJewelAndAssignments,
  updateJewelField,
} from '../../../core/calculator/jewelHelpers';
import {
  calculateMockRequiredDps,
  calculateMockUnitDps
} from "../../../core/calculator/damageCalculation";
import { loadCalculatorState, saveCalculatorState, hydrateUnits, appendBuildUnit, updateBuildUnit, updateRuneField } from '../../../core/calculator/calculatorState';
import { calculateProfileStats } from '../../../core/calculator/statCalculator';
import FloatingStatsPanel from './calculator/FloatingStatsPanel';
import CalculatorHero from './calculator/CalculatorHero';
import CalculatorTabs from './calculator/CalculatorTabs';
import MainTab from './calculator/MainTab';
import SpUpgradesTab from './calculator/tabs/SpUpgradesTab';
import RunesTab from './calculator/tabs/RunesTab';
import JewelsTab from './calculator/tabs/JewelsTab';
import BuffsTab from './calculator/tabs/BuffsTab';
import PresetsTab from './calculator/tabs/PresetsTab';
import BuildUnitsTab from './calculator/tabs/BuildUnitsTab';

export default function LotteryDefenseCalculatorPage({ versionConfig }) {
  const calculatorConfig = versionConfig.calculator;
  const safeUnitLibrary = calculatorConfig.unitLibrary ?? [];
  const runeSlots = calculatorConfig.RUNE_SLOTS ?? [];
  const upgradeGroupMap = calculatorConfig.UPGRADE_GROUP_MAP ?? {};
  const jewelConfig = { legendaryJewels: calculatorConfig.LEGENDARY_JEWELS,
    normalJewelDefault: calculatorConfig.NORMAL_JEWEL_DEFAULT, jewelTypes: calculatorConfig.JEWEL_TYPES };
  const [loaded] = useState(() => loadCalculatorState(window.localStorage, calculatorConfig));
  const [state, setState] = useState(loaded.state);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const setField = (field) => (value) => {
    if (loaded.blocked) return;
    setState(current => ({ ...current, [field]: typeof value === 'function' ? value(current[field]) : value }));
  };
  const { activeTab, jewels, selectedUnitId, calculatorSettings, spActiveGroupId, spInvestments, runeLoadouts } = state;
  const units = useMemo(() => hydrateUnits(state.units, calculatorConfig), [state.units, calculatorConfig]);
  const setActiveTab = setField('activeTab'), setJewels = setField('jewels'), setSelectedUnitId = setField('selectedUnitId');
  const setCalculatorSettings = setField('calculatorSettings'), setUnits = setField('units');
  const setSpActiveGroupId = setField('spActiveGroupId'), setSpInvestments = setField('spInvestments'), setRuneLoadouts = setField('runeLoadouts');
  useEffect(() => {
    try { saveCalculatorState(window.localStorage, state, loaded); setSaveError(''); }
    catch { setSaveError('Changes could not be saved. Keep this page open and export your recovery data before closing.'); }
  }, [state, loaded]);
  const exportRecovery = () => {
    const blob = new Blob([loaded.originalRaw ?? JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'calculator-recovery.json'; link.click(); URL.revokeObjectURL(url);
  };

  const derivedStats = useMemo(() => {
    const overallDps = units.reduce((sum, unit) => {
      const perUnit = calculateMockUnitDps(unit);
      return sum + perUnit * unit.count;
    }, 0);

    const requiredDps = calculateMockRequiredDps(calculatorSettings);
    const completionPercent = requiredDps > 0
      ? (overallDps / requiredDps) * 100
      : 0;

    return {
      overallDps,
      requiredDps,
      completionPercent,
      totalUnits: units.reduce((sum, unit) => sum + unit.count, 0),
      uniqueUnits: units.length,
    };
  }, [calculatorSettings, units]);

  const selectedRuneSlot = calculatorSettings.runeSlot ?? runeSlots[0]?.value;
  const activeRune = runeLoadouts.find((rune) => rune.slot === selectedRuneSlot) ?? runeLoadouts[0];

  const addUnit = () => {
    if (!safeUnitLibrary.length) return;

    const template =
      safeUnitLibrary.find((unit) => unit.id === selectedUnitId) ?? safeUnitLibrary[0];

    if (template.id === 'artifact' && state.units.some(u => u.unitId === 'artifact')) {
      setNotice('Only one Artifact can be added.'); return;
    }
    setUnits((currentUnits) => appendBuildUnit(currentUnits, template));
  };

  const removeUnit = (entryId) => {
    setUnits((currentUnits) => currentUnits.filter((unit) => unit.entryId !== entryId));
  };

  const updateUnit = (entryId, field, value) => {
    setUnits(current => updateBuildUnit(current, entryId, field, value));
  };

  const updateSetting = (field, value) => {
    setCalculatorSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
  };

  const updateRuneLoadout = (slot, field, value) => {
    setRuneLoadouts(current => updateRuneField(current, slot, field, value));
  };

  const swapRuneLoadouts = (sourceSlot, targetSlot) => {
    if (sourceSlot === targetSlot) return;

    setRuneLoadouts((currentLoadouts) => {
      return currentLoadouts.map((rune) => {
        if (rune.slot === sourceSlot) {
          return {
            ...rune,
            slot: targetSlot,
          };
        }

        if (rune.slot === targetSlot) {
          return {
            ...rune,
            slot: sourceSlot,
          };
        }

        return rune;
      });
    });
  };

  const updateJewel = (entryId, field, value) => {
    setJewels((currentJewels) => updateJewelField(currentJewels, entryId, field, value));
  };

  const handleAddNormalJewel = (typeId = 'square') => {
    setJewels((currentJewels) => addNormalJewel(currentJewels, jewelConfig, typeId));
  };

  const handleRemoveNormalJewel = (entryId) => {
    if (loaded.blocked) return;
    const count = state.units.filter(u => u.jewel === entryId).length;
    setState(current => removeJewelAndAssignments(current, entryId));
    setNotice(count ? 'Jewel removed. Affected units now have no jewel equipped.' : 'Jewel removed.');
  };

  const profileSummary = useMemo(() => {
    return calculateProfileStats({
      runeLoadouts: activeRune ? [activeRune] : [],
      spInvestments,
      difficultyState: {
        difficulty: calculatorSettings.difficulty,
        title: calculatorSettings.title,
      },
      tormentState: {
        level: calculatorSettings.torment,
        critDamageReduction: 0,
      },
      buffState: state.buffState,
      calculatorSettings,
      units,
      sandboxState: state.sandboxState,
      additionalRuneState: state.additionalRuneState,
      runeConstants: calculatorConfig,
      upgradeGroupMap,
    });
  }, [
    activeRune,
    spInvestments,
    calculatorSettings.difficulty,
    calculatorSettings.title,
    calculatorSettings.torment,
    state.buffState, state.sandboxState, state.additionalRuneState, calculatorSettings, units,
  ]);

  const profileStats = {
    ...profileSummary.cappedStats,
    ...profileSummary.displayStats,
    uncappedAttackDamage: profileSummary.rawStats.attackDamage,
    uncappedCritDamage: profileSummary.rawStats.critDamage,
  };

  return (
    <section className="calculator-page">
      {(loaded.notes.length > 0 || loaded.blocked || saveError || notice) && <section className="card" aria-label="Saved build notices">
        {loaded.blocked && <p role="alert">Preview only. Your saved build will not be overwritten.</p>}
        {saveError && <p role="alert">{saveError}</p>}
        {notice && <p role="status">{notice}</p>}
        {loaded.notes.length > 0 && <details><summary>Saved build review ({loaded.notes.length})</summary><ul>{loaded.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></details>}
        <button type="button" onClick={exportRecovery}>Download original saved data</button>
      </section>}
      <CalculatorHero settings={calculatorSettings} versionConfig={versionConfig} />
      <CalculatorTabs tabs={calculatorConfig.TAB_OPTIONS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'main' && (
        <MainTab
          buffs={state.buffState}
          calculatorSettings={calculatorSettings}
          derivedStats={derivedStats}
          selectedUnitId={selectedUnitId}
          setSelectedUnitId={setSelectedUnitId}
          units={units}
          addUnit={addUnit}
          removeUnit={removeUnit}
          updateUnit={updateUnit}
          updateSetting={updateSetting}
          runeLoadouts={runeLoadouts}
          activeRune={activeRune}
        />
      )}

      {activeTab === 'sp-upgrades' && (
        <SpUpgradesTab
          activeGroupId={spActiveGroupId}
          setActiveGroupId={setSpActiveGroupId}
          investments={spInvestments}
          setInvestments={setSpInvestments}
        />
      )}

      {activeTab === 'runes' && (
        <RunesTab
          runeLoadouts={runeLoadouts}
          updateRuneLoadout={updateRuneLoadout}
          swapRuneLoadouts={swapRuneLoadouts}
        />
      )}

      {activeTab === 'jewels' && (
        <JewelsTab
          jewels={jewels}
          updateJewel={updateJewel}
          addNormalJewel={handleAddNormalJewel}
          removeNormalJewel={handleRemoveNormalJewel}
        />
      )}
      {activeTab === 'buffs' && <BuffsTab buffs={state.buffState} setBuffs={setField('buffState')} sandbox={state.sandboxState} setSandbox={setField('sandboxState')} additionalRune={state.additionalRuneState} setAdditionalRune={setField('additionalRuneState')} />}
      {activeTab === 'presets' && (
        <PresetsTab
          presetName={calculatorSettings.presetName}
          updateSetting={updateSetting}
        />
      )}
      {activeTab === 'build-units' && (
        <BuildUnitsTab
          jewels={jewels}
          selectedUnitId={selectedUnitId}
          setSelectedUnitId={setSelectedUnitId}
          units={units}
          addUnit={addUnit}
          removeUnit={removeUnit}
          updateUnit={updateUnit}
        />
      )}

      <FloatingStatsPanel profileStats={profileStats} />
    </section>
  );
}


