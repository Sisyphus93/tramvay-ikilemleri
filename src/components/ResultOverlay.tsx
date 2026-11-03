/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Dilemma, Decision } from '../types.ts';
import { ArrowRight, MessageSquare, ShieldCheck } from 'lucide-react';

interface ResultOverlayProps {
  dilemma: Dilemma;
  decision: Decision;
  onNext: () => void;
  isLast: boolean;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  dilemma,
  decision,
  onNext,
  isLast,
}) => {
  const reduceMotion = useReducedMotion();
  const leverPulled = decision === 'diverted';
  const commentary = leverPulled
    ? dilemma.divertedCommentary
    : dilemma.straightCommentary;

  const savedTarget = leverPulled ? dilemma.straightTrack : dilemma.divertedTrack;
  const lostTarget = leverPulled ? dilemma.divertedTrack : dilemma.straightTrack;

  const container = reduceMotion
    ? { hidden: {}, show: {} }
    : { hidden: {}, show: { transition: { staggerChildren: 0.075, delayChildren: 0.05 } } };

  const item = reduceMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
      };

  const stamp = dilemma.conceptualChoice
    ? 'Seçim yapıldı'
    : leverPulled
      ? 'Makas değişti'
      : 'Doğal akış';

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="verdict w-full"
      role="region"
      aria-label="Karar sonucu"
    >
      <motion.div variants={item} className="verdict__head">
        <div>
          <div className="verdict__eyebrow">Kararın</div>
          <div className="verdict__title">
            <b>{leverPulled ? dilemma.divertedActionLabel : dilemma.straightActionLabel}</b>
          </div>
        </div>
        <span className="verdict__stamp">{stamp}</span>
      </motion.div>

      <div className="verdict__body">
        <motion.div variants={item} className="verdict__cols">
          <div className="verdict__col verdict__col--save">
            <div className="verdict__col-label">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{dilemma.conceptualChoice ? 'Korunan' : 'Kurtarılan'}</span>
            </div>
            <div className="verdict__col-name">{savedTarget.label}</div>
            <p className="verdict__col-desc">{savedTarget.description}</p>
          </div>

          <div className="verdict__col verdict__col--lose">
            <div className="verdict__col-label">
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 9,
                  height: 9,
                  background: 'currentColor',
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                }}
              />
              <span>{dilemma.conceptualChoice ? 'Sonuç' : 'Feda edilen'}</span>
            </div>
            <div className="verdict__col-name">{lostTarget.label}</div>
            <p className="verdict__col-desc">{lostTarget.description}</p>
          </div>
        </motion.div>

        <motion.blockquote variants={item} className="verdict__quote">
          “{commentary}”
        </motion.blockquote>

        <motion.div variants={item} className="verdict__chat">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2.2} />
          <span>
            <b>Sohbet:</b> {dilemma.chatReaction}
          </span>
        </motion.div>

        <motion.div variants={item} className="verdict__actions">
          <span className="verdict__next-hint">
            Enter ile ilerle
          </span>
          <button onClick={onNext} className="btn btn--primary btn--lg">
            <span>{isLast ? 'Ahlaki sicil karnesi' : 'Sonraki ikilem'}</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};
