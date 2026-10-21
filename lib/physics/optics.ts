import { C, pos, req, CalcError } from "./core";

/** Normal-incidence Fresnel reflectance R = ((n₂−n₁)/(n₂+n₁))² — §5.2, B.3 (n₁ = 1 for air) */
export function fresnelNormal(n2: number, n1 = 1): number {
  pos("n₂", n2);
  pos("n₁", n1);
  return ((n2 - n1) / (n2 + n1)) ** 2;
}

/** Absorbing medium: R = ((n−1)² + k²)/((n+1)² + k²) — §9.1, B.3 */
export function reflectanceComplex(n: number, k: number): number {
  pos("n", n);
  if (req("k", k) < 0) throw new CalcError("k", "Extinction coefficient k cannot be negative");
  return ((n - 1) ** 2 + k * k) / ((n + 1) ** 2 + k * k);
}

/** Optical penetration depth δ = 1/α = λ/(4πk) — §9.1 */
export function penetrationDepth(lambda: number, k: number): number {
  return pos("Wavelength", lambda) / (4 * Math.PI * pos("k", k));
}

/** Absorption coefficient α = 4πk/λ (1/m) */
export function absorptionCoefficient(lambda: number, k: number): number {
  return (4 * Math.PI * pos("k", k)) / pos("Wavelength", lambda);
}

/** Transmitted intensity fraction after depth z: (1−R)·e^(−αz) — §9.1 */
export function transmittedFraction(R: number, alpha: number, z: number): number {
  return (1 - R) * Math.exp(-pos("α", alpha) * Math.max(0, req("Depth", z)));
}

/**
 * Hagen–Rubens infrared absorptance of a metal A ≈ 2√(2ε₀ω/σₑ) — §1.11.
 * Valid in the IR where ω τ_collision ≪ 1; it underestimates real, rough or hot surfaces.
 */
export function hagenRubensAbsorptance(sigma: number, lambda: number): number {
  const omega = (2 * Math.PI * C.c) / pos("Wavelength", lambda);
  return 2 * Math.sqrt((2 * C.eps0 * omega) / pos("Electrical conductivity", sigma));
}

/** Brewster angle tan θ_B = n₂/n₁ (radians) — §1.8 */
export function brewsterAngle(n2: number, n1 = 1): number {
  return Math.atan(pos("n₂", n2) / pos("n₁", n1));
}

/**
 * Pulsed LIDT scaling LIDT(τ₂) ≈ LIDT(τ₁)√(τ₂/τ₁) — §5.3.
 * Roughly valid from ~10 ps into the µs range; below ~10 ps the √τ law fails.
 * Returns the scaled value and whether it is inside the stated validity range.
 */
export function lidtScale(lidt1: number, tau1: number, tau2: number): { value: number; inRange: boolean } {
  pos("Reference LIDT", lidt1);
  pos("Reference pulse duration", tau1);
  pos("Target pulse duration", tau2);
  const inRange = Math.min(tau1, tau2) >= 10e-12 && Math.max(tau1, tau2) <= 1e-3;
  return { value: lidt1 * Math.sqrt(tau2 / tau1), inRange };
}

/** Optic energy balance R + T + A + S = 1 → absorbed power in an optic */
export function absorbedPower(power: number, absorptionFraction: number): number {
  return pos("Power", power) * pos("Absorption", absorptionFraction);
}
