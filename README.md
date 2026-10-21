# PHOTON TO PRODUCT — LASERVERSE

**The interactive laser technology platform.** Explore laser physics, understand industrial laser systems, and investigate the engineering behind real-world laser applications.

LASERVERSE turns *The Complete Laser Handbook — From Photon to Industrial Laser Systems, Processes, Machines & End-Product Applications* into a working learning and engineering platform: a six-level academy over all 28 parts, interactive physics, beam, material and process labs, a real-time 3D machine explorer, an application explorer, 39 unit-aware calculators, safety and troubleshooting tools, assessments and a searchable reference library.

A laser knowledge platform by Titan Engineering & Automation Limited (TEAL).

## Quick start

Requirements: Node.js ≥ 20.9.

```bash
npm install
npm run dev            # http://localhost:3000
```

Production build and checks:

```bash
npm run typecheck
npm test               # unit + content tests
npm run build
npm run start
npm run test:e2e       # Playwright, against the production build
```

No environment variables are required for a normal build.

## Deployment (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds a fully static export and publishes it with GitHub Pages on every push to `main`:

1. One-time: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main` (or run the workflow manually from the Actions tab once it is on `main`).
3. The site is served at `https://<owner>.github.io/<repo>/` — for this repository, https://songarajatin225-a11y.github.io/LASERVERSE/

Build the same export locally with `npm run build:pages` (output in `out/`, served under `/LASERVERSE`). The export is controlled by two variables: `STATIC_EXPORT=1` (static output) and `NEXT_PUBLIC_BASE_PATH` (sub-path). Any static host works; Next.js hosts such as Vercel can deploy the repository without either variable. The platform has no backend services, accounts or AI dependency; progress, bookmarks and checklists are stored in the browser.

## What is inside

| Area | Route |
|---|---|
| Landing narrative (3D, chapters Photon → Laser → Beam → Material → Machine → Product) | `/` |
| Home: progress, bookmarks, recent activity | `/home` |
| Learn: 28 parts, six levels, role paths, knowledge checks | `/learn` |
| Physics Lab · Laser Source Explorer · Beam & Optics Lab | `/physics-lab` · `/sources` · `/beam-optics` |
| Material Interaction Lab · Process Simulator | `/materials` · `/processes` |
| 3D Machine Explorer (Class 1 fiber marking workstation) | `/machine` |
| Industrial Applications and case studies | `/applications` |
| Engineering Calculators | `/calculators` |
| Architecture & Automation · Safety & Quality · Troubleshooting | `/architecture` · `/safety` · `/troubleshooting` |
| Assessments | `/assessments` |
| Reference Library: glossary, formulas, figures, technology map, decision tree, status, sources | `/reference` |
| Search (also `/` or ⌘K anywhere) | `/search` |

## Content integrity

- Handbook text and tables are rendered as extracted. Quotations are resolved from the source at build time and the build fails if a quoted sentence or a table header is not found.
- Every item is labelled: **Handbook source**, **Derived calculation**, **Additional explanation**, **Conceptual visualization** or **Unverified**. Citations link to the exact section and its printed page.
- The handbook's 43 equations are images; their LaTeX is a manual transcription shown with the original image and a review badge. Two charts (§9.2, §9.7) are missing from the supplied file and are flagged, not invented.
- Calculators state equation, variables, units, assumptions, limitations and sources. Visualisations that are not predictive models are labelled conceptual.
- Nothing on the site certifies a machine or demonstrates regulatory compliance. Never bypass or defeat laser safety interlocks.

## Documentation

- [`docs/PRODUCT_ARCHITECTURE.md`](docs/PRODUCT_ARCHITECTURE.md) — stack, data flow, areas, persistence, search
- [`docs/HANDBOOK_INGESTION.md`](docs/HANDBOOK_INGESTION.md) — the ingestion pipeline, validation and extraction report
- [`docs/SCIENTIFIC_MODELS.md`](docs/SCIENTIFIC_MODELS.md) — every model, its assumptions and limits
- [`docs/MOTION_AND_BRANDING.md`](docs/MOTION_AND_BRANDING.md) — logo rules, colour, motion language, reduced motion, fallbacks
- [`docs/TESTING.md`](docs/TESTING.md) — test suites and how to run them
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) — what is done, what is not, and known issues

## Re-ingesting the handbook

The source `.docx` is not committed. Place it at `source/The Complete Laser Handbook.docx`, then:

```bash
pip install python-docx pillow
npm run ingest
npm test
```

## Brand

The TEAL logo in `public/brand/teal-logo.webp` is the supplied asset, used unmodified on a light plate (see `docs/MOTION_AND_BRANDING.md`). The LASERVERSE wordmark is an original typographic mark.
