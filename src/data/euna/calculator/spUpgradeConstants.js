import { STAT_KEYS, CURRENCY } from "./mainConstants";

const slugifyUpgradeId = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const createLinearValueModel = ({ base = 0, perLevel = 0 } = {}) => ({
  type: 'linear',
  base,
  perLevel,
});

const createLinearCostModel = ({ base = 100, perLevel = 10 } = {}) => ({
  type: 'linear',
  base,
  perLevel,
});

const createTableCostModel = (values = []) => ({
  type: 'table',
  values,
});

const createTieredLinearModel = (tiers = []) => ({
  type: 'tiered-linear',
  tiers,
});

const createUpgrade = ({
  id,
  name,
  maxInvestments = 10,
  currency = CURRENCY.SP,
  statKey = null,
  valueModel = createLinearValueModel(),
  costModel = createLinearCostModel(),
} = {}) => ({
  id: id ?? slugifyUpgradeId(name),
  name,
  maxInvestments,
  currency,
  statKey,
  valueModel,
  costModel,
});

const createGroup = ({ id, label, currency = CURRENCY.SP, upgrades = [] }) => ({
  id,
  label,
  currency,
  upgrades: upgrades.map((upgrade) => ({
    ...upgrade,
    currency: upgrade.currency ?? currency,
  })),
});

/*
  Notes:
  - Use valueModel for the stat gain itself.
  - Use costModel for the upgrade price.
  - Most upgrades can stay linear.
  - Special upgrades can use table or tiered-linear models.
  - The numbers below are placeholder examples. Replace them with the real values.
*/

