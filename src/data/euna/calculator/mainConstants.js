export { DERIVED_STAT_KEYS, STAT_KEYS } from '../../../core/calculator/statKeys';

export const DIFFICULTIES = [
  'Practice',
  'Very Easy',
  'Easy',
  'Normal',
  'Hard',
  'Very Hard',
  'Hell',
  'Inferno',
  'Lunatic',
  'Holic',
  'Epic',
  'Ultimate',
  'Impossible',
  'The Final',
  'Hall of Fame',
];

export const TITLES = [
  'Rookie',
  'Beginner',
  'Amateur',
  'Professional',
  'Expert',
  'Master',
  'Divine',
  'The One',
  'The One II',
  'The Zero',
];

export const PRESETS = [];

export const RANK_OPTIONS = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X', 'XD', 'SXD', 'RXD'];

export const JEWEL_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'jewel-a', label: 'Jewel A' },
  { value: 'jewel-b', label: 'Jewel B' },
];

export const CURRENCY = {
  EP: 'EP',
  SP: 'SP',
};

export const PROFILE = {
  XP: 'XP',
  SP_DONATION: 'SP Donation',
};

export const GAME_MODES = ['Classic', 'Eternal', 'Hyper'];
export const CLASSIC_ROUNDS = [115, 180, 190, 200, 210, 220, 240, 250, 260, 269, 270, 300];
export const TOC_FLOORS = Array.from({ length: 15 }, (_, i) => 70 + i);

export const TAB_OPTIONS = [
  { id: 'main', label: 'Main' },
  { id: 'sp-upgrades', label: 'SP Upgrades' },
  { id: 'runes', label: 'Runes' },
  { id: 'jewels', label: 'Jewels' },
  { id: 'buffs', label: 'Buffs' },
  { id: 'build-units', label: 'Build Units' },
  { id: 'presets', label: 'Presets' },
];
