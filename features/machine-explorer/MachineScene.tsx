"use client";

/**
 * Real-time 3D model of a GENERIC Class 1 fiber-laser marking workstation (handbook
 * §26.1, machine 1). All geometry is original, simplified and illustrative — it is not
 * any vendor's design and it is not to scale in every detail. Units are metres.
 *
 * Layer visibility, explode and highlighting are visualization aids only; the
 * interlock logic is conceptual (see machineData.emissionPermitted).
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, ContactShadows, Edges, Environment, Lightformer, Line, RoundedBox, useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { Line2 } from "three-stdlib";
import { COMPONENT_INDEX, OPTICAL_PATH, SIGNALS, type Layer } from "./machineData";

/* ------------------------------------------------------------------ layout constants */
const TABLE = 0.82; // work-table surface
const AX = 0.035; // scan (lens) axis x
const AZ = -0.02; // scan axis z
const WTOP = 0.847; // workpiece top surface
const F = 0.16; // F-theta focal length (§26.1: f = 160 mm)
const LENS_BOT = WTOP + F; // working distance drawn ≈ f (illustrative)
const MY = 1.105; // beam height through the scan head
const M1: V3 = [0, MY, AZ]; // X mirror
const M2: V3 = [AX, MY, AZ]; // Y mirror
const COLLIMATOR_EXIT: V3 = [0, MY, -0.17];
const ZX = -0.09; // Z column x (offset from the beam axis)
const BEAM_FALSE_COLOUR = "#ff3d7f"; // 1064 nm is invisible: false colour (see wavelengthColor)
const POINTER_RED = "#ff2a2a";
const HIGHLIGHT = new THREE.Color("#2fd3c9");

/** Job: an ILLUSTRATIVE 2D-code-like module pattern (not an encoded DataMatrix). */
const MODULES = 12;
const MODULE = 0.0022; // 2.2 mm
const MODULES_PER_S = 18;

type V3 = [number, number, number];
export type CameraPreset = "overview" | "front" | "head" | "top" | "exploded";

/** Explode offsets (m) at full explode. */
export const EXPLODE: Record<string, V3> = {
  enclosure: [0, 0.62, 0],
  door: [0, 0.62, 0.32],
  window: [0, 0.62, 0.32],
  interlock: [0.08, 0.62, 0.2],
  beacon: [0, 0.84, 0],
  galvo: [0, 0.2, 0],
  ftheta: [0, 0.07, 0],
  pointer: [0.16, 0.2, 0],
  collimator: [0, 0.2, -0.14],
  expander: [0, 0.2, -0.07],
  zaxis: [0, 0, -0.24],
  camera: [-0.18, 0.24, 0.12],
  fixture: [0, 0, 0.22],
  workpiece: [0, 0.06, 0.22],
  source: [-0.5, 0, 0.38],
  fiber: [-0.22, 0.12, -0.18],
  ipc: [0.5, 0, 0.38],
  safety: [0.28, 0, -0.4],
  estop: [0, 0, 0.16],
  key: [0, 0, 0.16],
  hmi: [0.24, 0, 0.12],
  extraction: [-0.3, 0, -0.12],
  base: [0, 0, 0],
};

/** Nominal anchor points for control-flow lines. */
const ANCHOR: Record<string, V3> = {
  ipc: [0.2, 0.42, 0.12],
  galvo: [0.02, 1.15, -0.025],
  source: [-0.18, 0.58, 0.12],
  zaxis: [-0.09, 1.32, -0.22],
  camera: [-0.085, 1.1, 0.055],
  hmi: [0.56, 1.3, 0.1],
  interlock: [0.35, 1.47, 0.3],
  estop: [0.3, 0.72, 0.32],
  key: [0.2, 0.72, 0.32],
  extraction: [-0.62, 0.74, -0.1],
  safety: [0.15, 0.62, -0.26],
  beacon: [0.33, 1.66, -0.24],
};

export const PRESETS: Record<CameraPreset, { pos: V3; target: V3 }> = {
  overview: { pos: [1.7, 1.62, 2.05], target: [0, 0.86, 0] },
  front: { pos: [0, 1.12, 2.35], target: [0, 0.92, 0] },
  head: { pos: [0.16, 1.17, 0.78], target: [0.03, 1.0, -0.03] },
  top: { pos: [0.0, 3.1, 0.35], target: [0, 0.8, 0] },
  exploded: { pos: [2.9, 2.4, 3.3], target: [0, 1.12, 0] },
};

export interface SceneApi {
  preset: (p: CameraPreset) => void;
  focus: (id: string) => void;
}

export interface MachineSceneProps {
  selected: string | null;
  hovered: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string, on: boolean) => void;
  layers: Record<Layer, boolean>;
  explode: boolean;
  focusPath: boolean;
  showSignals: boolean;
  doorOpen: boolean;
  emitting: boolean;
  pointerPreview: boolean;
  /** increments to start a new job */
  jobKey: number;
  onProgress: (fraction: number) => void;
  onJobDone: () => void;
  motion: boolean;
  apiRef: MutableRefObject<SceneApi | null>;
  onContextLost: () => void;
}

/* ------------------------------------------------------------------ contexts */
interface SceneCtxValue {
  selected: string | null;
  hovered: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string, on: boolean) => void;
  layers: Record<Layer, boolean>;
  focusPath: boolean;
  explodeRef: MutableRefObject<number>;
  register: (id: string, obj: THREE.Object3D | null) => void;
}
const SceneCtx = createContext<SceneCtxValue | null>(null);
type PartState = "normal" | "hover" | "selected" | "dim";
const PartCtx = createContext<PartState>("normal");

