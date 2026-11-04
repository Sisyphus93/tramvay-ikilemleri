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
→ `audio/wav`. That order is only a starting preference: the engine re-ranks the
candidates with `canPlayType` and then tries each one through fetch *and* decode,
so a format the browser claims but cannot actually decode still falls through to
the next one. The engine slices `sfx.*` with the millisecond offsets in
`sfx.json` and applies a few-ms fade at each slice end.

The encoders' priming delay was measured by decoding each file back and
cross-correlating it against the raw render; every shipped file has a lag of
**0 samples**, so the millisecond offsets are exact.

## Sound list

44.1 kHz mono, 16-bit source in `audio-src/raw/`. Peak ceilings are −6 dBFS
(−3 dBFS for `stamp_*`, `impact_muffled_*`, `crash_comic`); every slice is then
trimmed once, by a single scale factor, to its phone-weighted target (see
below), so the actual peaks sit at or under those ceilings. Nothing is
compressed or limited at render time. Ambience sits at −26 LUFS integrated,
true peak below −3 dBTP.

| Name | Length | Character |
|---|---|---|
| `press` | 0.15 s | mechanical button click that survives a phone: 2–4 kHz noise transient + short 300–800 Hz body |
| `hover_1..3` | 0.05 s | 2–3 ms highpassed tick with a faint 2–3 kHz resonance, dry |
| `switch_1..2` | 0.12 s | "tk-clack", two micro clicks 25–40 ms apart |
| `paper_1..3` | 0.4–0.6 s | cardstock handled: granular 2–6 kHz noise + low-mid body |
| `lever_clack_1..2` | 0.5 s | big CLACK (400 / 1100 / 2700 Hz) then a low CHUNK |
| `bell` | 1.2 s | modal brass tram bell, 1 : 2.0 : 2.76 : 5.4 : 8.9, ding-ding |
| `air_brake` | 0.8 s | "pssshh": highpassed noise, fast attack, long decay |
| `brake_squeal` | 0.6 s | scratchy metal-on-metal, drifting high partials + downward glide |
| `drone` | 2.0 s | four detuned saws, moving lowpass, ominous — a bed under the straight-track approach |
| `clack_1..3` | 0.12 s | dry rail joint, one metal resonance |
| `impact_muffled_1..2` | 0.6 s | crash through a wall: 90→35 Hz sweep + 150–400 Hz chest + a short 1–3 kHz crack |
| `crash_comic` | 1.2 s | comic crash + rising screech + record-scratch gesture |
| `stamp_1..2` | 0.4 s | the hero sound: 140→55 Hz body, woody desk resonance, dry 1–3 kHz noise slap |
| ambience | 30 s loop | felt more than heard; under everything |

## Phone-weighted level targets

The game is watched on phones at low volume, and a phone speaker reproduces
almost nothing below ~350–400 Hz. Full-band RMS is therefore blind to the
problem: `press` used to be a 120 Hz thump that measured "fine" and was
inaudible in a hand. `scripts/audio-metrics.mjs` (shared by the build and the
verifier) band-limits each slice with a 2nd-order Butterworth high-pass at
400 Hz and low-pass at 10 kHz, then measures RMS over the active part (samples
above −40 dB relative to the slice peak).

`T` is the level `lever_clack` had before the phone pass (−22.6 dBFS on this
metric) minus 4 dB, i.e. **−26.6 dBFS**:

| Group | Target |
|---|---|
| `press`, `switch_*`, `lever_clack_*`, `stamp_*`, `impact_muffled_*`, `crash_comic`, `bell`, `paper_*`, `air_brake`, `brake_squeal` | `T` ± 2 dB |
| `hover_*`, `clack_*` (quiet ticks) | `T` − 6 ± 2 dB |
| `drone` (bed) | `T` − 8 ± 3 dB |

`npm run audio:verify` enforces all of them and prints the table.

## Runtime controls

`src/utils/audio.ts` keeps one master mute (`M`, the "Ses" button) plus two
independent buses, each with its own on/off and its own 0–1 slider: background
(the ambience bed) and effects (everything else, the approach rumble included).
The two user gains are separate nodes, so ducking the bed during a decision can
never fight the slider. The one audio settings popover in the header exposes
both.

## Rebuild

```bash
npm run audio:build     # render audio-src/raw/*.wav, then encode public/audio/*
npm run audio:verify    # numeric QA: peaks, DC, centroids, partials, loop seam
```

`audio:build` only needs Node. Encoding Ogg/AAC additionally needs `ffmpeg` on
`PATH` (or `FFMPEG=/path/to/ffmpeg`). Without it, the build writes
`public/audio/sfx.wav` + `ambience.wav` instead and the engine falls back to WAV.

The Ogg/AAC files **are committed**, so deploying never needs `ffmpeg`. The WAV
files are **not** committed — they exist only in a local no-ffmpeg working copy,
and a deploy always serves Ogg or AAC. Asking a deploy for a WAV path returns
`index.html` with a 200 through the SPA catch-all; the engine rejects that on the
content-type and moves on to the next candidate.

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
