import { pos, nonNeg, frac, atLeast } from "./core";

/**
 * Process and machine time models. These are DERIVED, simplified estimates:
 * they ignore scanner acceleration profiles, skywriting and controller latency
 * unless the user includes them as per-line overheads.
 */

export interface HatchFillInput {
  /** fill width (m) — lines run along this axis */
  width: number;
  /** fill height (m) — lines are stacked across this axis */
  height: number;
  /** hatch spacing (m) */
  hatch: number;
  /** marking speed (m/s) */
  markSpeed: number;
  /** jump speed between lines (m/s) */
  jumpSpeed: number;
  /** number of passes */
  passes: number;
  /** fixed delays per line (laser on/off, mark delay) (s) */
  perLineOverhead: number;
  bidirectional: boolean;
}

export interface HatchFillResult {
  lines: number;
  markLength: number;
  jumpLength: number;
  markTime: number;
  jumpTime: number;
  overheadTime: number;
  totalTime: number;
}

/** Hatch-fill scan time for a rectangle (§7.2–7.3 parameters). */
export function hatchFillTime(i: HatchFillInput): HatchFillResult {
  pos("Width", i.width);
  pos("Height", i.height);
  pos("Hatch spacing", i.hatch);
  pos("Mark speed", i.markSpeed);
  pos("Jump speed", i.jumpSpeed);
  atLeast("Passes", i.passes, 1);
  nonNeg("Per-line overhead", i.perLineOverhead);
  const lines = Math.floor(i.height / i.hatch) + 1;
  const markLength = lines * i.width * i.passes;
  // unidirectional: return jump across the width plus a hatch step; bidirectional: only the hatch step
  const perJump = i.bidirectional ? i.hatch : Math.hypot(i.width, i.hatch);
  const jumpLength = (lines - 1) * perJump * i.passes + (i.passes - 1) * Math.hypot(i.width, i.height);
  const markTime = markLength / i.markSpeed;
  const jumpTime = jumpLength / i.jumpSpeed;
  const overheadTime = lines * i.passes * i.perLineOverhead;
  return { lines, markLength, jumpLength, markTime, jumpTime, overheadTime, totalTime: markTime + jumpTime + overheadTime };
}

export interface CycleInput {
  process: number;
  handling: number;
  vision: number;
  indexing: number;
  other: number;
}

/** Cycle time split and bottleneck (§23.5 "process time + handling + vision + indexing"). */
export function cycleTime(i: CycleInput) {
  const parts = Object.entries(i).map(([k, v]) => [k, nonNeg(k, v)] as const);
  const total = parts.reduce((s, [, v]) => s + v, 0);
  pos("Cycle time", total);
  const bottleneck = parts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const laserShare = i.process / total;
  return { total, bottleneck, laserShare, shares: Object.fromEntries(parts.map(([k, v]) => [k, v / total])) };
}

/** Parts per hour at a given OEE: 3600/t_cycle × OEE */
export function throughputPerHour(tCycle: number, oee = 1): number {
  return (3600 / pos("Cycle time", tCycle)) * frac("OEE", oee);
}

/** Galvo addressing resolution = field / 2^bits (§7.2: XY2-100 16-bit, SL2-100 20-bit) */
export function galvoResolution(field: number, bits: number): number {
  return pos("Field size", field) / 2 ** atLeast("Bits", bits, 1);
}

/** Vision object-space resolution = FOV / pixels (§12.1) */
export function visionResolution(fov: number, pixels: number): number {
  return pos("Field of view", fov) / atLeast("Pixels", pixels, 1);
}

/** Smallest reliably measured feature ≈ 3–4 pixels (§12.1) */
export function minFeatureFromResolution(umPerPixel: number, pixels = 3): number {
  return pos("Resolution", umPerPixel) * pixels;
}

/** Area coverage rate of a scanned line process: (line width × speed) × (1 − overlap) correction via hatch. */
export function areaRate(speed: number, hatch: number): number {
  return pos("Speed", speed) * pos("Hatch spacing", hatch);
}
