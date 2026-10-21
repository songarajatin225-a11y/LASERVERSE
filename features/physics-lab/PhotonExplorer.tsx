"use client";

import { useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useCanvas, VIZ } from "@/components/viz/useCanvas";
import { LabFrame, Readout, ReadoutGrid, ControlGroup, PresetChips } from "@/components/viz/LabFrame";
import { RangeField, Segmented } from "@/components/ui/controls";
import { Button } from "@/components/ui/primitives";
import { Tex } from "@/components/ui/Tex";
import * as ph from "@/lib/physics/photon";
import { C } from "@/lib/physics/core";
import { formatNumber, formatWithUnit } from "@/lib/physics/units";

export interface HandbookLine {
  label: string;
  nm: number;
  note: string;
}

/** Reference energies quoted in handbook §1.6 (≈ values). */
const GAPS: Array<[string, number]> = [
  ["Si", 1.12],
  ["InP", 1.34],
  ["GaAs", 1.42],
  ["4H-SiC", 3.26],
  ["GaN", 3.4],
  ["Diamond", 5.5],
  ["Sapphire", 8.8],
  ["Fused silica", 9],
];
const BONDS: Array<[string, number]> = [
  ["C–C", 3.6],
  ["C–O", 3.7],
  ["C–H", 4.3],
  ["Si–O", 4.7],
  ["O–H", 4.8],
  ["C–F", 5.0],
  ["C=C", 6.4],
];
/** Spectral bands from handbook §1.10 (lower bounds used where rows overlap). */
const BANDS: Array<[string, number, number]> = [
  ["VUV", 100, 200],
  ["UV-C", 200, 280],
  ["UV-B", 280, 315],
  ["UV-A", 315, 400],
  ["Visible", 400, 780],
  ["NIR", 780, 1400],
  ["SWIR", 1400, 3000],
  ["MWIR", 3000, 8000],
  ["LWIR", 8000, 15000],
];
const PRESETS = [193, 248, 266, 355, 532, 1030, 1064, 1550, 10600];
const LMIN = 150, LMAX = 12000;

const logx = (nm: number, w: number, a = 100, b = 20000) => ((Math.log10(nm) - Math.log10(a)) / (Math.log10(b) - Math.log10(a))) * w;

