/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PlayerHistoryEntry } from '../types.ts';
import { DILEMMAS } from '../data/dilemmas.ts';
import { playSummaryReveal, playSoftTick } from '../utils/audio.ts';
import {
  RotateCcw,
  Copy,
  Check,
  X,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SummaryScreenProps {
  history: PlayerHistoryEntry[];
  onRestart: () => void;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PREVIEW_ROW_COUNT = 5;

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  history,
  onRestart,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const reduceMotion = useReducedMotion();
  /** the "kopyalandı" flash timer, so unmounting cannot set state afterwards */
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    playSummaryReveal();
  }, []);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    },
    []
  );

  const totalDeaths = history.reduce((sum, h) => sum + h.humanDeaths, 0);
  const totalMaterialDamageTL = history.reduce((sum, h) => sum + (h.materialDamageTL || 0), 0);
  const formattedMaterialDamage = new Intl.NumberFormat('tr-TR').format(totalMaterialDamageTL);
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
  const visibleHistory = showDetails ? history : history.slice(0, PREVIEW_ROW_COUNT);
  const hasMoreRows = history.length > PREVIEW_ROW_COUNT;

  const getArchetype = () => {
    // Denominator is the number of rounds actually recorded, not the 26 the game
    // contains. Identical for a complete run; for a short one, dividing by 26
    // silently understated the ratio and could select a different archetype.
    const leverPullRatio = history.length > 0 ? totalLeverPulls / history.length : 0;
    const savedPet = history.find((h) => h.dilemmaId === 10 && !h.leverPulled);
    const killedPet = history.find((h) => h.dilemmaId === 10 && h.leverPulled);
    const killedKolsuz = history.find((h) => h.dilemmaId === 22 && h.leverPulled);
    const tookBribe = history.find((h) => h.dilemmaId === 15 && h.leverPulled);

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

  /** Flash the button's result for 2.5 s, then return it to its idle label. */
  const flashCopyResult = (ok: boolean) => {
    setCopied(ok);
    setCopyFailed(!ok);
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      copyTimerRef.current = null;
      setCopied(false);
      setCopyFailed(false);
    }, 2500);
  };

  /**
   * Fallback for contexts where the async Clipboard API is unavailable or
   * refused — most importantly a non-secure origin, where `navigator.clipboard`
   * is simply undefined.
   */
  const copyViaTextarea = (text: string): boolean => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopy = () => {
    playSoftTick(1);
    // history.length, not DILEMMAS.length: the share text states the same ratio
    // the archetype is computed from, so the two must not disagree on a short
    // history. Identical for a complete 26-round game.
    const text = `ABSÜRT TRAMVAY İKİLEMLERİ — SİCİL RAPORUM\nUnvanım: ${archetype.title} (${archetype.badge})\nToplam zayiat: ${totalDeaths} can kaybı\nMakas tercihi: ${history.length} ikilemde ${totalLeverPulls} kez kolu çektim!\n\nFelsefeyi sen de çöz: ${window.location.origin}`;

    // No feature check and no .catch here used to mean: on a non-secure origin
    // the property access threw synchronously out of the click handler, and on a
    // permission denial the promise rejected unhandled. Either way the button
    // just sat there claiming nothing.
    const write = navigator.clipboard?.writeText?.(text);
    if (write) {
      write
        .then(() => flashCopyResult(true))
        .catch(() => flashCopyResult(copyViaTextarea(text)));
      return;
    }
    flashCopyResult(copyViaTextarea(text));
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
        <div className="report__head-copy">
          <p className="report__meta">Kayıt tamamlandı · {DILEMMAS.length} ikilem</p>
          <h1 className="report__title">Ahlaki sicil raporu</h1>
          <p className="report__lede">
            <span className="numeral">{DILEMMAS.length}</span> absürt ikilemin ardından makas kolu
            artık senin adına bir şeyler söylüyor. İşte kararlarının toplumsal ve ahlaki bilançosu.
          </p>
        </div>

        <div className="report__actions">
          <button onClick={handleCopy} data-hover-sound className="btn btn--primary">
            {copied ? (
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            ) : copyFailed ? (
              <X className="w-3.5 h-3.5" strokeWidth={3} />
            ) : (
              <Copy className="w-3.5 h-3.5" strokeWidth={2.5} />
            )}
            <span aria-live="polite">
              {copied ? 'Panoya kopyalandı' : copyFailed ? 'Kopyalanamadı' : 'Sicilimi kopyala'}
            </span>
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
        </div>
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
        <div className={`stat stat--lead ${totalDeaths > 0 ? 'stat--bad' : ''}`}>
          <div className="stat__label">Toplam zayiat</div>
          <div className="stat__value stat__value--lead numeral">
            {totalDeaths}
            <span className="stat__unit">can</span>
          </div>
          <div className="stat__sub">İnsan kaybı toplamı</div>
        </div>

        <div className="stat">
          <div className="stat__label">Maddi hasar</div>
          <div className="stat__value numeral">
            {formattedMaterialDamage}
            <span className="stat__unit">₺</span>
          </div>
          <div className="stat__sub">Kayıtlardaki ekonomik bedel</div>
        </div>

        <div className="stat">
          <div className="stat__label">Müdahale etti</div>
          <div className="stat__value numeral">
            {totalLeverPulls}
            <span className="stat__unit">kez</span>
          </div>
          <div className="stat__sub">
            {switchPulls} makas · {conceptualActive} kavramsal
          </div>
        </div>

        <div className="stat">
          <div className="stat__label">Müdahale etmedi</div>
          <div className="stat__value numeral">
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
          type="button"
          onClick={() => {
            playSoftTick(0);
            setShowDetails(!showDetails);
          }}
          data-hover-sound
          aria-expanded={showDetails}
          className="ledger__head"
        >
          <span>
            Karar dökümü{' '}
            <span className="ledger__head-meta numeral">
              ({showDetails ? `${history.length} / ${DILEMMAS.length}` : `ilk ${Math.min(PREVIEW_ROW_COUNT, history.length)} / ${DILEMMAS.length}`})
            </span>
          </span>
          <span className="ledger__head-toggle">
            <span>
              {showDetails ? 'İlk 5 ikileme daralt' : `Tüm ${DILEMMAS.length} ikilemi göster`}
            </span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
            )}
          </span>
        </button>

        <div className="ledger__cols-head" aria-hidden="true">
          <span>İkilem ve seçim</span>
          <span>Kurtarılan / Korunan</span>
          <span>Feda edilen</span>
        </div>

        <div className="ledger__list">
          {visibleHistory.map((h) => {
            const dilemma = DILEMMAS.find((d) => d.id === h.dilemmaId);
            if (!dilemma) return null;
            const isLever = h.leverPulled;
            const savedTarget = isLever ? dilemma.straightTrack : dilemma.divertedTrack;
            const lostTarget = isLever ? dilemma.divertedTrack : dilemma.straightTrack;

            return (
              <div key={h.dilemmaId} className="ledger__row">
                <div className="ledger__cell ledger__cell--turn">
                  <div className="ledger__name">
                    {dilemma.title.replace(/^\s*\d+\.\s*İkilem:\s*/i, '')}
                  </div>
                  <div className="ledger__choice">
                    {h.dilemmaId} / {DILEMMAS.length} · {dilemma.conceptualChoice ? 'Kavramsal seçim' : 'Makas kararı'} · {isLever ? dilemma.divertedActionLabel : dilemma.straightActionLabel}
                  </div>
                </div>
                <div className="ledger__cell ledger__cell--save">
                  <span className="ledger__mobile-key">
                    {dilemma.conceptualChoice ? 'Korunan:' : 'Kurtarılan:'}
                  </span>
                  <span className="ledger__save">{savedTarget.label}</span>
                </div>
                <div className="ledger__cell ledger__cell--lose">
                  <span className="ledger__mobile-key">Feda edilen:</span>
                  <span className={h.humanDeaths > 0 ? 'ledger__lose ledger__lose--cost' : 'ledger__lose'}>
                    {lostTarget.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {hasMoreRows && (
          <button
            type="button"
            onClick={() => {
              playSoftTick(0);
              setShowDetails(!showDetails);
            }}
            data-hover-sound
            aria-expanded={showDetails}
            className="ledger__footer-toggle"
          >
            <span>
              {showDetails
                ? 'İlk 5 ikileme daralt'
                : `Tüm ${DILEMMAS.length} ikilemi göster (+${history.length - PREVIEW_ROW_COUNT} kayıt)`}
            </span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};
