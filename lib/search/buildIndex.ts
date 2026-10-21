import "server-only";
import { handbook, allSections, getParts, getSection, getSectionWithPart, sectionHref, partHref, getFigure, getTable, tableRecords } from "@/lib/content/handbook";
import { blockText, type Block } from "@/lib/content/schema";
import { labelFor, pageFor } from "@/lib/content/outline";
import { NAV } from "@/lib/nav";
import { PROCESS_DEFS } from "@/lib/content/processes";
import { sourceCatalogue, FAMILY_LABEL } from "@/lib/content/sources";
import { applicationMatrix, caseStudies } from "@/lib/content/applications";
import { symptomCards, weldDefectCards } from "@/lib/content/troubleshooting";
import { CALCULATORS } from "@/features/calculators/definitions";
import { CATEGORY_LABEL, isChoice } from "@/features/calculators/types";
import { COMPONENTS, LAYERS } from "@/features/machine-explorer/machineData";
import { QUIZZES } from "@/content/assessments/questions";
import { glossaryAnchors, abbreviationAnchors } from "@/features/search/anchors";
import type { SearchDoc } from "./engine";

/** Bump when the document shape or id scheme changes. */
export const SEARCH_INDEX_VERSION = 1;

/** Maximum body text stored per lesson (excerpts and lexical matching only). */
const LESSON_TEXT_CAP = 3000;

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

function cap(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const at = cut.lastIndexOf(" ");
  return `${cut.slice(0, at > n * 0.8 ? at : n)}…`;
}

/** "§9.2 · p.59" (or "Part XVI · p.97", "Executive overview · p.5"). */
function cite(sectionId: string): string {
  const page = pageFor(sectionId);
  return `${labelFor(sectionId)}${page ? ` · p.${page}` : ""}`;
}

function citeMany(sectionIds: string[], max = 3): string {
  const ids = [...new Set(sectionIds)];
  const shown = ids.slice(0, max).map(cite).join("; ");
  return ids.length > max ? `${shown}; +${ids.length - max} more` : shown;
}

/** Handbook titles of sections, used as extra search terms for tools that cover them. */
function sectionTitles(sectionIds: string[]): string {
  return sectionIds
    .map((id) => {
      const s = getSection(id);
      if (!s) throw new Error(`search index: unknown section ${id}`);
      return s.synthetic ? (getSectionWithPart(id)?.part.title ?? s.title) : s.title;
    })
    .join(" · ");
}

function partLabel(sectionId: string): string {
  const p = getSectionWithPart(sectionId)?.part;
  return p ? p.fullTitle : "Handbook";
}

/** Handbook text of the blocks: paragraphs, subheadings, lists, checklists, table cells, captions. */
function blocksText(blocks: Block[]): string {
  return squash(
    blocks
      .map(blockText)
      .filter(Boolean)
      .join(" "),
  );
}

/**
 * Titles of the figures in the blocks. They were written for LASERVERSE from the images, not
 * taken from the handbook, so they are search terms only and never part of a handbook excerpt.
 */
function figureTitles(blocks: Block[]): string {
  return blocks
    .flatMap((b) => (b.type === "figure" ? [getFigure(b.figureId)?.title ?? ""] : []))
    .filter(Boolean)
    .join(" · ");
}

/**
 * LaTeX reduced to its searchable symbols: formatting commands (\frac, \mathrm, \quad, …)
 * would otherwise make every equation match words such as "right", "text" or "quad".
 */
function latexTerms(latex: string): string {
  return squash(
    latex
      .replace(/\\(?:d?frac|tfrac|mathrm|mathbf|mathit|mathcal|textrm|text|operatorname|displaystyle|left|right|[bB]igg?[lr]?|q?quad|c?dots?|times|approx|sim|propto|leq?|geq?|sqrt|[Rr]ightarrow|circ|pm|mp)(?![A-Za-z])/g, " ")
      .replace(/\\[,;:!]/g, " ")
      .replace(/[{}^_&\\]/g, " "),
  );
}

/* ================================================================== handbook */
function lessonDocs(): SearchDoc[] {
  return allSections().map((s) => {
    const part = getSectionWithPart(s.id)!.part;
    const heading = s.synthetic ? part.title : s.title;
    return {
      id: `lesson:${s.id}`,
      kind: "lesson",
      title: s.number ? `${s.number} ${heading}` : heading,
      location: part.fullTitle,
      href: sectionHref(s.id),
      // sections whose only content is a figure still need an excerpt: fall back to the heading
      text: cap(blocksText(s.blocks), LESSON_TEXT_CAP) || heading,
      keywords: [s.number ? `§${s.number}` : "", part.roman ? `Part ${part.roman}` : "", figureTitles(s.blocks)].filter(Boolean).join(" "),
      source: cite(s.id),
    };
  });
}