export function PhotonExplorer({ lines = [], compact = false }: { lines?: HandbookLine[]; compact?: boolean }) {
  const [nm, setNm] = useState(1064);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [eUnit, setEUnit] = useState<"eV" | "J">("eV");
  const [pulseMj, setPulseMj] = useState(1);
  const [freqText, setFreqText] = useState("");

  const lambda = nm * 1e-9;
  const ev = ph.photonEnergyEv(lambda);
  const color = ph.wavelengthColor(lambda);
  const region = ph.spectralRegion(lambda);
  const nu = ph.frequencyFromWavelength(lambda);
  const flux = ph.photonFlux(1, lambda);
  const nPhotons = ph.photonsIn(pulseMj * 1e-3, lambda);
  const line = lines.find((l) => Math.abs(l.nm - nm) / l.nm < 0.004);

  // display wavelength scaled logarithmically so 150 nm–12 µm all fit
  const displayPeriod = 18 + ((Math.log10(nm) - Math.log10(LMIN)) / (Math.log10(LMAX) - Math.log10(LMIN))) * 230;

  const { canvasRef } = useCanvas(
    ({ ctx, w, h, t }) => {
      ctx.fillStyle = VIZ.bg;
      ctx.fillRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = VIZ.grid;
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      const mid = h / 2;
      ctx.strokeStyle = VIZ.gridStrong;
      ctx.beginPath();
      ctx.moveTo(0, mid + 0.5);
      ctx.lineTo(w, mid + 0.5);
      ctx.stroke();

      const amp = h * 0.28;
      const k = (2 * Math.PI) / displayPeriod;
      const phase = t * speed * 2.4;
      // continuous wave (faint)
      ctx.strokeStyle = color.css;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = mid - amp * Math.sin(k * x - phase);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // photon wave packets (bright)
      ctx.globalAlpha = 1;
      const packetWidth = Math.max(displayPeriod * 2.2, 90);
      const spacing = Math.max(w / 2.4, packetWidth * 2.2);
      const travel = (t * speed * 110) % spacing;
      ctx.shadowColor = color.css;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.2;
      for (let c = -spacing + travel; c < w + spacing; c += spacing) {
        ctx.beginPath();
        let started = false;
        for (let x = Math.max(0, c - packetWidth * 1.6); x <= Math.min(w, c + packetWidth * 1.6); x += 1.5) {
          const env = Math.exp(-(((x - c) / packetWidth) ** 2) * 2.2);
          const y = mid - amp * env * Math.sin(k * x - phase);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color.css;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // λ marker between two crests
      const x0 = w * 0.08;
      ctx.strokeStyle = VIZ.textDim;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x0, mid - amp - 14);
      ctx.lineTo(x0, mid + amp + 8);
      ctx.moveTo(x0 + displayPeriod, mid - amp - 14);
      ctx.lineTo(x0 + displayPeriod, mid + amp + 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x0, mid - amp - 10);
      ctx.lineTo(x0 + displayPeriod, mid - amp - 10);
      ctx.stroke();
      ctx.fillStyle = VIZ.textBright;
      ctx.font = VIZ.font;
      ctx.fillText(`λ = ${nm >= 1000 ? `${formatNumber(nm / 1000, 4)} µm` : `${formatNumber(nm, 4)} nm`}`, x0 + 4, mid - amp - 16);
      ctx.fillStyle = VIZ.textDim;
      ctx.fillText(color.visible ? "visible colour (approximate)" : "invisible — false colour", 12, h - 12);
      ctx.textAlign = "right";
      ctx.fillText("display λ scaled logarithmically", w - 12, h - 12);
      ctx.textAlign = "left";
    },
    { animate: playing, deps: [nm, speed, playing, color.css] },
  );

  const setFromFreq = (txt: string) => {
    setFreqText(txt);
    const thz = Number(txt);
    if (Number.isFinite(thz) && thz > 0) {
      const l = (C.c / (thz * 1e12)) * 1e9;
      if (l >= LMIN && l <= LMAX) setNm(Number(l.toPrecision(5)));
    }
  };

  const energyStr = eUnit === "eV" ? `${formatNumber(ev, 4)}` : formatNumber(ev * C.e, 4);
  const exceeds = useMemo(() => [...GAPS, ...BONDS].filter(([, e]) => ev > e).map(([n]) => n), [ev]);

  const visual = (
    <div className="flex h-full flex-col">
      <canvas ref={canvasRef} className={compact ? "h-[220px] w-full" : "min-h-[260px] w-full flex-1"} role="img" aria-label={`Animated electromagnetic wave at ${nm} nanometres, ${region}, photon energy ${formatNumber(ev, 3)} electron-volts`} />
      {/* spectrum strip */}
      <div className="border-t border-[var(--line)] px-4 pb-3 pt-3">
        <SpectrumStrip nm={nm} onPick={setNm} />
      </div>
    </div>
  );

  return (
    <LabFrame
      eyebrow="Physics Lab"
      title="Photon explorer"
      tags={["derived", "conceptual"]}
      description="Photon energy, frequency and flux are calculated exactly from E = hν = hc/λ. The animated wave is a conceptual picture: its displayed period is log-scaled and its colour is only an approximation for visible light."
      onReset={() => {
        setNm(1064);
        setSpeed(1);
        setPulseMj(1);
        setFreqText("");
      }}
      compact={compact}
      visual={visual}
      controls={
        <>
          <ControlGroup title="Wavelength">
            <RangeField label="Vacuum wavelength" symbol="λ" value={nm} min={LMIN} max={LMAX} log onChange={(v) => setNm(Number(v.toPrecision(4)))} format={(v) => (v >= 1000 ? formatNumber(v / 1000, 4) : formatNumber(v, 4))} unit={nm >= 1000 ? "µm" : "nm"} />
            <PresetChips label="Reference wavelengths" options={PRESETS.map((p) => ({ value: p, label: p >= 1000 ? `${p / 1000} µm` : `${p} nm` }))} value={PRESETS.includes(nm) ? nm : null} onPick={(v) => setNm(v)} />
            <div className="flex items-center gap-2 text-[12.5px] text-fog-400">
              <label htmlFor="freq-in">or frequency</label>
              <input id="freq-in" inputMode="decimal" value={freqText} placeholder={formatNumber(nu / 1e12, 4)} onChange={(e) => setFromFreq(e.target.value)} className="tabular h-8 w-24 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-ink-850 px-2 font-mono text-[13px] text-paper outline-none focus-visible:border-teal-400" />
              <span>THz</span>
            </div>
          </ControlGroup>
          <ControlGroup title="Display">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented label="Energy unit" options={[{ value: "eV", label: "eV" }, { value: "J", label: "J" }]} value={eUnit} onChange={setEUnit} />
              <Button size="sm" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
                {playing ? <Pause aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
                {playing ? "Pause" : "Play"}
              </Button>
            </div>
            <RangeField label="Animation speed" value={speed} min={0.1} max={3} step={0.1} onChange={setSpeed} format={(v) => `${v.toFixed(1)}×`} />
            <RangeField label="Pulse energy (for photon count)" symbol="E_p" value={pulseMj} min={1e-6} max={1000} log onChange={setPulseMj} format={(v) => formatWithUnit(v * 1e-3, "energy")} />
          </ControlGroup>
        </>
      }
      readouts={
        <div className="flex flex-col gap-4">
          <ReadoutGrid cols={5}>
            <Readout label="Photon energy" symbol="E" value={energyStr} unit={eUnit} tone="primary" />
            <Readout label="Frequency" symbol="ν" value={formatWithUnit(nu, "frequency").split(" ")[0]!} unit={formatWithUnit(nu, "frequency").split(" ").slice(1).join(" ")} />
            <Readout label="Photons per second per watt" value={formatNumber(flux, 3)} unit="s⁻¹W⁻¹" />
            <Readout label={`Photons in a ${formatWithUnit(pulseMj * 1e-3, "energy")} pulse`} value={formatNumber(nPhotons, 3)} note="Total energy = N × photon energy" />
            <Readout label="Spectral region (§1.10)" value={region} tone="muted" />
          </ReadoutGrid>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/50 px-4 py-3 text-[14px]">
              <Tex display math={`E = \\frac{hc}{\\lambda} \\approx \\frac{1239.84\\ \\mathrm{eV\\,nm}}{${formatNumber(nm, 5).replace(/,/g, "")}\\ \\mathrm{nm}} = ${formatNumber(ev, 4)}\\ \\mathrm{eV}`} />
              {line ? (
                <p className="mt-2 text-[12.5px] leading-snug text-fog-300">
                  <span className="font-semibold text-fog-100">{line.label}</span> — {line.note} <span className="text-fog-500">(handbook §1.6)</span>
                </p>
              ) : null}
            </div>
            <EnergyLadder ev={ev} />
          </div>
          <p className="text-[12px] text-fog-500">
            {exceeds.length
              ? `A single photon at this wavelength exceeds: ${exceeds.join(", ")}. Exceeding a band gap allows linear absorption; exceeding a bond energy allows direct single-photon bond breaking (§1.6, §1.11).`
              : "This photon is below every band gap and bond energy listed: linear absorption needs another mechanism (free electrons, molecular vibration) or multiphoton processes (§1.11)."}
          </p>
        </div>
      }
      sources={[{ section: "1.6", note: "energies & reference values" }, { section: "1.10", note: "bands" }, { section: "1.11" }]}
    />
  );
}

function SpectrumStrip({ nm, onPick }: { nm: number; onPick: (nm: number) => void }) {
  const W = 1000;
  return (
    <div>
      <svg viewBox={`0 0 ${W} 54`} className="h-14 w-full cursor-crosshair" role="slider" aria-label="Spectrum: click to choose a wavelength" aria-valuenow={nm} aria-valuemin={100} aria-valuemax={20000}
        onClick={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const f = (e.clientX - r.left) / r.width;
          const v = 10 ** (2 + f * (Math.log10(20000) - 2));
          if (v >= LMIN && v <= LMAX) onPick(Number(v.toPrecision(3)));
        }}
      >
        <defs>
          <linearGradient id="vis" x1="0" x2="1">
            {[400, 450, 490, 520, 560, 590, 630, 700, 780].map((l, i) => (
              <stop key={l} offset={`${(i / 8) * 100}%`} stopColor={ph.wavelengthColor(l * 1e-9).css} />
            ))}
          </linearGradient>
        </defs>
        {BANDS.map(([name, a, b]) => {
          const x = logx(a, W);
          const x2 = logx(b, W);
          return (
            <g key={name}>
              <rect x={x} y={8} width={x2 - x} height={18} fill={name === "Visible" ? "url(#vis)" : "rgba(255,255,255,0.05)"} stroke="rgba(255,255,255,0.08)" opacity={name === "Visible" ? 0.85 : 1} />
              <text x={(x + x2) / 2} y={40} textAnchor="middle" fontSize="11" fill={VIZ.textDim} fontFamily="var(--font-geist-sans)">
                {name}
              </text>
            </g>
          );
        })}
        {PRESETS.map((p) => (
          <line key={p} x1={logx(p, W)} x2={logx(p, W)} y1={6} y2={28} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
        ))}
        <g transform={`translate(${logx(nm, W)},0)`}>
          <line y1={2} y2={32} stroke={VIZ.tealBright} strokeWidth={2} />
          <path d="M -5 0 L 5 0 L 0 6 Z" fill={VIZ.tealBright} />
        </g>
        {[100, 1000, 10000].map((v) => (
          <text key={v} x={logx(v, W) + 2} y={53} fontSize="10" fill={VIZ.textDim} fontFamily="var(--font-geist-mono)">
            {v >= 1000 ? `${v / 1000} µm` : `${v} nm`}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Greedy row assignment so tick labels never overlap. */
function layoutLabels(items: Array<[string, number]>, x: (e: number) => number, rows: number) {
  const ends: number[] = Array(rows).fill(-Infinity);
  return [...items]
    .sort((a, b) => a[1] - b[1])
    .map(([n, e]) => {
      const cx = x(e);
      const half = n.length * 3.1 + 4;
      let row = ends.findIndex((end) => cx - half > end);
      if (row < 0) row = ends.indexOf(Math.min(...ends));
      ends[row] = cx + half;
      return { n, e, cx, row };
    });
}

function EnergyLadder({ ev }: { ev: number }) {
  const lo = 0.5, hi = 12;
  const W = 520, H = 150, mid = 75;
  const x = (e: number) => ((Math.log10(e) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (W - 40) + 20;
  const gaps = layoutLabels(GAPS, x, 3);
  const bonds = layoutLabels(BONDS, x, 3);
  const evc = Math.min(hi, Math.max(lo, ev));
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/50 px-3 py-2">
      <div className="mb-1 flex justify-between text-[11px] text-fog-500">
        <span>Band gaps ▲ · bond energies ▼</span>
        <span>log scale, eV · highlighted = below this photon</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Photon energy ${formatNumber(ev, 3)} eV compared with band-gap and bond energies`}>
        <rect x={20} y={mid - 3} width={Math.max(0, x(evc) - 20)} height={6} rx={3} fill="rgba(25,178,171,0.35)" />
        <line x1={20} x2={W - 20} y1={mid} y2={mid} stroke="rgba(255,255,255,0.2)" />
        {[0.5, 1, 2, 5, 10].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={mid - 3} y2={mid + 3} stroke="rgba(255,255,255,0.35)" />
            <text x={x(v)} y={mid + 14} textAnchor="middle" fontSize="8.5" fill={VIZ.textDim} fontFamily="var(--font-geist-mono)">
              {v}
            </text>
          </g>
        ))}
        {gaps.map((g) => {
          const on = ev > g.e;
          const ly = mid - 18 - g.row * 15;
          return (
            <g key={g.n}>
              <line x1={g.cx} x2={g.cx} y1={mid - 4} y2={ly + 3} stroke={on ? VIZ.tealBright : "rgba(255,255,255,0.22)"} />
              <text x={g.cx} y={ly} textAnchor="middle" fontSize="10" fill={on ? VIZ.textBright : VIZ.textDim} fontFamily="var(--font-geist-sans)">
                {g.n}
              </text>
            </g>
          );
        })}
        {bonds.map((b) => {
          const on = ev > b.e;
          const ly = mid + 30 + b.row * 15;
          return (
            <g key={b.n}>
              <line x1={b.cx} x2={b.cx} y1={mid + 17} y2={ly - 9} stroke={on ? VIZ.warn : "rgba(255,255,255,0.22)"} />
              <text x={b.cx} y={ly} textAnchor="middle" fontSize="10" fill={on ? VIZ.textBright : VIZ.textDim} fontFamily="var(--font-geist-sans)">
                {b.n}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${x(evc)},0)`}>
          <line y1={8} y2={H - 6} stroke={VIZ.tealBright} strokeWidth={2} />
          <text y={H - 1} textAnchor="middle" fontSize="9.5" fill={VIZ.tealBright} fontFamily="var(--font-geist-mono)">{formatNumber(ev, 3)} eV{ev < lo ? " (off scale)" : ""}</text>
        </g>
      </svg>
    </div>
  );
}
