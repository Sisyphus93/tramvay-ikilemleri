/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { DILEMMAS } from '../data/dilemmas.ts';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="poster w-full">
      {/* The masthead is the product's own junction drawing, full bleed. */}
      <div className="poster__masthead" data-ui>
        <PosterArt reduceMotion={!!reduceMotion} isMobile={isMobile} />
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
              <span>İkilemlere Başla</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
            <span className="poster__cta-note">
              Ses açık · Kulaklık önerilir
              <br />
              Tek oturumda ~6 dakika
            </span>
          </div>
        </div>

        <aside className="poster__sidebar" aria-label="Oyun özeti">
          <div className="poster__notes">
            <div className="poster__note-item">
              <b>{DILEMMAS.length} ikilem.</b>
              <span>Hepsi Türkçe, hepsi absürt.</span>
            </div>
            <div className="poster__note-item">
              <b>İki ray.</b>
              <span>Biri düz, biri makas.</span>
            </div>
            <div className="poster__note-item">
              <b>Doğru cevap yok.</b>
              <span>Yalnızca sicil var.</span>
            </div>
          </div>

          <div className="poster__epigraph">
            <p>“Kolu çekmek ya da çekmemek… işte bütün mesele bu.”</p>
            <span>27 ikilem · tek makas · Türkçe</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------
   Masthead artwork: the tram approaching the junction, drawn wide on desktop
   and recomposed on small screens so the lever, tram, and track split all
   stay readable together. Flat inks, no annotations.
   -------------------------------------------------------------------------- */

