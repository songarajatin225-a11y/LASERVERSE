# Implementation status

Status of this release, written to be read literally: "implemented" means the feature exists and was exercised as described in **Verification**; anything not listed as verified was not verified.

## Implemented

| Area | Route | Notes |
|---|---|---|
| Landing narrative | `/` | Eyebrow, headline "PHOTON TO PRODUCT", statement, both CTAs, real-time 3D stage driven by scroll (chapters A Photon → F Product), skip intro, chapter rail, TEAL attribution, platform entry grid, levels and role paths, handbook stats. 2D fallback without WebGL. |
| Home | `/home` | Progress by level, continue, recent assessments, bookmarks, recent activity, export/reset of local data. |
| Learn | `/learn`, `/learn/[part]/[section]` | All 28 parts plus front and back matter rendered from the ingested handbook; levels L1–L6 and role paths from the handbook's own tables; knowledge checks; completion; bookmarks; related calculators/tools; embedded labs. |
| Physics Lab | `/physics-lab` | Photon, waves & polarisation, energy levels, cavity, pulses (rectangular approximation stated). |
| Laser Source Explorer | `/sources` | 53 source entries from Part III, wavelength map, families at a glance; filters; `?family=`, `?view=`, `?source=`. |
| Beam & Optics Lab | `/beam-optics` | Focusing design and caustic, optical components, optical materials. |
| Material Interaction Lab | `/materials` | §9.3 absorption bands (encoded from wording, tested), §15.4 Cu/Al absorptance, thermal diffusion vs time with §9.4 table points, melting/boiling, dimensionless ablation depth and efficiency, labelled reconstruction of the missing §9.7 regime map; `?tab=`, `?nm=`. |
| Process Simulator | `/processes`, `/processes/[id]` | Marking (decision matrix, overlap simulator), welding (mode, heat input), cutting (mechanisms), cleaning (window, overlap), drilling (methods), UV & CO₂ (photon energy vs bond energies, spot size); handbook tables; reference machines. |
| 3D Machine Explorer | `/machine` | Generic Class 1 fiber marking workstation (§26.1): orbit/zoom/pan, selection with info panels, exploded view, five layers, optical-path and signal highlighting, camera presets and reset, conceptual interlock logic, marking job, 2D schematic, WebGL-failure fallback; `?select=`, `?layer=`, `?view=2d`. |
| Industrial Applications | `/applications`, `/applications/case-N` | 33 chains Industry → Product → Component → Material → (Requirement from a named case) → Process → Source → Machine → (machine-type risks) → Quality; 8 case studies; 15 exploded product maps; `?industry=`, `?chain=`. |
| Engineering Calculators | `/calculators`, `/calculators/[id]` | 39 calculators with inputs, units, validation, examples, result, equation, variables, assumptions, limitations, interpretation, sources, reset and copy. |
| Architecture & Automation | `/architecture` | Control stack, optical chain, mechanical/electrical/software, conceptual vision-guided loop, integration, handshake step-through, recipes, interlock demo, conceptual configurator (§26.1 + §23.1). |
| Safety & Quality | `/safety` | Laser classes, hazards, standards (listing ≠ compliance), safety architecture, OD/NOHD calculators, metrology, feasibility checklist (§23.5), DOE (§23.6), B.7/B.8 checklists. |
| Assessments | `/assessments`, `/assessments/[quiz]` | Seven quizzes (L1–L6, calculations) with hints, history and review; explicitly not a certification. |
| Troubleshooting | `/troubleshooting` | §27.2 symptoms and §10.4 weld defects as Problem → Causes → Checks → Actions → Verification (verification is labelled platform guidance; the handbook has no such column). |
| Reference Library | `/reference/*` | Glossary and abbreviations, formula library (transcribed equations with originals), figure gallery, interactive master technology map, laser selection decision tree (from a transcription, labelled for review), content & validation status, sources. |
| Search | `/search`, palette (`/`, ⌘K) | Local lexical index (~650 documents) behind a provider interface. |
| Ingestion | `scripts/ingest` | Python pipeline, schema validation, extraction report. |

