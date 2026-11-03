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

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const TrolleyControls: React.FC<TrolleyControlsProps> = ({
  dilemma,
  onMakeDecision,
  disabled,
  leverPulled,
}) => {
  const reduceMotion = useReducedMotion();
  const hover = reduceMotion ? undefined : { y: -4 };
  const hoverTransition = reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch justify-center gap-4 pt-6">
      <motion.button
        onClick={() => onMakeDecision('straight')}
        disabled={disabled}
        data-hover-sound
        whileHover={hover}
        transition={hoverTransition}
        className={`choice-card blueprint-choice flex items-start gap-4 group ${
          !leverPulled ? '' : 'choice-card--muted'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="choice-card__icon blueprint-choice__icon">
          <ShieldAlert className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center justify-between gap-2">
            <span className="font-headline text-base font-bold text-[#2A2520] group-hover:text-[#8A6222] transition-colors duration-500">
              {dilemma.straightActionLabel}
            </span>
            <span className="micro-label text-[#7A6F60] shrink-0">
              {dilemma.conceptualChoice ? <span className="numeral">[1. SEÇİM]</span> : <span className="numeral">[1 · DÜZ YOL]</span>}
            </span>
          </span>
          <span className="block text-xs text-[#6B6154] mt-1.5 line-clamp-2">
            {dilemma.conceptualChoice
              ? `Sonuç: ${dilemma.straightTrack.label}`
              : `Tramvay ana yoldan sapmaz: ${dilemma.straightTrack.label} hedefte kalır.`}
          </span>
        </span>
      </motion.button>

      <motion.button
        onClick={() => onMakeDecision('diverted')}
        disabled={disabled}
        data-hover-sound
        whileHover={hover}
        transition={hoverTransition}
        className={`choice-card blueprint-choice flex items-start gap-4 group ${
          leverPulled ? 'choice-card--active' : ''
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="choice-card__icon choice-card__icon--accent blueprint-choice__icon">
          <GitFork className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center justify-between gap-2">
            <span className="font-headline text-base font-bold text-[#2A2520] group-hover:text-[#A23A26] transition-colors duration-500">
              {dilemma.divertedActionLabel}
            </span>
            <span className="micro-label text-[#A23A26] font-semibold shrink-0">
              {dilemma.conceptualChoice ? <span className="numeral">[2. SEÇİM]</span> : <span className="numeral">[2 · MAKAS ÇEK]</span>}
            </span>
          </span>
          <span className="block text-xs text-[#6B6154] mt-1.5 line-clamp-2">
            {dilemma.conceptualChoice
              ? `Sonuç: ${dilemma.divertedTrack.label}`
              : `Kolu çekip yönü değiştirir: ${dilemma.divertedTrack.label} hedef olur.`}
          </span>
        </span>
      </motion.button>
    </div>
  );
};
