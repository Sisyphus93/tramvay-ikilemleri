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
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('tramvay_theme');
    } catch {
      // Ignore
    }
  }, []);

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
      if (now - lastHoverRef.current < 110) return;
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
    } else {
      setGameState('SUMMARY');
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
  }, []);

  const totalDeaths = history.reduce((sum, h) => sum + h.humanDeaths, 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleSound();
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
  ]);

  const screenMotion = reduceMotion
    ? { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -16, filter: 'blur(4px)' },
        transition: { duration: 0.72, ease: EASE },
      };

  const stepMotion = reduceMotion
    ? { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: { duration: 0.48, ease: EASE },
      };

  const controlMotion = reduceMotion
    ? { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.42, ease: EASE },
      };

  return (
    <div className="app-shell min-h-screen flex flex-col relative">
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

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="stage w-full">
          <motion.div
            key={`sheen-${gameState}`}
            className="screen-sheen"
            aria-hidden="true"
            initial={reduceMotion ? { opacity: 0 } : { x: '-135%', opacity: 0 }}
            animate={
              reduceMotion
                ? { opacity: 0 }
                : { x: '135%', opacity: [0, 0.75, 0] }
            }
            transition={reduceMotion ? { duration: 0 } : { duration: 1.25, ease: EASE }}
          />

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
                    <section className="question-card paper-card blueprint-question" aria-live="polite">
                      <div className="micro-label question-card__kicker">
                        İKİLEM <span className="numeral">{String(currentStep + 1).padStart(2, '0')}</span> / <span className="numeral">{DILEMMAS.length}</span>
                      </div>
                      <motion.div
                        key={`rule-${currentStep}`}
                        initial={reduceMotion ? {} : { scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 1, ease: EASE }}
                        className="foil-rule mx-auto max-w-xs origin-center"
                      />
                      <h3 className="micro-label mt-4 text-[#8A6222]">
                        {currentDilemma.title}
                      </h3>
                      <h2>{currentDilemma.question}</h2>
                      {currentDilemma.conceptualChoice && (
                        <p className="conceptual-note">
                          Sahne seçimleri sembolik olarak gösterir; sonuçlar yukarıdaki senaryoya göredir.
                        </p>
                      )}
                    </section>

                    <div className="canvas-frame">
                      <span className="canvas-frame__label">
                        PLAN <span className="numeral">{String(currentStep + 1).padStart(2, '0')}</span> / <span className="numeral">{DILEMMAS.length}</span> · MAKAS ŞEMASI
                      </span>
                      <span className="canvas-frame__hint">[BOŞLUK] MAKASI ÇEVİR</span>
                      <TrolleyCanvas
                        dilemma={currentDilemma}
                        decision={decision}
                        isAnimating={isAnimating}
                        onAnimationEnd={handleAnimationEnd}
                        leverPulled={leverPulled}
                        onLeverToggle={handleLeverToggle}
                      />
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

      <footer className="premium-footer">
        <div className="foil-rule w-full mb-5 opacity-60" />
        <div className="premium-footer__inner">
          <span className="font-headline text-sm text-[#E8DFCC]">
            Absürt Tramvay İkilemleri · Türkçe
          </span>
          <span className="micro-label">
            <span className="numeral">[1]</span> DÜZ · <span className="numeral">[2]</span> MAKAS · [BOŞLUK] KOLU ÇEK · [M] SES
          </span>
        </div>
      </footer>
    </div>
  );
}
