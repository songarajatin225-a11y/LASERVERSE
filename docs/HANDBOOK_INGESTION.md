# Handbook ingestion

LASERVERSE is built from one source document, *The Complete Laser Handbook — From Photon to Industrial Laser Systems, Processes, Machines & End-Product Applications* (`.docx`). This document describes how that file becomes the structured content the app renders, and how integrity is preserved.

## Pipeline

```
source/The Complete Laser Handbook.docx        (not committed — see "Source file" below)
        │
        ▼  python3 -I scripts/ingest/ingest_handbook.py "source/The Complete Laser Handbook.docx"
        │      + scripts/ingest/figure_annotations.json   (manual figure/equation annotations)
        ▼
content/handbook/handbook.json            full structured handbook (server-only)
content/handbook/outline.json             parts/sections/pages only (safe for the client bundle)
content/handbook/extraction-report.json   counts, per-part stats, flags
content/handbook/EXTRACTION_REPORT.md     human-readable report
public/handbook/figures/image1…72.png     figures copied from the .docx media
```

Run it with `npm run ingest` (wraps the command above). It requires `python-docx` and, optionally, Pillow (figure dimensions). The script never modifies the source and is safe to re-run; outputs are overwritten.

### What the parser does

The WordprocessingML body is read in document order:

| Source structure | Becomes |
|---|---|
| `Title`, `Subtitle`, first plain paragraphs | document metadata (title, author, date as printed) |
| static "Contents" block | the printed page number of every heading (`page` in the outline) |
| `Heading1` | a part: Front Matter, Part I … XXVIII, Back Matter |
| `Heading2` | a section (`1.1`, `9.4`, `B.3` …) |
| body paragraphs | `paragraph` blocks with inline spans (bold/italic/sub/superscript, links, § cross-references) |
| bold run-in lines / minor headings | `subheading` |
| numbered/bulleted paragraphs | `list` |
| `☐` items | `checklist` (rendered as persisted, interactive checklists) |
| tables | `table` (header row + rows; cells keep inline formatting) |
| inline images | `figure` (linked to `figure_annotations.json`) |
| box-drawing text (§28.0 map) | `preformatted` |
| chart placeholders pointing to `http://node/…` | `chart-missing` (flagged as an error) |

Four parts (XVI Automotive, XVII Aerospace, XX Application × Industry Matrix, XXVIII Master Map) have no numbered sections in the source; the parser creates one synthetic overview section each (`16.0`, `17.0`, `20.0`, `28.0`) and flags it `SYNTHETIC_SECTION`.

### Validation

`handbook.json` is parsed with a Zod schema (`lib/content/schema.ts`) when the server starts; a malformed file fails the build. `tests/unit/content.test.ts` checks the counts, the outline, cross-references and table shapes.

Feature modules never scrape free text for data. They read handbook **tables** through `getTable(sectionId, n, expectedHeaderPrefixes)` (throws if the table is missing or its header changed) and **quotations** through `quote(sectionId, startsWith, sentences)` (throws if the wording is not in the section). Every adapter in `lib/content/*.ts` has a unit test, so re-ingesting a revised handbook either keeps the app consistent or fails loudly.

## Results for the supplied file

From `content/handbook/extraction-report.json` (source SHA-256 `ea97e197…7c4`):

| Item | Count |
|---|---|
| Numbered parts | 28 (plus front and back matter) |
| Sections | 147 (4 synthetic overviews) |
| Tables / rows | 177 / 1,623 |
| Figures | 72 (43 equation images, 29 diagrams) |
| Contents entries matched to headings | 173 |
| Checklist items | 44 |

### Flags

| Code | Count | Meaning |
|---|---|---|
| `CHART_MISSING` (error) | 2 | §9.2 metal absorptance chart and §9.7 process regime map are placeholders (`http://node/…`) with no data in the file. They are shown as review callouts; nothing is reconstructed for §9.2. The §9.7 view in the Material lab is explicitly labelled a reconstruction from thresholds stated in the text. |
| `EQUATION_TRANSCRIBED` (info) | 43 | Every equation in the handbook is an image. Each was transcribed to LaTeX by reading the image (`figure_annotations.json`) and is displayed with a "Transcribed equation · review" badge and the original image. Where the handbook has a worked example, the transcribed formula is checked numerically in `tests/unit/physics.test.ts`; the transcriptions still need a reviewer's sign-off. |
| `SYNTHETIC_SECTION` (info) | 4 | See above. |

Diagram figures carry a short description (`alt`) written from the image; the §B.5 decision tree in the Reference library is built from that transcription and is labelled "needs review". A test checks that every encoded branch appears in the transcription.

Content-level inconsistencies found while cross-checking the handbook's numbers against its own equations are not corrected in the content. They are listed in `content/review-flags.ts` and shown next to the affected material and on `/reference/status`.

## Content statuses

| Status | Used for |
|---|---|
| `extracted` | Content parsed directly from the source (all text and tables). |
| `review-required` | Transcribed equations and diagram descriptions; missing charts. |
| `validated` | Reserved. No content in this release carries it — nothing has been reviewed by a subject-matter expert. |
| `not-yet-implemented` | Planned items (see `docs/IMPLEMENTATION_STATUS.md`). |

## Source file and repository visibility

The original `.docx` is listed in `.gitignore` (`source/*.docx`) and is **not** committed. The *extracted* content (`content/handbook/*.json`) and the figure images (`public/handbook/figures/`) **are** committed because the application needs them at build time. If the repository is public, that extracted content is public too — confirm that this is intended before publishing.

To re-run ingestion, place the file at `source/The Complete Laser Handbook.docx` and run `npm run ingest`, then `npm test`.
