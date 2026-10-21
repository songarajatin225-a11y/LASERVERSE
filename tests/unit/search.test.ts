import { beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { buildSearchIndex, searchIndexSource, SEARCH_INDEX_VERSION } from "@/lib/search/buildIndex";
import { LocalSearch, KIND_LABEL, type SearchDoc, type SearchKind } from "@/lib/search/engine";
import { handbook, allSections, getParts, getSection, getTable } from "@/lib/content/handbook";
import { CALCULATORS } from "@/features/calculators/definitions";
import { QUIZZES } from "@/content/assessments/questions";
import { PROCESS_DEFS } from "@/lib/content/processes";
import { COMPONENTS } from "@/features/machine-explorer/machineData";
import { applicationMatrix, caseStudies } from "@/lib/content/applications";
import { sourceCatalogue } from "@/lib/content/sources";
import { symptomCards, weldDefectCards } from "@/lib/content/troubleshooting";
import { glossaryData } from "@/lib/content/reference";
import { slug } from "@/lib/slug";
import { NAV_ITEMS } from "@/lib/nav";
import { uniqueSlugs } from "@/features/search/anchors";
import { KIND_ORDER, KIND_CLASS } from "@/features/search/kinds";
import { GET } from "@/app/search-index.json/route";

// The vitest transform compiles JSX to React.createElement (tsconfig keeps "jsx": "preserve"
// for Next), so the page modules rendered below need React as a global.
vi.stubGlobal("React", React);

// Outside Next there is no search-params context; give client components a real one.
const nav = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useSearchParams: () => new URLSearchParams(nav.search) };
});

const ROOT = path.resolve(__dirname, "../..");
const APP = path.join(ROOT, "app");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const docs = buildSearchIndex();
const engine = new LocalSearch(docs);
const byKind = (k: SearchKind) => docs.filter((d) => d.kind === k);

/* ================================================================== the app's real routes */
interface Route {
  pattern: string;
  re: RegExp;
  file: string;
  dynamic: boolean;
}

/** Every page.tsx under app/, as Next resolves it: route groups dropped, [param] segments dynamic. */
function pageRoutes(): Route[] {
  const out: Route[] = [];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const walk = (dir: string, segs: string[]) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name.startsWith("_") || name.startsWith("@")) continue; // private folders, parallel slots
        walk(p, /^\(.+\)$/.test(name) ? segs : [...segs, name]);
      } else if (/^page\.[jt]sx?$/.test(name)) {
        const body = segs.map((s) => `/${/^\[\.\.\..+\]$/.test(s) ? ".+" : /^\[.+\]$/.test(s) ? "[^/]+" : esc(s)}`).join("");
        out.push({ pattern: `/${segs.join("/")}`, re: new RegExp(`^${body || "/"}$`), file: p, dynamic: segs.some((s) => s.startsWith("[")) });
      }
    }
  };
  walk(APP, []);
  return out;
}

type PageModule = { default: ComponentType; generateStaticParams?: () => Array<Record<string, string>> | Promise<Array<Record<string, string>>> };
const loadPage = (file: string) => import(/* @vite-ignore */ file) as Promise<PageModule>;

const ROUTES = pageRoutes();
const routeFor = (pathname: string) => ROUTES.find((r) => r.re.test(pathname));
/** Concrete paths of every dynamic route, from the page's own generateStaticParams. */
const concrete = new Set<string>();
/** DOM ids rendered by each static page the index deep-links into with #anchor. */
const renderedIds = new Map<string, Map<string, number>>();

/** Anchored paths linked by the index, e.g. /architecture, /reference/glossary. */
const anchoredPaths = [...new Set(docs.filter((d) => d.href.includes("#")).map((d) => new URL(d.href, "http://x").pathname))];

