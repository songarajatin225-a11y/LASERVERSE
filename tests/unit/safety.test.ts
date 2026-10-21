import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { outline } from "@/lib/content/outline";
import { PROCESS_DEFS } from "@/lib/content/processes";
import { symptomCards, weldDefectCards } from "@/lib/content/troubleshooting";
import {
  laserClasses,
  parseAel,
  hazards,
  standards,
  standardGroup,
  safetyArchitecture,
  metrologyTable,
  feasibilityItems,
  FEASIBILITY_LIST_ID,
  doeData,
  DOE_CALCULATORS,
  sectionChecklists,
  safetyChecklists,
  safetyFigures,
  safetyQuotes,
  safetyPageData,
} from "@/lib/content/safety";
import { getSection, tableRecords, getTable } from "@/lib/content/handbook";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { COMPONENT_INDEX } from "@/features/machine-explorer/machineData";
import { LASER_CLASS_AEL_VISIBLE_CW_W } from "@/lib/physics/safety";

describe("§24.1 laser classes", () => {
  it("reads all eight classes in handbook order", () => {
    expect(laserClasses().map((c) => c.cls)).toEqual(["1", "1C", "1M", "2", "2M", "3R", "3B", "4"]);
  });
  it("parses the CW visible AEL cells consistently with lib/physics/safety", () => {
    const byClass = new Map(laserClasses().map((c) => [c.cls, c]));
    expect(byClass.get("2")?.aelLimit).toEqual({ op: "≤", watts: 1e-3 });
    expect(byClass.get("3R")?.aelLimit).toEqual({ op: "≤", watts: 5e-3 });
    expect(byClass.get("3B")?.aelLimit).toEqual({ op: "≤", watts: 0.5 });
    expect(byClass.get("4")?.aelLimit).toEqual({ op: ">", watts: 0.5 });
    expect(byClass.get("1")?.aelLimit).toBeNull();
    for (const c of laserClasses()) {
      const lib = LASER_CLASS_AEL_VISIBLE_CW_W[c.cls];
      expect(lib, `lib/physics/safety has class ${c.cls}`).not.toBeUndefined();
      if (c.aelLimit?.op === "≤") expect(lib).toBeCloseTo(c.aelLimit.watts, 12);
    }
    expect(parseAel("—")).toBeNull();
    expect(parseAel("Class 1 limit")).toBeNull();
  });
  it("keeps every cell non-empty", () => {
    for (const c of laserClasses()) for (const v of [c.meaning, c.ael, c.examples, c.requirements]) expect(v.length).toBeGreaterThan(0);
  });
});

describe("§24.2–24.4 hazards, standards, metrology", () => {
  it("reads ten hazards with mechanism and controls", () => {
    const h = hazards();
    expect(h.length).toBe(10);
    expect(h[0]!.hazard.startsWith("Eye — 400–1400 nm")).toBe(true);
    expect(h.every((x) => x.mechanism && x.controls)).toBe(true);
    expect(new Set(h.map((x) => x.id)).size).toBe(h.length);
  });
  it("reads the standards list and groups it (derived)", () => {
    const s = standards();
    expect(s.length).toBe(22);
    expect(s[0]!.standard).toBe("IEC 60825-1");
    const g = (code: string) => s.find((x) => x.standard === code)?.group;
    expect(g("IEC 60825-1")).toBe("safety");
    expect(g("ISO 12100")).toBe("safety");
    expect(g("ISO 11146")).toBe("measurement");
    expect(g("ISO 21254")).toBe("measurement");
    expect(g("ISO 9013")).toBe("quality");
    expect(g("ISO 15609-4 / ISO 15614-11")).toBe("quality");
    expect(standardGroup("Medical laser equipment")).toBe("safety");
  });
  it("reads the metrology table", () => {
    const t = metrologyTable();
    expect(t.rows.length).toBe(11);
    expect(tableRecords(t)[0]!["Quantity"]).toBe("Power");
  });
});

describe("§11.6 safety architecture", () => {
  it("reads eight elements and links only to modelled machine components", () => {
    const a = safetyArchitecture();
    expect(a.length).toBe(8);
    for (const e of a) if (e.componentId) expect(COMPONENT_INDEX.has(e.componentId), `${e.element} → ${e.componentId}`).toBe(true);
    expect(a.find((e) => e.element.startsWith("Emergency stop"))?.componentId).toBe("estop");
    expect(a.find((e) => e.element.startsWith("Laser shutters"))?.componentId).toBeNull();
    expect(a.filter((e) => e.componentId).length).toBe(7);
  });
});

