import "server-only";
import {
  handbook,
  extractionReport,
  extractionFlags,
  allSections,
  getSection,
  getFigure,
  figuresInSection,
  getTable,
  tableRecords,
  quote,
} from "./handbook";
import type { Block, Figure, TableBlock, ExtractionFlag } from "./schema";
import { hrefFor, labelFor, outline, outlineSection } from "./outline";
import { parsePartList } from "./parts";
import { slug } from "@/lib/slug";
import { REVIEW_FLAGS, type ReviewFlag } from "@/content/review-flags";
import { CALCULATORS, CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { glossaryAnchors, abbreviationAnchors } from "@/features/search/anchors";
import { NAV_ITEMS } from "@/lib/nav";
import type {
  AbbreviationEntry,
  DecisionClass,
  DecisionTreeData,
  FigureCard,
  GlossaryEntry,
  MapNode,
  PlatformLink,
  TechnologyMapData,
} from "@/features/reference/types";

/* ================================================================== helpers */

/** Throws when a list of DOM anchors contains a repeat (so a re-ingest cannot ship duplicate ids). */
function assertUnique(what: string, anchors: string[]): string[] {
  const seen = new Set<string>();
  for (const a of anchors) {
    if (seen.has(a)) throw new Error(`${what}: duplicate anchor "${a}"`);
    seen.add(a);
  }
  return anchors;
}

/** A–Z jump letter for a term ("Étendue" → "E"); "#" for anything else. */
export function letterOf(s: string): string {
  const c = (s.normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "")[0] ?? "").toUpperCase();
  return /^[A-Z]$/.test(c) ? c : "#";
}

/** The handbook subheading printed just before the n-th (1-based) table of a section, if any. */
export function tableHeading(sectionId: string, index: number): string | null {
  const s = getSection(sectionId);
  if (!s) throw new Error(`reference: unknown handbook section ${sectionId}`);
  let heading: string | null = null;
  let n = 0;
  for (const b of s.blocks) {
    if (b.type === "subheading") heading = b.text;
    else if (b.type === "table" && ++n === index) return heading;
  }
  throw new Error(`reference: §${sectionId} has no table ${index}`);
}

function sectionRef(id: string) {
  if (!outlineSection(id)) throw new Error(`reference: unknown handbook section ${id}`);
  return { id, label: labelFor(id, true), href: hrefFor(id) };
}

/* ================================================================== index (/reference) */

/** Platform pages that present each §B.4 chart or matrix interactively (navigation, not handbook content). */
const B4_LINKS: Record<string, PlatformLink[]> = {
  "Laser wavelength chart": [{ label: "Wavelength map", href: "/sources?view=wavelengths" }],
  "Material absorption reference": [{ label: "Material Interaction Lab", href: "/materials" }],
  "Process regime map": [{ label: "Process regimes view", href: "/materials?tab=regimes" }],
  "Application matrix": [{ label: "Industrial Applications", href: "/applications" }],
  "Machine architecture reference": [
    { label: "Architecture & Automation", href: "/architecture" },
    { label: "3D Machine Explorer", href: "/machine" },
  ],
  "Troubleshooting guide": [{ label: "Troubleshooting", href: "/troubleshooting" }],
  "Recommended learning path": [{ label: "Learning path below", href: "/reference#learning-path" }],
};

