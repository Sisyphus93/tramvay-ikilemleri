/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Dilemma, Decision, TrackTarget, TrackEntityType } from '../types.ts';

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

/* Scene geometry (compact viewBox 880 × 248, zero vertical dead space) */
const VIEW_W = 880;
const VIEW_H = 248;
const RAIL_Y = 132;
const JUNCTION_X = 310;
const STRAIGHT_Y = 72;
const DIVERTED_Y = 192;
const START_X = 78;
const STOP_X = 622;
const PLATE_X = 792;
const PLATE_W = 136;
const PLATE_H = 72;

const INK = '#171512';
const RED = '#a82a22';
const TEAL = '#1f6b5c';
const PAPER = '#ffffff';
const CARD = '#f8f8f7';

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
      // Audio is driven by App: playDecision() on commit (lever/brake gesture,
      // rumble + rail clacks) and playImpact() from onAnimationEnd.

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

  const tramPosition = (p: number, path: Decision) => {
    if (p <= 0.3) {
      const localP = p / 0.3;
      return { x: START_X + localP * (JUNCTION_X - 40 - START_X), y: RAIL_Y, angle: 0 };
    }
    const localP = (p - 0.3) / 0.7;
    const startX = JUNCTION_X - 40;
    const endY = path === 'straight' ? STRAIGHT_Y : DIVERTED_Y;
    const bend = Math.sin((localP * Math.PI) / 2);
    return {
      x: startX + localP * (STOP_X - startX),
      y: RAIL_Y + (endY - RAIL_Y) * bend,
      angle: (path === 'straight' ? -6 : 6) * Math.sin(localP * Math.PI),
    };
  };

  const effectivePath: Decision = decision || (leverPulled ? 'diverted' : 'straight');
  const tramPos = tramPosition(tramProgress, effectivePath);
  const straightActive = !leverPulled;
  const divertedActive = leverPulled;

  const renderObjectGlyph = (target: TrackTarget, meta: EntityMeta) => {
    switch (target.entityType) {
      case 'pc':
        return (
          <g transform="translate(-32, 0)">
            {/* Monitor */}
            <rect x="-16" y="-12" width="21" height="15" rx="2" fill={PAPER} stroke={INK} strokeWidth="2" />
            <line x1="-12" y1="-6" x2="-2" y2="-6" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="-12" y1="-2" x2="1" y2="-2" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
            <line x1="-5.5" y1="3" x2="-5.5" y2="9" stroke={INK} strokeWidth="2.2" />
            <line x1="-11" y1="9" x2="0" y2="9" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
            {/* Tower / backbone node */}
            <rect x="8" y="-12" width="8" height="21" rx="1.5" fill={PAPER} stroke={INK} strokeWidth="2" />
            <circle cx="12" cy="-7.5" r="1.5" fill={RED} />
            <line x1="10.2" y1="-2" x2="13.8" y2="-2" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
            <line x1="10.2" y1="1.5" x2="13.8" y2="1.5" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
          </g>
        );

      case 'steam':
        return (
          <g transform="translate(-32, 0)">
            {/* Gamepad silhouette */}
            <path
              d="M -11 -8 H 11 C 15 -8 17 -4 17 1 L 15 9 C 14.2 12 11 12 9 9.5 L 6 6 H -6 L -9 9.5 C -11 12 -14.2 12 -15 9 L -17 1 C -17 -4 -15 -8 -11 -8 Z"
              fill={PAPER}
              stroke={INK}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* D-pad */}
            <path d="M -9 -3.5 V 2.5 M -12 -0.5 H -6" stroke={INK} strokeWidth="2.1" strokeLinecap="round" />
            {/* Action buttons */}
            <circle cx="10.5" cy="-2" r="1.8" fill={RED} />
            <circle cx="7" cy="1" r="1.8" fill={INK} />
          </g>
        );

      case 'mysterybox':
        return (
          <g transform="translate(-32, 0)">
            {/* Vault safe / crate */}
            <rect x="-14" y="-13" width="28" height="26" rx="3" fill={PAPER} stroke={INK} strokeWidth="2.2" />
            <rect x="-10" y="-9" width="20" height="18" rx="1.5" fill="none" stroke={INK} strokeWidth="1.3" opacity="0.55" />
            <line x1="-15.5" y1="-6" x2="-13" y2="-6" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
            <line x1="-15.5" y1="6" x2="-13" y2="6" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="1" cy="0" r="5.2" fill={RED} stroke={INK} strokeWidth="1.8" />
            <circle cx="1" cy="0" r="1.6" fill={PAPER} />
          </g>
        );

      case 'harddrive':
        return (
          <g transform="translate(-32, 0)">
            {/* Master broadcast tape cassette */}
            <rect x="-16" y="-11" width="32" height="22" rx="2.5" fill={PAPER} stroke={INK} strokeWidth="2" />
            <rect x="-13" y="-8" width="26" height="3.8" rx="1" fill={RED} />
            <circle cx="-6.5" cy="2" r="4.3" fill="none" stroke={INK} strokeWidth="1.8" />
            <circle cx="6.5" cy="2" r="4.3" fill="none" stroke={INK} strokeWidth="1.8" />
            <circle cx="-6.5" cy="2" r="1.4" fill={INK} />
            <circle cx="6.5" cy="2" r="1.4" fill={INK} />
            <line x1="-6" y1="11" x2="6" y2="11" stroke={INK} strokeWidth="2.4" />
          </g>
        );

      case 'taxi':
        return (
          <g transform="translate(-32, 1)">
            {/* Roof TAXI lamp */}
            <rect x="-5.5" y="-14" width="11" height="4.2" rx="1" fill={RED} stroke={INK} strokeWidth="1.6" />
            {/* Cabin + body */}
            <path
              d="M -11 -9.5 H 9 L 13 -3 H 16.5 C 17.5 -3 18 -2 18 -1 V 5.5 H -17 V -1 C -17 -2 -16.2 -3 -15 -3 H -13 Z"
              fill={PAPER}
              stroke={INK}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line x1="-1" y1="-9" x2="-1" y2="-3" stroke={INK} strokeWidth="1.6" />
            <line x1="-15" y1="1.2" x2="16" y2="1.2" stroke={RED} strokeWidth="2" strokeDasharray="3 2.5" />
            <circle cx="-9.5" cy="6.5" r="3.6" fill={INK} />
            <circle cx="9.5" cy="6.5" r="3.6" fill={INK} />
            <circle cx="-9.5" cy="6.5" r="1.3" fill={PAPER} />
            <circle cx="9.5" cy="6.5" r="1.3" fill={PAPER} />
          </g>
        );

      case 'marti':
        return (
          <g transform="translate(-32, 1)">
            {/* Scooter + rider silhouette */}
            <line x1="-12" y1="7.5" x2="7.5" y2="7.5" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <line x1="6.5" y1="7.5" x2="10.5" y2="-11" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <line x1="6.5" y1="-11" x2="13.5" y2="-11" stroke={RED} strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="-11.5" cy="9" r="3.6" fill={INK} />
            <circle cx="9" cy="9" r="3.6" fill={INK} />
            {/* Passenger */}
            <circle cx="-2.5" cy="-9.5" r="3" fill={RED} stroke={INK} strokeWidth="1.2" />
            <path d="M -2.5 -6 L -2.5 5 M -2.5 -2.5 L 7.5 -6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          </g>
        );

      case 'robot':
        return (
          <g transform="translate(-32, 1)">
            {/* Antenna + chassis head */}
            <line x1="0" y1="-10" x2="0" y2="-15" stroke={INK} strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="-16.5" r="2.3" fill={RED} stroke={INK} strokeWidth="1.3" />
            <rect x="-13" y="-10" width="26" height="20" rx="4" fill={PAPER} stroke={INK} strokeWidth="2" />
            <rect x="-16" y="-3.5" width="3" height="7" rx="1" fill={INK} />
            <rect x="13" y="-3.5" width="3" height="7" rx="1" fill={INK} />
            <circle cx="-5" cy="-2" r="2.2" fill={RED} />
            <circle cx="5" cy="-2" r="2.2" fill={RED} />
            <line x1="-6" y1="5" x2="6" y2="5" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          </g>
        );

      case 'hype':
        return (
          <g transform="translate(-32, 0)">
            {/* Megaphone / PR spotlight */}
            <path
              d="M -13 -3.5 L 5 -10.5 V 8.5 L -13 1.5 Z"
              fill={PAPER}
              stroke={INK}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M -9 2.5 L -7 10.5 H -3.5 L -5 3.5" fill={RED} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
            <line x1="9.5" y1="-6" x2="14" y2="-8.5" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="10" y1="-1" x2="15" y2="-1" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="9.5" y1="4" x2="14" y2="6.5" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
          </g>
        );

      case 'streamer':
        return (
          <g transform="translate(-32, 0)">
            {/* On-air broadcast screen */}
            <rect x="-15" y="-10" width="30" height="20" rx="3" fill={PAPER} stroke={INK} strokeWidth="2" />
            <circle cx="-7" cy="0" r="3.2" fill={RED} />
            <path d="M 0 -4 L 8 0 L 0 4 Z" fill={INK} />
          </g>
        );

      case 'yourself':
        return (
          <g transform="translate(-32, 0)">
            {/* Mind / IQ gauge */}
            <circle cx="0" cy="0" r="13" fill={PAPER} stroke={INK} strokeWidth="2" />
            <path d="M -7 4 A 8 8 0 0 1 7 4" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="0" y1="3" x2="5" y2="-4" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="0" cy="3" r="2" fill={INK} />
          </g>
        );

      case 'emptytrolley':
        return (
          <g transform="translate(-32, 0)">
            <rect x="-15" y="-9" width="30" height="15" rx="3" fill={RED} stroke={INK} strokeWidth="2" />
            <rect x="-11" y="-6" width="8" height="6" rx="1" fill={PAPER} stroke={INK} strokeWidth="1.4" />
            <rect x="1" y="-6" width="10" height="6" rx="1" fill={PAPER} stroke={INK} strokeWidth="1.4" />
            <circle cx="-8" cy="8" r="3.2" fill={INK} />
            <circle cx="8" cy="8" r="3.2" fill={INK} />
          </g>
        );

      case 'savings':
        return (
          <g transform="translate(-32, 0)">
            <ellipse cx="0" cy="-7" rx="11" ry="4" fill={RED} stroke={INK} strokeWidth="1.8" />
            <path d="M -11 -7 V 0 C -11 2.2 11 2.2 11 0 V -7" fill={PAPER} stroke={INK} strokeWidth="1.8" />
            <path d="M -11 0 V 7 C -11 9.5 11 9.5 11 7 V 0" fill={PAPER} stroke={INK} strokeWidth="1.8" />
          </g>
        );

      case 'painting':
        return (
          <g transform="translate(-32, 0)">
            <rect x="-14" y="-11" width="28" height="22" rx="2" fill={PAPER} stroke={INK} strokeWidth="2" />
            <circle cx="-5" cy="-4" r="2.3" fill={RED} />
            <path d="M -11 8 L -3 -1 L 3 5 L 7 1 L 11 8 Z" fill={INK} opacity="0.85" />
          </g>
        );

      case 'glasses':
        return (
          <g transform="translate(-32, 0)">
            <circle cx="-7.5" cy="1" r="6" fill={PAPER} stroke={INK} strokeWidth="2" />
            <circle cx="7.5" cy="1" r="6" fill={PAPER} stroke={INK} strokeWidth="2" />
            <path d="M -1.5 0.5 Q 0 -2 1.5 0.5" fill="none" stroke={RED} strokeWidth="2" />
          </g>
        );

      default:
        return (
          <g transform="translate(-32, 0)">
            {/* Blueprint stencil fallback using ENTITY_META 3-letter code */}
            <rect x="-16" y="-11" width="32" height="22" rx="3" fill={PAPER} stroke={INK} strokeWidth="2" />
            <line x1="-16" y1="-6" x2="16" y2="-6" stroke={RED} strokeWidth="2" />
            <text
              x="0"
              y="3"
              dominantBaseline="central"
              textAnchor="middle"
              fill={INK}
              style={{ fontFamily: 'Archivo, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '0.02em' }}
            >
              {meta.code}
            </text>
          </g>
        );
    }
  };

  const renderTarget = (target: TrackTarget, isDiverted: boolean) => {
    const isHit =
      impactHappened &&
      ((isDiverted && decision === 'diverted') || (!isDiverted && decision === 'straight'));
    const meta = ENTITY_META[target.entityType];
    const shownCount = Math.max(1, Math.min(target.count, 4));
    const y = isDiverted ? DIVERTED_Y : STRAIGHT_Y;
    const renderAsHumanStick =
      meta.kind === 'human' &&
      target.entityType !== 'taxi' &&
      target.entityType !== 'marti' &&
      (target.isHuman || target.entityType === 'people');

    return (
      <g className={`blueprint-medallion ${isHit ? 'blueprint-medallion--hit' : ''}`} transform={`translate(${PLATE_X}, ${y})`}>
        <g className="blueprint-medallion__shake">
          {/* terminal plate */}
          <rect
            x={-PLATE_W / 2}
            y={-PLATE_H / 2}
            width={PLATE_W}
            height={PLATE_H}
            rx="5"
            fill={CARD}
            stroke={INK}
            strokeWidth="3"
          />

          {/* pictogram well */}
          <circle cx="-32" cy="0" r="23" fill="none" stroke={INK} strokeWidth="1.4" strokeDasharray="2 3.5" opacity="0.45" />

          {renderAsHumanStick ? (
            <g>
              {Array.from({ length: shownCount }).map((_, i) => {
                const step = shownCount > 2 ? 9 : 12;
                const x = -32 + (i - (shownCount - 1) / 2) * step;
                return (
                  <g key={i} transform={`translate(${x}, 0)`}>
                    <circle cx="0" cy="-9" r="3.4" fill={RED} stroke={INK} strokeWidth="1.2" />
                    <path
                      d="M 0 -5 L 0 8 M -4.5 -0.5 L 4.5 -0.5 M -3.4 13 L 0 8 L 3.4 13"
                      fill="none"
                      stroke={INK}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>
          ) : meta.kind === 'cat' ? (
            <g transform="translate(-32, 1)">
              <path
                d="M -13 8 Q -13 -4 -7.5 -8 L -9.5 -15.5 L -2.5 -10 Q 0 -10.5 2.5 -10 L 9.5 -15.5 L 7.5 -8 Q 13 -4 13 8 Z"
                fill={PAPER}
                stroke={INK}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="-4.5" cy="-2" r="1.6" fill={INK} />
              <circle cx="4.5" cy="-2" r="1.6" fill={INK} />
              <path d="M -2 2 L 2 2 L 0 4.2 Z" fill={RED} />
              <path d="M -13 8 Q 0 13.5 13 8" fill="none" stroke={INK} strokeWidth="2" />
            </g>
          ) : (
            renderObjectGlyph(target, meta)
          )}

          {/* count — vertically centered inside target plate */}
          <text
            x="34"
            y="0"
            dominantBaseline="central"
            textAnchor="middle"
            fill={INK}
            style={{
              fontFamily: 'Archivo, sans-serif',
              fontSize: target.count > 99 ? 22 : 27,
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            ×{target.count}
          </text>

          {isHit && (
            <g opacity="0.85" stroke={RED} strokeWidth="4" strokeLinecap="round">
              <line x1="-52" y1="-20" x2="-12" y2="20" />
              <line x1="-12" y1="-20" x2="-52" y2="20" />
            </g>
          )}
        </g>

      </g>
    );
  };

  const branchRail = (active: boolean) => ({
    stroke: active ? INK : '#bdbcb7',
    strokeWidth: active ? 5 : 4,
    transition: 'stroke .45s ease, stroke-width .45s ease',
  });

  return (
    <div className="blueprint-canvas relative w-full select-none">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="blueprint-svg block"
        width="100%"
        style={{ height: 'auto', aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        role="img"
        aria-label={`${dilemma.title}: ${dilemma.straightTrack.label} ve ${dilemma.divertedTrack.label} arasında makas şeması`}
      >
        <defs>
          <pattern id="paperDots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={INK} opacity="0.06" />
          </pattern>
          <clipPath id="boardClip">
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} />
          </clipPath>
        </defs>

        <rect width={VIEW_W} height={VIEW_H} fill={PAPER} opacity="0" />

        <g clipPath="url(#boardClip)">
          {/* Approach */}
          <g>
            <line x1="18" y1={RAIL_Y - 12} x2={JUNCTION_X} y2={RAIL_Y - 12} stroke={INK} strokeWidth="5" strokeLinecap="round" />
            <line x1="18" y1={RAIL_Y + 12} x2={JUNCTION_X} y2={RAIL_Y + 12} stroke={INK} strokeWidth="5" strokeLinecap="round" />
            {Array.from({ length: 6 }).map((_, i) => (
              <line
                key={i}
                x1={40 + i * 46}
                y1={RAIL_Y - 18}
                x2={40 + i * 46}
                y2={RAIL_Y + 18}
                stroke="#bdbcb7"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* Straight branch */}
          <g>
            <path
              d={`M ${JUNCTION_X} ${RAIL_Y - 12} C 430 ${RAIL_Y - 12}, 520 ${STRAIGHT_Y - 26}, 760 ${STRAIGHT_Y - 12}`}
              fill="none"
              style={branchRail(straightActive)}
              strokeLinecap="round"
            />
            <path
              d={`M ${JUNCTION_X} ${RAIL_Y + 12} C 430 ${RAIL_Y + 12}, 520 ${STRAIGHT_Y + 4}, 760 ${STRAIGHT_Y + 12}`}
              fill="none"
              style={branchRail(straightActive)}
              strokeLinecap="round"
            />
            {straightActive && (
              <path
                d={`M ${JUNCTION_X} ${RAIL_Y} C 430 ${RAIL_Y}, 520 ${STRAIGHT_Y - 11}, 760 ${STRAIGHT_Y}`}
                fill="none"
                stroke={TEAL}
                strokeWidth="1.8"
                strokeDasharray="8 11"
                strokeLinecap="round"
                opacity="0.85"
              />
            )}
          </g>

          {/* Diverted branch */}
          <g>
            <path
              d={`M ${JUNCTION_X} ${RAIL_Y - 12} C 430 ${RAIL_Y - 12}, 520 ${DIVERTED_Y - 4}, 760 ${DIVERTED_Y - 12}`}
              fill="none"
              style={branchRail(divertedActive)}
              strokeLinecap="round"
            />
            <path
              d={`M ${JUNCTION_X} ${RAIL_Y + 12} C 430 ${RAIL_Y + 12}, 520 ${DIVERTED_Y + 26}, 760 ${DIVERTED_Y + 12}`}
              fill="none"
              style={branchRail(divertedActive)}
              strokeLinecap="round"
            />
            {divertedActive && (
              <path
                d={`M ${JUNCTION_X} ${RAIL_Y} C 430 ${RAIL_Y}, 520 ${DIVERTED_Y + 11}, 760 ${DIVERTED_Y}`}
                fill="none"
                stroke={RED}
                strokeWidth="1.8"
                strokeDasharray="8 11"
                strokeLinecap="round"
                opacity="0.9"
              />
            )}
          </g>

          {/* Junction switch */}
          <g transform={`translate(${JUNCTION_X}, ${RAIL_Y})`}>
            <circle cx="0" cy="0" r="10" fill={PAPER} stroke={INK} strokeWidth="3" />
            <g className="blueprint-switch__blade-group" style={{ transform: `rotate(${leverPulled ? 11 : -11}deg)` }}>
              <line x1="0" y1="0" x2="52" y2="0" stroke={INK} strokeWidth="5" strokeLinecap="round" />
            </g>
            <circle cx="0" cy="0" r="3.5" fill={INK} />
          </g>

          {/* Targets */}
          {renderTarget(dilemma.straightTrack, false)}
          {renderTarget(dilemma.divertedTrack, true)}

          {/* Mechanical lever */}
          <g
            transform="translate(196, 224)"
            className="blueprint-lever"
            onClick={!isAnimating ? onLeverToggle : undefined}
            onKeyDown={(e) => {
              if (!isAnimating && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onLeverToggle();
              }
            }}
            data-hover-sound
            role="button"
            tabIndex={0}
            aria-label={leverPulled ? 'Makas kolunu düz hatta al' : 'Makas kolunu çevir'}
            aria-pressed={leverPulled}
          >
            <rect x="-38" y="0" width="76" height="22" rx="4" className="blueprint-lever__plate" />
            <rect x="-28" y="-4" width="56" height="16" rx="3.5" fill={INK} />
            <rect x="-21" y="0" width="42" height="3" rx="1.5" fill="rgba(242,233,216,.45)" />
            <g className="blueprint-lever__handle" style={{ transform: `rotate(${leverPulled ? 26 : -26}deg)` }}>
              <line x1="0" y1="4" x2="0" y2="-34" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
              <circle cx="0" cy="-40" r="11" fill={RED} stroke={INK} strokeWidth="3" />
              <circle cx="-3.2" cy="-43.2" r="2.8" fill={PAPER} opacity="0.7" />
            </g>
            <circle cx="0" cy="4" r="6" fill={PAPER} stroke={INK} strokeWidth="2.8" />
          </g>

          {/* Tram */}
          <g transform={`translate(${tramPos.x}, ${tramPos.y}) rotate(${tramPos.angle})`} className="blueprint-tram">
            {isAnimating && (
              <g className="blueprint-tram-trail">
                <line x1="-96" y1="-14" x2="-76" y2="-14" />
                <line x1="-114" y1="0" x2="-76" y2="0" />
                <line x1="-96" y1="14" x2="-76" y2="14" />
              </g>
            )}

            {/* Pantograph */}
            <path
              d="M -24 -30 L -42 -50 L 14 -50"
              fill="none"
              stroke={INK}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="-42" y1="-50" x2="30" y2="-50" stroke={INK} strokeWidth="3" strokeLinecap="round" />

            {/* Roof */}
            <rect x="-62" y="-37" width="124" height="11" rx="4" fill={INK} />

            {/* Body */}
            <rect x="-70" y="-29" width="140" height="58" rx="6" fill={RED} stroke={INK} strokeWidth="4" />

            {/* Cream band */}
            <rect x="-70" y="6" width="140" height="13" fill={PAPER} stroke={INK} strokeWidth="2" />

            {/* Windows */}
            <rect x="8" y="-23" width="54" height="25" rx="3" fill={PAPER} stroke={INK} strokeWidth="2.6" />
            <rect x="-64" y="-23" width="30" height="25" rx="3" fill="#f6eeda" stroke={INK} strokeWidth="2.6" />
            <rect x="-28" y="-23" width="30" height="25" rx="3" fill="#f6eeda" stroke={INK} strokeWidth="2.6" />

            {/* Headlight + beam */}
            <path d="M 74 -6 L 112 -20 L 112 12 L 74 6 Z" fill="#ffffff" opacity="0.24" />
            <circle cx="66" cy="-2" r="6" fill={PAPER} stroke={INK} strokeWidth="2.2" />

            {/* Route badge */}
            <rect x="-18" y="12" width="36" height="15" rx="2" fill={INK} />
            <text
              x="0"
              y="19.5"
              dominantBaseline="central"
              textAnchor="middle"
              fill={PAPER}
              style={{ fontFamily: 'Archivo, sans-serif', fontSize: 12, fontWeight: 700 }}
            >
              27
            </text>

            {/* Wheels */}
            <circle cx="-38" cy="33" r="9" fill={INK} />
            <circle cx="38" cy="33" r="9" fill={INK} />
            <circle cx="-38" cy="33" r="3.4" fill={PAPER} />
            <circle cx="38" cy="33" r="3.4" fill={PAPER} />
          </g>
        </g>
      </svg>
    </div>
  );
};
