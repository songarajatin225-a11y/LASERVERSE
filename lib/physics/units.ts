/**
 * Unit system for calculators. Every value is stored internally in coherent SI
 * (m, s, Hz, J, W, J/m², W/m², m·rad, m²/s …); units only scale for input and display.
 * Handbook conventions (nm/µm, J/cm², W/cm², mm·mrad) are offered as defaults.
 */
export type Quantity =
  | "length"
  | "smallLength"
  | "time"
  | "frequency"
  | "energy"
  | "photonEnergy"
  | "power"
  | "fluence"
  | "intensity"
  | "velocity"
  | "angle"
  | "bpp"
  | "diffusivity"
  | "linearEnergy"
  | "radiance"
  | "force"
  | "efield"
  | "conductivity"
  | "n2"
  | "ratio"
  | "percent"
  | "count"
  | "money"
  | "duration"
  | "temperature"
  | "lidtCw"
  | "area"
  | "areaRate"
  | "rate"
  | "inverseLength";

export interface Unit {
  id: string;
  label: string;
  /** multiply a value in this unit by `factor` to get SI */
  factor: number;
  /** candidate for automatic display selection */
  auto?: boolean;
}

const u = (id: string, label: string, factor: number, auto = true): Unit => ({ id, label, factor, auto });

export const UNITS: Record<Quantity, Unit[]> = {
  length: [u("pm", "pm", 1e-12), u("nm", "nm", 1e-9), u("um", "µm", 1e-6), u("mm", "mm", 1e-3), u("cm", "cm", 1e-2, false), u("m", "m", 1), u("km", "km", 1e3)],
  smallLength: [u("nm", "nm", 1e-9), u("um", "µm", 1e-6), u("mm", "mm", 1e-3), u("m", "m", 1)],
  time: [u("as", "as", 1e-18), u("fs", "fs", 1e-15), u("ps", "ps", 1e-12), u("ns", "ns", 1e-9), u("us", "µs", 1e-6), u("ms", "ms", 1e-3), u("s", "s", 1)],
  duration: [u("s", "s", 1), u("min", "min", 60), u("h", "h", 3600)],
  frequency: [u("Hz", "Hz", 1), u("kHz", "kHz", 1e3), u("MHz", "MHz", 1e6), u("GHz", "GHz", 1e9), u("THz", "THz", 1e12), u("PHz", "PHz", 1e15)],
  energy: [u("fJ", "fJ", 1e-15), u("pJ", "pJ", 1e-12), u("nJ", "nJ", 1e-9), u("uJ", "µJ", 1e-6), u("mJ", "mJ", 1e-3), u("J", "J", 1), u("kJ", "kJ", 1e3)],
  photonEnergy: [u("eV", "eV", 1.602176634e-19, false), u("J", "J", 1, false), u("meV", "meV", 1.602176634e-22, false), u("keV", "keV", 1.602176634e-16, false)],
  power: [u("nW", "nW", 1e-9), u("uW", "µW", 1e-6), u("mW", "mW", 1e-3), u("W", "W", 1), u("kW", "kW", 1e3), u("MW", "MW", 1e6), u("GW", "GW", 1e9), u("TW", "TW", 1e12)],
  fluence: [u("mJ/cm2", "mJ/cm²", 10), u("J/cm2", "J/cm²", 1e4), u("J/m2", "J/m²", 1, false)],
  intensity: [u("W/cm2", "W/cm²", 1e4), u("kW/cm2", "kW/cm²", 1e7, false), u("MW/cm2", "MW/cm²", 1e10, false), u("W/m2", "W/m²", 1, false), u("W/mm2", "W/mm²", 1e6, false)],
  velocity: [u("um/s", "µm/s", 1e-6, false), u("mm/s", "mm/s", 1e-3), u("m/s", "m/s", 1), u("m/min", "m/min", 1 / 60, false)],
  angle: [u("urad", "µrad", 1e-6), u("mrad", "mrad", 1e-3), u("rad", "rad", 1), u("deg", "°", Math.PI / 180, false)],
  bpp: [u("mm.mrad", "mm·mrad", 1e-6), u("m.rad", "m·rad", 1, false)],
  diffusivity: [u("mm2/s", "mm²/s", 1e-6), u("cm2/s", "cm²/s", 1e-4, false), u("m2/s", "m²/s", 1, false)],
  linearEnergy: [u("J/mm", "J/mm", 1e3), u("J/cm", "J/cm", 1e2, false), u("J/m", "J/m", 1, false), u("kJ/m", "kJ/m", 1e3, false)],
  radiance: [u("W/(cm2.sr)", "W/(cm²·sr)", 1e4), u("W/(m2.sr)", "W/(m²·sr)", 1, false)],
  force: [u("nN", "nN", 1e-9), u("uN", "µN", 1e-6), u("mN", "mN", 1e-3), u("N", "N", 1)],
  efield: [u("V/m", "V/m", 1), u("kV/m", "kV/m", 1e3), u("MV/m", "MV/m", 1e6), u("GV/m", "GV/m", 1e9)],
  conductivity: [u("S/m", "S/m", 1), u("MS/m", "MS/m", 1e6)],
  n2: [u("m2/W", "m²/W", 1), u("cm2/W", "cm²/W", 1e-4)],
  ratio: [u("1", "", 1)],
  percent: [u("%", "%", 0.01), u("1", "fraction", 1, false)],
  count: [u("1", "", 1)],
  money: [u("cur", "", 1)],
  temperature: [u("K", "K", 1)],
  lidtCw: [u("W/cm", "W/cm", 100), u("kW/cm", "kW/cm", 1e5)],
  area: [u("mm2", "mm²", 1e-6), u("cm2", "cm²", 1e-4), u("m2", "m²", 1)],
  areaRate: [u("m2/h", "m²/h", 1 / 3600), u("cm2/s", "cm²/s", 1e-4, false), u("mm2/s", "mm²/s", 1e-6, false)],
  rate: [u("/h", "per hour", 1 / 3600), u("/s", "per second", 1, false)],
  inverseLength: [u("1/m", "m⁻¹", 1), u("1/cm", "cm⁻¹", 100)],
};