export function referenceIndexData() {
  const charts = getTable("B.4", 1, ["Item", "Where"]);
  const chartRows = tableRecords(charts).map((r) => ({
    item: r["Item"] ?? "",
    where: r["Where"] ?? "",
    links: B4_LINKS[r["Item"] ?? ""] ?? [],
  }));
  for (const key of Object.keys(B4_LINKS)) {
    if (!chartRows.some((r) => r.item === key)) throw new Error(`§B.4: no row "${key}" (platform link map drifted)`);
  }
  const b6 = outlineSection("B.6");
  if (!b6) throw new Error("§B.6 process selection matrix missing from the outline");
  const glance = getTable("B.10", 1, ["Layer", "Decision", "Governing rule", "Numbers to remember"]);
  return {
    glance,
    glanceRows: tableRecords(glance).map((r) => ({
      layer: r["Layer"] ?? "",
      decision: r["Decision"] ?? "",
      rule: r["Governing rule"] ?? "",
      numbers: r["Numbers to remember"] ?? "",
    })),
    /** §27.1 subheadings over tables 2–4 (table 1 has none) */
    quickRefHeadings: { families: tableHeading("27.1", 2), power: tableHeading("27.1", 3), regimes: tableHeading("27.1", 4) },
    quickRef: getTable("27.1", 1, ["Reference", "Location"]),
    families: getTable("27.1", 2, ["Family", "λ", "Average power", "Pulse", "Wall-plug efficiency", "Beam quality", "Relative cost per W", "Sweet spot"]),
    powerByApp: getTable("27.1", 3, ["Application", "Power"]),
    regimes: getTable("27.1", 4, ["Regime", "Thermal diffusion length", "Interaction", "Typical processes"]),
    charts: chartRows,
    /** §B.6 is presented on the Process Simulator page (/processes#selection-matrix). */
    selectionMatrix: { sectionId: "B.6", title: b6.s.title },
    learningPath: getTable("B.9", 1, ["Stage", "What to study", "Suggested resources"]),
  };
}

/* ================================================================== glossary */

export function glossaryTable(): TableBlock {
  return getTable("B.1", 1, ["Term", "Definition"]);
}

export function abbreviationTable(): TableBlock {
  return getTable("B.2", 1, ["Abbreviation", "Meaning"]);
}

const splitAbbr = (s: string) =>
  s
    .split(/\s*[/,]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * §B.1 / §B.2 entries with their DOM anchors. The anchors come from the same functions the
 * search index uses (features/search/anchors.ts), so every glossary/abbreviation search hit
 * lands on the row it names; a repeated anchor throws.
 */
export function glossaryData(): { terms: GlossaryEntry[]; abbreviations: AbbreviationEntry[] } {
  const termRows = tableRecords(glossaryTable());
  const abbrRows = tableRecords(abbreviationTable());
  const termAnchors = glossaryAnchors(termRows.map((r) => r["Term"] ?? ""));
  const abbrAnchors = abbreviationAnchors(abbrRows.map((r) => r["Abbreviation"] ?? ""));
  assertUnique("§B.1/§B.2 glossary page", [...termAnchors, ...abbrAnchors, "glossary", "abbreviations"]);

  const abbreviations: AbbreviationEntry[] = abbrRows.map((r, i) => ({
    abbr: r["Abbreviation"] ?? "",
    meaning: r["Meaning"] ?? "",
    anchor: abbrAnchors[i]!,
    letter: letterOf(r["Abbreviation"] ?? ""),
    terms: [],
  }));
  // token → abbreviation row ("MPE / NOHD" yields MPE and NOHD); first row wins
  const byToken = new Map<string, AbbreviationEntry>();
  for (const a of abbreviations) for (const tok of splitAbbr(a.abbr)) if (!byToken.has(tok)) byToken.set(tok, a);

  const terms: GlossaryEntry[] = termRows.map((r, i) => {
    const term = r["Term"] ?? "";
    const paren = /\(([^)]+)\)\s*$/.exec(term);
    const candidates = paren ? splitAbbr(paren[1]!) : [term];
    const match = candidates.map((c) => byToken.get(c)).find(Boolean);
    const anchor = termAnchors[i]!;
    if (match) match.terms.push({ anchor, label: term });
    return {
      term,
      definition: r["Definition"] ?? "",
      anchor,
      letter: letterOf(term),
      abbr: match ? { anchor: match.anchor, label: match.abbr } : undefined,
    };
  });
  return { terms, abbreviations };
}

/* ================================================================== formulas */

export interface FormulaGroup {
  /** DOM anchor of the group */
  id: string;
  title: string;
  sectionId: string;
  /** true for the §B.3 formula-sheet groups */
  sheet: boolean;
  figures: Figure[];
  calculators: Array<{ id: string; title: string }>;
}

