import { describe, expect, it } from "vitest";
import { buildSearchIndex, searchIndexSource, SEARCH_INDEX_VERSION } from "@/lib/search/buildIndex";
import { LocalSearch, KIND_LABEL, type SearchDoc, type SearchKind } from "@/lib/search/engine";
import { handbook, handbookOutline, allSections, getParts, getTable } from "@/lib/content/handbook";
import { CALCULATORS, CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { QUIZZES } from "@/content/assessments/questions";
import { PROCESS_DEFS } from "@/lib/content/processes";
import { COMPONENTS, COMPONENT_INDEX } from "@/features/machine-explorer/machineData";
import { applicationMatrix, caseStudies } from "@/lib/content/applications";
import { sourceCatalogue } from "@/lib/content/sources";
import { symptomCards, weldDefectCards } from "@/lib/content/troubleshooting";
import { cellText } from "@/lib/content/schema";
import { slug } from "@/lib/slug";
import { NAV_ITEMS } from "@/lib/nav";
import { uniqueSlugs, glossaryAnchors, abbreviationAnchors } from "@/features/search/anchors";
import { KIND_ORDER, KIND_CLASS } from "@/features/search/kinds";
import { GET } from "@/app/search-index.json/route";

const docs = buildSearchIndex();
const engine = new LocalSearch(docs);
const byKind = (k: SearchKind) => docs.filter((d) => d.kind === k);

/* ------------------------------------------------------------------ route patterns */
const ARCH_ANCHORS = ["control-stack", "optical-chain", "mechanical", "electrical", "software", "vision-loop", "integration", "handshake", "recipes", "interlocks", "configurator"];
const SAFETY_ANCHORS = ["classes", "hazards", "standards", "safety-architecture", "od-nohd", "metrology", "feasibility", "doe", "checklists"];
const TABS: Record<string, string[]> = {
  "/physics-lab": ["photon", "wave", "levels", "cavity", "pulse"],
  "/beam-optics": ["beam", "components", "materials"],
  "/materials": ["absorption", "thermal", "ablation", "regimes"],
};
const REFERENCE_PAGES = ["glossary", "formulas", "figures", "map", "decision-tree", "status", "sources"];

const outline = handbookOutline();
const learnPaths = new Set(["/learn", ...outline.flatMap((p) => [p.href, ...p.sections.map((s) => s.href)])]);
const glossaryIds = new Set([
  ...glossaryAnchors(getTable("B.1", 1, ["Term"]).rows.map((r) => cellText(r[0]))),
  ...abbreviationAnchors(getTable("B.2", 1, ["Abbreviation"]).rows.map((r) => cellText(r[0]))),
]);
const equationIds = new Set(handbook.figures.filter((f) => f.kind === "equation").map((f) => f.id));
const diagramIds = new Set(handbook.figures.filter((f) => f.kind === "diagram").map((f) => f.id));
const troubleIds = new Set([...symptomCards(), ...weldDefectCards()].map((c) => c.id));
const chainIds = new Set(applicationMatrix().map((c) => c.id));
const caseIds = new Set(caseStudies().map((c) => c.id));
const sources = new Map(sourceCatalogue().map((e) => [e.id, e]));
const quizIds = new Set(QUIZZES.map((q) => q.id));
const processIds = new Set<string>(PROCESS_DEFS.map((p) => p.id));

/** Returns null when the href resolves to a known route (and known anchor / query values), else a reason. */
function routeProblem(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return "not internal";
  const u = new URL(href, "http://laserverse.local");
  const path = u.pathname;
  const hash = decodeURIComponent(u.hash.slice(1));
  const q = u.searchParams;
  const onlyParams = (...allowed: string[]) => [...q.keys()].every((k) => allowed.includes(k));
  const noExtras = () => (u.search === "" && hash === "" ? null : "unexpected query or anchor");

  if (path === "/" || path === "/home" || path === "/search") return noExtras();
  if (path.startsWith("/learn")) return learnPaths.has(path) ? noExtras() : "unknown lesson";
  if (path === "/reference") return noExtras();
  if (path.startsWith("/reference/")) {
    const page = path.slice("/reference/".length);
    if (!REFERENCE_PAGES.includes(page)) return "unknown reference page";
    if (u.search) return "unexpected query";
    if (!hash) return null;
    if (page === "glossary") return glossaryIds.has(hash) ? null : `unknown glossary anchor ${hash}`;
    if (page === "formulas") return equationIds.has(hash) ? null : `unknown equation ${hash}`;
    if (page === "figures") return diagramIds.has(hash) ? null : `unknown figure ${hash}`;
    return "unexpected anchor";
  }
  if (path === "/architecture") return u.search === "" && (!hash || ARCH_ANCHORS.includes(hash)) ? null : `bad architecture anchor ${hash}`;
  if (path === "/safety") return u.search === "" && (!hash || SAFETY_ANCHORS.includes(hash)) ? null : `bad safety anchor ${hash}`;
  if (path === "/troubleshooting") return u.search === "" && (!hash || troubleIds.has(hash)) ? null : `bad troubleshooting anchor ${hash}`;
  if (path === "/machine") {
    const sel = q.get("select");
    return onlyParams("select") && !hash && (sel === null || COMPONENT_INDEX.has(sel)) ? null : `bad component ${sel}`;
  }
  if (path === "/applications") {
    const chain = q.get("chain");
    return onlyParams("chain") && !hash && (chain === null || chainIds.has(chain)) ? null : `bad chain ${chain}`;
  }
  const caseMatch = /^\/applications\/(case-\d+)$/.exec(path);
  if (caseMatch) return caseIds.has(caseMatch[1]!) ? noExtras() : "unknown case";
  if (path === "/calculators" || path === "/assessments" || path === "/processes") return noExtras();
  const calc = /^\/calculators\/([^/]+)$/.exec(path);
  if (calc) return CALCULATOR_INDEX.has(calc[1]!) ? noExtras() : `unknown calculator ${calc[1]}`;
  const quiz = /^\/assessments\/([^/]+)$/.exec(path);
  if (quiz) return quizIds.has(quiz[1]!) ? noExtras() : `unknown quiz ${quiz[1]}`;
  const proc = /^\/processes\/([^/]+)$/.exec(path);
  if (proc) return processIds.has(proc[1]!) ? noExtras() : `unknown process ${proc[1]}`;
  if (path === "/sources") {
    if (!onlyParams("family", "source", "view") || hash) return "unexpected sources params";
    const view = q.get("view");
    if (view !== null && view !== "wavelengths") return `bad view ${view}`;
    const id = q.get("source");
    const fam = q.get("family");
    if (id !== null) {
      const e = sources.get(id);
      if (!e) return `unknown source ${id}`;
      if (fam !== e.family) return `source ${id} is not in family ${fam}`;
    } else if (fam !== null && ![...sources.values()].some((e) => e.family === fam)) return `unknown family ${fam}`;
    return null;
  }
  const tabs = TABS[path];
  if (tabs) {
    const tab = q.get("tab");
    return onlyParams("tab") && !hash && (tab === null || tabs.includes(tab)) ? null : `bad tab ${tab}`;
  }
  return "unknown route";
}

/* ------------------------------------------------------------------ tests */
describe("search index", () => {
  it("has documents of every kind, with counts tied to the adapters", () => {
    expect([...KIND_ORDER].sort()).toEqual(Object.keys(KIND_LABEL).sort());
    expect(Object.keys(KIND_CLASS).sort()).toEqual(Object.keys(KIND_LABEL).sort());
    for (const k of KIND_ORDER) expect(byKind(k).length, k).toBeGreaterThan(0);

    expect(byKind("lesson").length).toBe(allSections().length);
    expect(byKind("part").length).toBe(getParts().length);
    expect(byKind("glossary").length).toBe(getTable("B.1", 1).rows.length);
    expect(byKind("abbreviation").length).toBe(getTable("B.2", 1).rows.length);
    expect(byKind("formula").length).toBe(equationIds.size);
    expect(byKind("figure").length).toBe(diagramIds.size);
    expect(byKind("calculator").length).toBe(CALCULATORS.length);
    expect(byKind("source").length).toBe(sources.size);
    expect(byKind("application").length).toBe(chainIds.size + caseIds.size);
    expect(byKind("troubleshooting").length).toBe(troubleIds.size);
    expect(byKind("component").length).toBe(COMPONENTS.length);
    expect(byKind("quiz").length).toBe(QUIZZES.length);
  });

  it("has unique ids and non-empty titles and text", () => {
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
    for (const d of docs) {
      expect(d.title.trim().length, d.id).toBeGreaterThan(0);
      expect(d.text.trim().length, d.id).toBeGreaterThan(0);
      expect(d.location.trim().length, d.id).toBeGreaterThan(0);
    }
  });

  it("links every document to a known internal route", () => {
    const problems = docs.map((d) => [d.id, d.href, routeProblem(d.href)] as const).filter(([, , p]) => p !== null);
    expect(problems).toEqual([]);
    for (const n of NAV_ITEMS) expect(docs.some((d) => d.href === n.href), n.href).toBe(true);
  });

  it("covers every tool deep link named in the brief", () => {
    const hrefs = new Set(docs.map((d) => d.href));
    for (const a of ARCH_ANCHORS) expect(hrefs.has(`/architecture#${a}`), a).toBe(true);
    for (const a of SAFETY_ANCHORS) expect(hrefs.has(`/safety#${a}`), a).toBe(true);
    for (const [path, tabs] of Object.entries(TABS)) for (const t of tabs) expect(hrefs.has(`${path}?tab=${t}`), `${path}?tab=${t}`).toBe(true);
    for (const p of PROCESS_DEFS) expect(hrefs.has(`/processes/${p.id}`), p.id).toBe(true);
    for (const c of CALCULATORS) expect(hrefs.has(`/calculators/${c.id}`), c.id).toBe(true);
    for (const c of COMPONENTS) expect(hrefs.has(`/machine?select=${c.id}`), c.id).toBe(true);
  });

  it("uses the same anchors as the troubleshooting page and the glossary dedupe rule", () => {
    const symptom = docs.find((d) => d.id === "troubleshooting:low-power");
    expect(symptom?.href).toBe(`/troubleshooting#${slug("Low power")}`);
    const weld = docs.find((d) => d.title === "Humping");
    expect(weld?.href).toBe("/troubleshooting#weld-humping");
    expect(docs.find((d) => d.title === "Rayleigh range" && d.kind === "glossary")?.href).toBe("/reference/glossary#term-rayleigh-range");
    expect(docs.find((d) => d.title === "BPP" && d.kind === "abbreviation")?.href).toBe("/reference/glossary#abbr-bpp");
    expect(uniqueSlugs(["Spot size", "spot-size", "Spot  size", "M²"])).toEqual(["spot-size", "spot-size-2", "spot-size-3", "m2"]);
  });

  it("cites handbook sections as §id · p.N", () => {
    const lesson = docs.find((d) => d.id === "lesson:9.2");
    expect(lesson?.source).toMatch(/^§9\.2 · p\.\d+$/);
    expect(lesson?.href).toBe("/learn/part-9/9-2");
    expect(lesson?.text.length).toBeLessThanOrEqual(3001);
    expect(docs.find((d) => d.id === "glossary:term-keyhole")?.source).toMatch(/^§B\.1 · p\.\d+$/);
  });

  it("serves the index from the static route", async () => {
    const res = GET();
    const body = (await res.json()) as { version: number; generatedFrom: string; docs: SearchDoc[] };
    expect(body.version).toBe(SEARCH_INDEX_VERSION);
    expect(body.generatedFrom).toBe(searchIndexSource());
    expect(body.generatedFrom).toMatch(/^[0-9a-f]{64}$/);
    expect(body.docs.length).toBe(docs.length);
  });
});

describe("local search over the index", () => {
  const top = (q: string, n: number) => engine.search(q, { limit: n }).map((r) => r.doc.id);

  it("finds keyhole welding", () => {
    expect(top("keyhole", 3)).toContain("glossary:term-keyhole");
    expect(top("keyhole", 10)).toContain("lesson:10.4");
  });
  it("finds BPP as abbreviation, glossary term and lesson", () => {
    const hits = top("BPP", 8);
    expect(hits).toContain("abbreviation:abbr-bpp");
    expect(hits).toContain("lesson:4.4");
    expect(hits.some((id) => id.startsWith("glossary:term-beam-parameter-product"))).toBe(true);
  });
  it("finds the galvo scanner, lesson and calculator", () => {
    const hits = top("galvo", 8);
    expect(hits).toContain("component:galvo");
    expect(hits).toContain("calculator:galvo-resolution");
    expect(hits).toContain("lesson:7.2");
  });
  it("finds the DataMatrix case study", () => {
    expect(top("DataMatrix", 3)).toContain("application:case-2");
  });
  it("finds the Rayleigh range", () => {
    const hits = top("Rayleigh", 5);
    expect(hits[0]).toBe("glossary:term-rayleigh-range");
    expect(hits).toContain("lesson:4.3");
    expect(hits).toContain("calculator:focus-spot");
  });
  it("filters by kind and highlights the query in excerpts", () => {
    const calc = engine.search("galvo", { kinds: ["calculator"] });
    expect(calc.length).toBeGreaterThan(0);
    expect(calc.every((r) => r.doc.kind === "calculator")).toBe(true);
    const lessons = engine.search("keyhole", { kinds: ["lesson"] });
    expect(lessons.length).toBeGreaterThan(0);
    expect(lessons.every((r) => r.doc.kind === "lesson")).toBe(true);
    expect(lessons[0]!.excerpt.some((s) => s.hit && s.text.toLowerCase() === "keyhole")).toBe(true);
  });
  it("returns nothing for gibberish", () => {
    expect(engine.search("qqzzxxv")).toEqual([]);
  });
});