beforeAll(async () => {
  for (const r of ROUTES.filter((x) => x.dynamic)) {
    const mod = await loadPage(r.file);
    expect(mod.generateStaticParams, `${r.pattern} has generateStaticParams`).toBeTypeOf("function");
    for (const p of await mod.generateStaticParams!()) {
      concrete.add(r.pattern.replace(/\[([^\]]+)\]/g, (_, k: string) => encodeURIComponent(p[k] ?? "")));
    }
  }
  for (const pathname of anchoredPaths) {
    const r = routeFor(pathname);
    if (!r || r.dynamic) continue; // reported by the route test
    const mod = await loadPage(r.file);
    const html = renderToStaticMarkup(createElement(mod.default));
    const ids = new Map<string, number>();
    for (const m of html.matchAll(/\sid="([^"]*)"/g)) {
      const id = m[1]!.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      ids.set(id, (ids.get(id) ?? 0) + 1);
    }
    renderedIds.set(pathname, ids);
  }
}, 60_000);

/* ================================================================== query parameters */
/** Tab ids of a lab, read from the component's own TABS constant. */
function tabIds(rel: string): Set<string> {
  const block = /const TABS\s*=\s*\[([\s\S]*?)\];/.exec(read(rel))?.[1];
  if (!block) throw new Error(`no TABS constant in ${rel}`);
  return new Set([...block.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]!));
}

const sources = new Map(sourceCatalogue().map((e) => [e.id, e]));
interface QuerySpec {
  /** the client component that reads the parameters, and the page that renders it */
  component: string;
  page: string;
  params: Record<string, Set<string>>;
}
const QUERY: Record<string, QuerySpec> = {
  "/physics-lab": { component: "features/physics-lab/PhysicsLabTabs.tsx", page: "app/(app)/physics-lab/page.tsx", params: { tab: tabIds("features/physics-lab/PhysicsLabTabs.tsx") } },
  "/beam-optics": { component: "features/beam-optics/BeamOpticsTabs.tsx", page: "app/(app)/beam-optics/page.tsx", params: { tab: tabIds("features/beam-optics/BeamOpticsTabs.tsx") } },
  "/materials": { component: "features/materials/MaterialsLab.tsx", page: "app/(app)/materials/page.tsx", params: { tab: tabIds("features/materials/MaterialsLab.tsx") } },
  "/machine": { component: "features/machine-explorer/MachineExplorer.tsx", page: "app/(app)/machine/page.tsx", params: { select: new Set(COMPONENTS.map((c) => c.id)) } },
  "/applications": { component: "features/applications/ApplicationExplorer.tsx", page: "app/(app)/applications/page.tsx", params: { chain: new Set(applicationMatrix().map((c) => c.id)) } },
  "/sources": {
    component: "features/sources/SourceExplorer.tsx",
    page: "app/(app)/sources/page.tsx",
    params: { family: new Set([...sources.values()].map((e) => e.family)), source: new Set(sources.keys()), view: new Set(["wavelengths"]) },
  },
};

/** Returns null when the href resolves to an existing page (and a rendered anchor / accepted query value), else the reason. */
function routeProblem(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return "not internal";
  const u = new URL(href, "http://laserverse.local");
  if (`${u.pathname}${u.search}${u.hash}` !== href) return "href is not in canonical (encoded) form";
  const r = routeFor(u.pathname);
  if (!r) return `no page file for ${u.pathname}`;
  if (r.dynamic && !concrete.has(u.pathname)) return `${u.pathname} is not generated by ${r.pattern} generateStaticParams`;

  if (u.search) {
    const spec = QUERY[u.pathname];
    if (!spec) return `query on a page that reads none: ${u.search}`;
    for (const [k, v] of u.searchParams) {
      const allowed = spec.params[k];
      if (!allowed) return `parameter ${k} is not read by ${spec.component}`;
      if (!allowed.has(v)) return `bad ${k}=${v}`;
    }
    const src = u.searchParams.get("source");
    if (src !== null && sources.get(src)?.family !== u.searchParams.get("family")) return `source ${src} is not in family ${u.searchParams.get("family")}`;
  }
  if (u.hash) {
    const id = decodeURIComponent(u.hash.slice(1));
    const ids = renderedIds.get(u.pathname);
    if (!ids) return `anchor on a page that was not rendered: ${u.pathname}`;
    if (!ids.has(id)) return `${u.pathname} renders no element with id "${id}"`;
  }
  return null;
}

