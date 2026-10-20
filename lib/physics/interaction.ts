import { pos, nonNeg, req, frac, finite, CalcError } from "./core";

/**
 * Laser–material interaction quantities (handbook Part IX, §2.9, §7.3, §10.4, B.3).
 * Fluence/intensity use the 1/e² radius w₀. "Peak" values are on-axis Gaussian values.
 */

/** Gaussian peak fluence F₀ = 2E_p/(π w₀²) — §2.9 (J/m²) */
export function peakFluence(ep: number, w0: number): number {
  return (2 * nonNeg("Pulse energy", ep)) / (Math.PI * pos("Spot radius", w0) ** 2);
}

/** Mean fluence over the 1/e² area E_p/(π w₀²) (J/m²) */
export function meanFluence(ep: number, w0: number): number {
  return nonNeg("Pulse energy", ep) / (Math.PI * pos("Spot radius", w0) ** 2);
}

/** Peak intensity of a pulse I₀ ≈ F₀/τ — §2.9 (W/m²; rectangular-in-time approximation) */
export function pulsePeakIntensity(F0: number, tau: number): number {
  return finite("Intensity", nonNeg("Fluence", F0) / pos("Pulse duration", tau));
}

/** Heat input per unit length Q = ηP/v — §10.4 (J/m) */
export function heatInputPerLength(eta: number, P: number, v: number): number {
  frac("Absorptance η", eta);
  return (eta * nonNeg("Power", P)) / pos("Speed", v);
}

/** Centre-to-centre pulse spacing on the surface Δx = v/f — §2.9 */
export function pulseSpacing(v: number, f: number): number {
  return pos("Speed", v) / pos("Repetition rate", f);
}

/**
 * Pulse overlap O = 1 − v/(f d) — §2.9. Negative values mean gaps between spots
 * (spacing larger than the spot diameter); they are returned, not clamped.
 */
export function pulseOverlap(v: number, f: number, d: number): number {
  return 1 - pulseSpacing(v, f) / pos("Spot diameter", d);
}

/** Hatch (line) overlap 1 − h/d — analogous to pulse overlap, §7.3 */
export function hatchOverlap(h: number, d: number): number {
  return 1 - pos("Hatch spacing", h) / pos("Spot diameter", d);
}

/** Number of pulses that hit a given surface point along one line ≈ d·f/v */
export function pulsesPerSpot(v: number, f: number, d: number): number {
  return pos("Spot diameter", d) / pulseSpacing(v, f);
}

/** Thermal diffusivity κ = K/(ρ c_p) — §9.4 (m²/s) */
export function thermalDiffusivity(K: number, rho: number, cp: number): number {
  return pos("Thermal conductivity", K) / (pos("Density", rho) * pos("Specific heat", cp));
}

/** Thermal diffusion length L_th ≈ 2√(κτ) — §9.4 */
export function thermalDiffusionLength(kappa: number, tau: number): number {
  return 2 * Math.sqrt(pos("Thermal diffusivity", kappa) * pos("Interaction time", tau));
}

/** Interaction (dwell) time of a moving CW spot ≈ d/v */
export function dwellTime(d: number, v: number): number {
  return pos("Spot diameter", d) / pos("Speed", v);
}

/** Ablation depth per pulse d ≈ δ ln(F₀/F_th) above threshold, 0 below — §9.5 */
export function ablationDepthPerPulse(delta: number, F0: number, Fth: number): number {
  pos("Penetration depth δ", delta);
  pos("Threshold fluence", Fth);
  if (nonNeg("Peak fluence", F0) <= Fth) return 0;
  return delta * Math.log(F0 / Fth);
}

/** Energy-efficient optimum peak fluence F_opt ≈ e² F_th — §9.5 */
export function optimumFluence(Fth: number): number {
  return Math.E ** 2 * pos("Threshold fluence", Fth);
}

/** Incubation F_th(N) = F_th(1)·N^(S−1), S < 1 — §9.5 */
export function incubatedThreshold(Fth1: number, N: number, S: number): number {
  pos("Single-pulse threshold", Fth1);
  if (pos("Pulse count", N) < 1) throw new CalcError("Pulse count", "Pulse count must be at least 1");
  if (req("Incubation coefficient S", S) <= 0 || S > 1) throw new CalcError("Incubation coefficient S", "S must be in (0, 1]");
  return Fth1 * N ** (S - 1);
}

/** Radius on a Gaussian spot where local fluence equals F_th: r = w₀√(½ ln(F₀/F_th)) (crater radius) */
export function craterRadius(w0: number, F0: number, Fth: number): number {
  pos("Spot radius", w0);
  if (nonNeg("Peak fluence", F0) <= pos("Threshold fluence", Fth)) return 0;
  return w0 * Math.sqrt(0.5 * Math.log(F0 / Fth));
}

/** Critical power for self-focusing P_cr ≈ 3.77λ²/(8π n₀ n₂) — §10.15. n₂ in m²/W. */
export function criticalPowerSelfFocusing(lambda: number, n0: number, n2: number): number {
  return (3.77 * pos("Wavelength", lambda) ** 2) / (8 * Math.PI * pos("Linear index n₀", n0) * pos("Nonlinear index n₂", n2));
}

/**
 * Welding-mode indicator from mean spot intensity using the handbook's thresholds (§10.4):
 * conduction < ~10⁶ W/cm², transition ~10⁶, keyhole ≳ 10⁶ W/cm² (steel). Indicative only:
 * real mode depends on material, absorptance, speed and spot.
 */
export function weldingModeIndicator(intensityWm2: number): "conduction" | "transition" | "keyhole" {
  const wcm2 = nonNeg("Intensity", intensityWm2) / 1e4;
  if (wcm2 < 5e5) return "conduction";
  if (wcm2 < 2e6) return "transition";
  return "keyhole";
}

/** Pulse-duration regime labels from §27.1 "Pulse-duration regimes". */
export function pulseRegime(tau: number): "CW / ms" | "µs" | "ns" | "ps" | "fs" {
  const t = pos("Pulse duration", tau);
  if (t >= 1e-4) return "CW / ms";
  if (t >= 1e-6) return "µs";
  if (t >= 1e-9) return "ns";
  if (t >= 1e-12) return "ps";
  return "fs";
}
