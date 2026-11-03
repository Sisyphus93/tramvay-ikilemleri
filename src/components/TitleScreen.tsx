/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import { DILEMMAS } from '../data/dilemmas.ts';

interface TitleScreenProps {
  onStart: () => void;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const reduceMotion = useReducedMotion();

  const container = reduceMotion
    ? { hidden: {}, show: {} }
    : { hidden: {}, show: { transition: { staggerChildren: 0.075, delayChildren: 0.04 } } };

  const rise = reduceMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
      };

  const titleRise = reduceMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: '0.5em' },
        show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
      };

  const art = reduceMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 26, rotate: -0.8 },
        show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE, delay: 0.1 } },
      };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="poster w-full"
    >
      <motion.div variants={rise} className="poster__kicker">
        <span className="poster__kicker-tag">
          <span
            aria-hidden="true"
            style={{
              width: 5,
              height: 5,
              borderRadius: 99,
              background: '#ff8a70',
              animation: reduceMotion ? undefined : 'pulse-dot 2.6s ease-in-out infinite',
            }}
          />
          Interaktif Felsefe
        </span>
        <span className="micro-label">Türk internet edisyonu</span>
        <span className="micro-label" style={{ color: '#c3b49c' }}>·</span>
        <span className="micro-label">Neal.fun’a saygıyla</span>
      </motion.div>

      <div className="poster__grid">
        <div>
          <h1 className="poster__title">
            <span className="line" style={{ overflow: 'hidden' }}>
              <motion.span variants={titleRise} style={{ display: 'block' }}>
                Absürt
              </motion.span>
            </span>
            <span className="line" style={{ overflow: 'hidden' }}>
              <motion.span variants={titleRise} style={{ display: 'block' }}>
                <span className="accent">Tramvay</span>
              </motion.span>
            </span>
            <span className="line" style={{ overflow: 'hidden' }}>
              <motion.span variants={titleRise} style={{ display: 'block' }}>
                İkilemleri
              </motion.span>
            </span>
          </h1>

          <motion.p variants={rise} className="poster__lede">
            Kontrolden çıkmış nostaljik bir tramvay raylarda ilerliyor. Önünde bağlı duranlar
            tanıdık: <strong>Steam kütüphanen</strong>, yolcu seçen sarı taksi,
            Kurtlar Vadisi’nin ilk 97 bölümü, final gecesi not çıkaran öğrenci, 0/15 giden
            kolsuz kankan — ya da <strong>bizzat sen</strong>.
          </motion.p>

          <motion.dl variants={rise} className="poster__facts">
            <div className="poster__fact">
              <dt>İkilem</dt>
              <dd className="numeral">{DILEMMAS.length}</dd>
            </div>
            <div className="poster__fact">
              <dt>Karar</dt>
              <dd className="numeral">
                2<span>hat</span>
              </dd>
            </div>
            <div className="poster__fact">
              <dt>Doğru cevap</dt>
              <dd className="numeral">
                0<span>yok</span>
              </dd>
            </div>
          </motion.dl>

          <motion.div variants={rise} className="poster__cta">
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
          </motion.div>
        </div>

        <motion.figure variants={art} className="poster__art m-0" aria-label="Poster illüstrasyonu">
          <span className="poster__art-label">Plan 27 · Makas Şeması</span>
          <PosterArt reduceMotion={!!reduceMotion} />
        </motion.figure>
      </div>

      <motion.div variants={rise} className="poster__foot">
        <span>Kolu çekmek ya da çekmemek… işte bütün mesele bu.</span>
        <span>27 plan · tek makas</span>
      </motion.div>
    </motion.div>
  );
};

/* --------------------------------------------------------------------------
   Poster artwork: flat riso inks, thick ink outlines, no glows.
   -------------------------------------------------------------------------- */