describe("§23.5 feasibility and §23.6 DOE", () => {
  it("builds thirteen checklist items as 'Section — Content to record'", () => {
    const items = feasibilityItems();
    expect(FEASIBILITY_LIST_ID).toBe("feasibility-23.5");
    expect(items.length).toBe(13);
    expect(items.map((i) => i.id)).toEqual(Array.from({ length: 13 }, (_, i) => `s${i + 1}`));
    const rows = tableRecords(getTable("23.5", 1));
    items.forEach((it, i) => expect(it.text).toBe(`${rows[i]!["Section"]} — ${rows[i]!["Content to record"]}`));
  });
  it("reads the parameter table, methodology list and quotations", () => {
    const d = doeData();
    expect(d.table.rows.length).toBe(11);
    expect(d.methodTitle).toBe("DOE methodology");
    expect(d.method.length).toBe(6);
    expect(d.method[0]!.startsWith("Define responses and specifications")).toBe(true);
    expect(d.derived.startsWith("Work in derived quantities") && d.derived.endsWith("dwell time.")).toBe(true);
    expect(d.example.startsWith("Example — black annealing on 316L") && d.example.endsWith("central composite design.")).toBe(true);
    for (const c of DOE_CALCULATORS) expect(CALCULATOR_INDEX.has(c), c).toBe(true);
  });
});

describe("§B.7 / §B.8 checklists", () => {
  it("uses the same listIds as the lesson renderer (sectionId#blockIndex)", () => {
    const b7 = sectionChecklists("B.7");
    expect(b7.length).toBe(1);
    expect(b7[0]!.listId).toBe("B.7#0");
    expect(b7[0]!.items.length).toBe(13);
    const b8 = sectionChecklists("B.8");
    expect(b8.map((c) => c.title)).toEqual(["Product manager", "Application engineer", "Proof of concept"]);
    for (const c of b8) {
      const idx = Number(c.listId.split("#")[1]);
      expect(getSection("B.8")!.blocks[idx]?.type).toBe("checklist");
    }
    expect(safetyChecklists().reduce((n, c) => n + c.items.length, 0)).toBe(13 + 12 + 11 + 8);
  });
});

