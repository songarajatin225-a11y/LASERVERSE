"use client";

import { useMemo, useState } from "react";
import { useCanvas, VIZ } from "@/components/viz/useCanvas";
import { LabFrame, Readout, ReadoutGrid, ControlGroup, PresetChips } from "@/components/viz/LabFrame";
import { RangeField, Segmented, Switch } from "@/components/ui/controls";
import { Callout } from "@/components/ui/primitives";
import { Tex } from "@/components/ui/Tex";
import * as pu from "@/lib/physics/pulse";
import * as la from "@/lib/physics/laser";
import * as ph from "@/lib/physics/photon";
import * as ia from "@/lib/physics/interaction";
import { CalcError } from "@/lib/physics/core";
import { formatNumber, formatWithUnit } from "@/lib/physics/units";

/** Handbook §2.9 worked examples (plus a CW reference). */
const PRESETS = [
  { id: "mopa-long", label: "20 W MOPA, 100 ns", pAvg: 20, f: 100e3, tau: 100e-9, shape: "square" as const, nm: 1064, spot: 30 },
  { id: "mopa-short", label: "20 W MOPA, 4 ns", pAvg: 20, f: 600e3, tau: 4e-9, shape: "square" as const, nm: 1064, spot: 30 },
  { id: "ps", label: "50 W ps", pAvg: 50, f: 1e6, tau: 10e-12, shape: "gaussian" as const, nm: 1030, spot: 50 },
  { id: "fs", label: "20 W fs", pAvg: 20, f: 200e3, tau: 300e-15, shape: "gaussian" as const, nm: 1030, spot: 40 },
  { id: "qcw", label: "150 W QCW", pAvg: 150, f: 20, tau: 5e-3, shape: "square" as const, nm: 1070, spot: 400 },
];
const UPPER = [
  { id: "yvo4", label: "Nd:YVO₄ ~100 µs", tau: 100e-6 },
  { id: "yag", label: "Nd:YAG ~230 µs", tau: 230e-6 },
  { id: "yb", label: "Yb ~1 ms", tau: 1e-3 },
];