const noRaycast = () => null;
const isVisible = (id: string, layers: Record<Layer, boolean>) => (COMPONENT_INDEX.get(id)?.layers ?? []).some((l) => layers[l]);
const offset = (id: string, e: number): V3 => {
  const v = EXPLODE[id] ?? [0, 0, 0];
  return [v[0] * e, v[1] * e, v[2] * e];
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/* ------------------------------------------------------------------ materials & primitives */
function Mat({
  color,
  metal = 0.35,
  rough = 0.55,
  opacity = 1,
  emissive,
  glow = 0,
  side,
}: {
  color: string;
  metal?: number;
  rough?: number;
  opacity?: number;
  emissive?: string;
  glow?: number;
  side?: THREE.Side;
}) {
  const st = useContext(PartCtx);
  const hl = st === "selected" ? 0.6 : st === "hover" ? 0.3 : 0;
  const op = opacity * (st === "dim" ? 0.12 : 1);
  return (
    <meshStandardMaterial
      color={color}
      metalness={metal}
      roughness={rough}
      transparent={op < 1}
      opacity={op}
      depthWrite={op >= 0.99}
      emissive={hl ? HIGHLIGHT : (emissive ?? "#000000")}
      emissiveIntensity={hl ? hl : glow}
      side={side ?? THREE.FrontSide}
    />
  );
}

type MatProps = Parameters<typeof Mat>[0];

function Box({ p, s, ray = true, edges, ...m }: { p: V3; s: V3; ray?: boolean; edges?: string } & MatProps) {
  return (
    <mesh position={p} raycast={ray ? undefined : noRaycast}>
      <boxGeometry args={s} />
      <Mat {...m} />
      {edges ? <Edges color={edges} threshold={15} /> : null}
    </mesh>
  );
}

function RBox({ p, s, r = 0.008, ...m }: { p: V3; s: V3; r?: number } & MatProps) {
  return (
    <RoundedBox position={p} args={s} radius={r} smoothness={3}>
      <Mat {...m} />
    </RoundedBox>
  );
}

const AXIS_ROT: Record<"x" | "y" | "z", V3> = { x: [0, 0, Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };
function Cyl({ p, r, h, axis = "y", r2, seg = 32, ray = true, ...m }: { p: V3; r: number; h: number; axis?: "x" | "y" | "z"; r2?: number; seg?: number; ray?: boolean } & MatProps) {
  return (
    <mesh position={p} rotation={AXIS_ROT[axis]} raycast={ray ? undefined : noRaycast}>
      <cylinderGeometry args={[r2 ?? r, r, h, seg]} />
      <Mat {...m} />
    </mesh>
  );
}

function Tube({ points, r, ...m }: { points: V3[]; r: number } & MatProps) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q)), false, "centripetal");
    return new THREE.TubeGeometry(curve, 96, r, 10, false);
  }, [points, r]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <Mat {...m} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ part wrapper */
function Part({ id, children }: { id: string; children: ReactNode }) {
  const ctx = useContext(SceneCtx)!;
  const ref = useRef<THREE.Group>(null);
  const visible = isVisible(id, ctx.layers);
  const state: PartState =
    ctx.selected === id ? "selected" : ctx.hovered === id ? "hover" : ctx.focusPath && !OPTICAL_PATH.includes(id) ? "dim" : "normal";

  useEffect(() => {
    ctx.register(id, ref.current);
    return () => ctx.register(id, null);
  }, [id]); // registry is stable for the scene's lifetime

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const o = offset(id, ctx.explodeRef.current);
    g.position.set(o[0], o[1], o[2]);
  });

  return (
    <group
      ref={ref}
      name={id}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        ctx.onHover(id, true);
      }}
      onPointerOut={() => ctx.onHover(id, false)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        ctx.onSelect(id);
      }}
    >
      {visible ? <PartCtx.Provider value={state}>{children}</PartCtx.Provider> : null}
    </group>
  );
}

/* ------------------------------------------------------------------ machine geometry */
const C = {
  cabinet: "#3b424b",
  frame: "#cfd3d8",
  panel: "#9fb6c8",
  dark: "#1c2026",
  anod: "#2a2f36",
  alu: "#b9c0c8",
  steel: "#c9ced3",
  plate: "#7c848d",
};

function BaseCabinet() {
  const posts: V3[] = [
    [-0.385, 0.4, -0.285],
    [0.385, 0.4, -0.285],
    [-0.385, 0.4, 0.285],
    [0.385, 0.4, 0.285],
  ];
  return (
    <Part id="base">
      {posts.map((p, i) => (
        <Box key={i} p={p} s={[0.03, 0.8, 0.03]} color={C.cabinet} metal={0.5} rough={0.45} />
      ))}
      {/* plinth and table top */}
      <Box p={[0, 0.03, 0]} s={[0.8, 0.06, 0.6]} color={C.dark} metal={0.4} rough={0.6} />
      <Box p={[0, 0.81, 0]} s={[0.82, 0.02, 0.62]} color={C.plate} metal={0.6} rough={0.35} />
      {/* translucent side skins so the internals stay visible (rendering choice) */}
      <Box p={[-0.398, 0.43, 0]} s={[0.004, 0.74, 0.56]} color={C.cabinet} opacity={0.28} ray={false} edges="#59616b" />
      <Box p={[0.398, 0.43, 0]} s={[0.004, 0.74, 0.56]} color={C.cabinet} opacity={0.28} ray={false} edges="#59616b" />
      <Box p={[0, 0.43, -0.298]} s={[0.76, 0.74, 0.004]} color={C.cabinet} opacity={0.35} ray={false} />
      <Box p={[0, 0.43, 0.298]} s={[0.76, 0.74, 0.004]} color={C.cabinet} opacity={0.22} ray={false} edges="#59616b" />
      {/* door handles */}
      <Box p={[-0.02, 0.45, 0.305]} s={[0.012, 0.12, 0.012]} color={C.alu} metal={0.8} rough={0.25} />
      <Box p={[0.02, 0.45, 0.305]} s={[0.012, 0.12, 0.012]} color={C.alu} metal={0.8} rough={0.25} />
      {/* T-slots on table */}
      {[-0.24, -0.12, 0.12, 0.24].map((x) => (
        <Box key={x} p={[x, 0.8205, 0.02]} s={[0.012, 0.002, 0.5]} color={C.dark} ray={false} />
      ))}
    </Part>
  );
}

