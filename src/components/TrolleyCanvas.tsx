/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Dilemma, Decision, TrackTarget, TrackEntityType } from '../types.ts';
import { playRisingSweep, playLowThump } from '../utils/audio.ts';

interface TrolleyCanvasProps {
  dilemma: Dilemma;
  decision: Decision | null;
  isAnimating: boolean;
  onAnimationEnd: () => void;
  leverPulled: boolean;
  onLeverToggle: () => void;
}

type EntityKind = 'human' | 'object' | 'cat' | 'abstract';

interface EntityMeta {
  code: string;
  kind: EntityKind;
}

const ENTITY_META = {
  people: { code: 'İNS', kind: 'human' },
  streamer: { code: 'YAY', kind: 'human' },
  moderator: { code: 'MOD', kind: 'human' },
  gamer: { code: 'OYN', kind: 'human' },
  cat: { code: 'KED', kind: 'cat' },
  pc: { code: 'PC', kind: 'object' },
  steam: { code: 'STM', kind: 'object' },
  doner: { code: 'DÖN', kind: 'object' },
  taxi: { code: 'TAK', kind: 'object' },
  marti: { code: 'MRT', kind: 'object' },
  harddrive: { code: 'DSK', kind: 'object' },
  student: { code: 'ÖĞR', kind: 'human' },
  yourself: { code: 'SEN', kind: 'human' },
  teammate: { code: 'EQP', kind: 'human' },
  richman: { code: 'ZNG', kind: 'human' },
  futurepeople: { code: 'GEL', kind: 'human' },
  npc: { code: 'NPC', kind: 'human' },
  code: { code: 'KOD', kind: 'object' },
  savings: { code: 'BRK', kind: 'object' },
  painting: { code: 'SNT', kind: 'object' },
  sleepers: { code: 'UYK', kind: 'human' },
  bestfriend: { code: 'ARK', kind: 'human' },
  glasses: { code: 'GÖZ', kind: 'object' },
  cousins: { code: 'KZN', kind: 'human' },
  baby: { code: 'BEK', kind: 'human' },
  elderly: { code: 'YAŞ', kind: 'human' },
  clone: { code: 'KLN', kind: 'human' },
  mysterybox: { code: 'KUT', kind: 'object' },
  robot: { code: 'RBT', kind: 'object' },
  emptytrolley: { code: 'TRM', kind: 'object' },
  prank: { code: 'ŞAK', kind: 'abstract' },
  enemy: { code: 'DŞM', kind: 'human' },
  lifespan: { code: 'ÖMR', kind: 'abstract' },
  hype: { code: 'HYP', kind: 'abstract' },
  gugu: { code: 'GUG', kind: 'human' },
  ibo: { code: 'İBO', kind: 'human' },
  samet: { code: 'SMT', kind: 'human' },
  mete: { code: 'MTE', kind: 'human' },
  kegri: { code: 'KGR', kind: 'human' },
  katmanmasa: { code: 'KTM', kind: 'abstract' },
  reddit: { code: 'RDT', kind: 'object' },
  kick: { code: 'KCK', kind: 'object' },
  food: { code: 'YMK', kind: 'object' },
  canolar: { code: 'CAN', kind: 'human' },
  sponsor: { code: 'SPN', kind: 'human' },
  discord: { code: 'DSC', kind: 'object' },
} satisfies Record<TrackEntityType, EntityMeta>;

const easeInOutCubic = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

