import React, { useEffect, useRef, useState } from 'react';
import { DERIVED_STAT_KEYS, STAT_KEYS } from '../../../../core/calculator/statKeys';

const EDGE_PADDING = 8;

const MAIN_STAT_ROWS = [
  { key: DERIVED_STAT_KEYS.ATTACK_DAMAGE_WITH_FD, label: 'AD', suffix: '' },
  { key: STAT_KEYS.SKILL_DAMAGE, label: 'SD', suffix: '' },
  { key: STAT_KEYS.ATTACK_SPEED, label: 'AS', suffix: '' },
  { key: STAT_KEYS.CRIT_CHANCE, label: 'CC', suffix: '' },
  { key: DERIVED_STAT_KEYS.CRIT_DAMAGE_WITH_TORMENT, label: 'T(CD)', suffix: '' },
  { key: DERIVED_STAT_KEYS.AVERAGE_MULTI_CRIT, label: 'Avg MC', suffix: '' },
  { key: STAT_KEYS.ACCELERATION, label: 'UA', suffix: '' },
  { key: STAT_KEYS.ARMOR_REDUCTION, label: 'Defense Reduction', suffix: '' },
];

const EXTRA_STAT_ROWS = [
  { key: STAT_KEYS.FINAL_DAMAGE, label: 'FD', suffix: '' },
  { key: STAT_KEYS.ATTACK_DAMAGE, label: 'Raw AD', suffix: '' },
  { key: STAT_KEYS.CRIT_DAMAGE, label: 'Raw CD', suffix: '' },
  { key: STAT_KEYS.MULTI_CRIT, label: 'MC', suffix: '' },
  { key: STAT_KEYS.MULTI_TARGET_DAMAGE, label: 'MT Dmg', suffix: '' },
  { key: STAT_KEYS.MULTI_TARGET_CHANCE, label: 'MT Chance', suffix: '' },
  { key: STAT_KEYS.MULTI_TARGET_MULTI_CRIT, label: 'MT MC', suffix: '' },
  { key: STAT_KEYS.SHIELD_REDUCTION, label: 'Shield Reduction', suffix: '' },
  { key: STAT_KEYS.HEALTH_REDUCTION, label: 'Health Reduction', suffix: '' },
  { key: STAT_KEYS.COOLDOWN, label: 'CDR', suffix: '' },
  { key: STAT_KEYS.SP_PERCENT, label: 'SP %', suffix: '' },
  { key: STAT_KEYS.SP_BANK, label: 'SP Bank', suffix: '' },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatStatValue(value, suffix = '', precision = 2) {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return `0${suffix}`;
  }

  if (Number.isInteger(numericValue)) {
    return `${numericValue}${suffix}`;
  }

  return `${numericValue.toFixed(precision)}${suffix}`;
}

function getStatPrecision(statKey) {
  if (statKey === STAT_KEYS.ACCELERATION) {
    return 4;
  }

  return 2;
}

function StatsList({ rows, profileStats }) {
  return (
    <div className="floating-stats-grid">
      {rows.map((stat) => (
        <div key={stat.key} className="floating-stat-item">
          <span>{stat.label}</span>
          <strong className="floating-stat-value">
            {formatStatValue(
              profileStats?.[stat.key],
              stat.suffix,
              getStatPrecision(stat.key)
            )}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function FloatingStatsPanel({ profileStats }) {
  const wrapperRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [isMinimized, setIsMinimized] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [position, setPosition] = useState(() => ({
    x: Math.max(16, window.innerWidth - 320),
    y: 120,
  }));
  const [isDragging, setIsDragging] = useState(false);

  const getClampedPosition = (x, y) => {
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const panelWidth = wrapperRect?.width ?? 280;
    const panelHeight = wrapperRect?.height ?? 300;

    const maxX = Math.max(EDGE_PADDING, window.innerWidth - panelWidth - EDGE_PADDING);
    const maxY = Math.max(EDGE_PADDING, window.innerHeight - panelHeight - EDGE_PADDING);

    return {
      x: clamp(x, EDGE_PADDING, maxX),
      y: clamp(y, EDGE_PADDING, maxY),
    };
  };

  const handleMouseDown = (event) => {
    if (event.target.closest('button')) {
      return;
    }

    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };

    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const nextX = event.clientX - dragOffsetRef.current.x;
      const nextY = event.clientY - dragOffsetRef.current.y;

      setPosition(getClampedPosition(nextX, nextY));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => getClampedPosition(current.x, current.y));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized, showExtras]);

  useEffect(() => {
    setPosition((current) => getClampedPosition(current.x, current.y));
  }, [isMinimized, showExtras]);

  return (
    <div
      ref={wrapperRef}
      className="floating-stats-wrapper"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <section className={`floating-stats-panel ${isMinimized ? 'is-minimized' : ''}`}>
        <header className="floating-stats-header" onMouseDown={handleMouseDown}>
          <h3>Profile Stats</h3>

          <div className="floating-stats-actions">
            {!isMinimized && (
              <button
                type="button"
                className="floating-stats-toggle"
                onClick={() => setShowExtras((current) => !current)}
              >
                {showExtras ? 'Hide Extra' : 'Extra'}
              </button>
            )}

            <button
              type="button"
              className="floating-stats-toggle"
              onClick={() => setIsMinimized((current) => !current)}
            >
              {isMinimized ? '+' : '-'}
            </button>
          </div>
        </header>

        {!isMinimized && (
          <StatsList rows={MAIN_STAT_ROWS} profileStats={profileStats} />
        )}
      </section>

      {!isMinimized && showExtras && (
        <aside className="floating-stats-side-panel">
          <header className="floating-stats-side-header">
            <h4>Extra Stats</h4>
          </header>
          <StatsList rows={EXTRA_STAT_ROWS} profileStats={profileStats} />
        </aside>
      )}
    </div>
  );
}
