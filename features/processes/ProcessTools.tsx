"use client";

import Link from "next/link";
import { useState } from "react";
import { useCanvas, VIZ } from "@/components/viz/useCanvas";
import { LabFrame, Readout, ReadoutGrid, ControlGroup, PresetChips } from "@/components/viz/LabFrame";
import { RangeField } from "@/components/ui/controls";
import { Callout, ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { Tex } from "@/components/ui/Tex";
import * as ia from "@/lib/physics/interaction";
import { meanIntensity, focusedSpotDiameter } from "@/lib/physics/beam";
import { photonEnergyEv, wavelengthColor } from "@/lib/physics/photon";
import { formatNumber, formatWithUnit } from "@/lib/physics/units";

type Row = Record<string, string>;

/* ================================================================== marking: decision matrix */
const MECH_KEYS: Array<[string, RegExp]> = [
  ["Annealing", /anneal/i],
  ["Engraving", /(^|[^p])engrav/i],
  ["Deep engraving", /deep engrav/i],
  ["Ablation", /ablat/i],
  ["Foaming", /foam/i],
  ["Carbonisation / colour change", /carbonis|colour change/i],
  ["Colour marking", /colour \(|colour\/|colour mark/i],
  ["Black marking (nanostructure)", /black|nanostructure/i],
];

export function MarkingSelector({ matrix, mechanisms }: { matrix: Row[]; mechanisms: Row[] }) {
  const [i, setI] = useState(0);
  const row = matrix[i]!;
  const method = `${row["Marking method"]} ${row["Laser type"]}`;
  const matched = mechanisms.filter((m) => MECH_KEYS.find(([k]) => k === m["Mechanism"])?.[1].test(method));
  const nm = Number((row["Wavelength"] ?? "").match(/\d+(\.\d+)?/)?.[0] ?? 1064) * ((row["Wavelength"] ?? "").includes("µm") && !(row["Wavelength"] ?? "").includes("nm") ? 1000 : 1);
  return (
    <section className="@container rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80" aria-labelledby="mk-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Decision matrix · §10.2</div>
          <h3 id="mk-title" className="text-[17px] font-semibold text-paper">
            Material → wavelength → laser → method → result
          </h3>
          <p className="mt-1 max-w-3xl text-[13px] text-fog-400">Pick a material: the handbook row is shown exactly, with the marking mechanisms it uses.</p>
        </div>
        <ClassTag kind="handbook" short />
      </div>
      <div className="grid gap-5 p-5 @4xl:grid-cols-[300px_minmax(0,1fr)]">
        <ul className="scrollbar-thin flex max-h-[420px] flex-col gap-1 overflow-y-auto pr-1" role="listbox" aria-label="Materials">
          {matrix.map((m, k) => (
            <li key={m["Material"]}>
              <button
                type="button"
                role="option"
                aria-selected={k === i}
                onClick={() => setI(k)}
                className={cn(
                  "w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition-colors",
                  k === i ? "bg-teal-500/15 text-teal-100 shadow-[0_0_0_1px_rgb(0_149_144/0.5)_inset]" : "text-fog-300 hover:bg-white/[0.04] hover:text-fog-100",
                )}
              >
                {m["Material"]}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4">
          <ol className="grid gap-2 @2xl:grid-cols-4">
            {(["Wavelength", "Laser type", "Marking method", "Result"] as const).map((k, n) => (
              <li key={k} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-900/60 p-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fog-500">
                  {n + 1}. {k}
                </div>
                <div className="mt-1 text-[13.5px] leading-snug text-fog-100">{row[k]}</div>
              </li>
            ))}
          </ol>
          {matched.length ? (
            <div className="grid gap-2 @2xl:grid-cols-2">
              {matched.map((m) => (
                <article key={m["Mechanism"]} className="rounded-[var(--radius-md)] border border-teal-500/25 bg-teal-500/[0.05] p-3 text-[12.5px] leading-snug">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-teal-100">{m["Mechanism"]}</span>
                    <span className="text-fog-500">mechanism</span>
                  </div>
                  <p className="mt-1 text-fog-300">{m["What happens"]}</p>
                  <p className="mt-1 text-fog-400">
                    Typical laser: {m["Typical laser"]} · Result: {m["Result"]}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
            <SourceRef section="10.2" note="decision matrix" />
            <Link href={`/materials?tab=absorption&nm=${Math.round(nm)}`} className="text-teal-300 underline underline-offset-2">
              Check absorption at {row["Wavelength"]?.split(/[;(]/)[0]?.trim()} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== welding */
const ETA_PRESETS = [
  { value: "steel", label: "Steel surface ~35% (§9.2)", eta: 0.35 },
  { value: "keyhole", label: "Keyhole coupling 60–90% (§9.2)", eta: 0.75 },
  { value: "copper", label: "Cold Cu at 1 µm ~4% (§9.2)", eta: 0.04 },
];

export function WeldingTool({ modes, compact = false }: { modes: Row[]; compact?: boolean }) {
  const [P, setP] = useState(2000);
  const [d, setD] = useState(300);
  const [v, setV] = useState(4);
  const [preset, setPreset] = useState<string | null>("steel");
  const [eta, setEta] = useState(0.35);
  const I = meanIntensity(P, (d * 1e-6) / 2);
  const mode = ia.weldingModeIndicator(I);
  const Q = ia.heatInputPerLength(eta, P, v / 60);
  const row = modes.find((m) => m["Mode"]?.toLowerCase().startsWith(mode));
  const aspect = mode === "conduction" ? 0.5 : mode === "transition" ? 1.5 : 4;

  const { canvasRef } = useCanvas(
    ({ ctx, w, h, t }) => {
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, h);
      const top = h * 0.32;
      // plate
      ctx.fillStyle = "#2a323c";
      ctx.fillRect(0, top, w, h - top);
      ctx.fillStyle = "#3a434e";
      ctx.fillRect(0, top, w, 3);
      const cx = w / 2;
      const width = Math.min(w * 0.22, 40 + d * 0.12);
      const depth = Math.min(h - top - 16, width * aspect * 0.5);
      // fusion zone
      const g = ctx.createRadialGradient(cx, top, 2, cx, top, Math.max(width, depth));
      g.addColorStop(0, "rgba(255,240,200,0.95)");
      g.addColorStop(0.35, "rgba(255,170,80,0.85)");
      g.addColorStop(1, "rgba(255,90,40,0.35)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, top);
      if (mode === "conduction") {
        ctx.quadraticCurveTo(cx - width / 2, top + depth * 1.3, cx, top + depth);
        ctx.quadraticCurveTo(cx + width / 2, top + depth * 1.3, cx + width / 2, top);
      } else {
        ctx.bezierCurveTo(cx - width * 0.45, top + depth * 0.3, cx - width * 0.15, top + depth * 0.7, cx, top + depth);
        ctx.bezierCurveTo(cx + width * 0.15, top + depth * 0.7, cx + width * 0.45, top + depth * 0.3, cx + width / 2, top);
      }
      ctx.closePath();
      ctx.fill();
      // keyhole cavity
      if (mode !== "conduction") {
        const kw = Math.max(4, width * 0.12);
        const wob = mode === "transition" ? Math.sin(t * 9) * 0.25 + 0.6 : 1;
        ctx.fillStyle = "rgba(10,15,23,0.9)";
        ctx.beginPath();
        ctx.moveTo(cx - kw, top);
        ctx.lineTo(cx - kw * 0.3, top + depth * 0.85 * wob);
        ctx.lineTo(cx + kw * 0.3, top + depth * 0.85 * wob);
        ctx.lineTo(cx + kw, top);
        ctx.closePath();
        ctx.fill();
      }
      // beam
      const bw = Math.max(6, width * 0.25);
      ctx.fillStyle = "rgba(255,61,127,0.35)";
      ctx.beginPath();
      ctx.moveTo(cx - bw * 1.8, 10);
      ctx.lineTo(cx + bw * 1.8, 10);
      ctx.lineTo(cx + bw / 2, top);
      ctx.lineTo(cx - bw / 2, top);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = VIZ.textDim;
      ctx.font = VIZ.fontSans;
      ctx.fillText(`illustrative cross-section · aspect ratio drawn ≈ ${aspect}:1 from the §10.4 mode table (${row?.["Aspect ratio (depth/width)"] ?? ""}) — not a depth prediction`, 12, h - 10);
      ctx.fillStyle = "#ff8fb1";
      ctx.fillText("1070 nm beam (false colour)", cx + bw * 2, 24);
    },
    { animate: mode === "transition", deps: [mode, d, aspect] },
  );

  return (
    <LabFrame
      compact={compact}
      title="Welding mode and heat input"
      eyebrow="Welding · §10.4, §9.4"
      tags={["handbook", "derived", "conceptual"]}
      description="Mean intensity on the spot decides conduction vs keyhole (~10⁶ W/cm² for steel); heat input per length Q = ηP/v governs distortion, grain growth and HAZ."
      onReset={() => {
        setP(2000);
        setD(300);
        setV(4);
        setPreset("steel");
        setEta(0.35);
      }}
      visualClassName="min-h-[280px]"
      visual={<canvas ref={canvasRef} className="h-full min-h-[280px] w-full flex-1" role="img" aria-label={`Illustrative ${mode} weld cross-section`} />}
      controls={
        <>
          <ControlGroup title="Beam">
            <RangeField label="Power" symbol="P" value={P} min={50} max={20000} log onChange={setP} format={(x) => formatWithUnit(x, "power", undefined, 3)} />
            <RangeField label="Spot diameter" symbol="d" value={d} min={20} max={2000} log onChange={setD} format={(x) => `${formatNumber(x, 3)} µm`} />
            <RangeField label="Welding speed" symbol="v" value={v} min={0.2} max={30} log onChange={setV} format={(x) => `${formatNumber(x, 3)} m/min`} />
          </ControlGroup>
          <ControlGroup title="Absorptance η">
            <PresetChips
              label="Absorptance presets"
              value={preset}
              onPick={(p) => {
                setPreset(p);
                setEta(ETA_PRESETS.find((e) => e.value === p)!.eta);
              }}
              options={ETA_PRESETS.map((e) => ({ value: e.value, label: e.label }))}
            />
            <RangeField
              label="Absorptance"
              symbol="η"
              value={eta}
              min={0.02}
              max={0.95}
              step={0.01}
              onChange={(x) => {
                setEta(x);
                setPreset(null);
              }}
              format={(x) => `${Math.round(x * 100)} %`}
            />
          </ControlGroup>
          <div className="text-[13px] text-fog-300">
            <Tex math="I = \frac{P}{\pi w^2},\qquad Q = \frac{\eta P}{v}" display />
          </div>
        </>
      }
      readouts={
        <div className="flex flex-col gap-3">
          <ReadoutGrid cols={4}>
            <Readout label="Mean intensity" value={`${formatNumber(I / 1e4, 3)} W/cm²`} tone="primary" />
            <Readout label="Mode (steel, §10.4)" value={row?.["Mode"] ?? mode} tone={mode === "transition" ? "warn" : "primary"} />
            <Readout label="Heat input per length" symbol="Q" value={`${formatNumber(Q / 1e3, 3)} J/mm`} />
            <Readout label="Absorbed power" value={formatWithUnit(eta * P, "power", undefined, 3)} />
          </ReadoutGrid>
          {row ? (
            <p className="text-[12.5px] leading-snug text-fog-400">
              <span className="text-fog-200">{row["Mode"]}</span> · {row["Intensity (≈)"]} · {row["Physics"]} · typical use: {row["Typical use"]}
            </p>
          ) : null}
          {mode === "transition" ? (
            <Callout kind="limitation" title="Transition regime">
              The handbook calls this the least stable regime — “usually avoided”. Move clearly into conduction or keyhole.
            </Callout>
          ) : null}
        </div>
      }
      sources={[{ section: "10.4", note: "welding modes" }, { section: "9.4", note: "keyhole threshold" }, { section: "9.2", note: "absorptance values" }]}
      footer="The ~10⁶ W/cm² threshold is the handbook's value for steel. Copper and aluminium behave differently (§9.2, §15.4); the transition band 0.5–2 × 10⁶ W/cm² is LASERVERSE's rendering of “~10⁶”."
    />
  );
}

/* ================================================================== cutting */
export function CuttingTool({ mechanisms }: { mechanisms: Row[] }) {
  const [i, setI] = useState(0);
  const row = mechanisms[i]!;
  const name = row["Mechanism"] ?? "";
  const kind = /fusion/i.test(name) ? "fusion" : /oxidation/i.test(name) ? "oxidation" : /air/i.test(name) ? "air" : /sublimation/i.test(name) ? "sublimation" : /stress/i.test(name) ? "stress" : "ultrafast";

  const { canvasRef } = useCanvas(
    ({ ctx, w, h, t }) => {
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, h);
      const top = h * 0.35;
      const bot = h * 0.78;
      const cx = w * 0.5;
      const kerf = 10;
      const transparent = kind === "stress" || kind === "ultrafast";
      ctx.fillStyle = transparent ? "rgba(159,208,232,0.18)" : "#2a323c";
      ctx.fillRect(0, top, cx - kerf / 2, bot - top);
      ctx.fillRect(cx + kerf / 2, top, w - cx - kerf / 2, bot - top);
      if (kind === "stress" || kind === "ultrafast") {
        ctx.fillRect(cx - kerf / 2, top, kerf, bot - top);
      }
      // beam / nozzle
      ctx.fillStyle = "#3a434e";
      ctx.beginPath();
      ctx.moveTo(cx - 40, 10);
      ctx.lineTo(cx + 40, 10);
      ctx.lineTo(cx + 14, top - 18);
      ctx.lineTo(cx - 14, top - 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,61,127,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, 14);
      ctx.lineTo(cx, kind === "ultrafast" ? bot : top + 6);
      ctx.stroke();
      const phase = t % 1;
      if (kind === "fusion" || kind === "air" || kind === "oxidation") {
        // gas flow and melt ejection downward
        for (let k = 0; k < 14; k++) {
          const p = (phase + k / 14) % 1;
          const y = top - 16 + p * (h - top);
          ctx.fillStyle = kind === "oxidation" ? `rgba(255,${150 - k * 4},60,${0.9 - p * 0.7})` : `rgba(255,200,120,${0.9 - p * 0.8})`;
          ctx.beginPath();
          ctx.arc(cx + Math.sin(k * 2.3) * 3 + (p > 0.6 ? (k % 2 ? 1 : -1) * (p - 0.6) * 60 : 0), y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        if (kind === "oxidation") {
          const g = ctx.createRadialGradient(cx, top + 10, 1, cx, top + 10, 26);
          g.addColorStop(0, "rgba(255,190,90,0.8)");
          g.addColorStop(1, "rgba(255,120,40,0)");
          ctx.fillStyle = g;
          ctx.fillRect(cx - 30, top - 16, 60, 60);
        }
      } else if (kind === "sublimation") {
        for (let k = 0; k < 16; k++) {
          const p = (phase + k / 16) % 1;
          ctx.fillStyle = `rgba(200,210,220,${0.5 - p * 0.45})`;
          ctx.beginPath();
          ctx.arc(cx + Math.sin(k * 1.7 + p * 4) * (6 + p * 26), top - p * (top - 20), 3 + p * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (kind === "stress") {
        ctx.strokeStyle = "rgba(230,234,238,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, top);
        let y = top;
        while (y < top + (bot - top) * Math.min(1, phase * 1.4)) {
          y += 6;
          ctx.lineTo(cx + Math.sin(y * 1.7) * 1.5, y);
        }
        ctx.stroke();
      } else {
        // filament damage line
        for (let y = top; y < bot; y += 5) {
          ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * Math.sin(y + t * 10) ** 2})`;
          ctx.fillRect(cx - 1, y, 2, 3);
        }
      }
      ctx.fillStyle = VIZ.textDim;
      ctx.font = VIZ.fontSans;
      ctx.fillText(`conceptual · ${row["Gas"] !== "—" ? `gas: ${row["Gas"]}` : "no assist gas"}`, 12, h - 10);
    },
    { animate: true, deps: [kind, i] },
  );

  return (
    <LabFrame
      title="Cutting mechanisms"
      eyebrow="Cutting · §10.3"
      tags={["handbook", "conceptual"]}
      description="How material leaves the kerf decides the gas, the materials and the edge you get. Select a mechanism; the animation is qualitative."
      visualClassName="min-h-[280px]"
      visual={<canvas ref={canvasRef} className="h-full min-h-[280px] w-full flex-1" role="img" aria-label={`Conceptual animation: ${name}`} />}
      controls={
        <ControlGroup title="Mechanism">
          <div className="flex flex-col gap-1" role="radiogroup" aria-label="Cutting mechanism">
            {mechanisms.map((m, k) => (
              <button
                key={m["Mechanism"]}
                type="button"
                role="radio"
                aria-checked={k === i}
                onClick={() => setI(k)}
                className={cn("rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-[13px]", k === i ? "bg-teal-500/15 text-teal-100 shadow-[0_0_0_1px_rgb(0_149_144/0.5)_inset]" : "text-fog-300 hover:bg-white/[0.04]")}
              >
                {m["Mechanism"]}
              </button>
            ))}
          </div>
        </ControlGroup>
      }
      readouts={
        <ReadoutGrid cols={4}>
          <Readout label="How material leaves" value={row["How material leaves the kerf"] ?? ""} />
          <Readout label="Gas" value={row["Gas"] ?? ""} tone="primary" />
          <Readout label="Materials" value={row["Materials"] ?? ""} />
          <Readout label="Edge result" value={row["Edge result"] ?? ""} />
        </ReadoutGrid>
      }
      sources={[{ section: "10.3", note: "cutting mechanisms" }]}
    />
  );
}

/* ================================================================== drilling */
export function DrillingTool({ methods }: { methods: Row[] }) {
  const [i, setI] = useState(1);
  const row = methods[i]!;
  const name = row["Method"] ?? "";
  const kind = /single/i.test(name) ? "single" : /percussion/i.test(name) ? "percussion" : /trepan/i.test(name) ? "trepan" : /helical/i.test(name) ? "helical" : "lise";
  const { canvasRef } = useCanvas(
    ({ ctx, w, h, t }) => {
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, h);
      const split = w * 0.62;
      // cross-section
      const top = h * 0.25;
      const bot = h * 0.85;
      const cx = split / 2;
      const glass = kind === "lise";
      ctx.fillStyle = glass ? "rgba(159,208,232,0.18)" : "#2a323c";
      ctx.fillRect(20, top, split - 40, bot - top);
      const cycle = (t * 0.25) % 1;
      const prog = t > 0 ? cycle : 1;
      const holeW = kind === "single" ? 34 : kind === "percussion" ? 24 : kind === "trepan" ? 44 : kind === "helical" ? 26 : 18;
      const depth = (bot - top) * (kind === "single" ? Math.min(1, prog * 6) * 0.55 : prog);
      ctx.fillStyle = VIZ.bg;
      if (kind === "lise") {
        // modification line, then etch opens it in the last third
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        for (let y = top; y < top + (bot - top) * Math.min(1, prog * 1.5); y += 4) ctx.fillRect(cx - 1, y, 2, 2);
        if (prog > 0.66) {
          const e = (prog - 0.66) / 0.34;
          ctx.fillStyle = VIZ.bg;
          ctx.beginPath();
          ctx.moveTo(cx - holeW * e, top);
          ctx.lineTo(cx + holeW * e, top);
          ctx.lineTo(cx + holeW * e * 0.6, bot);
          ctx.lineTo(cx - holeW * e * 0.6, bot);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        const taper = kind === "helical" ? 1.05 : kind === "trepan" ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.moveTo(cx - holeW / 2, top);
        ctx.lineTo(cx + holeW / 2, top);
        ctx.lineTo(cx + (holeW / 2) * taper, top + depth);
        ctx.lineTo(cx - (holeW / 2) * taper, top + depth);
        ctx.closePath();
        ctx.fill();
        if (kind !== "helical") {
          ctx.strokeStyle = "rgba(255,170,80,0.45)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - holeW / 2 - 1, top);
          ctx.lineTo(cx - (holeW / 2) * taper - 1, top + depth);
          ctx.moveTo(cx + holeW / 2 + 1, top);
          ctx.lineTo(cx + (holeW / 2) * taper + 1, top + depth);
          ctx.stroke();
        }
      }
      // beam
      const pulseOn = kind === "single" ? prog < 0.15 : Math.sin(t * 30) > 0;
      const bx = kind === "trepan" ? cx + Math.cos(t * 6) * (holeW / 2 - 3) : kind === "helical" ? cx + Math.cos(t * 9) * (holeW / 2 - 5) : cx;
      ctx.strokeStyle = pulseOn ? "rgba(255,61,127,0.9)" : "rgba(255,61,127,0.25)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, 8);
      ctx.lineTo(bx, top + (kind === "lise" ? bot - top : depth));
      ctx.stroke();
      ctx.fillStyle = VIZ.textDim;
      ctx.font = VIZ.fontSans;
      ctx.fillText("cross-section", 24, top - 10);
      // top view
      const tx = split + (w - split) / 2;
      const ty = h * 0.5;
      ctx.strokeStyle = VIZ.gridStrong;
      ctx.strokeRect(split + 14, ty - 70, w - split - 28, 140);
      ctx.fillText("top view (beam path)", split + 20, ty - 78);
      ctx.strokeStyle = "rgba(255,61,127,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (kind === "trepan") ctx.arc(tx, ty, 34, 0, ((t * 6) % (Math.PI * 2)) || Math.PI * 2);
      else if (kind === "helical") {
        for (let a = 0; a < Math.PI * 8; a += 0.1) {
          const rr = 26 + Math.sin(a * 0.25) * 2;
          const x = tx + Math.cos(a + t * 9) * rr;
          const y = ty + Math.sin(a + t * 9) * rr;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else ctx.arc(tx, ty, kind === "single" ? 16 : kind === "lise" ? 3 : 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = VIZ.textDim;
      ctx.fillText("conceptual", split + 20, ty + 84);
    },
    { animate: true, deps: [kind] },
  );
  return (
    <LabFrame
      title="Drilling methods"
      eyebrow="Drilling · §10.7"
      tags={["handbook", "conceptual"]}
      description="Each method trades speed against roundness, recast and taper control. Values are the handbook's table entries; the animation is qualitative."
      visualClassName="min-h-[300px]"
      visual={<canvas ref={canvasRef} className="h-full min-h-[300px] w-full flex-1" role="img" aria-label={`Conceptual animation: ${name} drilling`} />}
      controls={
        <ControlGroup title="Method">
          <div className="flex flex-col gap-1" role="radiogroup" aria-label="Drilling method">
            {methods.map((m, k) => (
              <button
                key={m["Method"]}
                type="button"
                role="radio"
                aria-checked={k === i}
                onClick={() => setI(k)}
                className={cn("rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-[13px]", k === i ? "bg-teal-500/15 text-teal-100 shadow-[0_0_0_1px_rgb(0_149_144/0.5)_inset]" : "text-fog-300 hover:bg-white/[0.04]")}
              >
                {m["Method"]}
              </button>
            ))}
          </div>
        </ControlGroup>
      }
      readouts={
        <ReadoutGrid cols={5}>
          <Readout label="Principle" value={row["Principle"] ?? ""} />
          <Readout label="Hole diameter (≈)" value={row["Hole diameter (≈)"] ?? ""} tone="primary" />
          <Readout label="Aspect ratio (≈)" value={row["Aspect ratio (≈)"] ?? ""} />
          <Readout label="Quality" value={row["Quality"] ?? ""} />
          <Readout label="Typical lasers" value={row["Typical lasers"] ?? ""} />
        </ReadoutGrid>
      }
      sources={[{ section: "10.7", note: "drilling methods" }]}
    />
  );
}

/* ================================================================== wavelength: UV and CO₂ */
export interface Bond {
  name: string;
  ev: number;
}

export function WavelengthTool({ bonds }: { bonds: Bond[] }) {
  const [nm, setNm] = useState(355);
  const [f, setF] = useState(160);
  const [D, setD] = useState(7);
  const E = photonEnergyEv(nm * 1e-9);
  const spot = (l: number) => focusedSpotDiameter(l * 1e-9, 1, f * 1e-3, D * 1e-3);
  const col = wavelengthColor(nm * 1e-9);
  const compare = [355, 532, 1064, 10600];
  const W = 640;
  const x0 = 20;
  const x1 = W - 20;
  const maxEv = 7;
  const lx = (e: number) => x0 + (e / maxEv) * (x1 - x0);
  return (
    <LabFrame
      title="Photon energy, spot size and absorption by wavelength"
      eyebrow="Wavelength choice · §10.13, §10.14, §1.6, §4.5"
      tags={["handbook", "derived"]}
      description="Shorter wavelengths focus to smaller spots with the same optics and are absorbed in thinner layers; even so, a 355 nm photon carries less energy than most chemical bonds."
      onReset={() => {
        setNm(355);
        setF(160);
        setD(7);
      }}
      visual={
        <div className="flex flex-col gap-4 p-4">
          <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label={`Photon energy at ${nm} nm compared with bond energies from handbook §1.6`}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((e) => (
              <g key={e}>
                <line x1={lx(e)} x2={lx(e)} y1={14} y2={120} stroke="rgba(255,255,255,0.06)" />
                <text x={lx(e)} y={136} textAnchor="middle" className="fill-fog-500 font-mono text-[10px]">
                  {e} eV
                </text>
              </g>
            ))}
            {bonds.map((b, k) => (
              <g key={b.name}>
                <line x1={lx(b.ev)} x2={lx(b.ev)} y1={40 + (k % 3) * 22} y2={118} stroke="#a68cff" strokeOpacity={0.6} />
                <text x={lx(b.ev) + 3} y={38 + (k % 3) * 22} className="fill-concept text-[10px]">
                  {b.name} {b.ev}
                </text>
              </g>
            ))}
            <rect x={x0} y={104} width={Math.max(2, lx(Math.min(E, maxEv)) - x0)} height={12} rx={6} fill={col.css} />
            <text x={Math.min(lx(Math.min(E, maxEv)) + 6, x1 - 120)} y={98} className="font-mono text-[11px]" fill={col.css}>
              {formatNumber(E, 3)} eV photon{col.visible ? "" : " (false colour)"}
            </text>
          </svg>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {compare.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setNm(l)}
                aria-pressed={nm === l}
                className={cn("rounded-[var(--radius-md)] border p-3 text-left", nm === l ? "border-teal-400/60 bg-teal-500/10" : "border-[var(--line)] bg-ink-900/60 hover:border-white/20")}
              >
                <div className="font-mono text-[13px]" style={{ color: wavelengthColor(l * 1e-9).css }}>
                  {l >= 1000 ? `${l / 1000} µm` : `${l} nm`}
                </div>
                <div className="mt-1 text-[12px] text-fog-300">{formatNumber(photonEnergyEv(l * 1e-9), 3)} eV</div>
                <div className="text-[12px] text-fog-400">spot {formatWithUnit(spot(l), "length", undefined, 3)}</div>
              </button>
            ))}
          </div>
        </div>
      }
      controls={
        <>
          <ControlGroup title="Wavelength">
            <RangeField label="Wavelength" symbol="λ" value={nm} min={190} max={11000} log onChange={setNm} format={(x) => (x >= 1000 ? `${formatNumber(x / 1000, 3)} µm` : `${Math.round(x)} nm`)} />
          </ControlGroup>
          <ControlGroup title="Same optics for every λ (M² = 1)">
            <RangeField label="Focal length" symbol="f" value={f} min={50} max={500} onChange={setF} step={1} format={(x) => `${Math.round(x)} mm`} />
            <RangeField label="Beam diameter at lens" symbol="D" value={D} min={2} max={20} step={0.5} onChange={setD} format={(x) => `${formatNumber(x, 3)} mm`} />
          </ControlGroup>
          <div className="text-[13px] text-fog-300">
            <Tex math="E = \frac{hc}{\lambda},\qquad d_0 = \frac{4M^2\lambda f}{\pi D}" display />
          </div>
        </>
      }
      readouts={
        <ReadoutGrid cols={3}>
          <Readout label="Photon energy" value={`${formatNumber(E, 3)} eV`} tone="primary" />
          <Readout label="Focused spot (M² = 1)" value={formatWithUnit(spot(nm), "length", undefined, 3)} />
          <Readout label="Spot vs 1064 nm" value={`${formatNumber(nm / 1064, 3)}×`} note="d₀ ∝ λ at fixed optics" />
        </ReadoutGrid>
      }
      sources={[{ section: "1.6", note: "bond energies" }, { section: "4.5", note: "spot size" }, { section: "10.13" }, { section: "10.14" }]}
      footer="Real sources differ in M², and CO₂ optics (ZnSe, Ge) and UV optics differ from 1 µm optics; the comparison holds the optics fixed to isolate the wavelength effect."
    />
  );
}
