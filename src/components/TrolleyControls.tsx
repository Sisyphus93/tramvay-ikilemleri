/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Dilemma, Decision } from '../types.ts';
import { GitFork, ShieldAlert } from 'lucide-react';
import { playTinyClick } from '../utils/audio.ts';

interface TrolleyControlsProps {
  dilemma: Dilemma;
  onMakeDecision: (decision: Decision) => void;
  disabled: boolean;
  leverPulled: boolean;
  onLeverToggle: () => void;
}

export const TrolleyControls: React.FC<TrolleyControlsProps> = ({
  dilemma,
  onMakeDecision,
  disabled,
  leverPulled,
  onLeverToggle,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch justify-center gap-4 pt-3">
      {/* Straight Action (Hiçbir Şey Yapma) */}
      <button
        onClick={() => {
          playTinyClick();
          onMakeDecision('straight');
        }}
        disabled={disabled}
        className={`flex-1 py-4 px-5 rounded-xl border-2 text-left transition-all duration-150 group flex items-start gap-3.5 ${
          !leverPulled
            ? 'border-[#2A2520] bg-[#F4EDDF] flat-shadow hover:translate-x-[1px] hover:translate-y-[1px]'
            : 'border-[#6B6154]/50 bg-[#E7DCC5]/40 opacity-75'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div className="p-2.5 rounded-lg bg-[#E7DCC5] text-[#2A2520] border border-[#2A2520] shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-base text-[#2A2520] font-headline group-hover:text-[#D5472F] transition-colors">
              {dilemma.straightActionLabel}
            </span>
            <span className="text-[11px] font-label text-[#6B6154] shrink-0">
              {dilemma.conceptualChoice ? '[1. SEÇİM]' : '[DÜZ YOL]'}
            </span>
          </div>
          <p className="text-xs text-[#6B6154] mt-1 line-clamp-2">
            {dilemma.conceptualChoice ? `Sonuç: ${dilemma.straightTrack.label}` : `Tramvay ana yoldan sapmaz: ${dilemma.straightTrack.label} hedefte kalır.`}
          </p>
        </div>
      </button>

      {/* Diverted Action (Kolu Çek) */}
      <button
        onClick={() => {
          playTinyClick();
          if (!leverPulled) {
            onLeverToggle();
          }
          onMakeDecision('diverted');
        }}
        disabled={disabled}
        className={`flex-1 py-4 px-5 rounded-xl border-2 text-left transition-all duration-150 group flex items-start gap-3.5 ${
          leverPulled
            ? 'border-[#D5472F] bg-[#F4EDDF] ring-2 ring-[#D5472F]/30 flat-shadow'
            : 'border-[#2A2520] bg-[#F4EDDF] flat-shadow hover:border-[#D5472F]'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div className="p-2.5 rounded-lg bg-[#D5472F] text-[#F4EDDF] border border-[#2A2520] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
          <GitFork className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-base text-[#2A2520] font-headline group-hover:text-[#D5472F] transition-colors">
              {dilemma.divertedActionLabel}
            </span>
            <span className="text-[11px] font-label text-[#D5472F] font-bold shrink-0">
              {dilemma.conceptualChoice ? '[2. SEÇİM]' : '[MAKAS ÇEK]'}
            </span>
          </div>
          <p className="text-xs text-[#6B6154] mt-1 line-clamp-2">
            {dilemma.conceptualChoice ? `Sonuç: ${dilemma.divertedTrack.label}` : `Kolu çekip yönü değiştirir: ${dilemma.divertedTrack.label} hedef olur.`}
          </p>
        </div>
      </button>
    </div>
  );
};