## Not implemented

- **Optional AI assistant** — not built. No provider is configured, and the core platform does not depend on one. No simulated or placeholder AI is shipped.
- **Semantic search provider** — the `SearchProvider` interface exists; only the local lexical provider is implemented.
- **Accounts and sync** — progress, bookmarks and checklists are stored only in the browser (exportable as JSON).
- **Validated content** — no item carries the "validated" status; nothing has been reviewed by a subject-matter expert.
- **Missing handbook charts** — §9.2 (metal absorptance) and §9.7 (process regime map) are not in the supplied file and are not reconstructed as charts (§9.7 has a labelled text-threshold reconstruction).
- **Configurator** — conceptual only; it shows the handbook's reference architecture and does not design, size or quote a machine.

## Verification

Results of the last full run (2026-10-21), on the committed code:

| Check | Result |
|---|---|
| `npm run typecheck` (strict TypeScript) | passes, 0 errors |
| `npm test` (Vitest) | 331 tests in 14 files pass |
| `npm run build` (Next.js production build) | passes; 265 statically generated pages. The build fails if any quotation, table header or schema check against the handbook fails. |
| `npm run test:e2e` (Playwright, Chromium with SwiftShader WebGL) | 60 tests pass (43 desktop at 1440 × 900, 17 mobile on a Pixel 7 profile) |

The end-to-end suite covers: landing content and CTAs, skip intro, every main route rendering an `<h1>` with HTTP 200 and no uncaught errors, breadcrumbs, the static search index, lesson completion and bookmark persistence across reloads, quiz feedback, calculator compute/validate/reset/unit change, palette and `/search`, palette focus trap and focus return, source-drawer Escape, the 3D machine explorer (selection, explode, layers, camera reset and presets, interlock logic), the keyboard-operable 2D schematic, the WebGL-unavailable fallback, deep links, no horizontal overflow on 14 pages at phone width, the mobile navigation drawer, and the landing page under reduced motion.

**Manual visual review.** Screenshots at 1440 × 900 and 390 × 844 were reviewed for the landing chapters, Home, the labs, process workspaces, applications, the machine explorer (overview, scan head, exploded, 2D) and the architecture, safety, troubleshooting, reference and search pages.

**Defect found and fixed in the final run.** Navigating from the landing page could throw `removeChild … not a child of this node` (5 of 8 repeated runs). The landing scene's in-canvas HTML labels were replaced with a projected DOM overlay; 12 of 12 repeated runs then passed.

**Not measured.** No runtime performance measurements (frame rate, Lighthouse, Core Web Vitals) were taken. The build output reports 103 kB of first-load JavaScript shared by all routes; that is a bundle size, not a performance result. No cross-browser testing beyond Chromium. No automated accessibility (axe) audit; accessibility was checked by code review, server-rendered markup tests and keyboard e2e tests. No visual-regression baselines are stored.

## Known issues and review items

- No ESLint configuration is included; code quality is enforced by strict TypeScript and the test suites.
- The technology map's branches are collapsed in server-rendered HTML; without JavaScript only the top level is visible (the verbatim §28.0 text tree is still on the page).
- The search index is about 476 kB uncompressed (about 147 kB gzip) and is downloaded on first search.

- All 43 equations are manual LaTeX transcriptions of images and need expert review; diagram descriptions and the §B.5 decision tree are transcriptions too.
- Review flags from cross-checking the handbook's numbers against its own equations are listed on `/reference/status` (`content/review-flags.ts`); the handbook text was not altered.
- The motionsites.ai creative reference could not be inspected (blocked by the environment's network policy); no material from it was used.
- The extracted handbook content and figures are committed to the repository; if the repository is public, that content is public.
