import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { outline } from "@/lib/content/outline";
import {
  splitCell,
  symptomCards,
  weldDefectCards,
  symptomTable,
  weldDefectTable,
  commonFaults,
  recipePractice,
  troubleshootingQuotes,
  troubleshootingData,
  topicOf,
  LINK_RULES,
  TOPIC_ORDER,
} from "@/lib/content/troubleshooting";
import { tableRecords } from "@/lib/content/handbook";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { PROCESS_DEFS } from "@/lib/content/processes";
import { slug } from "@/lib/slug";

describe("cell splitting", () => {
  it("splits only at top-level semicolons and round-trips", () => {
    expect(splitCell("a; b (c; d); e")).toEqual(["a", "b (c; d)", "e"]);
    expect(splitCell("Inspect damage pattern (pits = spatter; central burn = absorption)")).toEqual(["Inspect damage pattern (pits = spatter; central burn = absorption)"]);
  });
});

describe("§27.2 symptom cards", () => {
  const cards = symptomCards();
  const rows = tableRecords(symptomTable());
  it("has one card per handbook row with slug anchors", () => {
    expect(cards.length).toBe(rows.length);
    expect(cards.length).toBe(19);
    expect(cards.map((c) => c.id)).toEqual(rows.map((r) => slug(r["Symptom"]!)));
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    expect(cards[0]!.id).toBe("low-power");
  });
  it("keeps problem, causes, checks and actions verbatim", () => {
    cards.forEach((c, i) => {
      const r = rows[i]!;
      expect(c.problem).toBe(r["Symptom"]);
      expect(c.causes.join("; ")).toBe(r["Possible causes"]);
      expect(c.checks?.join("; ")).toBe(r["Diagnostic"]);
      expect(c.actions.join("; ")).toBe(r["Corrective action"]);
      expect(c.causes.length && c.checks?.length && c.actions.length).toBeTruthy();
    });
  });
  it("assigns every symptom to a derived topic", () => {
    for (const c of cards) expect(c.topic, c.problem).not.toBe("other");
    expect(topicOf("Weld porosity")).toBe("welding");
    expect(topicOf("Poor contrast (codes)")).toBe("marking");
    expect(topicOf("Charring (polymers, wood, PCB)")).toBe("thermal");
    expect(topicOf("Low power")).toBe("beam-optics");
    expect(TOPIC_ORDER).toContain("other");
  });
});