describe("figures, quotations and page data", () => {
  it("resolves figures and verbatim quotations", () => {
    const f = safetyFigures();
    expect(f.architecture?.sectionId).toBe("11.6");
    expect(f.odNohd?.kind).toBe("equation");
    expect(f.feasibility?.sectionId).toBe("23.5");
    const q = safetyQuotes();
    expect(Object.values(q).every((s) => s.length > 30)).toBe(true);
    expect(q.classesIntro.endsWith("check for later amendments before certifying a product.")).toBe(true);
    expect(q.neverBypassed.startsWith("Safety functions are never bypassed for set-up")).toBe(true);
    expect(q.noBypassHandbook).toContain("laser safety officer");
  });
  it("assembles the whole page without throwing", () => {
    expect(() => safetyPageData()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ server render of /safety */
vi.mock("next/link", () => ({
  default: ({ href, children, className, title }: { href: string; children?: ReactNode; className?: string; title?: string }) =>
    createElement("a", { href, className, title }, children),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/safety",
  useRouter: () => ({ push() {}, replace() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/** /safety anchors from the brief's link conventions. */
const SAFETY_ANCHORS = ["classes", "hazards", "standards", "safety-architecture", "od-nohd", "metrology", "feasibility", "doe", "checklists"];

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
/**
 * Visible text of the markup with tags and ALL whitespace removed, so that inline links
 * the renderers add inside handbook text (e.g. "(→ §23.6)") do not break comparisons.
 */
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, "");
const squash = (s: string) => s.replace(/\s+/g, "");
const idsOf = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => decode(m[1]!));

async function renderSafety(): Promise<string> {
  // the project's vitest config compiles TSX with the classic runtime
  (globalThis as { React?: typeof React }).React = React;
  const { default: Page } = await import("@/app/(app)/safety/page");
  return renderToStaticMarkup(createElement(Page));
}

/** Every internal href resolves to a route, a modelled component, a calculator or an anchor that exists. */
function badLinks(html: string): string[] {
  const ids = new Set(idsOf(html));
  const learn = new Set<string>(["/learn"]);
  for (const p of outline.parts) {
    learn.add(`/learn/${p.id}`);
    for (const s of p.sections) learn.add(`/learn/${p.id}/${s.slug}`);
  }
  const archSrc = [
    fs.readFileSync("app/(app)/architecture/page.tsx", "utf8"),
    ...fs.readdirSync("features/architecture").map((f) => fs.readFileSync(`features/architecture/${f}`, "utf8")),
  ].join("\n");
  const troubleIds = new Set([...symptomCards(), ...weldDefectCards()].map((c) => c.id));
  const processIds = new Set<string>(PROCESS_DEFS.map((p) => p.id));
  const hrefs = [...new Set([...html.matchAll(/\shref="([^"]+)"/g)].map((m) => decode(m[1]!)))];
  const bad: string[] = [];
  for (const href of hrefs) {
    if (href.startsWith("#")) {
      if (!ids.has(href.slice(1))) bad.push(href);
      continue;
    }
    if (/^https?:/.test(href)) continue;
    const u = new URL(href, "https://laserverse.local");
    const path = u.pathname;
    const hash = u.hash.slice(1);
    if (path.startsWith("/handbook/")) {
      if (!fs.existsSync(`public${path}`)) bad.push(href);
    } else if (path.startsWith("/learn")) {
      if (!learn.has(path)) bad.push(href);
    } else if (path.startsWith("/calculators/")) {
      if (!CALCULATOR_INDEX.has(path.slice("/calculators/".length))) bad.push(href);
    } else if (path.startsWith("/processes/")) {
      if (!processIds.has(path.slice("/processes/".length))) bad.push(href);
    } else if (path === "/machine") {
      const sel = u.searchParams.get("select");
      if (sel && !COMPONENT_INDEX.has(sel)) bad.push(href);
    } else if (path === "/safety" && hash) {
      if (!SAFETY_ANCHORS.includes(hash)) bad.push(href);
    } else if (path === "/troubleshooting" && hash) {
      if (!troubleIds.has(hash)) bad.push(href);
    } else if (path === "/architecture" && hash) {
      if (!archSrc.includes(`id="${hash}"`)) bad.push(href);
    } else {
      const page = path === "/" ? "app/page.tsx" : `app/(app)${path}/page.tsx`;
      if (!fs.existsSync(page)) bad.push(href);
    }
  }
  return bad;
}

describe("/safety page (server render)", () => {
  it("renders every brief anchor exactly once, unique ids, one h1, no unknown source", async () => {
    const html = await renderSafety();
    const ids = idsOf(html);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), "duplicate ids").toEqual([]);
    for (const a of SAFETY_ANCHORS) expect(ids.filter((id) => id === a).length, a).toBe(1);
    expect((html.match(/<h1[\s>]/g) ?? []).length, "exactly one h1 (embedded calculators render h2)").toBe(1);
    expect(html).not.toContain("unknown source");
    // embedded calculators link their h2 to the standalone calculator page
    expect(html).toContain('href="/calculators/optical-density"');
  });

  it("links only to routes, anchors, calculators and components that exist", async () => {
    const html = await renderSafety();
    expect([...html.matchAll(/\shref="/g)].length).toBeGreaterThan(30);
    expect(badLinks(html)).toEqual([]);
  });

  it("shows the handbook rows verbatim and the required disclaimers", async () => {
    const text = textOf(await renderSafety());
    for (const s of standards()) expect(text, s.standard).toContain(squash(`${s.standard} ${s.scope}`));
    for (const h of hazards()) for (const v of [h.hazard, h.mechanism, h.controls]) expect(text).toContain(squash(v));
    for (const e of safetyArchitecture()) expect(text).toContain(squash(e.purpose));
    for (const it of feasibilityItems()) expect(text).toContain(squash(it.text));
    for (const c of safetyChecklists()) for (const it of c.items) expect(text).toContain(squash(it.text));
    for (const m of doeData().method) expect(text).toContain(squash(m));
    for (const q of Object.values(safetyQuotes())) expect(text).toContain(squash(q));
    // the selected class card (Class 4 by default) shows its handbook cells
    const c4 = laserClasses().find((c) => c.cls === "4")!;
    for (const v of [c4.meaning, c4.ael, c4.examples, c4.requirements]) expect(text).toContain(squash(v));
    for (const must of ["Listing a standard is not a compliance claim", "Platform guidance (not from the handbook)", "does not certify machines", "laser safety officer"])
      expect(text).toContain(squash(must));
  });

  it("mentions bypassing only to rule it out", async () => {
    const html = await renderSafety();
    const text = decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").toLowerCase();
    const hits = [...text.matchAll(/bypass|defeat|override/g)];
    expect(hits.length).toBeGreaterThan(0);
    for (const m of hits) {
      const before = text.slice(Math.max(0, m.index! - 60), m.index!);
      expect(/\bnever\b|\bnot\b|\bno\b/.test(before), `“…${before}${m[0]}”`).toBe(true);
    }
  });
});
