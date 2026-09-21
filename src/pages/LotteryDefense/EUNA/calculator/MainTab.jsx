import React, { useMemo } from 'react';
import { useCalculatorConfig } from '../../../../core/calculator/CalculatorConfigContext';
import { formatNumber } from '../../../../core/calculator/calculatorHelpers';
import { CheckboxField, InputField, NumberField } from '../../../../components/common/FormFields';
import { StatTile } from '../../../../components/common/Stats';
import {
  BuffPreviewCard,
  CreepStatsCard,
  RuneSummaryCard,
  UnitRecipeCostCard,
} from './MainSidebarCards';

function summarizeUnits(units) {
  const grouped = new Map();

  units.forEach((unit) => {
    const key = unit.id ?? unit.name;
    const current = grouped.get(key);

    const perUnitDps = Number(unit.mockDpsPerUnit ?? 0);
    const fullDps = perUnitDps * Number(unit.count ?? 0);

    if (current) {
      current.totalCount += Number(unit.count ?? 0);
      current.totalDps += fullDps;
      current.variants += 1;
      return;
    }

    grouped.set(key, {
      key,
      name: unit.name,
      race: unit.race,
      totalCount: Number(unit.count ?? 0),
      totalDps: fullDps,
      variants: 1,
    });
  });

  return Array.from(grouped.values()).sort((a, b) => b.totalDps - a.totalDps);
}

export default function MainTab({
  calculatorSettings,
  derivedStats,
  units,
  updateSetting,
  activeRune,
  buffs,
}) {
  const { calculator } = useCalculatorConfig();
  const {
    DIFFICULTIES,
    GAME_MODES,
    TITLES,
    CLASSIC_ROUNDS,
    TOC_FLOORS,
  } = calculator;

  const summarizedUnits = useMemo(() => {
    return summarizeUnits(units);
  }, [units]);

  return (
    <div className="calculator-main-layout">
      <aside className="calculator-sidebar left-sidebar">
        <RuneSummaryCard
          settings={calculatorSettings}
          updateSetting={updateSetting}
          runeData={activeRune}
        />
        <BuffPreviewCard buffs={buffs} tocMode={calculatorSettings.tocMode} />
      </aside>

      <div className="calculator-center-column">
        <section className="card control-panel-card">
          <div className="section-heading-row">
            <div>
              <h3>Main Settings</h3>
              <p>Primary run inputs and quick build controls.</p>
            </div>
          </div>

          <div className="control-grid">
            <InputField
              label="Title"
              value={calculatorSettings.title}
              onChange={(value) => updateSetting('title', value)}
              options={TITLES}
            />

            <InputField
              label="Difficulty"
              value={calculatorSettings.difficulty}
              onChange={(value) => updateSetting('difficulty', value)}
              options={DIFFICULTIES}
            />

            <NumberField
              label="Torment"
              value={calculatorSettings.torment}
              min={0}
              max={20}
              onChange={(value) => updateSetting('torment', value)}
            />

            <InputField
              label="Round"
              value={calculatorSettings.round}
              options={CLASSIC_ROUNDS.includes(calculatorSettings.round) ? CLASSIC_ROUNDS : [calculatorSettings.round, ...CLASSIC_ROUNDS]}
              onChange={(value) => updateSetting('round', Number(value))}
            />

            <InputField
              label="Mode"
              value={calculatorSettings.gameMode}
              onChange={(value) => updateSetting('gameMode', value)}
              options={GAME_MODES}
            />

            <NumberField
              label="XP"
              value={calculatorSettings.xp}
              min={0}
              onChange={(value) => updateSetting('xp', value)}
            />

            <NumberField
              label="Starting SP"
              value={calculatorSettings.startingSp ?? 0}
              min={0}
              onChange={(value) => updateSetting('startingSp', value)}
            />

            <NumberField
              label="The Zero Level"
              value={calculatorSettings.theZeroLevel ?? 0}
              min={0}
              max={11}
              onChange={(value) => updateSetting('theZeroLevel', value)}
            />

            <CheckboxField
              label="TOC"
              checked={calculatorSettings.tocMode}
              onChange={(checked) => updateSetting('tocMode', checked)}
            />
            <NumberField label="GP" value={calculatorSettings.gp} min={0} max={400} onChange={value => updateSetting('gp', value)} />
            {calculatorSettings.tocMode && <InputField label="ToC Floor" value={calculatorSettings.tocFloor}
              options={TOC_FLOORS.includes(calculatorSettings.tocFloor) ? TOC_FLOORS : [calculatorSettings.tocFloor, ...TOC_FLOORS]}
              onChange={value => updateSetting('tocFloor', Number(value))} />}
          </div>
        </section>

        <section className="card dps-overview-card">
          <div className="section-heading-row">
            <div>
              <h3>DPS Overview</h3>
              <p>Placeholder totals until the full formulas are added.</p>
            </div>
          </div>

          <div className="overview-stats-grid">
            <StatTile
              label="Your DPS"
              value={formatNumber(derivedStats.overallDps ?? 0)}
              accent="blue"
            />
            <StatTile
              label="Required DPS"
              value={formatNumber(derivedStats.requiredDps ?? 0)}
              accent="gold"
            />
            <StatTile
              label="Clear %"
              value={`${Number(derivedStats.completionPercent ?? 0).toFixed(2)}%`}
              accent="purple"
            />
            <StatTile
              label="Total Units"
              value={formatNumber(derivedStats.totalUnits ?? 0)}
              accent="green"
            />
          </div>
        </section>

        <section className="card unit-summary-card">
          <div className="section-heading-row">
            <div>
              <h3>Build Summary</h3>
              <p>
                Simplified overview of the current build. Detailed unit variants
                are managed in the Build Units tab.
              </p>
            </div>
          </div>

          <div className="unit-table-scroll">
            <table className="unit-table summary-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Total Count</th>
                  <th>Variants</th>
                  <th>Total DPS</th>
                </tr>
              </thead>

              <tbody>
                {summarizedUnits.map((unit) => (
                  <tr key={unit.key}>
                    <td className="unit-name-cell">{unit.name}</td>
                    <td>{formatNumber(unit.totalCount)}</td>
                    <td>{formatNumber(unit.variants)}</td>
                    <td>{formatNumber(unit.totalDps)}</td>
                  </tr>
                ))}

                {summarizedUnits.length === 0 && (
                  <tr>
                    <td colSpan="4">
                      <div className="empty-table-message">
                        No units in the build yet. Add detailed entries in the Build Units tab.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="calculator-sidebar right-sidebar">
        <CreepStatsCard />
        <UnitRecipeCostCard />
      </aside>
    </div>
  );
}
