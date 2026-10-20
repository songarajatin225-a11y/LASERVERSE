import { pos, nonNeg, frac, atLeast, req, CalcError } from "./core";

/**
 * Product economics. Cost-per-part follows handbook §23.2 / B.3 exactly.
 * ROI, payback, NPV and IRR are standard finance definitions (ADDITIONAL EXPLANATION):
 * the handbook names them in the feasibility template (§23.5) but gives no formulas.
 * All monetary results are illustrative and depend entirely on user assumptions.
 */

/** Capital recovery factor CRF = i(1+i)ⁿ/((1+i)ⁿ − 1); CRF = 1/n when i = 0 */
export function crf(i: number, n: number): number {
  nonNeg("Cost of capital", i);
  atLeast("Years", n, 1);
  if (i === 0) return 1 / n;
  const g = (1 + i) ** n;
  return (i * g) / (g - 1);
}

/** N_good = (H·3600/t_cycle)·OEE·Y */
export function goodPartsPerYear(hours: number, tCycle: number, oee: number, yieldFraction: number): number {
  return ((nonNeg("Operating hours", hours) * 3600) / pos("Cycle time", tCycle)) * frac("OEE", oee) * frac("Yield", yieldFraction);
}

/** C_part = (C_capex·CRF + C_opex)/N_good */
export function costPerGoodPart(capex: number, crfValue: number, opexPerYear: number, nGood: number): number {
  nonNeg("CAPEX", capex);
  pos("CRF", crfValue);
  nonNeg("OPEX", opexPerYear);
  return (capex * crfValue + opexPerYear) / pos("Good parts per year", nGood);
}

export interface CostPerPartInput {
  capex: number;
  years: number;
  rate: number;
  electricityKw: number;
  tariffPerKwh: number;
  consumables: number;
  servicePctOfCapex: number;
  labour: number;
  otherOpex: number;
  hours: number;
  cycleTime: number;
  oee: number;
  yieldFraction: number;
}

export function costPerPartModel(i: CostPerPartInput) {
  const c = crf(i.rate, i.years);
  const annualCapital = nonNeg("CAPEX", i.capex) * c;
  const electricity = nonNeg("Electrical load", i.electricityKw) * nonNeg("Operating hours", i.hours) * nonNeg("Tariff", i.tariffPerKwh);
  const service = i.capex * nonNeg("Service %", i.servicePctOfCapex);
  const opex = electricity + nonNeg("Consumables", i.consumables) + service + nonNeg("Labour", i.labour) + nonNeg("Other OPEX", i.otherOpex);
  const nGood = goodPartsPerYear(i.hours, i.cycleTime, i.oee, i.yieldFraction);
  const nTotal = (i.hours * 3600) / i.cycleTime;
  return {
    crf: c,
    annualCapital,
    opex,
    opexBreakdown: { electricity, consumables: i.consumables, service, labour: i.labour, other: i.otherOpex },
    goodParts: nGood,
    grossParts: nTotal,
    costPerGoodPart: (annualCapital + opex) / nGood,
    /** cost per part if every produced part were good — shows the yield penalty */
    costPerPartAt100Yield: (annualCapital + opex) / (nGood / i.yieldFraction),
  };
}

/** Simple payback (years) = CAPEX / annual net saving */
export function simplePayback(capex: number, annualNetSaving: number): number {
  nonNeg("CAPEX", capex);
  if (req("Annual net saving", annualNetSaving) <= 0) throw new CalcError("Annual net saving", "No payback: the annual net saving must be positive");
  return capex / annualNetSaving;
}

/** ROI over the horizon = (Σ net savings − CAPEX)/CAPEX (undiscounted) */
export function roi(capex: number, annualNetSaving: number, years: number): number {
  pos("CAPEX", capex);
  atLeast("Years", years, 1);
  return (req("Annual net saving", annualNetSaving) * years - capex) / capex;
}

/** NPV = Σ CF_t/(1+r)^t, t = 0…n (CF_0 normally negative = investment) */
export function npv(rate: number, cashflows: number[]): number {
  if (req("Discount rate", rate) <= -1) throw new CalcError("Discount rate", "Discount rate must be above −100%");
  if (cashflows.length === 0) throw new CalcError("Cash flows", "At least one cash flow is required");
  return cashflows.reduce((s, cf, t) => s + req(`Cash flow ${t}`, cf) / (1 + rate) ** t, 0);
}

/**
 * IRR by bracketed bisection on (−99.99%, 1000%). Returns null when the cash-flow
 * series has no sign change or no root in range (IRR undefined) — never a fake number.
 */
export function irr(cashflows: number[]): number | null {
  if (cashflows.length < 2) return null;
  const hasPos = cashflows.some((c) => c > 0);
  const hasNeg = cashflows.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;
  let lo = -0.9999;
  let hi = 10;
  let flo = npv(lo, cashflows);
  const fhi = npv(hi, cashflows);
  if (flo * fhi > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid, cashflows);
    if (Math.abs(fm) < 1e-9 || hi - lo < 1e-10) return mid;
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

/** Uniform annual cash flows: [−capex, s, s, …] */
export function uniformCashflows(capex: number, annual: number, years: number): number[] {
  atLeast("Years", years, 1);
  return [-nonNeg("CAPEX", capex), ...Array.from({ length: Math.round(years) }, () => req("Annual cash flow", annual))];
}