const PosterArt: React.FC<{ reduceMotion: boolean; isMobile: boolean }> = ({
  reduceMotion,
  isMobile,
}) => {
  if (isMobile) {
    return (
      <svg
        viewBox="0 0 760 360"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Raylarda makasa yaklaşan kırmızı tramvay, makas kolu ve ikiye ayrılan hat"
      >
        <defs>
          <pattern id="posterDotsMobile" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="#171512" opacity="0.13" />
          </pattern>
        </defs>

        <rect width="760" height="360" fill="#e9e9e6" />
        <rect width="760" height="360" fill="url(#posterDotsMobile)" />

        {/* Signal disc over the junction */}
        <circle cx="566" cy="118" r="84" fill="#a82a22" opacity="0.13" />
        <circle cx="566" cy="118" r="84" fill="url(#posterDotsMobile)" />

        {/* Overhead wire */}
        <line x1="0" y1="58" x2="760" y2="58" stroke="#171512" strokeWidth="2" opacity="0.45" />

        {/* Approach rail bed */}
        <line x1="0" y1="242" x2="432" y2="242" stroke="#171512" strokeWidth="4" />
        <line x1="0" y1="260" x2="432" y2="260" stroke="#171512" strokeWidth="4" />
        {Array.from({ length: 11 }).map((_, i) => (
          <line
            key={i}
            x1={18 + i * 38}
            y1="238"
            x2={18 + i * 38}
            y2="264"
            stroke="#171512"
            strokeWidth="2.2"
            opacity="0.3"
          />
        ))}

        {/* Diverging branches — full split + endpoints kept inside mobile frame */}
        <path d="M 432 242 C 516 242, 578 164, 728 138" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" />
        <path d="M 432 260 C 516 260, 578 184, 728 158" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
        <path d="M 432 242 C 516 242, 578 292, 728 304" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" />
        <path d="M 432 260 C 516 260, 578 312, 728 324" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
        <circle cx="728" cy="148" r="8.5" fill="#1f6b5c" stroke="#171512" strokeWidth="3" />
        <circle cx="728" cy="314" r="8.5" fill="#a82a22" stroke="#171512" strokeWidth="3" />

        {/* Junction */}
        <circle cx="432" cy="251" r="10" fill="#e9e9e6" stroke="#171512" strokeWidth="3.8" />
        <line x1="432" y1="251" x2="482" y2="251" stroke="#171512" strokeWidth="4.8" strokeLinecap="round" transform="rotate(-10 432 251)" />

        {/* Motion lines */}
        {!reduceMotion && (
          <g stroke="#a82a22" strokeWidth="3.6" strokeLinecap="round" opacity="0.6">
            <line x1="94" y1="168" x2="132" y2="168" />
            <line x1="78" y1="190" x2="126" y2="190" />
            <line x1="98" y1="212" x2="132" y2="212" />
          </g>
        )}

        {/* Pantograph */}
        <g stroke="#171512" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 192 178 L 168 58 L 260 58" />
          <line x1="168" y1="58" x2="300" y2="58" />
        </g>

        {/* Tram body */}
        <rect x="150" y="176" width="236" height="74" rx="9" fill="#a82a22" stroke="#171512" strokeWidth="4" />
        <rect x="150" y="216" width="236" height="14" fill="#ffffff" stroke="#171512" strokeWidth="2.4" />
        <rect x="160" y="167" width="216" height="11" rx="5" fill="#171512" />

        <rect x="310" y="185" width="60" height="29" rx="4" fill="#f8f8f7" stroke="#171512" strokeWidth="2.8" />
        <rect x="162" y="185" width="40" height="29" rx="4" fill="#f8f8f7" stroke="#171512" strokeWidth="2.8" />
        <rect x="208" y="185" width="40" height="29" rx="4" fill="#f8f8f7" stroke="#171512" strokeWidth="2.8" />
        <rect x="254" y="185" width="40" height="29" rx="4" fill="#f8f8f7" stroke="#171512" strokeWidth="2.8" />

        <circle cx="376" cy="206" r="7" fill="#ffffff" stroke="#171512" strokeWidth="2.8" />
        <rect x="354" y="248" width="40" height="10" rx="3" fill="#171512" />
        <rect x="134" y="248" width="32" height="10" rx="3" fill="#171512" />
        <circle cx="196" cy="254" r="16" fill="#171512" />
        <circle cx="196" cy="254" r="5" fill="#ffffff" />
        <circle cx="336" cy="254" r="16" fill="#171512" />
        <circle cx="336" cy="254" r="5" fill="#ffffff" />

        <rect x="248" y="226" width="34" height="20" rx="3" fill="#171512" />
        <text
          x="265"
          y="236"
          dominantBaseline="central"
          textAnchor="middle"
          fill="#ffffff"
          style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 700 }}
        >
          27
        </text>

        {/* Mechanical lever — cleanly framed in lower-left */}
        <g transform="translate(72, 326)">
          <rect x="-28" y="-5" width="56" height="16" rx="3" fill="#171512" />
          <g transform="rotate(-22)">
            <line x1="0" y1="2" x2="0" y2="-44" stroke="#171512" strokeWidth="4.8" strokeLinecap="round" />
            <circle cx="0" cy="-50" r="10" fill="#a82a22" stroke="#171512" strokeWidth="3.2" />
          </g>
          <circle cx="0" cy="2" r="5.5" fill="#ffffff" stroke="#171512" strokeWidth="2.8" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 38 1440 344"
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
      role="img"
      aria-label="Raylarda makasa yaklaşan kırmızı tramvay ve ikiye ayrılan hat"
    >
      {/* The one flat colour field: a signal disc over the junction. */}
      <circle cx="1010" cy="142" r="96" fill="#a82a22" opacity="0.13" />

      {/* Overhead wire (extends past viewBox for ultrawide full-bleed) */}
      <line x1="-600" y1="68" x2="2200" y2="68" stroke="#171512" strokeWidth="2" opacity="0.45" />

      {/* Rail bed */}
      <line x1="-600" y1="266" x2="820" y2="266" stroke="#171512" strokeWidth="4" />
      <line x1="-600" y1="286" x2="820" y2="286" stroke="#171512" strokeWidth="4" />
      {Array.from({ length: 34 }).map((_, i) => (
        <line
          key={i}
          x1={-520 + i * 40}
          y1="262"
          x2={-520 + i * 40}
          y2="290"
          stroke="#171512"
          strokeWidth="2.4"
          opacity="0.3"
        />
      ))}

      {/* Diverging branches */}
      <path d="M 820 266 C 960 266, 1060 176, 1380 144" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" />
      <path d="M 820 286 C 960 286, 1060 198, 1380 166" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <path d="M 820 266 C 960 266, 1060 318, 1380 332" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" />
      <path d="M 820 286 C 960 286, 1060 340, 1380 354" fill="none" stroke="#171512" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <circle cx="1380" cy="155" r="9" fill="#1f6b5c" stroke="#171512" strokeWidth="3" />
      <circle cx="1380" cy="343" r="9" fill="#a82a22" stroke="#171512" strokeWidth="3" />

      {/* Junction */}
      <circle cx="820" cy="276" r="11" fill="#e9e9e6" stroke="#171512" strokeWidth="4" />
      <line x1="820" y1="276" x2="878" y2="276" stroke="#171512" strokeWidth="5" strokeLinecap="round" transform="rotate(-9 820 276)" />

      {/* Motion lines */}
      {!reduceMotion && (
        <g stroke="#a82a22" strokeWidth="4" strokeLinecap="round" opacity="0.6">
          <line x1="398" y1="184" x2="448" y2="184" />
          <line x1="378" y1="208" x2="440" y2="208" />
          <line x1="402" y1="232" x2="448" y2="232" />
        </g>
      )}

      {/* Pantograph */}
      <g stroke="#171512" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 530 194 L 502 68 L 610 68" />
        <line x1="502" y1="68" x2="658" y2="68" />
      </g>

      {/* Tram body */}
      <rect x="482" y="192" width="286" height="84" rx="10" fill="#a82a22" stroke="#171512" strokeWidth="4" />
      <rect x="482" y="238" width="286" height="16" fill="#ffffff" stroke="#171512" strokeWidth="2.5" />
      <rect x="494" y="182" width="262" height="13" rx="6" fill="#171512" />

      <rect x="676" y="202" width="72" height="34" rx="5" fill="#f8f8f7" stroke="#171512" strokeWidth="3" />
      <rect x="496" y="202" width="48" height="34" rx="5" fill="#f8f8f7" stroke="#171512" strokeWidth="3" />
      <rect x="550" y="202" width="48" height="34" rx="5" fill="#f8f8f7" stroke="#171512" strokeWidth="3" />
      <rect x="604" y="202" width="48" height="34" rx="5" fill="#f8f8f7" stroke="#171512" strokeWidth="3" />

      <circle cx="756" cy="226" r="8" fill="#ffffff" stroke="#171512" strokeWidth="3" />
      <rect x="730" y="274" width="48" height="11" rx="3" fill="#171512" />
      <rect x="462" y="274" width="40" height="11" rx="3" fill="#171512" />
      <circle cx="534" cy="280" r="19" fill="#171512" />
      <circle cx="534" cy="280" r="6" fill="#ffffff" />
      <circle cx="706" cy="280" r="19" fill="#171512" />
      <circle cx="706" cy="280" r="6" fill="#ffffff" />

      <rect x="602" y="248" width="36" height="22" rx="3" fill="#171512" />
      <text
        x="620"
        y="259"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#ffffff"
        style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 700 }}
      >
        27
      </text>

      {/* Mechanical lever */}
      <g transform="translate(348, 344)">
        <rect x="-30" y="-6" width="60" height="18" rx="3" fill="#171512" />
        <g transform="rotate(-24)">
          <line x1="0" y1="2" x2="0" y2="-50" stroke="#171512" strokeWidth="5" strokeLinecap="round" />
          <circle cx="0" cy="-56" r="11" fill="#a82a22" stroke="#171512" strokeWidth="3.5" />
        </g>
        <circle cx="0" cy="2" r="6" fill="#ffffff" stroke="#171512" strokeWidth="3" />
      </g>
    </svg>
  );
};
