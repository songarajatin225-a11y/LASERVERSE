# Testing

## Commands

| Command | What it runs |
|---|---|
| `npm run typecheck` | `tsc --noEmit` over the whole project (strict mode) |
| `npm test` | Vitest unit and content tests (`tests/unit/**/*.test.ts`) |
| `npm run validate:content` | only the handbook content tests |
| `npm run build` | production build; fails if any handbook quotation, table header or schema check fails |
| `npm run test:e2e` | Playwright end-to-end tests against the production build (`npm run build` first) |

Playwright starts `next start` on port 3200 (override with `E2E_PORT`) unless a server is already running there. Chromium runs with SwiftShader (`--use-angle=swiftshader`) so WebGL scenes render headlessly. In sandboxed environments with a pre-installed browser, set `PLAYWRIGHT_BROWSERS_PATH` accordingly; do not run `playwright install` if a matching browser is already present.

## Unit and content tests (`tests/unit`)

| File | Covers |
|---|---|
| `physics.test.ts` | photon, laser, pulse, beam, optics, interaction, safety functions against the handbook's worked examples; validation errors |
| `economics.test.ts` | CRF, cost per good part (handbook example), ROI, payback, NPV, IRR (including undefined IRR) |
| `units.test.ts` | SI conversion round-trips, formatting |
| `calculators.test.ts` | every calculator definition: inputs, outputs, sources, examples, finite results |
| `questions.test.ts` | assessment bank integrity, answer keys, numeric tolerances, section links |
| `content.test.ts` | ingested handbook: counts, outline, tables, figures, cross-references, curriculum and source catalogue adapters |
| `materials.test.ts` | §9.3 absorption encoding vs the exact handbook wording, classification examples, §9.4 diffusion table reproduced to its digits, §15.4 values, quotations, specific removal rate optimum |
| `processes.test.ts` | process workspaces: quotations, tables, reference machines, calculators, bond energies |
| `applications.test.ts` | §20.0 matrix, process-family mapping, §19.2 maps, §26.2 cases, industry sections |
| `architecture.test.ts`, `safety.test.ts`, `troubleshooting.test.ts`, `reference.test.ts`, `search.test.ts` | adapters, parsers, anchor uniqueness, decision-tree encoding vs transcription, search index coverage and link validity |

The content tests are the integrity backstop: if the handbook is re-ingested and a table header, a quoted sentence or an encoded statement changes, a test or the build fails instead of the UI silently drifting.

## End-to-end tests (`tests/e2e`)

| Spec | Covers |
|---|---|
| `navigation.spec.ts` | landing headline, statement, CTAs and attribution; skip intro; every main route renders an `<h1>` with HTTP 200 and no runtime errors; breadcrumbs; static search index |
| `learning.spec.ts` | lesson completion and bookmarks persist across reloads and appear on Home; quiz feedback |
| `calculators.spec.ts` | compute, validation message, reset, unit change preserving the physical value |
| `search.spec.ts` | command palette search and navigation; `/search?q=` results |
| `machine.spec.ts` | 3D canvas, component selection and info panel, exploded view, layer toggle, camera reset/preset, conceptual interlock logic; keyboard-operable 2D schematic; WebGL-unavailable fallback (WebGL denied via an init script); `?select=` deep link |
| `mobile.spec.ts` | no horizontal overflow on key pages at phone width; navigation drawer; reduced-motion landing |

## Visual review

Screenshots at 1440 × 900 and 390 × 844 were reviewed manually during development for the landing chapters, Home, labs, process workspaces, the machine explorer (overview, scan head, exploded, 2D) and the reference pages. No automated visual-regression baselines are stored.

## Not covered

- No performance budgets or measurements (FPS, Lighthouse, bundle size) are enforced or recorded.
- No cross-browser runs beyond Chromium.
- No automated accessibility audit (axe) is wired in; accessibility was checked by inspection and keyboard testing of the main controls.

See `docs/IMPLEMENTATION_STATUS.md` for the results of the last run.
