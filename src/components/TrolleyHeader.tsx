/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { playSoftTick } from '../utils/audio.ts';

interface TrolleyHeaderProps {
  currentStep: number;
  totalSteps: number;
  totalDeaths: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRestart: () => void;
  isPlaying: boolean;
}

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
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <header className="premium-header">
      <div className="premium-header__inner">
        <button
          onClick={() => {
            playSoftTick(0);
            onRestart();
          }}
          data-hover-sound
          className="brand-mark focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C77A] rounded-lg"
          aria-label="Başa dön"
        >
          <span className="brand-mark__seal" aria-hidden="true">27</span>
          <span className="transition-colors duration-300 hover:text-[#E6C77A]">
            Absürt Tramvay İkilemleri
          </span>
        </button>

        {isPlaying && (
          <div className="header-meta font-label">
            <span>
              İKİLEM <strong className="tabular-nums">{String(currentStep + 1).padStart(2, '0')}</strong> / {totalSteps}
            </span>
            <span className="header-meta__divider" aria-hidden="true" />
            <span>
              ZAYİAT <strong className="tabular-nums text-[#E28B76]">{totalDeaths}</strong>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              playSoftTick(1);
              onToggleSound();
            }}
            data-hover-sound
            aria-label={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            title={soundEnabled ? 'Müzik ve ses açık' : 'Sessiz'}
            className={`icon-button ${soundEnabled ? 'icon-button--active' : ''}`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline font-label text-[10px] tracking-widest">
              {soundEnabled ? 'SES AÇIK' : 'SESSİZ'}
            </span>
          </button>

          {isPlaying && (
            <button
              onClick={() => {
                playSoftTick(0);
                onRestart();
              }}
              data-hover-sound
              aria-label="Başa Dön"
              title="Başa Dön"
              className="icon-button"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isPlaying && (
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: 'easeOut' }}
          />
        </div>
      )}
    </header>
  );
};
