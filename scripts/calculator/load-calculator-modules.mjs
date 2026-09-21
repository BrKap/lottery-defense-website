import { createServer } from 'vite';

// Use the application's Vite resolver (extensionless imports and image globs),
// without starting an HTTP listener or changing production modules for tests.
export async function withCalculatorModules(callback) {
  const server = await createServer({
    configFile: false,
    logLevel: 'error',
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  });
  try {
    const [stats, upgrades, runes, helpers, units, keys] = await Promise.all([
      server.ssrLoadModule('/src/core/calculator/statCalculator.js'),
      server.ssrLoadModule('/src/data/euna/calculator/spUpgradeConstants.js'),
      server.ssrLoadModule('/src/data/euna/calculator/runeConstants.js'),
      server.ssrLoadModule('/src/core/calculator/spUpgradeHelpers.js'),
      server.ssrLoadModule('/src/data/euna/calculator/unitConstants.js'),
      server.ssrLoadModule('/src/core/calculator/statKeys.js'),
    ]);
    const [configModule, state, jewels, entries] = await Promise.all([
      server.ssrLoadModule('/src/data/euna/index.js'),
      server.ssrLoadModule('/src/core/calculator/calculatorState.js'),
      server.ssrLoadModule('/src/core/calculator/jewelHelpers.js'),
      server.ssrLoadModule('/src/core/calculator/createUnitEntry.js'),
    ]);
    const scenario = await server.ssrLoadModule('/src/core/calculator/scenarioCalculator.js');
    return await callback({ stats, upgrades, runes, helpers, units, keys, config: configModule.eunaVersionConfig.calculator, state, jewels, entries, scenario, loadModule: path => server.ssrLoadModule(path) });
  } finally {
    await server.close();
  }
}