/**
 * Calculators that implement the equations of each §B.3 formula-sheet group. Chosen by
 * matching the transcribed equations to calculator definitions (platform links).
 */
export const SHEET_CALCULATORS: Record<string, string[]> = {
  "Photons and waves": ["photon-energy", "wavelength-frequency", "energy-units", "photons-in-pulse", "radiation-force", "field-amplitude"],
  "Laser physics": ["threshold-gain", "quantum-defect", "cavity-modes", "coherence-length"],
  Pulses: ["pulse-parameters", "average-power", "fluence", "pulse-overlap", "time-bandwidth"],
  "Gaussian beams and focusing": ["gaussian-propagation", "focus-spot", "bpp-m2", "fiber-imaging", "brightness", "cw-intensity"],
  "Optics and materials": ["fresnel", "hagen-rubens"],
  "Thermal and ablation": ["thermal-diffusion", "energy-per-length", "ablation-depth", "critical-power"],
  "Safety and economics": ["optical-density", "nohd", "cost-per-part", "cycle-time"],
};

const calcRefs = (ids: string[]) =>
  ids.map((id) => {
    const c = CALCULATOR_INDEX.get(id);
    if (!c) throw new Error(`formula library: unknown calculator ${id}`);
    return { id, title: c.title };
  });

/** Calculators that cite a given handbook section among their sources. */
export function calculatorsCiting(sectionId: string) {
  return CALCULATORS.filter((c) => c.sources.some((s) => s.section === sectionId)).map((c) => ({ id: c.id, title: c.title }));
}

export function formulaGroups(): FormulaGroup[] {
  const sheet = getSection("B.3");
  if (!sheet) throw new Error("§B.3 formula sheet missing");
  const groups: FormulaGroup[] = [];
  let current: FormulaGroup | null = null;
  for (const b of sheet.blocks) {
    if (b.type === "subheading") {
      current = { id: `sheet-${slug(b.text)}`, title: b.text, sectionId: "B.3", sheet: true, figures: [], calculators: calcRefs(SHEET_CALCULATORS[b.text] ?? []) };
      groups.push(current);
    } else if (b.type === "figure") {
      const f = getFigure(b.figureId);
      if (!f) throw new Error(`§B.3: figure ${b.figureId} missing`);
      if (!current) throw new Error(`§B.3: figure ${b.figureId} precedes the first subheading`);
      current.figures.push(f);
    }
  }
  for (const s of allSections()) {
    if (s.id === "B.3") continue;
    const eq = figuresInSection(s.id).filter((f) => f.kind === "equation");
    if (!eq.length) continue;
    groups.push({
      id: `section-${slug(s.id)}`,
      title: s.number ? `§${s.number} ${s.title}` : s.title,
      sectionId: s.id,
      sheet: false,
      figures: eq,
      calculators: calculatorsCiting(s.id),
    });
  }
  return groups;
}

/* ================================================================== figures */

/** Lesson link for a figure's location: a section, or a Part's lead (figures placed before its first section). */
export function locationLink(sectionId: string): { label: string; href: string } {
  if (outlineSection(sectionId)) return { label: labelFor(sectionId, true), href: hrefFor(sectionId) };
  const part = outline.parts.find((p) => p.id === sectionId);
  if (part) return { label: part.roman ? `Part ${part.roman} ${part.title}` : part.title, href: `/learn/${part.id}` };
  throw new Error(`reference: unknown handbook location ${sectionId}`);
}

export function figureGallery(): FigureCard[] {
  return handbook.figures.map((f) => {
    const loc = locationLink(f.sectionId);
    return {
      id: f.id,
      file: f.file,
      width: f.width,
      height: f.height,
      kind: f.kind,
      title: f.title,
      alt: f.alt ?? null,
      status: f.status,
      sectionId: f.sectionId,
      sectionLabel: loc.label,
      sectionHref: loc.href,
      hasLatex: Boolean(f.latex),
    };
  });
}

/* ================================================================== technology map (§28.0) */

