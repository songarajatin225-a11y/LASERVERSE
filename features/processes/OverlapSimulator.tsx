"use client";

import { useMemo, useState } from "react";
import { useCanvas, VIZ } from "@/components/viz/useCanvas";
import { LabFrame, Readout, ReadoutGrid, ControlGroup } from "@/components/viz/LabFrame";
import { RangeField } from "@/components/ui/controls";
import { Callout } from "@/components/ui/primitives";
import { Tex } from "@/components/ui/Tex";
import * as ia from "@/lib/physics/interaction";
import { pulseEnergy } from "@/lib/physics/pulse";
import { CalcError } from "@/lib/physics/core";
import { formatNumber, formatWithUnit } from "@/lib/physics/units";

/**
 * Pulse and hatch overlap on the workpiece (marking, cleaning). Geometry is calculated;
 * the spot footprints are drawn to scale; the animation is conceptual.
 */
export function OverlapSimulator({ context = "marking", compact = false }: { context?: "marking" | "cleaning"; compact?: boolean }) {
  const defaults = context === "cleaning" ? { P: 200, fk: 50, v: 2000, d: 100, h: 80 } : { P: 20, fk: 100, v: 1000, d: 40, h: 30 };
  const [P, setP] = useState(defaults.P);
  const [fk, setFk] = useState(defaults.fk);
  const [v, setV] = useState(defaults.v);
  const [d, setD] = useState(defaults.d);
  const [h, setH] = useState(defaults.h);
  const reset = () => {
    setP(defaults.P);
    setFk(defaults.fk);
    setV(defaults.v);
    setD(defaults.d);
    setH(defaults.h);
  };

  const calc = useMemo(() => {
    try {
      const f = fk * 1e3;
      const vs = v * 1e-3;
      const ds = d * 1e-6;
      const Ep = pulseEnergy(P, f);
      return {
        ok: true as const,
        Ep,
        F0: ia.peakFluence(Ep, ds / 2),
        spacing: ia.pulseSpacing(vs, f),
        overlap: ia.pulseOverlap(vs, f, ds),
        hatchOverlap: ia.hatchOverlap(h * 1e-6, ds),
        perSpot: ia.pulsesPerSpot(vs, f, ds),
      };
    } catch (e) {
      return { ok: false as const, msg: e instanceof CalcError ? e.message : "Invalid inputs" };
    }
  }, [P, fk, v, d, h]);

  const { canvasRef } = useCanvas(
    ({ ctx, w, h: H, t }) => {
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, H);
      if (!calc.ok) {
        ctx.fillStyle = VIZ.danger;
        ctx.font = VIZ.fontSans;
        ctx.fillText(calc.msg, 16, 28);
        return;
      }
      const pxPerUm = Math.min(1.6, Math.max(0.25, 46 / d));
      const r = (d / 2) * pxPerUm;
      const sp = calc.spacing * 1e6 * pxPerUm;
      const hp = h * pxPerUm;
      const x0 = 30;
      const rows = Math.max(2, Math.min(6, Math.floor((H - 70) / Math.max(hp, 4))));
      const y0 = 40 + r;
      const perRow = Math.max(1, Math.floor((w - 2 * x0) / Math.max(sp, 0.5)));
      const total = rows * Math.min(perRow, 400);
      const progress = t > 0 ? ((t * 0.35) % 1.15) / 1.0 : 1;
      const shown = Math.floor(Math.min(1, progress) * total);
      ctx.globalCompositeOperation = "lighter";
      let k = 0;
      for (let row = 0; row < rows; row++) {
        const y = y0 + row * hp;
        if (y + r > H - 30) break;
        const n = Math.min(perRow, 400);
        for (let i = 0; i < n; i++) {
          if (k++ > shown) break;
          const x = row % 2 === 0 ? x0 + i * sp : x0 + (n - 1 - i) * sp;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = context === "cleaning" ? "rgba(255,181,71,0.16)" : "rgba(25,178,171,0.18)";
          ctx.fill();
          ctx.strokeStyle = context === "cleaning" ? "rgba(255,181,71,0.35)" : "rgba(89,206,199,0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
      // scale bar
      const bar = 100 * pxPerUm;
      ctx.strokeStyle = VIZ.textBright;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, H - 18);
      ctx.lineTo(x0 + bar, H - 18);
      ctx.stroke();
      ctx.fillStyle = VIZ.text;
      ctx.font = VIZ.font;
      ctx.fillText("100 µm", x0 + bar + 8, H - 14);
      ctx.fillStyle = VIZ.textDim;
      ctx.fillText(`spots to scale · ${rows} hatch lines · scan direction alternates`, x0 + bar + 70, H - 14);
    },
    { animate: true, deps: [calc, d, h, context] },
  );

  const gap = calc.ok && calc.overlap < 0;
  return (
    <LabFrame
      compact={compact}
      title={context === "cleaning" ? "Spot and track overlap for cleaning" : "Pulse and hatch overlap"}
      eyebrow={context === "cleaning" ? "Cleaning · §10.9" : "Marking · §10.2"}
      tags={["derived", "conceptual"]}
      description={
        context === "cleaning"
          ? "Overlap, scan speed and passes set coverage and throughput; fluence must sit between the contaminant and substrate thresholds (§10.9). Inputs are example values."
          : "Overlap between successive pulses and between hatch lines governs mark uniformity and heat input (§10.2, §23.6). Inputs are example values within the speed and spot ranges given in §7.2 and §26.1."
      }
      onReset={reset}
      visualClassName="min-h-[300px]"
      visual={<canvas ref={canvasRef} className="h-full min-h-[300px] w-full flex-1" role="img" aria-label="Spot footprints along hatch lines, drawn to scale" />}
      controls={
        <>
          <ControlGroup title="Source">
            <RangeField label="Average power" symbol="P" value={P} min={1} max={2000} log onChange={setP} format={(x) => formatWithUnit(x, "power", undefined, 3)} />
            <RangeField label="Repetition rate" symbol="f" value={fk} min={1} max={4000} log onChange={setFk} format={(x) => `${formatNumber(x, 3)} kHz`} />
          </ControlGroup>
          <ControlGroup title="Scan">
            <RangeField label="Scan speed" symbol="v" value={v} min={10} max={20000} log onChange={setV} format={(x) => `${formatNumber(x, 3)} mm/s`} />
            <RangeField label="Spot diameter" symbol="d" value={d} min={10} max={500} log onChange={setD} format={(x) => `${formatNumber(x, 3)} µm`} />
            <RangeField label="Hatch spacing" symbol="h" value={h} min={5} max={500} log onChange={setH} format={(x) => `${formatNumber(x, 3)} µm`} />
          </ControlGroup>
          <div className="text-[13px] text-fog-300">
            <Tex math="O = 1 - \frac{v}{f\,d},\qquad F_0 = \frac{2E_p}{\pi w_0^2}" display />
          </div>
        </>
      }
      readouts={
        calc.ok ? (
          <div className="flex flex-col gap-3">
            <ReadoutGrid cols={6}>
              <Readout label="Pulse energy" symbol="E_p" value={formatWithUnit(calc.Ep, "energy", undefined, 3)} />
              <Readout label="Peak fluence" symbol="F₀" value={`${formatNumber(calc.F0 / 1e4, 3)} J/cm²`} tone="primary" />
              <Readout label="Pulse spacing" value={formatWithUnit(calc.spacing, "length", undefined, 3)} />
              <Readout label="Pulse overlap" value={`${formatNumber(calc.overlap * 100, 3)} %`} tone={gap ? "warn" : "primary"} />
              <Readout label="Hatch overlap" value={`${formatNumber(calc.hatchOverlap * 100, 3)} %`} tone={calc.hatchOverlap < 0 ? "warn" : "default"} />
              <Readout label="Pulses per spot" value={formatNumber(calc.perSpot, 3)} />
            </ReadoutGrid>
            {gap ? (
              <Callout kind="limitation" title="Gaps between pulses">
                Spacing exceeds the spot diameter, so successive pulses do not touch. Lower the speed, raise the repetition rate or enlarge the spot.
              </Callout>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px] text-danger">{calc.msg}</p>
        )
      }
      sources={[{ section: "10.2" }, { section: "10.9" }, { section: "B.3", note: "fluence and overlap" }, { section: "23.6", note: "parameter development" }]}
      footer="Peak fluence uses the Gaussian on-axis definition 2E_p/(πw₀²). The spot is the 1/e² diameter. Whether a fluence marks, cleans or damages depends on material thresholds the handbook does not tabulate — establish them by DOE (§23.6)."
    />
  );
}
