# Audio assets — Absürt Tramvay İkilemleri

All sounds are a printed-dossier foley kit: paper, ink, steel, old Istanbul
tram. They are **procedurally generated** (see `CREDITS.md`) — no third-party
material, no license concerns for streaming.

## Files

| File | Contents |
|---|---|
| `sfx.json` | Sprite manifest: `{ sprite: { name: [startMs, durMs] }, formats, sampleRate }` |
| `sfx.wav` | All 26 SFX concatenated (100 ms silence between slices), 32 kHz mono 16-bit, ~1.1 MB |
| `ambience.wav` | Seamless room loop (~28 s, crossfaded), 32 kHz mono 16-bit, ≈ −26 LUFS (RMS-based), true peak ≤ −3 dBFS |

When the build machine has `ffmpeg`, `sfx.ogg` / `sfx.m4a` / `ambience.ogg` /
`ambience.m4a` are also emitted and listed first in `formats`; the engine picks
the first format `canPlayType` accepts, with WAV as the last resort.

## Sound names (sprite slices)

`press`, `hover_1..3`, `switch_1..2`, `paper_1..3`, `lever_clack_1..2`,
`bell`, `air_brake`, `brake_squeal`, `drone`, `clack_1..3`,
`impact_muffled_1..2`, `crash_comic`, `stamp_1..2`,
`sting_relief`, `sting_dread`, `sting_absurd`.

`_1.._3` are variants: the engine picks one at random, never the same twice in
a row. Normalization: SFX peak −6 dBFS, except `stamp_*` and `impact_*` at
−3 dBFS.

## Rebuilding

```sh
npm run audio:build         # generate missing raws + package (deterministic, seeded)
npm run audio:build:force   # regenerate EVERY raw from the recipes
npm run audio:verify        # numeric checks: peaks, RMS, DC, attack, spectra, loop seam
```

Requires only Node ≥ 18 (no dependencies). Raw 44.1 kHz sources live in
`../../audio-src/raw/`; packaging resamples the sprite to 32 kHz to stay under
~1.5 MB and re-normalizes each slice after resampling.

## Replacing a sound with a better recording

1. Drop a WAV with the same file name into `audio-src/raw/` (e.g.
   `audio-src/raw/stamp_1.wav`). Any sample rate / bit depth / channel count —
   it is downmixed to mono and resampled.
2. Run `npm run audio:build` (without `--force`, so your file is kept).
3. Run `npm run audio:verify` — normalization and the manifest are automatic.

Keep replacements roughly the documented length; the game re-times stamps and
stings from the manifest, but long tails can bleed into the 100 ms sprite gap.
