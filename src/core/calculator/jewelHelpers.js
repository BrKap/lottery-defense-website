function createEntryId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createLegendaryJewelsState(jewelConfig) {
  return (jewelConfig?.legendaryJewels ?? []).map((jewel) => ({
    ...(jewelConfig?.normalJewelDefault ?? {}),
    ...jewel,
    entryId: createEntryId(jewel.id),
  }));
}

export function createNormalJewel(jewelConfig, typeId = 'square') {
  const type = jewelConfig?.jewelTypes?.find(jewel => jewel.id === typeId);
  return {
    ...(jewelConfig?.normalJewelDefault ?? {}),
    ...type,
    entryId: createEntryId('normal-jewel'),
  };
}

export function createInitialJewelsState(savedJewels = null, jewelConfig = null) {
  if (Array.isArray(savedJewels) && savedJewels.length > 0) {
    return savedJewels;
  }

  return createLegendaryJewelsState(jewelConfig);
}

export function updateJewelField(jewels, entryId, field, value) {
  return jewels.map((jewel) =>
    jewel.entryId !== entryId
      ? jewel
      : {
          ...jewel,
          [field]: value,
        }
  );
}

export function addNormalJewel(jewels, jewelConfig = null, typeId = 'square') {
  return [...jewels, createNormalJewel(jewelConfig, typeId)];
}

export function removeNormalJewel(jewels, entryId) {
  return jewels.filter((jewel) => jewel.entryId !== entryId || jewel.legendary);
}

export function splitJewelsByType(jewels) {
  const legendaryJewels = [];
  const normalJewels = [];

  jewels.forEach((jewel) => {
    if (jewel.legendary) {
      legendaryJewels.push(jewel);
      return;
    }

    normalJewels.push(jewel);
  });

  return {
    legendaryJewels,
    normalJewels,
  };
}

export function getEquippableJewels(jewels, selectedId = 'none') {
  const options = [{ value: 'none', label: 'None' }, ...jewels
    .filter(j => j.available !== false || j.entryId === selectedId)
    .map((j, i) => ({ value: j.entryId, label: `${j.name} (${i + 1})${j.available === false ? ' — equipped, hidden' : ''}` }))];
  if (!options.some(o => o.value === selectedId)) options.push({ value: selectedId, label: `Unresolved jewel: ${selectedId} — reassign` });
  return options;
}

export function removeJewelAndAssignments(state, entryId) {
  if (state.jewels.find(j => j.entryId === entryId)?.legendary) return state;
  return { ...state, jewels: removeNormalJewel(state.jewels, entryId),
    units: state.units.map(unit => unit.jewel === entryId ? { ...unit, jewel: 'none' } : unit) };
}
