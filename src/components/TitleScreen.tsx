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
  const ease = [0.16, 1, 0.3, 1] as const;

  const reveal = reduceMotion
    ? { initial: {}, animate: {} }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.75, ease },
      };

  return (
    <div className="w-full max-w-3xl mx-auto text-center">
      <motion.section {...reveal} className="title-ticket blueprint-ticket">
        <div className="micro-label title-kicker">
          <span className="numeral">27</span> İKİLEM · TEK BİR VİCDAN · SES AÇIK
        </div>
        <motion.div
          initial={reduceMotion ? {} : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.1, ease, delay: 0.12 }}
          className="foil-rule mx-auto max-w-sm mt-4 origin-center"
        />
        <h1 className="mt-5">
          Absürt <span className="brass-text">Tramvay</span> İkilemleri
        </h1>
        <p>
          Kontrolden çıkmış nostaljik kırmızı bir tramvay raylarda son sürat ilerliyor. Önünde bağlı duranlar ise tanıdık: Steam kütüphanen, yolcu seçen sarı taksi, Kurtlar Vadisi’nin ilk 97 bölümü, final gecesi not çıkaran öğrenci, 0/15 giden kolsuz kankan, Türkiye’nin ana fiber hattı ya da bizzat sen.
        </p>
      </motion.section>

      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : { delay: 0.22, duration: 0.85, ease }}
        className="title-tram"
      >
        <svg viewBox="0 0 320 150" className="blueprint-svg w-full h-full overflow-visible" role="img" aria-label="Makas şeması tramvay çizimi">
          <defs>
            <linearGradient id="titleBrass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8A6222" />
              <stop offset="50%" stopColor="#E6C77A" />
              <stop offset="100%" stopColor="#B8893B" />
            </linearGradient>
            <pattern id="titleGrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#B8893B" strokeWidth="0.5" opacity="0.26" />
            </pattern>
            <filter id="titleGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="320" height="150" rx="8" fill="#F7F1E5" />
          <rect width="320" height="150" rx="8" fill="url(#titleGrid)" />
          <g className="blueprint-registration">
            <path d="M 10 10 h 14 M 10 10 v 14" />
            <path d="M 310 10 h -14 M 310 10 v 14" />
            <path d="M 10 140 h 14 M 10 140 v -14" />
            <path d="M 310 140 h -14 M 310 140 v -14" />
          </g>
          <text x="18" y="28" className="blueprint-subcode">PLAN 00 · GİRİŞ ŞEMASI</text>
          <text x="302" y="28" textAnchor="end" className="blueprint-subcode">ÖLÇEK 1:1</text>
          <line x1="18" y1="34" x2="302" y2="34" className="blueprint-rule" />

          <path d="M 20 112 Q 160 106 300 112" className="blueprint-ground" />
          <path d="M 24 98 L 296 98" className="blueprint-rail blueprint-rail--approach" />
          <path d="M 24 110 L 296 110" className="blueprint-rail blueprint-rail--approach" />
          {[44, 76, 108, 140, 172, 204, 236, 268].map((x) => (
            <line key={x} x1={x} y1="94" x2={x} y2="114" className="blueprint-sleeper" />
          ))}

          <g transform="translate(118, 62)">
            <rect x="-44" y="-18" width="88" height="36" rx="6" className="blueprint-tram__body" />
            <rect x="-40" y="-14" width="80" height="28" rx="4" className="blueprint-tram__inner" />
            <line x1="-44" y1="-2" x2="44" y2="-2" className="blueprint-tram__trim" />
            <line x1="-44" y1="8" x2="44" y2="8" className="blueprint-tram__trim" />
            {[-30, -12, 6, 24].map((x) => (
              <rect key={x} x={x} y="-10" width="14" height="9" rx="1.5" className="blueprint-tram__window" />
            ))}
            <path d="M -20 -18 L -30 -30 L -2 -30" className="blueprint-tram__pantograph" />
            <line x1="-30" y1="-30" x2="12" y2="-30" className="blueprint-tram__pantograph" />
            <circle cx="-24" cy="20" r="5" className="blueprint-tram__wheel" />
            <circle cx="24" cy="20" r="5" className="blueprint-tram__wheel" />
            <circle cx="44" cy="0" r="4" className="blueprint-tram__lamp" filter="url(#titleGlow)" />
            <path d="M 48 -3 L 74 -12 L 74 12 L 48 3 Z" className="blueprint-tram__beam" />
            <path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" className="blueprint-tram__emblem" />
          </g>

          <g transform="translate(62, 104)" className="blueprint-lever">
            <rect x="-16" y="-6" width="32" height="14" rx="2" className="blueprint-lever__base" />
            <circle cx="0" cy="0" r="4" className="blueprint-lever__pivot" />
            <g transform="rotate(-24)" className="blueprint-lever__handle">
              <line x1="0" y1="0" x2="0" y2="-30" className="blueprint-lever__stem" />
              <circle cx="0" cy="-33" r="6" className="blueprint-lever__knob" />
            </g>
          </g>

          <text x="18" y="136" className="blueprint-subcode">DÜZ HAT · MAKAS BEKLEMEDE</text>
          <text x="302" y="136" textAnchor="end" className="blueprint-subcode">REV. 27</text>
        </svg>
      </motion.div>

      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { delay: 0.38, duration: 0.65, ease }}
        className="pt-4"
      >
        <button onClick={onStart} data-hover-sound className="btn-primary px-9 py-4 text-base">
          <Play className="w-5 h-5 fill-current" />
          <span>İkilemlere Başla</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>

      <p className="micro-label text-[#7A6F60] mt-6 tracking-widest">
        Kolu çekmek ya da çekmemek... İşte bütün mesele bu.
      </p>
    </div>
  );
};