/* ================================================================== tests */
describe("search index", () => {
  it("has documents of every kind, with counts tied to the adapters", () => {
    expect([...KIND_ORDER].sort()).toEqual(Object.keys(KIND_LABEL).sort());
    expect(Object.keys(KIND_CLASS).sort()).toEqual(Object.keys(KIND_LABEL).sort());
    for (const k of KIND_ORDER) expect(byKind(k).length, k).toBeGreaterThan(0);

    expect(byKind("lesson").length).toBe(allSections().length);
    expect(byKind("part").length).toBe(getParts().length);
    expect(byKind("glossary").length).toBe(getTable("B.1", 1).rows.length);
    expect(byKind("abbreviation").length).toBe(getTable("B.2", 1).rows.length);
    expect(byKind("formula").length).toBe(handbook.figures.filter((f) => f.kind === "equation").length);
    expect(byKind("figure").length).toBe(handbook.figures.filter((f) => f.kind === "diagram").length);
    expect(byKind("calculator").length).toBe(CALCULATORS.length);
    expect(byKind("source").length).toBe(sources.size);
    expect(byKind("application").length).toBe(applicationMatrix().length + caseStudies().length);
    expect(byKind("troubleshooting").length).toBe(symptomCards().length + weldDefectCards().length);
    expect(byKind("component").length).toBe(COMPONENTS.length);
    expect(byKind("quiz").length).toBe(QUIZZES.length);
  });

  it("has unique ids and non-empty titles, text and locations", () => {
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
    for (const d of docs) {
      expect(d.title.trim().length, d.id).toBeGreaterThan(0);
      expect(d.text.trim().length, d.id).toBeGreaterThan(0);
      expect(d.location.trim().length, d.id).toBeGreaterThan(0);
    }
  });

  it("reads the routes from app/ and every dynamic route's generateStaticParams", () => {
    // sanity: the filesystem scan sees the routes the index depends on
    for (const p of ["/", "/home", "/search", "/learn/[part]/[section]", "/reference/glossary", "/applications/[id]", "/calculators/[id]", "/processes/[id]"]) {
      expect(ROUTES.some((r) => r.pattern === p), p).toBe(true);
    }
    expect(concrete.has("/calculators/fluence")).toBe(true);
    expect(concrete.has("/applications/case-1")).toBe(true);
    expect(anchoredPaths.sort()).toEqual(["/architecture", "/reference/figures", "/reference/formulas", "/reference/glossary", "/safety", "/troubleshooting"]);
    for (const p of anchoredPaths) expect(renderedIds.get(p)?.size ?? 0, p).toBeGreaterThan(0);
  });

  it("checks query parameters against the components that read them", () => {
    for (const [pathname, spec] of Object.entries(QUERY)) {
      const src = read(spec.component);
      for (const k of Object.keys(spec.params)) expect(src, `${spec.component} reads ?${k}=`).toMatch(new RegExp(`params\\.get\\("${k}"\\)`));
      const name = path.basename(spec.component, ".tsx");
      expect(read(spec.page), `${spec.page} renders ${name}`).toMatch(new RegExp(`<${name}\\b`));
      expect(routeFor(pathname)?.dynamic, pathname).toBe(false);
    }
    // the ids the explorers look up come from the same adapters the pages pass them
    expect(read("app/(app)/applications/page.tsx")).toMatch(/chains=\{applicationMatrix\(\)\}/);
    expect(read("app/(app)/sources/page.tsx")).toMatch(/sourceCatalogue\(\)/);
    expect(read("features/machine-explorer/MachineExplorer.tsx")).toMatch(/COMPONENT_INDEX\.has\(sel\)/);
    expect(read("features/sources/SourceExplorer.tsx")).toMatch(/getElementById\(`source-\$\{s\}`\)/);
  });

  it("links every document to an existing page, anchor and query value", () => {
    const problems = docs.map((d) => [d.id, d.href, routeProblem(d.href)] as const).filter(([, , p]) => p !== null);
    expect(problems).toEqual([]);
    for (const n of NAV_ITEMS) expect(docs.some((d) => d.href === n.href), n.href).toBe(true);
  });

  it("lands each deep-linked anchor on exactly one element", () => {
    const repeated = docs
      .filter((d) => d.href.includes("#"))
      .map((d) => {
        const u = new URL(d.href, "http://x");
        return [d.href, renderedIds.get(u.pathname)?.get(decodeURIComponent(u.hash.slice(1))) ?? 0] as const;
      })
      .filter(([, n]) => n !== 1);
    expect(repeated).toEqual([]);
  });

  it("detects a broken route, anchor or query value", () => {
    expect(routeProblem("/nowhere")).toMatch(/no page file/);
    expect(routeProblem("/calculators/not-a-calculator")).toMatch(/generateStaticParams/);
    expect(routeProblem("/architecture#not-an-anchor")).toMatch(/renders no element/);
    expect(routeProblem("/reference/glossary#term-not-a-term")).toMatch(/renders no element/);
    expect(routeProblem("/physics-lab?tab=nope")).toMatch(/bad tab/);
    expect(routeProblem("/physics-lab?view=2d")).toMatch(/not read/);
    expect(routeProblem("/home?q=1")).toMatch(/reads none/);
    expect(routeProblem("/learn/part-9/9-2")).toBeNull();
  });

  it("covers every tool deep link named in the brief", () => {
    const hrefs = new Set(docs.map((d) => d.href));
    const brief: Record<string, string[]> = {
      "/architecture#": ["control-stack", "optical-chain", "mechanical", "electrical", "software", "vision-loop", "integration", "handshake", "recipes", "interlocks", "configurator"],
      "/safety#": ["classes", "hazards", "standards", "safety-architecture", "od-nohd", "metrology", "feasibility", "doe", "checklists"],
      "/physics-lab?tab=": ["photon", "wave", "levels", "cavity", "pulse"],
      "/beam-optics?tab=": ["beam", "components", "materials"],
      "/materials?tab=": ["absorption", "thermal", "ablation", "regimes"],
      "/reference/": ["glossary", "formulas", "figures", "map", "decision-tree", "status", "sources"],
    };
    for (const [prefix, ids] of Object.entries(brief)) for (const id of ids) expect(hrefs.has(`${prefix}${id}`), `${prefix}${id}`).toBe(true);
    for (const p of PROCESS_DEFS) expect(hrefs.has(`/processes/${p.id}`), p.id).toBe(true);
    for (const c of CALCULATORS) expect(hrefs.has(`/calculators/${c.id}`), c.id).toBe(true);
    for (const c of COMPONENTS) expect(hrefs.has(`/machine?select=${c.id}`), c.id).toBe(true);
    for (const q of QUIZZES) expect(hrefs.has(`/assessments/${q.id}`), q.id).toBe(true);
  });

  it("uses the glossary page's anchors and the troubleshooting page's card ids", () => {
    const { terms, abbreviations } = glossaryData();
    expect(byKind("glossary").map((d) => d.href)).toEqual(terms.map((t) => `/reference/glossary#${t.anchor}`));
    expect(byKind("abbreviation").map((d) => d.href)).toEqual(abbreviations.map((a) => `/reference/glossary#${a.anchor}`));
    expect(docs.find((d) => d.title === "Rayleigh range" && d.kind === "glossary")?.href).toBe("/reference/glossary#term-rayleigh-range");
    expect(docs.find((d) => d.title === "BPP" && d.kind === "abbreviation")?.href).toBe("/reference/glossary#abbr-bpp");
    expect(uniqueSlugs(["Spot size", "spot-size", "Spot  size", "M²"])).toEqual(["spot-size", "spot-size-2", "spot-size-3", "m2"]);

    expect(docs.find((d) => d.id === "troubleshooting:low-power")?.href).toBe(`/troubleshooting#${slug("Low power")}`);
    expect(docs.find((d) => d.kind === "troubleshooting" && d.title === "Humping")?.href).toBe("/troubleshooting#weld-humping");
    expect(byKind("troubleshooting").map((d) => d.href)).toEqual([...symptomCards(), ...weldDefectCards()].map((c) => `/troubleshooting#${c.id}`));
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
    expect(read("app/search-index.json/route.ts")).toMatch(/export const dynamic = "force-static"/);
  });
});