function partDocs(): SearchDoc[] {
  return getParts().map((p) => ({
    id: `part:${p.id}`,
    kind: "part",
    title: p.fullTitle,
    location: "Handbook",
    href: partHref(p.id),
    text: cap(squash(`${blocksText(p.lead)} ${p.sections.map((s) => (s.number ? `${s.number} ${s.title}` : s.title)).join(" · ")}`), LESSON_TEXT_CAP),
    keywords: [p.roman ? `Part ${p.roman}` : "", figureTitles(p.lead)].filter(Boolean).join(" "),
    source: `${p.roman ? `Part ${p.roman}` : p.title}${p.page ? ` · p.${p.page}` : ""}`,
  }));
}

function glossaryDocs(): SearchDoc[] {
  const rows = tableRecords(getTable("B.1", 1, ["Term", "Definition"]));
  const anchors = glossaryAnchors(rows.map((r) => r["Term"] ?? ""));
  return rows.map((r, i) => ({
    id: `glossary:${anchors[i]!}`,
    kind: "glossary",
    title: r["Term"] ?? "",
    location: "Glossary",
    href: `/reference/glossary#${anchors[i]!}`,
    text: r["Definition"] ?? "",
    source: cite("B.1"),
  }));
}

function abbreviationDocs(): SearchDoc[] {
  const rows = tableRecords(getTable("B.2", 1, ["Abbreviation", "Meaning"]));
  const anchors = abbreviationAnchors(rows.map((r) => r["Abbreviation"] ?? ""));
  return rows.map((r, i) => ({
    id: `abbreviation:${anchors[i]!}`,
    kind: "abbreviation",
    title: r["Abbreviation"] ?? "",
    location: "Abbreviation dictionary",
    href: `/reference/glossary#${anchors[i]!}`,
    text: r["Meaning"] ?? "",
    source: cite("B.2"),
  }));
}

function figureDocs(): SearchDoc[] {
  return handbook.figures
    .filter((f) => f.kind === "equation" || f.kind === "diagram")
    .map((f) => {
      const where = labelFor(f.sectionId, true);
      const title = f.title ?? (f.kind === "equation" ? `Equation in ${where}` : `Figure in ${where}`);
      if (f.kind === "equation") {
        return {
          id: `formula:${f.id}`,
          kind: "formula" as const,
          title,
          location: partLabel(f.sectionId),
          href: `/reference/formulas#${f.id}`,
          text: squash(`${title}. ${f.alt ?? ""} ${where}`),
          keywords: f.latex ? latexTerms(f.latex) : "",
          source: cite(f.sectionId),
        };
      }
      return {
        id: `figure:${f.id}`,
        kind: "figure" as const,
        title,
        location: partLabel(f.sectionId),
        href: `/reference/figures#${f.id}`,
        text: squash(`${f.alt ?? title} ${where}`),
        source: cite(f.sectionId),
      };
    });
}

/* ================================================================== tools */
interface ToolSpec {
  id: string;
  title: string;
  href: string;
  location: string;
  /** platform description (not handbook text) */
  text: string;
  sections: string[];
  keywords?: string;
}

const PHYSICS_TABS: ToolSpec[] = [
  { id: "photon", title: "Photon explorer", text: "Photon energy, frequency and wavelength across the spectrum, with handbook laser lines.", sections: ["1.5", "1.6", "1.10"] },
  { id: "wave", title: "Electromagnetic wave and polarisation", text: "Phase and linear, circular and elliptical polarisation states of an electromagnetic wave.", sections: ["1.7", "1.8"] },
  { id: "levels", title: "Atomic energy levels and population inversion", text: "Absorption, spontaneous and stimulated emission in two-, three-, four- and quasi-three-level schemes.", sections: ["1.3", "2.1", "2.2"] },
  { id: "cavity", title: "Laser cavity and threshold", text: "Gain, threshold, output couplers and the generic laser architecture.", sections: ["2.3", "2.4", "2.7"] },
  { id: "pulse", title: "Pulse explorer", text: "Pulse energy, peak power and duty cycle for ns MOPA, ps, fs and QCW pulse formats.", sections: ["2.8", "2.9"] },
].map((t) => ({ ...t, id: `physics-lab:${t.id}`, href: `/physics-lab?tab=${t.id}`, location: "Physics Lab" }));

