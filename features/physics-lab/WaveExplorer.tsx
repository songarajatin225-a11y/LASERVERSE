"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { useCanvas, VIZ } from "@/components/viz/useCanvas";
import { LabFrame, Readout, ReadoutGrid, ControlGroup, PresetChips } from "@/components/viz/LabFrame";
import { RangeField, Switch } from "@/components/ui/controls";
import { Button } from "@/components/ui/primitives";
import { wavelengthColor } from "@/lib/physics/photon";

type Preset = "lin-v" | "lin-45" | "lin-h" | "circ-r" | "circ-l" | "ellip";
const PRESETS: Record<Preset, { label: string; ratio: number; delta: number; angle: number }> = {
  "lin-v": { label: "Linear (vertical)", ratio: 0, delta: 0, angle: 0 },
  "lin-45": { label: "Linear 45°", ratio: 1, delta: 0, angle: 0 },
  "lin-h": { label: "Linear (horizontal)", ratio: 1, delta: 0, angle: 90 },
  "circ-r": { label: "Circular", ratio: 1, delta: 90, angle: 0 },
  "circ-l": { label: "Circular (opposite sense)", ratio: 1, delta: 270, angle: 0 },
  ellip: { label: "Elliptical", ratio: 0.5, delta: 60, angle: 0 },
};

function describe(ratio: number, deltaDeg: number, angle: number): string {
  const d = ((deltaDeg % 360) + 360) % 360;
  if (angle === 90 && ratio > 0) return "Linear, horizontal";
  if (ratio < 0.02) return "Linear, vertical";
  if (d < 1 || Math.abs(d - 180) < 1 || d > 359) return `Linear, tilted ${Math.round((Math.atan(ratio) * 180) / Math.PI) * (Math.abs(d - 180) < 1 ? -1 : 1)}°`;
  if (Math.abs(ratio - 1) < 0.02 && (Math.abs(d - 90) < 1 || Math.abs(d - 270) < 1)) return `Circular (${d < 180 ? "one" : "opposite"} rotation sense)`;
  return "Elliptical";
}

