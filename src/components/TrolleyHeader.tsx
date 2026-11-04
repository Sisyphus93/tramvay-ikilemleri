/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface TrolleyHeaderProps {
  currentStep: number;
  totalSteps: number;
  totalDeaths: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRestart: () => void;
  isPlaying: boolean;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const TrolleyHeader: React.FC<TrolleyHeaderProps> = ({
  currentStep,
  totalSteps,
  totalDeaths,
  soundEnabled,
  onToggleSound,
  onRestart,
  isPlaying,
}) => {
  const reduceMotion = useReducedMotion();
  const progress = isPlaying ? ((currentStep + 1) / totalSteps) * 100 : 0;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            27
          </span>
          <span className="brand__name">
            Absürt Tramvay <em>İkilemleri</em>
          </span>
        </div>

        {isPlaying && (
          <div className="header-meters" aria-label="Oyun durumu">
            <span className="meter">
              <span className="meter__label">İkilem</span>
              <span className="meter__value numeral">
                {currentStep + 1}
                <span className="meter__total"> / {totalSteps}</span>
              </span>
            </span>
            <span className="meter__divider" />
            <span className="meter">
              <span className="meter__label">Zayiat</span>
              <span className="meter__value numeral meter__value--bad">{totalDeaths}</span>
            </span>
          </div>
        )}

        <div className="header-actions">
          <button
            onClick={onToggleSound}
            data-hover-sound
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Sesi kapat' : 'Sesi aç'}
            title={soundEnabled ? 'Ses açık (M)' : 'Sessiz (M)'}
            className={`pill-button ${soundEnabled ? 'pill-button--on' : ''}`}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" strokeWidth={2.4} />
            ) : (
              <VolumeX className="w-3.5 h-3.5" strokeWidth={2.4} />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'Ses' : 'Sessiz'}</span>
          </button>

          {isPlaying && (
            <button
              onClick={onRestart}
              data-hover-sound
              aria-label="Başa dön"
              title="Başa dön"
              className="pill-button"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>

      {isPlaying && (
        <div className="progress-rail" role="progressbar" aria-valuemin={0} aria-valuemax={totalSteps} aria-valuenow={currentStep + 1}>
          <motion.div
            className="progress-rail__fill"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: EASE }}
          />
        </div>
      )}
    </header>
  );
};
