/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Dilemma, Decision, TrackTarget } from '../types.ts';
import {
  playRisingSweep,
  playLowThump,
  playPencilScratch,
} from '../utils/audio.ts';

interface TrolleyCanvasProps {
  dilemma: Dilemma;
  decision: Decision | null;
  isAnimating: boolean;
  onAnimationEnd: () => void;
  leverPulled: boolean;
  onLeverToggle: () => void;
}

export const TrolleyCanvas: React.FC<TrolleyCanvasProps> = ({
  dilemma,
  decision,
  isAnimating,
  onAnimationEnd,
  leverPulled,
  onLeverToggle,
}) => {
  const [tramProgress, setTramProgress] = useState<number>(0); // 0 to 1
  const [impactHappened, setImpactHappened] = useState(false);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAnimating && decision) {
      setImpactHappened(false);
      setTramProgress(0);
      playRisingSweep(); // Sound cue: Rising sweep as tram accelerates

      const startTime = performance.now();
      const duration = 1450;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / duration);
        // Calm easing: slow in, slow out (Section 9)
        const eased = p * p * (3 - 2 * p);
        setTramProgress(eased);

        if (p >= 0.88 && !impactHappened) {
          setImpactHappened(true);
          playLowThump(); // Sound cue: Low thump (95Hz sine) on arrival
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
    } else {
      setTramProgress(0);
      setImpactHappened(false);
    }
  }, [isAnimating, decision]);

  // Track coordinates
  const calculateTramPosition = (p: number, path: Decision) => {
    if (p <= 0.38) {
      const localP = p / 0.38;
      const x = 50 + localP * 160;
      const y = 140;
      const angle = 0;
      return { x, y, angle };
    } else {
      const localP = (p - 0.38) / 0.62;
      const startX = 210;
      const startY = 140;
      if (path === 'straight') {
        const endX = 475;
        const endY = 88;
        const x = startX + localP * (endX - startX);
        const y = startY + (endY - startY) * Math.sin((localP * Math.PI) / 2);
        const angle = -12 * Math.sin(localP * Math.PI * 0.85);
        return { x, y, angle };
      } else {
        const endX = 475;
        const endY = 212;
        const x = startX + localP * (endX - startX);
        const y = startY + (endY - startY) * Math.sin((localP * Math.PI) / 2);
        const angle = 15 * Math.sin(localP * Math.PI * 0.85);
        return { x, y, angle };
      }
    }
  };

  const effectivePath = decision || (leverPulled ? 'diverted' : 'straight');
  const tramPos = calculateTramPosition(tramProgress, effectivePath);

  // Warm Paper hand-drawn characters and targets (Section 4 & 5)
  // Simplified cartoon, large head (~1/3 height), dot eyes, no teeth, flat misregistered fills (3-5px offset)
  const renderTargetEntity = (target: TrackTarget, isDiverted: boolean) => {
    const isHit =
      impactHappened &&
      ((isDiverted && decision === 'diverted') || (!isDiverted && decision === 'straight'));

    return (
      <g className={`transition-opacity duration-300 ${isHit ? 'opacity-85' : 'opacity-100'}`}>
        {/* Flat Paper Deep Shadow beneath target */}
        <ellipse cx="0" cy="8" rx="22" ry="5" fill="#E7DCC5" />

        {target.entityType === 'people' && (
          <g>
            {Array.from({ length: Math.min(target.count, 5) }).map((_, i) => (
              <g key={i} transform={`translate(${i * 13 - 14}, 0)`}>
                {/* Misaligned Print Fill (Nudged 3px) */}
                <circle cx="3" cy="-19" r="6.5" fill="#7FA6BD" opacity="0.9" />
                <rect x="-1" y="-9" width="8" height="12" rx="2" fill="#2F8478" opacity="0.85" />
                {/* Hand-drawn Ink Outlines */}
                <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
                <path d="M 0 -14 L 0 3 M -6 -5 L 6 -5 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
                {/* Face: Dot eyes & simple eyebrow */}
                <circle cx="-2" cy="-22" r="0.9" fill="#2A2520" />
                <circle cx="2" cy="-22" r="0.9" fill="#2A2520" />
                <path d="M -3 -25 Q -1 -26 1 -25" stroke="#2A2520" strokeWidth="1" fill="none" />
                {/* Rope tying */}
                <rect x="-5" y="-3" width="10" height="4" fill="#E3A33B" stroke="#2A2520" strokeWidth="1.2" rx="1" />
              </g>
            ))}
            {target.count > 5 && (
              <text x="32" y="-12" fontFamily="DM Sans, sans-serif" fontSize="11" fontWeight="bold" fill="#6B6154">
                +{target.count - 5}
              </text>
            )}
          </g>
        )}

        {target.entityType === 'cat' && (
          <g transform="translate(-8, -4)">
            {/* Misregistered Amber/Orange Print Fill (Nudged 4px right) */}
            <ellipse cx="4" cy="-5" rx="15" ry="9" fill="#E3A33B" opacity="0.9" />
            <circle cx="16" cy="-8" r="7" fill="#E3A33B" opacity="0.9" />
            {/* Ink Outlines */}
            <ellipse cx="0" cy="-7" rx="15" ry="9" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <circle cx="12" cy="-10" r="7" fill="none" stroke="#2A2520" strokeWidth="2.2" />
            {/* Ears */}
            <path d="M 9 -16 L 12 -21 L 14 -16" stroke="#2A2520" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 14 -16 L 17 -20 L 19 -15" stroke="#2A2520" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Sleeping eyes */}
            <path d="M 10 -9 Q 12 -7 14 -9" stroke="#2A2520" strokeWidth="1.5" fill="none" />
            {/* Tail */}
            <path d="M -14 -6 C -20 -3, -22 3, -16 6" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Handwritten Caveat "Zzz" note */}
            <text x="18" y="-20" fontFamily="Caveat, cursive" fontSize="15" fontWeight="bold" fill="#D5472F">
              Zzz..
            </text>
          </g>
        )}

        {target.entityType === 'pc' && (
          <g transform="translate(-14, -26)">
            {/* Misregistered Print Fill */}
            <rect x="4" y="3" width="22" height="32" rx="3" fill="#2F8478" opacity="0.85" />
            <rect x="28" y="7" width="22" height="16" rx="2" fill="#7FA6BD" opacity="0.85" />
            {/* Ink Outlines */}
            <rect x="0" y="0" width="22" height="32" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <circle cx="11" cy="9" r="4.5" stroke="#2A2520" strokeWidth="1.8" fill="none" />
            <circle cx="11" cy="22" r="4.5" stroke="#2A2520" strokeWidth="1.8" fill="none" />
            {/* Monitor */}
            <rect x="25" y="4" width="22" height="16" rx="2" fill="none" stroke="#2A2520" strokeWidth="2" />
            <line x1="36" y1="20" x2="36" y2="26" stroke="#2A2520" strokeWidth="2" />
            <line x1="30" y1="26" x2="42" y2="26" stroke="#2A2520" strokeWidth="2" />
          </g>
        )}

        {target.entityType === 'steam' && (
          <g transform="translate(-12, -24)">
            <rect x="3" y="3" width="26" height="32" rx="3" fill="#7FA6BD" opacity="0.85" />
            <rect x="0" y="0" width="26" height="32" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <circle cx="13" cy="16" r="6" stroke="#2A2520" strokeWidth="2" fill="none" />
            <line x1="4" y1="8" x2="22" y2="8" stroke="#2A2520" strokeWidth="1.5" />
            <line x1="4" y1="24" x2="22" y2="24" stroke="#2A2520" strokeWidth="1.5" />
          </g>
        )}

        {target.entityType === 'doner' && (
          <g transform="translate(-10, -25)">
            <rect x="6" y="2" width="13" height="26" rx="3" fill="#E3A33B" opacity="0.9" />
            <rect x="3" y="0" width="13" height="26" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <line x1="9.5" y1="-5" x2="9.5" y2="30" stroke="#2A2520" strokeWidth="2" />
            <rect x="22" y="10" width="10" height="16" rx="2" fill="#E7DCC5" stroke="#2A2520" strokeWidth="2" />
          </g>
        )}

        {target.entityType === 'taxi' && (
          <g transform="translate(-16, -16)">
            <rect x="3" y="8" width="32" height="12" rx="3" fill="#E3A33B" opacity="0.9" />
            <rect x="0" y="6" width="32" height="12" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <path d="M 5 6 L 10 0 L 22 0 L 27 6 Z" fill="none" stroke="#2A2520" strokeWidth="2" />
            <circle cx="7" cy="18" r="3.5" fill="#2A2520" />
            <circle cx="25" cy="18" r="3.5" fill="#2A2520" />
          </g>
        )}

        {target.entityType === 'marti' && (
          <g transform="translate(-14, -18)">
            <rect x="0" y="16" width="28" height="3" rx="1.5" fill="#2F8478" />
            <line x1="22" y1="16" x2="18" y2="2" stroke="#2A2520" strokeWidth="2.2" />
            <line x1="14" y1="2" x2="22" y2="2" stroke="#2A2520" strokeWidth="2.2" />
            <circle cx="5" cy="18" r="3.5" fill="#2A2520" />
            <circle cx="23" cy="18" r="3.5" fill="#2A2520" />
          </g>
        )}

        {target.entityType === 'harddrive' && (
          <g transform="translate(-14, -20)">
            <rect x="4" y="3" width="28" height="20" rx="2" fill="#E7DCC5" opacity="0.9" />
            <rect x="0" y="0" width="28" height="20" rx="2" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <circle cx="8" cy="10" r="3" fill="#2A2520" />
            <circle cx="20" cy="10" r="3" fill="#2A2520" />
          </g>
        )}

        {target.entityType === 'student' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="6.5" fill="#2F8478" opacity="0.85" />
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <path d="M 0 -14 L 0 3 M -6 -5 L 6 -5 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="4" y="-10" width="9" height="12" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.5" rx="1" />
          </g>
        )}

        {target.entityType === 'yourself' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="6.5" fill="#D5472F" opacity="0.9" />
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <path d="M 0 -14 L 0 3 M -6 -5 L 6 -5 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {target.entityType === 'teammate' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="6.5" fill="#7FA6BD" opacity="0.9" />
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <path d="M -7 -21 A 7 7 0 0 1 7 -21" stroke="#2A2520" strokeWidth="2.5" fill="none" />
            <path d="M 0 -14 L 0 3 M -6 -5 L 6 -5 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {target.entityType === 'richman' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="6.5" fill="#E3A33B" opacity="0.9" />
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <rect x="-5" y="-28" width="10" height="7" fill="#2A2520" />
            <line x1="-7" y1="-21" x2="7" y2="-21" stroke="#2A2520" strokeWidth="2" />
            <path d="M 0 -14 L 0 3 M -6 -5 L 6 -5 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {target.entityType === 'streamer' && (
          <g transform="translate(-10, 0)">
            <circle cx="-3" cy="-18" r="5" fill="#7FA6BD" opacity="0.85" />
            <circle cx="7" cy="-18" r="5" fill="#2F8478" opacity="0.85" />
            <circle cx="-6" cy="-20" r="5" fill="none" stroke="#2A2520" strokeWidth="2" />
            <circle cx="4" cy="-20" r="5" fill="none" stroke="#2A2520" strokeWidth="2" />
            <path d="M -6 -15 L -6 2 M 4 -15 L 4 2" stroke="#2A2520" strokeWidth="2.2" />
          </g>
        )}

        {target.entityType === 'moderator' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="6.5" fill="#2F8478" opacity="0.85" />
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <polygon points="-2,-29 2,-29 0,-24" fill="#2F8478" stroke="#2A2520" strokeWidth="1" />
            <path d="M 0 -14 L 0 3 M -6 -5 L 6 -5 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {target.entityType === 'futurepeople' && (
          <g transform="translate(-8, 0)">
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#7FA6BD" strokeWidth="2" strokeDasharray="3,2" />
            <path d="M 0 -14 L 0 3 M -6 -5 L 6 -5 M -5 12 L 0 3 L 5 12" stroke="#7FA6BD" strokeWidth="2" strokeDasharray="3,2" />
          </g>
        )}

        {target.entityType === 'npc' && (
          <g transform="translate(-10, -18)">
            <rect x="3" y="3" width="22" height="22" rx="3" fill="#E7DCC5" opacity="0.9" />
            <rect x="0" y="0" width="22" height="22" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <text x="3" y="14" fontFamily="monospace" fontSize="8" fontWeight="bold" fill="#2A2520">
              &lt;0/1&gt;
            </text>
          </g>
        )}

        {target.entityType === 'code' && (
          <g transform="translate(-12, -20)">
            <polygon points="12,0 24,12 12,24 0,12" fill="#E7DCC5" stroke="#2A2520" strokeWidth="2.5" />
            <text x="6" y="15" fontFamily="DM Sans, sans-serif" fontSize="8" fontWeight="bold" fill="#2F8478">
              CORE
            </text>
          </g>
        )}

        {target.entityType === 'savings' && (
          <g transform="translate(-14, -20)">
            {/* Safe / Cash box in Amber & Teal */}
            <rect x="4" y="3" width="28" height="20" rx="3" fill="#E3A33B" opacity="0.9" />
            <rect x="0" y="0" width="28" height="20" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <circle cx="14" cy="10" r="4.5" stroke="#2A2520" strokeWidth="2" fill="#E7DCC5" />
            <line x1="14" y1="7" x2="14" y2="13" stroke="#2A2520" strokeWidth="2" />
          </g>
        )}

        {target.entityType === 'painting' && (
          <g transform="translate(-12, -24)">
            {/* Mona Lisa in gold frame */}
            <rect x="3" y="3" width="24" height="30" rx="2" fill="#E3A33B" opacity="0.9" />
            <rect x="0" y="0" width="24" height="30" rx="2" fill="#E7DCC5" stroke="#2A2520" strokeWidth="2.5" />
            {/* Portrait oval silhouette */}
            <ellipse cx="12" cy="12" rx="5" ry="6.5" fill="#2F8478" opacity="0.8" />
            <ellipse cx="12" cy="12" rx="5" ry="6.5" fill="none" stroke="#2A2520" strokeWidth="1.5" />
            <text x="5" y="26" fontFamily="Fraunces, serif" fontSize="6" fontWeight="bold" fill="#2A2520">
              LISA
            </text>
          </g>
        )}

        {target.entityType === 'sleepers' && (
          <g>
            {Array.from({ length: Math.min(target.count, 5) }).map((_, i) => (
              <g key={i} transform={`translate(${i * 12 - 14}, 0)`}>
                <circle cx="3" cy="-19" r="6" fill="#7FA6BD" opacity="0.85" />
                <circle cx="0" cy="-21" r="6" fill="none" stroke="#2A2520" strokeWidth="2.2" />
                <path d="M -2 -21 Q 0 -20 2 -21" stroke="#2A2520" strokeWidth="1.2" fill="none" />
                <path d="M 0 -15 L 0 3 M -5 -5 L 5 -5 M -4 12 L 0 3 L 4 12" stroke="#2A2520" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            ))}
            <text x="26" y="-22" fontFamily="Caveat, cursive" fontSize="13" fontWeight="bold" fill="#7FA6BD">
              Zzz
            </text>
          </g>
        )}

        {target.entityType === 'bestfriend' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="6.5" fill="#E3A33B" opacity="0.9" />
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <circle cx="-2" cy="-22" r="1" fill="#2A2520" />
            <circle cx="2" cy="-22" r="1" fill="#2A2520" />
            <path d="M -2 -19 Q 0 -17 2 -19" stroke="#2A2520" strokeWidth="1.5" fill="none" />
            {/* Waving arm */}
            <path d="M 0 -14 L 0 3 M -7 2 L -5 -6 L 5 -6 L 9 -14" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M -4 12 L 0 3 L 4 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {target.entityType === 'glasses' && (
          <g transform="translate(-10, 0)">
            <g opacity="0.45" filter="url(#amberSparkGlow)">
              <circle cx="0" cy="-21" r="8" fill="#7FA6BD" />
            </g>
            {/* Big glasses symbol */}
            <circle cx="-6" cy="-22" r="5" fill="none" stroke="#2A2520" strokeWidth="2" />
            <circle cx="6" cy="-22" r="5" fill="none" stroke="#2A2520" strokeWidth="2" />
            <line x1="-1" y1="-22" x2="1" y2="-22" stroke="#2A2520" strokeWidth="2" />
            <path d="M 0 -14 L 0 4 M -5 12 L 0 4 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {target.entityType === 'cousins' && (
          <g>
            {Array.from({ length: Math.min(target.count, 3) }).map((_, i) => (
              <g key={i} transform={`translate(${i * 16 - 12}, 0)`}>
                <circle cx="3" cy="-19" r="6" fill="#2F8478" opacity="0.85" />
                <circle cx="0" cy="-21" r="6" fill="none" stroke="#2A2520" strokeWidth="2.2" />
                <path d="M 0 -15 L 0 3 M -5 -5 L 5 -5 M -4 12 L 0 3 L 4 12" stroke="#2A2520" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            ))}
          </g>
        )}

        {target.entityType === 'baby' && (
          <g transform="translate(-10, -10)">
            {/* Baby stroller */}
            <circle cx="12" cy="14" r="3.5" fill="#2A2520" />
            <circle cx="-2" cy="14" r="3.5" fill="#2A2520" />
            <path d="M -6 4 L 14 4 C 16 -4, 2 -8, 2 -8 L -6 4 Z" fill="#7FA6BD" stroke="#2A2520" strokeWidth="2" />
            <circle cx="6" cy="-4" r="4.5" fill="#F4EDDF" stroke="#2A2520" strokeWidth="1.5" />
            <line x1="-6" y1="4" x2="-12" y2="-8" stroke="#2A2520" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {target.entityType === 'elderly' && (
          <g>
            {Array.from({ length: Math.min(target.count, 5) }).map((_, i) => (
              <g key={i} transform={`translate(${i * 12 - 14}, 0)`}>
                <circle cx="0" cy="-21" r="6" fill="#E7DCC5" stroke="#2A2520" strokeWidth="2.2" />
                <path d="M 0 -15 L 0 3 M -5 -5 L 5 -5 M -4 12 L 0 3 L 4 12" stroke="#2A2520" strokeWidth="2.2" strokeLinecap="round" />
                {/* Walking cane */}
                <path d="M 6 -5 L 9 12 M 7 -5 C 7 -9, 10 -9, 10 -5" stroke="#6B6154" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </g>
            ))}
          </g>
        )}

        {target.entityType === 'clone' && (
          <g>
            {Array.from({ length: Math.min(target.count, 5) }).map((_, i) => (
              <g key={i} transform={`translate(${i * 12 - 14}, 0)`}>
                <circle cx="3" cy="-19" r="6" fill="#D5472F" opacity="0.85" />
                <circle cx="0" cy="-21" r="6" fill="none" stroke="#2A2520" strokeWidth="2.2" />
                <path d="M 0 -15 L 0 3 M -5 -5 L 5 -5 M -4 12 L 0 3 L 4 12" stroke="#2A2520" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            ))}
          </g>
        )}

        {target.entityType === 'mysterybox' && (
          <g transform="translate(-12, -22)">
            {/* Wooden Mystery Crate */}
            <rect x="3" y="3" width="24" height="24" rx="2" fill="#E3A33B" opacity="0.9" />
            <rect x="0" y="0" width="24" height="24" rx="2" fill="#E7DCC5" stroke="#2A2520" strokeWidth="2.5" />
            <line x1="0" y1="0" x2="24" y2="24" stroke="#6B6154" strokeWidth="1.2" />
            <text x="7" y="18" fontFamily="Fraunces, serif" fontSize="16" fontWeight="bold" fill="#D5472F">
              ?
            </text>
          </g>
        )}

        {target.entityType === 'robot' && (
          <g transform="translate(-10, -22)">
            {/* Retro Antenna Robot */}
            <rect x="3" y="6" width="20" height="20" rx="3" fill="#2F8478" opacity="0.85" />
            <rect x="0" y="4" width="20" height="20" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.2" />
            {/* Antenna */}
            <line x1="10" y1="4" x2="10" y2="-2" stroke="#2A2520" strokeWidth="2" />
            <circle cx="10" cy="-3" r="2" fill="#E3A33B" />
            {/* Eyes */}
            <circle cx="5" cy="10" r="2" fill="#E3A33B" />
            <circle cx="15" cy="10" r="2" fill="#E3A33B" />
            {/* Gauge */}
            <line x1="5" y1="18" x2="15" y2="18" stroke="#2A2520" strokeWidth="1.5" />
          </g>
        )}

        {target.entityType === 'emptytrolley' && (
          <g transform="translate(-16, -18)">
            {/* Mini Empty Trolley */}
            <rect x="3" y="4" width="32" height="18" rx="3" fill="#7FA6BD" opacity="0.85" />
            <rect x="0" y="2" width="32" height="18" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <circle cx="7" cy="22" r="3" fill="#2A2520" />
            <circle cx="25" cy="22" r="3" fill="#2A2520" />
            <text x="7" y="14" fontFamily="DM Sans, sans-serif" fontSize="7" fontWeight="bold" fill="#2A2520">
              BOŞ
            </text>
          </g>
        )}

        {target.entityType === 'prank' && (
          <g transform="translate(-14, -14)">
            {/* Empty Signboard */}
            <rect x="0" y="0" width="28" height="16" rx="2" fill="#E7DCC5" stroke="#2A2520" strokeWidth="2" />
            <text x="3" y="11" fontFamily="Caveat, cursive" fontSize="11" fontWeight="bold" fill="#2A2520">
              Boş Ray!
            </text>
            <line x1="14" y1="16" x2="14" y2="24" stroke="#2A2520" strokeWidth="2" />
          </g>
        )}

        {target.entityType === 'enemy' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="6.5" fill="#D5472F" opacity="0.9" />
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            {/* Sneering expression */}
            <circle cx="-2" cy="-22" r="1" fill="#2A2520" />
            <circle cx="2" cy="-22" r="1" fill="#2A2520" />
            <path d="M -3 -18 Q 0 -21 3 -18" stroke="#2A2520" strokeWidth="1.5" fill="none" />
            <path d="M 0 -14 L 0 3 M -5 -5 L 5 -5 M -4 12 L 0 3 L 4 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {target.entityType === 'lifespan' && (
          <g transform="translate(-10, -20)">
            {/* Hourglass */}
            <polygon points="0,0 20,0 10,12" fill="#E3A33B" stroke="#2A2520" strokeWidth="2" />
            <polygon points="0,24 20,24 10,12" fill="#E7DCC5" stroke="#2A2520" strokeWidth="2" />
            <text x="-4" y="32" fontFamily="DM Sans, sans-serif" fontSize="7" fontWeight="bold" fill="#D5472F">
              -YIL
            </text>
          </g>
        )}

        {/* --- HYPE & KATMAN EKİBİ BESPOKE SVG ENTITIES --- */}

        {/* HYPE (Çağrı Ergün): Signature hair, trimmed beard, Shure SM7B mic */}
        {target.entityType === 'hype' && (
          <g transform="translate(-8, 0)">
            {/* Misregistered Amber/Teal Print Fill */}
            <circle cx="3" cy="-20" r="7.5" fill="#E3A33B" opacity="0.85" />
            <rect x="0" y="-12" width="12" height="15" rx="2" fill="#2F8478" opacity="0.85" />
            {/* Head & Beard */}
            <circle cx="0" cy="-22" r="7.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            {/* Beard patch */}
            <path d="M -5 -20 C -4 -15, 4 -15, 5 -20" stroke="#2A2520" strokeWidth="2" fill="#2A2520" />
            {/* Cool hair swoop */}
            <path d="M -7 -25 Q 0 -30 6 -27" stroke="#2A2520" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Dot eyes & confident grin */}
            <circle cx="-2" cy="-23" r="1" fill="#F4EDDF" />
            <circle cx="2" cy="-23" r="1" fill="#F4EDDF" />
            {/* Body */}
            <path d="M 0 -14 L 0 3 M -7 -6 L 7 -6 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
            {/* Shure SM7B Mic on boom arm */}
            <line x1="8" y1="-2" x2="15" y2="-18" stroke="#2A2520" strokeWidth="2" strokeLinecap="round" />
            <rect x="13" y="-23" width="6" height="10" rx="2" fill="#2A2520" />
            <circle cx="16" cy="-23" r="3" fill="#D5472F" />
          </g>
        )}

        {/* GUGU (Gugucan): Baseball cap backwards, chunky studio headset */}
        {target.entityType === 'gugu' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="6.5" fill="#7FA6BD" opacity="0.9" />
            <circle cx="0" cy="-21" r="6.5" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            {/* Backward Cap */}
            <path d="M -7 -23 Q 0 -29 7 -23 L 11 -21" stroke="#D5472F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Studio Headphones */}
            <path d="M -8 -21 Q 0 -31 8 -21" stroke="#2A2520" strokeWidth="2.5" fill="none" />
            <rect x="-9" y="-23" width="3" height="6" rx="1" fill="#2A2520" />
            <rect x="6" y="-23" width="3" height="6" rx="1" fill="#2A2520" />
            {/* Dot eyes */}
            <circle cx="-2" cy="-21" r="1" fill="#2A2520" />
            <circle cx="2" cy="-21" r="1" fill="#2A2520" />
            <path d="M 0 -14 L 0 3 M -6 -5 L 6 -5 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* İBO: Big friendly beard, wide posture */}
        {target.entityType === 'ibo' && (
          <g transform="translate(-8, 0)">
            <circle cx="3" cy="-19" r="7" fill="#E3A33B" opacity="0.9" />
            <circle cx="0" cy="-21" r="7" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            {/* Full Beard */}
            <path d="M -6 -19 C -4 -13, 4 -13, 6 -19" stroke="#2A2520" strokeWidth="2" fill="#2A2520" />
            <circle cx="-2.5" cy="-22" r="1" fill="#2A2520" />
            <circle cx="2.5" cy="-22" r="1" fill="#2A2520" />
            <path d="M 0 -14 L 0 3 M -7 -4 L 7 -4 M -5 12 L 0 3 L 5 12" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* SAMET: Goose Goose Duck avatar with knife in hand */}
        {target.entityType === 'samet' && (
          <g transform="translate(-10, -10)">
            {/* Misregistered print fill */}
            <ellipse cx="4" cy="0" rx="11" ry="8" fill="#F4EDDF" opacity="0.95" />
            {/* Goose Body */}
            <ellipse cx="0" cy="0" rx="11" ry="8" fill="#F4EDDF" stroke="#2A2520" strokeWidth="2.5" />
            {/* Long Goose Neck & Head */}
            <path d="M 6 0 L 8 -16" stroke="#2A2520" strokeWidth="4" strokeLinecap="round" />
            <circle cx="8" cy="-17" r="5" fill="#F4EDDF" stroke="#2A2520" strokeWidth="2" />
            {/* Orange Beak */}
            <polygon points="12,-18 19,-16 12,-14" fill="#E3A33B" stroke="#2A2520" strokeWidth="1.2" />
            {/* Beady eye */}
            <circle cx="8" cy="-18" r="1" fill="#2A2520" />
            {/* Small knife (Goose Goose Duck Imposter knife) */}
            <line x1="-3" y1="4" x2="-8" y2="-4" stroke="#7FA6BD" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="-10" y="2" width="3" height="5" fill="#D5472F" />
            {/* Webbed feet */}
            <line x1="-3" y1="8" x2="-3" y2="12" stroke="#E3A33B" strokeWidth="2" />
            <line x1="3" y1="8" x2="3" y2="12" stroke="#E3A33B" strokeWidth="2" />
          </g>
        )}

        {/* METE: Goose Goose Duck avatar with detective hat & innocent look */}
        {target.entityType === 'mete' && (
          <g transform="translate(-10, -10)">
            <ellipse cx="0" cy="0" rx="11" ry="8" fill="#F4EDDF" stroke="#2A2520" strokeWidth="2.5" />
            {/* Long Goose Neck & Head */}
            <path d="M 6 0 L 8 -16" stroke="#2A2520" strokeWidth="4" strokeLinecap="round" />
            <circle cx="8" cy="-17" r="5" fill="#F4EDDF" stroke="#2A2520" strokeWidth="2" />
            {/* Orange Beak */}
            <polygon points="12,-18 19,-16 12,-14" fill="#E3A33B" stroke="#2A2520" strokeWidth="1.2" />
            <circle cx="8" cy="-18" r="1" fill="#2A2520" />
            {/* Detective Hat */}
            <ellipse cx="8" cy="-22" rx="7" ry="2" fill="#6B6154" stroke="#2A2520" strokeWidth="1.5" />
            <rect x="5" y="-26" width="6" height="4" fill="#6B6154" stroke="#2A2520" strokeWidth="1.2" />
            {/* Webbed feet */}
            <line x1="-3" y1="8" x2="-3" y2="12" stroke="#E3A33B" strokeWidth="2" />
            <line x1="3" y1="8" x2="3" y2="12" stroke="#E3A33B" strokeWidth="2" />
          </g>
        )}

        {/* KEGRI: Acoustic guitar & musical treble notes */}
        {target.entityType === 'kegri' && (
          <g transform="translate(-12, -18)">
            {/* Misregistered Amber wood fill */}
            <ellipse cx="14" cy="18" rx="12" ry="10" fill="#E3A33B" opacity="0.9" />
            <ellipse cx="14" cy="4" rx="8" ry="7" fill="#E3A33B" opacity="0.9" />
            {/* Acoustic Guitar Body */}
            <path
              d="M 6 22 C 2 16, 6 10, 10 7 C 8 3, 11 -2, 16 -2 C 21 -2, 24 3, 22 7 C 26 10, 30 16, 26 22 C 22 28, 10 28, 6 22 Z"
              fill="none"
              stroke="#2A2520"
              strokeWidth="2.2"
            />
            {/* Sound hole */}
            <circle cx="16" cy="10" r="3.5" fill="#2A2520" />
            {/* Neck & Headstock */}
            <line x1="16" y1="-2" x2="16" y2="-22" stroke="#2A2520" strokeWidth="3" strokeLinecap="round" />
            <rect x="13" y="-26" width="6" height="5" rx="1" fill="#6B6154" stroke="#2A2520" strokeWidth="1.5" />
            {/* Floating musical notes */}
            <text x="26" y="-6" fontFamily="Caveat, cursive" fontSize="14" fontWeight="bold" fill="#D5472F">
              ♪ ♫
            </text>
          </g>
        )}

        {/* KATMAN MASA: Studio desk, two broadcast boom mics & monitor */}
        {target.entityType === 'katmanmasa' && (
          <g transform="translate(-18, -20)">
            {/* Studio Desk in Teal & Ink */}
            <rect x="3" y="16" width="38" height="12" rx="2" fill="#2F8478" opacity="0.85" />
            <rect x="0" y="14" width="38" height="12" rx="2" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            {/* Legs */}
            <line x1="6" y1="26" x2="6" y2="34" stroke="#2A2520" strokeWidth="2.5" />
            <line x1="32" y1="26" x2="32" y2="34" stroke="#2A2520" strokeWidth="2.5" />
            {/* 2 Shure Microphones on Boom Arms */}
            <line x1="8" y1="14" x2="12" y2="4" stroke="#2A2520" strokeWidth="2" />
            <circle cx="13" cy="2" r="3" fill="#2A2520" />
            <line x1="30" y1="14" x2="26" y2="4" stroke="#2A2520" strokeWidth="2" />
            <circle cx="25" cy="2" r="3" fill="#2A2520" />
            {/* Studio On Air Sign */}
            <rect x="15" y="8" width="10" height="5" fill="#D5472F" rx="1" />
            <text x="16.5" y="12" fontFamily="DM Sans, sans-serif" fontSize="4.5" fontWeight="bold" fill="#F4EDDF">
              ON AIR
            </text>
          </g>
        )}

        {/* REDDIT: Snoo Alien head & orange upvote arrow */}
        {target.entityType === 'reddit' && (
          <g transform="translate(-12, -22)">
            {/* Misregistered Orange fill */}
            <ellipse cx="14" cy="14" rx="14" ry="11" fill="#E3A33B" opacity="0.9" />
            {/* Alien Head */}
            <ellipse cx="12" cy="12" rx="14" ry="11" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            {/* Antenna */}
            <line x1="12" y1="1" x2="16" y2="-6" stroke="#2A2520" strokeWidth="2" />
            <line x1="16" y1="-6" x2="22" y2="-4" stroke="#2A2520" strokeWidth="2" />
            <circle cx="23" cy="-3" r="2.5" fill="#D5472F" />
            {/* Orange Eyes */}
            <circle cx="7" cy="12" r="2.5" fill="#D5472F" />
            <circle cx="17" cy="12" r="2.5" fill="#D5472F" />
            {/* Smile */}
            <path d="M 8 16 Q 12 19 16 16" stroke="#2A2520" strokeWidth="1.8" fill="none" />
            {/* Upvote Arrow */}
            <polygon points="28,4 34,4 31,-4" fill="#D5472F" stroke="#2A2520" strokeWidth="1.2" />
          </g>
        )}

        {/* KICK: Kick Streaming 3D Cube with Neon Green 'K' */}
        {target.entityType === 'kick' && (
          <g transform="translate(-14, -22)">
            {/* Cube Box */}
            <rect x="3" y="3" width="28" height="28" rx="4" fill="#2F8478" opacity="0.9" />
            <rect x="0" y="0" width="28" height="28" rx="4" fill="#2A2520" stroke="#2A2520" strokeWidth="2.5" />
            {/* Crisp Kick 'K' */}
            <path
              d="M 8 6 L 12 6 L 12 14 L 17 6 L 22 6 L 15 15 L 23 24 L 18 24 L 12 17 L 12 24 L 8 24 Z"
              fill="#53FC18"
            />
          </g>
        )}

        {/* FOOD: Midnight Kebab & Lahmacun platter with steaming heat waves */}
        {target.entityType === 'food' && (
          <g transform="translate(-16, -16)">
            {/* Platter plate */}
            <ellipse cx="16" cy="14" rx="18" ry="7" fill="#E7DCC5" stroke="#2A2520" strokeWidth="2" />
            {/* Rolled Lahmacun & Dürüm Kebap */}
            <rect x="4" y="6" width="24" height="7" rx="3" fill="#E3A33B" opacity="0.95" />
            <rect x="4" y="6" width="24" height="7" rx="3" fill="none" stroke="#2A2520" strokeWidth="2" />
            {/* Garnishes (Tomato & Parsley in Vermilion/Teal) */}
            <circle cx="8" cy="4" r="2" fill="#D5472F" />
            <circle cx="14" cy="4" r="1.8" fill="#2F8478" />
            <circle cx="20" cy="4" r="2" fill="#D5472F" />
            {/* Steam trails */}
            <path d="M 8 0 Q 6 -5 8 -10" stroke="#6B6154" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 16 -1 Q 18 -6 16 -12" stroke="#6B6154" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 24 1 Q 22 -4 24 -9" stroke="#6B6154" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        )}

        {/* CANOLAR: Chat stream viewers with headsets and live speech bubble */}
        {target.entityType === 'canolar' && (
          <g>
            {Array.from({ length: Math.min(target.count, 5) }).map((_, i) => (
              <g key={i} transform={`translate(${i * 13 - 16}, 0)`}>
                {/* Misaligned Print Fill */}
                <circle cx="3" cy="-19" r="6" fill="#7FA6BD" opacity="0.85" />
                <rect x="-1" y="-9" width="8" height="12" rx="2" fill="#2F8478" opacity="0.8" />
                {/* Head with headset */}
                <circle cx="0" cy="-21" r="6" fill="none" stroke="#2A2520" strokeWidth="2.2" />
                <path d="M -7 -21 Q 0 -29 7 -21" stroke="#2A2520" strokeWidth="2" fill="none" />
                <rect x="-8" y="-22" width="2" height="4" fill="#2A2520" rx="0.5" />
                <rect x="6" y="-22" width="2" height="4" fill="#2A2520" rx="0.5" />
                <path d="M 0 -15 L 0 3 M -5 -5 L 5 -5 M -4 12 L 0 3 L 4 12" stroke="#2A2520" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            ))}
            {/* Chat Bubble: "+1 CANO" */}
            <g transform="translate(18, -26)">
              <rect x="0" y="0" width="34" height="14" rx="3" fill="#F4EDDF" stroke="#2A2520" strokeWidth="1.5" />
              <polygon points="4,14 8,14 4,18" fill="#F4EDDF" stroke="#2A2520" strokeWidth="1.5" />
              <text x="3" y="10" fontFamily="DM Sans, sans-serif" fontSize="6.5" fontWeight="bold" fill="#D5472F">
                +1 CANO
              </text>
            </g>
          </g>
        )}

        {/* SPONSOR: Suitcase overflowing with cash and green 1M$ stamp */}
        {target.entityType === 'sponsor' && (
          <g transform="translate(-16, -20)">
            {/* Misregistered Amber Fill */}
            <rect x="3" y="5" width="32" height="22" rx="3" fill="#E3A33B" opacity="0.9" />
            {/* Leather Suitcase */}
            <rect x="0" y="2" width="32" height="22" rx="3" fill="none" stroke="#2A2520" strokeWidth="2.5" />
            <line x1="0" y1="13" x2="32" y2="13" stroke="#2A2520" strokeWidth="1.8" />
            {/* Suitcase Handle */}
            <path d="M 11 2 L 11 -3 L 21 -3 L 21 2" stroke="#2A2520" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {/* Golden Latches */}
            <circle cx="7" cy="13" r="2" fill="#E3A33B" stroke="#2A2520" strokeWidth="1" />
            <circle cx="25" cy="13" r="2" fill="#E3A33B" stroke="#2A2520" strokeWidth="1" />
            {/* Green Dollar Sign */}
            <text x="9" y="21" fontFamily="DM Sans, sans-serif" fontSize="9" fontWeight="900" fill="#2F8478">
              $1M
            </text>
          </g>
        )}

        {/* DISCORD: Discord game controller / headset icon with soundwaves */}
        {target.entityType === 'discord' && (
          <g transform="translate(-16, -18)">
            {/* Misregistered Blurple/Soft Slate fill */}
            <rect x="3" y="3" width="30" height="24" rx="6" fill="#7FA6BD" opacity="0.9" />
            <rect x="0" y="0" width="30" height="24" rx="6" fill="#2A2520" stroke="#2A2520" strokeWidth="2.5" />
            {/* Discord Gamepad Face */}
            <path
              d="M 6 7 C 10 5, 20 5, 24 7 C 26 12, 25 18, 22 21 C 19 20, 17 19, 15 17 C 13 19, 11 20, 8 21 C 5 18, 4 12, 6 7 Z"
              fill="#F4EDDF"
            />
            {/* Controller eyes */}
            <circle cx="10" cy="12" r="2.2" fill="#2A2520" />
            <circle cx="20" cy="12" r="2.2" fill="#2A2520" />
            {/* Audio Waves */}
            <path d="M 33 6 Q 37 12 33 18" stroke="#D5472F" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 36 3 Q 42 12 36 21" stroke="#D5472F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
        )}


        {/* Impact Stamp (Section 4 & 5: simple flat shape, no particle explosion) */}
        {isHit && (
          <g transform="translate(0, -12)">
            <circle cx="0" cy="0" r="14" fill="#E7DCC5" opacity="0.85" />
            <circle cx="0" cy="0" r="14" fill="none" stroke="#2A2520" strokeWidth="2" strokeDasharray="4,2" />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fontFamily="Fraunces, serif"
              fontSize="11"
              fontWeight="bold"
              fill="#D5472F"
            >
              *ÇAT*
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-[#2A2520] dark:border-[#4A423A] bg-[#F4EDDF] dark:bg-[#232C2F] flat-shadow select-none">
      <svg
        viewBox="0 0 600 280"
        className="w-full h-auto block"
        style={{ minHeight: '230px' }}
      >
        <defs>
          {/* Hand-drawn Amber Halo for Headlight Spark (Section 3: max 40px blur, 40% opacity) */}
          <filter id="amberSparkGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
          </filter>
        </defs>

        {/* Paper Background Field */}
        <rect width="600" height="280" fill="#F4EDDF" />

        {/* Ground Line / Scenery Ground (Warm Paper Deep #E7DCC5) */}
        <path
          d="M 10 160 Q 150 152 300 158 T 590 155"
          stroke="#E7DCC5"
          strokeWidth="38"
          strokeLinecap="round"
          fill="none"
        />

        {/* RAILROAD TIES (Wooden Sleepers in Soft Ink / Paper Deep) */}
        {[40, 65, 90, 115, 140, 165, 190].map((x) => (
          <rect
            key={`tie-${x}`}
            x={x - 2}
            y="126"
            width="5"
            height="28"
            rx="1.5"
            fill="#6B6154"
            opacity="0.75"
          />
        ))}

        {/* Straight Branch Sleepers */}
        {[215, 245, 275, 305, 335, 365, 395, 425, 455, 485, 515, 545].map((x, idx) => {
          const t = idx / 11;
          const y = 140 - Math.sin((t * Math.PI) / 2) * 52;
          return (
            <rect
              key={`tie-str-${x}`}
              x={x - 2}
              y={y - 14}
              width="5"
              height="28"
              rx="1.5"
              fill="#6B6154"
              opacity="0.75"
              transform={`rotate(${-9 * t}, ${x}, ${y})`}
            />
          );
        })}

        {/* Diverted Branch Sleepers */}
        {[215, 245, 275, 305, 335, 365, 395, 425, 455, 485, 515, 545].map((x, idx) => {
          const t = idx / 11;
          const y = 140 + Math.sin((t * Math.PI) / 2) * 72;
          return (
            <rect
              key={`tie-div-${x}`}
              x={x - 2}
              y={y - 14}
              width="5"
              height="28"
              rx="1.5"
              fill="#6B6154"
              opacity="0.75"
              transform={`rotate(${15 * t}, ${x}, ${y})`}
            />
          );
        })}

        {/* STEEL TRACKS (Teal #2F8478 & Ink #2A2520 hand-inked line) */}
        {/* Approach Rails */}
        <path d="M 20 134 L 210 134" stroke="#2F8478" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M 20 146 L 210 146" stroke="#2F8478" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Straight Branch */}
        <path
          d="M 210 134 C 270 134, 340 82, 570 82"
          stroke={!leverPulled ? '#2F8478' : '#6B6154'}
          strokeWidth={!leverPulled ? '4.5' : '3.5'}
          strokeLinecap="round"
          fill="none"
          className="transition-colors duration-300"
        />
        <path
          d="M 210 146 C 270 146, 340 94, 570 94"
          stroke={!leverPulled ? '#2F8478' : '#6B6154'}
          strokeWidth={!leverPulled ? '4.5' : '3.5'}
          strokeLinecap="round"
          fill="none"
          className="transition-colors duration-300"
        />

        {/* Diverted Branch */}
        <path
          d="M 210 134 C 270 134, 340 206, 570 206"
          stroke={leverPulled ? '#D5472F' : '#6B6154'}
          strokeWidth={leverPulled ? '4.5' : '3.5'}
          strokeLinecap="round"
          fill="none"
          className="transition-colors duration-300"
        />
        <path
          d="M 210 146 C 270 146, 340 218, 570 218"
          stroke={leverPulled ? '#D5472F' : '#6B6154'}
          strokeWidth={leverPulled ? '4.5' : '3.5'}
          strokeLinecap="round"
          fill="none"
          className="transition-colors duration-300"
        />

        {/* Switch Blade (Makas Dili) */}
        <g transform="translate(208, 140)">
          <line
            x1="0"
            y1="0"
            x2="24"
            y2={leverPulled ? '8' : '-6'}
            stroke="#D5472F"
            strokeWidth="4"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
          <circle cx="0" cy="0" r="3.5" fill="#2A2520" />
        </g>

        {/* UPPER TRACK TARGET (Straight) */}
        <g transform="translate(475, 88)">
          {renderTargetEntity(dilemma.straightTrack, false)}
          {/* Label in DM Sans uppercase spaced (Section 6) */}
          <text
            x="0"
            y="32"
            textAnchor="middle"
            fontFamily="DM Sans, sans-serif"
            fontSize="9"
            fontWeight="700"
            letterSpacing="0.08em"
            fill="#2A2520"
          >
            {dilemma.straightTrack.label.toUpperCase()}
          </text>
        </g>

        {/* LOWER TRACK TARGET (Diverted) */}
        <g transform="translate(475, 212)">
          {renderTargetEntity(dilemma.divertedTrack, true)}
          <text
            x="0"
            y="32"
            textAnchor="middle"
            fontFamily="DM Sans, sans-serif"
            fontSize="9"
            fontWeight="700"
            letterSpacing="0.08em"
            fill="#2A2520"
          >
            {dilemma.divertedTrack.label.toUpperCase()}
          </text>
        </g>

        {/* MECHANICAL SWITCH LEVER (Teal base, Vermilion knob, flat shadow) */}
        <g
          transform="translate(180, 218)"
          className="cursor-pointer group"
          onClick={!isAnimating ? onLeverToggle : undefined}
        >
          {/* Flat shadow under lever box */}
          <rect x="-14" y="2" width="36" height="16" rx="3" fill="#E7DCC5" />

          {/* Metal base box in Teal #2F8478 with Ink outline */}
          <rect
            x="-18"
            y="-4"
            width="36"
            height="18"
            rx="3"
            fill="#2F8478"
            stroke="#2A2520"
            strokeWidth="2.5"
          />

          {/* Tilting Lever Handle */}
          <g
            transform={`rotate(${leverPulled ? '30' : '-30'})`}
            className="transition-transform duration-300 origin-bottom"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-38"
              stroke="#2A2520"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Knob in Vermilion #D5472F */}
            <circle
              cx="0"
              cy="-40"
              r="7.5"
              fill="#D5472F"
              stroke="#2A2520"
              strokeWidth="2"
            />
          </g>

          {/* Handwritten Annotation in Caveat with Arrow (Section 6 & 8: max 2 handwritten notes) */}
          <g transform="translate(24, -14)">
            <path
              d="M 12 10 Q 0 8 -4 -2"
              fill="none"
              stroke="#6B6154"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <text
              x="16"
              y="14"
              fontFamily="Caveat, cursive"
              fontSize="14"
              fontWeight="bold"
              fill="#D5472F"
            >
              {leverPulled ? 'makas çekildi!' : 'makas kolu'}
            </text>
          </g>
        </g>

        {/* THE NOSTALGIC TRAM CAR (Warm Paper Style with Misregistered Print Fill) */}
        <g
          transform={`translate(${tramPos.x}, ${tramPos.y}) rotate(${tramPos.angle})`}
          className="transition-transform duration-75"
        >
          {/* Flat Paper Deep Shadow beneath tram */}
          <rect x="-34" y="16" width="68" height="6" rx="3" fill="#E7DCC5" />

          {/* Wheels (Ink #2A2520) */}
          <circle cx="-20" cy="11" r="5" fill="#2A2520" />
          <circle cx="20" cy="11" r="5" fill="#2A2520" />

          {/* MISREGISTERED PRINT FILL: Nudged 4px right & 2px down (Section 4 single trick) */}
          <rect
            x="-32"
            y="-16"
            width="68"
            height="34"
            rx="5"
            fill="#D5472F"
            opacity="0.9"
          />

          {/* Hand-inked Tram Outer Box (Ink #2A2520) */}
          <rect
            x="-36"
            y="-18"
            width="68"
            height="34"
            rx="5"
            fill="none"
            stroke="#2A2520"
            strokeWidth="3"
          />

          {/* Cream Paper Mid-band */}
          <rect x="-35" y="-3" width="66" height="6" fill="#F4EDDF" />

          {/* Windows (Paper Deep #E7DCC5 with Ink Outlines) */}
          <rect x="-26" y="-14" width="10" height="8" rx="1.5" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.5" />
          <rect x="-12" y="-14" width="10" height="8" rx="1.5" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.5" />
          <rect x="2" y="-14" width="10" height="8" rx="1.5" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.5" />
          <rect x="16" y="-14" width="12" height="16" rx="2" fill="#E7DCC5" stroke="#2A2520" strokeWidth="1.8" />

          {/* Driver: Simple cartoon dot eyes & posture */}
          <circle cx="22" cy="-6" r="3" fill="#2A2520" />

          {/* Roof Trolley Pole (Pantograf) */}
          <line x1="-12" y1="-18" x2="-22" y2="-30" stroke="#2A2520" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="-22" y1="-30" x2="-4" y2="-30" stroke="#2A2520" strokeWidth="3" strokeLinecap="round" />

          {/* HEADLIGHT SPARK (The only thing allowed to glow in §3!) */}
          <circle cx="34" cy="0" r="3.5" fill="#E3A33B" stroke="#2A2520" strokeWidth="1.5" />
          {/* Amber Halo */}
          <circle cx="38" cy="0" r="10" fill="#E3A33B" opacity="0.35" filter="url(#amberSparkGlow)" />
          {/* Subtle warm headlight beam */}
          <polygon points="35,-2 70,-14 70,14 35,2" fill="#E3A33B" opacity="0.2" />

          {/* Tram Center Emblem */}
          <circle cx="-3" cy="6" r="3" fill="#F4EDDF" stroke="#2A2520" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};
