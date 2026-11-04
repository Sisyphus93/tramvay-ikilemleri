# Tramvay ikilemleri — ses paketi

Bu klasördeki her ses dosyası `scripts/generate-audio.mjs` tarafından, saf Node.js
ile, sıfırdan üretilir. Hiçbir üçüncü taraf ses, örnekleme veya sample paketi
kullanılmaz. Renderer deterministiktir (tohumlu RNG), yani aynı komut her makinede
aynı dosyaları üretir.

## Dosyalar

| Dosya | Ne | Format |
| --- | --- | --- |
| `sfx.wav` | Tek bir "sprite": 26 efekt, aralarında 100 ms sessizlik | 32 kHz, mono, 16-bit PCM, ~1.10 MB |
| `sfx.json` | Sprite haritası: `{ "sprite": { "ad": [başlangıçMs, süreMs] } }` | JSON |
| `ambience.wav` | 30 s kesintisiz döngü (tramvay uğultusu + uzak ray takırtısı) | 32 kHz, mono, 16-bit, ~1.83 MB |

`audio-src/raw/` klasörü aynı seslerin 44.1 kHz sürümlerini tutar; sprite'lar bu
dosyalardan yeniden paketlenir.

### Sprite manifest'i

```json
{
  "sampleRate": 32000,
  "gapMs": 100,
  "formats": ["wav"],
  "sprite": { "press": [0, 150], "hover_1": [250, 50] }
}
```

`formats` alanı hangi kapsayıcıların sunulduğunu söyler. Şu an yalnızca `wav`
vardır (bu ortamda `ffmpeg` yok). `ffmpeg` kurulu bir makinede ogg/m4a da
üretirseniz bu listeye ekleyin; çalışma zamanı `canPlayType` ile desteklenen ilk
biçimi seçer, `wav` her zaman son çare olarak denenir.

## Ses listesi

| İsim | Süre | Karakter |
| --- | --- | --- |
| `press` | 150 ms | Tuş/basınç tıkırtısı: yumuşak lastik darbe + 120 Hz gövde |
| `hover_1..3` | 50 ms | Çok kısa mekanik imleç tiki, 2.2–3.6 kHz sönümlü rezonans |
| `switch_1..2` | 120 ms | İki mikro tık ("tk-clack"), 900 Hz + 2.4 kHz metal temas |
| `paper_1..3` | 400–460 ms | Karton kağıt hışırtısı: ~100 düzensiz grain + alt-orta gövde |
| `lever_clack_1..2` | 500 ms | Ağır makas: CLACK (400/1100/2700 Hz) + 110 ms sonra CHUNK (70 Hz) |
| `bell` | 1.2 s | Pirinç tramvay zili: 880 Hz temel, 1 : 2 : 2.76 : 5.4 : 8.9, iki vuruş |
| `air_brake` | 800 ms | Hava boşaltma "pşşşt", 1–2.2 kHz yukarı eğim, uzun sönüm |
| `brake_squeal` | 600 ms | Fren cıyırtısı: 1.8–3.2 kHz kayıtlı kısmi tonlar + kazıma |
| `drone` | 2.0 s | Detune testere sesler (55/82.5/110 Hz), 400 Hz alçak geçiren |
| `clack_1..3` | 120 ms | Kısa kuru ray eklemi tıkırtısı, tek metal rezonans |
| `impact_muffled_1..2` | 600 ms | Duvardan duyulan çarpma: 500 Hz altı gürültü + 90→35 Hz iniş |
| `crash_comic` | 1.2 s | Abartılı çizgi film kazası: çarpma, tiz kayma, plak kazıma |
| `stamp_1..2` | 400 ms | Islak damga: lastik temas + 140→55 Hz ağır gövde + ahşap masa |
| `sting_relief` | 1.5 s | Fmaj7 → C, sıcak çözülme, hafif reverb |
| `sting_dread` | 1.5 s | 41/55/58/78 Hz dissonant küme, 300 Hz alçak geçiren |
| `sting_absurd` | 1.5 s | Üç "bwah" notası, akort dışı, aşağı kayan rezonanslı lowpass |
| `ambience` | 30 s loop | 120 Hz uğultu + 50 Hz ton + vinil çıtırtı + 0.9 s'de bir uzak takırtı |

Seviyeler: tüm efektler tepe noktası ≈ −6 dBFS, `stamp_*` ve `impact_*` ≈ −3 dBFS,
ambience ≈ −26 LUFS (true peak < −3 dBFS).

## Yeniden üretme

```bash
npm run audio:build     # üret + doğrula
npm run audio:generate  # sadece üret
npm run audio:verify    # sadece sayısal doğrulama
```

```bash
npm run audio:smoke     # çalışma zamanı duman testi (sahte Web Audio grafiği)
```

`npm run audio:smoke` gerçek `src/utils/audio.ts` modülünü sahte bir Web Audio
grafiğiyle çalıştırır: jest öncesi `AudioContext` oluşturulmadığını, her ipucunun
doğru sprite dilimine gittiğini, stamp'in 380 ms sonra geldiğini ve eksik/HTML
olarak dönen dosyalarda sessizliğe düşüldüğünü doğrular.

`npm run audio:build` çıktısı `audio-src/raw/` (44.1 kHz) ve `public/audio/`
(32 kHz) klasörlerine yazılır; ikisi de depoya işlenir, böylece deploy sırasında
`ffmpeg` ya da render gerekmez.

## Tek bir sesi gerçek kayıtla değiştirme

1. Kaydınızı mono WAV olarak hazırlayın (44.1 kHz önerilir) ve dosyayı ilgili
   adla `audio-src/raw/` içine koyun — örn. `audio-src/raw/bell.wav`.
2. `npm run audio:repackage` çalıştırın. Komut, diskte bulduğu WAV'ları kullanır,
   bulamadıklarını yeniden sentezler; ardından sprite'ı ve `sfx.json`'ı
   günceller.
3. `npm run audio:verify` ile ölçümleri kontrol edin. Kendi kaydınız tasarım
   hedeflerini tutmuyorsa (örneğin damga çok tizse) doğrulama bunu söyler.

Not: paketleme sırasında her sesin tepe seviyesi hedefe göre yeniden normalize
edilir. Döngü sesi (`ambience.wav`) 30 s olmalıdır; daha kısa/uzun kayıtlar
uyarıyla kırpılır veya doldurulur.

## Neden böyle

Efektler tek bir sprite'ta durur: tarayıcı bir kez indirir, `AudioBuffer` bir kez
çözülür ve tüm sesler `AudioBufferSourceNode` ile o buffer'ın dilimlerinden
çalınır. Böylece 26 ayrı istek/ağ gecikmesi olmaz. Ambience ayrı bir dosyadır
çünkü döngüde çalması ve kısılması (duck) gerekir.
