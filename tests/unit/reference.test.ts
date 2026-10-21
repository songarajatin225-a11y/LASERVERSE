import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import {
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
  implementedAreas,
  NOT_IMPLEMENTED,
} from "@/lib/content/reference";
import { handbook, getTable, tableRecords, extractionFlags, extractionReport } from "@/lib/content/handbook";
import { slug } from "@/lib/slug";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { REFERENCE_PAGES } from "@/features/reference/pages";
import { outline, outlineSection } from "@/lib/content/outline";
import { glossaryAnchors, abbreviationAnchors } from "@/features/search/anchors";
import { buildSearchIndex } from "@/lib/search/buildIndex";
import { PROCESS_DEFS } from "@/lib/content/processes";
import { NAV_ITEMS } from "@/lib/nav";
import { REVIEW_FLAGS } from "@/content/review-flags";
import type { MapNode } from "@/features/reference/types";

describe("anchors", () => {
  it("uses the search index's anchor functions: -2, -3 on repeats, first stays plain", () => {
    expect(glossaryAnchors(["Kerf", "kerf", "KERF", "Dross"])).toEqual(["term-kerf", "term-kerf-2", "term-kerf-3", "term-dross"]);
    expect(abbreviationAnchors(["MPE / NOHD", "HAZ"])).toEqual(["abbr-mpe-nohd", "abbr-haz"]);
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
    expect(d.quickRefHeadings).toEqual({ families: "Laser families at a glance", power: "Typical average power by application", regimes: "Pulse-duration regimes" });
    expect(d.selectionMatrix).toEqual({ sectionId: "B.6", title: "Process selection matrix" });
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
    const all = [...g.terms.map((t) => t.anchor), ...g.abbreviations.map((a) => a.anchor), "glossary", "abbreviations"];
    expect(new Set(all).size).toBe(all.length);
  });
  it("anchors equal the search index's glossary and abbreviation hrefs, in table order", () => {
    const docs = buildSearchIndex();
    const hashes = (kind: string) =>
      docs
        .filter((d) => d.kind === kind)
        .map((d) => {
          expect(d.href.startsWith("/reference/glossary#"), d.href).toBe(true);
          return d.href.slice("/reference/glossary#".length);
        });
    expect(g.terms.map((t) => t.anchor)).toEqual(hashes("glossary"));
    expect(g.abbreviations.map((a) => a.anchor)).toEqual(hashes("abbreviation"));
    // and both equal the shared functions applied to the handbook tables
    expect(g.terms.map((t) => t.anchor)).toEqual(glossaryAnchors(tableRecords(getTable("B.1", 1)).map((r) => r["Term"] ?? "")));
    expect(g.abbreviations.map((a) => a.anchor)).toEqual(abbreviationAnchors(tableRecords(getTable("B.2", 1)).map((r) => r["Abbreviation"] ?? "")));
  });
  it("shows each §B.1/§B.2 row verbatim", () => {
    const t = tableRecords(getTable("B.1", 1));
    expect(g.terms.map((x) => [x.term, x.definition])).toEqual(t.map((r) => [r["Term"], r["Definition"]]));
    const a = tableRecords(getTable("B.2", 1));
    expect(g.abbreviations.map((x) => [x.abbr, x.meaning])).toEqual(a.map((r) => [r["Abbreviation"], r["Meaning"]]));
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
    expect(s.flags).toEqual(extractionFlags); // the full list, not a sample
    expect(Object.fromEntries(s.counts)).toEqual(extractionReport.counts);
    expect(s.source.sha256).toBe(handbook.source.sha256);
    expect(s.reviewFlags.map((f) => f.id)).toEqual(REVIEW_FLAGS.map((f) => f.id));
    expect(s.generatedAt).toBe(handbook.generatedAt);
  });
  it("states the platform implementation status honestly", () => {
    const hrefs = implementedAreas().map((a) => a.href);
    for (const h of ["/", "/search", "/architecture", "/safety", "/troubleshooting", "/reference", "/materials", "/processes", "/applications", "/machine"]) {
      expect(hrefs, h).toContain(h);
    }
    for (const n of NAV_ITEMS) expect(hrefs).toContain(n.href);
    for (const h of hrefs) expect(fs.existsSync(h === "/" ? "app/page.tsx" : `app/(app)${h}/page.tsx`), h).toBe(true);
    const missing = NOT_IMPLEMENTED.map((n) => `${n.title} ${n.detail}`.toLowerCase());
    for (const needle of ["ai assistant", "semantic search", "accounts", "performance", "visual-regression", "axe"]) {
      expect(missing.some((m) => m.includes(needle)), needle).toBe(true);
    }
    expect(missing.find((m) => m.includes("ai assistant"))).toContain("does not depend on ai");
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

/* ------------------------------------------------------------------ server render of every page */
vi.mock("next/link", () => ({
  default: ({ href, children, className, title, ...rest }: { href: string; children?: ReactNode; className?: string; title?: string; [k: string]: unknown }) =>
    createElement("a", { href, className, title, "aria-label": rest["aria-label"], "aria-current": rest["aria-current"] }, children),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/reference",
  useRouter: () => ({ push() {}, replace() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const PAGES = {
  "/reference": () => import("@/app/(app)/reference/page"),
  "/reference/glossary": () => import("@/app/(app)/reference/glossary/page"),
  "/reference/formulas": () => import("@/app/(app)/reference/formulas/page"),
  "/reference/figures": () => import("@/app/(app)/reference/figures/page"),
  "/reference/map": () => import("@/app/(app)/reference/map/page"),
  "/reference/decision-tree": () => import("@/app/(app)/reference/decision-tree/page"),
  "/reference/status": () => import("@/app/(app)/reference/status/page"),
  "/reference/sources": () => import("@/app/(app)/reference/sources/page"),
} as const;
type Route = keyof typeof PAGES;

const html = new Map<Route, string>();
async function render(route: Route): Promise<string> {
  const hit = html.get(route);
  if (hit) return hit;
  // the project's vitest config compiles TSX with the classic runtime
  (globalThis as { React?: typeof React }).React = React;
  const mod = await PAGES[route]();
  const out = renderToStaticMarkup(createElement(mod.default));
  html.set(route, out);
  return out;
}
const idsOf = (h: string) => [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
const hrefsOf = (h: string) => [...new Set([...h.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, "&")))];

/** Anchors other areas own (product brief link conventions). */
const FOREIGN_ANCHORS: Record<string, string[]> = {
  "/safety": ["classes", "hazards", "standards", "safety-architecture", "od-nohd", "metrology", "feasibility", "doe", "checklists"],
  "/architecture": ["control-stack", "optical-chain", "mechanical", "electrical", "software", "vision-loop", "integration", "handshake", "recipes", "interlocks", "configurator"],
  "/processes": fs.existsSync("app/(app)/processes/page.tsx") && fs.readFileSync("app/(app)/processes/page.tsx", "utf8").includes('id="selection-matrix"') ? ["selection-matrix"] : [],
};
const SOURCE_FAMILIES = ["solid-state", "fiber", "gas", "semiconductor", "ultrafast", "specialised"];
const MATERIAL_TABS = ["absorption", "thermal", "ablation", "regimes"];

describe("Reference Library pages (server render)", () => {
  it.each(Object.keys(PAGES) as Route[])("%s: one h1, unique ids, no unknown source, breadcrumbs and bookmark", async (route) => {
    const h = await render(route);
    expect(h.match(/<h1[\s>]/g)?.length, "h1 count").toBe(1);
    const ids = idsOf(h);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), "duplicate ids").toEqual([]);
    expect(h).not.toContain("unknown source");
    const crumbs = /<nav aria-label="Breadcrumb"[\s\S]*?<\/nav>/.exec(h)?.[0] ?? "";
    expect(crumbs).toContain("Reference Library");
    expect(h).toMatch(/<button type="button" aria-pressed="false"[^>]*>(?:(?!<\/button>)[\s\S])*Bookmark/);
  });

  it.each(Object.keys(PAGES) as Route[])("%s: page module tracks a reference visit and exports only allowed names", async (route) => {
    const file = route === "/reference" ? "app/(app)/reference/page.tsx" : `app/(app)${route}/page.tsx`;
    const src = fs.readFileSync(file, "utf8");
    expect(src).toContain("<TrackVisit item={ITEM} />");
    expect(src).toMatch(/kind: "reference" as const/);
    expect(src).toContain("<BookmarkButton item={ITEM} />");
    expect(src).not.toMatch(/^"use client"/);
    const mod = await PAGES[route]();
    const allowed = new Set(["default", "metadata", "generateMetadata", "generateStaticParams", "dynamic", "revalidate", "dynamicParams"]);
    expect(Object.keys(mod).filter((k) => !allowed.has(k))).toEqual([]);
  });

  it("no client component in the area imports a server-only module", () => {
    const serverOnly = (f: string) => fs.existsSync(f) && /^\s*import\s+["']server-only["']/.test(fs.readFileSync(f, "utf8"));
    const resolve = (spec: string, from: string): string | null => {
      let base: string;
      if (spec.startsWith("@/")) base = spec.slice(2);
      else if (spec.startsWith(".")) base = `${from.replace(/\/[^/]+$/, "")}/${spec}`.replace(/\/\.\//g, "/");
      else return null;
      for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return base + ext;
      return null;
    };
    const visit = (file: string, seen: Set<string>, chain: string[]): string[] => {
      if (seen.has(file)) return [];
      seen.add(file);
      if (serverOnly(file)) return [chain.concat(file).join(" → ")];
      const src = fs.readFileSync(file, "utf8");
      const specs = [...src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]!);
      return specs.flatMap((s) => {
        const r = resolve(s, file);
        return r && /\.(ts|tsx)$/.test(r) ? visit(r, seen, chain.concat(file)) : [];
      });
    };
    const clients = fs
      .readdirSync("features/reference")
      .map((f) => `features/reference/${f}`)
      .filter((f) => /^"use client"/.test(fs.readFileSync(f, "utf8")));
    expect(clients.length).toBeGreaterThanOrEqual(4);
    for (const c of clients) expect(visit(c, new Set(), []), c).toEqual([]);
  });

  it("glossary page renders every search-index glossary/abbreviation anchor and section#abbreviations", async () => {
    const h = await render("/reference/glossary");
    const ids = new Set(idsOf(h));
    const docs = buildSearchIndex().filter((d) => d.kind === "glossary" || d.kind === "abbreviation");
    expect(docs.length).toBe(65 + 84);
    for (const d of docs) expect(ids.has(d.href.split("#")[1]!), d.href).toBe(true);
    expect(h).toMatch(/<section[^>]*\sid="abbreviations"/);
  });

  it("formulas and figures pages carry an anchor for every figure id the search index links to", async () => {
    const f = new Set(idsOf(await render("/reference/formulas")));
    const g = new Set(idsOf(await render("/reference/figures")));
    for (const d of buildSearchIndex()) {
      if (d.href.startsWith("/reference/formulas#")) expect(f.has(d.href.split("#")[1]!), d.href).toBe(true);
      if (d.href.startsWith("/reference/figures#")) expect(g.has(d.href.split("#")[1]!), d.href).toBe(true);
    }
    for (const fig of handbook.figures) expect(g.has(fig.id), fig.id).toBe(true);
    for (const fig of handbook.figures.filter((x) => x.kind === "equation")) expect(f.has(fig.id), fig.id).toBe(true);
  });

  it("required labels: decision-tree review banner, §B.6 link, status honesty, external-link note", async () => {
    const dt = await render("/reference/decision-tree");
    expect(dt).toContain("Transcribed from the handbook figure — needs review");
    expect(dt).toContain(decisionTreeData().confirm.slice(0, 40));
    expect(dt).toContain("/processes#selection-matrix");
    expect(await render("/reference")).toContain("/processes#selection-matrix");
    const st = await render("/reference/status");
    expect(st).toContain(handbook.source.sha256);
    expect(st).toContain("Not a certification");
    for (const n of NOT_IMPLEMENTED) expect(st).toContain(n.title);
    for (const f of REVIEW_FLAGS) expect(st).toContain(`id="flag-${f.id}"`);
    const src = await render("/reference/sources");
    expect(src).toContain("not verified by LASERVERSE");
    const map = await render("/reference/map");
    const d = technologyMapData();
    expect(map).toContain(d.intro.slice(0, 40));
    expect(map).toContain(d.outro.slice(0, 40));
    expect(map).toContain('aria-expanded="false"');
    expect(map).toContain("Expand all");
    for (const n of d.root.children) for (const p of n.parts) expect(map, `${n.label} → part ${p}`).toContain(`href="/learn/part-${p}"`);
  });

  it("external links open in a new tab with rel=noopener noreferrer", async () => {
    const src = await render("/reference/sources");
    const anchors = [...src.matchAll(/<a\s[^>]*href="https?:[^"]+"[^>]*>/g)].map((m) => m[0]);
    expect(anchors.length).toBeGreaterThanOrEqual(sourcesData().links.length);
    for (const a of anchors) {
      expect(a, a).toContain('target="_blank"');
      expect(a, a).toContain('rel="noopener noreferrer"');
    }
  });

  it("links only to routes, anchors, calculators, lessons and files that exist", async () => {
    const pageIds = new Map<string, Set<string>>();
    for (const r of Object.keys(PAGES) as Route[]) pageIds.set(r, new Set(idsOf(await render(r))));
    const learn = new Set<string>(["/learn"]);
    for (const p of outline.parts) {
      learn.add(`/learn/${p.id}`);
      for (const s of p.sections) learn.add(`/learn/${p.id}/${s.slug}`);
    }
    const bad: string[] = [];
    let checked = 0;
    for (const r of Object.keys(PAGES) as Route[]) {
      for (const href of hrefsOf(await render(r))) {
        if (/^https?:/.test(href)) continue;
        checked++;
        if (href.startsWith("#")) {
          if (!pageIds.get(r)!.has(href.slice(1))) bad.push(`${r}: ${href}`);
          continue;
        }
        const u = new URL(href, "https://laserverse.local");
        const path = u.pathname;
        const hash = u.hash.slice(1);
        let ok: boolean;
        if (path.startsWith("/handbook/")) ok = fs.existsSync(`public${path}`);
        else if (path.startsWith("/learn")) ok = learn.has(path);
        else if (path.startsWith("/calculators/")) ok = CALCULATOR_INDEX.has(path.slice("/calculators/".length));
        else if (path.startsWith("/processes/")) ok = PROCESS_DEFS.some((p) => `/processes/${p.id}` === path);
        else ok = fs.existsSync(path === "/" ? "app/page.tsx" : `app/(app)${path}/page.tsx`);
        if (ok && hash) {
          const known = pageIds.get(path as Route) ?? (FOREIGN_ANCHORS[path] ? new Set(FOREIGN_ANCHORS[path]) : null);
          ok = Boolean(known?.has(hash));
        }
        if (ok && path === "/sources" && u.searchParams.get("family")) ok = SOURCE_FAMILIES.includes(u.searchParams.get("family")!);
        if (ok && path === "/materials" && u.searchParams.get("tab")) ok = MATERIAL_TABS.includes(u.searchParams.get("tab")!);
        if (!ok) bad.push(`${r}: ${href}`);
      }
    }
    expect(checked).toBeGreaterThan(200);
    expect(bad).toEqual([]);
  });

  it("the decision-tree lesson embed renders the compact tree", async () => {
    (globalThis as { React?: typeof React }).React = React;
    const { LessonEmbed } = await import("@/features/learning/LessonEmbed");
    const h = renderToStaticMarkup(createElement(LessonEmbed, { kind: "decision-tree" }));
    expect(h).toContain("Laser selection by material class");
    expect(h).toContain("Open the full decision tree");
    for (const c of DECISION_TREE.classes) expect(h).toContain(c.label);
  });
});
