import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  architectureQuotes,
  controlStack,
  opticalChain,
  subsystemTables,
  visionData,
  integrationTable,
  recipesTable,
  handshake,
  safetyArchitecture,
  configurator,
  costTable,
  leadQuote,
  referenceMachineHeadings,
  CONFIGURATOR_FAMILIES,
} from "@/lib/content/architecture";
import { parseLatency, parsePercentRange, parseDirection, parseFlow, formatSeconds } from "@/features/architecture/parse";
import { rigidFromTwoPoints, applyRigid, poseAbout, inverseRigid, composeRigid, maxDeviation, wrapAngle, rad, IDENTITY, type Vec2 } from "@/features/architecture/geometry";
import { COMPONENT_INDEX, LAYERS, emissionPermitted, type InterlockState } from "@/features/machine-explorer/machineData";
import { interlockView } from "@/features/architecture/interlock";
import { outline } from "@/lib/content/outline";
import { getSection } from "@/lib/content/handbook";
import fs from "node:fs";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));

describe("§11.2 latency parser", () => {
  it("reads every handbook latency cell", () => {
    const { layers } = controlStack();
    expect(layers.map((l) => l.layer)).toEqual(["MES", "HMI / IPC", "PLC", "Motion control", "Scan controller", "Laser control", "Vision", "Safety"]);
    const by = Object.fromEntries(layers.map((l) => [l.layer, l]));
    expect(by["MES"]!.latency).toBe("Seconds");
    expect(by["MES"]!.interval).toMatchObject({ lo: 1, hi: 1, bound: "order" });
    expect(by["HMI / IPC"]!.interval).toMatchObject({ bound: "point" });
    expect(close(by["HMI / IPC"]!.interval.lo, 0.1)).toBe(true);
    expect(by["PLC"]!.interval.bound).toBe("range");
    expect(close(by["PLC"]!.interval.lo, 1e-3) && close(by["PLC"]!.interval.hi, 1e-2)).toBe(true);
    expect(close(by["Motion control"]!.interval.lo, 50e-6) && close(by["Motion control"]!.interval.hi, 250e-6)).toBe(true);
    expect(by["Motion control"]!.interval.approx).toBe(true);
    expect(close(by["Scan controller"]!.interval.lo, 10e-6)).toBe(true);
    expect(by["Scan controller"]!.interval).toMatchObject({ bound: "point", approx: true });
    expect(by["Laser control"]!.interval).toMatchObject({ lo: 1e-9, hi: 1e-6, bound: "order" });
    expect(close(by["Vision"]!.interval.lo, 0.02) && close(by["Vision"]!.interval.hi, 0.2)).toBe(true);
    expect(by["Safety"]!.interval.bound).toBe("upper");
    expect(close(by["Safety"]!.interval.lo, 0.01) && close(by["Safety"]!.interval.hi, 0.02)).toBe(true);
    // every interval lies inside the drawn axis (1 ns … 10 s)
    for (const l of layers) expect(l.interval.lo >= 1e-9 && l.interval.hi <= 10).toBe(true);
  });
  it("handles edge cases", () => {
    expect(parseLatency("no time here")).toBeNull();
    expect(parseLatency("5 s")).toMatchObject({ lo: 5, hi: 5, bound: "point" });
    expect(parseLatency("2–3 μs")!.hi).toBeCloseTo(3e-6, 12);
    expect(formatSeconds(1e-9)).toBe("1 ns");
    expect(formatSeconds(250e-6)).toBe("250 µs");
    expect(formatSeconds(10)).toBe("10 s");
  });
});