/** Platform areas that explore each map branch interactively (navigation, not handbook content). */
export const MAP_EXPLORE: Record<string, PlatformLink[]> = {
  LIGHT: [{ label: "Physics Lab", href: "/physics-lab" }],
  "LASER PHYSICS": [{ label: "Physics Lab", href: "/physics-lab" }],
  "GAIN MEDIA": [{ label: "Laser Source Explorer", href: "/sources" }],
  "LASER SOURCES": [{ label: "Laser Source Explorer", href: "/sources" }],
  Fiber: [{ label: "Fiber sources", href: "/sources?family=fiber" }],
  "CO₂": [{ label: "Gas sources", href: "/sources?family=gas" }],
  "Solid State": [{ label: "Solid-state sources", href: "/sources?family=solid-state" }],
  Semiconductor: [{ label: "Semiconductor sources", href: "/sources?family=semiconductor" }],
  Ultrafast: [{ label: "Ultrafast sources", href: "/sources?family=ultrafast" }],
  "BEAM ENGINEERING": [{ label: "Beam & Optics Lab", href: "/beam-optics" }],
  OPTICS: [{ label: "Beam & Optics Lab", href: "/beam-optics" }],
  "SCANNING & MOTION": [{ label: "3D Machine Explorer", href: "/machine" }],
  "MATERIAL INTERACTION": [{ label: "Material Interaction Lab", href: "/materials" }],
  AUTOMATION: [{ label: "Architecture & Automation", href: "/architecture" }],
  "LASER PROCESSES": [{ label: "Process Simulator", href: "/processes" }],
  Marking: [{ label: "Marking workspace", href: "/processes/marking" }],
  Cutting: [{ label: "Cutting workspace", href: "/processes/cutting" }],
  Welding: [{ label: "Welding workspace", href: "/processes/welding" }],
  Cleaning: [{ label: "Cleaning workspace", href: "/processes/cleaning" }],
  Drilling: [{ label: "Drilling workspace", href: "/processes/drilling" }],
  Micromachining: [{ label: "Micromachining workspace", href: "/processes/drilling" }],
  MACHINES: [{ label: "3D Machine Explorer", href: "/machine" }],
  COMPONENTS: [{ label: "Industrial Applications", href: "/applications" }],
  PRODUCTS: [{ label: "Industrial Applications", href: "/applications" }],
  INDUSTRIES: [{ label: "Industrial Applications", href: "/applications" }],
};

/** Handbook sections whose titles name the branch (navigation aid). */
export const MAP_SECTIONS: Record<string, string[]> = {
  "Crystals & glasses": ["3.2"],
  "Doped fibers": ["3.3"],
  Gases: ["3.4"],
  Semiconductors: ["3.5"],
  Fiber: ["3.3"],
  "CO₂": ["3.4", "10.13"],
  "Solid State": ["3.2"],
  Semiconductor: ["3.5"],
  UV: ["10.14"],
  Ultrafast: ["3.6", "10.15"],
  Marking: ["10.2"],
  Cutting: ["10.3"],
  Welding: ["10.4"],
  Soldering: ["10.5"],
  Cleaning: ["10.9"],
  Drilling: ["10.7"],
  Cladding: ["10.10"],
  Micromachining: ["10.8"],
  MACHINES: ["26.1"],
};

interface RawNode {
  text: string;
  children: RawNode[];
}

const CONNECTOR = /^((?:[│ ] {3})*)[├└]── (.+)$/u;
const PART_TAIL = /\s*(?:\.{2,}\s*)?\b(Parts? [IVXL]+(?:\s*[–-]\s*[IVXL]+)?)\s*$/u;

/**
 * Parse the §28.0 box-drawing tree. Each "├── "/"└── " line opens a node whose depth is
 * set by its 4-character indentation groups; indented lines without a connector continue
 * the previous node's text. Spacer lines ("│") are ignored.
 */