const PosterArt: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => (
  <svg viewBox="0 0 560 400" role="img" aria-label="Raylarda ilerleyen kırmızı tramvay ve makas kolu">
    <defs>
      <pattern id="posterDots" width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.15" fill="#171512" opacity="0.16" />
      </pattern>
      <clipPath id="posterClip">
        <rect x="0" y="0" width="560" height="400" />
      </clipPath>
    </defs>

    <g clipPath="url(#posterClip)">
      <rect width="560" height="400" fill="#efe4cd" />

      {/* Huge ghost numeral */}
      <text
        x="500"
        y="330"
        textAnchor="end"
        fill="#171512"
        opacity="0.055"
        style={{ fontFamily: 'Archivo, sans-serif', fontSize: 300, fontWeight: 900, letterSpacing: '-0.06em' }}
      >
        27
      </text>

      {/* Sun / ink disc */}
      <circle cx="330" cy="150" r="118" fill="#d4452b" opacity="0.14" />
      <circle cx="330" cy="150" r="118" fill="url(#posterDots)" />
      <rect width="560" height="400" fill="url(#posterDots)" opacity="0.55" />

      {/* Overhead wire */}
      <line x1="0" y1="96" x2="560" y2="96" stroke="#171512" strokeWidth="1.4" opacity="0.5" />
      <line x1="0" y1="92" x2="560" y2="92" stroke="#171512" strokeWidth="0.8" opacity="0.3" />

      {/* Rail bed */}
      <line x1="0" y1="312" x2="560" y2="312" stroke="#171512" strokeWidth="3" opacity="0.9" />
      {Array.from({ length: 15 }).map((_, i) => (
        <line
          key={i}
          x1={14 + i * 38}
          y1="312"
          x2={14 + i * 38}
          y2="326"
          stroke="#171512"
          strokeWidth="2"
          opacity="0.28"
        />
      ))}

      {/* Diverging branch (map style) */}
      <path
        d="M 372 312 C 420 312, 448 268, 520 258"
        fill="none"
        stroke="#171512"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M 372 312 C 420 312, 448 356, 520 366"
        fill="none"
        stroke="#171512"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="520" cy="258" r="7" fill="#2e7d6e" stroke="#171512" strokeWidth="2" />
      <circle cx="520" cy="366" r="7" fill="#d4452b" stroke="#171512" strokeWidth="2" />

      {/* Motion lines */}
      {!reduceMotion && (
        <g stroke="#d4452b" strokeWidth="3" strokeLinecap="round" opacity="0.55">
          <line x1="22" y1="176" x2="58" y2="176" />
          <line x1="8" y1="200" x2="52" y2="200" />
          <line x1="28" y1="224" x2="60" y2="224" />
        </g>
      )}

      {/* Pantograph */}
      <g stroke="#171512" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 132 208 L 108 96 L 196 96" />
        <line x1="108" y1="96" x2="236" y2="96" />
      </g>

      {/* Tram body */}
      <g>
        <rect x="78" y="204" width="248" height="86" rx="10" fill="#d4452b" stroke="#171512" strokeWidth="3.4" />
        {/* cream band */}
        <rect x="78" y="252" width="248" height="14" fill="#f2e9d8" stroke="#171512" strokeWidth="2" />
        {/* roof cap */}
        <rect x="88" y="196" width="228" height="12" rx="6" fill="#171512" />
        {/* windshield + windows */}
        <rect x="252" y="214" width="62" height="34" rx="4" fill="#f6eeda" stroke="#171512" strokeWidth="2.6" />
        <rect x="258" y="220" width="22" height="22" rx="2" fill="#2c5f8a" opacity="0.25" />
        <rect x="88" y="214" width="42" height="34" rx="4" fill="#f6eeda" stroke="#171512" strokeWidth="2.6" />
        <rect x="138" y="214" width="42" height="34" rx="4" fill="#f6eeda" stroke="#171512" strokeWidth="2.6" />
        <rect x="188" y="214" width="42" height="34" rx="4" fill="#f6eeda" stroke="#171512" strokeWidth="2.6" />
        {/* destination sign */}
        <rect x="196" y="276" width="98" height="12" rx="2" fill="#171512" opacity="0.12" />
        <text
          x="245"
          y="285"
          textAnchor="middle"
          fill="#171512"
          style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 7.5, letterSpacing: '0.16em', fontWeight: 600 }}
        >
          MAKAS · 27
        </text>
        {/* headlight + bumper */}
        <circle cx="316" cy="238" r="7" fill="#ffe9b8" stroke="#171512" strokeWidth="2.4" />
        <rect x="300" y="288" width="42" height="10" rx="3" fill="#171512" />
        <rect x="60" y="288" width="34" height="10" rx="3" fill="#171512" />
        {/* wheels */}
        <circle cx="122" cy="294" r="17" fill="#171512" />
        <circle cx="122" cy="294" r="6" fill="#f2e9d8" />
        <circle cx="258" cy="294" r="17" fill="#171512" />
        <circle cx="258" cy="294" r="6" fill="#f2e9d8" />
        {/* route badge */}
        <rect x="90" y="262" width="30" height="20" rx="2" fill="#171512" />
        <text
          x="105"
          y="276"
          textAnchor="middle"
          fill="#f2e9d8"
          style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 600 }}
        >
          27
        </text>
      </g>

      {/* Lever */}
      <g transform="translate(70, 356)">
        <rect x="-26" y="-6" width="52" height="16" rx="3" fill="#171512" />
        <g
          style={{
            transformOrigin: '0px 2px',
            transform: 'rotate(-26deg)',
            animation: reduceMotion ? undefined : 'none',
          }}
        >
          <line x1="0" y1="2" x2="0" y2="-50" stroke="#171512" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="0" cy="-56" r="10" fill="#d4452b" stroke="#171512" strokeWidth="3" />
        </g>
        <circle cx="0" cy="2" r="5" fill="#f2e9d8" stroke="#171512" strokeWidth="2.4" />
      </g>

      {/* Corner registration ticks */}
      <g stroke="#171512" strokeWidth="1.2" opacity="0.35">
        <path d="M 14 22 h 16 M 14 22 v 16" fill="none" />
        <path d="M 546 22 h -16 M 546 22 v 16" fill="none" />
        <path d="M 14 378 h 16 M 14 378 v -16" fill="none" />
        <path d="M 546 378 h -16 M 546 378 v -16" fill="none" />
      </g>

      <text
        x="22"
        y="392"
        fill="#171512"
        opacity="0.45"
        style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 7.5, letterSpacing: '0.16em' }}
      >
        DÜZ HAT · MAKAS BEKLEMEDE
      </text>
      <text
        x="536"
        y="392"
        textAnchor="end"
        fill="#171512"
        opacity="0.45"
        style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 7.5, letterSpacing: '0.16em' }}
      >
        REV. 27
      </text>
    </g>
  </svg>
);