describe("architecture adapters", () => {
  it("resolve every quotation", () => {
    const q = architectureQuotes();
    for (const [k, v] of Object.entries(q)) expect(v.length, k).toBeGreaterThan(40);
    expect(q.neverBypass.startsWith("Safety functions are never bypassed")).toBe(true);
    expect(q.correction.endsWith("gates part release.")).toBe(true);
    expect(() => leadQuote(11, "not in the handbook lead")).toThrow();
  });
  it("maps the §11.1 optical chain to Machine Explorer components that exist", () => {
    const { stages } = opticalChain();
    expect(stages.length).toBe(8);
    expect(stages[0]!.subsystem).toBe("Laser source");
    for (const s of stages) if (s.componentId) expect(COMPONENT_INDEX.has(s.componentId), s.subsystem).toBe(true);
    expect(stages.find((s) => s.subsystem === "Process head")!.componentId).toBeNull();
  });
  it("reads the subsystem, integration and recipe tables", () => {
    const t = subsystemTables();
    expect(t.mechanical.rows.length).toBe(10);
    expect(t.electrical.rows.length).toBe(9);
    expect(t.software.rows.length).toBe(10);
    expect(integrationTable().rows.length).toBe(9);
    expect(recipesTable().rows.length).toBe(7);
  });
  it("reads the §12.2 vision loop from the figure description", () => {
    const v = visionData();
    expect(v.table.rows.length).toBe(8);
    expect(v.loop.steps).toEqual(["Vision — acquire fiducials", "Position — compute X, Y, θ offset", "Laser process — transformed job", "Inspection — read, grade, measure"]);
    expect(v.loop.outcomes).toEqual({ pass: "MES record and release", fail: "Reject or rework" });
    expect(CALCULATOR_INDEX.has("vision-resolution")).toBe(true);
  });
  it("reads the §12.4 handshake in table order with its lanes", () => {
    const h = handshake();
    expect(h.rows.map((r) => r.signal)).toEqual(["Ready", "Start", "Busy", "Done / End", "Error / Alarm", "Emission enable", "Shutter open / closed", "Job / recipe select"]);
    expect(h.lanes).toEqual(["PLC", "Laser", "Safety"]);
    expect(h.rows[1]!.parsed).toEqual({ from: "PLC", to: "Laser", both: false });
    expect(h.rows[6]!.parsed.both).toBe(true);
  });
  it("reads §11.6 and the interlock texts", () => {
    const s = safetyArchitecture();
    expect(s.table.rows.length).toBe(8);
    expect(s.texts.processInterlocks).toContain("fume extraction");
    expect(s.texts.hardWired).toBe("Hard-wired interlocks for emission enable");
    expect(s.texts.emissionEnable).toBe("Hard-wired permission to emit");
  });
  it("builds the configurator from §26.1 and §23.1", () => {
    const { families, machines } = configurator();
    expect(families.length).toBe(CONFIGURATOR_FAMILIES.length);
    // each family's machine table sits under its own §26.1 subheading, and the title shown is that subheading
    const headings = referenceMachineHeadings();
    const subheadings = getSection("26.1")!.blocks.flatMap((b) => (b.type === "subheading" ? [b.text] : []));
    for (const f of families) {
      expect(headings.get(machines[f.id]!.id), f.id).toBe(f.machineTitle);
      expect(subheadings).toContain(f.machineTitle);
    }
    expect(new Set(families.map((f) => machines[f.id]!.id)).size).toBe(families.length);
    expect(families.filter((f) => f.cost).length).toBe(5);
    for (const f of families) expect(machines[f.id]!.rows.length, f.id).toBeGreaterThan(5);
    const cutter = families.find((f) => f.id === "sheet-cutting")!;
    expect(cutter.cost!.header).toBe("6 kW flatbed fiber cutter");
    const galvo = cutter.cost!.entries.find((e) => e.block.startsWith("Galvo"))!;
    expect(galvo.text).toBe("—");
    expect(galvo.range).toBeNull();
    const marker = families.find((f) => f.id === "marking-metals")!;
    expect(marker.cost!.entries[0]).toEqual({ block: "Laser source", text: "30–45%", range: { lo: 30, hi: 45 } });
    // every non-dash cell of the cost table parses
    for (const row of costTable().rows.map((r) => r.map((c) => (typeof c === "string" ? c : c.map((s) => s.t).join(""))))) {
      for (const cell of row.slice(1)) if (cell !== "—") expect(parsePercentRange(cell), cell).not.toBeNull();
    }
  });
});

