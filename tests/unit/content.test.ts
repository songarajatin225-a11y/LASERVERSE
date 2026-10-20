import { describe, it, expect } from "vitest";
import { handbook, getParts, allSections, getTable, extractionFlags } from "@/lib/content/handbook";
import { getLevels, getRolePaths } from "@/lib/content/curriculum";
import { sourceCatalogue, parseWavelengths, wavelengthMap, familiesAtAGlance } from "@/lib/content/sources";
import { parsePartList, romanToInt } from "@/lib/content/parts";
import { photonLines, archBlocks, couplers, opticalComponents, opticalMatrix } from "@/lib/content/labData";
import { LESSONS } from "@/content/lessons";
import { REVIEW_FLAGS } from "@/content/review-flags";
import { getCalculator } from "@/features/calculators/definitions";
import { outlineSection } from "@/lib/content/outline";

describe("ingested handbook", () => {
  it("validates against the schema with all 28 parts in order plus front and back matter", () => {
    const parts = getParts();
    expect(parts[0]!.kind).toBe("front");
    expect(parts.at(-1)!.kind).toBe("back");
    expect(parts.filter((p) => p.kind === "part").map((p) => p.number)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    expect(handbook.meta.title).toBe("The Complete Laser Handbook");
  });
  it("every section has content, a contents page and a unique id", () => {
    const secs = allSections();
    expect(new Set(secs.map((s) => s.id)).size).toBe(secs.length);
    for (const s of secs) {
      expect(s.blocks.length, s.id).toBeGreaterThan(0);
      expect(s.page, `page for ${s.id}`).not.toBeNull();
    }
  });
  it("every figure referenced by a block exists and every equation has LaTeX", () => {
    const ids = new Set(handbook.figures.map((f) => f.id));
    for (const s of allSections()) for (const b of s.blocks) if (b.type === "figure") expect(ids.has(b.figureId)).toBe(true);
    for (const f of handbook.figures) if (f.kind === "equation") expect(f.latex?.length).toBeGreaterThan(5);
    expect(handbook.figures.filter((f) => f.kind === "unknown")).toHaveLength(0);
  });
  it("extraction flags only report the two genuinely missing charts as errors", () => {
    const errors = extractionFlags.filter((f) => f.severity === "error");
    expect(errors.map((e) => e.location).sort()).toEqual(["9.2", "9.7"]);
  });
  it("table headers used by feature modules match (fails loudly on re-ingestion drift)", () => {
    expect(() => getTable("20.0", 1, ["Industry", "Product", "Component", "Material", "Process", "Laser type"])).not.toThrow();
    expect(() => getTable("27.2", 1, ["Symptom", "Possible causes", "Diagnostic", "Corrective action"])).not.toThrow();
    expect(() => getTable("9.4", 1, ["Material", "κ"])).not.toThrow();
    expect(() => getTable("1.6", 1, ["Nonexistent"])).toThrow();
  });
});

describe("curriculum and data adapters", () => {
  it("parses the six levels from the handbook roadmap", () => {
    const levels = getLevels();
    expect(levels.map((l) => l.id)).toEqual(["L1", "L2", "L3", "L4", "L5", "L6"]);
    expect(levels[0]!.parts).toEqual([1, 2]);
    expect(levels[4]!.parts).toEqual(Array.from({ length: 11 }, (_, i) => i + 13));
    expect(levels[5]!.parts).toEqual([24, 25, 27]);
  });
  it("parses role paths", () => {
    const roles = getRolePaths();
    expect(roles).toHaveLength(7);
    expect(roles.find((r) => r.reader.startsWith("Laser application"))!.coreParts).toEqual([4, 7, 8, 9, 10, 23, 27]);
  });
  it("roman numerals and part lists", () => {
    expect(romanToInt("XXVIII")).toBe(28);
    expect(romanToInt("XIV")).toBe(14);
    expect(parsePartList("I–IV, IX, X")).toEqual([1, 2, 3, 4, 9, 10]);
    expect(parsePartList("Parts XIII–XV")).toEqual([13, 14, 15]);
  });
  it("builds the source catalogue from §3.2–3.7 with every spec row joined", () => {
    const cat = sourceCatalogue();
    expect(cat.length).toBeGreaterThanOrEqual(50);
    const fiber = cat.filter((e) => e.family === "fiber");
    expect(fiber).toHaveLength(12);
    for (const e of fiber) expect(e.fields.some(([h]) => h === "Advantages"), `${e.name} joined`).toBe(true);
    expect(cat.find((e) => e.name === "GaN violet/blue diodes")).toBeTruthy();
    expect(new Set(cat.map((e) => e.id)).size).toBe(cat.length);
  });
  it("parses wavelength text", () => {
    expect(parseWavelengths("1064 nm (also 946, 1319 nm)")).toEqual([[1064, 1064], [946, 946], [1319, 1319]]);
    expect(parseWavelengths("10.6 µm (also 9.3, 9.6, 10.2 µm)")[0]).toEqual([10600, 10600]);
    expect(parseWavelengths("1530–1610 nm")).toEqual([[1530, 1610]]);
  });
  it("wavelength map has 24 lines and families table 8 rows", () => {
    expect(wavelengthMap()).toHaveLength(24);
    expect(familiesAtAGlance()).toHaveLength(8);
  });
  it("lab adapters return handbook rows", () => {
    expect(photonLines()).toHaveLength(8);
    expect(archBlocks()).toHaveLength(9);
    expect(couplers()).toHaveLength(5);
    expect(opticalComponents().length).toBeGreaterThan(15);
    expect(opticalMatrix()).toHaveLength(7);
  });
  it("lesson enhancements and review flags point at real sections and calculators", () => {
    for (const [id, e] of Object.entries(LESSONS)) {
      expect(outlineSection(id), id).toBeTruthy();
      for (const c of e.calculators ?? []) expect(getCalculator(c), `${id} → ${c}`).toBeTruthy();
    }
    for (const f of REVIEW_FLAGS) expect(outlineSection(f.section), f.id).toBeTruthy();
  });
});
