export function createUnitEntry(unit) {
  return {
    entryId: crypto.randomUUID(), // MUST be unique

    unitId: unit.id,
    name: unit.name,
    race: unit.race,
    weapon: unit.weapon,

    count: 1,
    rank: 'D',
    level: 0,
    armor: 0,
    lb: 0,
    jewel: 'none',

    baseDamage: unit.baseDamage ?? 0,
    attackSpeed: unit.attackSpeed ?? 0,
    attacks: unit.attacks ?? 0,
    defensePen: unit.defensePen ?? 0,
  };
}