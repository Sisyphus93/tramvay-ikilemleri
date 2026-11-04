# Procedural audio assets

44.1 kHz, mono, 16-bit PCM raw samples in ../audio-src/raw; browser SFX sprite is 32 kHz mono WAV (under 1.5 MB), with offsets in sfx.json. Ambience is a 30-second seamless 44.1 kHz WAV loop, calibrated to approximately -26 dBFS RMS / LUFS-equivalent for mono.

Rebuild with `npm run audio:build`. To replace one sound with a recording, overwrite its mono 44.1 kHz, 16-bit WAV in `audio-src/raw/` (for example `stamp_1.wav`) and rerun `npm run audio:build`; existing raw WAVs are preserved and packaged. Pass `--regenerate` to the script to regenerate every procedural sound. No external audio or dependencies are used.

Sounds: press, hover_1, hover_2, hover_3, switch_1, switch_2, paper_1, paper_2, paper_3, lever_clack_1, lever_clack_2, bell, air_brake, brake_squeal, drone, clack_1, clack_2, clack_3, impact_muffled_1, impact_muffled_2, crash_comic, stamp_1, stamp_2, sting_relief, sting_dread, sting_absurd.
