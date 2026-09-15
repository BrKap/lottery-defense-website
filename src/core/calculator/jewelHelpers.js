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

export function createNormalJewel(jewelConfig) {
  return {
    ...(jewelConfig?.normalJewelDefault ?? {}),
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

export function addNormalJewel(jewels, jewelConfig = null) {
  return [...jewels, createNormalJewel(jewelConfig)];
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