export function parseTechnologyMap(text: string): MapNode {
  let root: RawNode | null = null;
  const stack: RawNode[] = [];
  let last: RawNode | null = null;
  for (const line of text.split("\n")) {
    if (!line.replace(/[│\s]/gu, "")) continue;
    const m = CONNECTOR.exec(line);
    if (m) {
      const depth = m[1]!.length / 4 + 1;
      const parent = stack[depth - 1];
      if (!parent) throw new Error(`§28.0 map: orphan branch "${m[2]}"`);
      const node: RawNode = { text: m[2]!.trim(), children: [] };
      parent.children.push(node);
      stack[depth] = node;
      stack.length = depth + 1;
      last = node;
    } else if (!root) {
      root = { text: line.trim(), children: [] };
      stack[0] = root;
      last = root;
    } else if (last) {
      last.text = `${last.text} ${line.replace(/^[│\s]+/u, "").trim()}`;
    }
  }
  if (!root) throw new Error("§28.0 map: empty tree");

  const used = new Set<string>();
  const convert = (r: RawNode): MapNode => {
    let t = r.text.replace(/\s+/g, " ").trim();
    let partText: string | null = null;
    const pm = PART_TAIL.exec(t);
    if (pm) {
      partText = pm[1]!.replace(/\s*([–-])\s*/, "$1");
      t = t.slice(0, pm.index).trim();
    }
    t = t.replace(/\s*\.{2,}$/, "").trim();
    const sep = t.indexOf(" ─ ");
    const label = (sep >= 0 ? t.slice(0, sep) : t).trim();
    const items = sep >= 0 ? t.slice(sep + 3).split(" · ").map((x) => x.trim()).filter(Boolean) : [];
    const base = `map-${slug(label) || "node"}`;
    let id = base;
    let k = 1;
    while (used.has(id)) id = `${base}-${++k}`;
    used.add(id);
    return {
      id,
      label,
      items,
      partText,
      parts: partText ? parsePartList(partText) : [],
      children: r.children.map(convert),
      explore: MAP_EXPLORE[label] ?? [],
      sections: (MAP_SECTIONS[label] ?? []).map(sectionRef),
    };
  };
  return convert(root);
}

export function mapLabels(node: MapNode): string[] {
  return [node.label, ...node.children.flatMap(mapLabels)];
}

/** Which map branch each step of the §28.0 upward walk corresponds to (navigation aid). */
export const CHAIN_BRANCH: Record<string, string> = {
  product: "PRODUCTS",
  component: "COMPONENTS",
  material: "MATERIAL INTERACTION",
  process: "LASER PROCESSES",
  "absorption and HAZ": "MATERIAL INTERACTION",
  "pulse regime and wavelength": "LASER SOURCES",
  source: "LASER SOURCES",
  "beam, optics and head": "BEAM ENGINEERING",
  machine: "MACHINES",
};

function findNode(node: MapNode, label: string): MapNode | undefined {
  if (node.label === label) return node;
  for (const c of node.children) {
    const f = findNode(c, label);
    if (f) return f;
  }
  return undefined;
}

export function technologyMapData(): TechnologyMapData {
  const s = getSection("28.0");
  const pre = s?.blocks.find((b): b is Extract<Block, { type: "preformatted" }> => b.type === "preformatted");
  if (!pre) throw new Error("§28.0: preformatted technology map not found");
  const root = parseTechnologyMap(pre.text);
  const labels = new Set(mapLabels(root));
  for (const key of [...Object.keys(MAP_EXPLORE), ...Object.keys(MAP_SECTIONS)]) {
    if (!labels.has(key)) throw new Error(`§28.0 map: no branch "${key}" (platform link map drifted)`);
  }
  const outro = quote("28.0", "Every application question resolves by walking this tree upward");
  const colon = outro.indexOf(": ");
  const steps = outro
    .slice(colon + 2)
    .replace(/\.$/, "")
    .split("→")
    .map((x) => x.trim())
    .filter(Boolean);
  for (const [step, label] of Object.entries(CHAIN_BRANCH)) {
    if (!steps.includes(step)) throw new Error(`§28.0: walk step "${step}" not in the closing paragraph`);
    if (!findNode(root, label)) throw new Error(`§28.0 map: no branch "${label}"`);
  }
  const chain = steps.map((text) => {
    const label = CHAIN_BRANCH[text];
    return { text, target: label ? (findNode(root, label)?.id ?? null) : null };
  });
  return {
    root,
    intro: quote("28.0", "The whole handbook on one tree", 2),
    outro,
    chain,
    preformatted: pre.text,
  };
}