function Source() {
  return (
    <Part id="source">
      <RBox p={[-0.18, 0.5, 0.02]} s={[0.3, 0.13, 0.44]} color="#e3e6ea" metal={0.25} rough={0.4} />
      <Box p={[-0.18, 0.5, 0.242]} s={[0.26, 0.09, 0.006]} color={C.dark} />
      <Box p={[-0.26, 0.52, 0.247]} s={[0.05, 0.016, 0.003]} color="#0d2b33" emissive="#2fd3c9" glow={0.35} />
      {[0, 1, 2].map((i) => (
        <Box key={i} p={[-0.1 + i * 0.03, 0.47, 0.247]} s={[0.01, 0.01, 0.003]} color={i === 0 ? "#22c55e" : "#334"} emissive={i === 0 ? "#22c55e" : undefined} glow={i === 0 ? 0.8 : 0} />
      ))}
      {/* cooling fins */}
      {Array.from({ length: 9 }, (_, i) => (
        <Box key={i} p={[-0.335, 0.5, -0.15 + i * 0.035]} s={[0.012, 0.1, 0.006]} color={C.alu} metal={0.7} rough={0.35} />
      ))}
    </Part>
  );
}

const FIBER_PATH: V3[] = [
  [-0.18, 0.57, -0.19],
  [-0.17, 0.74, -0.27],
  [-0.12, 0.93, -0.29],
  [-0.05, 1.2, -0.285],
  [0.0, 1.17, -0.255],
  [0, MY, -0.235],
];

function Fiber() {
  return (
    <Part id="fiber">
      <Tube points={FIBER_PATH} r={0.0075} color="#d0a23c" metal={0.2} rough={0.6} />
    </Part>
  );
}

function Collimator() {
  return (
    <Part id="collimator">
      <Cyl p={[0, MY, -0.2]} r={0.017} h={0.06} axis="z" color={C.anod} metal={0.6} rough={0.35} />
      <Cyl p={[0, MY, -0.2]} r={0.0185} h={0.012} axis="z" color={C.alu} metal={0.85} rough={0.25} />
    </Part>
  );
}

function Expander() {
  return (
    <Part id="expander">
      <Cyl p={[0, MY, -0.123]} r={0.016} r2={0.023} h={0.085} axis="z" color="#3a4048" metal={0.7} rough={0.3} />
      <Cyl p={[0, MY, -0.083]} r={0.024} h={0.008} axis="z" color={C.alu} metal={0.85} rough={0.2} />
    </Part>
  );
}

function ZAxis() {
  return (
    <Part id="zaxis">
      <Box p={[ZX, 1.13, -0.235]} s={[0.09, 0.62, 0.08]} color={C.alu} metal={0.75} rough={0.3} />
      <Box p={[ZX, 1.13, -0.193]} s={[0.03, 0.58, 0.006]} color={C.dark} />
      <Box p={[ZX, 1.47, -0.235]} s={[0.1, 0.06, 0.09]} color={C.cabinet} metal={0.5} rough={0.45} />
      {/* carriage plate and arm carrying the beam train and scan head */}
      <Box p={[ZX, MY, -0.185]} s={[0.11, 0.12, 0.02]} color={C.cabinet} metal={0.5} rough={0.4} />
      <Box p={[-0.03, 1.06, -0.115]} s={[0.05, 0.022, 0.19]} color={C.cabinet} metal={0.5} rough={0.4} />
      {/* hand wheel */}
      <mesh position={[ZX, 1.515, -0.235]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.03, 0.005, 10, 32]} />
        <Mat color={C.alu} metal={0.8} rough={0.3} />
      </mesh>
    </Part>
  );
}

function Galvo({ scanRef }: { scanRef: MutableRefObject<{ d1: number; d2: number }> }) {
  const m1 = useRef<THREE.Mesh>(null);
  const m2 = useRef<THREE.Mesh>(null);
  useFrame(() => {
    // mirror rotation is half the optical scan angle (θ = s / f)
    if (m1.current) m1.current.rotation.set(0, (3 * Math.PI) / 4 + scanRef.current.d1, 0);
    if (m2.current) m2.current.rotation.set(0, -Math.PI / 2, Math.PI / 4 + scanRef.current.d2, "ZYX");
  });
  return (
    <Part id="galvo">
      {/* housing drawn translucent so the mirrors are visible */}
      <RBox p={[0.02, 1.1, -0.025]} s={[0.125, 0.08, 0.125]} r={0.006} color={C.dark} opacity={0.42} metal={0.3} rough={0.3} />
      <Box p={[0.02, 1.141, -0.025]} s={[0.125, 0.004, 0.125]} color={C.anod} metal={0.5} rough={0.4} />
      {/* X motor (vertical axis) and Y motor (axis along z) */}
      <Cyl p={[0, 1.128, AZ]} r={0.011} h={0.032} color="#9aa3ad" metal={0.85} rough={0.25} />
      <Cyl p={[AX, MY, AZ - 0.04]} r={0.011} h={0.04} axis="z" color="#9aa3ad" metal={0.85} rough={0.25} />
      <mesh ref={m1} position={M1}>
        <boxGeometry args={[0.024, 0.017, 0.0016]} />
        <Mat color="#e9eef3" metal={1} rough={0.05} />
      </mesh>
      <mesh ref={m2} position={M2}>
        <boxGeometry args={[0.024, 0.017, 0.0016]} />
        <Mat color="#e9eef3" metal={1} rough={0.05} />
      </mesh>
      {/* aperture on the lens side */}
      <Cyl p={[AX, 1.062, AZ]} r={0.009} h={0.002} color="#000000" ray={false} />
    </Part>
  );
}

function FTheta() {
  return (
    <Part id="ftheta">
      <Cyl p={[AX, 1.056, AZ]} r={0.05} h={0.008} color={C.alu} metal={0.85} rough={0.25} />
      <Cyl p={[AX, LENS_BOT + 0.0225, AZ]} r={0.042} r2={0.044} h={0.045} color={C.anod} metal={0.55} rough={0.35} />
      <Cyl p={[AX, LENS_BOT + 0.0015, AZ]} r={0.034} h={0.002} color="#88b8d8" metal={0.1} rough={0.05} opacity={0.75} />
      {/* engraved rings */}
      {[0.012, 0.032].map((dy) => (
        <Cyl key={dy} p={[AX, LENS_BOT + dy, AZ]} r={0.0445} h={0.0015} color="#14171b" ray={false} />
      ))}
    </Part>
  );
}

function PointerModule() {
  return (
    <Part id="pointer">
      <Cyl p={[0.093, 1.105, -0.05]} r={0.008} h={0.04} axis="x" color="#b8202a" metal={0.4} rough={0.4} />
      <Cyl p={[0.115, 1.105, -0.05]} r={0.0055} h={0.006} axis="x" color={C.alu} metal={0.8} rough={0.2} />
    </Part>
  );
}