export function findUnit(q: Quantity, id: string): Unit {
  const unit = UNITS[q].find((x) => x.id === id);
  if (!unit) throw new Error(`Unknown unit ${id} for ${q}`);
  return unit;
}

export function toSI(value: number, q: Quantity, unitId: string): number {
  return value * findUnit(q, unitId).factor;
}

export function fromSI(value: number, q: Quantity, unitId: string): number {
  return value / findUnit(q, unitId).factor;
}

/** Choose the unit that puts |value| in [1, 1000) where possible. */
export function autoUnit(valueSI: number, q: Quantity): Unit {
  const list = UNITS[q].filter((x) => x.auto !== false);
  const fallback = UNITS[q][0]!;
  if (!Number.isFinite(valueSI) || valueSI === 0 || list.length === 0) return list[0] ?? fallback;
  const a = Math.abs(valueSI);
  let best = list[0]!;
  for (const unit of list) {
    if (a / unit.factor >= 1) best = unit;
  }
  return best;
}

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** Format with `sig` significant figures; scientific "a × 10ⁿ" outside 1e-3…1e6. */
export function formatNumber(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1e-3 && a < 1e6) {
    const s = Number(x.toPrecision(sig));
    return s.toLocaleString("en-US", { maximumSignificantDigits: sig, useGrouping: a >= 1e4 });
  }
  let exp = Math.floor(Math.log10(a));
  let m = Number((x / 10 ** exp).toPrecision(sig));
  if (Math.abs(m) >= 10) {
    m = Number((m / 10).toPrecision(sig));
    exp += 1;
  }
  return `${m} × 10${String(exp).split("").map((c) => SUP[c] ?? c).join("")}`;
}

export function formatQuantity(valueSI: number, q: Quantity, unitId?: string, sig = 4): { value: string; unit: string; raw: number } {
  const unit = unitId ? findUnit(q, unitId) : autoUnit(valueSI, q);
  const raw = valueSI / unit.factor;
  return { value: formatNumber(raw, sig), unit: unit.label, raw };
}

export function formatWithUnit(valueSI: number, q: Quantity, unitId?: string, sig = 4): string {
  const f = formatQuantity(valueSI, q, unitId, sig);
  return f.unit ? `${f.value} ${f.unit}` : f.value;
}