/** The front-matter “Laser technology hierarchy” figure and its reading note. */
export function hierarchyFigure(): { figure: Figure; note: string } {
  const figure = figuresInSection("front.laser-technology-hierarchy").find((f) => f.kind === "diagram");
  if (!figure) throw new Error("front matter: laser technology hierarchy figure missing");
  return { figure, note: quote("front.laser-technology-hierarchy", "Read top-down to learn") };
}

/* ================================================================== decision tree (§B.5) */

/**
 * The §B.5 decision tree, encoded by hand from the figure's transcription (its alt text,
 * written by reading the image). `decisionTreeData()` re-serialises this encoding and
 * requires it to equal the transcription exactly, so the two cannot drift apart.
 */
export const DECISION_TREE = {
  question: "Material class?",
  classes: [
    {
      id: "metal",
      label: "Metal",
      branches: [
        { id: "metal-reflective-joining", condition: "Cu, Au, Ag, Al joining", recommendation: "green, blue or shaped IR" },
        { id: "metal-cut-weld", condition: "Steel, Ti, Ni cut or weld", recommendation: "CW fiber" },
        { id: "metal-mark-clean", condition: "Mark or clean", recommendation: "ns fiber MOPA" },
        { id: "metal-micro", condition: "Micro-features, no HAZ", recommendation: "ps/fs" },
      ],
    },
    {
      id: "polymer",
      label: "Organic/polymer",
      branches: [
        { id: "polymer-bulk", condition: "Bulk cut, mark, code", recommendation: "CO₂ 9.3–10.6 µm" },
        { id: "polymer-fine", condition: "Fine, low HAZ", recommendation: "UV 355 nm or ps" },
      ],
    },
    {
      id: "glass",
      label: "Transparent glass, sapphire",
      branches: [
        { id: "glass-thermal", condition: "Thermal scribe or mark", recommendation: "CO₂" },
        { id: "glass-precision", condition: "Precision or in-volume", recommendation: "ps/fs" },
      ],
    },
    {
      id: "wafer",
      label: "Semiconductor wafer",
      branches: [
        { id: "wafer-dicing", condition: "Dicing", recommendation: "stealth NIR or UV/USP" },
        { id: "wafer-mark", condition: "Mark, anneal, LLO", recommendation: "green, UV, excimer" },
      ],
    },
  ],
} as const;

/** Next-step platform links for each leaf (navigation, not handbook content). */
const DECISION_EXPLORE: Record<string, PlatformLink[]> = {
  "metal-reflective-joining": [
    { label: "Absorption at 515 nm", href: "/materials?tab=absorption&nm=515" },
    { label: "Welding workspace", href: "/processes/welding" },
  ],
  "metal-cut-weld": [
    { label: "Fiber sources", href: "/sources?family=fiber" },
    { label: "Cutting workspace", href: "/processes/cutting" },
    { label: "Welding workspace", href: "/processes/welding" },
  ],
  "metal-mark-clean": [
    { label: "Fiber sources", href: "/sources?family=fiber" },
    { label: "Marking workspace", href: "/processes/marking" },
    { label: "Cleaning workspace", href: "/processes/cleaning" },
  ],
  "metal-micro": [
    { label: "Ultrafast sources", href: "/sources?family=ultrafast" },
    { label: "Drilling & micromachining", href: "/processes/drilling" },
  ],
  "polymer-bulk": [
    { label: "Gas sources (CO₂)", href: "/sources?family=gas" },
    { label: "UV and CO₂ workspace", href: "/processes/uv-co2" },
  ],
  "polymer-fine": [
    { label: "UV and CO₂ workspace", href: "/processes/uv-co2" },
    { label: "Ultrafast sources", href: "/sources?family=ultrafast" },
  ],
  "glass-thermal": [
    { label: "Gas sources (CO₂)", href: "/sources?family=gas" },
    { label: "UV and CO₂ workspace", href: "/processes/uv-co2" },
  ],
  "glass-precision": [
    { label: "Ultrafast sources", href: "/sources?family=ultrafast" },
    { label: "Drilling & micromachining", href: "/processes/drilling" },
  ],
  "wafer-dicing": [{ label: "Ultrafast sources", href: "/sources?family=ultrafast" }],
  "wafer-mark": [
    { label: "UV and CO₂ workspace", href: "/processes/uv-co2" },
    { label: "Gas sources (excimer)", href: "/sources?family=gas" },
  ],
};

