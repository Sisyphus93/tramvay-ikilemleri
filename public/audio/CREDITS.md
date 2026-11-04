# Credits

All sounds in this folder — the SFX sprite, every variant, and the 30 s ambience
loop — are **procedurally generated** by `scripts/generate-audio.mjs` in this
repository.

No third-party samples, recordings, impulse responses, loops or libraries were
downloaded, sampled or embedded. The renderer uses only Node.js built-ins and
synthesises everything from seeded noise, sine/saw partials, filters and a
Schroeder reverb. The output is therefore safe to stream.

- Renderer + recipes: `scripts/generate-audio.mjs`
- Numeric QA: `scripts/verify-audio.mjs`
- Packaging / format encoding: `scripts/package-audio.mjs`
- Runtime engine: `src/utils/audio.ts`

If you replace a generated file with a real recording, add its licence and
source to this file before shipping.