export function PulseExplorer({ compact = false }: { compact?: boolean }) {
  const [preset, setPreset] = useState<string | null>("mopa-long");
  const [pAvg, setPAvg] = useState(20);
  const [f, setF] = useState(100e3);
  const [tau, setTau] = useState(100e-9);
  const [shape, setShape] = useState<pu.PulseShape>("square");
  const [nm, setNm] = useState(1064);
  const [spotUm, setSpotUm] = useState(30);
  const [qs, setQs] = useState(false);
  const [upper, setUpper] = useState("yvo4");

  const load = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPreset(id);
    setPAvg(p.pAvg);
    setF(p.f);
    setTau(p.tau);
    setShape(p.shape);
    setNm(p.nm);
    setSpotUm(p.spot);
  };

  const calc = useMemo(() => {
    try {
      const s = pu.pulseSummary(pAvg, f, tau, shape);
      const F0 = ia.peakFluence(s.pulseEnergy, (spotUm * 1e-6) / 2);
      return { ok: true as const, s, F0, I0: ia.pulsePeakIntensity(F0, tau), photons: ph.photonsIn(s.pulseEnergy, nm * 1e-9), regime: ia.pulseRegime(tau) };
    } catch (e) {
      return { ok: false as const, msg: e instanceof CalcError ? e.message : "Invalid inputs" };
    }
  }, [pAvg, f, tau, shape, nm, spotUm]);

  const tauUpper = UPPER.find((u) => u.id === upper)!.tau;
  const qsFrac = la.qSwitchPulseEnergy(1, f, tauUpper);

  const { canvasRef } = useCanvas(
    ({ ctx, w, h }) => {
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, h);
      if (!calc.ok) {
        ctx.fillStyle = VIZ.danger;
        ctx.font = VIZ.fontSans;
        ctx.fillText(calc.msg, 16, 28);
        return;
      }
      const { s } = calc;
      const splitX = qs ? w * 0.62 : w;
      // ---------- train (log power)
      const top = 22, trainH = h * 0.5;
      const x0 = 52, x1 = splitX - 16;
      const lo = Math.floor(Math.log10(Math.max(1e-3, pAvg / 10)));
      const hi = Math.ceil(Math.log10(s.peakPower * 1.5));
      const yOf = (p: number) => top + trainH - ((Math.log10(p) - lo) / (hi - lo)) * trainH;
      ctx.font = VIZ.font;
      ctx.fillStyle = VIZ.textDim;
      for (let d = lo; d <= hi; d++) {
        const y = yOf(10 ** d);
        ctx.strokeStyle = VIZ.grid;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        if ((hi - lo) <= 8 || d % 2 === 0) ctx.fillText(formatWithUnit(10 ** d, "power", undefined, 2), 4, y + 4);
      }
      const periods = 3.5;
      const T = 1 / f;
      const pxPerS = (x1 - x0) / (periods * T);
      const widthPx = tau * pxPerS;
      const clamped = widthPx < 2;
      ctx.fillStyle = "rgba(89,206,199,0.85)";
      ctx.shadowColor = VIZ.tealBright;
      ctx.shadowBlur = 10;
      for (let k = 0; k < periods; k++) {
        const xc = x0 + (k + 0.25) * T * pxPerS;
        const wpx = Math.max(2, widthPx);
        ctx.fillRect(xc - wpx / 2, yOf(s.peakPower), wpx, top + trainH - yOf(s.peakPower));
      }
      ctx.shadowBlur = 0;
      // average power line
      ctx.strokeStyle = VIZ.warn;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, yOf(pAvg));
      ctx.lineTo(x1, yOf(pAvg));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = VIZ.warn;
      ctx.font = VIZ.fontSans;
      ctx.fillText(`average ${formatWithUnit(pAvg, "power")}`, x1 - 120, yOf(pAvg) - 6);
      ctx.fillStyle = VIZ.tealBright;
      ctx.fillText(`peak ≈ ${formatWithUnit(s.peakPower, "power", undefined, 3)}`, x0 + 6, yOf(s.peakPower) + 14);
      ctx.fillStyle = VIZ.textDim;
      ctx.fillText(`pulse train · period ${formatWithUnit(T, "time", undefined, 3)} · log power axis${clamped ? " · pulse width drawn exaggerated" : ""}`, x0, top + trainH + 18);

      // ---------- single pulse (linear)
      const py0 = top + trainH + 40, ph_ = h - py0 - 26;
      const cx = (x0 + x1) / 2, span = (x1 - x0) * 0.42;
      const tShape = (u: number) => {
        // u in units of FWHM
        if (shape === "square") return Math.abs(u) <= 0.5 ? 1 : 0;
        if (shape === "gaussian") return Math.exp(-4 * Math.LN2 * u * u);
        const a = 2 * Math.acosh(Math.SQRT2);
        return 1 / Math.cosh(a * u) ** 2;
      };
      ctx.strokeStyle = VIZ.gridStrong;
      ctx.beginPath();
      ctx.moveTo(cx - span, py0 + ph_);
      ctx.lineTo(cx + span, py0 + ph_);
      ctx.stroke();
      ctx.strokeStyle = VIZ.tealBright;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 200; k++) {
        const u = -2 + (k / 200) * 4;
        const x = cx + (u / 2) * span;
        const y = py0 + ph_ - tShape(u) * ph_;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = VIZ.textDim;
      const xa = cx - 0.25 * span, xb = cx + 0.25 * span;
      ctx.beginPath();
      ctx.moveTo(xa, py0 + ph_ / 2);
      ctx.lineTo(xb, py0 + ph_ / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = VIZ.text;
      ctx.textAlign = "center";
      ctx.fillText(`FWHM τ = ${formatWithUnit(tau, "time", undefined, 3)}`, cx, py0 + ph_ / 2 - 6);
      ctx.fillText(`one pulse, linear scale — ${shape === "square" ? "rectangular" : shape === "gaussian" ? "Gaussian" : "sech²"} shape`, cx, h - 8);
      ctx.textAlign = "left";

      // ---------- Q-switch roll-off
      if (qs) {
        const qx0 = splitX + 30, qx1 = w - 14, qy0 = 30, qy1 = h - 40;
        const fLo = 100, fHi = 1e7;
        const fx = (fr: number) => qx0 + ((Math.log10(fr) - Math.log10(fLo)) / (Math.log10(fHi) - Math.log10(fLo))) * (qx1 - qx0);
        ctx.strokeStyle = VIZ.gridStrong;
        ctx.strokeRect(qx0, qy0, qx1 - qx0, qy1 - qy0);
        ctx.strokeStyle = VIZ.concept;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k <= 120; k++) {
          const fr = 10 ** (Math.log10(fLo) + (k / 120) * (Math.log10(fHi) - Math.log10(fLo)));
          const v = la.qSwitchPulseEnergy(1, fr, tauUpper);
          const x = fx(fr), y = qy1 - v * (qy1 - qy0);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        const cf = Math.min(fHi, Math.max(fLo, f));
        ctx.fillStyle = VIZ.textBright;
        ctx.beginPath();
        ctx.arc(fx(cf), qy1 - qsFrac * (qy1 - qy0), 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = VIZ.textDim;
        ctx.font = "10px var(--font-geist-sans)";
        ctx.fillText("E_p / E_p,0", qx0 + 4, qy0 + 12);
        ctx.fillText("rep rate (log) →", qx1 - 80, qy1 + 14);
        ctx.fillText("Q-switch roll-off (§2.8)", qx0, h - 10);
      }
    },
    { deps: [pAvg, f, tau, shape, qs, upper, calc.ok] },
  );

  return (
    <LabFrame
      eyebrow="Physics Lab"
      title="Pulse explorer"
      tags={["derived"]}
      description="Pulse energy, peak power and duty cycle stay mutually consistent: E_p = P_avg/f, P_peak ≈ k·E_p/τ, D = τf. Presets are the handbook's §2.9 worked examples."
      compact={compact}
      onReset={() => load("mopa-long")}
      visual={<canvas ref={canvasRef} className={compact ? "h-[300px] w-full" : "min-h-[340px] w-full flex-1"} role="img" aria-label="Pulse train with average and peak power, and the shape of a single pulse" />}
      controls={
        <>
          <ControlGroup title="Handbook examples">
            <PresetChips label="Worked examples" options={PRESETS.map((p) => ({ value: p.id, label: p.label }))} value={preset} onPick={load} />
          </ControlGroup>
          <ControlGroup title="Pulse format">
            <RangeField label="Average power" symbol="P_avg" value={pAvg} min={0.1} max={10000} log onChange={(v) => { setPAvg(v); setPreset(null); }} format={(v) => formatWithUnit(v, "power", undefined, 3)} />
            <RangeField label="Repetition rate" symbol="f" value={f} min={1} max={1e8} log onChange={(v) => { setF(v); setPreset(null); }} format={(v) => formatWithUnit(v, "frequency", undefined, 3)} />
            <RangeField label="Pulse duration (FWHM)" symbol="τ" value={tau} min={1e-14} max={0.1} log onChange={(v) => { setTau(v); setPreset(null); }} format={(v) => formatWithUnit(v, "time", undefined, 3)} />
            <Segmented label="Pulse shape" options={[{ value: "square", label: "Rectangular" }, { value: "gaussian", label: "Gaussian" }, { value: "sech2", label: "sech²" }]} value={shape} onChange={(v) => { setShape(v); setPreset(null); }} />
          </ControlGroup>
          <ControlGroup title="On the workpiece">
            <RangeField label="Wavelength" symbol="λ" value={nm} min={250} max={11000} log onChange={setNm} format={(v) => formatNumber(v, 4)} unit="nm" />
            <RangeField label="Spot diameter (1/e²)" symbol="2w₀" value={spotUm} min={5} max={2000} log onChange={setSpotUm} format={(v) => formatNumber(v, 3)} unit="µm" />
            <Switch checked={qs} onChange={setQs} label="Show Q-switched energy roll-off" description="Pulse energy vs repetition rate for a stored-energy laser" />
            {qs ? <PresetChips label="Upper-state lifetime" options={UPPER.map((u) => ({ value: u.id, label: u.label }))} value={upper} onPick={setUpper} /> : null}
          </ControlGroup>
        </>
      }
      readouts={
        calc.ok ? (
          <div className="flex flex-col gap-3">
            <ReadoutGrid cols={4}>
              <Readout label="Pulse energy" symbol="E_p" value={formatWithUnit(calc.s.pulseEnergy, "energy", undefined, 3).split(" ")[0]!} unit={formatWithUnit(calc.s.pulseEnergy, "energy", undefined, 3).split(" ")[1]} tone="primary" />
              <Readout label={`Peak power (k = ${pu.SHAPE_FACTOR[shape]})`} symbol="P_peak" value={formatWithUnit(calc.s.peakPower, "power", undefined, 3).split(" ")[0]!} unit={formatWithUnit(calc.s.peakPower, "power", undefined, 3).split(" ")[1]} tone="primary" />
              <Readout label="Duty cycle" symbol="D = τf" value={formatNumber(calc.s.dutyCycle * 100, 3)} unit="%" />
              <Readout label="Peak / average" value={formatNumber(calc.s.peakToAverage, 3)} unit="×" />
              <Readout label="Peak fluence (Gaussian)" symbol="F₀" value={formatNumber(calc.F0 / 1e4, 3)} unit="J/cm²" />
              <Readout label="Peak intensity" symbol="F₀/τ" value={formatNumber(calc.I0 / 1e4, 3)} unit="W/cm²" />
              <Readout label="Photons per pulse" value={formatNumber(calc.photons, 3)} />
              <Readout label="Regime (§27.1)" value={calc.regime} tone="muted" />
            </ReadoutGrid>
            {qs ? (
              <p className="text-[12.5px] text-fog-400">
                With an upper-state lifetime of {formatWithUnit(tauUpper, "time")}, a stored-energy Q-switched laser keeps ≈ {formatNumber(qsFrac * 100, 3)}% of its low-rate pulse energy at {formatWithUnit(f, "frequency")} — <Tex math="E_p(f) \approx E_{p,0}(1 - e^{-1/(f\tau)})" />. Fiber MOPA sources decouple pulse energy from repetition rate (§2.8).
              </p>
            ) : null}
          </div>
        ) : (
          <Callout kind="limitation" title="Inputs not physical">
            {calc.msg}
          </Callout>
        )
      }
      footer="Rectangular approximation unless another shape is chosen; τ is the FWHM. Fluence and intensity assume a Gaussian spatial profile at focus. Real MOPA and Q-switched pulses have tailored or asymmetric shapes — measure them (§24.4)."
      sources={[{ section: "2.9", note: "definitions and worked examples" }, { section: "2.8", note: "operating modes, Q-switch roll-off" }, { section: "27.1", note: "pulse-duration regimes" }]}
    />
  );
}
