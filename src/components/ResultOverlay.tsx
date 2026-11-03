/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Dilemma, Decision } from '../types.ts';
import { ArrowRight, CheckCircle2, MessageSquare, ShieldCheck, Skull } from 'lucide-react';
import { playPremiumTransition } from '../utils/audio.ts';

interface ResultOverlayProps {
  dilemma: Dilemma;
  decision: Decision;
  onNext: () => void;
  isLast: boolean;
}

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

  const handleNextClick = () => {
    playPremiumTransition();
    onNext();
  };

  const container = reduceMotion
    ? { hidden: {}, show: {} }
    : { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };

  const item = reduceMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } },
      };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="result-card paper-card w-full max-w-2xl mx-auto mt-6"
    >
      <motion.div variants={item} className="result-header">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#2F8478]" />
          <span className="font-headline text-base font-bold text-[#2A2520]">
            Kararın: <span className="text-[#A23A26]">{leverPulled ? dilemma.divertedActionLabel : dilemma.straightActionLabel}</span>
          </span>
        </div>
        <span className="micro-label text-[#7A6F60]">
          {dilemma.conceptualChoice ? 'SEÇİM YAPILDI' : leverPulled ? 'MAKAS DEĞİŞTİRİLDİ' : 'DOĞAL AKIŞA BIRAKILDI'}
        </span>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
        <div className="result-tile">
          <div className="flex items-center gap-1.5 micro-label text-[#2F8478] mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{dilemma.conceptualChoice ? 'KORUNAN:' : 'KURTARILAN:'}</span>
          </div>
          <div className="font-headline text-sm font-bold text-[#2A2520]">{savedTarget.label}</div>
          <p className="text-[11px] text-[#6B6154] mt-1 leading-relaxed">{savedTarget.description}</p>
        </div>

        <div className="result-tile">
          <div className="flex items-center gap-1.5 micro-label text-[#A23A26] mb-2">
            <Skull className="w-4 h-4" />
            <span>{dilemma.conceptualChoice ? 'SONUÇ:' : 'FEDA EDİLEN / ZAYİAT:'}</span>
          </div>
          <div className="font-headline text-sm font-bold text-[#A23A26]">{lostTarget.label}</div>
          <p className="text-[11px] text-[#6B6154] mt-1 leading-relaxed">{lostTarget.description}</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="ink-band">
        <p className="font-display text-lg leading-relaxed">“{commentary}”</p>
      </motion.div>

      <motion.div variants={item} className="chat-note mt-4">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span>{dilemma.chatReaction}</span>
      </motion.div>

      <motion.div variants={item} className="mt-6 flex justify-end">
        <button
          onClick={handleNextClick}
          data-hover-sound
          className="btn-primary w-full sm:w-auto"
        >
          <span>{isLast ? 'Ahlaki Sicil Karneni Gör' : 'Sonraki İkilem'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
};
