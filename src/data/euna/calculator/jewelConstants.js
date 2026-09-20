import { getJewelImage } from '../images/imageImporter';
const options = values => values.map(value => ({ value: String(value), label: String(value) }));
export const JEWEL_STAT_OPTIONS = {
  finalDamage: options([0,1,2,3,4,5]), acceleration: options([0,2,4,6,8,10]),
  attackSpeed: options([0,5,10,15,20,25]), attackDamage: options([0,10,20,30,40,50]),
  cooldown: options([0,10,20,30,40,50]), skillDamage: options([0,10,20,30,40,50]),
};
export const JEWEL_UPGRADE_OPTIONS = options([0,1,2,3,4,5]);
export const LAPIS_AD_OPTIONS = options([0,20,40,60,80,100,120,140,160,180,200]);
export const JEWEL_EDITABLE_ROWS = [
  { key: 'finalDamage', label: 'Final Damage' }, { key: 'acceleration', label: 'Accel' },
  { key: 'attackSpeed', label: 'Atk Spd' }, { key: 'attackDamage', label: 'Atk Dmg' },
  { key: 'cooldown', label: 'Cooldown' }, { key: 'skillDamage', label: 'Skill Dmg' },
];
// Data contracts only. Combat code applies conditional innate effects.
const definitions = [
  ['Emerald', { finalDamage: 30 }, '30 FD at LB 5+', { minimumLb: 5 }],
  ['Topaz', { attackSpeed: 15 }, '+15 AS'],
  ['Garnet', { attackDamage: 200, attackSpeed: -30 }, '+200 AD, -30 AS'],
  ['Jet', { finalDamage: 20 }, '+20 FD'], ['Ruby', { attackDamage: 150 }, '+150 AD'],
  ['Sapphire', { acceleration: 100 }, '+100 acceleration'],
  ['Aquamarine', {}, 'Effective rank RXD', { effectiveRank: 'RXD' }],
  ['Fluorite', { finalDamage: 20 }, '+20 FD'], ['Bloodstone', { finalDamage: 20 }, '+20 FD'],
  ['Amethyst', { acceleration: 25 }, '+25 acceleration'], ['Pearl', { attackDamage: 100 }, '+100 AD'],
  ['Chrysoberyl', {}, 'Standard rolls'], ['Hyacinth', { attackDamage: 150 }, '+150 AD'],
  ['Diamond', {}, 'Standard rolls'], ['Agate', { acceleration: 9 }, '+9 acceleration'],
  ['Lapis', {}, 'Adjustable innate AD', { editableInnate: 'innateAd' }],
  ['Spinel', { acceleration: 30 }, '+30 acceleration'], ['Olivine', {}, '+6 FD per upgrade'],
  ['Heliodor', { attackDamage: 200 }, '+200 AD'], ['Padparadscha', { finalDamage: 33 }, '+33 FD'],
  ['Peridot', {}, 'Standard rolls'], ['Square', {}, 'Standard rolls'],
];
export const JEWEL_TYPES = definitions.map(([name, innateStats, innateLabel, condition = {}]) => ({
  id: name.toLowerCase(), typeId: name.toLowerCase(), name, innateStats, innateLabel, condition,
  icon: getJewelImage(name), legendary: name !== 'Square', upgradeFd: name === 'Square' ? 0 : name === 'Olivine' ? 6 : 2,
  canUpgrade: name !== 'Square',
}));
export const LEGENDARY_JEWELS = JEWEL_TYPES.filter(j => j.legendary);
export const NORMAL_JEWEL_DEFAULT = {
  typeId: 'square', name: 'Square', icon: '', legendary: false, available: true,
  jewelUpgrade: '0', finalDamage: '0', acceleration: '0', attackSpeed: '0',
  attackDamage: '0', cooldown: '0', skillDamage: '0', innateAd: '200',
};
