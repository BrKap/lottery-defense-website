import React from 'react';
import { useCalculatorConfig } from '../../../../core/calculator/CalculatorConfigContext';
import { InfoRow, MiniStat } from '../../../../components/common/Stats';

function SelectValue({
  value,
  options,
  onChange,
  className = '',
}) {
  return (
    <select
      className={`rune-panel-select ${className}`.trim()}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => {
        const normalized = typeof option === 'string'
          ? { value: option, label: option }
          : option;

        return (
          <option key={normalized.value} value={normalized.value}>
            {normalized.label}
          </option>
        );
      })}
    </select>
  );
}

function DisplayValue({ value, className = '', placeholder = '-' }) {
  const displayValue = value === undefined || value === null || value === ''
    ? placeholder
    : value;

  return (
    <div className={`rune-display-value ${className}`.trim()}>
      {displayValue}
    </div>
  );
}

function getRuneLayout(runeType, runeLayouts) {
  const normalizedType = (runeType || 'cosmos').toLowerCase();
  return runeLayouts[normalizedType] ?? runeLayouts.cosmos;
}

function getRuneIcon(runeType, runeIconByType) {
  const normalizedType = (runeType || 'cosmos').toLowerCase();
  return runeIconByType[normalizedType] ?? '';
}

function normalizeRuneData(runeData, createEmptyRuneData, runeSlots) {
  return {
    ...createEmptyRuneData(runeData?.slot ?? runeSlots[0]?.value),
    ...(runeData ?? {}),
  };
}

