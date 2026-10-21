import { pos, nonNeg, CalcError } from "./core";

/**
 * Laser-safety relationships from handbook §24.2 / B.3. MPE values are NOT provided
 * here: they must be taken from IEC 60825-1 / ANSI Z136.1 tables for the actual
 * wavelength, exposure duration and pulse format. These tools do not classify
 * products or certify eyewear.
 */

/** Required optical density OD ≥ log₁₀(H₀/MPE). H₀ and MPE in the same units. */
export function requiredOpticalDensity(H0: number, mpe: number): number {
  pos("Worst-case exposure H₀", H0);
  pos("MPE", mpe);
  return Math.max(0, Math.log10(H0 / mpe));
}

/**
 * Nominal ocular hazard distance NOHD = (1/φ)(√(4P/(π·MPE)) − a).
 * P (W), MPE (W/m²), φ full-angle divergence (rad), a exit beam diameter (m). Returns metres.
 * Returns 0 when the beam is already below the MPE at the aperture.
 */
export function nohd(P: number, mpe: number, phi: number, a: number): number {
  pos("Power", P);
  pos("MPE", mpe);
  pos("Divergence", phi);
  nonNeg("Exit beam diameter", a);
  const d = Math.sqrt((4 * P) / (Math.PI * mpe));
  if (!Number.isFinite(d)) throw new CalcError("MPE", "Result not finite");
  return Math.max(0, (d - a) / phi);
}

/** Irradiance of a beam of diameter d (top-hat approximation, used for H₀ estimates): 4P/(πd²) */
export function beamIrradiance(P: number, d: number): number {
  return (4 * pos("Power", P)) / (Math.PI * pos("Beam diameter", d) ** 2);
}

/** IEC 60825-1 class table as printed in the handbook §24.1 (CW visible AEL values only). */
export const LASER_CLASS_AEL_VISIBLE_CW_W: Record<string, number | null> = {
  "1": null,
  "1C": null,
  "1M": null,
  "2": 1e-3,
  "2M": null,
  "3R": 5e-3,
  "3B": 0.5,
  "4": null,
};
