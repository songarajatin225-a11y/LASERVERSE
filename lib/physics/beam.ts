import { pos, frac, finite, CalcError } from "./core";

/**
 * Gaussian-beam relationships (handbook Part IV, B.3).
 * Conventions: w = 1/e² RADIUS; d = 1/e² DIAMETER = 2w; θ = far-field HALF-angle;
 * BPP = w₀·θ (radius × half-angle) = M²λ/π; z_R defined with the embedded-Gaussian
 * model z_R = πw₀²/(M²λ). Real multimode beams are approximated through M² or BPP.
 */

function m2ok(m2: number): number {
  if (pos("M²", m2) < 1) throw new CalcError("M²", "M² cannot be below 1 (an ideal TEM₀₀ beam has M² = 1)");
  return m2;
}

/** z_R = π w₀² / (M² λ) */
export function rayleighRange(w0: number, lambda: number, m2 = 1): number {
  return (Math.PI * pos("Waist radius", w0) ** 2) / (m2ok(m2) * pos("Wavelength", lambda));
}

/** z_R from waist radius and beam parameter product: z_R = w₀/θ = w₀²/BPP */
export function rayleighRangeFromBpp(w0: number, bpp: number): number {
  return pos("Waist radius", w0) ** 2 / pos("BPP", bpp);
}

/** w(z) = w₀ √(1 + (z/z_R)²) */
export function beamRadiusAt(z: number, w0: number, zR: number): number {
  pos("Waist radius", w0);
  pos("Rayleigh range", zR);
  return w0 * Math.sqrt(1 + (z / zR) ** 2);
}

/** R(z) = z [1 + (z_R/z)²]; infinite at the waist. */
export function wavefrontRadius(z: number, zR: number): number {
  pos("Rayleigh range", zR);
  if (z === 0) return Number.POSITIVE_INFINITY;
  return z * (1 + (zR / z) ** 2);
}

/** θ = M² λ / (π w₀) — far-field half-angle divergence */
export function divergenceHalfAngle(w0: number, lambda: number, m2 = 1): number {
  return (m2ok(m2) * pos("Wavelength", lambda)) / (Math.PI * pos("Waist radius", w0));
}

/** BPP = M² λ / π (m·rad; 1 mm·mrad = 10⁻⁶ m·rad) */
export function bppFromM2(m2: number, lambda: number): number {
  return (m2ok(m2) * pos("Wavelength", lambda)) / Math.PI;
}

/** M² = π BPP / λ */
export function m2FromBpp(bpp: number, lambda: number): number {
  return (Math.PI * pos("BPP", bpp)) / pos("Wavelength", lambda);
}

/** d₀ = 4 M² λ f / (π D) — focused 1/e² spot DIAMETER of a collimated beam of 1/e² diameter D (§4.5) */
export function focusedSpotDiameter(lambda: number, m2: number, f: number, D: number): number {
  return finite("Spot diameter", (4 * m2ok(m2) * pos("Wavelength", lambda) * pos("Focal length", f)) / (Math.PI * pos("Beam diameter", D)));
}

/** DOF ≈ 2 z_R = π d₀² / (2 M² λ) — textbook depth of focus (§4.5) */
export function depthOfFocusTwoZr(d0: number, lambda: number, m2 = 1): number {
  return (Math.PI * pos("Spot diameter", d0) ** 2) / (2 * m2ok(m2) * pos("Wavelength", lambda));
}

/**
 * Practical half-range z_{±x} = z_R √((1+x)² − 1) over which spot size grows by at most x (§4.3).
 * x = 0.05 → 0.32 z_R; x = 0.10 → 0.46 z_R. The usable band is ±z_{±x} around focus.
 */
export function toleranceHalfRange(zR: number, x: number): number {
  pos("Rayleigh range", zR);
  frac("Spot-growth tolerance", x, { open: true });
  return zR * Math.sqrt((1 + x) ** 2 - 1);
}

/** Multimode-fiber imaging: d₀ ≈ d_core · f_focus / f_coll (§4.5) */
export function fiberImageSpot(dCore: number, fFocus: number, fColl: number): number {
  return pos("Core diameter", dCore) * (pos("Focusing focal length", fFocus) / pos("Collimator focal length", fColl));
}

