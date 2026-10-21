import { describe, expect, it } from "vitest";
import {
  uniqueAnchors,
  letterOf,
  referenceIndexData,
  glossaryData,
  formulaGroups,
  SHEET_CALCULATORS,
  figureGallery,
  parseTechnologyMap,
  technologyMapData,
  mapLabels,
  MAP_EXPLORE,
  MAP_SECTIONS,
  hierarchyFigure,
  DECISION_TREE,
  decisionTreeData,
  decisionTreeFigure,
  decisionTreeStrings,
  serializeDecisionTree,
  selectionFramework,
  statusData,
  sourcesData,
  externalLinks,
} from "@/lib/content/reference";
import { handbook } from "@/lib/content/handbook";
import { slug } from "@/lib/slug";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { REFERENCE_PAGES } from "@/features/reference/pages";
import { outlineSection } from "@/lib/content/outline";
import type { MapNode } from "@/features/reference/types";

describe("anchors", () => {
  it("suffixes duplicate slugs with -2, -3 and keeps the first plain", () => {
    expect(uniqueAnchors("term", ["Kerf", "kerf", "KERF", "Dross"])).toEqual(["term-kerf", "term-kerf-2", "term-kerf-3", "term-dross"]);
    // a natural "-2" slug cannot collide with a generated suffix
    expect(new Set(uniqueAnchors("x", ["a 2", "a", "a"])).size).toBe(3);
  });
  it("assigns A–Z letters, folding accents", () => {
    expect(letterOf("Étendue")).toBe("E");
    expect(letterOf("M²")).toBe("M");
    expect(letterOf("3D galvo")).toBe("#");
    expect(letterOf("—")).toBe("#");
  });
});

describe("reference index", () => {
  it("reads §B.10, §27.1, §B.4 and §B.9", () => {
    const d = referenceIndexData();
    expect(d.glanceRows.map((r) => r.layer)).toEqual(["Photon", "Source", "Pulse", "Beam", "Delivery and scanning", "Process", "Machine", "Business"]);
    expect(d.quickRef.rows.length).toBe(11);
    expect(d.families.rows.length).toBe(8);
    expect(d.powerByApp.rows.length).toBe(13);
    expect(d.regimes.rows.length).toBe(5);
    expect(d.charts.length).toBe(8);
    expect(d.learningPath.rows.length).toBe(5);
  });
  it("lists sub-pages whose source sections exist", () => {
    for (const p of REFERENCE_PAGES) for (const s of p.sections) expect(outlineSection(s), `${p.id}: ${s}`).toBeDefined();
  });
});

describe("glossary", () => {
  const g = glossaryData();
  it("has all 65 terms and 84 abbreviations", () => {
    expect(g.terms.length).toBe(65);
    expect(g.abbreviations.length).toBe(84);
  });
  it("uses term-<slug> / abbr-<slug> anchors, unique across the whole page", () => {
    for (const t of g.terms) expect(t.anchor.startsWith(`term-${slug(t.term)}`)).toBe(true);
    for (const a of g.abbreviations) expect(a.anchor.startsWith(`abbr-${slug(a.abbr)}`)).toBe(true);
    const all = [...g.terms.map((t) => t.anchor), ...g.abbreviations.map((a) => a.anchor), "abbreviations"];
    expect(new Set(all).size).toBe(all.length);
  });
  it("cross-links terms and abbreviations only on exact tokens", () => {
    const bpp = g.terms.find((t) => t.term === "Beam parameter product (BPP)")!;
    expect(bpp.abbr?.label).toBe("BPP");
    const mpeNohd = g.abbreviations.find((a) => a.abbr === "MPE / NOHD")!;
    expect(mpeNohd.terms.map((t) => t.label)).toEqual(expect.arrayContaining(["Maximum permissible exposure (MPE)", "Nominal ocular hazard distance (NOHD)"]));
    expect(g.terms.find((t) => t.term === "Intensity (irradiance)")!.abbr).toBeUndefined();
    const anchors = new Set(g.abbreviations.map((a) => a.anchor));
    for (const t of g.terms) if (t.abbr) expect(anchors.has(t.abbr.anchor)).toBe(true);
  });
});

