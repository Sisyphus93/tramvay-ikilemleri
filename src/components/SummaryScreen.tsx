/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PlayerHistoryEntry } from '../types.ts';
import { DILEMMAS } from '../data/dilemmas.ts';
import { playSummaryReveal, playSoftTick } from '../utils/audio.ts';
import {
  RotateCcw,
  Copy,
  Check,
  Award,
  Skull,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

interface SummaryScreenProps {
  history: PlayerHistoryEntry[];
  onRestart: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  history,
  onRestart,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    playSummaryReveal();
  }, []);

  const totalDeaths = history.reduce((sum, h) => sum + h.humanDeaths, 0);
  const totalLeverPulls = history.filter((h) => h.leverPulled).length;

  const getArchetype = () => {
    // Ratios keep thresholds meaningful regardless of lineup length or order.
    const leverPullRatio = totalLeverPulls / DILEMMAS.length;
    const savedPet = history.find((h) => h.dilemmaId === 11 && !h.leverPulled);
    const killedPet = history.find((h) => h.dilemmaId === 11 && h.leverPulled);
    const killedKolsuz = history.find((h) => h.dilemmaId === 23 && h.leverPulled);
    const tookBribe = history.find((h) => h.dilemmaId === 16 && h.leverPulled);

    if (tookBribe && leverPullRatio >= 0.45) {
      return {
        title: 'Pragmatist Rüşvetçi',
        badge: 'PARANIN GÜCÜ',
        desc: 'Felsefeyi cebine koydun, 1 Milyon Dolar’ı kaptın. Ahlak iyi ama Maldivler’de villa daha iyi.',
      };
    }
    if (savedPet && !killedKolsuz && leverPullRatio <= 0.30) {
      return {
        title: 'Evcil Hayvanını Koruyan Kaderci',
        badge: 'DOSTUNU KORUDUN',
        desc: 'Evcil hayvanını kurtardın, yabancıyı feda ettin; ama makası neredeyse hiç çekmedin.',
      };
    }
    if (killedKolsuz && leverPullRatio >= 0.44) {
      return {
        title: 'Kati Faydacı Sigma Gamer',
        badge: 'RANK HER ŞEYDİR',
        desc: 'Dereceli maçta 0/15 giden kolsuz kankanı hiç düşünmeden ezdin. Sayılar ve galibiyet senin tek pusulan.',
      };
    }
    if (killedPet) {
      return {
        title: 'Acımasız Rasyonalist',
        badge: 'SOĞUKKANLI HESAPÇI',
        desc: 'Evcil hayvanını bile bir yabancı uğruna feda ettin. Chat senden korkuyor.',
      };
    }
    if (leverPullRatio >= 0.58) {
      return {
        title: 'Kaos ve Makas İlahı',
        badge: 'MAKAS TUTKUNU',
        desc: 'Önüne gelen her fırsatta kolu çektin. Düzen değil kaos yaratmak için buradasın.',
      };
    }
    if (leverPullRatio <= 0.24) {
      return {
        title: 'Kaderci Seyirci',
        badge: 'BEN YAPMADIM TRAMVAY YAPTI',
        desc: 'Kolu neredeyse hiç çekmedin. Dünyanın akışına karışmayıp ellerini temiz tutmaya çalıştın.',
      };
    }
    return {
      title: 'Dengeli Türk Yayıncısı',
      badge: 'CHATLE YAŞAYAN',
      desc: 'Hem chatin gönlünü aldın hem de kritik anlarda doğru makası çektin. Felsefeyi çözdün sayılır.',
    };
  };

  const archetype = getArchetype();

  const handleCopy = () => {
    playSoftTick(1);
    const text = `🚋 ABSÜRT TRAMVAY İKİLEMLERİ — SICİL RAPORUM 🚋\nUnvanım: ${archetype.title} (${archetype.badge})\n💀 Toplam Zayiat: ${totalDeaths} Can Kaybı\n⚡ Makas Tercihi: ${DILEMMAS.length} ikilemde ${totalLeverPulls} kez kolu çektim!\n\nFelsefeyi sen de çöz: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const container = reduceMotion
    ? { hidden: {}, show: {} }
    : { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };

  const item = reduceMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
      };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-3xl mx-auto"
    >
      <motion.div variants={item} className="summary-header">
        <span className="micro-label text-[#8A6222] tracking-widest">
          AHLAKİ &amp; FELSEFİ SİCİL KARNESİ
        </span>
        <h1>Felsefeyi Çözdün!</h1>
        <p className="text-[#655B4E] text-sm max-w-lg mx-auto mt-3 leading-relaxed">
          {DILEMMAS.length} absürt tramvay ikilemini geride bıraktın. İşte verdiğin kararların toplumsal ve ahlaki bilançosu:
        </p>
      </motion.div>

      <motion.div variants={item} className="stamp my-7">
        <div className="badge-pill micro-label">
          <Award className="w-3.5 h-3.5" />
          <span>{archetype.badge}</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A2520] mt-4">
          {archetype.title}
        </h2>
        <p className="text-sm text-[#5E5447] max-w-md mx-auto leading-relaxed mt-3">
          {archetype.desc}
        </p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-7">
        <div className="stat-card">
          <div className="flex items-center justify-center gap-1.5 micro-label text-[#7A6F60]">
            <Skull className="w-4 h-4 text-[#A23A26]" />
            <span>TOPLAM ZAYİAT</span>
          </div>
          <div className="font-display text-3xl font-semibold text-[#2A2520] tabular-nums mt-2">
            {totalDeaths} <span className="text-xs font-sans font-normal text-[#6B6154]">can</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="micro-label text-[#7A6F60]">KOLU ÇEKTİ</div>
          <div className="font-display text-3xl font-semibold text-[#A23A26] tabular-nums mt-2">
            {totalLeverPulls} <span className="text-xs font-sans font-normal text-[#6B6154]">kez</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="micro-label text-[#7A6F60]">HİÇBİR ŞEY YAPMADI</div>
          <div className="font-display text-3xl font-semibold text-[#2F8478] tabular-nums mt-2">
            {DILEMMAS.length - totalLeverPulls} <span className="text-xs font-sans font-normal text-[#6B6154]">kez</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="my-7 paper-card overflow-hidden">
        <button
          onClick={() => {
            playSoftTick(0);
            setShowDetails(!showDetails);
          }}
          data-hover-sound
          className="w-full py-4 px-5 flex items-center justify-between text-left font-headline text-sm font-bold text-[#2A2520] hover:bg-[#E7DCC5]/50 transition-colors"
        >
          <span>{DILEMMAS.length} İkilemdeki Tercihlerinin Tam Dökümü</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="border-t border-[#B8893B]/30">
            {history.map((h, idx) => {
              const dilemma = DILEMMAS.find((d) => d.id === h.dilemmaId);
              if (!dilemma) return null;
              const isLever = h.leverPulled;
              const savedTarget = isLever ? dilemma.straightTrack : dilemma.divertedTrack;
              const lostTarget = isLever ? dilemma.divertedTrack : dilemma.straightTrack;

              return (
                <div key={idx} className="detail-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-headline text-sm font-bold text-[#2A2520]">{dilemma.title}</div>
                    <p className="text-[#6B6154]">
                      Tercihin:{' '}
                      <strong className={isLever ? 'text-[#A23A26]' : 'text-[#2A2520]'}>
                        {isLever ? dilemma.divertedActionLabel : dilemma.straightActionLabel}
                      </strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[#2F8478] font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {dilemma.conceptualChoice ? 'Korunan' : 'Kurtulan'}: {savedTarget.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#A23A26] font-medium">
                      <Skull className="w-3.5 h-3.5" />
                      {dilemma.conceptualChoice ? 'Sonuç' : 'Zayiat'}: {lostTarget.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <button onClick={handleCopy} data-hover-sound className="btn-primary w-full sm:w-auto">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Sicil Panoya Kopyalandı!' : 'Sicilimi Kopyala & Paylaş'}</span>
        </button>

        <button
          onClick={() => {
            playSoftTick(2);
            onRestart();
          }}
          data-hover-sound
          className="btn-secondary w-full sm:w-auto"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Yeniden Oyna</span>
        </button>
      </motion.div>
    </motion.div>
  );
};
