import { describe, it, expect } from "vitest";
import * as ec from "@/lib/physics/economics";
import { CalcError } from "@/lib/physics/core";

const near = (a: number, e: number, tol = 0.01) => expect(Math.abs(a - e) / Math.abs(e)).toBeLessThanOrEqual(tol);

describe("cost per good part — handbook §23.2 worked example (CO₂ in-line PCB marker)", () => {
  const model = ec.costPerPartModel({
    capex: 45e5, // ₹45 lakh
    years: 7,
    rate: 0.1,
    electricityKw: 2,
    tariffPerKwh: 9,
    consumables: 1.5e5,
    servicePctOfCapex: 0.04,
    labour: 1.5e5,
    otherOpex: 0,
    hours: 6000,
    cycleTime: 6,
    oee: 0.8,
    yieldFraction: 0.995,
  });
  it("CRF 0.205 → ₹9.2 lakh/yr", () => {
    near(model.crf, 0.205, 0.003);
    near(model.annualCapital / 1e5, 9.2, 0.01);
  });
  it("OPEX ≈ ₹5.9 lakh/yr (electricity ₹1.1 lakh, service ₹1.8 lakh)", () => {
    near(model.opexBreakdown.electricity / 1e5, 1.08, 1e-9);
    near(model.opexBreakdown.service / 1e5, 1.8, 1e-9);
    near(model.opex / 1e5, 5.9, 0.01);
  });
  it("≈ 2.87 million good panels per year", () => {
    near(model.goodParts / 1e6, 2.87, 0.003);
  });
  it("cost per panel ≈ ₹0.53", () => {
    near(model.costPerGoodPart, 0.53, 0.01);
    expect(model.costPerPartAt100Yield).toBeLessThan(model.costPerGoodPart);
  });
  it("sensitivity: cycle time moves the answer more than a ±20% laser-price change (§23.2)", () => {
    const base = model.costPerGoodPart;
    const slower = ec.costPerPartModel({ ...baseInput(), cycleTime: 7.2 }).costPerGoodPart; // +20% cycle time
    const pricier = ec.costPerPartModel({ ...baseInput(), capex: 45e5 + 0.2 * 0.2 * 45e5 }).costPerGoodPart; // laser ≈20% of capex, +20%
    expect(slower - base).toBeGreaterThan(pricier - base);
  });
});

function baseInput(): ec.CostPerPartInput {
  return { capex: 45e5, years: 7, rate: 0.1, electricityKw: 2, tariffPerKwh: 9, consumables: 1.5e5, servicePctOfCapex: 0.04, labour: 1.5e5, otherOpex: 0, hours: 6000, cycleTime: 6, oee: 0.8, yieldFraction: 0.995 };
}

describe("CRF, ROI, payback, NPV, IRR", () => {
  it("CRF at 0% equals 1/n", () => {
    near(ec.crf(0, 5), 0.2, 1e-12);
  });
  it("payback and ROI", () => {
    near(ec.simplePayback(100, 25), 4, 1e-12);
    near(ec.roi(100, 25, 7), 0.75, 1e-12);
    expect(() => ec.simplePayback(100, 0)).toThrow(CalcError);
  });
  it("NPV of a known series", () => {
    near(ec.npv(0.1, [-100, 60, 60]), 4.132, 0.001);
  });
  it("IRR solves NPV = 0", () => {
    const cfs = ec.uniformCashflows(100, 30, 5);
    const r = ec.irr(cfs)!;
    expect(Math.abs(ec.npv(r, cfs))).toBeLessThan(1e-6);
    near(r, 0.1524, 0.002);
  });
  it("IRR is undefined without a sign change", () => {
    expect(ec.irr([100, 10, 10])).toBeNull();
    expect(ec.irr([-100, -10])).toBeNull();
  });
  it("yield and OEE validation", () => {
    expect(() => ec.goodPartsPerYear(6000, 6, 1.2, 0.99)).toThrow(CalcError);
    expect(() => ec.goodPartsPerYear(6000, 0, 0.8, 0.99)).toThrow(CalcError);
  });
});
