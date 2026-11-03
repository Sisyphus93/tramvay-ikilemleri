/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Dilemma, Decision } from '../types.ts';
import { GitFork, ShieldAlert } from 'lucide-react';

interface TrolleyControlsProps {
  dilemma: Dilemma;
  onMakeDecision: (decision: Decision) => void;
  disabled: boolean;
  leverPulled: boolean;
}

export const TrolleyControls: React.FC<TrolleyControlsProps> = ({
  dilemma,
  onMakeDecision,
  disabled,
  leverPulled,
}) => {
  const reduceMotion = useReducedMotion();
  const hover = reduceMotion ? undefined : { y: -3 };
  const tap = reduceMotion ? undefined : { scale: 0.985 };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch justify-center gap-4 pt-6">
      <motion.button
        onClick={() => onMakeDecision('straight')}
        disabled={disabled}
        data-hover-sound
        whileHover={hover}
        whileTap={tap}
        className={`choice-card flex items-start gap-4 group ${
          !leverPulled ? '' : 'choice-card--muted'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div className="choice-card__icon">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-headline text-base font-bold text-[#2A2520] group-hover:text-[#8A6222] transition-colors">
              {dilemma.straightActionLabel}
            </span>
            <span className="micro-label text-[#7A6F60] shrink-0">
              {dilemma.conceptualChoice ? '[1. SEÇİM]' : '[1 · DÜZ YOL]'}
            </span>
          </div>
          <p className="text-xs text-[#6B6154] mt-1.5 line-clamp-2">
            {dilemma.conceptualChoice
              ? `Sonuç: ${dilemma.straightTrack.label}`
              : `Tramvay ana yoldan sapmaz: ${dilemma.straightTrack.label} hedefte kalır.`}
          </p>
        </div>
      </motion.button>

      <motion.button
        onClick={() => onMakeDecision('diverted')}
        disabled={disabled}
        data-hover-sound
        whileHover={hover}
        whileTap={tap}
        className={`choice-card flex items-start gap-4 group ${
          leverPulled ? 'choice-card--active' : ''
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div className="choice-card__icon choice-card__icon--accent">
          <GitFork className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-headline text-base font-bold text-[#2A2520] group-hover:text-[#A23A26] transition-colors">
              {dilemma.divertedActionLabel}
            </span>
            <span className="micro-label text-[#A23A26] font-semibold shrink-0">
              {dilemma.conceptualChoice ? '[2. SEÇİM]' : '[2 · MAKAS ÇEK]'}
            </span>
          </div>
          <p className="text-xs text-[#6B6154] mt-1.5 line-clamp-2">
            {dilemma.conceptualChoice
              ? `Sonuç: ${dilemma.divertedTrack.label}`
              : `Kolu çekip yönü değiştirir: ${dilemma.divertedTrack.label} hedef olur.`}
          </p>
        </div>
      </motion.button>
    </div>
  );
};