export function WaveExplorer({ compact = false }: { compact?: boolean }) {
  const [preset, setPreset] = useState<Preset | null>("lin-v");
  const [ratio, setRatio] = useState(0);
  const [delta, setDelta] = useState(0);
  const [angle, setAngle] = useState(0);
  const [phase0, setPhase0] = useState(0);
  const [showB, setShowB] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [colorNm, setColorNm] = useState(532);

  const pick = (p: Preset) => {
    setPreset(p);
    setRatio(PRESETS[p].ratio);
    setDelta(PRESETS[p].delta);
    setAngle(PRESETS[p].angle);
  };

  const eColor = wavelengthColor(colorNm * 1e-9).css;
  const kind = describe(ratio, delta, angle);

  const { canvasRef } = useCanvas(
    ({ ctx, w, h, t }) => {
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, h);
      const insetW = Math.min(170, w * 0.28);
      const plotW = w - insetW - 24;
      const ox = 30, oy = h * 0.55;
      const A = Math.min(h * 0.3, 90);
      const depth = { x: 0.42, y: -0.32 };
      const wt = t * speed * 2.2 + (phase0 * Math.PI) / 180;
      const dRad = (delta * Math.PI) / 180;
      const ax = angle === 90 ? 0 : 1; // vertical component amplitude
      const ay = angle === 90 ? 1 : ratio; // horizontal component amplitude
      const k = (2 * Math.PI) / 220;
      const P = (z: number, vx: number, vy: number) => [ox + z + vy * A * depth.x, oy - vx * A + vy * A * depth.y] as const;

      // axes
      ctx.strokeStyle = VIZ.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox - 10, oy);
      ctx.lineTo(ox + plotW, oy);
      ctx.stroke();
      ctx.fillStyle = VIZ.textDim;
      ctx.font = VIZ.font;
      ctx.fillText("propagation z →", ox + plotW - 110, oy + 16);
      ctx.strokeStyle = VIZ.gridStrong;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox, oy - A - 16);
      const [dx, dy] = P(0, 0, 1.25);
      ctx.moveTo(ox, oy);
      ctx.lineTo(dx, dy);
      ctx.stroke();
      ctx.fillText("x", ox - 12, oy - A - 10);
      ctx.fillText("y", dx + 4, dy);

      const field = (z: number) => {
        const ph = k * z - wt;
        return { ex: ax * Math.cos(ph), ey: ay * Math.cos(ph + dRad) };
      };
      // E field: vectors + tip curve
      for (let z = 0; z <= plotW; z += 9) {
        const { ex, ey } = field(z);
        const [x0, y0] = P(z, 0, 0);
        const [x1, y1] = P(z, ex, ey);
        ctx.strokeStyle = eColor;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = eColor;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = eColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let z = 0; z <= plotW; z += 2) {
        const { ex, ey } = field(z);
        const [x1, y1] = P(z, ex, ey);
        if (z === 0) ctx.moveTo(x1, y1);
        else ctx.lineTo(x1, y1);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // B field (perpendicular, drawn at reduced scale)
      if (showB) {
        ctx.strokeStyle = VIZ.info;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        for (let z = 0; z <= plotW; z += 2) {
          const { ex, ey } = field(z);
          const [x1, y1] = P(z, -ey * 0.6, ex * 0.6);
          if (z === 0) ctx.moveTo(x1, y1);
          else ctx.lineTo(x1, y1);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // legend
      ctx.font = VIZ.fontSans;
      ctx.fillStyle = eColor;
      ctx.fillRect(ox, 14, 10, 3);
      ctx.fillStyle = VIZ.text;
      ctx.fillText("E (electric field)", ox + 16, 19);
      if (showB) {
        ctx.fillStyle = VIZ.info;
        ctx.fillRect(ox + 130, 14, 10, 3);
        ctx.fillStyle = VIZ.text;
        ctx.fillText("B ⊥ E (shown at reduced scale)", ox + 146, 19);
      }

      // end-on inset
      const cx = w - insetW / 2 - 8, cy = h / 2, R = Math.min(insetW / 2 - 14, h / 2 - 28);
      ctx.strokeStyle = VIZ.gridStrong;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - R - 8, cy);
      ctx.lineTo(cx + R + 8, cy);
      ctx.moveTo(cx, cy - R - 8);
      ctx.lineTo(cx, cy + R + 8);
      ctx.stroke();
      const norm = Math.max(ax, ay, 1e-6);
      ctx.strokeStyle = eColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      for (let s = 0; s <= 64; s++) {
        const th = (s / 64) * Math.PI * 2;
        const px = cx + ((ay * Math.cos(th + dRad)) / norm) * R;
        const py = cy - ((ax * Math.cos(th)) / norm) * R;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      const { ex, ey } = field(0);
      const tx = cx + (ey / norm) * R, ty = cy - (ex / norm) * R;
      ctx.strokeStyle = eColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = eColor;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = VIZ.textDim;
      ctx.font = VIZ.fontSans;
      ctx.textAlign = "center";
      ctx.fillText("end-on view at z = 0", cx, cy + R + 24);
      ctx.textAlign = "left";
    },
    { animate: playing, deps: [ratio, delta, angle, phase0, showB, playing, speed, eColor] },
  );

  return (
    <LabFrame
      eyebrow="Physics Lab"
      title="Electromagnetic wave and polarisation"
      tags={["conceptual"]}
      description="E and B oscillate perpendicular to each other and to the propagation direction. Polarisation is the direction (and rotation) of E. This is a conceptual picture: the B amplitude is drawn at reduced scale and the wavelength is not to scale."
      compact={compact}
      onReset={() => {
        pick("lin-v");
        setPhase0(0);
        setSpeed(1);
      }}
      visual={<canvas ref={canvasRef} className={compact ? "h-[260px] w-full" : "min-h-[320px] w-full flex-1"} role="img" aria-label={`Electromagnetic wave, ${kind} polarisation`} />}
      controls={
        <>
          <ControlGroup title="Polarisation state">
            <PresetChips label="Polarisation presets" options={(Object.keys(PRESETS) as Preset[]).map((p) => ({ value: p, label: PRESETS[p].label }))} value={preset} onPick={pick} />
            <RangeField label="Horizontal / vertical amplitude ratio" value={ratio} min={0} max={1} step={0.01} onChange={(v) => { setRatio(v); setPreset(null); setAngle(0); }} format={(v) => v.toFixed(2)} />
            <RangeField label="Phase difference between components" symbol="δ" value={delta} min={0} max={360} step={1} onChange={(v) => { setDelta(v); setPreset(null); }} format={(v) => `${Math.round(v)}°`} />
          </ControlGroup>
          <ControlGroup title="Wave">
            <RangeField label="Phase offset" symbol="φ₀" value={phase0} min={0} max={360} step={1} onChange={setPhase0} format={(v) => `${Math.round(v)}°`} hint="Phase is the position within the wave cycle (§1.7)." />
            <RangeField label="Display colour (visible λ)" value={colorNm} min={400} max={700} step={1} onChange={setColorNm} format={(v) => `${Math.round(v)}`} unit="nm" />
            <RangeField label="Animation speed" value={speed} min={0.1} max={3} step={0.1} onChange={setSpeed} format={(v) => `${v.toFixed(1)}×`} />
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
                {playing ? <Pause aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Switch checked={showB} onChange={setShowB} label="Show magnetic field" />
            </div>
          </ControlGroup>
        </>
      }
      readouts={
        <ReadoutGrid cols={3}>
          <Readout label="Polarisation" value={kind} tone="primary" />
          <Readout label="Component phase difference" symbol="δ" value={`${Math.round(delta)}°`} />
          <Readout label="Amplitude ratio" value={angle === 90 ? "horizontal only" : ratio.toFixed(2)} />
        </ReadoutGrid>
      }
      footer={
        <ul className="list-disc space-y-1 pl-4">
          <li>At oblique incidence, p-polarised light (E in the plane of incidence) is absorbed more than s-polarised light by metals (§1.8).</li>
          <li>A linearly polarised CO₂ beam cuts differently in X and Y, so cutting heads use circular polarisation via a λ/4 retarder (§1.8, §10.13).</li>
          <li>Multimode fiber-laser output is randomly polarised (§1.8). Rotation-sense naming conventions differ between optics texts, so only the relative sense is labelled here.</li>
        </ul>
      }
      sources={[{ section: "1.7" }, { section: "1.8" }, { section: "1.10" }]}
    />
  );
}
