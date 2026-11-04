/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Dilemma, Decision } from '../types.ts';
import { ArrowRight } from 'lucide-react';

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
  const hover = reduceMotion ? undefined : { y: -2 };
  const hoverTransition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE };

  const straightDesc = dilemma.conceptualChoice
    ? `Feda edilen: ${dilemma.straightTrack.label}`
    : `${dilemma.straightTrack.label} hedefte kalır.`;

  const divertedDesc = dilemma.conceptualChoice
    ? `Feda edilen: ${dilemma.divertedTrack.label}`
    : `${dilemma.divertedTrack.label} hedef olur.`;

  return (
    <div className="choices">
      <motion.button
        type="button"
        onClick={() => onMakeDecision('straight')}
        disabled={disabled}
        data-hover-sound
        whileHover={disabled ? undefined : hover}
        whileTap={disabled ? undefined : { scale: 0.995 }}
        transition={hoverTransition}
        aria-keyshortcuts="1"
        className={`choice ${leverPulled ? 'choice--muted' : 'choice--is-active'}`}
      >
        <span className="choice__key" aria-hidden="true">
          1
        </span>
        <span className="choice__body">
          <span className="choice__meta">
            <span className="choice__route">
              <span className="choice__dot" aria-hidden="true" />
              {dilemma.conceptualChoice ? 'Birinci seçenek' : 'Düz hat · müdahale yok'}
            </span>
            <span className="choice__count numeral">
              ×{dilemma.straightTrack.count}
              <span>{dilemma.straightTrack.isHuman ? 'canlı' : 'hedef'}</span>
            </span>
          </span>
          <span className="choice__title">{dilemma.straightActionLabel}</span>
          <span className="choice__desc">{straightDesc}</span>
        </span>
        <ArrowRight className="choice__go w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
      </motion.button>

      <motion.button
        type="button"
        onClick={() => onMakeDecision('diverted')}
        disabled={disabled}
        data-hover-sound
        whileHover={disabled ? undefined : hover}
        whileTap={disabled ? undefined : { scale: 0.995 }}
        transition={hoverTransition}
        aria-keyshortcuts="2"
        className={`choice choice--alt ${leverPulled ? 'choice--is-active' : ''}`}
      >
        <span className="choice__key" aria-hidden="true">
          2
        </span>
        <span className="choice__body">
          <span className="choice__meta">
            <span className="choice__route">
              <span className="choice__dot choice__dot--alt" aria-hidden="true" />
              {dilemma.conceptualChoice ? 'İkinci seçenek' : 'Makas hattı · kolu çek'}
            </span>
            <span className="choice__count numeral">
              ×{dilemma.divertedTrack.count}
              <span>{dilemma.divertedTrack.isHuman ? 'canlı' : 'hedef'}</span>
            </span>
          </span>
          <span className="choice__title">{dilemma.divertedActionLabel}</span>
          <span className="choice__desc">{divertedDesc}</span>
        </span>
        <ArrowRight className="choice__go w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
      </motion.button>
    </div>
  );
};
