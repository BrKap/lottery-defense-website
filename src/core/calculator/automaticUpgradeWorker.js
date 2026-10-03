import { optimizeUpgrades } from './automaticUpgradeOptimizer';

const cancelled = new Set();

self.onmessage = async ({ data }) => {
  const { type, runId, payload } = data ?? {};
  if (type === 'cancel') { cancelled.add(runId); return; }
  if (type !== 'optimize') return;
  cancelled.delete(runId);
  try {
    const result = await optimizeUpgrades(payload, {
      shouldCancel: () => cancelled.has(runId),
      onProgress: progress => self.postMessage({ type: 'progress', runId, progress }),
    });
    self.postMessage({ type: 'result', runId, result });
  } catch (error) {
    self.postMessage({ type: 'error', runId, error: error instanceof Error ? error.message : String(error) });
  } finally {
    cancelled.delete(runId);
  }
};