function RunePanelFrame({
  runeData,
  editable,
  onFieldChange,
  slotValue,
  onSlotChange,
  showSlotDropdown = true,
  variant = 'editor',
}) {
  const { calculator } = useCalculatorConfig();
  const {
    RUNE_AWAKENING_OPTIONS,
    RUNE_BONUS_FIFTEEN_OPTIONS,
    RUNE_BONUS_TEN_OPTIONS,
    RUNE_TRAN_OPTIONS,
    RUNE_ENCHANT_LEVEL_OPTIONS,
    RUNE_ENCHANT_ROWS,
    RUNE_ICON_BY_TYPE,
    RUNE_LAYOUTS,
    RUNE_LEVEL_OPTIONS,
    RUNE_RACE_UPGRADE_OPTIONS,
    RUNE_SLOTS,
    RUNE_TYPES,
    createEmptyRuneData,
    getRuneBaseOptions,
    getRunePinkOptions,
    getRuneYellowValue,
    getRuneEnchantDisplayValue,
  } = calculator;
  const normalizedRune = normalizeRuneData(runeData, createEmptyRuneData, RUNE_SLOTS);
  const runeType = (normalizedRune.runeType || 'cosmos').toLowerCase();
  const runeLayout = getRuneLayout(runeType, RUNE_LAYOUTS);
  const runeIcon = getRuneIcon(runeType, RUNE_ICON_BY_TYPE);

  const renderCell = (
    field,
    options,
    editableClassName = '',
    displayClassName = '',
    fallback = '-'
  ) => {
    if (editable) {
      return (
        <SelectValue
          value={normalizedRune[field]}
          options={options}
          onChange={(value) => onFieldChange(field, value)}
          className={editableClassName}
        />
      );
    }

    const value = normalizedRune[field];
    return (
      <DisplayValue
        value={value}
        className={displayClassName}
        placeholder={fallback}
      />
    );
  };

  return (
    <div className={`rune-panel-frame rune-panel-frame--${variant}`}>
      <div className="rune-panel-top">
        <div className="rune-slot-box">
          <span className="rune-slot-label">Slot</span>

          {showSlotDropdown ? (
            <SelectValue
              value={slotValue ?? normalizedRune.slot}
              options={RUNE_SLOTS}
              onChange={onSlotChange}
              className="rune-slot-select"
            />
          ) : (
            <div className="rune-slot-static">
              {RUNE_SLOTS.find((slot) => slot.value === (slotValue ?? normalizedRune.slot))?.label ?? '-'}
            </div>
          )}
        </div>

        <div className="rune-icon-box">
          <div className="rune-icon-shell">
            {runeIcon ? (
              <img src={runeIcon} alt={runeType} className="rune-icon-image" />
            ) : (
              <div className="rune-icon-fallback">{runeType}</div>
            )}
          </div>
        </div>
      </div>

      <div className="rune-meta-grid">
        <div className="rune-meta-cell">
          <span className="rune-meta-label">Rune Type</span>
          {editable ? (
            <SelectValue
              value={runeType}
              options={RUNE_TYPES}
              onChange={(value) => onFieldChange('runeType', value)}
              className="rune-white-select"
            />
          ) : (
            <DisplayValue value={runeType} className="rune-white-display" />
          )}
        </div>

        <div className="rune-meta-cell">
          <span className="rune-meta-label">Rune Lvl</span>
          {renderCell(
            'runeLevel',
            RUNE_LEVEL_OPTIONS,
            'rune-white-select',
            'rune-white-display'
          )}
        </div>

        <div className="rune-meta-cell">
          <span className="rune-meta-label">Awakening</span>
          {renderCell(
            'runeAwakening',
            RUNE_AWAKENING_OPTIONS,
            'rune-cyan-select',
            'rune-cyan-display'
          )}
        </div>
      </div>

      <div className="rune-primary-grid">
        {runeLayout.primaryRows.map((row) => (
          <div key={row.id} className="rune-stat-row">
            <div className="rune-stat-label">{row.label}</div>

            <div className="rune-stat-col">
              {renderCell(
                row.baseField,
                getRuneBaseOptions(row.statKey),
                'rune-white-select',
                'rune-white-display'
              )}
            </div>

            <div className="rune-stat-col rune-yellow-value">
              {row.hasLevelYellowBonus
                ? getRuneYellowValue(row.statKey, normalizedRune.runeLevel)
                : '-'}
            </div>

            <div className="rune-stat-col">
              {row.pinkEnabled && row.bonusField ? (
                renderCell(
                  row.bonusField,
                  getRunePinkOptions(row.statKey),
                  'rune-pink-select',
                  'rune-pink-display'
                )
              ) : (
                <span className="rune-empty-cell">-</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rune-bonus-grid">
        <div className="rune-bonus-row">
          <div className="rune-bonus-label rune-green-text">Race Upgrade +1</div>
          {renderCell(
            'runeRaceUpgrade',
            RUNE_RACE_UPGRADE_OPTIONS,
            'rune-green-select',
            'rune-green-display'
          )}
        </div>

        <div className="rune-bonus-row">
          <div className="rune-bonus-label rune-yellow-text">+10 bonus</div>
          {renderCell(
            'runeBonusTen',
            RUNE_BONUS_TEN_OPTIONS,
            'rune-yellow-select',
            'rune-yellow-display'
          )}
        </div>

        <div className="rune-bonus-row">
          <div className="rune-bonus-label rune-yellow-text">+15 bonus</div>
          {renderCell(
            'runeBonusFifteen',
            RUNE_BONUS_FIFTEEN_OPTIONS,
            'rune-yellow-select',
            'rune-yellow-display'
          )}
        </div>

        <div className="rune-bonus-row">
          <div className="rune-bonus-label rune-yellow-text">@tran</div>
          {renderCell(
            'runeTran',
            RUNE_TRAN_OPTIONS,
            'rune-yellow-select',
            'rune-yellow-display'
          )}
        </div>
      </div>



      <div className="rune-enchant-section">
        <div className="rune-enchant-title">Enchant</div>

        {RUNE_ENCHANT_ROWS.map((row) => (
          <div key={row.id} className="rune-enchant-row">
            <div className="rune-enchant-label">{row.label}</div>

            <div className="rune-enchant-level">
              {renderCell(
                row.field,
                RUNE_ENCHANT_LEVEL_OPTIONS,
                'rune-pink-select',
                'rune-pink-display'
              )}
            </div>

            <div className="rune-enchant-value">
              {getRuneEnchantDisplayValue(row.valueKey, normalizedRune[row.field])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RuneSummaryCard({ settings, updateSetting, runeData }) {
  return (
    <section className="card sidebar-card rune-panel-card rune-panel-card--summary">
      <RunePanelFrame
        runeData={runeData}
        editable={false}
        slotValue={settings.runeSlot}
        onSlotChange={(value) => updateSetting('runeSlot', value)}
        showSlotDropdown={true}
        variant="summary"
      />
    </section>
  );
}

export function RuneEditorCard({ runeData, onFieldChange, slotDisplayValue }) {
  return (
    <article className="card rune-panel-card rune-panel-card--editor">
      <RunePanelFrame
        runeData={runeData}
        editable={true}
        onFieldChange={onFieldChange}
        slotValue={slotDisplayValue ?? runeData.slot}
        onSlotChange={() => {}}
        showSlotDropdown={false}
        variant="editor"
      />
    </article>
  );
}

export function BuffPreviewCard() {
  return (
    <section className="card sidebar-card">
      <h3>Buff Preview</h3>
      <div className="sidebar-list-grid">
        <InfoRow label="Full Team Buff" value="2" />
        <InfoRow label="Bless" value="1" />
        <InfoRow label="SD Gem" value="None" />
      </div>
    </section>
  );
}

export function BuildMetaCard({ units }) {
  return (
    <section className="card sidebar-card">
      <h3>Build Snapshot</h3>
      <div className="tag-list">
        {units.map((unit) => (
          <span className="tag-pill" key={unit.entryId}>
            {unit.name}
          </span>
        ))}
      </div>
    </section>
  );
}

export function CreepStatsCard() {
  return (
    <section className="card sidebar-card">
      <h3>Enemy Creep Stats</h3>
      <div className="sidebar-list-grid creep-stats-grid">
        <InfoRow label="Shield / HP" value="50000" />
        <InfoRow label="Armor" value="216" />
        <InfoRow label="Shield Armor" value="88" />
      </div>
    </section>
  );
}

export function UnitRecipeCostCard() {
  const recipeGroups = [
    {
      id: 'terran-bio',
      rows: [
        { label: 'Marine', value: 0, tone: 'blue' },
        { label: 'Ghost', value: 0, tone: 'blue' },
        { label: 'Marauder', value: 0, tone: 'blue' },
      ],
    },
    {
      id: 'terran-mech',
      rows: [
        { label: 'Goliath', value: 0, tone: 'blue' },
        { label: 'Diamond', value: 0, tone: 'blue' },
        { label: 'Tank', value: 0, tone: 'blue' },
      ],
    },
    {
      id: 'protoss',
      rows: [
        { label: 'Zealot', value: 0, tone: 'yellow' },
        { label: 'Templar', value: 0, tone: 'yellow' },
        { label: 'Archon', value: 0, tone: 'yellow' },
      ],
    },
    {
      id: 'protoss-advanced',
      rows: [
        { label: 'Sentry', value: 0, tone: 'orange' },
        { label: 'Stalker', value: 0, tone: 'orange' },
        { label: 'Immortal', value: 0, tone: 'orange' },
      ],
    },
    {
      id: 'zerg',
      rows: [
        { label: 'Roach', value: 0, tone: 'red' },
        { label: 'Lurker', value: 0, tone: 'red' },
        { label: 'Hydralisk', value: 0, tone: 'red' },
      ],
    },
  ];

  return (
    <section className="card sidebar-card">
      <h3>Unit Recipe Cost</h3>

      <div className="recipe-total-row">
        <span>Total Unit Cost</span>
        <strong>0</strong>
      </div>

      <div className="recipe-groups">
        {recipeGroups.map((group) => (
          <div key={group.id} className="recipe-group-box">
            {group.rows.map((row) => (
              <div key={row.label} className="recipe-row">
                <span className={`recipe-label ${row.tone}`}>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