/** Collimated diameter D_coll ≈ 2 f_coll NA_eff (§4.5) */
export function collimatedDiameter(fColl: number, naEff: number): number {
  if (pos("Effective NA", naEff) >= 1) throw new CalcError("Effective NA", "NA must be below 1 in air");
  return 2 * pos("Collimator focal length", fColl) * naEff;
}

/** BPP_fiber ≈ a_core · NA_eff (a = core RADIUS) (§4.4, §6.3) */
export function fiberBpp(coreRadius: number, naEff: number): number {
  return pos("Core radius", coreRadius) * pos("Effective NA", naEff);
}

/** V = 2π a NA / λ; single-mode when V < 2.405 (§2.5, §6.3) */
export function vNumber(coreRadius: number, na: number, lambda: number): number {
  return (2 * Math.PI * pos("Core radius", coreRadius) * pos("NA", na)) / pos("Wavelength", lambda);
}

/** Power fraction of a Gaussian beam (1/e² diameter D) passing a centred circular aperture of diameter A: 1 − exp(−2(A/D)²) (§4.5) */
export function apertureTransmission(apertureDiameter: number, beamDiameter: number): number {
  const r = pos("Aperture diameter", apertureDiameter) / pos("Beam diameter", beamDiameter);
  return 1 - Math.exp(-2 * r * r);
}

/** Peak (on-axis) intensity of a Gaussian beam I₀ = 2P/(π w₀²) (§4.1). W/m². */
export function gaussianPeakIntensity(power: number, w0: number): number {
  return (2 * pos("Power", power)) / (Math.PI * pos("Waist radius", w0) ** 2);
}

/** Mean intensity over the 1/e² area, P/(π w²) — appropriate for near top-hat multimode spots. W/m². */
export function meanIntensity(power: number, w: number): number {
  return pos("Power", power) / (Math.PI * pos("Spot radius", w) ** 2);
}

/** Normalised Gaussian radial profile I(r)/I₀ = exp(−2r²/w²) (§4.1) */
export function gaussianProfile(r: number, w: number): number {
  return Math.exp((-2 * r * r) / pos("Radius", w) ** 2);
}

/** NA = n sin θ (§4.4) */
export function numericalAperture(halfAngle: number, n = 1): number {
  return pos("Refractive index", n) * Math.sin(pos("Half-angle", halfAngle));
}

/** Beam-diameter conventions relative to the 1/e² diameter for a Gaussian beam (§4.1 table). */
export const DIAMETER_CONVENTION: Record<"1/e2" | "D4sigma" | "FWHM" | "knife-edge 10/90", number> = {
  "1/e2": 1,
  D4sigma: 1,
  FWHM: 0.589,
  "knife-edge 10/90": 0.64,
};

export interface FocusDesign {
  spotDiameter: number;
  waistRadius: number;
  rayleighRange: number;
  dofTwoZr: number;
  dofPm5: number;
  dofPm10: number;
  divergenceHalfAngle: number;
  bpp: number;
  /** Peak intensity at focus for the given power (Gaussian model) */
  peakIntensity?: number;
}

/** Complete focusing design for a collimated beam through a lens (Gaussian/M² model). */
export function focusDesign(lambda: number, m2: number, f: number, D: number, power?: number): FocusDesign {
  const d0 = focusedSpotDiameter(lambda, m2, f, D);
  const w0 = d0 / 2;
  const zR = rayleighRange(w0, lambda, m2);
  return {
    spotDiameter: d0,
    waistRadius: w0,
    rayleighRange: zR,
    dofTwoZr: 2 * zR,
    dofPm5: 2 * toleranceHalfRange(zR, 0.05),
    dofPm10: 2 * toleranceHalfRange(zR, 0.1),
    divergenceHalfAngle: divergenceHalfAngle(w0, lambda, m2),
    bpp: bppFromM2(m2, lambda),
    peakIntensity: power !== undefined && power > 0 ? gaussianPeakIntensity(power, w0) : undefined,
  };
}