function Fixture() {
  return (
    <Part id="fixture">
      <Box p={[AX, 0.8275, AZ]} s={[0.26, 0.015, 0.2]} color={C.plate} metal={0.65} rough={0.35} />
      {/* datum pins and clamps */}
      <Cyl p={[AX - 0.055, 0.841, AZ - 0.045]} r={0.004} h={0.012} color="#e6c15c" metal={0.8} rough={0.3} />
      <Cyl p={[AX - 0.055, 0.841, AZ + 0.045]} r={0.004} h={0.012} color="#e6c15c" metal={0.8} rough={0.3} />
      <Box p={[AX + 0.09, 0.843, AZ]} s={[0.04, 0.016, 0.03]} color={C.cabinet} metal={0.4} rough={0.4} />
      <Box p={[AX + 0.072, 0.851, AZ]} s={[0.012, 0.006, 0.02]} color={C.dark} />
    </Part>
  );
}

function jobPattern(): Array<[number, number]> {
  // finder-like solid L on two edges, alternating timing on the other two, seeded interior
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dark: Array<[number, number]> = [];
  for (let r = 0; r < MODULES; r++) {
    const cols: number[] = [];
    for (let c = 0; c < MODULES; c++) {
      const edgeL = c === 0 || r === MODULES - 1;
      const timing = (r === 0 && c % 2 === 0) || (c === MODULES - 1 && r % 2 === 1);
      const interior = r > 0 && c < MODULES - 1 && !edgeL && rnd() < 0.5;
      if (edgeL || timing || interior) cols.push(c);
    }
    // serpentine order keeps jumps short
    if (r % 2 === 1) cols.reverse();
    for (const c of cols) dark.push([r, c]);
  }
  return dark;
}
const JOB = jobPattern();
const modulePos = ([r, c]: [number, number]): [number, number] => [
  AX + (c - (MODULES - 1) / 2) * MODULE,
  AZ + (r - (MODULES - 1) / 2) * MODULE,
];

function Workpiece({ markedRef }: { markedRef: MutableRefObject<number> }) {
  const inst = useRef<THREE.InstancedMesh>(null);
  const shown = useRef(-1);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const m = inst.current;
    if (!m) return;
    const n = Math.floor(markedRef.current);
    if (n === shown.current) return;
    shown.current = n;
    JOB.forEach((cell, i) => {
      const [x, z] = modulePos(cell);
      dummy.position.set(x, WTOP + 0.00012, z);
      const s = i < n ? 1 : 0.0001;
      dummy.scale.set(s, 1, s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <Part id="workpiece">
      <Box p={[AX, WTOP - 0.006, AZ]} s={[0.09, 0.012, 0.07]} color={C.steel} metal={0.92} rough={0.28} />
      <instancedMesh ref={inst} args={[undefined, undefined, JOB.length]} raycast={noRaycast} frustumCulled={false}>
        <boxGeometry args={[MODULE * 0.92, 0.0002, MODULE * 0.92]} />
        <meshStandardMaterial color="#17191d" roughness={0.85} metalness={0.15} />
      </instancedMesh>
    </Part>
  );
}

function Enclosure() {
  // frame members are clickable; panels are see-through and ignore pointer rays
  const y0 = TABLE + 0.01;
  const y1 = 1.55;
  const h = y1 - y0;
  const cy = (y0 + y1) / 2;
  const posts: V3[] = [
    [-0.39, cy, -0.29],
    [0.39, cy, -0.29],
    [-0.39, cy, 0.29],
    [0.39, cy, 0.29],
  ];
  return (
    <Part id="enclosure">
      {posts.map((p, i) => (
        <Box key={i} p={p} s={[0.025, h, 0.025]} color={C.frame} metal={0.5} rough={0.4} />
      ))}
      <Box p={[0, y1, 0]} s={[0.805, 0.025, 0.605]} color={C.frame} opacity={0.5} metal={0.5} rough={0.4} edges="#e7eaee" />
      <Box p={[-0.395, cy, 0]} s={[0.006, h, 0.56]} color={C.panel} opacity={0.12} ray={false} edges="#8fa5b8" />
      <Box p={[0.395, cy, 0]} s={[0.006, h, 0.56]} color={C.panel} opacity={0.12} ray={false} edges="#8fa5b8" />
      <Box p={[0, cy, -0.295]} s={[0.76, h, 0.006]} color={C.panel} opacity={0.16} ray={false} edges="#8fa5b8" />
      {/* fixed front strips around the door opening */}
      <Box p={[0, 0.865, 0.295]} s={[0.76, 0.07, 0.01]} color={C.frame} metal={0.5} rough={0.4} />
      <Box p={[0, 1.5, 0.295]} s={[0.76, 0.09, 0.01]} color={C.frame} metal={0.5} rough={0.4} />
      <Box p={[-0.34, 1.18, 0.295]} s={[0.08, 0.56, 0.01]} color={C.frame} metal={0.5} rough={0.4} />
      <Box p={[0.34, 1.18, 0.295]} s={[0.08, 0.56, 0.01]} color={C.frame} metal={0.5} rough={0.4} />
    </Part>
  );
}

function Door({ doorRef }: { doorRef: MutableRefObject<number> }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.position.y = doorRef.current * 0.42;
  });
  return (
    <group ref={g}>
      <Part id="door">
        <Box p={[0, 0.915, 0.305]} s={[0.6, 0.04, 0.012]} color={C.frame} metal={0.5} rough={0.4} />
        <Box p={[0, 1.44, 0.305]} s={[0.6, 0.04, 0.012]} color={C.frame} metal={0.5} rough={0.4} />
        <Box p={[-0.28, 1.18, 0.305]} s={[0.04, 0.48, 0.012]} color={C.frame} metal={0.5} rough={0.4} />
        <Box p={[0.28, 1.18, 0.305]} s={[0.04, 0.48, 0.012]} color={C.frame} metal={0.5} rough={0.4} />
        <Box p={[0, 0.885, 0.318]} s={[0.22, 0.018, 0.022]} color={C.dark} metal={0.4} rough={0.4} />
        {/* door-mounted actuator for the coded interlock switch */}
        <Box p={[0.255, 1.425, 0.316]} s={[0.03, 0.015, 0.01]} color="#f2c230" metal={0.3} rough={0.5} />
      </Part>
      <Part id="window">
        <Box p={[0, 1.18, 0.3]} s={[0.52, 0.48, 0.006]} color="#ffb347" opacity={0.2} metal={0.1} rough={0.05} ray={false} />
        {/* gasket — clickable for the window */}
        <Box p={[0, 1.415, 0.312]} s={[0.52, 0.008, 0.006]} color="#14171b" />
        <Box p={[0, 0.945, 0.312]} s={[0.52, 0.008, 0.006]} color="#14171b" />
        <Box p={[-0.256, 1.18, 0.312]} s={[0.008, 0.48, 0.006]} color="#14171b" />
        <Box p={[0.256, 1.18, 0.312]} s={[0.008, 0.48, 0.006]} color="#14171b" />
      </Part>
    </group>
  );
}

