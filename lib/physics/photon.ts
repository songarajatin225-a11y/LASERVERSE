import { C, pos, req, finite, CalcError } from "./core";

/** E = hc/λ (J). λ in metres (vacuum wavelength). Handbook §1.6, B.3. */
export function photonEnergyJ(lambda: number): number {
  return finite("E", (C.h * C.c) / pos("Wavelength", lambda));
}

/** Photon energy in eV. */
export function photonEnergyEv(lambda: number): number {
  return photonEnergyJ(lambda) / C.e;
}

/** ν = c/λ (Hz), vacuum wavelength. Frequency does not change in a medium (§1.6). */
export function frequencyFromWavelength(lambda: number): number {
  return C.c / pos("Wavelength", lambda);
}

/** λ = c/ν (m). */
export function wavelengthFromFrequency(nu: number): number {
  return C.c / pos("Frequency", nu);
}

/** Wavelength inside a medium of refractive index n: λ/n (§1.6). */
export function wavelengthInMedium(lambda: number, n: number): number {
  if (pos("Refractive index", n) < 1) throw new CalcError("Refractive index", "Refractive index must be ≥ 1");
  return pos("Wavelength", lambda) / n;
}

export function joulesToEv(j: number): number {
  return req("Energy", j) / C.e;
}
export function evToJoules(ev: number): number {
  return req("Energy", ev) * C.e;
}

/** Ṅ = Pλ/(hc): photons per second carried by optical power P (§1.6). */
export function photonFlux(power: number, lambda: number): number {
  if (req("Power", power) < 0) throw new CalcError("Power", "Power cannot be negative");
  return (power * pos("Wavelength", lambda)) / (C.h * C.c);
}

/** Number of photons in a pulse (or any optical energy) — distinguishes photon energy from total energy. */
export function photonsIn(energy: number, lambda: number): number {
  if (req("Energy", energy) < 0) throw new CalcError("Energy", "Energy cannot be negative");
  return energy / photonEnergyJ(lambda);
}

/** p = h/λ (kg·m/s) — §1.9 */
export function photonMomentum(lambda: number): number {
  return C.h / pos("Wavelength", lambda);
}

/** Radiation force F = P/c (absorbed) or 2P/c (reflected) — §1.9 */
export function radiationForce(power: number, mode: "absorbed" | "reflected"): number {
  if (req("Power", power) < 0) throw new CalcError("Power", "Power cannot be negative");
  return (mode === "reflected" ? 2 : 1) * (power / C.c);
}

/** Peak field amplitude from intensity, I = ½ n ε₀ c E₀² → E₀ = √(2I/(n ε₀ c)) — §1.10 */
export function fieldAmplitude(intensity: number, n = 1): number {
  return Math.sqrt((2 * pos("Intensity", intensity)) / (pos("Refractive index", n) * C.eps0 * C.c));
}

/** Wavelength corresponding to a band-gap energy (absorption edge): λ = hc/Eg — §1.6 reference energies */
export function edgeWavelength(eV: number): number {
  return (C.h * C.c) / (pos("Band-gap energy", eV) * C.e);
}

/** kT in eV at temperature T (K) — §1.4 */
export function thermalEnergyEv(T: number): number {
  return (C.kB * pos("Temperature", T)) / C.e;
}

/** Spectral region name per the handbook's §1.10 table (boundaries as printed there). */
export function spectralRegion(lambda: number): string {
  const nm = pos("Wavelength", lambda) * 1e9;
  if (nm < 10) return "X-ray";
  if (nm < 100) return "EUV";
  if (nm < 200) return "VUV";
  if (nm < 280) return "UV-C";
  if (nm < 315) return "UV-B";
  if (nm < 400) return "UV-A";
  if (nm < 780) return "Visible";
  if (nm < 1400) return "NIR (IR-A)";
  if (nm < 3000) return "SWIR (IR-B)";
  if (nm < 8000) return "MWIR";
  if (nm < 15000) return "LWIR";
  return "Far-IR / THz";
}

/**
 * Approximate sRGB colour for a visible wavelength (380–780 nm). Outside the visible
 * band a false colour is returned and `visible` is false — the UI must label it.
 * Colour mapping is a display convention (CONCEPTUAL), not a radiometric quantity.
 */
export function wavelengthColor(lambda: number): { css: string; visible: boolean } {
  const nm = lambda * 1e9;
  if (nm < 380) return { css: nm < 300 ? "#b39cff" : "#8f7bff", visible: false };
  if (nm > 780) return { css: nm < 1400 ? "#ff3d7f" : nm < 3000 ? "#ff8a3d" : "#ffb547", visible: false };
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  let f = 1;
  if (nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
  else if (nm > 700) f = 0.3 + (0.7 * (780 - nm)) / 80;
  const to = (c: number) => Math.round(255 * Math.pow(c * f, 0.8));
  return { css: `rgb(${to(r)} ${to(g)} ${to(b)})`, visible: true };
}
