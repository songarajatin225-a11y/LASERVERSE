"use client";

/**
 * Landing-page 3D narrative: photon → laser → beam → material → machine → product,
 * laid out along one beam line. The scroll position (chapter value c ∈ [0, 6]) drives
 * the camera and the visibility of each element. CONCEPTUAL visualization: scales are
 * exaggerated and the 1064 nm beam is drawn in false colour.
 */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Environment, Lightformer, Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";

const IR = new THREE.Color("#ff3d7f"); // 1064 nm false colour (lib/physics/photon.wavelengthColor)
const HR_X = -6.2;
const OC_X = -2.6;
const ROD: [number, number] = [-5.6, -3.2];
const LENS_X = 1.2;
const PLATE_X = 4.2;
const ATOM_X = -4.4;

type Key = Array<[number, number]>;
/** piecewise-linear keyframes */
function pl(c: number, keys: Key): number {
  if (c <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [x1, y1] = keys[i]!;
    const [x0, y0] = keys[i - 1]!;
    if (c <= x1) return y0 + ((y1 - y0) * (c - x0)) / (x1 - x0 || 1);
  }
  return keys[keys.length - 1]![1];
}

const K = {
  photon: [[0, 0], [0.45, 0], [0.85, 1], [1.45, 1], [1.85, 0]] as Key,
  atom: [[0, 0], [0.45, 0], [0.85, 1], [1.6, 1], [2.0, 0.25]] as Key,
  standing: [[0, 0.55], [0.6, 0], [1.3, 0], [1.9, 1], [3, 1], [6, 0.6]] as Key,
  pump: [[0, 0.5], [0.6, 0.12], [1.3, 0.12], [1.9, 1], [6, 0.8]] as Key,
  beam: [[0, 1], [0.6, 0], [1.8, 0], [2.4, 1], [6, 1]] as Key,
  caustic: [[0, 1], [0.6, 0], [2.3, 0], [2.9, 1], [6, 1]] as Key,
  spot: [[0, 0.8], [0.6, 0], [3.3, 0], [3.9, 1], [5, 1], [5.6, 0.5], [6, 0.35]] as Key,
  machine: [[0, 0], [4.3, 0], [4.9, 1], [5.5, 1], [6, 0.2]] as Key,
  marks: [[0, 1], [0.6, 0], [5.25, 0], [5.9, 1], [6, 1]] as Key,
};

type V3 = [number, number, number];
const CAM: Array<{ pos: V3; target: V3 }> = [
  { pos: [-2.6, 1.9, 11.5], target: [-1.2, -0.2, 0] }, // hero
  { pos: [-3.3, 0.3, 2.7], target: [-2.9, 0.05, 0] }, // A photon
  { pos: [-3.0, 2.1, 5.4], target: [-4.6, 0, 0] }, // B laser
  { pos: [0.4, 1.4, 5.3], target: [2.2, 0, 0] }, // C beam
  { pos: [2.6, 0.9, 2.6], target: [4.2, 0, 0] }, // D material
  { pos: [-0.2, 5.2, 13.5], target: [-1.2, 0.2, 0] }, // E machine
  { pos: [1.2, 0.5, 2.6], target: [3.6, 0, 0] }, // F product
];
const smooth = (t: number) => t * t * (3 - 2 * t);
function cameraAt(c: number, out: { pos: THREE.Vector3; target: THREE.Vector3 }, discrete: boolean) {
  const cc = Math.max(0, Math.min(6, c));
  const i = discrete ? Math.round(cc) : Math.floor(cc);
  const j = Math.min(6, i + 1);
  const t = discrete ? 0 : smooth(cc - i);
  const a = CAM[i]!;
  const b = CAM[j]!;
  out.pos.set(a.pos[0] + (b.pos[0] - a.pos[0]) * t, a.pos[1] + (b.pos[1] - a.pos[1]) * t, a.pos[2] + (b.pos[2] - a.pos[2]) * t);
  out.target.set(a.target[0] + (b.target[0] - a.target[0]) * t, a.target[1] + (b.target[1] - a.target[1]) * t, a.target[2] + (b.target[2] - a.target[2]) * t);
}