function Interlock() {
  return (
    <Part id="interlock">
      <Box p={[0.335, 1.455, 0.31]} s={[0.045, 0.03, 0.022]} color="#f2c230" metal={0.3} rough={0.5} />
      <Box p={[0.335, 1.455, 0.322]} s={[0.03, 0.012, 0.002]} color={C.dark} />
    </Part>
  );
}

function EStopKey() {
  return (
    <>
      <Part id="estop">
        <Box p={[0.3, 0.72, 0.303]} s={[0.07, 0.07, 0.008]} color="#f2c230" metal={0.2} rough={0.5} />
        <Cyl p={[0.3, 0.72, 0.316]} r={0.016} h={0.018} axis="z" color="#3a3a3a" />
        <Cyl p={[0.3, 0.72, 0.33]} r={0.024} r2={0.02} h={0.012} axis="z" color="#d7262b" metal={0.2} rough={0.35} />
      </Part>
      <Part id="key">
        <Cyl p={[0.2, 0.72, 0.307]} r={0.016} h={0.012} axis="z" color={C.alu} metal={0.85} rough={0.25} />
        <Box p={[0.2, 0.72, 0.318]} s={[0.006, 0.022, 0.01]} color="#c9a227" metal={0.9} rough={0.25} />
      </Part>
    </>
  );
}

function Beacon({ emitting }: { emitting: boolean }) {
  return (
    <Part id="beacon">
      <Cyl p={[0.33, 1.575, -0.24]} r={0.008} h={0.03} color={C.alu} metal={0.8} rough={0.3} />
      <Cyl p={[0.33, 1.605, -0.24]} r={0.018} h={0.03} color="#1fae5b" emissive="#1fae5b" glow={emitting ? 0 : 0.9} opacity={0.9} />
      <Cyl p={[0.33, 1.637, -0.24]} r={0.018} h={0.03} color="#ffb000" emissive="#ffb000" glow={emitting ? 2.2 : 0.05} opacity={0.9} />
      <Cyl p={[0.33, 1.669, -0.24]} r={0.018} h={0.03} color="#ff3b30" emissive="#ff3b30" glow={0.05} opacity={0.9} />
      <Cyl p={[0.33, 1.689, -0.24]} r={0.018} h={0.008} color={C.dark} />
    </Part>
  );
}

function SafetyPanel() {
  return (
    <Part id="safety">
      <Box p={[0.16, 0.6, -0.282]} s={[0.36, 0.3, 0.012]} color="#d9dde1" metal={0.2} rough={0.6} />
      <Box p={[0.16, 0.66, -0.27]} s={[0.32, 0.02, 0.012]} color={C.alu} metal={0.8} rough={0.3} />
      <Box p={[0.16, 0.55, -0.27]} s={[0.32, 0.02, 0.012]} color={C.alu} metal={0.8} rough={0.3} />
      {/* safety relay (yellow), PSU, terminals */}
      <Box p={[0.05, 0.665, -0.255]} s={[0.045, 0.08, 0.04]} color="#f2c230" metal={0.2} rough={0.5} />
      <Box p={[0.14, 0.665, -0.255]} s={[0.08, 0.08, 0.04]} color="#9aa3ad" metal={0.6} rough={0.35} />
      {Array.from({ length: 10 }, (_, i) => (
        <Box key={i} p={[0.03 + i * 0.024, 0.555, -0.258]} s={[0.02, 0.05, 0.03]} color={i % 3 === 0 ? "#2563eb" : "#8f969e"} metal={0.2} rough={0.6} />
      ))}
    </Part>
  );
}

function Ipc() {
  return (
    <Part id="ipc">
      <RBox p={[0.2, 0.26, 0.03]} s={[0.17, 0.3, 0.36]} color={C.anod} metal={0.5} rough={0.4} />
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} p={[0.2, 0.15 + i * 0.035, 0.212]} s={[0.13, 0.008, 0.004]} color="#11151a" ray={false} />
      ))}
      <Box p={[0.255, 0.38, 0.213]} s={[0.012, 0.008, 0.003]} color="#22c55e" emissive="#22c55e" glow={0.9} />
    </Part>
  );
}

function Hmi({ emitting }: { emitting: boolean }) {
  return (
    <Part id="hmi">
      <Box p={[0.43, 1.2, 0.18]} s={[0.06, 0.03, 0.03]} color={C.cabinet} metal={0.5} rough={0.4} />
      <Cyl p={[0.48, 1.2, 0.18]} r={0.012} h={0.08} axis="x" color={C.alu} metal={0.8} rough={0.3} />
      <group position={[0.56, 1.29, 0.13]} rotation={[0, -0.5, 0]}>
        <RBox p={[0, 0, 0]} s={[0.24, 0.16, 0.02]} r={0.006} color={C.dark} metal={0.3} rough={0.5} />
        <Box p={[0, 0, 0.0105]} s={[0.22, 0.14, 0.001]} color="#06161a" emissive={emitting ? "#ff9b3d" : "#2fd3c9"} glow={0.25} />
        <Box p={[-0.06, 0.04, 0.0115]} s={[0.08, 0.012, 0.001]} color="#e6f7f6" emissive="#e6f7f6" glow={0.4} ray={false} />
        <Box p={[0.03, -0.02, 0.0115]} s={[0.12, 0.05, 0.001]} color="#0f2a30" emissive="#2fd3c9" glow={0.15} ray={false} />
      </group>
      <Cyl p={[0.56, 1.2, 0.13]} r={0.01} h={0.1} color={C.alu} metal={0.8} rough={0.3} />
    </Part>
  );
}

