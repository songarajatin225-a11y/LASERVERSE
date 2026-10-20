import type { CalculatorDef, CalcChoices, CalcResult, CalcValues } from "./types";
import { isChoice } from "./types";
import { toSI } from "@/lib/physics/units";
import { CalcError } from "@/lib/physics/core";

/** Default inputs (optionally overridden with values in each input's default unit) converted to SI. */
export function resolveInputs(def: CalculatorDef, overrides: Record<string, number | string> = {}) {
  const values: CalcValues = {};
  const choices: CalcChoices = {};
  for (const inp of def.inputs) {
    const o = overrides[inp.key];
    if (isChoice(inp)) choices[inp.key] = typeof o === "string" ? o : inp.value;
    else values[inp.key] = toSI(typeof o === "number" ? o : inp.value, inp.quantity, inp.unit);
  }
  return { values, choices };
}

export type RunOutcome = { ok: true; result: CalcResult } | { ok: false; field: string; message: string };

/** Runs a calculator and converts thrown validation errors into a field-addressed message. */
export function runCalculator(def: CalculatorDef, values: CalcValues, choices: CalcChoices): RunOutcome {
  try {
    const result = def.compute(values, choices);
    for (const [k, v] of Object.entries(result)) {
      if (typeof v === "number" && !Number.isFinite(v)) {
        return { ok: false, field: k, message: `${k} is not finite for these inputs` };
      }
    }
    return { ok: true, result };
  } catch (e) {
    if (e instanceof CalcError) return { ok: false, field: e.field, message: e.message };
    return { ok: false, field: "", message: e instanceof Error ? e.message : "Calculation failed" };
  }
}
