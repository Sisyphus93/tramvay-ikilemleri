# Audio pack — Absürt Tramvay İkilemleri

Tactile foley for a printed dossier world: rail, brass tram bell, ink stamp,
cardstock paper, old Istanbul tram. Everything here is **procedurally generated**
by `scripts/generate-audio.mjs` — pure Node built-ins, one seeded PRNG per
variant, so the output is reproducible and there is no third-party material.

The runtime engine (`src/utils/audio.ts`) only plays these pre-rendered samples.
It never uses oscillators or synth beeps.

## Files

| File | What it is |
|---|---|
| `sfx.json` | Sprite map: `{ "sprite": { "name": [startMs, durMs] } }` |
| `sfx.ogg` / `sfx.m4a` | One sprite holding every SFX, 100 ms of silence between slices |
| `ambience.ogg` / `ambience.m4a` | 30 s seamless loop: brown-noise hum, faint 50 Hz mains tone, vinyl crackle, distant rail clatter |

Format choice at runtime: `audio/ogg; codecs=vorbis` → `audio/mp4; codecs=mp4a.40.2`
→ `audio/wav` (last resort). The engine slices `sfx.*` with the millisecond
offsets in `sfx.json` and applies a few-ms fade at each slice end.

The encoders' priming delay was measured by decoding each file back and
cross-correlating it against the raw render; every shipped file has a lag of
**0 samples**, so the millisecond offsets are exact.

## Sound list

44.1 kHz mono, 16-bit source in `audio-src/raw/`. SFX peak at −6 dBFS
(`stamp_*`, `impact_muffled_*`, `crash_comic` at −3 dBFS). Ambience sits at
−26 LUFS integrated, true peak below −3 dBTP.

| Name | Length | Character |
|---|---|---|
| `press` | 0.15 s | muted mechanical button: 5 ms noise click + damped 120 Hz body |
| `hover_1..3` | 0.05 s | 2–3 ms highpassed tick with a faint 2–3 kHz resonance, dry |
| `switch_1..2` | 0.12 s | "tk-clack", two micro clicks 25–40 ms apart |
| `paper_1..3` | 0.4–0.6 s | cardstock handled: granular 2–6 kHz noise + low-mid body |
| `lever_clack_1..2` | 0.5 s | big CLACK (400 / 1100 / 2700 Hz) then a low CHUNK |
| `bell` | 1.2 s | modal brass tram bell, 1 : 2.0 : 2.76 : 5.4 : 8.9, ding-ding |
| `air_brake` | 0.8 s | "pssshh": highpassed noise, fast attack, long decay |
| `brake_squeal` | 0.6 s | scratchy metal-on-metal, drifting high partials + downward glide |
| `drone` | 2.0 s | four detuned saws, moving lowpass, ominous |
| `clack_1..3` | 0.12 s | dry rail joint, one metal resonance |
| `impact_muffled_1..2` | 0.6 s | crash through a wall: lowpassed burst + 90→35 Hz sweep |
| `crash_comic` | 1.2 s | comic crash + rising screech + record-scratch gesture |
| `stamp_1..2` | 0.4 s | the hero sound: rubber transient, 140→55 Hz body, woody desk |
| `sting_relief` | 1.5 s | Fmaj7 → C, detuned saws, light reverb |
| `sting_dread` | 1.5 s | low cluster (minor 2nd + tritone) under a 300 Hz lowpass |
| `sting_absurd` | 1.5 s | three off-kilter "bwah" notes with a rubbery bend |
| ambience | 30 s loop | felt more than heard; under everything |

## Rebuild

```bash
npm run audio:build     # render audio-src/raw/*.wav, then encode public/audio/*
npm run audio:verify    # numeric QA: peaks, DC, centroids, partials, loop seam
```

`audio:build` only needs Node. Encoding Ogg/AAC additionally needs `ffmpeg` on
`PATH` (or `FFMPEG=/path/to/ffmpeg`). Without it, the build ships
`public/audio/sfx.wav` + `ambience.wav` and the engine falls back to WAV.

The generated files **are committed**, so deploying never needs `ffmpeg`.

## Replacing a single sound with a real recording

1. Drop a mono 44.1 kHz 16-bit WAV into `audio-src/raw/` named exactly like the
   sound you want (e.g. `stamp_1.wav`, or `bell.wav`). Variants are
   `name_1`, `name_2`, `name_3`.
2. Run `npm run audio:build` — the generator re-renders everything; overwrite
   the one you replaced right after, or simply re-run the packaging step.
3. Run `npm run audio:verify` to confirm levels, DC and character checks.

To keep a real recording while still regenerating the rest, render first, then
copy your file in:

```bash
npx --no-install node scripts/generate-audio.mjs   # regenerates raw/
cp my-real-stamp.wav audio-src/raw/stamp_1.wav     # your better recording
npm run audio:package                              # re-slice + re-encode
```

Keep the naming scheme: the engine groups `_1.._3` as variants of one sound.
