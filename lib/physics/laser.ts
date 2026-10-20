import { C, pos, frac, req, finite, CalcError } from "./core";

/** η_QD = 1 − λ_pump/λ_laser — §2.2 */
export function quantumDefect(lambdaPump: number, lambdaLaser: number): number {
  pos("Pump wavelength", lambdaPump);
  pos("Laser wavelength", lambdaLaser);
  if (lambdaPump > lambdaLaser) throw new CalcError("Pump wavelength", "Pump wavelength must be shorter than the laser wavelength");
  return 1 - lambdaPump / lambdaLaser;
}

/** Δν_FSR = c/(2nL) for a linear (standing-wave) cavity of length L — §2.5 */
export function freeSpectralRange(n: number, L: number): number {
  return C.c / (2 * pos("Refractive index", n) * pos("Cavity length", L));
}

/** L_c ≈ λ²/Δλ — §2.5 */
export function coherenceLengthFromBandwidth(lambda: number, dLambda: number): number {
  return pos("Wavelength", lambda) ** 2 / pos("Spectral width", dLambda);
}

/** L_c ≈ c/Δν — §2.5 */
export function coherenceLengthFromLinewidth(dNu: number): number {
  return C.c / pos("Linewidth", dNu);
}

/** Δν ≈ 1/(2πτ): natural linewidth of a level with lifetime τ — §1.4 */
export function linewidthFromLifetime(tau: number): number {
  return 1 / (2 * Math.PI * pos("Lifetime", tau));
}

/**
 * Threshold gain g_th = α + (1/2L)·ln(1/(R₁R₂)) — §2.4.
 * α: distributed loss (1/m), L: gain length (m), R₁, R₂: mirror reflectances (0–1].
 */
export function thresholdGain(alpha: number, L: number, R1: number, R2: number): number {
  if (req("Internal loss", alpha) < 0) throw new CalcError("Internal loss", "Internal loss cannot be negative");
  pos("Gain length", L);
  frac("R₁", R1, {});
  frac("R₂", R2, {});
  if (R1 === 0 || R2 === 0) throw new CalcError("R₂", "Mirror reflectance must be greater than zero for feedback");
  return finite("Threshold gain", alpha + (1 / (2 * L)) * Math.log(1 / (R1 * R2)));
}

/** Round-trip net gain factor G = R₁R₂·exp(2(g − α)L). Lasing when G ≥ 1 — §2.4 */
export function roundTripGain(g: number, alpha: number, L: number, R1: number, R2: number): number {
  req("Gain", g);
  return R1 * R2 * Math.exp(2 * (g - alpha) * pos("Gain length", L));
}

/** P_out = η_s (P_pump − P_th) above threshold, 0 below — §2.4 */
export function outputPower(slope: number, pPump: number, pTh: number): number {
  frac("Slope efficiency", slope);
  return pPump > pTh ? slope * (pPump - pTh) : 0;
}

/**
 * Brightness (radiance) B ≈ P/((M²)²λ²) — §2.5. Returns W/(m²·sr).
 * (Divide by 10⁴ for the handbook's W/(cm²·sr).)
 */
export function brightness(power: number, m2: number, lambda: number): number {
  if (pos("M²", m2) < 1) throw new CalcError("M²", "M² cannot be below 1 (ideal Gaussian)");
  return pos("Power", power) / (m2 * m2 * pos("Wavelength", lambda) ** 2);
}

/** Boltzmann ratio N₂/N₁ = (g₂/g₁)·exp(−ΔE/kT) — §1.4. ΔE in joules. */
export function boltzmannRatio(dE: number, T: number, degeneracyRatio = 1): number {
  return pos("Degeneracy ratio", degeneracyRatio) * Math.exp(-pos("Energy gap", dE) / (C.kB * pos("Temperature", T)));
}

/**
 * Q-switched pulse energy vs repetition rate: E_p(f) ≈ E_p,0 (1 − e^(−1/(fτ))) — §2.8.
 * τ is the upper-state lifetime. Returns the fraction relative to E_p,0 when ep0 = 1.
 */
export function qSwitchPulseEnergy(ep0: number, f: number, tau: number): number {
  return pos("Low-rate pulse energy", ep0) * (1 - Math.exp(-1 / (pos("Repetition rate", f) * pos("Upper-state lifetime", tau))));
}

/** Saturation intensity I_sat = hν/(σ τ) — §2.3. σ in m², τ in s. Returns W/m². */
export function saturationIntensity(lambda: number, sigma: number, tau: number): number {
  return (C.h * C.c) / pos("Wavelength", lambda) / (pos("Cross-section", sigma) * pos("Lifetime", tau));
}