describe("formula library", () => {
  const groups = formulaGroups();
  it("covers every equation figure exactly once, §B.3 first", () => {
    const ids = groups.flatMap((g) => g.figures.map((f) => f.id));
    const eq = handbook.figures.filter((f) => f.kind === "equation");
    expect(eq.length).toBe(43);
    expect(ids.length).toBe(43);
    expect(new Set(ids)).toEqual(new Set(eq.map((f) => f.id)));
    const sheet = groups.filter((g) => g.sheet);
    expect(sheet.map((g) => g.title)).toEqual(["Photons and waves", "Laser physics", "Pulses", "Gaussian beams and focusing", "Optics and materials", "Thermal and ablation", "Safety and economics"]);
    expect(groups.slice(0, 7).every((g) => g.sheet)).toBe(true);
    expect(sheet.reduce((n, g) => n + g.figures.length, 0)).toBe(8);
    expect(new Set(groups.map((g) => g.id)).size).toBe(groups.length);
  });
  it("links only calculators that exist", () => {
    for (const ids of Object.values(SHEET_CALCULATORS)) for (const id of ids) expect(CALCULATOR_INDEX.has(id), id).toBe(true);
    for (const g of groups) for (const c of g.calculators) expect(CALCULATOR_INDEX.has(c.id)).toBe(true);
    expect(groups.find((g) => g.sectionId === "4.5")!.calculators.map((c) => c.id)).toContain("focus-spot");
  });
});

describe("figure gallery", () => {
  it("lists all 72 figures with dimensions and section links", () => {
    const f = figureGallery();
    expect(f.length).toBe(72);
    expect(f.filter((x) => x.kind === "diagram").length).toBe(29);
    expect(f.filter((x) => x.kind === "equation").length).toBe(43);
    for (const x of f) {
      expect(x.sectionHref.startsWith("/learn/")).toBe(true);
      expect(x.width && x.height).toBeTruthy();
    }
    expect(new Set(f.map((x) => x.id)).size).toBe(72);
  });
});

describe("master technology map (§28.0)", () => {
  const d = technologyMapData();
  const all = (n: MapNode): MapNode[] => [n, ...n.children.flatMap(all)];
  it("parses the box-drawing tree into the handbook's branches", () => {
    expect(d.root.label).toBe("PHOTON");
    expect(d.root.children.map((c) => c.label)).toEqual([
      "LIGHT",
      "LASER PHYSICS",
      "GAIN MEDIA",
      "LASER SOURCES",
      "BEAM ENGINEERING",
      "OPTICS",
      "BEAM DELIVERY",
      "SCANNING & MOTION",
      "PROCESS HEAD",
      "MATERIAL INTERACTION",
      "AUTOMATION",
      "LASER PROCESSES",
      "MACHINES",
      "COMPONENTS",
      "PRODUCTS",
      "INDUSTRIES",
    ]);
    const byLabel = new Map(all(d.root).map((n) => [n.label, n]));
    expect(byLabel.get("GAIN MEDIA")!.children.length).toBe(5);
    expect(byLabel.get("LASER SOURCES")!.children.length).toBe(7);
    expect(byLabel.get("LASER PROCESSES")!.children.length).toBe(8);
    expect(byLabel.get("LASER PHYSICS")!.items).toContain("gain");
    expect(byLabel.get("LASER PHYSICS")!.parts).toEqual([2]);
    expect(byLabel.get("OPTICS")!.parts).toEqual([5]);
    expect(byLabel.get("OPTICS")!.items.at(-1)).toBe("materials");
    expect(byLabel.get("AUTOMATION")!.parts).toEqual([11, 12]);
    expect(byLabel.get("COMPONENTS")!.parts).toEqual([13, 14, 15, 16, 17, 18]);
    expect(byLabel.get("INDUSTRIES")!.parts).toEqual([20, 21, 22, 23, 24, 25]);
    expect(byLabel.get("MACHINES")!.items).toContain("battery welder");
    expect(byLabel.get("MACHINES")!.parts).toEqual([26]);
    expect(byLabel.get("LASER SOURCES")!.items).toEqual([]);
  });
  it("every parsed label and item occurs verbatim in the preformatted text", () => {
    const flat = d.preformatted.replace(/[│├└─\s]+/gu, " ");
    for (const n of all(d.root)) {
      expect(d.preformatted.includes(n.label), n.label).toBe(true);
      for (const it of n.items) expect(flat.includes(it.replace(/\s+/g, " ")), it).toBe(true);
      for (const p of n.parts) expect(p >= 1 && p <= 28).toBe(true);
    }
    expect(new Set(all(d.root).map((n) => n.id)).size).toBe(all(d.root).length);
  });
  it("platform link maps name real branches and sections", () => {
    const labels = new Set(mapLabels(d.root));
    for (const k of [...Object.keys(MAP_EXPLORE), ...Object.keys(MAP_SECTIONS)]) expect(labels.has(k), k).toBe(true);
    for (const ids of Object.values(MAP_SECTIONS)) for (const id of ids) expect(outlineSection(id), id).toBeDefined();
  });
  it("quotes both §28.0 paragraphs and the front-matter hierarchy", () => {
    expect(d.intro.startsWith("The whole handbook on one tree")).toBe(true);
    expect(d.intro.endsWith("governs it.")).toBe(true);
    expect(d.chain.map((c) => c.text)).toEqual([
      "product",
      "component",
      "material",
      "process",
      "absorption and HAZ",
      "pulse regime and wavelength",
      "source",
      "beam, optics and head",
      "machine",
      "cost per part",
    ]);
    expect(d.outro).toContain(d.chain.map((c) => c.text).join(" → "));
    const ids = new Set(all(d.root).map((n) => n.id));
    for (const c of d.chain) if (c.target) expect(ids.has(c.target)).toBe(true);
    expect(d.chain[0]!.target).toBe(all(d.root).find((n) => n.label === "PRODUCTS")!.id);
    expect(d.chain.at(-1)!.target).toBeNull();
    const h = hierarchyFigure();
    expect(h.figure.sectionId).toBe("front.laser-technology-hierarchy");
    expect(h.note.startsWith("Read top-down to learn")).toBe(true);
  });
  it("handles a minimal tree with continuation lines", () => {
    const t = parseTechnologyMap("ROOT\n│\n├── A ─ x · y ·\n│       z ...... Part II\n│   └── A1 ─ q\n└── B ─ w Parts XI–XII");
    expect(t.children.map((c) => c.label)).toEqual(["A", "B"]);
    expect(t.children[0]!.items).toEqual(["x", "y", "z"]);
    expect(t.children[0]!.parts).toEqual([2]);
    expect(t.children[0]!.children[0]!.label).toBe("A1");
    expect(t.children[1]!.parts).toEqual([11, 12]);
  });
});

