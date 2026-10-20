import { describe, it, expect } from "vitest";
import { CALCULATORS, getCalculator } from "@/features/calculators/definitions";
import { resolveInputs, runCalculator } from "@/features/calculators/engine";
import { isChoice } from "@/features/calculators/types";
import { outlineSection } from "@/lib/content/outline";

describe("calculator registry", () => {
  it("has unique ids and covers every category", () => {
    const ids = CALCULATORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CALCULATORS.map((c) => c.category)).size).toBe(8);
  });

  it.each(CALCULATORS.map((c) => [c.id, c] as const))("%s: defaults and every example compute to finite outputs", (_id, def) => {
    const cases = [{}, ...(def.examples ?? []).map((e) => e.values)];
    for (const overrides of cases) {
      const { values, choices } = resolveInputs(def, overrides);
      const out = runCalculator(def, values, choices);
      expect(out.ok, JSON.stringify({ overrides, out })).toBe(true);
      if (out.ok) {
        for (const o of def.outputs) expect(o.key in out.result, `${def.id} missing output ${o.key}`).toBe(true);
      }
    }
  });

  it.each(CALCULATORS.map((c) => [c.id, c] as const))("%s: documents equation, variables, assumptions and real handbook sources", (_id, def) => {
    expect(def.equations.length).toBeGreaterThan(0);
    expect(def.variables.length).toBeGreaterThan(0);
    expect(def.assumptions.length).toBeGreaterThan(0);
    expect(def.sources.length).toBeGreaterThan(0);
    for (const s of def.sources) expect(outlineSection(s.section), `${def.id} cites unknown §${s.section}`).toBeTruthy();
    for (const r of def.related?.calculators ?? []) expect(getCalculator(r), `${def.id} relates to unknown ${r}`).toBeTruthy();
  });

  it("rejects invalid input with a field-addressed error instead of NaN", () => {
    const def = getCalculator("pulse-parameters")!;
    const { values, choices } = resolveInputs(def, { f: 0 });
    const out = runCalculator(def, values, choices);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.field).toBe("Repetition rate");
    const d2 = getCalculator("pulse-parameters")!;
    const r2 = runCalculator(d2, ...Object.values(resolveInputs(d2, { tau: 20000 })) as [never, never]);
    expect(r2.ok).toBe(false);
  });

  it("handbook example: cost per panel ≈ ₹0.53", () => {
    const def = getCalculator("cost-per-part")!;
    const ex = def.examples![0]!;
    const { values, choices } = resolveInputs(def, ex.values);
    const out = runCalculator(def, values, choices);
    expect(out.ok && Math.abs(Number(out.result.cpp) - 0.5277) < 0.002).toBe(true);
  });

  it("handbook example: fiber marker spot 40 µm, ±5% band ≈ ±0.29 mm", () => {
    const def = getCalculator("focus-spot")!;
    const { values, choices } = resolveInputs(def, def.examples![0]!.values);
    const out = runCalculator(def, values, choices);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(Number(out.result.d0) * 1e6).toBeCloseTo(40.3, 0);
      expect((Number(out.result.dof5) / 2) * 1e3).toBeCloseTo(0.29, 1);
    }
  });

  it("choice inputs have their default among the options", () => {
    for (const def of CALCULATORS) for (const i of def.inputs) if (isChoice(i)) expect(i.choice.map((c) => c.value)).toContain(i.value);
  });
});