describe("§10.4 weld defect cards", () => {
  const cards = weldDefectCards();
  const rows = tableRecords(weldDefectTable());
  it("has weld- anchors, no invented checks and verbatim cells", () => {
    expect(cards.length).toBe(9);
    expect(cards.map((c) => c.id)).toEqual(rows.map((r) => `weld-${slug(r["Defect"]!)}`));
    cards.forEach((c, i) => {
      expect(c.checks).toBeNull();
      expect(c.causes.join("; ")).toBe(rows[i]!["Main causes"]);
      expect(c.actions.join("; ")).toBe(rows[i]!["Countermeasures"]);
      expect(c.links.some((l) => l.href === "/processes/welding")).toBe(true);
    });
  });
  it("does not collide with §27.2 anchors", () => {
    const ids = [...symptomCards(), ...cards].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("links", () => {
  const all = [...symptomCards(), ...weldDefectCards()];
  it("point only to existing calculators and process workspaces", () => {
    const processIds = new Set(PROCESS_DEFS.map((p) => p.id));
    for (const r of LINK_RULES) {
      if (r.link.kind === "calculator") expect(CALCULATOR_INDEX.has(r.link.href.replace("/calculators/", "")), r.link.href).toBe(true);
      if (r.link.kind === "process") expect(processIds.has(r.link.href.replace("/processes/", "") as never), r.link.href).toBe(true);
    }
    for (const c of all) expect(c.links.length).toBeLessThanOrEqual(4);
  });
  it("match the topic named in the row", () => {
    const by = new Map(all.map((c) => [c.id, c.links.map((l) => l.href)]));
    expect(by.get("weld-porosity")).toContain("/processes/welding");
    expect(by.get("poor-marking")).toContain("/processes/marking");
    expect(by.get("large-spot")).toContain("/calculators/focus-spot");
    expect(by.get("burning")).toContain("/calculators/fluence");
    expect(by.get("charring-polymers-wood-pcb")).toContain("/processes/uv-co2");
    expect(by.get("vision-errors-no-reads-false-rejects")).toContain("/calculators/vision-resolution");
    expect(by.get("lens-damage")).toEqual([]);
    expect(by.get("weld-burn-through-blow-holes")).not.toContain("/processes/drilling");
  });
});

describe("quotations and §12.5 recipe practice", () => {
  it("parses the four fault families from the §27.2 sentence", () => {
    expect(commonFaults()).toEqual(["optics contamination", "focus", "fixturing", "recipe drift"]);
  });
  it("cites §12.5 recipe versioning verbatim", () => {
    const r = recipePractice();
    expect(r.practice).toContain("versioned");
    expect(r.practice).toContain("change control");
  });
  it("resolves the lead and safety quotations", () => {
    const q = troubleshootingQuotes();
    expect(q.lead.startsWith("Work from the workpiece back to the source")).toBe(true);
    expect(q.lead.endsWith("not the laser.")).toBe(true);
    expect(() => troubleshootingData()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ server render of /troubleshooting */
vi.mock("next/link", () => ({
  default: ({ href, children, className, title }: { href: string; children?: ReactNode; className?: string; title?: string }) =>
    createElement("a", { href, className, title }, children),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/troubleshooting",
  useRouter: () => ({ push() {}, replace() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const SAFETY_ANCHORS = ["classes", "hazards", "standards", "safety-architecture", "od-nohd", "metrology", "feasibility", "doe", "checklists"];
const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
/** Visible text with tags and all whitespace removed (robust to inline links the renderer adds). */
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, "");
const squash = (s: string) => s.replace(/\s+/g, "");
const idsOf = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => decode(m[1]!));

async function renderTroubleshooting(): Promise<string> {
  // the project's vitest config compiles TSX with the classic runtime
  (globalThis as { React?: typeof React }).React = React;
  const { default: Page } = await import("@/app/(app)/troubleshooting/page");
  return renderToStaticMarkup(createElement(Page));
}

/** The markup of each card, keyed by its anchor id. */
function articles(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of html.matchAll(/<article id="([^"]+)"[\s\S]*?<\/article>/g)) out.set(decode(m[1]!), m[0]);
  return out;
}

describe("/troubleshooting page (server render)", () => {
  it("renders one h1, unique ids and one anchored card per handbook row", async () => {
    const html = await renderTroubleshooting();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    const ids = idsOf(html);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), "duplicate ids").toEqual([]);
    const cards = articles(html);
    const expected = [...symptomCards(), ...weldDefectCards()].map((c) => c.id);
    expect([...cards.keys()]).toEqual(expected);
    expect(html).not.toContain("unknown source");
  });

  it("shows checks only where the handbook has a diagnostic column, and labels verification as platform guidance", async () => {
    const cards = articles(await renderTroubleshooting());
    // note: §27.2 "Weld porosity" is itself slugged "weld-porosity", so go by card kind, not by prefix
    const weldIds = new Set(weldDefectCards().map((c) => c.id));
    expect(weldIds.size).toBe(9);
    for (const [id, a] of cards) {
      expect(a.includes(">Checks<"), `${id} checks step`).toBe(!weldIds.has(id));
      expect(a, id).toContain("Platform guidance (not from the handbook)");
      // the verification guidance is generic: no numbers outside the §12.5 citation
      const guidance = /Platform guidance \(not from the handbook\)<\/p><p>([\s\S]*?)<\/p>/.exec(a)?.[1] ?? "";
      expect(guidance.length, id).toBeGreaterThan(40);
      expect(/\d/.test(guidance), `${id}: ${guidance}`).toBe(false);
    }
  });

  it("renders every handbook cell verbatim inside its card", async () => {
    const cards = articles(await renderTroubleshooting());
    for (const c of [...symptomCards(), ...weldDefectCards()]) {
      const t = textOf(cards.get(c.id)!);
      for (const v of [c.problem, ...c.causes, ...(c.checks ?? []), ...c.actions]) expect(t, c.id).toContain(squash(v));
    }
  });

  it("links only to routes, anchors, calculators and workspaces that exist", async () => {
    const html = await renderTroubleshooting();
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
    const processIds = new Set<string>(PROCESS_DEFS.map((p) => p.id));
    const hrefs = [...new Set([...html.matchAll(/\shref="([^"]+)"/g)].map((m) => decode(m[1]!)))];
    expect(hrefs.length).toBeGreaterThan(40);
    const bad: string[] = [];
    for (const href of hrefs) {
      if (href.startsWith("#")) {
        if (!ids.has(href.slice(1))) bad.push(href);
        continue;
      }
      const u = new URL(href, "https://laserverse.local");
      const path = u.pathname;
      const hash = u.hash.slice(1);
      if (path.startsWith("/learn")) {
        if (!learn.has(path)) bad.push(href);
      } else if (path.startsWith("/calculators/")) {
        if (!CALCULATOR_INDEX.has(path.slice("/calculators/".length))) bad.push(href);
      } else if (path.startsWith("/processes/")) {
        if (!processIds.has(path.slice("/processes/".length))) bad.push(href);
      } else if (path === "/safety" && hash) {
        if (!SAFETY_ANCHORS.includes(hash)) bad.push(href);
      } else if (path === "/architecture" && hash) {
        if (!archSrc.includes(`id="${hash}"`)) bad.push(href);
      } else if (!fs.existsSync(`app/(app)${path}/page.tsx`)) bad.push(href);
    }
    expect(bad).toEqual([]);
    // /safety#metrology is rendered by the safety page
    expect(fs.readFileSync("app/(app)/safety/page.tsx", "utf8")).toContain('id="metrology"');
  });

  it("mentions bypassing only to rule it out", async () => {
    const html = await renderTroubleshooting();
    const text = decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").toLowerCase();
    const hits = [...text.matchAll(/bypass|defeat|override/g)];
    expect(hits.length).toBeGreaterThan(0);
    for (const m of hits) {
      const before = text.slice(Math.max(0, m.index! - 60), m.index!);
      expect(/\bnever\b|\bnot\b|\bno\b/.test(before), `“…${before}${m[0]}”`).toBe(true);
    }
  });
});
