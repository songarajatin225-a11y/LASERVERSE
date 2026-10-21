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

_To be completed with the results of the final run._

## Known issues and review items

- All 43 equations are manual LaTeX transcriptions of images and need expert review; diagram descriptions and the §B.5 decision tree are transcriptions too.
- Review flags from cross-checking the handbook's numbers against its own equations are listed on `/reference/status` (`content/review-flags.ts`); the handbook text was not altered.
- The motionsites.ai creative reference could not be inspected (blocked by the environment's network policy); no material from it was used.
- The extracted handbook content and figures are committed to the repository; if the repository is public, that content is public.
