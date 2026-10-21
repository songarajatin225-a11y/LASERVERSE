# Product architecture

LASERVERSE — *Photon to Product* — is an interactive laser technology and engineering platform built from *The Complete Laser Handbook*. It is a statically generated Next.js application: every page is pre-rendered at build time from the ingested handbook, and all interaction runs in the browser. No server-side state, accounts or external APIs are required.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components), React 19, TypeScript (strict, `noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS v4 with design tokens in `app/globals.css` (`@theme`), container queries for lab layouts |
| Motion | Framer Motion (DOM/SVG), React Three Fiber + drei (3D), Canvas 2D (labs) |
| Maths display | KaTeX |
| Content validation | Zod |
| Search | MiniSearch behind a provider interface |
| Tests | Vitest (unit/content), Playwright (end-to-end) |

## Directory map

```
app/                      routes (App Router)
  page.tsx                landing page (3D narrative, chapters A–F)
  (app)/                  the platform shell: sidebar, top bar, breadcrumbs, footer
  search-index.json/      static route that emits the search index
components/               shell, UI primitives, handbook block renderers, motion, viz helpers, brand
features/                 one folder per product area (client components + pure helpers)
lib/content/              server-only handbook adapters (one per area) + client-safe outline
lib/physics/              pure, tested calculation layer (SI internally)
lib/persistence/          local progress / bookmarks / checklists / quiz history
lib/search/               search engine and index builder
content/handbook/         ingested handbook JSON + extraction report
content/                  lesson enhancements, assessments, review flags
scripts/ingest/           Python ingestion pipeline
tests/unit, tests/e2e     Vitest and Playwright suites
```

## Data flow and the server/client boundary

1. `content/handbook/handbook.json` is imported only by `lib/content/handbook.ts`, which starts with `import "server-only"` and validates the file with Zod.
2. Each area has an adapter (`lib/content/materials.ts`, `processes.ts`, `applications.ts`, `sources.ts`, …) that builds feature data from handbook **tables** (`getTable` with header verification) and **quotations** (`quote`, which throws if wording is not found).
3. Server pages call the adapters and pass plain props to client components in `features/*`. The full handbook never reaches the client bundle; only `content/handbook/outline.json` (titles, slugs, printed page numbers) is client-safe, used by `SourceRef` links.
4. Client components compute derived values with `lib/physics/*` and render conceptual visuals.

Every displayed item carries a source-integrity label (`ClassTag`): Handbook source, Derived calculation, Additional explanation, Conceptual visualization, Unverified. `SourceRef` links point to the exact handbook section and show its printed page.

## Product areas (15)

| Area | Route | Built from |
|---|---|---|
| Home | `/home` | local progress, bookmarks, recent activity, quiz history |
| Learn | `/learn`, `/learn/[part]/[section]` | all 28 parts + front/back matter; six levels (L1–L6) and role paths from the handbook's roadmap and "How to use this handbook" tables |
| Physics Lab | `/physics-lab` | Parts I–II: photon, waves & polarisation, energy levels, cavity, pulses |
| Laser Source Explorer | `/sources` | Part III source tables (53 entries) and the §3.8 wavelength map |
| Beam & Optics Lab | `/beam-optics` | Parts IV–VI: Gaussian focusing design, optical components, optical materials |
| Material Interaction Lab | `/materials` | Part IX (+§15.4, §27.1): absorption bands, thermal diffusion, ablation, regime explorer |
| Process Simulator | `/processes`, `/processes/[id]` | Part X: marking, welding, cutting, cleaning, drilling/micromachining, UV & CO₂ |
| 3D Machine Explorer | `/machine` | §26.1 machine 1 with Parts V–VII, XI–XII |
| Industrial Applications | `/applications`, `/applications/case-N` | §20.0 matrix, §19.2 product maps, §26.2 cases, §23.4, §10.1 |
| Engineering Calculators | `/calculators`, `/calculators/[id]` | 39 calculators across physics, pulses, beams, interaction, process, safety, economics |
| Architecture & Automation | `/architecture` | Parts XI–XII, §26.1, §23.1 |
| Safety & Quality | `/safety` | Part XXIV, §11.6, §23.5–23.6, §B.7–B.8 |
| Assessments | `/assessments`, `/assessments/[quiz]` | per-level quizzes and numerical exercises |
| Troubleshooting | `/troubleshooting` | §27.2, §10.4 weld defects |
| Reference Library | `/reference/*` | glossary & abbreviations, formulas, figures, master map, decision tree, status, sources |

Global features: command palette (`/` or ⌘K) and `/search`, breadcrumbs, bookmarks, completion tracking, related links, recent activity, and a motion preference.

## Learning model

- **Levels** L1–L6 come from the handbook's learning-roadmap table (stage, parts, the question each level answers, proof-of-competence exercise).
- **Role paths** come from the "How to use this handbook" table.
- A lesson is **complete** when every knowledge check on it is answered correctly, or when the learner marks it complete. Assessments are practice aids with hints, history and review; they are not a certification.

## Persistence

`lib/persistence/store.ts` keeps lessons, checks, bookmarks, recent items, quiz attempts, checklists and settings in `localStorage` under one versioned, Zod-validated key. It uses `useSyncExternalStore` with cached selectors, syncs across tabs, survives storage errors (falls back to memory) and can be exported as JSON or reset from Home. Nothing leaves the device.

## Search

`lib/search/buildIndex.ts` (server) builds documents for lessons, parts, glossary terms, abbreviations, formulas, figures, tools, calculators, sources, applications, case studies, troubleshooting entries, machine components and quizzes. `app/search-index.json/route.ts` emits it statically; the client loads it lazily on first search. `LocalSearch` (MiniSearch, prefix + light fuzzy matching, field boosts) implements a `SearchProvider` interface so a semantic provider can be added later without UI changes.

## Optional AI assistant

Not implemented. The core platform does not depend on any AI API. If added, it must run behind a server route with the provider key held in a server-side environment variable, be clearly labelled, cite handbook sections, and degrade to "not configured" when no provider is set. No placeholder or simulated AI is shipped.

## Accessibility

Semantic landmarks and headings; skip link; keyboard-operable tabs, switches, segmented controls, command palette, lists, the 2D machine schematic and the decision tree; visible focus; `aria-live` for changing results; text labels next to every wavelength colour; reduced-motion preference applied to CSS, Framer Motion, canvas and WebGL; responsive layouts down to 375 px with dense tables and diagrams scrolling inside their own containers.