export const TrolleyCanvas: React.FC<TrolleyCanvasProps> = ({
  dilemma,
  decision,
  isAnimating,
  onAnimationEnd,
  leverPulled,
  onLeverToggle,
}) => {
  const [tramProgress, setTramProgress] = useState<number>(0);
  const [impactHappened, setImpactHappened] = useState(false);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAnimating && decision) {
      setImpactHappened(false);
      setTramProgress(0);
      playRisingSweep();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = prefersReducedMotion ? 420 : 1650;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / duration);
        setTramProgress(easeInOutCubic(p));

        if (p >= 0.9 && !impactHappened) {
          setImpactHappened(true);
          playLowThump();
        }

        if (p < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          onAnimationEnd();
        }
      };

      animRef.current = requestAnimationFrame(animate);
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }

    setTramProgress(0);
    setImpactHappened(false);
  }, [isAnimating, decision, onAnimationEnd]);

  const calculateTramPosition = (p: number, path: Decision) => {
    if (p <= 0.34) {
      const localP = p / 0.34;
      return { x: 60 + localP * 190, y: 160, angle: 0 };
    }
    const localP = (p - 0.34) / 0.66;
    const startX = 250;
    const startY = 160;
    const endX = 570;
    const endY = path === 'straight' ? 106 : 242;
    const bend = Math.sin((localP * Math.PI) / 2);
    return {
      x: startX + localP * (endX - startX),
      y: startY + (endY - startY) * bend,
      angle: (path === 'straight' ? -9 : 9) * Math.sin(localP * Math.PI),
    };
  };

  const effectivePath = decision || (leverPulled ? 'diverted' : 'straight');
  const tramPos = calculateTramPosition(tramProgress, effectivePath);
  const straightActive = !leverPulled;
  const divertedActive = leverPulled;

  const renderTargetEntity = (target: TrackTarget, isDiverted: boolean) => {
    const isHit =
      impactHappened &&
      ((isDiverted && decision === 'diverted') || (!isDiverted && decision === 'straight'));
    const meta = ENTITY_META[target.entityType];
    const shownCount = Math.max(1, Math.min(target.count, 5));
    const label = target.label.toUpperCase();

    return (
      <g className={`blueprint-medallion ${isHit ? 'blueprint-medallion--hit' : ''}`}>
        <circle className="blueprint-medallion__shadow" cx="0" cy="4" r="36" />
        <circle className="blueprint-medallion__ring" cx="0" cy="0" r="34" />
        <circle className="blueprint-medallion__inner" cx="0" cy="0" r="27" />
        <circle className="blueprint-medallion__pivot" cx="0" cy="0" r="2" />

        {meta.kind === 'human' && (
          <g className="blueprint-medallion__pins">
            {Array.from({ length: shownCount }).map((_, i) => {
              const x = (i - (shownCount - 1) / 2) * 9;
              return (
                <g key={i} transform={`translate(${x}, 0)`}>
                  <circle cx="0" cy="-9" r="2.4" className="blueprint-pin__head" />
                  <path d="M 0 -6 L 0 7 M -4 0 L 4 0 M -3 11 L 0 7 L 3 11" className="blueprint-pin__body" />
                </g>
              );
            })}
          </g>
        )}

        {meta.kind === 'object' && (
          <g className="blueprint-medallion__object">
            <rect x="-12" y="-12" width="24" height="24" rx="2" transform="rotate(45)" className="blueprint-object__plate" />
            <text x="0" y="3" textAnchor="middle" className="blueprint-code">
              {meta.code}
            </text>
          </g>
        )}

        {meta.kind === 'cat' && (
          <g className="blueprint-medallion__cat">
            <path d="M -15 10 Q -15 -4 -8 -8 L -10 -16 L -2 -10 Q 0 -11 2 -10 L 10 -16 L 8 -8 Q 15 -4 15 10 Z" className="blueprint-cat__outline" />
            <path d="M -15 10 Q 0 16 15 10" className="blueprint-cat__outline" />
          </g>
        )}

        {meta.kind === 'abstract' && (
          <g className="blueprint-medallion__abstract">
            <circle cx="0" cy="0" r="14" className="blueprint-abstract__arc" />
            <circle cx="0" cy="0" r="8" className="blueprint-abstract__arc" />
            <path d="M 0 -18 L 6 -12 L 0 -6 L -6 -12 Z" className="blueprint-abstract__diamond" />
          </g>
        )}

        <text x="0" y="49" textAnchor="middle" className="blueprint-count">
          ×{target.count}
        </text>
        {target.count > 5 && (
          <text x="0" y="-40" textAnchor="middle" className="blueprint-overflow">
            +{target.count - 5}
          </text>
        )}
        <text
          x="0"
          y="66"
          textAnchor="middle"
          textLength="150"
          lengthAdjust="spacingAndGlyphs"
          className="blueprint-label"
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <div className="canvas-inner blueprint-canvas relative w-full max-w-4xl mx-auto select-none">
      <div className="blueprint-sheen" aria-hidden="true" />
      <svg
        viewBox="0 0 720 320"
        className="blueprint-svg w-full h-auto block"
        role="img"
        aria-label={`${dilemma.title} makas şeması`}
      >
        <defs>
          <linearGradient id="parchmentField" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F9F3E8" />
            <stop offset="55%" stopColor="#F4EDDF" />
            <stop offset="100%" stopColor="#EADDC2" />
          </linearGradient>
          <linearGradient id="brassGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8A6222" />
            <stop offset="45%" stopColor="#E6C77A" />
            <stop offset="100%" stopColor="#B8893B" />
          </linearGradient>
          <radialGradient id="blueprintSpot" cx="38%" cy="8%" r="80%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#E6C77A" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#B8893B" stopOpacity="0" />
          </radialGradient>
          <pattern id="blueprintGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#B8893B" strokeWidth="0.5" opacity="0.28" />
            <path d="M 12 0 L 12 24 M 0 12 L 24 12" fill="none" stroke="#B8893B" strokeWidth="0.35" opacity="0.12" />
          </pattern>
          <filter id="brassGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="inkShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2A2520" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect width="720" height="320" fill="url(#parchmentField)" />
        <rect width="720" height="320" fill="url(#blueprintGrid)" />
        <rect width="720" height="320" fill="url(#blueprintSpot)" />

        {/* Registration marks */}
        <g className="blueprint-registration">
          <path d="M 18 18 h 18 M 18 18 v 18" />
          <path d="M 702 18 h -18 M 702 18 v 18" />
          <path d="M 18 302 h 18 M 18 302 v -18" />
          <path d="M 702 302 h -18 M 702 302 v -18" />
        </g>

        {/* Measurement ticks */}
        <g className="blueprint-ticks">
          {Array.from({ length: 29 }).map((_, i) => {
            const x = 24 + i * 24;
            const major = i % 4 === 0;
            return <line key={i} x1={x} y1="10" x2={x} y2={major ? 22 : 16} />;
          })}
          {Array.from({ length: 29 }).map((_, i) => {
            const x = 24 + i * 24;
            const major = i % 4 === 0;
            return <line key={`b-${i}`} x1={x} y1="310" x2={x} y2={major ? 298 : 304} />;
          })}
        </g>

        {/* Title block */}
        <g className="blueprint-titleblock">
          <text x="34" y="40" className="blueprint-label">
            MAKAS ŞEMASI · PLAN {String(dilemma.id).padStart(2, '0')}
          </text>
          <text x="34" y="55" className="blueprint-subcode">
            ÖLÇEK 1:1 · {dilemma.conceptualChoice ? 'KAVRAMSAL SEÇİM' : 'FİZİKSEL YÖN'}
          </text>
          <text x="686" y="40" textAnchor="end" className="blueprint-label">
            TRAMVAY İKİLEMLERİ
          </text>
          <text x="686" y="55" textAnchor="end" className="blueprint-subcode">
            REV. 27 · BRASS BLUEPRINT
          </text>
        </g>
        <line x1="34" y1="64" x2="686" y2="64" className="blueprint-rule" />

        {/* Ground / survey line */}
        <path d="M 24 272 Q 360 266 696 272" className="blueprint-ground" />

        {/* Approach rails */}
        <g className="blueprint-rail-group">
          <path d="M 40 150 L 250 150" className="blueprint-rail blueprint-rail--approach" />
          <path d="M 40 170 L 250 170" className="blueprint-rail blueprint-rail--approach" />
          {[56, 88, 120, 152, 184, 216].map((x) => (
            <line key={x} x1={x} y1="144" x2={x} y2="176" className="blueprint-sleeper" />
          ))}
        </g>

        {/* Straight branch */}
        <g className={`blueprint-rail-group ${straightActive ? 'is-active' : ''}`}>
          <path d="M 250 150 C 360 150, 450 96, 660 96" className="blueprint-rail blueprint-rail--straight" />
          <path d="M 250 170 C 360 170, 450 116, 660 116" className="blueprint-rail blueprint-rail--straight" />
          {straightActive && (
            <>
              <path d="M 250 150 C 360 150, 450 96, 660 96" className="blueprint-rail-highlight blueprint-rail-highlight--straight" />
              <path d="M 250 170 C 360 170, 450 116, 660 116" className="blueprint-rail-highlight blueprint-rail-highlight--straight" />
            </>
          )}
          {[276, 316, 356, 396, 436, 476, 516, 556, 596, 636].map((x, i) => {
            const t = i / 9;
            const y = 160 - 54 * Math.sin((t * Math.PI) / 2);
            return <line key={`s-${x}`} x1={x} y1={y - 13} x2={x} y2={y + 13} className="blueprint-sleeper" transform={`rotate(${-8 * t}, ${x}, ${y})`} />;
          })}
        </g>

        {/* Diverted branch */}
        <g className={`blueprint-rail-group ${divertedActive ? 'is-active' : ''}`}>
          <path d="M 250 150 C 360 150, 450 232, 660 232" className="blueprint-rail blueprint-rail--diverted" />
          <path d="M 250 170 C 360 170, 450 252, 660 252" className="blueprint-rail blueprint-rail--diverted" />
          {divertedActive && (
            <>
              <path d="M 250 150 C 360 150, 450 232, 660 232" className="blueprint-rail-highlight blueprint-rail-highlight--diverted" />
              <path d="M 250 170 C 360 170, 450 252, 660 252" className="blueprint-rail-highlight blueprint-rail-highlight--diverted" />
            </>
          )}
          {[276, 316, 356, 396, 436, 476, 516, 556, 596, 636].map((x, i) => {
            const t = i / 9;
            const y = 160 + 82 * Math.sin((t * Math.PI) / 2);
            return <line key={`d-${x}`} x1={x} y1={y - 13} x2={x} y2={y + 13} className="blueprint-sleeper" transform={`rotate(${11 * t}, ${x}, ${y})`} />;
          })}
        </g>

        {/* Switch blade */}
        <g className="blueprint-switch">
          <circle cx="250" cy="160" r="6" className="blueprint-switch__pivot" />
          <g
            className="blueprint-switch__blade-group"
            transform={`rotate(${leverPulled ? 12 : -12} 250 160)`}
          >
            <line x1="250" y1="160" x2="288" y2="160" className="blueprint-switch__blade" />
          </g>
          <circle cx="250" cy="160" r="2" className="blueprint-switch__pin" />
        </g>

        {/* Upper target medallion */}
        <g transform="translate(600, 106)">{renderTargetEntity(dilemma.straightTrack, false)}</g>

        {/* Lower target medallion */}
        <g transform="translate(600, 242)">{renderTargetEntity(dilemma.divertedTrack, true)}</g>

        {/* Mechanical lever */}
        <g
          transform="translate(196, 252)"
          className="blueprint-lever"
          onClick={!isAnimating ? onLeverToggle : undefined}
          data-hover-sound
          role="button"
          aria-label="Makas kolunu çevir"
        >
          <rect x="-22" y="-8" width="44" height="20" rx="3" className="blueprint-lever__base" />
          <rect x="-18" y="-4" width="36" height="3" rx="1.5" className="blueprint-lever__trim" />
          <circle cx="0" cy="0" r="5" className="blueprint-lever__pivot" />
          <g transform={`rotate(${leverPulled ? 28 : -28})`} className="blueprint-lever__handle">
            <line x1="0" y1="0" x2="0" y2="-44" className="blueprint-lever__stem" />
            <circle cx="0" cy="-48" r="11" className="blueprint-lever__glow" filter="url(#brassGlow)" />
            <circle cx="0" cy="-48" r="7" className="blueprint-lever__knob" />
          </g>
          <text x="30" y="4" className="blueprint-subcode">
            MAKAS KOLU
          </text>
        </g>

        {/* Legend */}
        <g className="blueprint-legend">
          <rect x="34" y="286" width="14" height="3" className="blueprint-legend__straight" />
          <text x="54" y="291" className="blueprint-subcode">DÜZ HAT</text>
          <rect x="128" y="286" width="14" height="3" className="blueprint-legend__diverted" />
          <text x="148" y="291" className="blueprint-subcode">MAKAS HATTI</text>
          <text x="686" y="291" textAnchor="end" className="blueprint-subcode">
            {leverPulled ? 'AKTİF: MAKAS' : 'AKTİF: DÜZ'}
          </text>
        </g>

        {/* Art-deco tram */}
        <g
          transform={`translate(${tramPos.x}, ${tramPos.y}) rotate(${tramPos.angle})`}
          className="blueprint-tram"
          filter="url(#inkShadow)"
        >
          {isAnimating && (
            <g className="blueprint-tram-trail">
              <line x1="-72" y1="-8" x2="-48" y2="-8" />
              <line x1="-84" y1="0" x2="-48" y2="0" />
              <line x1="-72" y1="8" x2="-48" y2="8" />
            </g>
          )}
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
          <circle cx="44" cy="0" r="4" className="blueprint-tram__lamp" filter="url(#brassGlow)" />
          <path d="M 48 -3 L 74 -12 L 74 12 L 48 3 Z" className="blueprint-tram__beam" />
          <path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" className="blueprint-tram__emblem" />
        </g>
      </svg>
    </div>
  );
};
