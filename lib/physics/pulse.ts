import { C, pos, nonNeg, finite, CalcError } from "./core";

export type PulseShape = "square" | "gaussian" | "sech2";

/** Peak-power shape factor k in P_peak ≈ k·E_p/τ (τ = FWHM) — §2.9 */
export const SHAPE_FACTOR: Record<PulseShape, number> = { square: 1, gaussian: 0.94, sech2: 0.88 };

/** Minimum time–bandwidth product Δν·Δτ — §10.15 */
export const TIME_BANDWIDTH: Record<Exclude<PulseShape, "square">, number> = { gaussian: 0.441, sech2: 0.315 };

/** E_p = P_avg / f — §2.9 */
export function pulseEnergy(pAvg: number, f: number): number {
  return nonNeg("Average power", pAvg) / pos("Repetition rate", f);
}

/** P_avg = E_p · f — §2.9 */
export function averagePower(ep: number, f: number): number {
  return nonNeg("Pulse energy", ep) * pos("Repetition rate", f);
}

/** P_peak ≈ k · E_p / τ — §2.9 (rectangular approximation when shape = "square") */
export function peakPower(ep: number, tau: number, shape: PulseShape = "square"): number {
  return finite("Peak power", (SHAPE_FACTOR[shape] * nonNeg("Pulse energy", ep)) / pos("Pulse duration", tau));
}

/** D = τ · f — §2.9. Rejects τ longer than the pulse period. */
export function dutyCycle(tau: number, f: number): number {
  const d = pos("Pulse duration", tau) * pos("Repetition rate", f);
  if (d > 1) throw new CalcError("Pulse duration", "Pulse duration exceeds the pulse period (1/f); pulses would overlap");
  return d;
}

export function pulsePeriod(f: number): number {
  return 1 / pos("Repetition rate", f);
}

/** Minimum spectral bandwidth (Hz) for a transform-limited pulse of FWHM τ — §10.15 */
export function minimumBandwidthHz(tau: number, shape: Exclude<PulseShape, "square">): number {
  return TIME_BANDWIDTH[shape] / pos("Pulse duration", tau);
}

/** Convert a frequency bandwidth to wavelength bandwidth at centre λ: Δλ = λ²Δν/c */
export function bandwidthToWavelength(dNu: number, lambda: number): number {
  return (pos("Wavelength", lambda) ** 2 * pos("Bandwidth", dNu)) / C.c;
}

export interface PulseSummary {
  pulseEnergy: number;
  peakPower: number;
  dutyCycle: number;
  period: number;
  /** ratio of peak to average power (= k/D) */
  peakToAverage: number;
}

/** Consistent set of pulse quantities from average power, repetition rate and duration. */
export function pulseSummary(pAvg: number, f: number, tau: number, shape: PulseShape = "square"): PulseSummary {
  const ep = pulseEnergy(pAvg, f);
  const pp = peakPower(ep, tau, shape);
  const d = dutyCycle(tau, f);
  return { pulseEnergy: ep, peakPower: pp, dutyCycle: d, period: 1 / f, peakToAverage: pAvg > 0 ? pp / pAvg : SHAPE_FACTOR[shape] / d };
}