describe("pure parsers", () => {
  it("parses percentages, directions and flows", () => {
    expect(parsePercentRange("5–8% (cutting head)")).toEqual({ lo: 5, hi: 8 });
    expect(parsePercentRange("0–8%")).toEqual({ lo: 0, hi: 8 });
    expect(parsePercentRange("12%")).toEqual({ lo: 12, hi: 12 });
    expect(parsePercentRange("—")).toBeNull();
    expect(parseDirection("Safety → Laser")).toEqual({ from: "Safety", to: "Laser", both: false });
    expect(parseDirection("Both")).toEqual({ from: null, to: null, both: true });
    expect(parseDirection("sideways")).toBeNull();
    expect(parseFlow("Flowchart: A → B → C.")).toEqual({ steps: ["A", "B", "C"], outcomes: null });
  });
});

describe("two-point rigid transform", () => {
  const n1: Vec2 = { x: -24, y: 14 };
  const n2: Vec2 = { x: 24, y: -14 };
  it("recovers a known pose exactly", () => {
    for (const [dx, dy, th] of [
      [0, 0, 0],
      [3.2, -1.5, rad(4)],
      [-8, 6, rad(-9.5)],
      [0.1, 0.2, rad(179)],
    ] as const) {
      const pose = poseAbout({ x: 0, y: 0 }, dx, dy, th);
      const fit = rigidFromTwoPoints(n1, n2, applyRigid(pose, n1), applyRigid(pose, n2));
      expect(close(fit.transform.theta, wrapAngle(th))).toBe(true);
      expect(close(fit.transform.tx, dx, 1e-9) && close(fit.transform.ty, dy, 1e-9)).toBe(true);
      expect(close(fit.scale, 1)).toBe(true);
      expect(fit.residual).toBeLessThan(1e-9);
    }
  });
  it("handles rotation about an off-origin centre", () => {
    const c = { x: 10, y: -5 };
    const pose = poseAbout(c, 1, 2, rad(30));
    const moved = applyRigid(pose, c);
    expect(close(moved.x, 11) && close(moved.y, -3)).toBe(true);
    const fit = rigidFromTwoPoints(n1, n2, applyRigid(pose, n1), applyRigid(pose, n2));
    expect(maxDeviation(fit.transform, pose, [n1, n2, c, { x: 5, y: 5 }])).toBeLessThan(1e-9);
  });
  it("inverts and composes", () => {
    const A = { theta: rad(12), tx: 3, ty: -4 };
    const B = { theta: rad(-40), tx: -1, ty: 7 };
    expect(maxDeviation(composeRigid(A, inverseRigid(A)), IDENTITY, [n1, n2])).toBeLessThan(1e-9);
    const p = { x: 2, y: 9 };
    const ab = applyRigid(composeRigid(A, B), p);
    const ref = applyRigid(B, applyRigid(A, p));
    expect(close(ab.x, ref.x) && close(ab.y, ref.y)).toBe(true);
  });
  it("reports a mis-found fiducial and rejects degenerate input", () => {
    const fit = rigidFromTwoPoints(n1, n2, n1, { x: n2.x, y: n2.y + 0.5 });
    expect(fit.residual).toBeGreaterThan(0);
    expect(fit.scale).not.toBe(1);
    expect(() => rigidFromTwoPoints(n1, n1, n1, n2)).toThrow();
  });
});

describe("interlock demo logic (machineData)", () => {
  it("permits emission only when every condition holds", () => {
    const ok = { running: true, doorClosed: true, estopReleased: true, keyOn: true, extractionOn: true };
    expect(emissionPermitted(ok)).toEqual({ ok: true, reasons: [] });
    expect(emissionPermitted({ ...ok, doorClosed: false }).ok).toBe(false);
    expect(emissionPermitted({ ...ok, keyOn: false, estopReleased: false }).reasons.length).toBe(2);
  });
  it("the diagram's grouping never disagrees with emissionPermitted (all 32 input states)", () => {
    const keys: Array<keyof InterlockState> = ["keyOn", "estopReleased", "doorClosed", "extractionOn", "running"];
    for (let bits = 0; bits < 32; bits++) {
      const s = Object.fromEntries(keys.map((k, i) => [k, Boolean(bits & (1 << i))])) as unknown as InterlockState;
      const v = interlockView(s);
      expect(v.emission).toEqual(emissionPermitted(s));
      expect(v.safetyChainOk && v.gateOk, JSON.stringify(s)).toBe(v.emission.ok);
      expect(v.safetyChainOk).toBe(s.keyOn && s.estopReleased && s.doorClosed);
    }
  });
});

