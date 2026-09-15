import React, { useEffect, useMemo, useState } from 'react';
import './styles/ld-euna-index.css';
import {
  addNormalJewel,
  createInitialJewelsState,
  removeNormalJewel,
  updateJewelField,
} from '../../../core/calculator/jewelHelpers';
import {
  calculateMockRequiredDps,
  calculateMockUnitDps
} from "../../../core/calculator/damageCalculation";
import { createUnitEntry } from '../../../core/calculator/createUnitEntry';
import { buildInitialInvestments } from '../../../core/calculator/spUpgradeHelpers';
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

const STORAGE_KEY = 'ld-euna-calculator-state';

const INITIAL_SETTINGS = {
  title: 'Rookie',
  difficulty: 'Practice',
  torment: 0,
  round: 270,
  xp: 0,
  sp: 0,
  gameMode: 'Standard',
  tocMode: false,
  runeSlot: 'slot-1',
  presetName: 'Default EUNA Preset',
};

function loadSavedCalculatorState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load calculator state:', error);
    return null;
  }
}

function createDefaultUnits(safeUnitLibrary) {
  return safeUnitLibrary
    .filter((_, index) => [0, 1, 3].includes(index))
    .map((unit) => createUnitEntry(unit));
}

export default function LotteryDefenseCalculatorPage({ versionConfig }) {
  const calculatorConfig = versionConfig.calculator;
  const safeUnitLibrary = Array.isArray(calculatorConfig.unitLibrary)
    ? calculatorConfig.unitLibrary
    : [];
  const defaultUnit = safeUnitLibrary[0] ?? null;
  const runeSlots = calculatorConfig.RUNE_SLOTS ?? [];
  const upgradeGroups = calculatorConfig.UPGRADE_GROUPS ?? [];
  const upgradeGroupMap = calculatorConfig.UPGRADE_GROUP_MAP ?? {};
  const jewelConfig = {
    legendaryJewels: calculatorConfig.LEGENDARY_JEWELS,
    normalJewelDefault: calculatorConfig.NORMAL_JEWEL_DEFAULT,
  };
  const initialSettings = {
    ...INITIAL_SETTINGS,
    runeSlot: runeSlots[0]?.value ?? INITIAL_SETTINGS.runeSlot,
  };

  const [activeTab, setActiveTab] = useState(() => {
    const savedState = loadSavedCalculatorState();
    return savedState?.activeTab ?? 'main';
  });

  const [jewels, setJewels] = useState(() => {
    const savedState = loadSavedCalculatorState();
    return createInitialJewelsState(savedState?.jewels, jewelConfig);
  });

  const [selectedUnitId, setSelectedUnitId] = useState(() => {
    const savedState = loadSavedCalculatorState();
    return savedState?.selectedUnitId ?? defaultUnit?.id ?? '';
  });

  const [calculatorSettings, setCalculatorSettings] = useState(() => {
    const savedState = loadSavedCalculatorState();
    return {
      ...initialSettings,
      ...(savedState?.calculatorSettings ?? {}),
    };
  });

  const [units, setUnits] = useState(() => {
    const savedState = loadSavedCalculatorState();
    return savedState?.units ?? createDefaultUnits(safeUnitLibrary);
  });

  const [spActiveGroupId, setSpActiveGroupId] = useState(() => {
    const savedState = loadSavedCalculatorState();
    return savedState?.spActiveGroupId ?? upgradeGroups[0]?.id ?? '';
  });

  const [spInvestments, setSpInvestments] = useState(() => {
    const savedState = loadSavedCalculatorState();
    return savedState?.spInvestments ?? buildInitialInvestments(upgradeGroups);
  });

  const [runeLoadouts, setRuneLoadouts] = useState(() => {
    const savedState = loadSavedCalculatorState();
    return savedState?.runeLoadouts ?? calculatorConfig.createInitialRuneLoadouts();
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeTab,
          selectedUnitId,
          calculatorSettings,
          units,
          spActiveGroupId,
          spInvestments,
          runeLoadouts,
          jewels,
        })
      );
    } catch (error) {
      console.error('Failed to save calculator state:', error);
    }
  }, [
    activeTab,
    selectedUnitId,
    calculatorSettings,
    units,
    spActiveGroupId,
    spInvestments,
    runeLoadouts,
  ]);

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

    setUnits((currentUnits) => [...currentUnits, createUnitEntry(template)]);
  };

  const removeUnit = (entryId) => {
    setUnits((currentUnits) => currentUnits.filter((unit) => unit.entryId !== entryId));
  };

  const updateUnit = (entryId, field, value) => {
    setUnits((currentUnits) =>
      currentUnits.map((unit) =>
        unit.entryId !== entryId
          ? unit
          : {
              ...unit,
              [field]: value,
            }
      )
    );
  };

  const updateSetting = (field, value) => {
    setCalculatorSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
  };

  const updateRuneLoadout = (slot, field, value) => {
    setRuneLoadouts((currentLoadouts) =>
      currentLoadouts.map((rune) =>
        rune.slot !== slot
          ? rune
          : {
              ...rune,
              [field]: value,
            }
      )
    );
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

  const handleAddNormalJewel = () => {
    setJewels((currentJewels) => addNormalJewel(currentJewels, jewelConfig));
  };

  const handleRemoveNormalJewel = (entryId) => {
    setJewels((currentJewels) => removeNormalJewel(currentJewels, entryId));
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
      buffState: null,
      runeConstants: calculatorConfig,
      upgradeGroupMap,
    });
  }, [
    activeRune,
    spInvestments,
    calculatorSettings.difficulty,
    calculatorSettings.title,
    calculatorSettings.torment,
  ]);

  const profileStats = {
    ...profileSummary.rawStats,
    ...profileSummary.displayStats,
  };

  return (
    <section className="calculator-page">
      <CalculatorHero settings={calculatorSettings} versionConfig={versionConfig} />
      <CalculatorTabs tabs={calculatorConfig.TAB_OPTIONS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'main' && (
        <MainTab
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
      {activeTab === 'buffs' && <BuffsTab />}
      {activeTab === 'presets' && (
        <PresetsTab
          presetName={calculatorSettings.presetName}
          updateSetting={updateSetting}
        />
      )}
      {activeTab === 'build-units' && (
        <BuildUnitsTab
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


