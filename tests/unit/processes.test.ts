import { describe, expect, it } from "vitest";
import { PROCESS_DEFS, processIntro, processTables, referenceMachines, markingData, weldingData, cuttingData, cleaningData, drillingData, wavelengthData, bondEnergies, taxonomy } from "@/lib/content/processes";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";

describe("process workspaces", () => {
  it("resolve every quotation, table, machine and calculator", () => {
    const machines = referenceMachines();
    for (const p of PROCESS_DEFS) {
      expect(processIntro(p).every((q) => q.text.length > 40)).toBe(true);
      expect(() => processTables(p)).not.toThrow();
      for (const name of p.machines) expect(machines.some((m) => m.title.startsWith(name)), `${p.id}: ${name}`).toBe(true);
      for (const c of p.calculators) expect(CALCULATOR_INDEX.has(c), `${p.id}: calculator ${c}`).toBe(true);
    }
  });
  it("tool adapters read their tables", () => {
    expect(markingData().matrix.length).toBe(20);
    expect(weldingData().modes.map((m) => m["Mode"])).toEqual(["Conduction", "Transition", "Keyhole (deep penetration)"]);
    expect(cuttingData().mechanisms.length).toBe(6);
    expect(cleaningData().targets.length).toBe(5);
    expect(drillingData().methods.length).toBe(5);
    expect(wavelengthData().uvCold.startsWith("“Cold” processing")).toBe(true);
    expect(taxonomy().map((f) => f["Family"])).toEqual(["Modification", "Removal", "Separation", "Joining", "Addition"]);
  });
  it("parses the §1.6 bond energies", () => {
    const b = bondEnergies();
    expect(b.find((x) => x.name === "C–C")?.ev).toBe(3.6);
    expect(b.find((x) => x.name === "C=C")?.ev).toBe(6.4);
  });
});
