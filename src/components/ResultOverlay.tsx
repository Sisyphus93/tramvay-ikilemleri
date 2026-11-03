/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Dilemma, Decision } from '../types.ts';
import { ArrowRight, CheckCircle2, MessageSquare, ShieldCheck, Skull } from 'lucide-react';
import { playPaperSwish } from '../utils/audio.ts';

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
  const leverPulled = decision === 'diverted';
  const commentary = leverPulled
    ? dilemma.divertedCommentary
    : dilemma.straightCommentary;

  const savedTarget = leverPulled ? dilemma.straightTrack : dilemma.divertedTrack;
  const lostTarget = leverPulled ? dilemma.divertedTrack : dilemma.straightTrack;

  const handleNextClick = () => {
    playPaperSwish(); // Sound cue: Paper swish on slide transition (Section 12)
    onNext();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 p-6 rounded-2xl bg-[#F4EDDF] border-2 border-[#2A2520] flat-shadow-lg animate-in fade-in duration-300">
      {/* Top Header Recap */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-[#E7DCC5]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#2F8478]" />
          <span className="text-base font-bold text-[#2A2520] font-headline">
            Kararın:{' '}
            <span className="text-[#D5472F]">
              {leverPulled ? dilemma.divertedActionLabel : dilemma.straightActionLabel}
            </span>
          </span>
        </div>
        <span className="text-xs font-label text-[#6B6154]">
          {dilemma.conceptualChoice ? 'SEÇİM YAPILDI' : leverPulled ? 'MAKAS DEĞİŞTİRİLDİ' : 'DOĞAL AKIŞA BIRAKILDI'}
        </span>
      </div>

      {/* Real Ethical & Cultural Consequence Breakdown (No fake vote percentages!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
        {/* Saved */}
        <div className="p-3.5 rounded-xl bg-[#E7DCC5]/70 border border-[#2A2520] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-label text-[#2F8478] font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>{dilemma.conceptualChoice ? 'KORUNAN:' : 'KURTARILAN:'}</span>
          </div>
          <div className="font-bold text-sm text-[#2A2520] font-headline">
            {savedTarget.label}
          </div>
          <p className="text-[11px] text-[#6B6154]">
            {savedTarget.description}
          </p>
        </div>

        {/* Sacrificed / Struck */}
        <div className="p-3.5 rounded-xl bg-[#E7DCC5]/70 border border-[#2A2520] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-label text-[#D5472F] font-bold">
            <Skull className="w-4 h-4" />
            <span>{dilemma.conceptualChoice ? 'SONUÇ:' : 'FEDA EDİLEN / ZAYİAT:'}</span>
          </div>
          <div className="font-bold text-sm text-[#D5472F] font-headline">
            {lostTarget.label}
          </div>
          <p className="text-[11px] text-[#6B6154]">
            {lostTarget.description}
          </p>
        </div>
      </div>

      {/* Spoken Caption Band on Ink Background (Section 6 & 7: Spoken captions on an Ink band) */}
      <div className="p-4 rounded-xl bg-[#2A2520] text-[#F4EDDF] space-y-2 flat-shadow">
        <p className="text-sm font-headline leading-relaxed">
          "{commentary}"
        </p>
      </div>

      {/* Handwritten Caveat Note (Twitch/Internet Culture Quip) */}
      <div className="mt-3 flex items-center gap-2 text-[#D5472F] font-handwriting text-base">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span>{dilemma.chatReaction}</span>
      </div>

      {/* Next Dilemma CTA */}
      <div className="mt-5 flex justify-end">
        <button
          onClick={handleNextClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D5472F] hover:bg-[#b83721] text-[#F4EDDF] font-bold text-sm transition-all border-2 border-[#2A2520] flat-shadow hover:translate-x-[1px] hover:translate-y-[1px]"
        >
          <span className="font-headline tracking-wide">
            {isLast ? 'Ahlaki Sicil Karneni Gör' : 'Sonraki İkilem'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
