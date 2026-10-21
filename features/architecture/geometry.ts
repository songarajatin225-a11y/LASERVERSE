/**
 * 2-D rigid-transform geometry for the conceptual vision-guided loop (handbook §12.2:
 * "Vision — acquire fiducials → Position — compute X, Y, θ offset → Laser process —
 * transformed job"). Pure functions, no server-only imports, unit-tested in
 * tests/unit/architecture.test.ts.
 *
 * Convention: a rigid transform T = {theta, tx, ty} maps p ↦ R(θ)·p + t.
 */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Rigid2D {
  /** rotation, radians (counter-clockwise positive) */
  theta: number;
  tx: number;
  ty: number;
}

export const IDENTITY: Rigid2D = { theta: 0, tx: 0, ty: 0 };

/** Wraps an angle to (−π, π]. */
export function wrapAngle(a: number): number {
  let r = a % (2 * Math.PI);
  if (r <= -Math.PI) r += 2 * Math.PI;
  if (r > Math.PI) r -= 2 * Math.PI;
  return r;
}

export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (degrees: number) => (degrees * Math.PI) / 180;

export function rotate(p: Vec2, theta: number): Vec2 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: c * p.x - s * p.y, y: s * p.x + c * p.y };
}

export function applyRigid(T: Rigid2D, p: Vec2): Vec2 {
  const r = rotate(p, T.theta);
  return { x: r.x + T.tx, y: r.y + T.ty };
}

/** A then B: p ↦ B(A(p)). */
export function composeRigid(A: Rigid2D, B: Rigid2D): Rigid2D {
  const t = applyRigid(B, { x: A.tx, y: A.ty });
  return { theta: wrapAngle(A.theta + B.theta), tx: t.x, ty: t.y };
}

export function inverseRigid(T: Rigid2D): Rigid2D {
  const t = rotate({ x: -T.tx, y: -T.ty }, -T.theta);
  return { theta: wrapAngle(-T.theta), tx: t.x, ty: t.y };
}

/** Rotation by θ about `center`, followed by a translation (dx, dy). */
export function poseAbout(center: Vec2, dx: number, dy: number, theta: number): Rigid2D {
  const rc = rotate(center, theta);
  return { theta: wrapAngle(theta), tx: center.x + dx - rc.x, ty: center.y + dy - rc.y };
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export interface TwoPointFit {
  transform: Rigid2D;
  /** |m2 − m1| / |n2 − n1| — 1 for a rigid part; a deviation flags a mis-found fiducial */
  scale: number;
  /** RMS distance between the transformed nominal fiducials and the found ones */
  residual: number;
}

/**
 * Rigid transform that maps nominal fiducials (n1, n2) onto found fiducials (m1, m2).
 * The angle comes from the two baselines, the translation from the centroids, which is
 * the least-squares rigid fit for two equally weighted point pairs.
 */
export function rigidFromTwoPoints(n1: Vec2, n2: Vec2, m1: Vec2, m2: Vec2): TwoPointFit {
  const dn = { x: n2.x - n1.x, y: n2.y - n1.y };
  const dm = { x: m2.x - m1.x, y: m2.y - m1.y };
  const ln = Math.hypot(dn.x, dn.y);
  const lm = Math.hypot(dm.x, dm.y);
  if (ln < 1e-12) throw new Error("rigidFromTwoPoints: nominal fiducials coincide");
  if (lm < 1e-12) throw new Error("rigidFromTwoPoints: found fiducials coincide");
  const theta = wrapAngle(Math.atan2(dm.y, dm.x) - Math.atan2(dn.y, dn.x));
  const cn = { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 };
  const cm = { x: (m1.x + m2.x) / 2, y: (m1.y + m2.y) / 2 };
  const rc = rotate(cn, theta);
  const transform = { theta, tx: cm.x - rc.x, ty: cm.y - rc.y };
  const e1 = dist(applyRigid(transform, n1), m1);
  const e2 = dist(applyRigid(transform, n2), m2);
  return { transform, scale: lm / ln, residual: Math.sqrt((e1 * e1 + e2 * e2) / 2) };
}

/** Largest distance between where A and where B put the same points. */
export function maxDeviation(A: Rigid2D, B: Rigid2D, points: Vec2[]): number {
  let m = 0;
  for (const p of points) m = Math.max(m, dist(applyRigid(A, p), applyRigid(B, p)));
  return m;
}