/** Lessons on each material class (navigation aid). */
const DECISION_SECTIONS: Record<string, string[]> = {
  metal: ["9.2"],
  polymer: ["9.3"],
  glass: ["9.3"],
  wafer: ["13.1", "13.2", "13.3"],
};

type EncodedTree = typeof DECISION_TREE;

/** Re-serialise the encoding in the transcription's own format. */
export function serializeDecisionTree(tree: EncodedTree = DECISION_TREE): string {
  return (
    `Tree: ${tree.question}` +
    tree.classes.map((c) => ` → ${c.label} → ${c.branches.map((b) => `${b.condition}: ${b.recommendation}`).join("; ")}.`).join("")
  );
}

/** Every string the decision-tree encoding shows to users. */
export function decisionTreeStrings(tree: EncodedTree = DECISION_TREE): string[] {
  return [tree.question, ...tree.classes.flatMap((c) => [c.label, ...c.branches.flatMap((b) => [b.condition, b.recommendation])])];
}

export function decisionTreeFigure(): Figure {
  const f = figuresInSection("B.5").find((x) => x.kind === "diagram");
  if (!f?.alt) throw new Error("§B.5: decision-tree figure or its transcription missing");
  return f;
}

export function decisionTreeData(): DecisionTreeData {
  const fig = decisionTreeFigure();
  const alt = fig.alt ?? "";
  for (const s of decisionTreeStrings()) if (!alt.includes(s)) throw new Error(`§B.5: "${s}" is not in the figure transcription`);
  if (serializeDecisionTree() !== alt) throw new Error("§B.5: decision-tree encoding differs from the figure transcription");
  const classes: DecisionClass[] = DECISION_TREE.classes.map((c) => ({
    id: c.id,
    label: c.label,
    sections: (DECISION_SECTIONS[c.id] ?? []).map(sectionRef),
    branches: c.branches.map((b) => ({ id: b.id, condition: b.condition, recommendation: b.recommendation, explore: DECISION_EXPLORE[b.id] ?? [] })),
  }));
  return {
    question: DECISION_TREE.question,
    classes,
    confirm: quote("B.5", "Confirm every branch with the absorption check"),
    figureId: fig.id,
    figureTitle: fig.title ?? "Laser selection decision tree",
    checks: [
      { label: "Absorption check — Material Interaction Lab", href: "/materials?tab=absorption" },
      { label: "HAZ check — thermal diffusion length", href: "/calculators/thermal-diffusion" },
      { label: `DOE — ${labelFor("23.6")} lesson`, href: hrefFor("23.6") },
      { label: "DOE planning — Safety & Quality", href: "/safety#doe" },
    ],
  };
}

/** §23.3 laser process selection framework: figure and both tables. */
export function selectionFramework() {
  const figure = figuresInSection("23.3").find((f) => f.kind === "diagram");
  if (!figure) throw new Error("§23.3: selection framework figure missing");
  return {
    figure,
    questions: getTable("23.3", 1, ["Question", "Rule"]),
    examples: getTable("23.3", 2, ["Example", "Constraints", "Selection"]),
  };
}

/* ================================================================== status */