function Camera() {
  // camera aimed at the field centre from above-left; ring light around the lens axis
  const aim = useMemo(() => {
    const from = new THREE.Vector3(-0.085, 1.1, 0.055);
    const to = new THREE.Vector3(AX, WTOP, AZ);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
    return { from, q };
  }, []);
  return (
    <Part id="camera">
      <group position={aim.from} quaternion={aim.q}>
        <RBox p={[0, 0.03, 0]} s={[0.04, 0.05, 0.04]} r={0.004} color="#2b3036" metal={0.5} rough={0.4} />
        <Cyl p={[0, -0.012, 0]} r={0.014} h={0.035} color="#15181c" metal={0.6} rough={0.3} />
        <Cyl p={[0, -0.03, 0]} r={0.011} h={0.002} color="#3d6f8e" metal={0.2} rough={0.05} />
      </group>
      <Box p={[-0.06, 1.12, 0.0]} s={[0.012, 0.01, 0.1]} color={C.alu} metal={0.8} rough={0.3} />
      <mesh position={[AX, 0.94, AZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.005, 12, 48]} />
        <Mat color="#dfe6ee" emissive="#eaf6ff" glow={0.55} metal={0.2} rough={0.3} />
      </mesh>
      <Box p={[AX - 0.075, 1.0, AZ]} s={[0.006, 0.12, 0.006]} color={C.alu} metal={0.8} rough={0.3} />
    </Part>
  );
}

const HOSE: V3[] = [
  [-0.62, 0.72, -0.1],
  [-0.6, 0.98, -0.12],
  [-0.46, 1.08, -0.1],
  [-0.3, 1.0, -0.06],
  [-0.15, 0.93, -0.03],
  [-0.06, 0.89, -0.02],
];

function Extraction() {
  return (
    <Part id="extraction">
      <RBox p={[-0.62, 0.35, -0.1]} s={[0.3, 0.7, 0.34]} r={0.012} color="#5b6470" metal={0.35} rough={0.5} />
      <Box p={[-0.62, 0.55, 0.072]} s={[0.22, 0.12, 0.004]} color="#2a3038" />
      {Array.from({ length: 7 }, (_, i) => (
        <Box key={i} p={[-0.62, 0.15 + i * 0.03, 0.072]} s={[0.22, 0.008, 0.004]} color="#353c45" ray={false} />
      ))}
      <Cyl p={[-0.62, 0.705, -0.1]} r={0.03} h={0.02} color={C.dark} />
      <Tube points={HOSE} r={0.017} color="#2f353d" metal={0.2} rough={0.7} />
      <Cyl p={[-0.055, 0.885, -0.02]} r={0.012} r2={0.022} h={0.03} axis="x" color="#454c55" metal={0.4} rough={0.5} />
    </Part>
  );
}

