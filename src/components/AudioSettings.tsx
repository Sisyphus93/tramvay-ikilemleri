/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
  getAmbienceEnabled,
  getAmbienceVolume,
  getSfxEnabled,
  getSfxVolume,
  setAmbienceEnabled,
  setAmbienceVolume,
  setSfxEnabled,
  setSfxVolume,
  playLevelTick,
  unlockAudio,
} from '../utils/audio.ts';

/**
 * The one audio control that is not the master mute: a compact popover with a
 * row each for the background bed and the effects. It overlays the page (it
 * must not move anything in the one-screen layout) and every value it shows is
 * read back from the engine, so it is correct after a reopen and a reload.
 */

interface RowProps {
  label: string;
  enabled: boolean;
  volume: number;
  onToggle: (next: boolean) => void;
  onVolume: (next: number) => void;
  /** fired once, on release, so a drag does not machine-gun the preview */
  onCommit?: () => void;
}

const percentOf = (volume: number): number => Math.round(volume * 100);

const Row: React.FC<RowProps> = ({ label, enabled, volume, onToggle, onVolume, onCommit }) => {
  const pct = percentOf(volume);

  /**
   * One commit tick per interaction, not per event.
   *
   * pointerup, keyup and blur all mean "the user finished adjusting", and a
   * single adjustment fires more than one of them: release a drag and then click
   * somewhere else (pointerup + blur), or press an arrow key and then Tab away
   * (keyup + blur). All three used to call onCommit unconditionally, so one
   * adjustment ticked twice.
   *
   * The flag is cleared when a new interaction starts (pointerdown, keydown,
   * focus), so two genuinely separate adjustments still tick twice.
   */
  const committedRef = useRef(false);
  const beginInteraction = useCallback(() => {
    committedRef.current = false;
  }, []);
  const commit = useCallback(() => {
    if (!onCommit || committedRef.current) return;
    committedRef.current = true;
    onCommit();
  }, [onCommit]);

  return (
    <div className="audio-settings__row">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${label} sesi`}
        title={enabled ? `${label}: açık` : `${label}: kapalı`}
        onClick={() => onToggle(!enabled)}
        className={`audio-settings__switch ${enabled ? 'audio-settings__switch--on' : ''}`}
      >
        <span className="audio-settings__knob" aria-hidden="true" />
      </button>

      <span className="audio-settings__label">{label}</span>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        aria-label={`${label} düzeyi`}
        // No aria-valuetext here. It said "41%" while the span immediately to the
        // right of this slider visibly says "41%", and a range input already
        // exposes its value, so reading the row announced the same number twice.
        onPointerDown={beginInteraction}
        onKeyDown={beginInteraction}
        onFocus={beginInteraction}
        onChange={(event) => onVolume(Number(event.target.value) / 100)}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="audio-settings__slider"
      />

      <span className="audio-settings__pct numeral">{pct}%</span>
    </div>
  );
};

export const AudioSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [ambienceEnabled, setAmbience] = useState<boolean>(() => getAmbienceEnabled());
  const [ambienceVolume, setAmbienceLevel] = useState<number>(() => getAmbienceVolume());
  const [sfxEnabled, setEffects] = useState<boolean>(() => getSfxEnabled());
  const [sfxVolume, setEffectsLevel] = useState<number>(() => getSfxVolume());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  /** set between a pointerdown inside the widget and the pointerup/focusin that follows it */
  const pointerInsideRef = useRef(false);
  const pointerBackstopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** re-read the engine state every time it opens (M / other tabs may have moved it) */
  const openPanel = useCallback(() => {
    setAmbience(getAmbienceEnabled());
    setAmbienceLevel(getAmbienceVolume());
    setEffects(getSfxEnabled());
    setEffectsLevel(getSfxVolume());
    setOpen(true);
  }, []);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, close]);

  // Close when focus leaves the whole widget. Without this, Tab walks out of the
  // panel into the page behind it while the panel stays open and keeps covering
  // content. focusout bubbles, and relatedTarget says where focus went, so a move
  // between the panel's own controls is not a leave.
  //
  // relatedTarget alone is not enough, because it is null whenever focus went
  // nowhere in particular. That includes two presses that start *inside* the widget:
  //   - a mouse press on non-focusable content in the panel (a label, the percentage
  //     text, the padding), which blurs the focused control and parks focus on the
  //     document body, and
  //   - a click on a <button> in Safari and Firefox on macOS, which do not focus
  //     buttons on mousedown at all, so the previously focused control blurs to
  //     nothing.
  // Treating either as a leave dismisses the panel from under the user, and because
  // closing unmounts it the click on the toggle is lost. pointerInsideRef records
  // that a press is in flight, and the focusout handler ignores a leave while it is
  // set. Keyboard navigation never sets it, so Tab and Shift+Tab out still close.
  //
  // The flag is cleared by pointerup / pointercancel and by the next focusin inside
  // the root, plus a setTimeout(0) backstop for the presses where none of those ever
  // arrive (press inside, drag out of the window, release there). The backstop cannot
  // clear the flag too early: pointerdown and the focus change caused by the matching
  // mousedown are dispatched in the same task, so the focusout that has to be ignored
  // always runs before a queued timer can fire.
  //
  // Deliberately no aria-modal and no focus trap: this stays a non-modal popover,
  // and adding aria-modal without a trap would claim a containment that is not
  // implemented. Escape and outside-click keep working exactly as before, and
  // close(false) here does not steal focus back -- the element the user tabbed to
  // keeps it.
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    if (!root) return;

    const clearPointerFlag = () => {
      if (pointerBackstopRef.current !== null) {
        clearTimeout(pointerBackstopRef.current);
        pointerBackstopRef.current = null;
      }
      pointerInsideRef.current = false;
    };

    const onPointerDown = (event: Event) => {
      if (!(event.target instanceof Node) || !root.contains(event.target)) return;
      pointerInsideRef.current = true;
      if (pointerBackstopRef.current !== null) clearTimeout(pointerBackstopRef.current);
      pointerBackstopRef.current = setTimeout(clearPointerFlag, 0);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && root.contains(event.target)) clearPointerFlag();
    };

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && root.contains(next)) return;
      if (pointerInsideRef.current) return;
      // relatedTarget is also null when the focused node is removed from the DOM,
      // which happens as this panel unmounts. setOpen(false) is idempotent, so the
      // redundant call is harmless and no focus is taken.
      close(false);
    };

    root.addEventListener('pointerdown', onPointerDown, true);
    root.addEventListener('pointerup', clearPointerFlag, true);
    root.addEventListener('pointercancel', clearPointerFlag, true);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    return () => {
      root.removeEventListener('pointerdown', onPointerDown, true);
      root.removeEventListener('pointerup', clearPointerFlag, true);
      root.removeEventListener('pointercancel', clearPointerFlag, true);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      clearPointerFlag();
    };
  }, [open, close]);

  // first control gets focus when the popover opens
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>('button, input');
    first?.focus();
  }, [open]);

  const toggleAmbience = useCallback((next: boolean) => {
    // the first gesture is also what is allowed to create the AudioContext
    void unlockAudio();
    setAmbience(next);
    setAmbienceEnabled(next);
  }, []);

  const toggleEffects = useCallback((next: boolean) => {
    void unlockAudio();
    setEffects(next);
    setSfxEnabled(next);
    // a tick, but only when switching effects *on* and they are enabled
    if (next) playLevelTick();
  }, []);

  const changeAmbienceLevel = useCallback((next: number) => {
    setAmbienceLevel(next);
    setAmbienceVolume(next);
  }, []);

  const changeEffectsLevel = useCallback((next: number) => {
    setEffectsLevel(next);
    setSfxVolume(next);
  }, []);

  return (
    <div className="audio-settings" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        data-hover-sound
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="audio-settings-panel"
        aria-label="Ses ayarları"
        title="Ses ayarları"
        onClick={() => (open ? close(false) : openPanel())}
        className={`pill-button ${open ? 'pill-button--on' : ''}`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2.4} />
      </button>

      {open && (
        <div
          id="audio-settings-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Ses ayarları"
          className="audio-settings__panel"
        >
          <Row
            label="Arka plan"
            enabled={ambienceEnabled}
            volume={ambienceVolume}
            onToggle={toggleAmbience}
            onVolume={changeAmbienceLevel}
          />
          <Row
            label="Efektler"
            enabled={sfxEnabled}
            volume={sfxVolume}
            onToggle={toggleEffects}
            onVolume={changeEffectsLevel}
            onCommit={playLevelTick}
          />
        </div>
      )}
    </div>
  );
};
