/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { DILEMMAS } from './data/dilemmas.ts';
import { Decision, PlayerHistoryEntry } from './types.ts';
import { TrolleyHeader } from './components/TrolleyHeader.tsx';
import { TrolleyCanvas } from './components/TrolleyCanvas.tsx';
import { TrolleyControls } from './components/TrolleyControls.tsx';
import { ResultOverlay } from './components/ResultOverlay.tsx';
import { SummaryScreen } from './components/SummaryScreen.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import {
  getSoundEnabled,
  setSoundEnabled,
  startMusicBed,
  playSonicSignatureMotif,
  playPremiumTransition,
  playLeverSnap,
  playDecisionWhoosh,
  playRevealChime,
  playHoverTick,
  playSoftTick,
} from './utils/audio.ts';

type GameState = 'TITLE' | 'PLAYING' | 'SUMMARY';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Dilemmas read as "setup. question?" — splitting them lets the question
 * carry the visual weight instead of one undifferentiated paragraph.
 */
const splitQuestion = (question: string): { setup: string; ask: string } => {
  const normalized = question.trim();
  const inner = normalized.endsWith('?') ? normalized.slice(0, -1) : normalized;
  const cut = inner.lastIndexOf('. ');
  const colon = inner.lastIndexOf(': ');

  if (cut > 20 && cut > colon) {
    return { setup: `${inner.slice(0, cut + 1)}`, ask: `${inner.slice(cut + 2)}?` };
  }
  if (colon > 20) {
    return { setup: '', ask: normalized };
  }
  return { setup: '', ask: normalized };
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [leverPulled, setLeverPulled] = useState<boolean>(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [history, setHistory] = useState<PlayerHistoryEntry[]>([]);
  const [soundEnabled, setSoundState] = useState<boolean>(() => getSoundEnabled());
  const lastHoverRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const startOnFirstGesture = () => {
      if (getSoundEnabled()) startMusicBed();
      window.removeEventListener('pointerdown', startOnFirstGesture);
      window.removeEventListener('keydown', startOnFirstGesture);
    };
    window.addEventListener('pointerdown', startOnFirstGesture);
    window.addEventListener('keydown', startOnFirstGesture);
    return () => {
      window.removeEventListener('pointerdown', startOnFirstGesture);
      window.removeEventListener('keydown', startOnFirstGesture);
    };
  }, []);

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || !target.closest?.('[data-hover-sound]')) return;
      const now = performance.now();
      if (now - lastHoverRef.current < 140) return;
      lastHoverRef.current = now;
      playHoverTick();
    };
    document.addEventListener('mouseover', onOver);
    return () => document.removeEventListener('mouseover', onOver);
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundState(next);
    setSoundEnabled(next);
    playSoftTick(next ? 1 : 0);
  }, [soundEnabled]);

  const currentDilemma = DILEMMAS[currentStep] || DILEMMAS[0];

  const handleStart = useCallback(() => {
    startMusicBed();
    playSonicSignatureMotif();
    playPremiumTransition();
    setGameState('PLAYING');
  }, []);

  const handleLeverToggle = useCallback(() => {
    if (isAnimating || showResult) return;
    setLeverPulled((prev) => {
      playLeverSnap();
      return !prev;
    });
  }, [isAnimating, showResult]);

  const handleMakeDecision = useCallback(
    (dec: Decision) => {
      if (isAnimating || showResult) return;

      if (dec === 'diverted' && !leverPulled) {
        setLeverPulled(true);
        playLeverSnap();
      } else if (dec === 'straight' && leverPulled) {
        setLeverPulled(false);
        playLeverSnap();
      }

      playDecisionWhoosh();
      setDecision(dec);
      setIsAnimating(true);
      setShowResult(false);
    },
    [isAnimating, showResult, leverPulled]
  );

  const handleAnimationEnd = useCallback(() => {
    setIsAnimating(false);
    setShowResult(true);
    playRevealChime();

    const chosenTrack =
      decision === 'diverted'
        ? currentDilemma.divertedTrack
        : currentDilemma.straightTrack;

    const entry: PlayerHistoryEntry = {
      dilemmaId: currentDilemma.id,
      decision: decision || 'straight',
      leverPulled: decision === 'diverted',
      victimsLabel: chosenTrack.label,
      humanDeaths: chosenTrack.isHuman ? chosenTrack.count : 0,
      materialDamageTL: chosenTrack.monetaryValueTL || 0,
    };

    setHistory((prev) => [...prev, entry]);
  }, [decision, currentDilemma]);

  const handleNextDilemma = useCallback(() => {
    playPremiumTransition();
    if (currentStep < DILEMMAS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setDecision(null);
      setLeverPulled(false);
      setShowResult(false);
      setIsAnimating(false);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setGameState('SUMMARY');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleRestart = useCallback(() => {
    playPremiumTransition();
    setCurrentStep(0);
    setDecision(null);
    setLeverPulled(false);
    setShowResult(false);
    setIsAnimating(false);
    setHistory([]);
    setGameState('TITLE');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const totalDeaths = history.reduce((sum, h) => sum + h.humanDeaths, 0);

  /** Stage a route without committing to a decision (mirrors the physical lever). */
  const onSelectRoute = useCallback(
    (route: Decision) => {
      if (isAnimating || showResult) return;
      const next = route === 'diverted';
      if (next === leverPulled) return;
      setLeverPulled(next);
      playLeverSnap();
    },
    [isAnimating, showResult, leverPulled]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (gameState === 'TITLE' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleStart();
      } else if (gameState === 'PLAYING') {
        if (showResult && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleNextDilemma();
        } else if (!isAnimating && !showResult) {
          if (e.key === '1' || e.key === 'ArrowLeft') {
            handleMakeDecision('straight');
          } else if (e.key === '2' || e.key === 'ArrowRight') {
            handleMakeDecision('diverted');
          } else if (e.key === ' ' || e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            handleLeverToggle();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    showResult,
    isAnimating,
    handleNextDilemma,
    handleMakeDecision,
    handleLeverToggle,
    toggleSound,
    handleStart,
  ]);

  const screenMotion = reduceMotion
    ? { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.5, ease: EASE },
      };

  const stepMotion = reduceMotion
    ? { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.42, ease: EASE },
      };

  const controlMotion = reduceMotion
    ? { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.36, ease: EASE },
      };

  const { setup, ask } = splitQuestion(currentDilemma.question);
  const chapterTitle = currentDilemma.title.replace(/^\s*\d+\.\s*İkilem:\s*/i, '');

  return (
    <div className="app-shell">
      <div className="spotlight-layer" aria-hidden="true" />
      <div className="paper-grain-overlay" aria-hidden="true" />

      <TrolleyHeader
        currentStep={currentStep}
        totalSteps={DILEMMAS.length}
        totalDeaths={totalDeaths}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onRestart={handleRestart}
        isPlaying={gameState === 'PLAYING'}
      />

      <main className="screen-main">
        <div className="stage">
          <AnimatePresence mode="wait" initial={false}>
            {gameState === 'TITLE' && (
              <motion.div key="title" {...screenMotion} className="w-full">
                <TitleScreen onStart={handleStart} />
              </motion.div>
            )}

            {gameState === 'PLAYING' && (
              <motion.div key="playing" {...screenMotion} className="w-full">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={currentStep} {...stepMotion} className="w-full">
                    <section className="q">
                      <div className="q__topline">
                        <span className="q__step">
                          İkilem{' '}
                          <b className="numeral">
                            {String(currentStep + 1).padStart(2, '0')}
                          </b>
                          <span style={{ color: 'var(--ink-faint)' }}>
                            / {DILEMMAS.length}
                          </span>
                        </span>
                        <span className="q__chapter">{chapterTitle}</span>
                      </div>

                      <h1 className="q__title" aria-live="polite">
                        {setup && <span className="q__setup">{setup} </span>}
                        <span className="q__ask">{ask}</span>
                      </h1>

                      {currentDilemma.conceptualChoice && (
                        <p className="q__note">
                          <span aria-hidden="true" style={{ color: 'var(--ochre)' }}>
                            ●
                          </span>
                          <span>
                            Sahne seçimleri sembolik olarak gösterir; sonuçlar yukarıdaki
                            senaryoya göredir.
                          </span>
                        </p>
                      )}
                    </section>

                    <div className="board">
                      <div className="board__head">
                        <span>
                          <span className="board__id">Plan {String(currentStep + 1).padStart(2, '0')}</span>
                          {' · '}Makas Şeması
                        </span>
                        <span className="board__hint">[Boşluk] makası çevir</span>
                      </div>

                      <div className="board__stage">
                        <TrolleyCanvas
                          dilemma={currentDilemma}
                          decision={decision}
                          isAnimating={isAnimating}
                          onAnimationEnd={handleAnimationEnd}
                          leverPulled={leverPulled}
                          onLeverToggle={handleLeverToggle}
                        />
                      </div>

                      <div className="board__legend">
                        <span className="legend-item">
                          <span className="legend-swatch" aria-hidden="true" />
                          Düz hat
                        </span>
                        <span className="legend-item">
                          <span className="legend-swatch legend-swatch--alt" aria-hidden="true" />
                          Makas hattı
                        </span>
                        <span className="legend-state">
                          Aktif: {leverPulled ? 'Makas' : 'Düz'}
                        </span>
                      </div>

                      <div className="routes">
                        <button
                          type="button"
                          onClick={() => onSelectRoute('straight')}
                          disabled={isAnimating}
                          title={currentDilemma.straightTrack.label}
                          data-hover-sound
                          className={`route ${!leverPulled ? 'route--active' : ''}`}
                        >
                          <span className="route__tick" aria-hidden="true" />
                          <span className="route__body">
                            <span className="route__kicker">
                              <span className="route__dot" aria-hidden="true" />
                              Düz hat
                            </span>
                            <span className="route__name">{currentDilemma.straightTrack.label}</span>
                          </span>
                          <span className="route__count numeral">
                            ×{currentDilemma.straightTrack.count}
                            <span>{currentDilemma.straightTrack.count === 1 ? 'hedef' : 'canlı'}</span>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectRoute('diverted')}
                          disabled={isAnimating}
                          title={currentDilemma.divertedTrack.label}
                          data-hover-sound
                          className={`route route--alt ${leverPulled ? 'route--active' : ''}`}
                        >
                          <span className="route__tick" aria-hidden="true" />
                          <span className="route__body">
                            <span className="route__kicker">
                              <span className="route__dot" aria-hidden="true" />
                              Makas hattı
                            </span>
                            <span className="route__name">{currentDilemma.divertedTrack.label}</span>
                          </span>
                          <span className="route__count numeral">
                            ×{currentDilemma.divertedTrack.count}
                            <span>{currentDilemma.divertedTrack.count === 1 ? 'hedef' : 'canlı'}</span>
                          </span>
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      {!showResult ? (
                        <motion.div key="controls" {...controlMotion} className="w-full">
                          <TrolleyControls
                            dilemma={currentDilemma}
                            onMakeDecision={handleMakeDecision}
                            disabled={isAnimating}
                            leverPulled={leverPulled}
                          />
                        </motion.div>
                      ) : (
                        <motion.div key="result" {...controlMotion} className="w-full">
                          <ResultOverlay
                            dilemma={currentDilemma}
                            decision={decision || 'straight'}
                            onNext={handleNextDilemma}
                            isLast={currentStep === DILEMMAS.length - 1}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}

            {gameState === 'SUMMARY' && (
              <motion.div key="summary" {...screenMotion} className="w-full">
                <SummaryScreen history={history} onRestart={handleRestart} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <span className="site-footer__brand">Absürt Tramvay İkilemleri · Türkçe</span>
          <span className="kbd-row">
            <span className="legend-item">
              <span className="kbd">1</span> düz hat
            </span>
            <span className="legend-item">
              <span className="kbd">2</span> makas
            </span>
            <span className="legend-item">
              <span className="kbd">␣</span> kolu çek
            </span>
            <span className="legend-item">
              <span className="kbd">M</span> ses
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