describe("/search page (server render)", () => {
  it("renders one h1, the local/lexical note, the URL query and the kind chips", async () => {
    nav.search = "q=keyhole&kind=lesson,not-a-kind";
    const mod = await loadPage(path.join(APP, "(app)/search/page.tsx"));
    const html = renderToStaticMarkup(createElement(mod.default));
    expect(html.match(/<h1\b/g)?.length).toBe(1);
    expect(html).toMatch(/lexical/);
    expect(html).toMatch(/provider interface/);
    expect(html).toMatch(/No AI model or remote search\s+service is involved/);
    expect(html).toMatch(/<input[^>]*id="search-q"[^>]*value="keyhole"/);
    expect(html).toMatch(/id="search-results"/); // the input's aria-controls target
    expect(html).toMatch(/aria-pressed="true"[^>]*>Lesson\b/); // ?kind= restored, unknown kinds dropped
    expect(html).toMatch(/aria-pressed="false"[^>]*>All\b/);
    expect(html).toMatch(/aria-busy="true"/); // the index has not loaded during a server render
    nav.search = "";
  });
});

describe("source integrity of the index", () => {
  it("labels platform-written text as such", () => {
    // tool, component and quiz descriptions, and the titles/descriptions of figure and
    // equation images, are written for LASERVERSE; calculators are derived
    for (const k of ["tool", "component", "quiz", "figure", "formula"] as const) expect(KIND_CLASS[k], k).toBe("additional");
    expect(KIND_CLASS.calculator).toBe("derived");
    for (const k of ["lesson", "part", "glossary", "abbreviation", "source", "application", "troubleshooting"] as const) expect(KIND_CLASS[k], k).toBe("handbook");
  });

  it("keeps figure titles (written for LASERVERSE) out of handbook excerpts", () => {
    let checked = 0;
    for (const d of byKind("lesson")) {
      const s = getSection(d.id.slice("lesson:".length))!;
      for (const b of s.blocks) {
        if (b.type !== "figure") continue;
        const title = handbook.figures.find((f) => f.id === b.figureId)?.title;
        if (!title) continue;
        expect(d.keywords ?? "", `${d.id} keywords carry ${b.figureId}`).toContain(title);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("stays lean: no repeated text, no LaTeX formatting noise, bounded payload", () => {
    for (const d of docs) expect(d.keywords === d.text, `${d.id} repeats its text as keywords`).toBe(false);
    for (const d of byKind("formula")) expect(d.keywords ?? "", d.id).not.toMatch(/\\|\b(frac|mathrm|quad|qquad|left|right|text)\b/);
    expect(byKind("formula").some((d) => /\blambda\b/.test(d.keywords ?? ""))).toBe(true);
    // ~460 kB today, ~145 kB gzipped; this budget catches accidental duplication, not growth
    expect(JSON.stringify(docs).length).toBeLessThan(520_000);
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
    expect(top("beam parameter product", 10)).toContain("abbreviation:abbr-bpp");
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
  it("finds equations by symbol name", () => {
    expect(engine.search("lambda", { kinds: ["formula"] }).length).toBeGreaterThan(0);
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
