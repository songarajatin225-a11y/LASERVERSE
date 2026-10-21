"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCanvas, VIZ } from "@/components/viz/useCanvas";
import { LabFrame, Readout, ReadoutGrid, ControlGroup, PresetChips } from "@/components/viz/LabFrame";
import { RangeField } from "@/components/ui/controls";
import { Tex } from "@/components/ui/Tex";
import { cn } from "@/components/ui/primitives";
import { formatNumber } from "@/lib/physics/units";

export interface ArchBlock {
  block: string;
  fn: string;
  examples: string;
  concerns: string;
}
export interface CouplerRow {
  laser: string;
  reflectivity: string;
  reason: string;
}

/** Illustrative single-pass gains for the handbook's §2.4 coupler examples (not handbook data). */
const PRESETS = [
  { id: "hene", label: "He-Ne", R2: 99, G0: 1.03, match: "He-Ne" },
  { id: "dpss", label: "Nd DPSS", R2: 85, G0: 1.6, match: "Nd:YAG" },
  { id: "co2", label: "Sealed CO₂", R2: 85, G0: 1.5, match: "Sealed CO₂" },
  { id: "fiber", label: "Yb fiber", R2: 10, G0: 30, match: "Yb fiber" },
  { id: "diode", label: "Laser diode", R2: 5, G0: 50, match: "Laser diode" },
];

type Part = "pump" | "hr" | "gain" | "oc" | "out";
const PART_BLOCK: Record<Part, string> = { pump: "Pump source", hr: "Resonator", gain: "Gain medium", oc: "Beam extraction", out: "Beam conditioning" };

/** Round-trip iteration with homogeneous gain saturation g = g0/(1 + I/Isat), I in units of Isat. */
function simulate(G0: number, R1: number, R2: number, loss: number, trips = 60) {
  const lnG0 = Math.log(G0);
  let I = 1e-4; // seeded by spontaneous emission
  const series: number[] = [];
  for (let n = 0; n < trips; n++) {
    const G = Math.exp(lnG0 / (1 + I));
    I = I * R1 * R2 * G * G * (1 - loss) ** 2 + 1e-6;
    series.push(I);
  }
  return series;
}

