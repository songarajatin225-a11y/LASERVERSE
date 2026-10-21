import { describe, expect, it } from "vitest";
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
