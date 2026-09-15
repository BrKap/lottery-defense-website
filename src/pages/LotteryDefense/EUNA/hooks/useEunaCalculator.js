import { useMemo, useState } from 'react';
import { UNIT_LIBRARY } from '../../../../data/euna/calculator/unitConstants';
import { createUnitEntry } from '../../../../core/calculator/createUnitEntry';
import {
  calculateMockRequiredDps,
  calculateMockUnitDps
} from "../../../../core/calculator/damageCalculation";

export default function useEunaCalculator() {
  const [activeTab, setActiveTab] = useState('main');
  const [selectedUnitId, setSelectedUnitId] = useState(
    UNIT_LIBRARY[0]?.id ?? ''
  );

  const [units, setUnits] = useState([]);

  function addUnit() {
    const template =
      UNIT_LIBRARY.find((u) => u.id === selectedUnitId) ??
      UNIT_LIBRARY[0];

    if (!template) return;

    setUnits((prev) => [...prev, createUnitEntry(template)]);
  }

  function updateUnit(entryId, field, value) {
    setUnits((prev) =>
      prev.map((unit) =>
        unit.entryId === entryId
          ? { ...unit, [field]: value }
          : unit
      )
    );
  }

  function removeUnit(entryId) {
    setUnits((prev) =>
      prev.filter((unit) => unit.entryId !== entryId)
    );
  }

  const derivedStats = useMemo(() => {
    const overallDps = units.reduce((sum, unit) => {
      const perUnit = calculateMockUnitDps(unit);
      return sum + perUnit * unit.count;
    }, 0);

    return { overallDps };
  }, [units]);

  return {
    activeTab,
    setActiveTab,
    selectedUnitId,
    setSelectedUnitId,
    units,
    addUnit,
    updateUnit,
    removeUnit,
    derivedStats,
  };
}
