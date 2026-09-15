import * as jewelConstants from './calculator/jewelConstants';
import * as mainConstants from './calculator/mainConstants';
import * as runeConstants from './calculator/runeConstants';
import * as spUpgradeConstants from './calculator/spUpgradeConstants';
import * as unitConstants from './calculator/unitConstants';
import { eunaGuides } from './guides';

export const eunaVersionConfig = {
  id: 'euna',
  label: 'EUNA',
  name: 'Lottery Defense EUNA',
  status: 'working',
  guides: eunaGuides,
  calculator: {
    ...mainConstants,
    ...jewelConstants,
    ...runeConstants,
    ...spUpgradeConstants,
    unitLibrary: unitConstants.UNIT_LIBRARY,
  },
};
