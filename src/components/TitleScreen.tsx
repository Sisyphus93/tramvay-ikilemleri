/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { playSonicSignatureMotif, playPaperSwish, startMusicBed } from '../utils/audio.ts';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const handleStart = () => {
    startMusicBed(); // Start gentle ambient chord bed (Guide Section 12)
    playSonicSignatureMotif(); // Sound cue: Signature three-note motif
    playPaperSwish(); // Transition swish
    onStart();
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4 text-center space-y-8 animate-in fade-in duration-500">
      {/* Title & Tagline in Fraunces */}
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#2A2520] font-headline">
          Absürt Tramvay İkilemleri
        </h1>

        <p className="text-base sm:text-lg text-[#6B6154] max-w-xl mx-auto leading-relaxed">
          Kontrolden çıkmış nostaljik kırmızı bir tramvay raylarda son sürat ilerliyor. Önünde bağlı duranlar ise tanıdık: Steam kütüphanen, Hatay dönercisi, dereceli maçta 0/15 giden kolsuz kankan veya mahallenin tombiş sokak kedisi.
        </p>
      </div>

      {/* Hand-inked Nostalgic Tram Graphic */}
      <div className="relative w-52 h-32 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <defs>
            <filter id="titleAmberGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
            </filter>
          </defs>

          {/* Flat Paper Deep ground line */}
          <path d="M 10 98 Q 100 94 190 98" stroke="#E7DCC5" strokeWidth="18" strokeLinecap="round" fill="none" />

          {/* Hand-inked Rails */}
          <line x1="15" y1="90" x2="185" y2="90" stroke="#2F8478" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="15" y1="100" x2="185" y2="100" stroke="#2F8478" strokeWidth="3.5" strokeLinecap="round" />
          {[25, 55, 85, 115, 145, 175].map((x) => (
            <rect key={x} x={x} y="86" width="4.5" height="18" fill="#6B6154" rx="1" />
          ))}

          {/* Nostalgic Red Tram */}
          <g transform="translate(65, 30)">
            {/* Flat shadow */}
            <rect x="2" y="52" width="66" height="5" rx="2" fill="#E7DCC5" />

            {/* Misregistered Vermilion Print Fill */}
            <rect x="4" y="12" width="66" height="38" rx="5" fill="#D5472F" opacity="0.9" />

            {/* Hand-drawn Ink Outline */}
            <rect x="0" y="10" width="66" height="38" rx="5" fill="none" stroke="#2A2520" strokeWidth="2.5" />

            {/* Cream Paper Mid-band */}
            <rect x="0" y="26" width="66" height="7" fill="#F4EDDF" />

            {/* Windows in Paper Deep */}
            <rect x="6" y="15" width="13" height="9" rx="1.5" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.5" />
            <rect x="25" y="15" width="13" height="9" rx="1.5" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.5" />
            <rect x="44" y="15" width="16" height="16" rx="2" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.8" />

            {/* Driver */}
            <circle cx="52" cy="22" r="2.8" fill="#2A2520" />

            {/* Headlight with Amber Spark Glow */}
            <circle cx="66" cy="30" r="3.5" fill="#E3A33B" stroke="#2A2520" strokeWidth="1.5" />
            <circle cx="70" cy="30" r="8" fill="#E3A33B" opacity="0.4" filter="url(#titleAmberGlow)" />

            {/* Roof pole */}
            <line x1="20" y1="10" x2="10" y2="-4" stroke="#2A2520" strokeWidth="2" />
            <line x1="10" y1="-4" x2="35" y2="-4" stroke="#2A2520" strokeWidth="2.5" />

            {/* Wheels */}
            <circle cx="15" cy="50" r="4.5" fill="#2A2520" />
            <circle cx="52" cy="50" r="4.5" fill="#2A2520" />
          </g>
        </svg>
      </div>

      {/* Start Primary Button */}
      <div className="pt-2">
        <button
          onClick={handleStart}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#D5472F] hover:bg-[#b83721] text-[#F4EDDF] font-bold text-base transition-all border-2 border-[#2A2520] flat-shadow-lg hover:translate-x-[1px] hover:translate-y-[1px] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#D5472F]/30"
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="font-headline tracking-wide">İkilemlere Başla</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      <p className="text-xs font-handwriting text-[#6B6154] max-w-sm mx-auto text-base">
        Kolu çekmek ya da çekmemek... İşte bütün mesele bu.
      </p>
    </div>
  );
};
