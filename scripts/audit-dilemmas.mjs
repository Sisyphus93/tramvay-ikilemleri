#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Read-only consistency checks on src/data/dilemmas.ts.
 *
 *   node scripts/audit-dilemmas.mjs      (or: npm run audit:data)
 *
 * This never writes to the data file and is deliberately NOT part of build, lint
 * or audio:verify -- it is a separate, opt-in gate.
 *
 * Exit codes: 0 = clean, 1 = the data has hard errors, 2 = this script could not
 * read its own inputs (so its verdict would be meaningless).
 *
 * What it checks
 *   - ids run 1..N with no duplicates and no gaps
 *   - every required text field is a non-empty string, on the dilemma and on both
 *     of its tracks (the field list is read out of src/types.ts, so it follows the
 *     type instead of drifting away from it)
 *   - each track has a count that is an integer >= 1
 *   - each track's entityType has an ENTITY_META entry
 *   - each track's isHuman agrees with that entry's kind
 *   - monetaryValueTL, when present, is a finite number >= 0
 *
 * What it deliberately does NOT check
 *   - a track with no monetaryValueTL. That field is optional on purpose: only some
 *     dilemmas destroy something with a price, and treating the rest as an error
 *     would be noise.
 *   - chatReaction wording, quoting or a "Chat:" prefix. That is copy style, not
 *     consistency, and it is the owner's call.
 *   - twitchEmote. The type requires it and every entry supplies it, so tsc already
 *     covers it; nothing reads the value, which is a separate question.
 *
 * ENTITY_META lives in src/components/TrolleyCanvas.tsx as a non-exported const, so
 * it is read as text rather than imported. If that ever stops parsing, this script
 * exits 2 rather than reporting every track as unknown.
 */

import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(ROOT, 'package.json'));

const errors = [];
const at = (id, text) => errors.push(`id ${String(id).padStart(2)}: ${text}`);

/* ---------- inputs ---------- */

let esbuild;
try {
  esbuild = require('esbuild');
} catch {
  console.error('esbuild is not installed; run npm ci first.');
  process.exit(2);
}

// The data file is TypeScript, so bundle it with the esbuild that is already a
// devDependency. The output goes to the system temp directory, never into the
// repo: a stray file here would be picked up by the bundler's content scan and by
// git for no reason.
const work = mkdtempSync(join(tmpdir(), 'audit-dilemmas-'));
const bundled = join(work, 'dilemmas.mjs');
let DILEMMAS;
try {
  await esbuild.build({
    entryPoints: [join(ROOT, 'src/data/dilemmas.ts')],
    outfile: bundled,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  ({ DILEMMAS } = await import(bundled));
} catch (err) {
  console.error(`could not bundle src/data/dilemmas.ts: ${err?.message ?? err}`);
  process.exit(2);
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (!Array.isArray(DILEMMAS) || DILEMMAS.length === 0) {
  console.error('src/data/dilemmas.ts exported no DILEMMAS array.');
  process.exit(2);
}

/** The body of `export interface <name> { ... }`, or null. */
function interfaceBody(source, name) {
  const start = source.indexOf(`export interface ${name} {`);
  if (start < 0) return null;
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(source.indexOf('{', start), i + 1);
    }
  }
  return null;
}

/** Required (not `?`) fields typed `string` in an interface body. */
function requiredStrings(body) {
  return [...body.matchAll(/^\s*(\w+): string;$/gm)].map((m) => m[1]);
}

let typesSource;
let canvasSource;
try {
  typesSource = readFileSync(join(ROOT, 'src/types.ts'), 'utf8');
  canvasSource = readFileSync(join(ROOT, 'src/components/TrolleyCanvas.tsx'), 'utf8');
} catch (err) {
  console.error(`could not read a source file: ${err?.message ?? err}`);
  process.exit(2);
}

const dilemmaBody = interfaceBody(typesSource, 'Dilemma');
const trackBody = interfaceBody(typesSource, 'TrackTarget');
if (!dilemmaBody || !trackBody) {
  console.error('could not find the Dilemma / TrackTarget interfaces in src/types.ts.');
  process.exit(2);
}
const DILEMMA_TEXT = requiredStrings(dilemmaBody).filter((k) => k !== 'twitchEmote');
const TRACK_TEXT = requiredStrings(trackBody);

const metaStart = canvasSource.indexOf('const ENTITY_META = {');
const ENTITY_META = new Map(
  metaStart < 0
    ? []
    : [...canvasSource.slice(metaStart).matchAll(/^\s*(\w+): \{ code: '[^']*', kind: '(\w+)' \},?$/gm)]
        .map((m) => [m[1], m[2]]),
);
if (ENTITY_META.size === 0) {
  console.error('could not parse ENTITY_META in src/components/TrolleyCanvas.tsx.');
  process.exit(2);
}

/* ---------- checks ---------- */

const seen = new Map();
DILEMMAS.forEach((d, i) => {
  const expected = i + 1;
  if (seen.has(d.id)) at(d.id, `duplicate id (already used by index ${seen.get(d.id)})`);
  else seen.set(d.id, i);
  if (d.id !== expected) at(d.id, `id is out of sequence: position ${i} should hold ${expected}`);

  for (const key of DILEMMA_TEXT) {
    if (typeof d[key] !== 'string' || d[key].trim() === '') at(d.id, `${key} is missing or empty`);
  }

  for (const side of ['straight', 'diverted']) {
    const track = d[`${side}Track`];
    const where = `${side}Track`;
    if (!track || typeof track !== 'object') {
      at(d.id, `${where} is missing`);
      continue;
    }
    for (const key of TRACK_TEXT) {
      if (typeof track[key] !== 'string' || track[key].trim() === '') at(d.id, `${where}.${key} is missing or empty`);
    }
    if (!Number.isInteger(track.count) || track.count < 1) {
      at(d.id, `${where}.count is ${JSON.stringify(track.count)}, expected an integer >= 1`);
    }

    const kind = ENTITY_META.get(track.entityType);
    if (kind === undefined) {
      at(d.id, `${where}.entityType "${track.entityType}" has no ENTITY_META entry`);
    } else if ((kind === 'human') !== (track.isHuman === true)) {
      at(
        d.id,
        `${where} "${track.label}": isHuman=${track.isHuman} but ENTITY_META.${track.entityType}.kind="${kind}"`
      );
    }

    if (track.monetaryValueTL !== undefined) {
      const value = track.monetaryValueTL;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        at(d.id, `${where}.monetaryValueTL is ${JSON.stringify(value)}, expected a finite number >= 0`);
      }
    }
  }
});

/* ---------- summary ---------- */

const tracks = DILEMMAS.length * 2;
for (const line of errors) console.log(`ERROR  ${line}`);
if (errors.length) {
  console.log('');
  console.log(
    'note: ENTITY_META.kind says which sprite to draw, while isHuman drives the death tally in\n' +
      '      App.tsx. The two can disagree on purpose -- a taxi is drawn as a vehicle but its driver\n' +
      '      dies, and a fictional person is drawn as a person but is not a real death. Every\n' +
      '      isHuman/kind error above should be read as "confirm this is intended", not as a bug.'
  );
}
console.log('');
console.log(
  `audited ${DILEMMAS.length} dilemmas, ${tracks} tracks, ${ENTITY_META.size} ENTITY_META kinds, ` +
    `${DILEMMA_TEXT.length + TRACK_TEXT.length} required text fields per dilemma`
);
console.log(errors.length ? `${errors.length} hard error(s)` : 'no hard errors');
process.exit(errors.length ? 1 : 0);
