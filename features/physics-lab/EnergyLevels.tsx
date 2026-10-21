"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, StepForward, Zap } from "lucide-react";
import { useCanvas, VIZ } from "@/components/viz/useCanvas";
import { LabFrame, Readout, ReadoutGrid, ControlGroup, PresetChips } from "@/components/viz/LabFrame";
import { RangeField } from "@/components/ui/controls";
import { Button, Callout, cn } from "@/components/ui/primitives";
import { useMotionAllowed } from "@/components/shell/MotionProvider";

type Scheme = "two" | "three" | "four" | "quasi";
interface LevelDef {
  name: string;
  y: number; // 0 bottom … 1 top
  role: "ground" | "lower" | "upper" | "pump";
}
const SCHEMES: Record<Scheme, { label: string; example: string; levels: LevelDef[]; upper: number; lower: number; note: string }> = {
  two: {
    label: "Two-level",
    example: "idealised",
    levels: [
      { name: "E₁ ground / lower", y: 0.08, role: "lower" },
      { name: "E₂ upper", y: 0.72, role: "upper" },
    ],
    upper: 1,
    lower: 0,
    note: "Pumping on the laser transition itself drives absorption and stimulated emission equally, so populations can at best equalise (transparency) — no inversion (§2.2).",
  },
  three: {
    label: "Three-level",
    example: "ruby",
    levels: [
      { name: "E₁ ground = lower laser level", y: 0.08, role: "lower" },
      { name: "E₂ upper (metastable)", y: 0.62, role: "upper" },
      { name: "E₃ pump band", y: 0.9, role: "pump" },
    ],
    upper: 1,
    lower: 0,
    note: "The lower laser level is the ground state, so more than half the ions must be pumped before inversion (§2.2).",
  },
  four: {
    label: "Four-level",
    example: "Nd:YAG 1064 nm",
    levels: [
      { name: "E₀ ground", y: 0.06, role: "ground" },
      { name: "E₁ lower laser level", y: 0.26, role: "lower" },
      { name: "E₂ upper (metastable)", y: 0.66, role: "upper" },
      { name: "E₃ pump band", y: 0.9, role: "pump" },
    ],
    upper: 2,
    lower: 1,
    note: "The lower laser level empties in nanoseconds, so inversion is easy and threshold is low (§2.2).",
  },
  quasi: {
    label: "Quasi-three-level",
    example: "Yb 1030 nm",
    levels: [
      { name: "E₀ ground manifold", y: 0.06, role: "ground" },
      { name: "E₁ lower laser level (thermally populated)", y: 0.16, role: "lower" },
      { name: "E₂ upper (metastable)", y: 0.7, role: "upper" },
      { name: "pump band (upper manifold)", y: 0.8, role: "pump" },
    ],
    upper: 2,
    lower: 1,
    note: "The lower laser level is thermally populated, so these lasers need high pump intensity and good cooling — rewarded with very low heat load (§2.2).",
  },
};

const N = 40;
interface Photon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: "pump" | "laser" | "spont";
}
interface Anim {
  from: number;
  to: number;
  t: number;
  radiative: boolean;
}

/** Visual-time rate constants (per second) — illustrative only. */
const RATE = { fast: 9, upperDecay: 0.35, thermal: 3 };

