# Tramvay İkilemleri — redesign findings

## Delivered
A presentational refinement of the existing React application: quieter surfaces, clearer typography, more consistent spacing, a bounded gameplay diagram, larger touch controls, and a responsive route comparison. Existing palette, font families, 27 logo, original trolley artwork, Turkish content, game state and interaction handlers are preserved. No project dependencies, routes, data or business logic changed.

## Before → after measurements

| Measure | Before | After |
|---|---:|---:|
| Desktop first-dilemma decisions, top → bottom | 908 → 1012px | 776 → 883px |
| Tablet first-dilemma decisions, top → bottom | 787 → 891px | 744 → 852px |
| Mobile first decision begins | 714px | 653px |
| Mobile second decision ends | 935px | 869px |
| Header sound/restart target height | 34px | 44px |
| Mobile sound/restart target width | 36px | 44px |
| Title-screen text blocks under 11px | 20 | 3, all within preserved illustration |
| Title-screen tiny tracked-uppercase labels | 18 | 0 flagged |
| Introduction body type | 15px / 1.7 | 16px / 1.6 |
| Horizontal overflow, tested widths | None | None |

Viewports: desktop 1440×900, tablet 768×1024, mobile 390×844. Long content remains scrollable; the second mobile choice still extends 25px below the first viewport on the first dilemma. Readability was not sacrificed to force everything above the fold.

## Visual findings
- The question, diagram and choice controls now read as distinct levels rather than competing framed blocks.
- Background gradients, full-page grain and heavy panel/button shadows no longer compete with the unchanged trolley illustration.
- Secondary labels use readable sizes and quieter tracking. Brand font families remain Archivo, IBM Plex Mono and Instrument Serif.
- The primary action uses the existing darker red token for improved small-text contrast. No new brand colors were introduced.
- Turkish diacritics in the poster title are no longer clipped by its animated line masks.
- Mobile brand wrapping accommodates 44px header controls. The two route summaries share an aligned two-column layout; decisions remain large stacked targets.
- Summary prose, statistics labels and copy/restart actions follow the same readable scale.

## Screenshots

### Introduction
[Desktop before](before/desktop-fold.jpg) · [Desktop after](after/desktop-fold.jpg)

[Tablet before](before/tablet-fold.jpg) · [Tablet after](after/tablet-fold.jpg)

[Mobile before](before/mobile-fold.jpg) · [Mobile after](after/mobile-fold.jpg)

### Gameplay
[Desktop before](before/desktop-gameplay.jpg) · [Desktop after](after/desktop-gameplay.jpg)

[Tablet before](before/tablet-gameplay.jpg) · [Tablet after](after/tablet-gameplay.jpg)

[Mobile before](before/mobile-gameplay.jpg) · [Mobile after](after/mobile-gameplay.jpg)

### Result and summary
[Result before](before/desktop-result.jpg) · [Result after](after/desktop-result.jpg)

[Desktop summary](after/desktop-summary.jpg) · [Tablet summary](after/tablet-summary.jpg) · [Mobile summary](after/mobile-summary.jpg)

## Verification
- Existing `npm run lint` (TypeScript): PASS.
- Existing `npm run build`: PASS, including final CSS refinement.
- `git diff --check`: PASS.
- No existing unit/integration test command is configured. Browser checks supplement, not replace, a nonexistent suite.
- 44 browser assertions passed against the production preview: full 27-dilemma traversal, alternating decisions, result reveals, 27 ledger entries, ledger expand/collapse, clipboard content and confirmation, title start via Enter, decision shortcuts 1/2, Space lever toggle, M sound toggle and persisted preference, route staging, physical lever click, disabled decision controls during results, both restart paths, reset progress, reduced-motion availability, summary overflow at all three widths and runtime exceptions.
- No forms or anchors exist on the inspected title/gameplay screens; navigation is state-based and was exercised through start → all 27 dilemmas → summary → restart.
- Final title/gameplay captures and interaction measurements were repeated at all three widths after the last CSS refinement. The full-run verification preceded only the final mobile route-strip CSS alignment change; no handlers or logic were changed at either stage.
- The browser was headless/muted: sound toggle state and persistence were checked, not subjective audio playback quality.
- Browser tooling was installed outside the repository; manifests and lockfile are unchanged.

## Skill-inspector results and limitations
The automated title-screen inspection improved from 9 grouped FAIL findings / 2 WARN findings to 4 FAIL findings / 2 WARN findings. It is **not a clean inspector pass**.

Remaining findings:
1. Three-line introductory title at each width. Its deliberate three-word poster lockup is retained; it is not a dashboard heading. No title content was cut to satisfy the generic two-line rule.
2. Three small labels in the preserved SVG artwork. Functional route and decision information is provided separately at readable sizes.
3. Existing red wordmark has a contrast warning (3.7:1). The explicit preserve-logo requirement takes precedence; the logo is unchanged.
4. App-title-size warning refers to the introductory poster, not the working game screen.

The brand-palette rejection was explicitly allowed in the after inspector run because the user required the existing palette. The before covered-text report disappeared after removing decorative overlays and reveal clipping. Primary-action contrast warning was resolved with the existing darker red.

Subjective final critique: design 7 · usability 7.5 · creativity 7 · content 8. The strict skill rubric caps the score at 6.0 while automated FAIL findings remain; this report does not claim full skill compliance. No stock photography or new assets were added to an illustrated interactive game merely to satisfy marketing-page criteria.

## Changed application files
- `src/index.css`: a scoped refinement section for type, spacing, surfaces, desktop diagram height, touch targets, mobile header/route layout, and result/summary readability. Existing CSS and Tailwind approach preserved.
- `src/components/TitleScreen.tsx`: removed inline overflow clipping from three animated title-line wrappers to preserve Turkish diacritics.

## Audit artifacts
- `before/AUDIT.md`: approved plan and baseline.
- `before/` and `after/`: screenshots, inspector JSON, and measured interaction reports.
- `after/verification.json`: full browser assertion results.

Existing installed skill files and skill lockfile predate the redesign. Production build output remains ignored in `dist/`.
