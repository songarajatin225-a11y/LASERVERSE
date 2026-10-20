import { describe, it, expect } from "vitest";
import { QUESTIONS, QUIZZES, QUESTION_INDEX, type NumericQuestion } from "@/content/assessments/questions";
import { outlineSection } from "@/lib/content/outline";
import * as ph from "@/lib/physics/photon";
import * as la from "@/lib/physics/laser";
import * as pu from "@/lib/physics/pulse";
import * as be from "@/lib/physics/beam";
import * as ia from "@/lib/physics/interaction";
import * as pr from "@/lib/physics/process";
import * as sa from "@/lib/physics/safety";
import * as ec from "@/lib/physics/economics";

/** Independent recomputation of every numeric answer with the tested calculation library. */
const VERIFY: Record<string, () => number> = {
  "l1-355-ev": () => ph.photonEnergyEv(355e-9),
  "l1-qd-yb": () => la.quantumDefect(976e-9, 1030e-9) * 100,
  "l2-spot-marker": () => be.focusedSpotDiameter(1.064e-6, 1.3, 0.16, 0.007) * 1e6,
  "l2-dof5": () => be.toleranceHalfRange(0.9, 0.05),
  "l3-overlap": () => ia.pulseOverlap(1, 100e3, 30e-6) * 100,
  "l3-ldiff-ss": () => ia.thermalDiffusionLength(4e-6, 100e-9) * 1e6,
  "l4-vision-res": () => pr.visionResolution(0.02, 2448) * 1e6,
  "l5-crf": () => ec.crf(0.1, 7),
  "l6-od": () => sa.requiredOpticalDensity(1e7, 10),
  "calc-flux": () => ph.photonFlux(1, 1064e-9),
  "calc-ep-mopa": () => pu.pulseEnergy(20, 600e3) * 1e6,
  "calc-f0": () => ia.peakFluence(0.2e-3, 15e-6) / 1e4,
  "calc-co2-spot": () => be.focusedSpotDiameter(10.6e-6, 1.2, 0.1, 0.012) * 1e6,
  "calc-cu-1ms": () => ia.thermalDiffusionLength(117e-6, 1e-3) * 1e3,
  "calc-galvo": () => pr.galvoResolution(0.11, 16) * 1e6,
  "calc-fsr-fiber": () => la.freeSpectralRange(1.45, 10) / 1e6,
  "calc-qswitch": () => la.qSwitchPulseEnergy(1, 100e3, 100e-6) * 100,
  "calc-cost-panel": () =>
    ec.costPerPartModel({ capex: 45e5, years: 7, rate: 0.1, electricityKw: 2, tariffPerKwh: 9, consumables: 1.5e5, servicePctOfCapex: 0.04, labour: 1.5e5, otherOpex: 0, hours: 6000, cycleTime: 6, oee: 0.8, yieldFraction: 0.995 }).costPerGoodPart,
};

describe("question bank", () => {
  it("has unique ids and cites existing handbook sections", () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) expect(outlineSection(q.section), `${q.id} → §${q.section}`).toBeTruthy();
  });
  it("multiple-choice answers are valid indices and choices are distinct", () => {
    for (const q of QUESTIONS) {
      if (q.type !== "mcq") continue;
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.choices.length);
      expect(new Set(q.choices).size).toBe(q.choices.length);
    }
  });
  it("every numeric answer is reproduced by the calculation library within tolerance", () => {
    const numeric = QUESTIONS.filter((q): q is NumericQuestion => q.type === "numeric");
    for (const q of numeric) {
      const f = VERIFY[q.id];
      expect(f, `no verification for ${q.id}`).toBeTruthy();
      const v = f!();
      expect(Math.abs(v - q.answer) / Math.abs(q.answer), `${q.id}: library ${v} vs bank ${q.answer}`).toBeLessThanOrEqual(q.tolerance / 2);
    }
  });
  it("quizzes reference existing questions and every level has a quiz", () => {
    for (const z of QUIZZES) {
      expect(z.questionIds.length).toBeGreaterThan(4);
      for (const id of z.questionIds) expect(QUESTION_INDEX.has(id)).toBe(true);
    }
    expect(QUIZZES.filter((z) => z.level).map((z) => z.level)).toEqual(["L1", "L2", "L3", "L4", "L5", "L6"]);
  });
});