export const UPGRADE_GROUPS = [
  createGroup({
    id: 'rookie',
    label: 'Rookie',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({
        name: 'Atk Dmg I',
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 3 }),
        costModel: createLinearCostModel({ base: 50, perLevel: 40 }),
      }),
      createUpgrade({
        name: 'Atk Spd I',
        statKey: STAT_KEYS.ATTACK_SPEED,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 3 }),
        costModel: createLinearCostModel({ base: 50, perLevel: 40 }),
      }),
      createUpgrade({
        name: 'Skl Dmg',
        statKey: STAT_KEYS.SKILL_DAMAGE,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 5 }),
        costModel: createLinearCostModel({ base: 50, perLevel: 40 }),
      }),
    ],
  }),

  createGroup({
    id: 'beginner',
    label: 'Beginner',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({
        name: 'Crit Chance I',
        statKey: STAT_KEYS.CRIT_CHANCE,
        maxInvestments: 10,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 100, perLevel: 75 }),
      }),
      createUpgrade({
        name: 'Mvmt Spd',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 3,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 150, perLevel: 75 }),
      }),
      createUpgrade({
        name: 'Atk Range',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 100, perLevel: 75 }),
      }),
      createUpgrade({
        name: 'Mineral +',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 4,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 150, perLevel: 75 }),
      }),
      createUpgrade({
        name: 'Gas +',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 8,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 75, perLevel: 75 }),
      }),
    ],
  }),

  createGroup({
    id: 'amateur',
    label: 'Amateur',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({
        name: 'Atk Dmg II',
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        maxInvestments: 15,
        valueModel: createLinearValueModel({ base: 0, perLevel: 2 }),
        costModel: createLinearCostModel({ base: 100, perLevel: 70 }),
      }),
      createUpgrade({
        name: 'Atk Spd II',
        statKey: STAT_KEYS.ATTACK_SPEED,
        maxInvestments: 15,
        valueModel: createLinearValueModel({ base: 0, perLevel:1.5 }),
        costModel: createLinearCostModel({ base: 100, perLevel: 70 }),
      }),
      createUpgrade({
        name: 'Skl Dmg II',
        statKey: STAT_KEYS.SKILL_DAMAGE,
        maxInvestments: 15,
        valueModel: createLinearValueModel({ base: 0, perLevel: 4 }),
        costModel: createLinearCostModel({ base: 100, perLevel: 70 }),
      }),
      createUpgrade({
        name: 'Gas Rev',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 4,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 350, perLevel: 175 }),
      }),
      createUpgrade({
        name: 'Unit XP+',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 10,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0}), /* Not implemented */
        costModel: createLinearCostModel({ base: 200, perLevel: 100 }),
      }),
      createUpgrade({
        name: 'Interest Rate',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 10,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 200, perLevel: 100 }),
      }),
      createUpgrade({
        name: 'Max Upg',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 10,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0} ), /* Not implemented */
        costModel: createLinearCostModel({ base: 350, perLevel: 300 }),
      }),
      createUpgrade({
        name: 'Sell Lotto',
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 15,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 150, perLevel: 75 }),
      }),
    ],
  }),

  createGroup({
    id: 'professional',
    label: 'Professional',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({ 
        name: 'Atk Dmg III', 
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        maxInvestments: 150,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 150, perLevel: 75 }),
      }),
      createUpgrade({ 
        name: 'Atk Spd III', 
        statKey: STAT_KEYS.ATTACK_SPEED,
        maxInvestments: 150,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.5 }),
        costModel: createLinearCostModel({ base: 150, perLevel: 75 }),
      }),
      createUpgrade({ 
        name: 'Skl Dmg III', 
        statKey: STAT_KEYS.SKILL_DAMAGE,
        maxInvestments: 150,
        valueModel: createLinearValueModel({ base: 0, perLevel: 3 }),
        costModel: createLinearCostModel({ base: 150, perLevel: 75 }),
      }),
      createUpgrade({ 
        name: 'Basic Rank', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 4,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 300, perLevel: 300 }), 
      }),
      createUpgrade({ 
        name: 'Upg Rev I+', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 300, perLevel: 350 }),
      }),
      createUpgrade({ 
        name: 'Upg Rev II+', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 3,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 700, perLevel: 550 }), 
      }),
      createUpgrade({ 
        name: 'Rank Rev', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 350, perLevel: 350 }),
      }),
      createUpgrade({ 
        name: 'Card Rev', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 350, perLevel: 350 }),
      }),
    ],
  }),

  createGroup({
    id: 'expert',
    label: 'Expert',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({ 
        name: 'Crit Chance II', 
        statKey: STAT_KEYS.CRIT_CHANCE,
        maxInvestments: 150,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.5 }),
        costModel: createLinearCostModel({ base: 200, perLevel: 75 }),
      }),
      createUpgrade({ 
        name: 'Mvmt Spd II', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 3,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 400, perLevel: 150 }),
      }),
      createUpgrade({ 
        name: 'Crit Dmg I', 
        statKey: STAT_KEYS.CRIT_DAMAGE,
        maxInvestments: 125,
        valueModel: createLinearValueModel({ base: 0, perLevel: 2.49 }),
        costModel: createLinearCostModel({ base: 200, perLevel: 90 }),
      }),
      createUpgrade({ 
        name: 'Multi Crit I', 
        statKey: STAT_KEYS.MULTI_CRIT,
        maxInvestments: 25,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createTableCostModel([350, 700, 1400, 2800, 5600, 11200, 22400, 44800, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 100000, 100000, 100000, 100000, 100000]),
      }),
      createUpgrade({ 
        name: 'Unit Lottery Lotto', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 70,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 100, perLevel: 40 }),
      }),
      createUpgrade({ 
        name: 'Gas Lottery Lotto', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 70,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 100, perLevel: 40 }),
      }),
      createUpgrade({ 
        name: 'Bank Lotto', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 70,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 100, perLevel: 75 }),
      }),
      createUpgrade({ 
        name: 'Horse XP', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 20,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 200, perLevel: 100 }),
      }),
    ],
  }),

  createGroup({
    id: 'master',
    label: 'Master',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({ 
        name: 'Atk Range II', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 1,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 2000, perLevel: 100 }),
      }),
      createUpgrade({ 
        name: 'Armor Reduct', 
        statKey: STAT_KEYS.ARMOR_REDUCTION,
        maxInvestments: 1,
        valueModel: createLinearValueModel({ base: 0, perLevel: 15 }),
        costModel: createLinearCostModel({ base: 400, perLevel: 0 }),
      }),
      createUpgrade({ 
        name: 'Lottery Rev', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 15,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 750, perLevel: 350 }),
      }),
      createUpgrade({ 
        name: 'Cooldown', 
        statKey: STAT_KEYS.COOLDOWN,
        maxInvestments: 20,
        valueModel: createLinearValueModel({ base: 0, perLevel: 5 }),
        costModel: createLinearCostModel({ base: 400, perLevel: 200 }),
      }),
      createUpgrade({ 
        name: 'Mineral Lotto', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 120,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 200, perLevel: 75 }),
      }),
      createUpgrade({ 
        name: 'Gas Lotto', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 120,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 200, perLevel: 75 }),
      }),
      createUpgrade({ 
        name: 'XP Limit', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 30,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 350, perLevel: 350 }),
      }),
      createUpgrade({ 
        name: 'XP Lotto', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 50,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 200, perLevel: 100 }),
      }),
    ],
  }),

  createGroup({
    id: 'divine',
    label: 'Divine',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({ 
        name: 'Team Atk Dmg', 
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        maxInvestments: 27,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 700, perLevel: 150 }),
      }),
      createUpgrade({ 
        name: 'Team Atk Spd', 
        statKey: STAT_KEYS.ATTACK_SPEED,
        maxInvestments: 27,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 700, perLevel: 150 }),
      }),
      createUpgrade({ 
        name: 'Team Crit Chance', 
        statKey: STAT_KEYS.CRIT_CHANCE,
        maxInvestments: 27,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.5 }),
        costModel: createLinearCostModel({ base: 700, perLevel: 150 }),
      }),
      createUpgrade({ 
        name: 'Team Exchange', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 20,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 700, perLevel: 150 }),
      }),
      createUpgrade({ 
        name: 'Max Energy', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 50,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 150, perLevel: 75 }),
      }),
      createUpgrade({ 
        name: 'SP Bank', 
        statKey: STAT_KEYS.SP_BANK,
        maxInvestments: 250,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 10000, perLevel: 50 }),
      }),
      createUpgrade({ 
        name: 'Kill Energy', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 50,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 200, perLevel: 100 }),
      }),
      createUpgrade({ 
        name: 'Kill Exp', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 100,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 200, perLevel: 100 }),
      }),
    ],
  }),

  createGroup({
    id: 'the-one',
    label: 'The One',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({ 
        name: 'Final Dmg', 
        statKey: STAT_KEYS.FINAL_DAMAGE,
        maxInvestments: 100,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.2485 }),
        costModel: createLinearCostModel({ base: 1500, perLevel: 750 }),
      }),
      createUpgrade({ 
        name: 'Atk Dmg IV', 
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        maxInvestments: 200,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createTieredLinearModel([
          { start: 0, end: 150, base: 750, perLevel: 350 },
          { start: 150, end: 200, base: 53250, perLevel: 0 },
        ]),
      }),
      createUpgrade({ 
        name: 'Atk Spd IV', 
        statKey: STAT_KEYS.ATTACK_SPEED,
        maxInvestments: 200,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.5 }),
        costModel: createTieredLinearModel([
          { start: 0, end: 150, base: 750, perLevel: 350 },
          { start: 150, end: 200, base: 53250, perLevel: 0 },
        ]),
      }),
      createUpgrade({ 
        name: 'Crit Chance III', 
        statKey: STAT_KEYS.CRIT_CHANCE,
        maxInvestments: 250,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.5 }),
        costModel: createTieredLinearModel([
          { start: 0, end: 150, base: 750, perLevel: 500 },
          { start: 150, end: 250, base: 75750, perLevel: 0 },
        ]),
      }),
      createUpgrade({ 
        name: 'Dbl Upg', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 50,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 400, perLevel: 400 }),
      }),
      createUpgrade({ 
        name: 'Rank Rev II', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 4000, perLevel: 4000 }),
      }),
      createUpgrade({ 
        name: 'SXD Rev', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 10,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 2000, perLevel: 2000 }),
      }),
      createUpgrade({ 
        name: 'Accel', 
        statKey: STAT_KEYS.ACCELERATION,
        maxInvestments: 150,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }),
        costModel: createLinearCostModel({ base: 1300, perLevel: 750 }),
      }),
    ],
  }),

  createGroup({
    id: 'the-one-ii',
    label: 'The One II',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({ 
        name: 'MT Dmg', 
        statKey: STAT_KEYS.MULTI_TARGET_DAMAGE,
        maxInvestments: 150,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 600, perLevel: 300 }),
      }),
      createUpgrade({ 
        name: 'MT Chance', 
        statKey: STAT_KEYS.MULTI_TARGET_CHANCE,
        maxInvestments: 150,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 800, perLevel: 400 }),
      }),
      createUpgrade({ 
        name: 'MT Multi Crit', 
        statKey: STAT_KEYS.MULTI_TARGET_MULTI_CRIT,
        maxInvestments: 200,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 1200, perLevel: 600 }), 
      }),
      createUpgrade({ 
        name: 'Crit Dmg II', 
        statKey: STAT_KEYS.CRIT_DAMAGE,
        maxInvestments: 200,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1.4891 }),
        costModel: createLinearCostModel({ base: 1200, perLevel: 600 }),
      }),
      createUpgrade({ 
        name: 'Multi Crit II', 
        statKey: STAT_KEYS.MULTI_CRIT,
        maxInvestments: 15,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createTableCostModel([75000, 75000, 75000, 75000, 75000, 225000, 225000, 225000, 225000, 225000, 675000, 675000, 675000, 675000, 675000]),
      }),
      createUpgrade({ 
        name: 'Rune Upg', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 20,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 2500, perLevel: 2500 }),
      }),
      createUpgrade({ 
        name: 'XP Limit II', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 5,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 25000, perLevel: 25000 }),
      }),
      createUpgrade({ 
        name: 'Kill XP II', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 100,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 900, perLevel: 450 }),
      }),
    ],
  }),

  createGroup({
    id: 'ep',
    label: 'EP',
    currency: CURRENCY.EP,
    upgrades: [
      createUpgrade({
        name: 'Atk Dmg (E)',
        currency: CURRENCY.EP,
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        maxInvestments: 99,
        valueModel: createLinearValueModel({ base: 0, perLevel: 4 }),
        costModel: createTieredLinearModel([
          { start: 0, end: 13, base: 1, perLevel: 1 },
          { start: 14, end: 99, base: 100, perLevel: 0 },
        ]),
      }),
      createUpgrade({
        name: 'Atk Spd (E)',
        currency: CURRENCY.EP,
        statKey: STAT_KEYS.ATTACK_SPEED,
        maxInvestments: 14,
        valueModel: createLinearValueModel({ base: 0, perLevel: 2 }),
        costModel: createLinearCostModel({ base: 1, perLevel: 1 }),
      }),
      createUpgrade({
        name: 'Crit Chance (E)',
        currency: CURRENCY.EP,
        statKey: STAT_KEYS.CRIT_CHANCE,
        maxInvestments: 12,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 1, perLevel: 1 }),
      }),
      createUpgrade({
        name: 'Crit Dmg (E)',
        currency: CURRENCY.EP,
        statKey: STAT_KEYS.CRIT_DAMAGE,
        maxInvestments: 12,
        valueModel: createLinearValueModel({ base: 0, perLevel: 4 }),
        costModel: createLinearCostModel({ base: 1, perLevel: 1 }),
      }),
      createUpgrade({
        name: 'Multi Crit (E)',
        currency: CURRENCY.EP,
        statKey: STAT_KEYS.MULTI_CRIT,
        maxInvestments: 2,
        valueModel: createLinearValueModel({ base: 0, perLevel: 1 }),
        costModel: createLinearCostModel({ base: 25, perLevel: 0 }),
      }),
      createUpgrade({
        name: 'Reduce Armor',
        currency: CURRENCY.EP,
        statKey: STAT_KEYS.ARMOR_REDUCTION,
        maxInvestments: 1,
        valueModel: createLinearValueModel({ base: 0, perLevel: 10 }),
        costModel: createLinearCostModel({ base: 25, perLevel: 0 }),
      }),
      createUpgrade({
        name: 'Mineral+',
        currency: CURRENCY.EP,
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 10,
        valueModel: createLinearValueModel({ base: 0, perLevel: 5 }),
        costModel: createLinearCostModel({ base: 1, perLevel: 1 }),
      }),
      createUpgrade({
        name: 'Break Safety',
        currency: CURRENCY.EP,
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 1,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 10, perLevel: 0 }),
      }),
    ],
  }),

  createGroup({
    id: 'infinite',
    label: 'Infinite',
    currency: CURRENCY.SP,
    upgrades: [
      createUpgrade({ 
        name: 'Atk Dmg (Inf)', 
        statKey: STAT_KEYS.ATTACK_DAMAGE,
        maxInvestments: 500,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.4 }),
        costModel: createLinearCostModel({ base: 200, perLevel: 600 }),
      }),
      createUpgrade({ 
        name: 'Atk Spd (Inf)', 
        statKey: STAT_KEYS.ATTACK_SPEED,
        maxInvestments: 500,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.2 }),
        costModel: createLinearCostModel({ base: 200, perLevel: 600 }),
      }),
      createUpgrade({ 
        name: 'Crit Dmg (Inf)', 
        statKey: STAT_KEYS.CRIT_DAMAGE,
        maxInvestments: 500,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.5 }),
        costModel: createLinearCostModel({ base: 200, perLevel: 600 }),
      }),
      createUpgrade({ 
        name: 'Accel (Inf)', 
        statKey: STAT_KEYS.ACCELERATION,
        maxInvestments: 500,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.000732 }),
        costModel: createLinearCostModel({ base: 200, perLevel: 600 }),
      }),
      createUpgrade({ 
        name: 'XP Lotto', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 250,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 400, perLevel: 800 }),
      }),
      createUpgrade({ 
        name: 'R.Stone Lotto', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 250,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 400, perLevel: 800 }),
      }),
      createUpgrade({ 
        name: 'R.Stone Rev', 
        statKey: STAT_KEYS.OTHER,
        maxInvestments: 250,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0 }), /* Not implemented */
        costModel: createLinearCostModel({ base: 400, perLevel: 800 }), 
      }),
      createUpgrade({ 
        name: 'Reduce Shield', 
        statKey: STAT_KEYS.SHIELD_REDUCTION,
        maxInvestments: 250,
        valueModel: createLinearValueModel({ base: 0, perLevel: 0.05 }), 
        costModel: createLinearCostModel({ base: 400, perLevel: 800 }),
      }),
    ],
  }),
];

export const UPGRADE_GROUP_MAP = Object.fromEntries(
  UPGRADE_GROUPS.map((group) => [group.id, group])
);

export const UPGRADE_MAP = Object.fromEntries(
  UPGRADE_GROUPS.flatMap((group) =>
    group.upgrades.map((upgrade) => [upgrade.id, upgrade])
  )
);