export function CavityExplorer({ blocks = [], couplers = [], compact = false }: { blocks?: ArchBlock[]; couplers?: CouplerRow[]; compact?: boolean }) {
  const [R1, setR1] = useState(99.9);
  const [R2, setR2] = useState(85);
  const [G0, setG0] = useState(1.6);
  const [loss, setLoss] = useState(2);
  const [preset, setPreset] = useState<string | null>("dpss");
  const [selected, setSelected] = useState<Part>("gain");

  const r1 = R1 / 100, r2 = R2 / 100, l = loss / 100;
  const roundTrip = r1 * r2 * G0 * G0 * (1 - l) ** 2;
  const G0th = 1 / (Math.sqrt(r1 * r2) * (1 - l));
  const lasing = roundTrip >= 1;
  const series = useMemo(() => simulate(G0, r1, r2, l), [G0, r1, r2, l]);
  const Iss = series[series.length - 1]!;
  const output = (1 - r2) * Iss;
  const block = blocks.find((b) => b.block === PART_BLOCK[selected]);
  const coupler = couplers.find((c) => c.laser.startsWith(PRESETS.find((p) => p.id === preset)?.match ?? "@@"));

  const { canvasRef } = useCanvas(
    ({ ctx, w, h, t }) => {
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, h);
      const cy = h * 0.55;
      const xL = w * 0.1, xR = w * 0.72;
      const gainX0 = w * 0.28, gainX1 = w * 0.54;
      const glow = Math.min(1, Math.log10(1 + Iss * 50) / 2.2);
      // intracavity beam
      if (lasing) {
        const grd = ctx.createLinearGradient(xL, 0, xR, 0);
        grd.addColorStop(0, `rgba(25,178,171,${0.15 + 0.5 * glow})`);
        grd.addColorStop(1, `rgba(25,178,171,${0.15 + 0.5 * glow})`);
        ctx.fillStyle = grd;
        ctx.fillRect(xL, cy - 6 - 6 * glow, xR - xL, 12 + 12 * glow);
      }
      // gain medium
      ctx.fillStyle = selected === "gain" ? "rgba(89,206,199,0.25)" : "rgba(255,255,255,0.08)";
      ctx.strokeStyle = selected === "gain" ? VIZ.tealBright : "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(gainX0, cy - 26, gainX1 - gainX0, 52, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = VIZ.text;
      ctx.font = VIZ.fontSans;
      ctx.textAlign = "center";
      ctx.fillText("gain medium", (gainX0 + gainX1) / 2, cy + 44);
      // pump
      ctx.strokeStyle = selected === "pump" ? VIZ.concept : "rgba(166,140,255,0.55)";
      ctx.fillStyle = "rgba(166,140,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(gainX0 + 10, cy - 86, gainX1 - gainX0 - 20, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = VIZ.text;
      ctx.fillText("pump", (gainX0 + gainX1) / 2, cy - 92);
      for (let k = 0; k < 5; k++) {
        const x = gainX0 + 22 + k * ((gainX1 - gainX0 - 44) / 4);
        const off = ((t * 60 + k * 9) % 30) - 2;
        ctx.strokeStyle = "rgba(166,140,255,0.8)";
        ctx.beginPath();
        ctx.moveTo(x, cy - 62 + off * 0.3);
        ctx.lineTo(x, cy - 30);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 4, cy - 36);
        ctx.lineTo(x, cy - 30);
        ctx.lineTo(x + 4, cy - 36);
        ctx.stroke();
      }
      // HR mirror (concave)
      ctx.strokeStyle = selected === "hr" ? VIZ.tealBright : "rgba(230,234,238,0.8)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(xL + 60, cy, 64, Math.PI * 0.82, Math.PI * 1.18);
      ctx.stroke();
      ctx.fillStyle = VIZ.text;
      ctx.lineWidth = 1;
      ctx.fillText(`HR mirror R₁ = ${R1}%`, xL + 4, cy + 80);
      // output coupler
      ctx.strokeStyle = selected === "oc" ? VIZ.tealBright : "rgba(230,234,238,0.55)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(xR, cy - 52);
      ctx.lineTo(xR, cy + 52);
      ctx.stroke();
      ctx.fillStyle = VIZ.text;
      ctx.fillText(`output coupler R₂ = ${R2}%`, xR, cy + 80);
      // photons bouncing
      if (lasing || roundTrip > 0.6) {
        const n = lasing ? 14 : 5;
        for (let k = 0; k < n; k++) {
          const s = ((t * 0.5 + k / n) % 1) * 2;
          const x = s < 1 ? xL + 4 + s * (xR - xL - 8) : xR - 4 - (s - 1) * (xR - xL - 8);
          const y = cy + Math.sin(k * 7.3) * 8;
          ctx.fillStyle = `rgba(89,206,199,${lasing ? 0.9 : 0.35})`;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // output beam
      if (lasing) {
        const ow = 4 + 10 * Math.min(1, output * 3);
        const grd = ctx.createLinearGradient(xR, 0, w, 0);
        grd.addColorStop(0, "rgba(89,206,199,0.95)");
        grd.addColorStop(1, "rgba(89,206,199,0.1)");
        ctx.fillStyle = grd;
        ctx.shadowColor = VIZ.tealBright;
        ctx.shadowBlur = 16;
        ctx.fillRect(xR + 3, cy - ow / 2, w - xR - 3, ow);
        ctx.shadowBlur = 0;
        ctx.fillStyle = VIZ.textBright;
        ctx.fillText("output beam", (xR + w) / 2, cy - 18);
      } else {
        ctx.fillStyle = VIZ.textDim;
        ctx.fillText("below threshold — no output", (xR + w) / 2 + 4, cy - 18);
      }
      ctx.textAlign = "left";
      // mini plot of intracavity intensity vs round trips
      const px = 14, py = 14, pw = Math.min(220, w * 0.34), phh = 52;
      ctx.strokeStyle = VIZ.gridStrong;
      ctx.strokeRect(px, py, pw, phh);
      const maxI = Math.max(...series, 1e-3);
      ctx.strokeStyle = lasing ? VIZ.tealBright : VIZ.warn;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      series.forEach((v, i) => {
        const x = px + (i / (series.length - 1)) * pw;
        const y = py + phh - (Math.log10(v / 1e-5) / Math.log10(maxI / 1e-5)) * (phh - 4) - 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = VIZ.textDim;
      ctx.font = "10px var(--font-geist-sans)";
      ctx.fillText("intracavity intensity vs round trip (log)", px + 4, py + phh + 12);
    },
    { animate: true, deps: [R1, R2, G0, loss, selected, lasing] },
  );

  const hit = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0.22) setSelected("hr");
    else if (x < 0.6) setSelected(y < 0.4 ? "pump" : "gain");
    else if (x < 0.78) setSelected("oc");
    else setSelected("out");
  };

  return (
    <LabFrame
      eyebrow="Physics Lab"
      title="Laser cavity and threshold"
      tags={["derived", "conceptual"]}
      description="Oscillation starts when round-trip gain equals round-trip loss: R₁R₂G₀²(1 − loss)² ≥ 1. Above threshold, gain saturation clamps the intracavity intensity. Click a component to read its role from the handbook."
      compact={compact}
      onReset={() => {
        setR1(99.9);
        setR2(85);
        setG0(1.6);
        setLoss(2);
        setPreset("dpss");
      }}
      visual={
        <div className="flex flex-1 flex-col">
          <canvas ref={canvasRef} onClick={hit} className={cn("w-full cursor-pointer", compact ? "h-[260px]" : "min-h-[300px] flex-1")} role="img" aria-label={`Laser cavity ${lasing ? "above" : "below"} threshold; round-trip gain ${roundTrip.toFixed(2)}`} />
          <div className="flex flex-wrap gap-1.5 border-t border-[var(--line)] px-4 py-3" role="group" aria-label="Select cavity component">
            {(Object.keys(PART_BLOCK) as Part[]).map((p) => (
              <button key={p} type="button" onClick={() => setSelected(p)} aria-pressed={selected === p} className={cn("rounded-full border px-2.5 py-0.5 text-[12px]", selected === p ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-400 hover:text-fog-100")}>
                {{ pump: "Pump", hr: "HR mirror", gain: "Gain medium", oc: "Output coupler", out: "Output beam" }[p]}
              </button>
            ))}
          </div>
        </div>
      }
      controls={
        <>
          <ControlGroup title="Coupler examples (§2.4)">
            <PresetChips
              label="Laser presets"
              options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              value={preset}
              onPick={(id) => {
                const p = PRESETS.find((x) => x.id === id)!;
                setPreset(id);
                setR2(p.R2);
                setG0(p.G0);
              }}
            />
            {coupler ? (
              <p className="text-[12px] leading-snug text-fog-400">
                <span className="text-fog-200">{coupler.laser}:</span> OC ≈ {coupler.reflectivity} — {coupler.reason}.
              </p>
            ) : null}
          </ControlGroup>
          <ControlGroup title="Cavity">
            <RangeField label="Single-pass small-signal gain" symbol="G₀" value={G0} min={1} max={60} log onChange={(v) => { setG0(v); setPreset(null); }} format={(v) => formatNumber(v, 3)} hint="Illustrative values; the handbook gives reflectivities, not gains." />
            <RangeField label="HR mirror reflectance" symbol="R₁" value={R1} min={90} max={99.99} step={0.01} onChange={setR1} format={(v) => v.toFixed(2)} unit="%" />
            <RangeField label="Output-coupler reflectance" symbol="R₂" value={R2} min={1} max={99.9} step={0.1} onChange={(v) => { setR2(v); setPreset(null); }} format={(v) => v.toFixed(1)} unit="%" />
            <RangeField label="Internal loss per pass" value={loss} min={0} max={30} step={0.5} onChange={setLoss} format={(v) => v.toFixed(1)} unit="%" />
          </ControlGroup>
        </>
      }
      readouts={
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <ReadoutGrid cols={3}>
              <Readout label="Round-trip net gain" value={formatNumber(roundTrip, 3)} tone={lasing ? "primary" : "warn"} note={lasing ? "≥ 1 → oscillates" : "< 1 → decays"} />
              <Readout label="Threshold single-pass gain" symbol="G_{0,th}" value={formatNumber(G0th, 3)} />
              <Readout label="Relative output (illustrative)" value={lasing ? formatNumber(output, 3) : "0"} unit="× I_sat" tone="muted" />
            </ReadoutGrid>
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/50 px-3 py-2 text-[13.5px]">
              <Tex display math={`R_1R_2\\,G_0^2(1-\\ell)^2 = ${formatNumber(r1, 4)}\\times${formatNumber(r2, 3)}\\times${formatNumber(G0, 3)}^2\\times${formatNumber(1 - l, 3)}^2 = ${formatNumber(roundTrip, 3)}`} />
            </div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/50 px-4 py-3 text-[13px] leading-relaxed" aria-live="polite">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">{block?.block ?? PART_BLOCK[selected]} · from §2.7</div>
            {block ? (
              <dl className="space-y-1.5">
                <div><dt className="inline text-fog-500">Function: </dt><dd className="inline text-fog-100">{block.fn}</dd></div>
                <div><dt className="inline text-fog-500">Industrial examples: </dt><dd className="inline text-fog-200">{block.examples}</dd></div>
                <div><dt className="inline text-fog-500">Key concerns: </dt><dd className="inline text-fog-200">{block.concerns}</dd></div>
              </dl>
            ) : (
              <p className="text-fog-400">Component data comes from the handbook's generic-architecture table. <Link className="text-teal-300 underline" href="/learn/part-2/2-7">Open §2.7</Link></p>
            )}
          </div>
        </div>
      }
      footer="Threshold relation is exact for the stated reflectances and losses (§2.4). The saturating round-trip iteration g = g₀/(1 + I/I_sat) (§2.3) is a simplified single-mode model in units of I_sat; photon animation and output brightness are conceptual."
      sources={[{ section: "2.4", note: "threshold, coupler table" }, { section: "2.3", note: "gain saturation" }, { section: "2.7", note: "architecture table" }]}
    />
  );
}