/* ------------------------------------------------------------------ beam, pointer, signals */
function Beam({
  emitting,
  pointerPreview,
  focusPath,
  layersOptical,
  scanRef,
  spotRef,
  explodeRef,
  motion,
}: {
  motion: boolean;
  emitting: boolean;
  pointerPreview: boolean;
  focusPath: boolean;
  layersOptical: boolean;
  scanRef: MutableRefObject<{ d1: number; d2: number }>;
  spotRef: MutableRefObject<[number, number]>;
  explodeRef: MutableRefObject<number>;
}) {
  const upper = useRef<Line2>(null);
  const cone = useRef<THREE.Mesh>(null);
  const spot = useRef<THREE.Mesh>(null);
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), dir: new THREE.Vector3() }), []);
  const mode: "emit" | "pointer" | "guide" | "off" = !layersOptical ? "off" : emitting ? "emit" : pointerPreview ? "pointer" : focusPath ? "guide" : "off";
  const color = mode === "emit" ? BEAM_FALSE_COLOUR : mode === "pointer" ? POINTER_RED : "#2fd3c9";
  const dashed = mode === "guide";

  useFrame((state) => {
    if (mode === "off") return;
    const e = explodeRef.current;
    const c0 = add(COLLIMATOR_EXIT, offset("collimator", e));
    const g = offset("galvo", e);
    const m1 = add(M1, g);
    const m2 = add(M2, g);
    const w = offset("workpiece", e);
    const [sx, sz] = spotRef.current;
    const s: V3 = [sx + w[0], WTOP + w[1] + 0.0003, sz + w[2]];
    // chief ray drawn straight from the Y mirror to the spot; it leaves the lens at lb
    const lensY = LENS_BOT + offset("ftheta", e)[1];
    const t = (m2[1] - lensY) / (m2[1] - s[1]);
    const lb: V3 = [m2[0] + (s[0] - m2[0]) * t, lensY, m2[2] + (s[2] - m2[2]) * t];
    upper.current?.geometry.setPositions([...c0, ...m1, ...m1, ...m2, ...m2, ...s]);
    if (dashed) upper.current?.computeLineDistances();
    if (cone.current) {
      v.a.set(...lb);
      v.b.set(...s);
      v.dir.subVectors(v.b, v.a);
      const len = v.dir.length();
      cone.current.position.copy(v.a).addScaledVector(v.dir, 0.5);
      cone.current.quaternion.setFromUnitVectors(v.up, v.dir.normalize()); // cone tip (+y) at the spot
      cone.current.scale.set(1, len, 1);
    }
    if (spot.current) {
      spot.current.position.set(...s);
      const flick = mode === "emit" && motion ? 0.8 + 0.4 * Math.sin(state.clock.elapsedTime * 60) : 1;
      spot.current.scale.setScalar(flick);
    }
  });

  if (mode === "off") return null;
  return (
    <group>
      <Line ref={upper} points={BEAM_ZERO} segments color={color} lineWidth={mode === "emit" ? 3 : 2} dashed={dashed} dashSize={0.01} gapSize={0.008} transparent opacity={0.95} toneMapped={false} raycast={noRaycast} />
      {mode === "emit" ? (
        <mesh ref={cone} raycast={noRaycast}>
          {/* converging beam: 7 mm at the lens to a focused spot (scaled) */}
          <coneGeometry args={[0.0035, 1, 24, 1, true]} />
          <meshBasicMaterial color={BEAM_FALSE_COLOUR} transparent opacity={0.28} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      {mode !== "guide" ? (
        <mesh ref={spot} raycast={noRaycast}>
          <sphereGeometry args={[mode === "emit" ? 0.0028 : 0.0016, 16, 12]} />
          <meshBasicMaterial color={mode === "emit" ? "#fff2c4" : POINTER_RED} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

const BEAM_ZERO: V3[] = Array.from({ length: 6 }, () => [0, 0, 0]);
const SIGNAL_N = 24;
const SIGNAL_ZERO: V3[] = Array.from({ length: SIGNAL_N + 1 }, () => [0, 0, 0]);
const SIGNAL_COLOUR = { command: "#38d6cf", data: "#7fb2ff", safety: "#ffb547" } as const;

function Signals({ selected, motion, explodeRef, layers }: { selected: string | null; motion: boolean; explodeRef: MutableRefObject<number>; layers: Record<Layer, boolean> }) {
  const refs = useRef<Array<Line2 | null>>([]);
  const N = SIGNAL_N;
  const tmp = useMemo(() => new Array<number>((N + 1) * 3).fill(0), []);
  useFrame((_, dt) => {
    const e = explodeRef.current;
    SIGNALS.forEach((s, i) => {
      const line = refs.current[i];
      if (!line) return;
      const a = add(ANCHOR[s.from]!, offset(s.from, e));
      const b = add(ANCHOR[s.to]!, offset(s.to, e));
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const ctrl: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.08 + dist * 0.18, (a[2] + b[2]) / 2 + 0.06];
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const u = 1 - t;
        for (let j = 0; j < 3; j++) tmp[k * 3 + j] = u * u * a[j]! + 2 * u * t * ctrl[j]! + t * t * b[j]!;
      }
      line.geometry.setPositions(tmp);
      line.computeLineDistances();
      if (motion) line.material.dashOffset -= dt * 0.12;
    });
  });
  return (
    <group>
      {SIGNALS.map((s, i) => {
        const on = !selected || s.from === selected || s.to === selected;
        const vis = isVisible(s.from, layers) || isVisible(s.to, layers);
        return (
          <Line
            key={`${s.from}-${s.to}`}
            ref={(el) => {
              refs.current[i] = el as Line2 | null;
            }}
            visible={vis}
            points={SIGNAL_ZERO}
            color={SIGNAL_COLOUR[s.kind]}
            lineWidth={on ? 2.4 : 1.2}
            dashed
            dashSize={0.025}
            gapSize={0.015}
            transparent
            opacity={on ? 0.95 : 0.25}
            depthTest={false}
            renderOrder={10}
            toneMapped={false}
            raycast={noRaycast}
          />
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ animation driver */
function Driver(props: {
  explode: boolean;
  doorOpen: boolean;
  emitting: boolean;
  pointerPreview: boolean;
  showSignals: boolean;
  motion: boolean;
  jobKey: number;
  explodeRef: MutableRefObject<number>;
  doorRef: MutableRefObject<number>;
  markedRef: MutableRefObject<number>;
  spotRef: MutableRefObject<[number, number]>;
  scanRef: MutableRefObject<{ d1: number; d2: number }>;
  onProgress: (f: number) => void;
  onJobDone: () => void;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const lastPct = useRef(-1);
  const pointerT = useRef(0);
  const { jobKey, markedRef, onProgress } = props;

  useEffect(() => {
    markedRef.current = 0;
    lastPct.current = -1;
    onProgress(0);
    invalidate();
  }, [jobKey, markedRef, onProgress, invalidate]);

  useEffect(() => {
    invalidate();
  }, [props.explode, props.doorOpen, props.emitting, props.pointerPreview, props.showSignals, invalidate]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    let busy = false;
    const step = (ref: MutableRefObject<number>, target: number) => {
      if (!props.motion) {
        ref.current = target;
        return;
      }
      ref.current = THREE.MathUtils.damp(ref.current, target, 6, dt);
      if (Math.abs(ref.current - target) < 0.0005) ref.current = target;
      else busy = true;
    };
    step(props.explodeRef, props.explode ? 1 : 0);
    step(props.doorRef, props.doorOpen ? 1 : 0);

    // marking job
    let target: [number, number] = [AX, AZ];
    if (props.emitting && markedRef.current < JOB.length) {
      markedRef.current = Math.min(JOB.length, markedRef.current + dt * MODULES_PER_S);
      const i = Math.min(JOB.length - 1, Math.floor(markedRef.current));
      const sub = markedRef.current - Math.floor(markedRef.current);
      const [x, z] = modulePos(JOB[i]!);
      // hatch inside the module: 4 lines
      const line = Math.min(3, Math.floor(sub * 4));
      const along = sub * 4 - line;
      target = [x + (along - 0.5) * MODULE * 0.85 * (line % 2 ? -1 : 1), z + (line / 3 - 0.5) * MODULE * 0.8];
      busy = true;
      const pct = Math.floor((markedRef.current / JOB.length) * 100);
      if (pct !== lastPct.current) {
        lastPct.current = pct;
        props.onProgress(markedRef.current / JOB.length);
      }
      if (markedRef.current >= JOB.length) props.onJobDone();
    } else if (props.pointerPreview && !props.emitting) {
      // red pointer traces the job frame
      pointerT.current = (pointerT.current + dt * (props.motion ? 0.6 : 0.25)) % 1;
      const half = (MODULES / 2) * MODULE + 0.002;
      const t = pointerT.current * 4;
      const side = Math.floor(t);
      const f = t - side;
      const corners: Array<[number, number]> = [
        [-half, -half],
        [half, -half],
        [half, half],
        [-half, half],
      ];
      const p0 = corners[side % 4]!;
      const p1 = corners[(side + 1) % 4]!;
      target = [AX + p0[0] + (p1[0] - p0[0]) * f, AZ + p0[1] + (p1[1] - p0[1]) * f];
      busy = true;
    }
    props.spotRef.current = target;
    // mirror rotation = half of optical angle; θ = displacement / f
    props.scanRef.current = { d1: -((target[1] - AZ) / F) / 2, d2: ((target[0] - AX) / F) / 2 };

    if (props.showSignals && props.motion) busy = true;
    if (busy) state.invalidate();
  });
  return null;
}

/* ------------------------------------------------------------------ camera rig */
function Rig({ apiRef, registry, motion }: { apiRef: MutableRefObject<SceneApi | null>; registry: MutableRefObject<Map<string, THREE.Object3D>>; motion: boolean }) {
  const controls = useRef<CameraControls>(null);
  useEffect(() => {
    const { pos, target } = PRESETS.overview;
    void controls.current?.setLookAt(...pos, ...target, false);
  }, []);
  useEffect(() => {
    apiRef.current = {
      preset: (p) => {
        const { pos, target } = PRESETS[p];
        void controls.current?.setLookAt(...pos, ...target, motion);
      },
      focus: (id) => {
        const obj = registry.current.get(id);
        const c = controls.current;
        if (!obj || !c) return;
        const box = new THREE.Box3().setFromObject(obj);
        if (box.isEmpty()) return;
        const pad = 0.12;
        void c.fitToBox(box, motion, { paddingTop: pad, paddingBottom: pad, paddingLeft: pad, paddingRight: pad });
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, registry, motion]);
  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={0.25}
      maxDistance={5.5}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI / 2 - 0.03}
      smoothTime={motion ? 0.35 : 0}
      draggingSmoothTime={motion ? 0.12 : 0}
    />
  );
}

function CursorSync({ hovered }: { hovered: string | null }) {
  useCursor(hovered !== null);
  return null;
}

function ContextWatch({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const h = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    el.addEventListener("webglcontextlost", h);
    return () => el.removeEventListener("webglcontextlost", h);
  }, [gl, onLost]);
  return null;
}

/* ------------------------------------------------------------------ scene */
export default function MachineScene(props: MachineSceneProps) {
  const explodeRef = useRef(props.explode ? 1 : 0);
  const doorRef = useRef(props.doorOpen ? 1 : 0);
  const markedRef = useRef(0);
  const spotRef = useRef<[number, number]>([AX, AZ]);
  const scanRef = useRef({ d1: 0, d2: 0 });
  const registry = useRef(new Map<string, THREE.Object3D>());
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap);

  const ctx = useMemo<SceneCtxValue>(
    () => ({
      selected: props.selected,
      hovered: props.hovered,
      onSelect: props.onSelect,
      onHover: props.onHover,
      layers: props.layers,
      focusPath: props.focusPath,
      explodeRef,
      register: (id, obj) => {
        if (obj) registry.current.set(id, obj);
        else registry.current.delete(id);
      },
    }),
    [props.selected, props.hovered, props.onSelect, props.onHover, props.layers, props.focusPath],
  );

  const { pos } = PRESETS.overview;
  return (
    <div ref={wrap} className="absolute inset-0" data-testid="machine-canvas">
      <Canvas
        frameloop={inView ? "demand" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: pos, fov: 34, near: 0.02, far: 30 }}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
        onPointerMissed={() => props.onSelect(null)}
        aria-label="3D model of a generic Class 1 fiber-laser marking workstation"
        role="img"
      >
        <color attach="background" args={["#0a1016"]} />
        <fog attach="fog" args={["#0a1016", 5.5, 11]} />
        <hemisphereLight args={["#dfe8f2", "#0a0f14", 0.55]} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.4} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#9fd9ff" />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 4, 1]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-4, 1.5, 0]} rotation-y={Math.PI / 2} scale={[4, 1, 1]} color="#bfe9ff" />
          <Lightformer form="rect" intensity={0.8} position={[4, 1.2, -1]} rotation-y={-Math.PI / 2} scale={[4, 1, 1]} />
          <Lightformer form="ring" intensity={0.6} position={[0, 1, 5]} scale={2} color="#2fd3c9" />
        </Environment>

        <SceneCtx.Provider value={ctx}>
          <BaseCabinet />
          <Source />
          <Fiber />
          <Collimator />
          <Expander />
          <ZAxis />
          <Galvo scanRef={scanRef} />
          <FTheta />
          <PointerModule />
          <Fixture />
          <Workpiece markedRef={markedRef} />
          <Enclosure />
          <Door doorRef={doorRef} />
          <Interlock />
          <EStopKey />
          <Beacon emitting={props.emitting} />
          <SafetyPanel />
          <Ipc />
          <Hmi emitting={props.emitting} />
          <Camera />
          <Extraction />
        </SceneCtx.Provider>

        <Beam
          emitting={props.emitting}
          pointerPreview={props.pointerPreview}
          focusPath={props.focusPath}
          layersOptical={props.layers.optical}
          scanRef={scanRef}
          spotRef={spotRef}
          explodeRef={explodeRef}
          motion={props.motion}
        />
        {props.showSignals ? <Signals selected={props.selected} motion={props.motion} explodeRef={explodeRef} layers={props.layers} /> : null}

        <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} raycast={noRaycast}>
          <circleGeometry args={[6, 64]} />
          <meshStandardMaterial color="#0d141b" roughness={0.95} metalness={0} />
        </mesh>
        <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={3.2} blur={2.4} far={1.2} resolution={512} frames={1} color="#000000" />

        <Driver
          explode={props.explode}
          doorOpen={props.doorOpen}
          emitting={props.emitting}
          pointerPreview={props.pointerPreview}
          showSignals={props.showSignals}
          motion={props.motion}
          jobKey={props.jobKey}
          explodeRef={explodeRef}
          doorRef={doorRef}
          markedRef={markedRef}
          spotRef={spotRef}
          scanRef={scanRef}
          onProgress={props.onProgress}
          onJobDone={props.onJobDone}
        />
        <Rig apiRef={props.apiRef} registry={registry} motion={props.motion} />
        <CursorSync hovered={props.hovered} />
        <ContextWatch onLost={props.onContextLost} />
      </Canvas>
    </div>
  );
}

function useInView(ref: MutableRefObject<HTMLElement | null>): boolean {
  const [state, setState] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setState(!!e?.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    const vis = () => {
      const r = el.getBoundingClientRect();
      setState(document.visibilityState === "visible" && r.bottom > 0 && r.top < window.innerHeight);
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [ref, setState]);
  return state;
}
