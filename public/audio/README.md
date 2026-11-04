# Absürt Tramvay İkilemleri — audio assets

All sounds are original procedural Foley-style samples for the game's printed-dossier world: rail steel, an old tram bell, paper and ink. No third-party audio is bundled.

## Files and technical specs

The committed files are the production assets served from `/audio/`:

- `sfx.wav` — one 18.23-second sprite containing 26 named cues, with 100 ms of silence between slices; mono PCM16, 32 kHz, about 1.11 MiB.
- `sfx.json` — `{ "sprite": { "name": [startMs, durationMs] }, "formats": ["wav"] }` offsets plus the shipped codec list. The codec list lets the runtime avoid requesting unavailable formats.
- `ambience.wav` — a seamless 30-second loop; mono PCM16, 32 kHz, brown-noise tram-room bed, approximately -26 LUFS-equivalent RMS.

The source renders in `audio-src/raw/` are mono PCM16 WAV at 44.1 kHz. If `ffmpeg` is available, `npm run audio:build` also packages Ogg Vorbis and AAC/M4A versions; otherwise it ships the WAV fallback. The sprite is kept below 1.5 MiB.

### Sprite cues

| Cue names | Length | Character |
| --- | ---: | --- |
| `press` | 0.15 s | muted mechanical button press |
| `hover_1`–`hover_3` | 0.05 s | quiet dry ticks |
| `switch_1`–`switch_2` | 0.12 s | paired rail-switch micro-clacks |
| `paper_1`–`paper_3` | 0.48–0.54 s | cardstock shuffle |
| `lever_clack_1`–`lever_clack_2` | 0.50 s | large lever clack followed by a low chunk |
| `bell` | 1.20 s | two-strike inharmonic brass bell |
| `air_brake` | 0.80 s | high-pressure tram hiss |
| `brake_squeal` | 0.60 s | drifting metal squeal |
| `drone` | 2.00 s | low, filtered tram/brass bed |
| `clack_1`–`clack_3` | 0.12 s | dry wheel/rail ticks |
| `impact_muffled_1`–`impact_muffled_2` | 0.60 s | muted, low crash |
| `crash_comic` | 1.20 s | exaggerated layered comic crash |
| `stamp_1`–`stamp_2` | 0.40 s | weighty, non-ringing ink stamp |
| `sting_relief` | 1.50 s | warm major resolve |
| `sting_dread` | 1.50 s | low dissonant cluster |
| `sting_absurd` | 1.50 s | crooked, rubbery brass phrase |

## Rebuild and replace

Run the dependency-free Node renderer and packager:

```sh
npm run audio:build
node scripts/verify-audio.mjs
```

To replace a single generated cue with a better recording, put a WAV with the exact same name in `audio-src/raw/` (for example, `stamp_1.wav`) and run `npm run audio:build`. A replacement whose hash differs from the renderer's generated-file manifest is preserved and packaged rather than overwritten. The packager accepts PCM or 32-bit-float WAV, converts multichannel input to mono, and resamples to 32 kHz. Normal `npm run audio:build` refreshes unmodified procedural renders; `node scripts/generate-audio.mjs --force` overwrites even custom WAVs before packaging.

The renderer uses only Node built-ins and a seeded RNG. No global tools or npm packages are needed; `ffmpeg` is optional for Ogg/M4A encoding.