export function EnergyLevels({ compact = false }: { compact?: boolean }) {
  const [scheme, setScheme] = useState<Scheme>("four");
  const [pumpRate, setPumpRate] = useState(0.8);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Array<{ id: number; text: string }>>([]);
  const [ver, force] = useState(0);
  const motionAllowed = useMotionAllowed();
  const def = SCHEMES[scheme];

  const atoms = useRef<number[]>([]);
  const anims = useRef<Array<Anim | null>>([]);
  const photons = useRef<Photon[]>([]);
  const logId = useRef(0);

  const groundIdx = def.levels.findIndex((l) => l.role === "ground" || l.role === "lower");
  const reset = useCallback(() => {
    const quasiThermal = scheme === "quasi" ? Math.round(N * 0.08) : 0;
    atoms.current = Array.from({ length: N }, (_, i) => (i < quasiThermal ? 1 : groundIdx < 0 ? 0 : groundIdx));
    anims.current = Array.from({ length: N }, () => null);
    photons.current = [];
    setLog([]);
    force((x) => x + 1);
  }, [scheme, groundIdx]);
  useEffect(reset, [reset]);

  const say = (text: string) => setLog((l) => [{ id: ++logId.current, text }, ...l].slice(0, 6));

  const move = (i: number, to: number, radiative: boolean, kind: Photon["kind"] | null, layout: { w: number; h: number } | null) => {
    const from = atoms.current[i]!;
    atoms.current[i] = to;
    anims.current[i] = { from, to, t: 0, radiative };
    if (kind && layout) {
      const { x, yFrom, yTo } = atomPos(i, from, to, layout);
      const ang = kind === "spont" ? Math.random() * Math.PI * 2 : 0;
      photons.current.push({ x, y: (yFrom + yTo) / 2, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 1.6, kind });
    }
  };

  const pickAtom = (level: number) => {
    const idx = atoms.current.map((l, i) => (l === level ? i : -1)).filter((i) => i >= 0);
    return idx.length ? idx[Math.floor(Math.random() * idx.length)]! : -1;
  };

  const layoutRef = useRef<{ w: number; h: number } | null>(null);
  const levelY = (lvl: number, h: number) => h - 26 - def.levels[lvl]!.y * (h - 56);
  const atomPos = (i: number, from: number, to: number, l: { w: number; h: number }) => {
    const x0 = 150, x1 = l.w - 30;
    const x = x0 + ((i + 0.5) / N) * (x1 - x0);
    return { x, yFrom: levelY(from, l.h), yTo: levelY(to, l.h) };
  };

  /* --------------------------------------------------------- events */
  const pumpOnce = () => {
    const src = def.levels.findIndex((l) => l.role === "ground" || (scheme === "two" || scheme === "three" ? l.role === "lower" : false));
    const target = def.levels.findIndex((l) => l.role === "pump");
    const i = pickAtom(src);
    if (i < 0) return say("No atom available in the ground state to pump.");
    if (scheme === "two") {
      move(i, def.upper, false, null, layoutRef.current);
      say("Pump absorption lifts an atom E₁ → E₂. In a two-level system the pump also stimulates emission back down.");
    } else {
      move(i, target, false, null, layoutRef.current);
      say("Pump absorption lifts an atom into the pump band; it relaxes quickly and non-radiatively to the metastable upper level.");
    }
    force((x) => x + 1);
  };
  const spontaneous = () => {
    const i = pickAtom(def.upper);
    if (i < 0) return say("No atom in the upper laser level — pump first.");
    move(i, def.lower, true, "spont", layoutRef.current);
    say("Spontaneous emission: an excited atom decays on its own and emits a photon in a random direction, phase and polarisation (§2.1).");
    force((x) => x + 1);
  };
  const probe = () => {
    const nu = atoms.current.filter((l) => l === def.upper).length;
    const nl = atoms.current.filter((l) => l === def.lower).length;
    if (nu + nl === 0) return say("Neither laser level is populated.");
    const stimulated = Math.random() < nu / (nu + nl);
    const l = layoutRef.current;
    if (stimulated) {
      const i = pickAtom(def.upper);
      move(i, def.lower, true, null, l);
      if (l) {
        const { x, yFrom, yTo } = atomPos(i, def.upper, def.lower, l);
        const y = (yFrom + yTo) / 2;
        photons.current.push({ x: x - 4, y: y - 5, vx: 220, vy: 0, life: 1.8, kind: "laser" }, { x: x - 4, y: y + 5, vx: 220, vy: 0, life: 1.8, kind: "laser" });
      }
      say("Stimulated emission: the probe photon triggers decay and leaves with a clone — same frequency, phase, direction and polarisation (§2.1).");
    } else {
      const i = pickAtom(def.lower);
      move(i, def.upper, false, null, l);
      say("Absorption: the probe photon is consumed lifting an atom from the lower to the upper laser level (§2.1).");
    }
    force((x) => x + 1);
  };

  /* --------------------------------------------------------- continuous model */
  const step = (dt: number) => {
    const l = layoutRef.current;
    const pumpIdx = def.levels.findIndex((x) => x.role === "pump");
    for (let i = 0; i < N; i++) {
      const lv = atoms.current[i]!;
      const r = Math.random();
      const role = def.levels[lv]!.role;
      if (scheme === "two") {
        // pump drives both directions equally (B12 = B21 for equal degeneracy) + spontaneous decay
        if (lv === 0 && r < pumpRate * dt) move(i, 1, false, null, l);
        else if (lv === 1 && r < (pumpRate + RATE.upperDecay) * dt) move(i, 0, Math.random() < RATE.upperDecay / (pumpRate + RATE.upperDecay), "spont", Math.random() < 0.3 ? l : null);
        continue;
      }
      if ((role === "ground" || (scheme === "three" && role === "lower")) && r < pumpRate * dt) move(i, pumpIdx, false, null, l);
      else if (role === "pump" && r < RATE.fast * dt) move(i, def.upper, false, null, l);
      else if (lv === def.upper && r < RATE.upperDecay * dt) move(i, def.lower, true, "spont", Math.random() < 0.35 ? l : null);
      else if (role === "lower" && scheme === "four" && r < RATE.fast * dt) move(i, 0, false, null, l);
      else if (role === "lower" && scheme === "quasi" && r < RATE.thermal * dt) move(i, 0, false, null, l);
      else if (role === "ground" && scheme === "quasi" && r < RATE.thermal * 0.08 * dt) move(i, 1, false, null, l);
    }
  };

  const { canvasRef } = useCanvas(
    ({ ctx, w, h, dt }) => {
      layoutRef.current = { w, h };
      if (running && dt > 0) step(dt);
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, h);
      // levels
      def.levels.forEach((lv, k) => {
        const y = levelY(k, h);
        const isLaser = k === def.upper || k === def.lower;
        ctx.strokeStyle = lv.role === "pump" ? "rgba(166,140,255,0.6)" : isLaser ? "rgba(89,206,199,0.75)" : "rgba(255,255,255,0.35)";
        ctx.lineWidth = lv.role === "pump" ? 6 : 1.5;
        ctx.globalAlpha = lv.role === "pump" ? 0.35 : 1;
        ctx.beginPath();
        ctx.moveTo(140, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = isLaser ? VIZ.textBright : VIZ.text;
        ctx.font = VIZ.fontSans;
        const words = lv.name;
        ctx.fillText(words.length > 22 ? `${words.slice(0, 21)}…` : words, 8, y + 4);
      });
      // laser transition arrow label
      const yU = levelY(def.upper, h), yL = levelY(def.lower, h);
      ctx.strokeStyle = VIZ.tealBright;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(130, yU);
      ctx.lineTo(130, yL);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = VIZ.tealBright;
      ctx.font = VIZ.font;
      ctx.save();
      ctx.translate(122, (yU + yL) / 2 + 30);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("laser transition", 0, 0);
      ctx.restore();
      // atoms
      for (let i = 0; i < N; i++) {
        const a = anims.current[i];
        const lv = atoms.current[i]!;
        let y = levelY(lv, h);
        if (a && a.t < 1) {
          a.t = Math.min(1, a.t + (dt > 0 ? dt / 0.45 : 1));
          const e = 1 - (1 - a.t) ** 3;
          y = levelY(a.from, h) + (levelY(a.to, h) - levelY(a.from, h)) * e;
        }
        const { x } = atomPos(i, lv, lv, { w, h });
        const role = def.levels[lv]!.role;
        ctx.fillStyle = role === "upper" ? VIZ.tealBright : role === "pump" ? VIZ.concept : "rgba(230,234,238,0.75)";
        ctx.beginPath();
        ctx.arc(x, y - 6, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // photons
      photons.current = photons.current.filter((p) => p.life > 0 && p.x > -20 && p.x < w + 20 && p.y > -20 && p.y < h + 20);
      for (const p of photons.current) {
        if (dt > 0) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        }
        ctx.fillStyle = p.kind === "laser" ? VIZ.tealBright : p.kind === "pump" ? VIZ.concept : VIZ.warn;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (photons.current.length > 80) photons.current.splice(0, photons.current.length - 80);
    },
    { animate: true, deps: [scheme, running, log.length, ver] },
  );

  const nu = atoms.current.filter((l) => l === def.upper).length;
  const nl = atoms.current.filter((l) => l === def.lower).length;
  const inverted = nu > nl;
  // re-render readouts ~4×/s while running
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => force((x) => x + 1), 250);
    return () => clearInterval(id);
  }, [running]);

  return (
    <LabFrame
      eyebrow="Physics Lab"
      title="Atomic energy levels, emission and population inversion"
      tags={["conceptual"]}
      description="A conceptual representation, not a quantitative quantum-mechanical simulation: 40 atoms, illustrative rates and equal degeneracies. It shows why inversion needs three or four levels."
      compact={compact}
      onReset={() => {
        setRunning(false);
        reset();
      }}
      visual={<canvas ref={canvasRef} className={compact ? "h-[300px] w-full" : "min-h-[340px] w-full flex-1"} role="img" aria-label={`${def.label} level scheme with ${nu} atoms in the upper and ${nl} in the lower laser level`} />}
      controls={
        <>
          <ControlGroup title="Level scheme">
            <PresetChips label="Level scheme" options={(Object.keys(SCHEMES) as Scheme[]).map((s) => ({ value: s, label: SCHEMES[s].label, title: SCHEMES[s].example }))} value={scheme} onPick={(s) => { setRunning(false); setScheme(s); }} />
            <p className="text-[12.5px] leading-snug text-fog-400">
              <span className="text-fog-200">{def.example}.</span> {def.note}
            </p>
          </ControlGroup>
          <ControlGroup title="Single events">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={pumpOnce}>
                <Zap aria-hidden className="size-3.5" /> Pump one atom
              </Button>
              <Button size="sm" onClick={spontaneous}>Spontaneous emission</Button>
              <Button size="sm" onClick={probe}>Send probe photon</Button>
            </div>
            <p className="text-[11.5px] text-fog-500">A probe photon at the laser transition is absorbed or causes stimulated emission with probabilities proportional to the lower and upper populations.</p>
          </ControlGroup>
          <ControlGroup title="Continuous pumping">
            <RangeField label="Pump rate (illustrative)" value={pumpRate} min={0} max={3} step={0.05} onChange={setPumpRate} format={(v) => v.toFixed(2)} unit="/s" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={running ? "secondary" : "primary"} onClick={() => setRunning((r) => !r)} disabled={!motionAllowed} aria-pressed={running}>
                {running ? <Pause aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
                {running ? "Stop" : "Run"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { for (let k = 0; k < 10; k++) step(0.05); force((x) => x + 1); }}>
                <StepForward aria-hidden className="size-3.5" /> Step 0.5 s
              </Button>
            </div>
            {!motionAllowed ? <p className="text-[11.5px] text-fog-500">Reduced motion is on: use Step to advance the model.</p> : null}
          </ControlGroup>
        </>
      }
      readouts={
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ReadoutGrid cols={3}>
            <Readout label="Upper laser level" symbol="N_2" value={String(nu)} unit={`/ ${N}`} />
            <Readout label="Lower laser level" symbol="N_1" value={String(nl)} unit={`/ ${N}`} />
            <Readout label="State" value={inverted ? "Population inversion" : nu === nl && nu > 0 ? "Transparency" : "No inversion"} tone={inverted ? "primary" : "muted"} note={inverted ? "Net gain for the probe photon" : "Net absorption"} />
          </ReadoutGrid>
          <div aria-live="polite" className="min-h-[96px] rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/50 px-3 py-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Event log</div>
            {log.length ? (
              <ul className="space-y-1 text-[12.5px] leading-snug">
                {log.map((e, i) => (
                  <li key={e.id} className={cn(i === 0 ? "text-fog-100" : "text-fog-500")}>
                    {e.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-fog-500">Pump atoms, then send probe photons. Try the two-level scheme with continuous pumping: populations never invert.</p>
            )}
          </div>
        </div>
      }
      footer={
        <Callout kind="conceptual" className="!text-[12.5px]">
          Atoms, photons and rates are illustrative. Real lifetimes span ~1 ns (semiconductor carriers) to ~10 ms (Er:silica); see the lifetime table in §2.3. Degeneracy factors and cross-sections, which set real gain, are not modelled.
        </Callout>
      }
      sources={[{ section: "2.1", note: "emission processes" }, { section: "2.2", note: "level schemes" }, { section: "2.3" }, { section: "1.4" }]}
    />
  );
}