export function statusData() {
  const eq = handbook.figures.filter((f) => f.kind === "equation");
  const count = <T extends string>(xs: T[]) => {
    const m = new Map<T, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()];
  };
  const bySeverity = (flags: Array<ExtractionFlag | ReviewFlag>) => count(flags.map((f) => f.severity));
  return {
    source: handbook.source,
    meta: handbook.meta,
    generator: handbook.generator,
    generatedAt: handbook.generatedAt,
    reportGeneratedAt: extractionReport.generatedAt,
    counts: Object.entries(extractionReport.counts),
    flags: extractionFlags,
    flagCodes: count(extractionFlags.map((f) => f.code)),
    flagSeverities: bySeverity(extractionFlags),
    reviewFlags: REVIEW_FLAGS,
    reviewSeverities: bySeverity(REVIEW_FLAGS),
    equations: {
      total: eq.length,
      withLatex: eq.filter((f) => Boolean(f.latex)).length,
      byStatus: count(eq.map((f) => f.status)),
      byMethod: count(eq.map((f) => f.transcription ?? "none")),
    },
    figuresByStatus: count(handbook.figures.map((f) => f.status)),
  };
}

export interface PlatformArea {
  id: string;
  label: string;
  href: string;
  description: string;
}

/**
 * Areas that exist in this build (stated on /reference/status): the landing page, every
 * sidebar area (lib/nav.ts) and the search page. Platform text, not handbook content.
 */
export function implementedAreas(): PlatformArea[] {
  return [
    { id: "landing", label: "Landing page", href: "/", description: "Introduction to the platform, with entry points into the academy, the machine explorer and the technology map." },
    ...NAV_ITEMS.map(({ id, label, href, description }) => ({ id, label, href, description })),
    { id: "search", label: "Search", href: "/search", description: "Local lexical search across lessons, tables, glossary, abbreviations, equations, figures and tools." },
  ];
}

/** Capabilities that are deliberately NOT part of this build (stated on /reference/status). */
export const NOT_IMPLEMENTED: Array<{ title: string; detail: string }> = [
  {
    title: "Optional AI assistant",
    detail: "No AI provider is configured and no page generates text at runtime. The core platform does not depend on AI.",
  },
  {
    title: "Semantic search provider",
    detail: "Search is a local lexical index. A SearchProvider interface exists so a semantic provider could be added later; none is implemented.",
  },
  {
    title: "User accounts and sync",
    detail: "There are no accounts. Progress, bookmarks, quiz attempts and checklists are stored only in this browser (localStorage); they can be exported or reset from Home.",
  },
  {
    title: "Performance measurements",
    detail: "No load-time, rendering or bundle-size measurements have been recorded, and none are claimed for this build.",
  },
  {
    title: "Automated visual-regression and accessibility audits",
    detail: "No screenshot-comparison tests or automated axe accessibility audits are part of this build, so no audit results are claimed.",
  },
  {
    title: "Experimental validation",
    detail: "No content carries the “validated” status: nothing in this release has been confirmed against defined experimental evidence.",
  },
];

/* ================================================================== sources */

export function externalLinks() {
  return handbook.externalLinks;
}

export interface ExternalSource {
  href: string;
  host: string;
  text: string;
  /** handbook locations (section ids) that cite the link */
  locations: string[];
}

export function sourcesData(): { blocks: Block[]; links: ExternalSource[]; total: number } {
  const s = getSection("back.sources");
  if (!s) throw new Error("back matter: Sources section missing");
  const byHref = new Map<string, ExternalSource>();
  for (const l of externalLinks()) {
    const e = byHref.get(l.href);
    if (e) {
      if (!e.locations.includes(l.location)) e.locations.push(l.location);
      if (l.location === "back.sources") e.text = l.text;
    } else {
      let host = l.href;
      try {
        host = new URL(l.href).hostname.replace(/^www\./, "");
      } catch {
        /* keep the raw href */
      }
      byHref.set(l.href, { href: l.href, host, text: l.text, locations: [l.location] });
    }
  }
  return { blocks: s.blocks, links: [...byHref.values()], total: externalLinks().length };
}
