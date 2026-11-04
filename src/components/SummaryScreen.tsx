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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SummaryScreenProps {
  history: PlayerHistoryEntry[];
  onRestart: () => void;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  history,
  onRestart,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    playSummaryReveal();
  }, []);

  const totalDeaths = history.reduce((sum, h) => sum + h.humanDeaths, 0);
  const totalLeverPulls = history.filter((h) => h.leverPulled).length;
  const switchEntries = history.filter(
    (h) => !DILEMMAS.find((d) => d.id === h.dilemmaId)?.conceptualChoice
  );
  const conceptualEntries = history.filter(
    (h) => DILEMMAS.find((d) => d.id === h.dilemmaId)?.conceptualChoice
  );
  const switchPulls = switchEntries.filter((h) => h.leverPulled).length;
  const switchPasses = switchEntries.length - switchPulls;
  const conceptualActive = conceptualEntries.filter((h) => h.leverPulled).length;
  const conceptualDefault = conceptualEntries.length - conceptualActive;

  const getArchetype = () => {
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
        desc: 'Evcil hayvanını bile bir yabancı uğruna feda ettin. Sohbet senden korkuyor.',
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
      badge: 'SOHBETLE YAŞAYAN',
      desc: 'Hem sohbetin gönlünü aldın hem de kritik anlarda doğru makası çektin. Felsefeyi çözdün sayılır.',
    };
  };

  const archetype = getArchetype();

  const handleCopy = () => {
    playSoftTick(1);
    const text = `ABSÜRT TRAMVAY İKİLEMLERİ — SİCİL RAPORUM\nUnvanım: ${archetype.title} (${archetype.badge})\nToplam zayiat: ${totalDeaths} can kaybı\nMakas tercihi: ${DILEMMAS.length} ikilemde ${totalLeverPulls} kez kolu çektim!\n\nFelsefeyi sen de çöz: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const container = reduceMotion
    ? { hidden: {}, show: {} }
    : { hidden: {}, show: { transition: { staggerChildren: 0.085, delayChildren: 0.05 } } };

  const item = reduceMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="report w-full"
    >
      <motion.div variants={item} className="report__head">
        <p className="report__meta">Kayıt tamamlandı · {DILEMMAS.length} ikilem</p>
        <h1 className="report__title">Ahlaki sicil raporu</h1>
        <p className="report__lede">
          <span className="numeral">{DILEMMAS.length}</span> absürt ikilemin ardından makas kolu
          artık senin adına bir şeyler söylüyor. İşte kararlarının toplumsal ve ahlaki bilançosu.
        </p>
      </motion.div>

      <motion.div
        variants={item}
        initial={reduceMotion ? {} : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: EASE }}
        className="archetype"
      >
        <span className="archetype__badge">
          <Award className="w-3 h-3" strokeWidth={2.5} />
          <span>{archetype.badge}</span>
        </span>
        <h2 className="archetype__title">{archetype.title}</h2>
        <p className="archetype__desc">{archetype.desc}</p>
      </motion.div>

      <motion.div variants={item} className="stats">
        <div className="stat stat--bad">
          <div className="stat__label">Toplam zayiat</div>
          <div className="stat__value">
            {totalDeaths}
            <span className="stat__unit">can</span>
          </div>
        </div>

        <div className="stat">
          <div className="stat__label">Müdahale etti</div>
          <div className="stat__value">
            {totalLeverPulls}
            <span className="stat__unit">kez</span>
          </div>
          <div className="stat__sub">
            {switchPulls} makas · {conceptualActive} kavramsal
          </div>
        </div>

        <div className="stat">
          <div className="stat__label">Müdahale etmedi</div>
          <div className="stat__value">
            {history.length - totalLeverPulls}
            <span className="stat__unit">kez</span>
          </div>
          <div className="stat__sub">
            {switchPasses} düz hat · {conceptualDefault} kavramsal
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="ledger">
        <button
          onClick={() => {
            playSoftTick(0);
            setShowDetails(!showDetails);
          }}
          data-hover-sound
          aria-expanded={showDetails}
          className="ledger__head"
        >
          <span>
            <span className="numeral">{DILEMMAS.length}</span> ikilemin tam dökümü
          </span>
          <span className="ledger__head-icon">
            {showDetails ? (
              <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
            )}
          </span>
        </button>

        {showDetails && (
          <div className="ledger__list">
            {history.map((h, idx) => {
              const dilemma = DILEMMAS.find((d) => d.id === h.dilemmaId);
              if (!dilemma) return null;
              const isLever = h.leverPulled;
              const savedTarget = isLever ? dilemma.straightTrack : dilemma.divertedTrack;
              const lostTarget = isLever ? dilemma.divertedTrack : dilemma.straightTrack;

              return (
                <div key={idx} className="ledger__row">
                  <div>
                    <div className="ledger__name">
                      {dilemma.title.replace(/^\s*\d+\.\s*İkilem:\s*/i, '')}
                    </div>
                    <div className="ledger__choice">
                      {idx + 1} / {DILEMMAS.length} · {dilemma.conceptualChoice ? 'Kavramsal seçim' : 'Makas kararı'} · {isLever ? dilemma.divertedActionLabel : dilemma.straightActionLabel}
                    </div>
                  </div>
                  <div className="ledger__outcome">
                    <span className="ledger__save">
                      {dilemma.conceptualChoice ? 'Korunan' : 'Kurtarılan'}: {savedTarget.label}
                    </span>
                    <span className={h.humanDeaths > 0 ? 'ledger__lose ledger__lose--cost' : 'ledger__lose'}>
                      Feda edilen: {lostTarget.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div variants={item} className="report__actions">
        <button onClick={handleCopy} data-hover-sound className="btn">
          {copied ? (
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          ) : (
            <Copy className="w-3.5 h-3.5" strokeWidth={2.5} />
          )}
          <span>{copied ? 'Panoya kopyalandı' : 'Sicilimi kopyala'}</span>
        </button>

        <button
          onClick={() => {
            playSoftTick(2);
            onRestart();
          }}
          data-hover-sound
          className="btn btn--secondary"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span>Yeniden oyna</span>
        </button>
      </motion.div>
    </motion.div>
  );
};
