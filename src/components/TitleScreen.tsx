/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import { DILEMMAS } from '../data/dilemmas.ts';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="poster w-full">
      {/* The masthead is the product's own junction drawing, full bleed. */}
      <div className="poster__masthead" data-ui>
        <PosterArt reduceMotion={!!reduceMotion} />
      </div>

      <div className="poster__grid">
        <div className="poster__main">
          <h1 className="poster__title">
            <span className="line">Absürt Tramvay</span>
            <span className="line">İkilemleri</span>
          </h1>

          <p className="poster__lede">
            27 ikilemlik interaktif bir felsefe oyunu. Tramvay geliyor, iki ray var ve
            doğru cevap yok; her karar senin siciline yazılıyor.
          </p>

          <div className="poster__cta">
            <button onClick={onStart} data-hover-sound className="btn btn--primary btn--lg">
              <Play className="w-4 h-4 fill-current" strokeWidth={2.5} />
              <span>İkilemlere Başla</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <span className="poster__cta-note">
              Ses açık · Kulaklık önerilir
              <br />
              Tek oturumda ~6 dakika
            </span>
          </div>
        </div>

        <div className="poster__notes">
          <span>
            <b>{DILEMMAS.length} ikilem.</b> Hepsi Türkçe, hepsi absürt.
          </span>
          <span>
            <b>İki ray.</b> Biri düz, biri makas.
          </span>
          <span>
            <b>Doğru cevap yok.</b> Yalnızca sicil var.
          </span>
        </div>
      </div>

      <div className="poster__foot">
        <span>Kolu çekmek ya da çekmemek… işte bütün mesele bu.</span>
        <span>27 ikilem · tek makas · Türkçe</span>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------
   Masthead artwork: the tram approaching the junction, drawn wide so the
   picture leads the first screen at every width. Flat inks, no annotations.
   -------------------------------------------------------------------------- */

const PosterArt: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => (
  <svg
    viewBox="0 0 1200 420"
    preserveAspectRatio="xMidYMid slice"
    role="img"
    aria-label="Raylarda makasa yaklaşan kırmızı tramvay ve ikiye ayrılan hat"
  >
    <defs>
      <pattern id="posterDots" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.1" fill="#171512" opacity="0.13" />
      </pattern>
    </defs>

    <rect width="1200" height="420" fill="#e9e9e6" />
    <rect width="1200" height="420" fill="url(#posterDots)" />

    {/* The one flat colour field: a signal disc over the junction. */}
    <circle cx="880" cy="128" r="104" fill="#a82a22" opacity="0.13" />
    <circle cx="880" cy="128" r="104" fill="url(#posterDots)" />

    {/* Overhead wire */}
    <line x1="0" y1="70" x2="1200" y2="70" stroke="#171512" strokeWidth="2" opacity="0.45" />

    {/* Rail bed */}
    <line x1="0" y1="280" x2="700" y2="280" stroke="#171512" strokeWidth="4" />
    <line x1="0" y1="300" x2="700" y2="300" stroke="#171512" strokeWidth="4" />
    {Array.from({ length: 17 }).map((_, i) => (
      <line
        key={i}
        x1={26 + i * 40}
        y1="276"
        x2={26 + i * 40}
        y2="304"
        stroke="#171512"
        strokeWidth="2.4"
        opacity="0.3"
      />
    ))}

    {/* Diverging branches */}
    <path d="M 700 280 C 820 280, 900 190, 1180 158" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" />
    <path d="M 700 300 C 820 300, 900 212, 1180 180" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
    <path d="M 700 280 C 820 280, 900 330, 1180 342" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" />
    <path d="M 700 300 C 820 300, 900 352, 1180 364" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
    <circle cx="1180" cy="169" r="9" fill="#1f6b5c" stroke="#171512" strokeWidth="3" />
    <circle cx="1180" cy="353" r="9" fill="#a82a22" stroke="#171512" strokeWidth="3" />

    {/* Junction */}
    <circle cx="700" cy="290" r="11" fill="#e9e9e6" stroke="#171512" strokeWidth="4" />
    <line x1="700" y1="290" x2="758" y2="290" stroke="#171512" strokeWidth="5" strokeLinecap="round" transform="rotate(-9 700 290)" />

    {/* Motion lines */}
    {!reduceMotion && (
      <g stroke="#a82a22" strokeWidth="4" strokeLinecap="round" opacity="0.6">
        <line x1="288" y1="196" x2="338" y2="196" />
        <line x1="268" y1="220" x2="330" y2="220" />
        <line x1="292" y1="244" x2="338" y2="244" />
      </g>
    )}

    {/* Pantograph */}
    <g stroke="#171512" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M 420 208 L 392 70 L 500 70" />
      <line x1="392" y1="70" x2="548" y2="70" />
    </g>

    {/* Tram body */}
    <rect x="372" y="206" width="286" height="84" rx="10" fill="#a82a22" stroke="#171512" strokeWidth="4" />
    <rect x="372" y="252" width="286" height="16" fill="#ffffff" stroke="#171512" strokeWidth="2.5" />
    <rect x="384" y="196" width="262" height="13" rx="6" fill="#171512" />

    <rect x="566" y="216" width="72" height="34" rx="5" fill="#f8f8f7" stroke="#171512" strokeWidth="3" />
    <rect x="386" y="216" width="48" height="34" rx="5" fill="#f8f8f7" stroke="#171512" strokeWidth="3" />
    <rect x="440" y="216" width="48" height="34" rx="5" fill="#f8f8f7" stroke="#171512" strokeWidth="3" />
    <rect x="494" y="216" width="48" height="34" rx="5" fill="#f8f8f7" stroke="#171512" strokeWidth="3" />

    <circle cx="646" cy="240" r="8" fill="#ffffff" stroke="#171512" strokeWidth="3" />
    <rect x="620" y="288" width="48" height="11" rx="3" fill="#171512" />
    <rect x="352" y="288" width="40" height="11" rx="3" fill="#171512" />
    <circle cx="424" cy="294" r="19" fill="#171512" />
    <circle cx="424" cy="294" r="6" fill="#ffffff" />
    <circle cx="596" cy="294" r="19" fill="#171512" />
    <circle cx="596" cy="294" r="6" fill="#ffffff" />

    <rect x="386" y="262" width="34" height="22" rx="3" fill="#171512" />
    <text
      x="403"
      y="278"
      textAnchor="middle"
      fill="#ffffff"
      style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 700 }}
    >
      27
    </text>

    {/* Mechanical lever */}
    <g transform="translate(268, 344)">
      <rect x="-30" y="-6" width="60" height="18" rx="3" fill="#171512" />
      <g transform="rotate(-24)">
        <line x1="0" y1="2" x2="0" y2="-52" stroke="#171512" strokeWidth="5" strokeLinecap="round" />
        <circle cx="0" cy="-58" r="11" fill="#a82a22" stroke="#171512" strokeWidth="3.5" />
      </g>
      <circle cx="0" cy="2" r="6" fill="#ffffff" stroke="#171512" strokeWidth="3" />
    </g>
  </svg>
);