const BEAM_TABS: ToolSpec[] = [
  { id: "beam", title: "Gaussian beam focusing and depth of focus", text: "Focused spot, beam waist, Rayleigh range, divergence and depth of focus for a collimated beam and lens or fiber-core imaging.", sections: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"] },
  { id: "components", title: "Beam train of a galvo marking head", text: "Source, isolator, beam expander, galvo mirrors, F-theta lens and protective window, component by component.", sections: ["5.1", "11.1"] },
  { id: "materials", title: "Optical materials and wavelength compatibility", text: "Which optical materials suit which laser wavelengths.", sections: ["5.5"] },
].map((t) => ({ ...t, id: `beam-optics:${t.id}`, href: `/beam-optics?tab=${t.id}`, location: "Beam & Optics Lab" }));

const MATERIALS_TABS: ToolSpec[] = [
  { id: "absorption", title: "Which materials absorb this wavelength?", text: "Absorption of metals and non-metals across wavelength, from the handbook absorption tables.", sections: ["1.11", "9.2", "9.3"] },
  { id: "thermal", title: "Thermal diffusion length vs interaction time", text: "Heat diffusion, melting and boiling points and the heat-affected zone versus interaction time.", sections: ["9.4"] },
  { id: "ablation", title: "Ablation depth per pulse", text: "Depth per pulse and energy efficiency above the ablation threshold; photothermal, photochemical and non-thermal regimes.", sections: ["9.5", "9.6"] },
  { id: "regimes", title: "Process regime explorer", text: "Intensity and interaction-time regimes of laser processes, with a welding mode check.", sections: ["9.7"] },
].map((t) => ({ ...t, id: `materials:${t.id}`, href: `/materials?tab=${t.id}`, location: "Material Interaction" }));

const ARCHITECTURE_ANCHORS: ToolSpec[] = [
  { id: "control-stack", title: "Control stack", text: "Control layers from MES and PLC down to the scan card and laser gating, with their cycle times.", sections: ["11.2"] },
  { id: "optical-chain", title: "Optical chain", text: "The subsystems the beam passes through from source to workpiece.", sections: ["11.1"] },
  { id: "mechanical", title: "Mechanical engineering", text: "Frames, axes, fixtures and enclosures: design goals and watch-outs.", sections: ["11.3"] },
  { id: "electrical", title: "Electrical engineering", text: "Control, drive, sensor and panel elements of a laser machine.", sections: ["11.4"] },
  { id: "software", title: "Software architecture", text: "Software modules of a production laser machine.", sections: ["11.5"] },
  { id: "vision-loop", title: "Vision-guided loop", text: "Camera, fiducials, offset correction and code verification in one station.", sections: ["12.1", "12.2"] },
  { id: "integration", title: "Integration with automation", text: "The laser alongside PLCs, robots, conveyors, MES and SCADA.", sections: ["12.3"] },
  { id: "handshake", title: "Handshake sequence", text: "A typical in-line marking cycle, signal by signal.", sections: ["12.4"] },
  { id: "recipes", title: "Recipes, traceability and SPC", text: "Recipes, data logging, traceability and statistical process control.", sections: ["12.5"] },
  { id: "interlocks", title: "Interlocks and emission permission", text: "How emission permission is built from interlocks (a teaching demo, not a safety design).", sections: ["11.6", "11.4"] },
  { id: "configurator", title: "Machine configurator", text: "Pick an application family to see its reference machine architecture and cost structure.", sections: ["26.1", "23.1"] },
].map((t) => ({ ...t, id: `architecture:${t.id}`, href: `/architecture#${t.id}`, location: "Architecture & Automation" }));

const SAFETY_ANCHORS: ToolSpec[] = [
  { id: "classes", title: "Laser classes", text: "The laser classes and their accessible emission limits, with a class selector.", sections: ["24.1"] },
  { id: "hazards", title: "Laser hazards", text: "Hazards, mechanisms and controls.", sections: ["24.2"] },
  { id: "standards", title: "Standards", text: "The standards the handbook lists, filterable by scope.", sections: ["24.3"] },
  { id: "safety-architecture", title: "Machine safety architecture", text: "Elements of the machine safety architecture and their purpose.", sections: ["11.6"] },
  { id: "od-nohd", title: "Optical density and NOHD", text: "Eyewear optical density and nominal ocular hazard distance calculators (learning aids, not a safety assessment).", sections: ["24.2"], keywords: "OD NOHD eyewear" },
  { id: "metrology", title: "Quality and metrology", text: "Instruments and practical notes for power, energy, beam and process measurements.", sections: ["24.4"] },
  { id: "feasibility", title: "Application feasibility study", text: "The feasibility study template as a checklist.", sections: ["23.5"] },
  { id: "doe", title: "Parameter development and DOE", text: "Process parameters, their primary effects and couplings, for planning a design of experiments.", sections: ["23.6"] },
  { id: "checklists", title: "Safety and project checklists", text: "Safety, product-manager, application-engineer and proof-of-concept checklists (practice aids, not certification).", sections: ["B.7", "B.8"] },
].map((t) => ({ ...t, id: `safety:${t.id}`, href: `/safety#${t.id}`, location: "Safety & Quality" }));

const REFERENCE_PAGES: ToolSpec[] = [
  { id: "glossary", title: "Glossary and abbreviations", text: "Every glossary term and abbreviation in the handbook.", sections: ["B.1", "B.2"] },
  { id: "formulas", title: "Formula sheet", text: "Handbook equations with their transcriptions and the calculators that implement them.", sections: ["B.3"] },
  { id: "figures", title: "Figures", text: "Every handbook diagram and equation image with its description.", sections: [] },
  { id: "map", title: "Master laser technology map", text: "The handbook's map from photon to industry.", sections: ["28.0"] },
  { id: "decision-tree", title: "Laser selection decision tree", text: "Walk the handbook's selection tree from material and process to laser.", sections: ["B.5"] },
  { id: "status", title: "Content status", text: "Extraction counts, review flags and what still needs technical review.", sections: [] },
  { id: "sources", title: "Handbook sources", text: "The sources the handbook lists.", sections: ["back.sources"] },
].map((t) => ({ ...t, id: `reference:${t.id}`, href: `/reference/${t.id}`, location: "Reference Library" }));

const EXTRA_TOOLS: ToolSpec[] = [
  { id: "sources:wavelengths", title: "Laser wavelength map", href: "/sources?view=wavelengths", location: "Laser Source Explorer", text: "Wavelength lines with source technology, absorption and applications.", sections: ["3.8"] },
];

function toolDoc(t: ToolSpec): SearchDoc {
  return {
    id: `tool:${t.id}`,
    kind: "tool",
    title: t.title,
    location: t.location,
    href: t.href,
    text: t.text,
    keywords: [sectionTitles(t.sections), t.keywords ?? ""].filter(Boolean).join(" · "),
    source: t.sections.length ? citeMany(t.sections) : undefined,
  };
}

function toolDocs(): SearchDoc[] {
  const nav: SearchDoc[] = NAV.flatMap((g) =>
    g.items.map((n) => ({
      id: `tool:nav:${n.id}`,
      kind: "tool" as const,
      title: n.label,
      location: `LASERVERSE · ${g.label}`,
      href: n.href,
      text: n.description,
    })),
  );
  const processes: SearchDoc[] = PROCESS_DEFS.map((p) =>
    toolDoc({
      id: `process:${p.id}`,
      title: `${p.title} workspace`,
      href: `/processes/${p.id}`,
      location: "Process Simulator",
      text: p.short,
      sections: p.sections,
    }),
  );
  return [...nav, ...processes, ...[...PHYSICS_TABS, ...BEAM_TABS, ...MATERIALS_TABS, ...ARCHITECTURE_ANCHORS, ...SAFETY_ANCHORS, ...REFERENCE_PAGES, ...EXTRA_TOOLS].map(toolDoc)];
}

function calculatorDocs(): SearchDoc[] {
  return CALCULATORS.map((c) => {
    const symbols = c.inputs.flatMap((i) => (isChoice(i) ? [i.label] : [i.symbol ?? "", i.label]));
    const outputs = c.outputs.flatMap((o) => [o.symbol ?? "", o.label]);
    return {
      id: `calculator:${c.id}`,
      kind: "calculator",
      title: c.title,
      location: `Engineering Calculators · ${CATEGORY_LABEL[c.category]}`,
      href: `/calculators/${c.id}`,
      text: c.summary,
      keywords: squash([...symbols, ...outputs, c.keywords ?? ""].filter(Boolean).join(" ")),
      source: c.sources.length ? citeMany(c.sources.map((s) => s.section)) : undefined,
    };
  });
}

/* ================================================================== adapters */
function sourceDocs(): SearchDoc[] {
  return sourceCatalogue().map((e) => ({
    id: `source:${e.id}`,
    kind: "source",
    title: e.name,
    location: `Laser Source Explorer · ${FAMILY_LABEL[e.family]}`,
    href: `/sources?family=${encodeURIComponent(e.family)}&source=${encodeURIComponent(e.id)}`,
    text: cap(squash(e.fields.map(([h, v]) => `${h}: ${v}`).join(" · ")), LESSON_TEXT_CAP),
    keywords: e.modes.join(" "),
    source: cite(e.section),
  }));
}

function applicationDocs(): SearchDoc[] {
  const chains: SearchDoc[] = applicationMatrix().map((c) => ({
    id: `application:${c.id}`,
    kind: "application",
    title: `${c.product} — ${c.component}`,
    location: `Industrial Applications · ${c.industry}`,
    href: `/applications?chain=${encodeURIComponent(c.id)}`,
    text: squash(
      [
        `Industry: ${c.industry}`,
        `Material: ${c.material}`,
        `Process: ${c.process}`,
        `Laser: ${c.laser}`,
        `λ: ${c.lambda}`,
        `Avg power: ${c.power}`,
        `Pulse: ${c.pulse}`,
        `Machine: ${c.machine}`,
      ].join(" · "),
    ),
    keywords: c.families.join(" "),
    source: cite("20.0"),
  }));
  const cases: SearchDoc[] = caseStudies().map((k) => ({
    id: `application:${k.id}`,
    kind: "application",
    title: `Case ${k.number}: ${k.title}`,
    location: "Industrial Applications · Case studies",
    href: `/applications/${k.id}`,
    text: cap(squash(k.steps.map((s) => `${s.step}: ${s.decision}`).join(" · ")), LESSON_TEXT_CAP),
    keywords: k.industries.join(" "),
    source: cite("26.2"),
  }));
  return [...chains, ...cases];
}

function troubleshootingDocs(): SearchDoc[] {
  return [...symptomCards(), ...weldDefectCards()].map((c) => ({
    id: `troubleshooting:${c.id}`,
    kind: "troubleshooting",
    title: c.problem,
    location: c.kind === "symptom" ? "Troubleshooting · Symptoms" : "Troubleshooting · Weld defects",
    href: `/troubleshooting#${c.id}`,
    text: squash(
      [`Causes: ${c.causes.join("; ")}`, c.checks ? `Diagnostic: ${c.checks.join("; ")}` : "", `Actions: ${c.actions.join("; ")}`].filter(Boolean).join(" · "),
    ),
    source: cite(c.section),
  }));
}

function componentDocs(): SearchDoc[] {
  const layer = new Map(LAYERS.map((l) => [l.id, l.label]));
  return COMPONENTS.map((c) => ({
    id: `component:${c.id}`,
    kind: "component",
    title: c.name,
    location: `3D Machine Explorer · ${c.layers.map((l) => layer.get(l) ?? l).join(", ")}`,
    href: `/machine?select=${encodeURIComponent(c.id)}`,
    text: squash([c.fn, c.spec, c.watch ?? ""].join(" ")),
    keywords: c.id,
    source: citeMany(c.sections),
  }));
}

function quizDocs(): SearchDoc[] {
  return QUIZZES.map((q) => ({
    id: `quiz:${q.id}`,
    kind: "quiz",
    title: q.title,
    location: "Assessments",
    href: `/assessments/${q.id}`,
    text: `${q.description} ${q.questionIds.length} questions.`,
    keywords: q.level ?? undefined,
  }));
}

/**
 * The complete local search index, assembled from the same server adapters the pages use,
 * so every result title, excerpt and anchor matches what its page renders.
 */
export function buildSearchIndex(): SearchDoc[] {
  const docs = [
    ...lessonDocs(),
    ...partDocs(),
    ...glossaryDocs(),
    ...abbreviationDocs(),
    ...figureDocs(),
    ...toolDocs(),
    ...calculatorDocs(),
    ...sourceDocs(),
    ...applicationDocs(),
    ...troubleshootingDocs(),
    ...componentDocs(),
    ...quizDocs(),
  ];
  const seen = new Set<string>();
  for (const d of docs) {
    if (seen.has(d.id)) throw new Error(`search index: duplicate id ${d.id}`);
    seen.add(d.id);
    if (!d.href.startsWith("/")) throw new Error(`search index: non-internal href ${d.href} (${d.id})`);
  }
  // empty keyword strings add nothing to the index or the payload
  return docs.map(({ keywords, ...d }) => (keywords ? { ...d, keywords } : d));
}

/** Handbook source fingerprint the index was built from. */
export function searchIndexSource(): string {
  return handbook.source.sha256;
}

