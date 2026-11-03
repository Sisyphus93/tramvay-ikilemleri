# Before audit — Tramvay İkilemleri

Browser captures: desktop 1440×900, tablet 768×1024, mobile 390×844. Title and first gameplay screen inspected at all three sizes; first decision and result exercised on desktop.

## Preserved baseline
React 19, TypeScript, Vite 8, Tailwind v4 plus existing plain CSS, Motion, Lucide. Single-page TITLE → PLAYING → SUMMARY state flow; 27 dilemmas; local game history and sound preference. No forms or links on the inspected title/first gameplay states. Brand: existing cream/ink/vermilion palette and supporting semantic hues; Archivo, IBM Plex Mono, Instrument Serif; existing 27 mark and trolley artwork.

## ROUND 0
Seen in one second: a bold cream-and-red trolley poster; gameplay becomes a dense diagram with a long question.
Idea: the player's moral choices are a tramway switching diagram.
Live thing: choose a route, commit a decision, watch the tram and reveal the outcome.
Layout words: title=split poster / gameplay=stacked diagram and choices / result=outcome comparison.
Scores (subjective): design 6 · usability 6 · creativity 7 · content 8 → overall 6.4.
Caps: tiny labels and ornamental treatments remain. Marketing-photo requirements do not fit this interactive illustrated game. App-title-size warning does not fit the introductory poster. Brand palette and fonts are fixed by the brief, not candidates for replacement.

## Three highest-impact changes proposed
1. Make the decision the focal action. Desktop first-dilemma choices start at y=908, below a 900px viewport. Rebalance question, board height and vertical gaps so both choices appear on the first desktop screen; make setup/ask visibly distinct without changing text or question-splitting logic. Preserve the interactive drawing and all route/lever behavior.
2. Establish a readable type and spacing system. Inspector finds 20 text blocks below 11px and 18 tiny uppercase tracked labels per title viewport. Promote meaningful secondary labels to 12–14px and prose toward 16px; reduce tracking/case treatment; use consistent gutters and gaps; simplify nonessential background, underline, border and shadow treatments outside the unchanged logo. Keep all existing font families, colors, content and artwork.
3. Compose for touch and narrow screens. Sound/restart buttons are only 34px high (about 36px wide on mobile). Increase to at least 44×44px, allow the brand lockup appropriate room, reduce duplicate chrome around the scaled diagram, and tighten mobile rhythm so both decisions are easier to reach (currently y=714–817 and y=831–935 on a viewport ending at 844). Maintain readable choices, visible focus, disabled/selected states and progress.

## Baseline checks
- npm ci: existing lockfile installed; zero audit vulnerabilities reported.
- npm run lint: PASS.
- npm run build: PASS.
- No test script or test suite configured in package.json.
- Browser: no runtime exceptions on inspected screens; no horizontal overflow at any of the three widths.
- Desktop first decision animation → result: PASS.
- Full 27-step traversal, copy/restart, keyboard controls, and remaining interactions are reserved for comprehensive post-implementation verification.

## Inspector interpretation
The automated before report records 9 grouped FAIL findings and 2 WARN findings. It correctly flags tiny labels, shadows and headline wrapping. Its palette rejection conflicts with the explicit keep-brand requirement and will not drive recoloring. Covered-text reports are not corroborated by the opened screenshots; grain/overlay and reveal masking need a targeted check rather than assuming the title is actually hidden. The introductory poster and working game need different title-scale criteria.

## Files
No application source or dependency manifests changed. Captures and reports are in .taste-skill/before/. Temporary browser tooling is outside the repository at /home/user/browser-tools. Production output remains ignored in dist/.

Approval requested before implementation. Likely source changes: src/index.css first; limited presentational markup in TitleScreen.tsx, TrolleyHeader.tsx, App.tsx, TrolleyCanvas.tsx or result/summary components only where needed. No business logic, route, data or dependency changes planned.
