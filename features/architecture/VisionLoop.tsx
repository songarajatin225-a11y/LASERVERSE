"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Shuffle } from "lucide-react";
import { RangeField, Switch } from "@/components/ui/controls";
import { LabFrame, Readout, ReadoutGrid, ControlGroup } from "@/components/viz/LabFrame";
import { Button, ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { applyRigid, rigidFromTwoPoints, poseAbout, maxDeviation, IDENTITY, deg, rad, rotate, type Vec2, type Rigid2D } from "./geometry";
import type { VisionLoopData } from "./types";

/* ------------------------------------------------------------------ conceptual scene, mm */
const PART: Vec2[] = [
  { x: -30, y: -20 },
  { x: 30, y: -20 },
  { x: 30, y: 20 },
  { x: -30, y: 20 },
];
const N1: Vec2 = { x: -24, y: 14 };
const N2: Vec2 = { x: 24, y: -14 };
const BASELINE = Math.hypot(N2.x - N1.x, N2.y - N1.y);
/** nominal job outline: a 2-D code field and two text lines (illustrative) */
const JOB: Vec2[][] = [
  [
    { x: -20, y: -8 },
    { x: -6, y: -8 },
    { x: -6, y: 6 },
    { x: -20, y: 6 },
  ],
  [
    { x: 0, y: 1 },
    { x: 20, y: 1 },
    { x: 20, y: 5 },
    { x: 0, y: 5 },
  ],
  [
    { x: 0, y: -6 },
    { x: 14, y: -6 },
    { x: 14, y: -2 },
    { x: 0, y: -2 },
  ],
];
const FINDER: Vec2[] = [
  { x: -20, y: 6 },
  { x: -20, y: -8 },
  { x: -6, y: -8 },
];
const JOB_POINTS = JOB.flat();

const pts = (T: Rigid2D, p: Vec2[]) =>
  p
    .map((q) => applyRigid(T, q))
    .map((q) => `${q.x.toFixed(3)},${(-q.y).toFixed(3)}`)
    .join(" ");

/** Fixed decimals with a typographic minus and no "−0.00". */
function fmt(v: number, d = 2): string {
  const r = Number(v.toFixed(d));
  return (Object.is(r, -0) ? 0 : r).toFixed(d).replace("-", "−");
}
const signed = (v: number, d = 2) => {
  const s = fmt(v, d);
  return s.startsWith("−") ? s : `+${s}`;
};

const DEFAULT = { dx: 3.5, dy: -2, th: 4, err: 0, tol: 0.2, correct: true };

export function VisionLoop({ loop, calibration }: { loop: VisionLoopData; calibration: string }) {
  const [dx, setDx] = useState(DEFAULT.dx);
  const [dy, setDy] = useState(DEFAULT.dy);
  const [th, setTh] = useState(DEFAULT.th);
  const [err, setErr] = useState(DEFAULT.err);
  const [tol, setTol] = useState(DEFAULT.tol);
  const [correct, setCorrect] = useState(DEFAULT.correct);

  const reset = () => {
    setDx(DEFAULT.dx);
    setDy(DEFAULT.dy);
    setTh(DEFAULT.th);
    setErr(DEFAULT.err);
    setTol(DEFAULT.tol);
    setCorrect(DEFAULT.correct);
  };
  const newPart = () => {
    const r = (a: number) => Math.round((Math.random() * 2 - 1) * a * 10) / 10;
    setDx(r(8));
    setDy(r(8));
    setTh(r(10));
  };

  const m = useMemo(() => {
    const pose = poseAbout({ x: 0, y: 0 }, dx, dy, rad(th));
    const f1 = applyRigid(pose, N1);
    const f2raw = applyRigid(pose, N2);
    const base = { x: f2raw.x - f1.x, y: f2raw.y - f1.y };
    const L = Math.hypot(base.x, base.y);
    const perp = rotate({ x: base.x / L, y: base.y / L }, Math.PI / 2);
    const f2 = { x: f2raw.x + perp.x * err, y: f2raw.y + perp.y * err };
    const fit = rigidFromTwoPoints(N1, N2, f1, f2);
    const applied = correct ? fit.transform : IDENTITY;
    const placement = maxDeviation(applied, pose, JOB_POINTS);
    return { pose, f1, f2, fit, applied, placement, pass: placement <= tol + 1e-12 };
  }, [dx, dy, th, err, tol, correct]);

  const t = m.fit.transform;
  const outcome = m.pass ? loop.outcomes.pass : loop.outcomes.fail;
  const stepStatus = [
    `F1 (${fmt(m.f1.x, 1)}, ${fmt(m.f1.y, 1)}) · F2 (${fmt(m.f2.x, 1)}, ${fmt(m.f2.y, 1)}) mm`,
    `ΔX ${signed(t.tx)} mm · ΔY ${signed(t.ty)} mm · Δθ ${signed(deg(t.theta))}°`,
    correct ? "Job transformed by the computed offset" : "Correction off — nominal job coordinates",
    `${m.pass ? "pass" : "fail"}: ${outcome}`,
  ];
  const jobColour = m.pass ? "#59cec7" : "#e9b24c";

  return (
    <LabFrame
      title="Vision-guided processing loop"
      eyebrow="Conceptual simulator · §12.2"
      tags={["conceptual", "derived"]}
      onReset={reset}
      description={
        <>
          Move the part away from where the job expects it. Two fiducials are “found” on the part, a rigid X, Y, θ transform is computed from the two point pairs, and the job outline is
          drawn through that transform. The scene, its millimetre dimensions and the tolerance are illustrative; the geometry is exact.
        </>
      }
      visual={
        <div className="flex flex-col gap-3 p-3">
          <ol className="flex flex-wrap items-stretch gap-y-2" aria-label="Loop stages (handbook §12.2 figure)">
            {loop.steps.map((s, i) => (
              <li key={s} className="flex items-center">
                <div
                  className={cn(
                    "rounded-[var(--radius-sm)] border px-2.5 py-1.5",
                    i === 3 ? (m.pass ? "border-teal-500/40 bg-teal-500/10" : "border-warn/40 bg-warn/10") : "border-[var(--line)] bg-ink-800/70",
                  )}
                >
                  <div className="text-[12px] font-medium text-fog-100">{s}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] leading-snug text-fog-400">{stepStatus[i] ?? ""}</div>
                </div>
                {i < loop.steps.length - 1 ? <ChevronRight aria-hidden className="mx-0.5 size-4 shrink-0 text-teal-400/70" /> : null}
              </li>
            ))}
          </ol>
          <p className="px-1 text-[11px] leading-snug text-fog-500">
            Stage names and the pass / fail outcomes are transcribed from the handbook’s §12.2 figure; the status line under each stage is computed by this simulator (derived).
          </p>
          <svg viewBox="-50 -36 100 72" className="w-full rounded-[var(--radius-md)] bg-ink-950/60" role="img" aria-label={`Part offset by X ${fmt(dx, 1)} mm, Y ${fmt(dy, 1)} mm, θ ${fmt(th, 1)}°; job ${correct ? "transformed" : "not corrected"}; placement error ${fmt(m.placement, 3)} mm.`}>
            {Array.from({ length: 11 }, (_, i) => -50 + i * 10).map((x) => (
              <line key={`gx${x}`} x1={x} x2={x} y1={-36} y2={36} stroke="rgba(255,255,255,0.045)" strokeWidth={0.2} />
            ))}
            {Array.from({ length: 8 }, (_, i) => -35 + i * 10).map((y) => (
              <line key={`gy${y}`} x1={-50} x2={50} y1={y} y2={y} stroke="rgba(255,255,255,0.045)" strokeWidth={0.2} />
            ))}
            {/* machine axes */}
            <g stroke="rgba(255,255,255,0.28)" strokeWidth={0.25}>
              <line x1={-47} x2={-38} y1={33} y2={33} />
              <line x1={-47} x2={-47} y1={33} y2={24} />
            </g>
            <text x={-37} y={34} fontSize={2.6} className="fill-fog-500 font-mono">X</text>
            <text x={-48} y={22.6} fontSize={2.6} className="fill-fog-500 font-mono">Y</text>

            {/* expected (nominal) part and fiducials */}
            <polygon points={pts(IDENTITY, PART)} fill="none" stroke="#8b96a4" strokeWidth={0.3} strokeDasharray="1.2 1" />
            {/* actual part */}
            <polygon points={pts(m.pose, PART)} fill="rgba(117,121,124,0.22)" stroke="#a9b2bd" strokeWidth={0.35} />
            {/* where the job should land on the actual part */}
            {JOB.map((p, i) => (
              <polygon key={`tg${i}`} points={pts(m.pose, p)} fill="none" stroke="#c9d0d8" strokeOpacity={0.45} strokeWidth={0.25} strokeDasharray="0.8 0.8" />
            ))}
            {/* nominal fiducial positions */}
            {[N1, N2].map((n, i) => (
              <circle key={`nf${i}`} cx={n.x} cy={-n.y} r={1.4} fill="none" stroke="#8b96a4" strokeWidth={0.25} strokeDasharray="0.6 0.5" />
            ))}
            {/* laser job as executed */}
            {JOB.map((p, i) => (
              <polygon key={`jb${i}`} points={pts(m.applied, p)} fill={i === 0 ? `${jobColour}22` : "none"} stroke={jobColour} strokeWidth={0.4} />
            ))}
            <polyline points={pts(m.applied, FINDER)} fill="none" stroke={jobColour} strokeWidth={1} />
            {/* found fiducials */}
            {[m.f1, m.f2].map((f, i) => (
              <g key={`ff${i}`} stroke="#19b2ab" strokeWidth={0.35}>
                <circle cx={f.x} cy={-f.y} r={1.6} fill="rgba(25,178,171,0.18)" />
                <line x1={f.x - 2.6} x2={f.x + 2.6} y1={-f.y} y2={-f.y} />
                <line x1={f.x} x2={f.x} y1={-f.y - 2.6} y2={-f.y + 2.6} />
              </g>
            ))}
            <text x={m.f1.x + 2.4} y={-m.f1.y - 2} fontSize={2.6} className="fill-teal-200 font-mono">F1</text>
            <text x={m.f2.x + 2.4} y={-m.f2.y - 2} fontSize={2.6} className="fill-teal-200 font-mono">F2</text>
          </svg>
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11.5px] text-fog-500">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-5 rounded-sm border border-dashed border-fog-400" /> expected part position
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-5 rounded-sm border border-fog-300 bg-steel/30" /> actual part
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full border border-teal-400 bg-teal-400/20" /> found fiducials
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn("h-2.5 w-5 rounded-sm border-2", m.pass ? "border-teal-300" : "border-warn")} /> job as processed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-5 rounded-sm border border-dashed border-fog-200/50" /> where it belongs on the part
            </span>
          </div>
        </div>
      }
      controls={
        <>
          <ControlGroup title="Part placement">
            <RangeField label="X offset" value={dx} min={-8} max={8} step={0.1} onChange={setDx} format={(v) => fmt(v, 1)} unit="mm" />
            <RangeField label="Y offset" value={dy} min={-8} max={8} step={0.1} onChange={setDy} format={(v) => fmt(v, 1)} unit="mm" />
            <RangeField label="Rotation θ" value={th} min={-10} max={10} step={0.1} onChange={setTh} format={(v) => fmt(v, 1)} unit="°" />
            <Button size="sm" onClick={newPart} className="self-start">
              <Shuffle aria-hidden className="size-3.5" /> Load a new part
            </Button>
          </ControlGroup>
          <ControlGroup title="Loop">
            <Switch checked={correct} onChange={setCorrect} label="Apply position correction to the job" description="Off: the job runs at its nominal coordinates." />
            <RangeField
              label="F2 location error"
              value={err}
              min={0}
              max={1}
              step={0.01}
              onChange={setErr}
              format={(v) => fmt(v, 2)}
              unit="mm"
              hint="Moves the found F2 sideways from its true position, as a mis-detection would."
            />
            <RangeField label="Placement tolerance (illustrative)" value={tol} min={0.05} max={1} step={0.05} onChange={setTol} format={(v) => fmt(v, 2)} unit="mm" />
          </ControlGroup>
        </>
      }
      readouts={
        <ReadoutGrid cols={6}>
          <Readout label="Computed ΔX" value={signed(t.tx)} unit="mm" tone="primary" note="from 2 fiducial pairs" />
          <Readout label="Computed ΔY" value={signed(t.ty)} unit="mm" tone="primary" />
          <Readout label="Computed Δθ" value={signed(deg(t.theta), 3)} unit="°" tone="primary" />
          <Readout label="Baseline ratio" value={m.fit.scale.toFixed(5)} note="|F1F2| ÷ nominal; 1.00000 for a rigid part" tone={Math.abs(m.fit.scale - 1) > 1e-4 ? "warn" : "default"} />
          <Readout label="Worst placement error" value={fmt(m.placement, 3)} unit="mm" note="over all job points" tone={m.pass ? "default" : "warn"} />
          <Readout label="Inspection" value={m.pass ? "pass" : "fail"} tone={m.pass ? "primary" : "warn"} note={outcome} />
        </ReadoutGrid>
      }
      footer={
        <div className="flex flex-col gap-3">
          <p>
            <ClassTag kind="handbook" short className="mr-1.5 align-middle" />“{loop.correction}” <SourceRef section="12.2" />
          </p>
          <p>
            <ClassTag kind="handbook" short className="mr-1.5 align-middle" />“{calibration}” <SourceRef section="12.1" />
          </p>
          <p>
            <ClassTag kind="additional" short className="mr-1.5 align-middle" />
            Platform guidance (not from the handbook): with two fiducials, a sideways location error e on one of them tilts the computed angle by about e ÷ separation (here the
            fiducials are {fmt(BASELINE, 1)} mm apart) and shifts the computed translation by about e ÷ 2; the position error this causes grows with distance from the
            fiducials’ midpoint — which is why fiducials are placed far apart. The computed
            transform is p′ = R(Δθ)·p + (ΔX, ΔY), with rotation about the machine origin; the part here is centred on that origin, so ΔX and ΔY equal the part offset when detection is exact.
          </p>
          <p>
            <Link href="/calculators/vision-resolution" className="inline-flex items-center gap-1 text-teal-300 underline decoration-teal-300/30 underline-offset-[3px] hover:decoration-teal-300">
              How small an error can the camera see? Vision resolution calculator <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </p>
        </div>
      }
      sources={[{ section: "12.2", note: "vision-guided loop" }, { section: "12.1", note: "calibration" }]}
    />
  );
}