interface Shared {
  c: number;
  motion: boolean;
}

/* ------------------------------------------------------------------ elements */
function glowMat(color: THREE.ColorRepresentation, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}

function Cavity({ s }: { s: React.MutableRefObject<Shared> }) {
  const rodMat = useRef<THREE.MeshStandardMaterial>(null);
  const pumpMats = useMemo(() => [glowMat("#ffd6a8", 0.4), glowMat("#ffd6a8", 0.4)], []);
  useFrame(() => {
    const p = pl(s.current.c, K.pump);
    if (rodMat.current) rodMat.current.emissiveIntensity = 0.15 + 0.9 * p;
    pumpMats.forEach((m) => (m.opacity = 0.1 + 0.5 * p));
  });
  const rodLen = ROD[1] - ROD[0];
  return (
    <group>
      {/* high reflector */}
      <mesh position={[HR_X, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.62, 0.62, 0.08, 64]} />
        <meshStandardMaterial color="#d9e2ea" metalness={1} roughness={0.12} />
      </mesh>
      <mesh position={[HR_X - 0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, 0.06, 64]} />
        <meshStandardMaterial color="#2a323c" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* output coupler (partially transmitting) */}
      <mesh position={[OC_X, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.62, 0.62, 0.08, 64]} />
        <meshStandardMaterial color="#9fd0e8" metalness={0.3} roughness={0.05} transparent opacity={0.45} />
      </mesh>
      <mesh position={[OC_X + 0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.66, 0.05, 12, 64]} />
        <meshStandardMaterial color="#2a323c" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* gain medium */}
      <mesh position={[(ROD[0] + ROD[1]) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, rodLen, 48, 1]} />
        <meshStandardMaterial ref={rodMat} color="#c9b8ff" emissive="#ff3d7f" emissiveIntensity={0.3} metalness={0.1} roughness={0.15} transparent opacity={0.5} />
      </mesh>
      {/* pump modules above and below */}
      {[0.62, -0.62].map((y, i) => (
        <group key={y} position={[(ROD[0] + ROD[1]) / 2, y, 0]}>
          <mesh>
            <boxGeometry args={[rodLen * 0.9, 0.14, 0.42]} />
            <meshStandardMaterial color="#2a323c" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, -Math.sign(y) * 0.08, 0]} material={pumpMats[i]}>
            <boxGeometry args={[rodLen * 0.86, 0.02, 0.3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const ZERO = (n: number): V3[] => Array.from({ length: n }, () => [0, 0, 0] as V3);

function StandingWave({ s }: { s: React.MutableRefObject<Shared> }) {
  const N = 240;
  const refs = [useRef<Line2>(null), useRef<Line2>(null)];
  const zero = useMemo(() => ZERO(N), []);
  const buf = useMemo(() => new Float32Array(N * 3), []);
  useFrame((state) => {
    const amp = pl(s.current.c, K.standing);
    const t = s.current.motion ? state.clock.elapsedTime : 0.3;
    refs.forEach((r, li) => {
      const line = r.current;
      if (!line) return;
      line.visible = amp > 0.01;
      if (!line.visible) return;
      const L = OC_X - HR_X;
      const k = (11 * Math.PI) / L; // illustrative: a few half-waves (a real cavity holds ~10⁵)
      for (let i = 0; i < N; i++) {
        const x = HR_X + (i / (N - 1)) * L;
        const y = 0.16 * amp * Math.sin(k * (x - HR_X)) * Math.cos(t * 3 + li * Math.PI * 0.5);
        buf[i * 3] = x;
        buf[i * 3 + 1] = li ? y : y * 0.6;
        buf[i * 3 + 2] = li ? 0 : y * 0.4;
      }
      line.geometry.setPositions(buf);
      line.material.opacity = amp * (li ? 0.95 : 0.45);
    });
  });
  return (
    <>
      {refs.map((r, i) => (
        <Line key={i} ref={r} points={zero} color={IR} lineWidth={i ? 2.2 : 1.4} transparent opacity={0} toneMapped={false} depthWrite={false} />
      ))}
    </>
  );
}

function Photon({ s }: { s: React.MutableRefObject<Shared> }) {
  const N = 160;
  const line = useRef<Line2>(null);
  const zero = useMemo(() => ZERO(N), []);
  const buf = useMemo(() => new Float32Array(N * 3), []);
  const atom = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const atomMat = useMemo(() => glowMat("#ffffff", 1), []);
  const haloMat = useMemo(() => glowMat(IR, 0.5), []);
  useFrame((state) => {
    const op = pl(s.current.c, K.photon);
    const aop = pl(s.current.c, K.atom);
    const t = s.current.motion ? state.clock.elapsedTime : 1.1;
    // a wave packet leaves the excited atom and travels along the axis, looping
    const phase = (t * 0.45) % 1;
    const centre = ATOM_X + 0.3 + phase * 4.2;
    const half = 0.75;
    for (let i = 0; i < N; i++) {
      const x = centre - half + (i / (N - 1)) * 2 * half;
      const env = Math.exp(-(((x - centre) / (half * 0.45)) ** 2));
      buf[i * 3] = x;
      buf[i * 3 + 1] = 0.2 * env * Math.sin(24 * (x - centre) - t * 6);
      buf[i * 3 + 2] = 0;
    }
    if (line.current) {
      line.current.visible = op > 0.01;
      line.current.geometry.setPositions(buf);
      line.current.material.opacity = op;
    }
    const flash = s.current.motion ? Math.max(0, 1 - phase * 6) : 0.4;
    if (atom.current) {
      atom.current.visible = aop > 0.01;
      atomMat.opacity = aop;
      atom.current.scale.setScalar(1 + flash * 0.8);
    }
    if (halo.current) {
      halo.current.visible = aop > 0.01;
      haloMat.opacity = aop * (0.25 + 0.6 * flash);
      halo.current.scale.setScalar(1 + flash * 2.5);
    }
  });
  return (
    <>
      <Line ref={line} points={zero} color={IR} lineWidth={3} transparent opacity={0} toneMapped={false} depthWrite={false} />
      <mesh ref={atom} position={[ATOM_X, 0, 0]} material={atomMat}>
        <sphereGeometry args={[0.045, 16, 12]} />
      </mesh>
      <mesh ref={halo} position={[ATOM_X, 0, 0]} material={haloMat}>
        <sphereGeometry args={[0.09, 16, 12]} />
      </mesh>
    </>
  );
}

function Beam({ s }: { s: React.MutableRefObject<Shared> }) {
  const core = useMemo(() => glowMat(IR, 0.9), []);
  const halo = useMemo(() => glowMat(IR, 0.25), []);
  const causticCore = useMemo(() => glowMat(IR, 0.55), []);
  const causticHalo = useMemo(() => glowMat(IR, 0.18), []);
  // Gaussian caustic from the lens to the focus on the plate: w(z) = w0·√(1 + (z/zR)²)
  const caustic = useMemo(() => {
    const w0 = 0.014;
    const L = PLATE_X - LENS_X;
    const zR = L / Math.sqrt((0.11 / w0) ** 2 - 1);
    const pts: THREE.Vector2[] = [];
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const z = -L + (i / n) * L;
      pts.push(new THREE.Vector2(w0 * Math.sqrt(1 + (z / zR) ** 2), z + L));
    }
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  const g = useRef<THREE.Group>(null);
  const cg = useRef<THREE.Group>(null);
  useFrame(() => {
    const b = pl(s.current.c, K.beam);
    const cs = pl(s.current.c, K.caustic);
    core.opacity = 0.9 * b;
    halo.opacity = 0.22 * b;
    causticCore.opacity = 0.55 * cs;
    causticHalo.opacity = 0.16 * cs;
    if (g.current) g.current.visible = b > 0.01;
    if (cg.current) cg.current.visible = cs > 0.01;
  });
  const len = LENS_X - OC_X;
  return (
    <>
      <group ref={g} position={[(OC_X + LENS_X) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={core}>
          <cylinderGeometry args={[0.04, 0.04, len, 24, 1, true]} />
        </mesh>
        <mesh material={halo}>
          <cylinderGeometry args={[0.11, 0.11, len, 24, 1, true]} />
        </mesh>
      </group>
      <group ref={cg} position={[LENS_X, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh geometry={caustic} material={causticCore} scale={[0.45, 1, 0.45]} />
        <mesh geometry={caustic} material={causticHalo} />
      </group>
    </>
  );
}

function Lens() {
  const geo = useMemo(() => {
    // biconvex profile
    const pts: THREE.Vector2[] = [];
    const R = 0.75;
    const t = 0.14;
    for (let i = 0; i <= 24; i++) {
      const y = (i / 24) * R;
      const x = t * Math.sqrt(Math.max(0, 1 - (y / R) ** 2)) + 0.012;
      pts.push(new THREE.Vector2(y, x));
    }
    for (let i = 24; i >= 0; i--) {
      const y = (i / 24) * R;
      const x = -(t * Math.sqrt(Math.max(0, 1 - (y / R) ** 2)) + 0.012);
      pts.push(new THREE.Vector2(y, x));
    }
    return new THREE.LatheGeometry(pts, 64);
  }, []);
  return (
    <group position={[LENS_X, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#bfe6ff" metalness={0.1} roughness={0.02} transparent opacity={0.32} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.78, 0.05, 12, 64]} />
        <meshStandardMaterial color="#2a323c" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

function jobPattern(n: number): Array<[number, number]> {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: Array<[number, number]> = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const edge = c === 0 || r === n - 1;
      const timing = (r === 0 && c % 2 === 0) || (c === n - 1 && r % 2 === 1);
      if (edge || timing || (r > 0 && c < n - 1 && rnd() < 0.5)) out.push([r, c]);
    }
  return out;
}

function Plate({ s }: { s: React.MutableRefObject<Shared> }) {
  const spot = useRef<THREE.Mesh>(null);
  const spotMat = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const g = cv.getContext("2d")!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,240,1)");
    grd.addColorStop(0.15, "rgba(255,214,140,0.95)");
    grd.addColorStop(0.45, "rgba(255,120,40,0.45)");
    grd.addColorStop(1, "rgba(255,60,20,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  }, []);
  const sparks = useRef<THREE.InstancedMesh>(null);
  const SPARKS = 70;
  const seeds = useMemo(() => Array.from({ length: SPARKS }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), v: 0.6 + ((i * 37) % 23) / 23, ph: ((i * 13) % 17) / 17 })), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const marks = useRef<THREE.InstancedMesh>(null);
  const MOD = 18;
  const cell = 0.085;
  const job = useMemo(() => jobPattern(MOD), []);
  const shown = useRef(-1);
  const sparkMat = useMemo(() => glowMat("#ffcf80", 1), []);

  useFrame((state) => {
    const sp = pl(s.current.c, K.spot);
    const t = state.clock.elapsedTime;
    if (spot.current) {
      spot.current.visible = sp > 0.01;
      spotMat.opacity = sp;
      const pulse = s.current.motion ? 1 + 0.12 * Math.sin(t * 20) : 1;
      spot.current.scale.setScalar(0.55 * pulse * (0.6 + 0.4 * sp));
    }
    const m = sparks.current;
    if (m) {
      const on = sp > 0.2 && s.current.motion;
      m.visible = on;
      if (on) {
        seeds.forEach((sd, i) => {
          const life = (t * 0.9 * sd.v + sd.ph) % 1;
          const r = life * 0.9 * sd.v;
          dummy.position.set(PLATE_X - 0.02 - life * 0.55 * sd.v, Math.sin(sd.a) * r - life * life * 0.6, Math.cos(sd.a) * r);
          dummy.scale.setScalar((1 - life) * 0.9);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
        });
        m.instanceMatrix.needsUpdate = true;
        sparkMat.opacity = sp;
      }
    }
    const mk = marks.current;
    if (mk) {
      const n = Math.round(pl(s.current.c, K.marks) * job.length);
      if (n !== shown.current) {
        shown.current = n;
        job.forEach(([r, c], i) => {
          dummy.position.set(PLATE_X - 0.002, ((MOD - 1) / 2 - r) * cell + 0.0, (c - (MOD - 1) / 2) * cell);
          const k = i < n ? 1 : 0.0001;
          dummy.scale.set(1, k, k);
          dummy.updateMatrix();
          mk.setMatrixAt(i, dummy.matrix);
        });
        mk.instanceMatrix.needsUpdate = true;
      }
    }
  });
  return (
    <group>
      <mesh position={[PLATE_X + 0.15, 0, 0]}>
        <boxGeometry args={[0.3, 2.9, 2.9]} />
        <meshStandardMaterial color="#c3c9cf" metalness={0.8} roughness={0.38} />
      </mesh>
      <instancedMesh ref={marks} args={[undefined, undefined, job.length]} frustumCulled={false}>
        <boxGeometry args={[0.004, cell * 0.9, cell * 0.9]} />
        <meshStandardMaterial color="#121418" roughness={0.85} metalness={0.2} />
      </instancedMesh>
      <mesh ref={spot} position={[PLATE_X - 0.004, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={spotMat}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <instancedMesh ref={sparks} args={[undefined, undefined, SPARKS]} material={sparkMat} frustumCulled={false}>
        <sphereGeometry args={[0.012, 6, 4]} />
      </instancedMesh>
    </group>
  );
}

function SpotLight({ s }: { s: React.MutableRefObject<Shared> }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (ref.current) ref.current.intensity = 0.9 * pl(s.current.c, K.spot);
  });
  return <pointLight ref={ref} position={[PLATE_X - 0.5, 0, 0.4]} intensity={0} distance={3} color="#ffb070" />;
}

const OUTLINE: Array<{ p: V3; s: V3; label: string }> = [
  { p: [-4.45, 0, 0], s: [4.6, 1.9, 1.9], label: "Laser source" },
  { p: [-0.7, 0, 0], s: [3.4, 0.6, 0.6], label: "Beam delivery" },
  { p: [1.2, 0.2, 0], s: [1.2, 2.2, 2.0], label: "Optics & scan head" },
  { p: [4.35, -1.75, 0], s: [1.6, 0.4, 3.4], label: "Workpiece & fixture" },
  { p: [0.4, -0.1, 0], s: [14.6, 4.6, 5.0], label: "Class 1 enclosure · controls · safety" },
];

/**
 * Wireframe machine blocks. Their labels are plain DOM elements in an overlay next to the
 * canvas (see HeroScene), positioned here by projecting each anchor every frame — no DOM
 * is portalled into the canvas tree, which keeps route changes free of teardown races.
 */
function MachineOutline({ s, labels }: { s: React.MutableRefObject<Shared>; labels: React.MutableRefObject<Array<HTMLDivElement | null>> }) {
  const g = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const m = pl(s.current.c, K.machine);
    if (g.current) g.current.visible = m > 0.01;
    mats.current.forEach((mat) => (mat.opacity = 0.04 * m));
    OUTLINE.forEach((b, i) => {
      const el = labels.current[i];
      if (!el) return;
      v.set(b.p[0], b.p[1] + b.s[1] / 2 + 0.25, b.p[2]).project(camera);
      const behind = v.z > 1;
      el.style.opacity = behind ? "0" : String(m);
      el.style.transform = `translate(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px) translate(-50%, -50%)`;
    });
  });
  return (
    <group ref={g}>
      {OUTLINE.map((b, i) => (
        <mesh key={b.label} position={b.p}>
          <boxGeometry args={b.s} />
          <meshBasicMaterial
            ref={(el) => {
              if (el) mats.current[i] = el;
            }}
            color="#2fd3c9"
            transparent
            opacity={0}
            depthWrite={false}
          />
          <Edges color="#59cec7" />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ s }: { s: React.MutableRefObject<Shared> }) {
  const camera = useThree((st) => st.camera);
  const cur = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const goal = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const init = useRef(false);
  useFrame((state, dt) => {
    cameraAt(s.current.c, goal.current, !s.current.motion);
    if (!init.current || !s.current.motion) {
      cur.current.pos.copy(goal.current.pos);
      cur.current.target.copy(goal.current.target);
      init.current = true;
    } else {
      const k = 1 - Math.exp(-dt * 4);
      cur.current.pos.lerp(goal.current.pos, k);
      cur.current.target.lerp(goal.current.target, k);
    }
    // gentle parallax from the pointer (motion only)
    const px = s.current.motion ? state.pointer.x * 0.25 : 0;
    const py = s.current.motion ? state.pointer.y * 0.15 : 0;
    camera.position.set(cur.current.pos.x + px, cur.current.pos.y + py, cur.current.pos.z);
    camera.lookAt(cur.current.target);
  });
  return null;
}

function Ticker({ chapter, motion }: { chapter: MotionValue<number>; motion: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (motion) return;
    invalidate();
    return chapter.on("change", () => invalidate());
  }, [chapter, motion, invalidate]);
  return null;
}

export default function HeroScene({ chapter, motion, active }: { chapter: MotionValue<number>; motion: boolean; active: boolean }) {
  const shared = useRef<Shared>({ c: chapter.get(), motion });
  shared.current.motion = motion;
  useEffect(() => {
    shared.current.c = chapter.get();
    return chapter.on("change", (v) => {
      shared.current.c = v;
    });
  }, [chapter]);

  const labels = useRef<Array<HTMLDivElement | null>>([]);
  return (
    <div className="absolute inset-0">
    <Canvas
      frameloop={!active ? "never" : motion ? "always" : "demand"}
      dpr={[1, 1.6]}
      camera={{ position: CAM[0]!.pos, fov: 38, near: 0.05, far: 80 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <color attach="background" args={["#05080d"]} />
      <fog attach="fog" args={["#05080d", 12, 30]} />
      <hemisphereLight args={["#cfe3f5", "#05080d", 0.35]} />
      <directionalLight position={[3, 6, 5]} intensity={1.1} />
      <SpotLight s={shared} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-6, 1, 3]} rotation-y={Math.PI / 3} scale={[4, 2, 1]} color="#9fe7e2" />
        <Lightformer form="rect" intensity={0.6} position={[6, 1, -3]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} color="#ffd1b0" />
      </Environment>
      <Cavity s={shared} />
      <StandingWave s={shared} />
      <Photon s={shared} />
      <Beam s={shared} />
      <Lens />
      <Plate s={shared} />
      <MachineOutline s={shared} labels={labels} />
      <mesh position={[0, -2.3, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#070b11" roughness={0.9} metalness={0.1} />
      </mesh>
      <gridHelper args={[40, 80, "#123033", "#0c1a1f"]} position={[0, -2.29, 0]} />
      <Rig s={shared} />
      <Ticker chapter={chapter} motion={motion} />
    </Canvas>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {OUTLINE.map((b, i) => (
          <div
            key={b.label}
            ref={(el) => {
              labels.current[i] = el;
            }}
            style={{ opacity: 0, position: "absolute", left: 0, top: 0 }}
            className="whitespace-nowrap rounded-full border border-teal-400/40 bg-ink-900/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-teal-100"
          >
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