describe("laser selection decision tree (§B.5)", () => {
  const fig = decisionTreeFigure();
  it("every encoded branch and leaf string occurs in the figure transcription", () => {
    for (const s of decisionTreeStrings()) expect(fig.alt, s).toContain(s);
  });
  it("re-serialises to exactly the transcription", () => {
    expect(serializeDecisionTree()).toBe(fig.alt);
  });
  it("builds the interactive data with checks and links", () => {
    const d = decisionTreeData();
    expect(d.classes.length).toBe(4);
    expect(d.classes.reduce((n, c) => n + c.branches.length, 0)).toBe(10);
    expect(d.confirm.startsWith("Confirm every branch with the absorption check")).toBe(true);
    expect(d.figureId).toBe(fig.id);
    for (const c of d.classes) for (const b of c.branches) expect(b.explore.length, b.id).toBeGreaterThan(0);
    for (const c of DECISION_TREE.classes) expect(d.classes.find((x) => x.id === c.id)!.sections.length).toBeGreaterThan(0);
  });
  it("reads the §23.3 selection framework", () => {
    const s = selectionFramework();
    expect(s.questions.rows.length).toBe(6);
    expect(s.examples.rows.length).toBe(6);
    expect(s.figure.sectionId).toBe("23.3");
  });
});

describe("status and sources", () => {
  it("reports extraction counts, flags and review flags", () => {
    const s = statusData();
    expect(s.source.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(s.counts.length).toBeGreaterThan(10);
    expect(s.flags.length).toBeGreaterThan(0);
    expect(s.reviewFlags.length).toBeGreaterThan(0);
    expect(s.equations.total).toBe(43);
    expect(s.equations.withLatex).toBe(43);
  });
  it("groups external links by URL and keeps every citing location", () => {
    const d = sourcesData();
    expect(d.total).toBe(externalLinks().length);
    expect(new Set(d.links.map((l) => l.href)).size).toBe(d.links.length);
    expect(d.links.reduce((n, l) => n + l.locations.length, 0)).toBe(d.total);
    expect(d.blocks.some((b) => b.type === "list")).toBe(true);
    for (const l of d.links) for (const loc of l.locations) expect(outlineSection(loc), loc).toBeDefined();
  });
});
