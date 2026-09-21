import React from 'react';
import { useCalculatorConfig } from '../../../../core/calculator/CalculatorConfigContext';
import { formatCombatNumber as formatNumber } from '../../../../core/calculator/calculatorHelpers';
import { CheckboxField, InputField, NumberField } from '../../../../components/common/FormFields';
import { StatTile } from '../../../../components/common/Stats';
import {
  BuffPreviewCard,
  CreepStatsCard,
  RuneSummaryCard,
  UnitRecipeCostCard,
} from './MainSidebarCards';

export default function MainTab({
  calculatorSettings,
  derivedStats,
  units,
  updateSetting,
  activeRune,
  buffs,
  sandbox,
  additionalRune,
  scenario,
  army = { groups: [], ordinaryDps: 0, incomplete: false, uniqueUnits: 0 },
}) {
  const { calculator } = useCalculatorConfig();
  const {
    DIFFICULTIES,
    GAME_MODES,
    TITLES,
    CLASSIC_ROUNDS,
    TOC_FLOORS,
  } = calculator;

  const summarizedUnits = army.groups;

  return (
    <div className="calculator-main-layout">
      <aside className="calculator-sidebar left-sidebar">
        <RuneSummaryCard
          settings={calculatorSettings}
          updateSetting={updateSetting}
          runeData={activeRune}
        />
        <BuffPreviewCard buffs={buffs} tocMode={calculatorSettings.tocMode} title={calculatorSettings.title} sandbox={sandbox} additionalRune={additionalRune} />
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

            {calculatorSettings.tocMode ? <InputField label="ToC Floor" value={calculatorSettings.tocFloor}
              options={TOC_FLOORS.includes(calculatorSettings.tocFloor) ? TOC_FLOORS : [calculatorSettings.tocFloor, ...TOC_FLOORS]}
              onChange={value => updateSetting('tocFloor', Number(value))} /> : <InputField
              label="Round"
              value={calculatorSettings.round}
              options={CLASSIC_ROUNDS.includes(calculatorSettings.round) ? CLASSIC_ROUNDS : [calculatorSettings.round, ...CLASSIC_ROUNDS]}
              onChange={(value) => updateSetting('round', Number(value))}
            />}

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

            <InputField
              label="The Zero Level"
              value={calculatorSettings.theZeroLevel ?? 0}
              options={Array.from({ length: 12 }, (_, i) => i)}
              onChange={(value) => updateSetting('theZeroLevel', Number(value))}
            />

            <CheckboxField
              label="TOC"
              checked={calculatorSettings.tocMode}
              onChange={(checked) => updateSetting('tocMode', checked)}
            />
            <CheckboxField label="Apply unit penetration" checked={calculatorSettings.penetrationEnabled} onChange={checked => updateSetting('penetrationEnabled', checked)} />
            <NumberField label="GP" value={calculatorSettings.gp} min={0} max={400} onChange={value => updateSetting('gp', value)} />
          </div>
        </section>

        <section className="card dps-overview-card">
          <div className="section-heading-row">
            <div>
              <h3>DPS Overview</h3>
              <p>Ordinary attacks include unit and jewel modifiers. Special abilities, support uptime and final army totals are pending.</p>
            </div>
          </div>

          {army.incomplete && <p role="status">This subtotal excludes entries with pending or unavailable damage.</p>}
          {scenario.status !== 'supported' && <p role="status">{scenario.reason}</p>}
          {scenario.mode === 'ToC' && <p>ToC uses floor {scenario.enemy.round}, torment {scenario.torment.label}, and 2.5% damage inflicted. Classic difficulty and torment selections are inactive.</p>}
          <div className="overview-stats-grid">
            <StatTile
              label="Ordinary DPS subtotal"
              value={scenario.status === 'supported' ? formatNumber(army.ordinaryDps) : 'Unavailable'}
              accent="blue"
            />
            <StatTile
              label="Required DPS"
              value={derivedStats.requiredDps === null ? 'Unavailable' : formatNumber(derivedStats.requiredDps)}
              accent="gold"
            />
            <StatTile
              label="Clear %"
              value="Pending"
              accent="purple"
            />
            <StatTile label="Unique unit types" value={army.uniqueUnits} accent="green" />
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
                  <th>Ordinary DPS</th>
                </tr>
              </thead>

              <tbody>
                {summarizedUnits.map((unit) => (
                  <tr key={unit.unitId}>
                    <td className="unit-name-cell">{unit.name}</td>
                    <td>{formatNumber(unit.totalCount)}</td>
                    <td>{formatNumber(unit.variants)}</td>
                    <td>{formatNumber(unit.totalDps)}{unit.incomplete ? ' (partial)' : ''}</td>
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
        <CreepStatsCard scenario={scenario} />
        <UnitRecipeCostCard />
      </aside>
    </div>
  );
}

