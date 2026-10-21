/**
 * Physical constants and input validation shared by every calculation module.
 * Constants are the exact SI (2019) defining values except ε₀ (CODATA 2022).
 * The handbook rounds these (c = 2.998 × 10⁸ m/s, 1 eV = 1.602 × 10⁻¹⁹ J; §1.1, §1.10).
 */
export const C = {
  h: 6.62607015e-34, // J·s (exact)
  c: 299_792_458, // m/s (exact)
  e: 1.602176634e-19, // C, and J per eV (exact)
  kB: 1.380649e-23, // J/K (exact)
  eps0: 8.8541878188e-12, // F/m (CODATA 2022)
  /** h·c in eV·nm: E[eV] ≈ 1239.84 / λ[nm] (handbook B.3) */
  hcEvNm: (6.62607015e-34 * 299_792_458) / 1.602176634e-19 / 1e-9,
} as const;

export class CalcError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
    this.name = "CalcError";
  }
}

export function req(name: string, v: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new CalcError(name, `${name} must be a finite number`);
  return v;
}
export function pos(name: string, v: number): number {
  req(name, v);
  if (v <= 0) throw new CalcError(name, `${name} must be greater than zero`);
  return v;
}
export function nonNeg(name: string, v: number): number {
  req(name, v);
  if (v < 0) throw new CalcError(name, `${name} cannot be negative`);
  return v;
}
export function frac(name: string, v: number, { open = false } = {}): number {
  req(name, v);
  if (v < 0 || v > 1 || (open && (v === 0 || v === 1))) throw new CalcError(name, `${name} must be between 0 and 1${open ? " (exclusive)" : ""}`);
  return v;
}
export function atLeast(name: string, v: number, min: number): number {
  req(name, v);
  if (v < min) throw new CalcError(name, `${name} must be at least ${min}`);
  return v;
}
/** Guard on outputs: never return NaN/Infinity to the UI. */
export function finite(name: string, v: number): number {
  if (!Number.isFinite(v)) throw new CalcError(name, `${name} is not finite for these inputs`);
  return v;
}
