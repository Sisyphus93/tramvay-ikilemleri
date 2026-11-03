/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PlayerHistoryEntry } from '../types.ts';
import { DILEMMAS } from '../data/dilemmas.ts';
import { playChordSwell, playSoftTick } from '../utils/audio.ts';
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

  useEffect(() => {
    playChordSwell();
  }, []);

  const totalDeaths = history.reduce((sum, h) => sum + h.humanDeaths, 0);
  const totalLeverPulls = history.filter((h) => h.leverPulled).length;

  const getArchetype = () => {
    const savedCat = history.find((h) => (h.dilemmaId === 23 || h.dilemmaId === 8) && !h.leverPulled);
    const killedCat = history.find((h) => (h.dilemmaId === 23 || h.dilemmaId === 8) && h.leverPulled);
    const killedKolsuz = history.find((h) => (h.dilemmaId === 27 || h.dilemmaId === 12) && h.leverPulled);
    const tookBribe = history.find((h) => (h.dilemmaId === 28 || h.dilemmaId === 13) && h.leverPulled);

    if (tookBribe && totalLeverPulls >= 16) {
      return {
        title: 'Pragmatist Kriptocu Baron',
        badge: 'PARANIN GÜCÜ',
        desc: 'Felsefeyi cebine koydun, 100M TL’yi kaptın. Ahlak iyi ama Maldivler’de villa daha iyi.',
      };
    }
    if (savedCat && !killedKolsuz && totalLeverPulls <= 10) {
      return {
        title: 'Hümanist ve Kedi Dostu',
        badge: 'VİCDANLI KALBİ TEMİZ',
        desc: 'Ne masum kediye kıydın ne de yayalara. Olabildiğince az makas çekip kadere teslim oldun.',
      };
    }
    if (killedKolsuz && totalLeverPulls >= 15) {
      return {
        title: 'Kati Faydacı Sigma Gamer',
        badge: 'RANK HER ŞEYDİR',
        desc: 'Dereceli maçta 0/15 giden kolsuzu hiç düşünmeden ezdin. Sayılar ve galibiyet senin tek pusulan.',
      };
    }
    if (killedCat) {
      return {
        title: 'Acımasız Rasyonalist',
        badge: 'SOĞUKKANLI HESAPÇI',
        desc: 'Mahallenin tombul kedisini bile insan uğruna feda ettin. Türk interneti senden korkuyor.',
      };
    }
    if (totalLeverPulls >= 20) {
      return {
        title: 'Kaos ve Makas İlahı',
        badge: 'MAKAS TUTKUNU',
        desc: 'Önüne gelen her fırsatta kolu çektin. Düzen değil kaos yaratmak için buradasın.',
      };
    }
    if (totalLeverPulls <= 8) {
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
    const text = `🚋 ABSÜRT TRAMVAY İKİLEMLERİ — SICİL RAPORUM 🚋
Unvanım: ${archetype.title} (${archetype.badge})
💀 Toplam Zayiat: ${totalDeaths} Can Kaybı
⚡ Makas Tercihi: ${DILEMMAS.length} ikilemde ${totalLeverPulls} kez kolu çektim!

Felsefeyi sen de çöz: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      {/* Title Header */}
      <div className="text-center space-y-2 pb-6 border-b-2 border-[#2A2520]">
        <span className="text-xs font-label text-[#D5472F] tracking-widest">
          AHLAKİ & FELSEFİ SİCİL KARNESİ
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2A2520] font-headline">
          Felsefeyi Çözdün!
        </h1>
        <p className="text-[#6B6154] text-sm max-w-lg mx-auto">
          {DILEMMAS.length} absürt tramvay ikilemini geride bıraktın. İşte verdiğin kararların toplumsal ve ahlaki bilançosu:
        </p>
      </div>

      {/* Handcrafted Moral Archetype Stamp */}
      <div className="my-6 p-6 rounded-2xl bg-[#E7DCC5] border-2 border-[#2A2520] flat-shadow text-center space-y-2 relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F4EDDF] text-[#D5472F] border border-[#2A2520] text-xs font-label">
          <Award className="w-3.5 h-3.5" />
          <span>{archetype.badge}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#2A2520] font-headline">
          {archetype.title}
        </h2>
        <p className="text-sm text-[#2A2520] max-w-md mx-auto leading-relaxed">
          {archetype.desc}
        </p>
      </div>

      {/* Real Player Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="p-4 rounded-xl bg-[#F4EDDF] border-2 border-[#2A2520] flat-shadow text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-label text-[#6B6154]">
            <Skull className="w-4 h-4 text-[#D5472F]" />
            <span>TOPLAM ZAYİAT</span>
          </div>
          <div className="text-2xl font-bold text-[#2A2520] tabular-nums font-headline">
            {totalDeaths} <span className="text-xs font-normal text-[#6B6154]">can</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F4EDDF] border-2 border-[#2A2520] flat-shadow text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-label text-[#6B6154]">
            <span>KOLU ÇEKTİ</span>
          </div>
          <div className="text-2xl font-bold text-[#D5472F] tabular-nums font-headline">
            {totalLeverPulls} <span className="text-xs font-normal text-[#6B6154]">kez</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F4EDDF] border-2 border-[#2A2520] flat-shadow text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-label text-[#6B6154]">
            <span>HİÇBİR ŞEY YAPMADI</span>
          </div>
          <div className="text-2xl font-bold text-[#2F8478] tabular-nums font-headline">
            {DILEMMAS.length - totalLeverPulls} <span className="text-xs font-normal text-[#6B6154]">kez</span>
          </div>
        </div>
      </div>

      {/* Detailed Choices Collapsible */}
      <div className="my-6 border-2 border-[#2A2520] rounded-xl overflow-hidden bg-[#F4EDDF] flat-shadow">
        <button
          onClick={() => {
            playSoftTick(0);
            setShowDetails(!showDetails);
          }}
          className="w-full py-3 px-4 flex items-center justify-between text-left text-sm font-bold text-[#2A2520] font-headline hover:bg-[#E7DCC5] transition-colors"
        >
          <span>{DILEMMAS.length} İkilemdeki Tercihlerinin Tam Dökümü</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="divide-y-2 divide-[#E7DCC5] border-t-2 border-[#2A2520]">
            {history.map((h, idx) => {
              const dilemma = DILEMMAS.find((d) => d.id === h.dilemmaId);
              if (!dilemma) return null;
              const isLever = h.leverPulled;
              const savedTarget = isLever ? dilemma.straightTrack : dilemma.divertedTrack;
              const lostTarget = isLever ? dilemma.divertedTrack : dilemma.straightTrack;

              return (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#2A2520] font-headline text-sm">
                        {dilemma.title}
                      </span>
                    </div>
                    <p className="text-[#6B6154]">
                      Tercihin:{' '}
                      <strong className={isLever ? 'text-[#D5472F]' : 'text-[#2A2520]'}>
                        {isLever ? dilemma.divertedActionLabel : dilemma.straightActionLabel}
                      </strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[#2F8478] font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Kurtulan: {savedTarget.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#D5472F] font-medium">
                      <Skull className="w-3.5 h-3.5" />
                      Zayiat: {lostTarget.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#D5472F] hover:bg-[#b83721] text-[#F4EDDF] font-bold text-sm transition-all border-2 border-[#2A2520] flat-shadow hover:translate-x-[1px] hover:translate-y-[1px]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="font-headline tracking-wide">
            {copied ? 'Sicil Panoya Kopyalandı!' : 'Sicilimi Kopyala & Paylaş'}
          </span>
        </button>

        <button
          onClick={() => {
            playSoftTick(2);
            onRestart();
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#E7DCC5] hover:bg-[#ded1b6] text-[#2A2520] font-bold text-sm transition-all border-2 border-[#2A2520] flat-shadow hover:translate-x-[1px] hover:translate-y-[1px]"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="font-headline tracking-wide">Yeniden Oyna</span>
        </button>
      </div>
    </div>
  );
};
