import { eunaVersionConfig } from './euna';
import { krVersionConfig } from './kr';

export const versionConfigs = {
  [eunaVersionConfig.id]: eunaVersionConfig,
  [krVersionConfig.id]: krVersionConfig,
};

export const versionList = Object.values(versionConfigs);

export function getVersionConfig(versionId) {
  return versionConfigs[versionId] ?? null;
}
