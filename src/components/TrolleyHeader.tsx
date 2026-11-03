/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  return (
    <header className="w-full border-b-2 border-[#2A2520] bg-[#F4EDDF] sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Wordmark in Fraunces Serif */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              playSoftTick(0);
              onRestart();
            }}
            className="text-left group flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D5472F] rounded-md"
          >
            <span className="text-xl font-bold tracking-tight text-[#2A2520] group-hover:text-[#D5472F] transition-colors font-headline whitespace-nowrap">
              Absürt Tramvay İkilemleri
            </span>
          </button>
        </div>

        {/* Zone 2: Unboxed metadata in DM Sans (Section 6 & 8) */}
        {isPlaying ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-label text-[#6B6154] shrink-0">
            <span>
              İKİLEM{' '}
              <strong className="text-[#2A2520] tabular-nums font-bold">
                {currentStep + 1}
              </strong>{' '}
              / {totalSteps}
            </span>
            <span aria-hidden="true" className="text-[#6B6154]">
              ·
            </span>
            <span>
              ZAYİAT:{' '}
              <strong className="text-[#D5472F] tabular-nums font-bold">
                {totalDeaths}
              </strong>
            </span>
          </div>
        ) : null}

        {/* Zone 3: Actions (Sound toggle & Reset) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              playSoftTick(1);
              onToggleSound();
            }}
            aria-label={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            title={soundEnabled ? 'Müzik ve Ses Açık' : 'Sessiz'}
            className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-label ${
              soundEnabled
                ? 'bg-[#E7DCC5] border-[#2A2520] text-[#2A2520]'
                : 'bg-transparent border-[#2A2520]/40 text-[#6B6154]'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-[#2A2520]" />
                <span className="hidden sm:inline">SES AÇIK</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-[#D5472F]" />
                <span className="hidden sm:inline">SESSİZ</span>
              </>
            )}
          </button>

          {isPlaying && (
            <button
              onClick={() => {
                playSoftTick(0);
                onRestart();
              }}
              aria-label="Başa Dön"
              title="Başa Dön"
              className="p-2 rounded-lg text-[#2A2520] hover:bg-[#E7DCC5] border border-transparent hover:border-[#2A2520] transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Line */}
      {isPlaying && (
        <div className="w-full h-1.5 bg-[#E7DCC5] overflow-hidden">
          <div
            className="h-full bg-[#D5472F] transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
};
