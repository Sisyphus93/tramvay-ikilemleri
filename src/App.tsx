/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  playTinyClick,
  playPaperSwish,
  startMusicBed,
} from './utils/audio.ts';

type GameState = 'TITLE' | 'PLAYING' | 'SUMMARY';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [leverPulled, setLeverPulled] = useState<boolean>(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [history, setHistory] = useState<PlayerHistoryEntry[]>([]);

  // Sound state
  const [soundEnabled, setSoundState] = useState<boolean>(() => getSoundEnabled());

  // Ensure dark mode is completely removed per user request
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('tramvay_theme');
    } catch {
      // Ignore
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundState(next);
    setSoundEnabled(next);
  };

  const currentDilemma = DILEMMAS[currentStep] || DILEMMAS[0];

  // Lever mechanical toggle
  const handleLeverToggle = useCallback(() => {
    if (isAnimating || showResult) return;
    setLeverPulled((prev) => {
      playTinyClick();
      return !prev;
    });
  }, [isAnimating, showResult]);

  // Make decision
  const handleMakeDecision = useCallback(
    (dec: Decision) => {
      if (isAnimating || showResult) return;

      if (dec === 'diverted' && !leverPulled) {
        setLeverPulled(true);
        playTinyClick();
      } else if (dec === 'straight' && leverPulled) {
        setLeverPulled(false);
        playTinyClick();
      }

      setDecision(dec);
      setIsAnimating(true);
      setShowResult(false);
    },
    [isAnimating, showResult, leverPulled]
  );

  // Triggered when tram arrives at obstacle
  const handleAnimationEnd = useCallback(() => {
    setIsAnimating(false);
    setShowResult(true);

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

  // Next dilemma
  const handleNextDilemma = useCallback(() => {
    playPaperSwish();
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

  // Restart game cleanly without page reload
  const handleRestart = useCallback(() => {
    playPaperSwish();
    setCurrentStep(0);
    setDecision(null);
    setLeverPulled(false);
    setShowResult(false);
    setIsAnimating(false);
    setHistory([]);
    setGameState('TITLE');
  }, []);

  const totalDeaths = history.reduce((sum, h) => sum + h.humanDeaths, 0);

  // Keyboard controls (Space/Enter for next, 1/2 for choice)
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
  ]);

  return (
    <div className="min-h-screen bg-[#F4EDDF] text-[#2A2520] flex flex-col font-sans transition-colors duration-200 relative">
      {/* Static Paper Grain Overlay (Section 4: 4-6% opacity, never animated) */}
      <div className="paper-grain-overlay" aria-hidden="true" />

      {/* Universal Top Bar */}
      <TrolleyHeader
        currentStep={currentStep}
        totalSteps={DILEMMAS.length}
        totalDeaths={totalDeaths}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onRestart={handleRestart}
        isPlaying={gameState === 'PLAYING'}
      />

      {/* Main Content Arena */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-6 max-w-5xl w-full mx-auto relative z-10">
        {gameState === 'TITLE' && (
          <TitleScreen onStart={() => setGameState('PLAYING')} />
        )}

        {gameState === 'PLAYING' && (
          <div className="w-full max-w-4xl space-y-4">
            {/* Dilemma Title & Question */}
            <div className="text-center space-y-1.5 max-w-2xl mx-auto">
              <h3 className="text-xs sm:text-sm font-bold text-[#D5472F] uppercase tracking-wider font-label">
                {currentDilemma.title}
              </h3>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2A2520] font-headline">
                {currentDilemma.question}
              </h2>
            </div>

            {currentDilemma.conceptualChoice && (
              <p className="text-center text-xs text-[#6B6154]">Sahne seçimleri sembolik olarak gösterir; sonuçlar yukarıdaki senaryoya göredir.</p>
            )}

            {/* Warm Paper Hand-inked SVG Scene */}
            <TrolleyCanvas
              dilemma={currentDilemma}
              decision={decision}
              isAnimating={isAnimating}
              onAnimationEnd={handleAnimationEnd}
              leverPulled={leverPulled}
              onLeverToggle={handleLeverToggle}
            />

            {/* Decision Controls or Result Overlay */}
            {!showResult ? (
              <TrolleyControls
                dilemma={currentDilemma}
                onMakeDecision={handleMakeDecision}
                disabled={isAnimating}
                leverPulled={leverPulled}
                onLeverToggle={handleLeverToggle}
              />
            ) : (
              <ResultOverlay
                dilemma={currentDilemma}
                decision={decision || 'straight'}
                onNext={handleNextDilemma}
                isLast={currentStep === DILEMMAS.length - 1}
              />
            )}
          </div>
        )}

        {gameState === 'SUMMARY' && (
          <SummaryScreen history={history} onRestart={handleRestart} />
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="w-full py-4 border-t-2 border-[#2A2520] bg-[#F4EDDF] text-center text-xs text-[#6B6154] relative z-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-headline">
            Absürt Tramvay İkilemleri · Türkçe
          </span>
          <span className="font-label text-[11px] text-[#6B6154]">
            [1] DÜZ · [2] MAKAS · [BOŞLUK] KOLU ÇEK
          </span>
        </div>
      </footer>
    </div>
  );
}
