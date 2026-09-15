import { getJewelImage } from '../images/imageImporter';

export const JEWEL_STAT_OPTIONS = Array.from({ length: 31 }, (_, index) => ({
  value: String(index),
  label: String(index),
}));

export const JEWEL_UPGRADE_OPTIONS = Array.from({ length: 6 }, (_, index) => ({
  value: String(index),
  label: String(index),
}));

export const JEWEL_EDITABLE_ROWS = [
  { key: 'finalDamage', label: 'Final Damage' },
  { key: 'acceleration', label: 'Accel' },
  { key: 'attackSpeed', label: 'Atk Spd' },
  { key: 'attackDamage', label: 'Atk Dmg' },
  { key: 'cooldown', label: 'Cooldown' },
  { key: 'skillDamage', label: 'Skill Dmg' },
];

export const LEGENDARY_JEWELS = [
  {
    id: 'emerald',
    name: 'Emerald',
    icon: getJewelImage('emerald'),
    legendary: true,
    legendaryStatLabel: 'Final Damage',
    legendaryStatValue: 30,
  },
  {
    id: 'topaz',
    name: 'Topaz',
    icon: getJewelImage('topaz'),
    legendary: true,
    legendaryStatLabel: 'Attack Speed',
    legendaryStatValue: 15,
  },
];

export const NORMAL_JEWEL_DEFAULT = {
  name: 'Square',
  icon: '',
  legendary: false,
  legendaryStatLabel: '',
  legendaryStatValue: 0,
  jewelUpgrade: '0',
  finalDamage: '0',
  acceleration: '0',
  attackSpeed: '0',
  attackDamage: '0',
  cooldown: '0',
  skillDamage: '0',
};
