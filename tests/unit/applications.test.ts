import { describe, expect, it } from "vitest";
import { applicationMatrix, qualityByFamily, explodedMaps, caseStudies, productRequirements, familiesOf, applicationQuotes, INDUSTRY_SECTIONS } from "@/lib/content/applications";
import { getSection } from "@/lib/content/handbook";

describe("application adapters", () => {
  it("reads the §20.0 matrix with unique ids and a machine for every chain", () => {
    const m = applicationMatrix();
    expect(m.length).toBe(33);
    expect(new Set(m.map((c) => c.id)).size).toBe(m.length);
    expect(m.every((c) => c.machine.length > 0)).toBe(true);
  });
  it("maps processes to §10.1 families that exist", () => {
    const q = qualityByFamily();
    for (const c of applicationMatrix()) for (const f of c.families) expect(q[f], `${c.process} → ${f}`).toBeTruthy();
    expect(familiesOf("Remote welding")).toEqual(["Joining"]);
    expect(familiesOf("Stealth dicing")).toEqual(["Separation"]);
    expect(familiesOf("UDI marking")).toEqual(expect.arrayContaining(["Modification", "Removal"]));
  });
  it("pairs §19.2 tables with their product headings", () => {
    const maps = explodedMaps();
    expect(maps.length).toBe(15);
    expect(maps[0]!.title).toBe("Smartphone");
    expect(new Set(maps.map((x) => x.id)).size).toBe(15);
  });
  it("reads all eight §26.2 cases", () => {
    const c = caseStudies();
    expect(c.length).toBe(8);
    expect(c[1]!.title).toBe("PCB → DataMatrix marking → CO₂ laser → in-line marker");
    expect(c.every((x) => x.steps.length >= 6)).toBe(true);
  });
  it("resolves quotes, requirements and industry sections", () => {
    expect(productRequirements().length).toBe(7);
    expect(Object.values(applicationQuotes()).every((s) => s.length > 40)).toBe(true);
    for (const g of INDUSTRY_SECTIONS) for (const s of g.sections) expect(getSection(s), s).toBeDefined();
  });
});
