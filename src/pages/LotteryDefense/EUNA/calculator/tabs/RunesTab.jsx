import React, { useLayoutEffect, useRef, useState } from 'react';
import { RuneEditorCard } from '../MainSidebarCards';
import { useCalculatorConfig } from '../../../../../core/calculator/CalculatorConfigContext';

export default function RunesTab({
  runeLoadouts,
  updateRuneLoadout,
  swapRuneLoadouts,
}) {
  const { calculator } = useCalculatorConfig();
  const { FLIP_DURATION_MS, RUNE_SLOTS } = calculator;

  const [draggedSlot, setDraggedSlot] = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const wrapperRefs = useRef(new Map());
  const previousPositionsRef = useRef(new Map());
  const shouldAnimateSwapRef = useRef(false);

  const setWrapperRef = (runeId, element) => {
    if (element) {
      wrapperRefs.current.set(runeId, element);
    } else {
      wrapperRefs.current.delete(runeId);
    }
  };

  const capturePositions = () => {
    const nextPositions = new Map();

    runeLoadouts.forEach((rune) => {
      const element = wrapperRefs.current.get(rune.id);
      if (!element) return;
      nextPositions.set(rune.id, element.getBoundingClientRect());
    });

    previousPositionsRef.current = nextPositions;
  };

  useLayoutEffect(() => {
    const currentPositions = new Map();

    runeLoadouts.forEach((rune) => {
      const element = wrapperRefs.current.get(rune.id);
      if (!element) return;
      currentPositions.set(rune.id, element.getBoundingClientRect());
    });

    if (!shouldAnimateSwapRef.current) {
      previousPositionsRef.current = currentPositions;
      return;
    }

    currentPositions.forEach((newRect, runeId) => {
      const oldRect = previousPositionsRef.current.get(runeId);
      const element = wrapperRefs.current.get(runeId);

      if (!oldRect || !element) return;

      const deltaX = oldRect.left - newRect.left;
      const deltaY = oldRect.top - newRect.top;

      if (deltaX === 0 && deltaY === 0) return;

      element.style.transition = 'none';
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      requestAnimationFrame(() => {
        element.style.transition =
          `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        element.style.transform = 'translate(0px, 0px)';
      });

      const handleTransitionEnd = (event) => {
        if (event.propertyName !== 'transform') return;
        element.style.transition = '';
        element.removeEventListener('transitionend', handleTransitionEnd);
      };

      element.addEventListener('transitionend', handleTransitionEnd);
    });

    previousPositionsRef.current = currentPositions;
    shouldAnimateSwapRef.current = false;
  }, [runeLoadouts]);

  return (
    <section className="tab-panel-card runes-tab-layout">
      <div className="section-heading-row card">
        <div>
          <h3>Runes</h3>
          <p>Edit all rune slots here. Drag a rune card onto another slot to swap them.</p>
        </div>
      </div>

      <div className="placeholder-config-grid rune-editor-grid">
        {RUNE_SLOTS.map((slot) => {
          const rune = runeLoadouts.find((entry) => entry.slot === slot.value);

          if (!rune) return null;

          return (
            <div
              key={slot.value}
              className={`rune-dnd-wrapper ${
                hoveredSlot === slot.value ? 'rune-drop-highlight' : ''
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                if (hoveredSlot !== slot.value) {
                  setHoveredSlot(slot.value);
                }
              }}
              onDragLeave={() => {
                if (hoveredSlot === slot.value) {
                  setHoveredSlot(null);
                }
              }}
              onDrop={() => {
                if (draggedSlot && draggedSlot !== slot.value) {
                  capturePositions();
                  shouldAnimateSwapRef.current = true;
                  swapRuneLoadouts(draggedSlot, slot.value);
                }

                setDraggedSlot(null);
                setHoveredSlot(null);
              }}
            >
              <div
                ref={(element) => setWrapperRef(rune.id, element)}
                draggable
                className={draggedSlot === slot.value ? 'rune-drag-active' : ''}
                onDragStart={() => setDraggedSlot(slot.value)}
                onDragEnd={() => {
                  setDraggedSlot(null);
                  setHoveredSlot(null);
                }}
              >
                <RuneEditorCard
                  runeData={rune}
                  slotDisplayValue={slot.value}
                  onFieldChange={(field, value) => updateRuneLoadout(rune.slot, field, value)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