/* ------------------------------------------------------------------ server render of the page */
vi.mock("next/link", () => ({
  default: ({ href, children, className, title }: { href: string; children?: ReactNode; className?: string; title?: string }) =>
    createElement("a", { href, className, title }, children),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/architecture",
  useRouter: () => ({ push() {}, replace() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/** Anchors other areas and the search index link to (product brief). */
const BRIEF_ANCHORS = ["control-stack", "optical-chain", "mechanical", "electrical", "software", "vision-loop", "integration", "handshake", "recipes", "interlocks", "configurator"];
/** /safety anchors listed in the brief's link conventions. */
const SAFETY_ANCHORS = ["classes", "hazards", "standards", "safety-architecture", "od-nohd", "metrology", "feasibility", "doe", "checklists"];

async function renderPage(): Promise<string> {
  // the project's vitest config compiles TSX with the classic runtime
  (globalThis as { React?: typeof React }).React = React;
  const { default: Page } = await import("@/app/(app)/architecture/page");
  return renderToStaticMarkup(createElement(Page));
}

describe("/architecture page (server render)", () => {
  it("renders every brief anchor exactly once, unique ids, no unknown source", async () => {
    const html = await renderPage();
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, "duplicate ids").toEqual([]);
    for (const a of BRIEF_ANCHORS) expect(ids.filter((id) => id === a).length, a).toBe(1);
    expect(html).not.toContain("unknown source");
    // key labels and banners the brief requires
    expect(html).toContain("positions parsed from handbook ranges (derived)");
    expect(html).toContain("it does not design, size or quote a machine");
    expect(html).toContain("not a functional-safety design");
    expect(html).toContain("/machine?layer=safety");
    expect(html).toContain("/calculators/vision-resolution");
  });

  it("links only to routes, anchors and components that exist", async () => {
    const html = await renderPage();
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!));
    const learn = new Set<string>(["/learn"]);
    for (const p of outline.parts) {
      learn.add(`/learn/${p.id}`);
      for (const s of p.sections) learn.add(`/learn/${p.id}/${s.slug}`);
    }
    const hrefs = [...new Set([...html.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, "&")))];
    expect(hrefs.length).toBeGreaterThan(20);
    const bad: string[] = [];
    for (const href of hrefs) {
      if (href.startsWith("#")) {
        if (!ids.has(href.slice(1))) bad.push(href);
        continue;
      }
      if (/^https?:/.test(href)) continue;
      const u = new URL(href, "https://laserverse.local");
      const path = u.pathname;
      if (path.startsWith("/handbook/")) {
        if (!fs.existsSync(`public${path}`)) bad.push(href);
      } else if (path.startsWith("/learn")) {
        if (!learn.has(path)) bad.push(href);
      } else if (path.startsWith("/calculators/")) {
        if (!CALCULATOR_INDEX.has(path.slice("/calculators/".length))) bad.push(href);
      } else if (path === "/machine") {
        const sel = u.searchParams.get("select");
        const layer = u.searchParams.get("layer");
        if (sel && !COMPONENT_INDEX.has(sel)) bad.push(href);
        if (layer && !LAYERS.some((l) => l.id === layer)) bad.push(href);
      } else if (path === "/safety" && u.hash) {
        if (!SAFETY_ANCHORS.includes(u.hash.slice(1))) bad.push(href);
      } else {
        const page = path === "/" ? "app/page.tsx" : `app/(app)${path}/page.tsx`;
        if (!fs.existsSync(page)) bad.push(href);
      }
    }
    expect(bad).toEqual([]);
  });
});
