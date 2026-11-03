/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion
    ? { initial: {}, animate: {} }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.65, ease: 'easeOut' as const },
      };

  return (
    <div className="w-full max-w-3xl mx-auto text-center">
      <motion.section {...reveal} className="title-ticket">
        <div className="micro-label title-kicker">27 İKİLEM · TEK BİR VİCDAN · SES AÇIK</div>
        <div className="foil-rule mx-auto max-w-sm mt-4" />
        <h1 className="mt-5">
          Absürt <span className="brass-text">Tramvay</span> İkilemleri
        </h1>
        <p>
          Kontrolden çıkmış nostaljik kırmızı bir tramvay raylarda son sürat ilerliyor. Önünde bağlı duranlar ise tanıdık: Steam kütüphanen, yolcu seçen sarı taksi, Kurtlar Vadisi’nin ilk 97 bölümü, final gecesi not çıkaran öğrenci, 0/15 giden kolsuz kankan, Türkiye’nin ana fiber hattı ya da bizzat sen.
        </p>
      </motion.section>

      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : { delay: 0.18, duration: 0.7, ease: 'easeOut' }}
        className="title-tram"
      >
        <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
          <defs>
            <filter id="titleBrassGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" />
            </filter>
            <radialGradient id="titleSpot" cx="50%" cy="20%" r="70%">
              <stop offset="0%" stopColor="#E6C77A" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E6C77A" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx="100" cy="58" rx="92" ry="48" fill="url(#titleSpot)" />
          <path d="M 10 98 Q 100 94 190 98" stroke="#E7DCC5" strokeWidth="18" strokeLinecap="round" fill="none" />

          <line x1="15" y1="90" x2="185" y2="90" stroke="#2F8478" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="15" y1="100" x2="185" y2="100" stroke="#2F8478" strokeWidth="3.5" strokeLinecap="round" />
          {[25, 55, 85, 115, 145, 175].map((x) => (
            <rect key={x} x={x} y="86" width="4.5" height="18" fill="#6B6154" rx="1" opacity="0.8" />
          ))}

          <g transform="translate(65, 30)">
            <rect x="2" y="52" width="66" height="5" rx="2" fill="#E7DCC5" />
            <rect x="4" y="12" width="66" height="38" rx="5" fill="#C2412D" opacity="0.92" />
            <rect x="0" y="10" width="66" height="38" rx="5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <rect x="0" y="26" width="66" height="7" fill="#F4EDDF" />
            <rect x="6" y="15" width="13" height="9" rx="1.5" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.5" />
            <rect x="25" y="15" width="13" height="9" rx="1.5" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.5" />
            <rect x="44" y="15" width="16" height="16" rx="2" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.8" />
            <circle cx="52" cy="22" r="2.8" fill="#2A2520" />
            <circle cx="66" cy="30" r="3.5" fill="#E6C77A" stroke="#2A2520" strokeWidth="1.5" />
            <circle cx="70" cy="30" r="9" fill="#E6C77A" opacity="0.45" filter="url(#titleBrassGlow)" />
            <line x1="20" y1="10" x2="10" y2="-4" stroke="#2A2520" strokeWidth="2" />
            <line x1="10" y1="-4" x2="35" y2="-4" stroke="#2A2520" strokeWidth="2.5" />
            <circle cx="15" cy="50" r="4.5" fill="#2A2520" />
            <circle cx="52" cy="50" r="4.5" fill="#2A2520" />
            <circle cx="-3" cy="30" r="2.5" fill="#B8893B" stroke="#2A2520" strokeWidth="1" />
          </g>
        </svg>
      </motion.div>

      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { delay: 0.32, duration: 0.5 }}
        className="pt-4"
      >
        <button onClick={onStart} data-hover-sound className="btn-primary px-9 py-4 text-base">
          <Play className="w-5 h-5 fill-current" />
          <span>İkilemlere Başla</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>

      <p className="font-handwriting text-[#7A6F60] text-lg mt-6">
        Kolu çekmek ya da çekmemek... İşte bütün mesele bu.
      </p>
    </div>
  );
};
