"use client";

import { useMemo, useState } from "react";
import { LabFrame, Readout, ReadoutGrid, ControlGroup, PresetChips } from "@/components/viz/LabFrame";
import { RangeField, Segmented, Switch } from "@/components/ui/controls";
import { Callout } from "@/components/ui/primitives";
import { Tex } from "@/components/ui/Tex";
import * as be from "@/lib/physics/beam";
import { CalcError } from "@/lib/physics/core";
import { formatNumber, formatWithUnit } from "@/lib/physics/units";
import { VIZ } from "@/components/viz/useCanvas";

interface Config {
  mode: "lens" | "fiber";
  nm: number;
  m2: number;
  D: number; // mm
  f: number; // mm
  core: number; // µm
  na: number;
  fc: number; // mm
  ff: number; // mm
  power: number; // W
}

const PRESETS: Array<{ id: string; label: string; c: Partial<Config> }> = [
  { id: "marker7", label: "Fiber marker 7 mm, f 160", c: { mode: "lens", nm: 1064, m2: 1.3, D: 7, f: 160, power: 20 } },
  { id: "marker10", label: "Same, 10 mm expander", c: { mode: "lens", nm: 1064, m2: 1.3, D: 10, f: 160, power: 20 } },
  { id: "co2", label: "CO₂ PCB 10.6 µm", c: { mode: "lens", nm: 10600, m2: 1.2, D: 12, f: 100, power: 20 } },
  { id: "co293", label: "CO₂ PCB 9.3 µm", c: { mode: "lens", nm: 9300, m2: 1.2, D: 12, f: 100, power: 20 } },
  { id: "uf", label: "Ultrafast glass", c: { mode: "lens", nm: 1030, m2: 1.2, D: 6, f: 50, power: 20 } },
  { id: "cut", label: "6 kW cutting head", c: { mode: "fiber", nm: 1070, core: 100, na: 0.07, fc: 100, ff: 200, power: 6000 } },
];

const BASE: Config = { mode: "lens", nm: 1064, m2: 1.3, D: 7, f: 160, core: 100, na: 0.07, fc: 100, ff: 200, power: 20 };

function solve(c: Config) {
  const lambda = c.nm * 1e-9;
  if (c.mode === "lens") {
    const d = be.focusDesign(lambda, c.m2, c.f * 1e-3, c.D * 1e-3, c.power);
    return { w0: d.waistRadius, zR: d.rayleighRange, bpp: d.bpp, theta: d.divergenceHalfAngle, i0: d.peakIntensity ?? 0, iLabel: "Gaussian peak" as const, m2: c.m2, dof5: d.dofPm5, dof10: d.dofPm10 };
  }
  const d0 = be.fiberImageSpot(c.core * 1e-6, c.ff * 1e-3, c.fc * 1e-3);
  const bpp = be.fiberBpp((c.core * 1e-6) / 2, c.na);
  const w0 = d0 / 2;
  const zR = be.rayleighRangeFromBpp(w0, bpp);
  return { w0, zR, bpp, theta: bpp / w0, i0: be.meanIntensity(c.power, w0), iLabel: "Mean (top-hat)" as const, m2: be.m2FromBpp(bpp, lambda), dof5: 2 * be.toleranceHalfRange(zR, 0.05), dof10: 2 * be.toleranceHalfRange(zR, 0.1) };
}

export function BeamCaustic({ compact = false }: { compact?: boolean }) {
  const [a, setA] = useState<Config>(BASE);
  const [b, setB] = useState<Config>({ ...BASE, D: 10 });
  const [compare, setCompare] = useState(false);
  const [edit, setEdit] = useState<"a" | "b">("a");
  const [zProbe, setZProbe] = useState(0); // in units of zR(A)
  const [preset, setPreset] = useState<string | null>("marker7");
  const cfg = edit === "a" ? a : b;
  const setCfg = (patch: Partial<Config>) => {
    setPreset(null);
    (edit === "a" ? setA : setB)((c) => ({ ...c, ...patch }));
  };

  const res = useMemo(() => {
    try {
      return { ok: true as const, A: solve(a), B: compare ? solve(b) : null };
    } catch (e) {
      return { ok: false as const, msg: e instanceof CalcError ? e.message : "Invalid input" };
    }
  }, [a, b, compare]);

  const W = 760, H = compact ? 260 : 300, PL = 60, PR = 16, PT = 18, PB = 34;
  const visual = !res.ok ? (
    <div className="p-6 text-sm text-danger">{res.msg}</div>
  ) : (
    (() => {
      const A = res.A, B = res.B;
      const zmax = 3 * Math.max(A.zR, B?.zR ?? 0);
      const ideal = { w0: A.w0, zR: (Math.PI * A.w0 ** 2) / (a.nm * 1e-9) };
      const wAt = (z: number, w0: number, zR: number) => w0 * Math.sqrt(1 + (z / zR) ** 2);
      const wmax = Math.max(wAt(zmax, A.w0, A.zR), B ? wAt(zmax, B.w0, B.zR) : 0) * 1.08;
      const X = (z: number) => PL + ((z + zmax) / (2 * zmax)) * (W - PL - PR);
      const Y = (w: number) => PT + (H - PT - PB) / 2 - (w / wmax) * ((H - PT - PB) / 2);
      const env = (w0: number, zR: number, sign: 1 | -1) =>
        Array.from({ length: 121 }, (_, i) => {
          const z = -zmax + (i / 120) * 2 * zmax;
          return `${i ? "L" : "M"}${X(z).toFixed(1)},${Y(sign * wAt(z, w0, zR)).toFixed(1)}`;
        }).join(" ");
      const fill = (w0: number, zR: number) => `${env(w0, zR, 1)} ${env(w0, zR, -1).replace(/^M/, "L").split(" ").reverse().join(" ")} Z`;
      const z5 = be.toleranceHalfRange(A.zR, 0.05);
      const zp = zProbe * A.zR;
      const wp = wAt(zp, A.w0, A.zR);
      const zUnit = zmax < 2e-3 ? "µm" : "mm";
      const zDiv = zUnit === "µm" ? 1e-6 : 1e-3;
      const ticks = [-1, -0.5, 0, 0.5, 1].map((k) => k * zmax);
      return (
        <div className="flex h-full flex-col">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Beam caustic: waist radius ${formatWithUnit(A.w0, "length")}, Rayleigh range ${formatWithUnit(A.zR, "length")}`}>
            <defs>
              <linearGradient id="beamA" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#19b2ab" stopOpacity="0.15" />
                <stop offset="0.5" stopColor="#19b2ab" stopOpacity="0.55" />
                <stop offset="1" stopColor="#19b2ab" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            {/* ±5% band */}
            <rect x={X(-z5)} y={PT} width={X(z5) - X(-z5)} height={H - PT - PB} fill="rgba(233,178,76,0.07)" stroke="rgba(233,178,76,0.35)" strokeDasharray="3 3" />
            <text x={X(0)} y={PT + 11} textAnchor="middle" fontSize="10.5" fill={VIZ.warn} fontFamily="var(--font-geist-sans)">±5% spot band = {formatWithUnit(2 * z5, "length", undefined, 3)}</text>
            {/* axes */}
            <line x1={PL} x2={W - PR} y1={Y(0)} y2={Y(0)} stroke="rgba(255,255,255,0.18)" />
            {ticks.map((z) => (
              <g key={z}>
                <line x1={X(z)} x2={X(z)} y1={H - PB} y2={H - PB + 4} stroke="rgba(255,255,255,0.3)" />
                <text x={X(z)} y={H - PB + 16} textAnchor="middle" fontSize="10" fill={VIZ.textDim} fontFamily="var(--font-geist-mono)">{formatNumber(z / zDiv, 3)}</text>
              </g>
            ))}
            <text x={W - PR} y={H - 4} textAnchor="end" fontSize="10" fill={VIZ.textDim} fontFamily="var(--font-geist-sans)">z ({zUnit}) from waist</text>
            {[1, -1].map((s) => (
              <text key={s} x={PL - 6} y={Y((s * wmax) / 1.08) + 4} textAnchor="end" fontSize="10" fill={VIZ.textDim} fontFamily="var(--font-geist-mono)">{formatNumber((s * wmax) / 1.08 / 1e-6, 3)} µm</text>
            ))}
            {/* ideal Gaussian with the same waist */}
            <path d={env(ideal.w0, ideal.zR, 1)} fill="none" stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
            <path d={env(ideal.w0, ideal.zR, -1)} fill="none" stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
            {/* beam A */}
            <path d={fill(A.w0, A.zR)} fill="url(#beamA)" stroke="none" />
            <path d={env(A.w0, A.zR, 1)} fill="none" stroke="#59cec7" strokeWidth={1.8} />
            <path d={env(A.w0, A.zR, -1)} fill="none" stroke="#59cec7" strokeWidth={1.8} />
            {/* beam B */}
            {B ? (
              <>
                <path d={env(B.w0, B.zR, 1)} fill="none" stroke="#ffb547" strokeWidth={1.6} />
                <path d={env(B.w0, B.zR, -1)} fill="none" stroke="#ffb547" strokeWidth={1.6} />
              </>
            ) : null}
            {/* Rayleigh markers */}
            {[-A.zR, A.zR].map((z) => (
              <g key={z}>
                <line x1={X(z)} x2={X(z)} y1={PT + 16} y2={H - PB} stroke="rgba(89,206,199,0.45)" strokeDasharray="2 4" />
                <text x={X(z)} y={H - PB - 6} textAnchor="middle" fontSize="10" fill={VIZ.tealBright} fontFamily="var(--font-geist-sans)">{z < 0 ? "−z_R" : "+z_R"}</text>
              </g>
            ))}
            {/* probe */}
            <line x1={X(zp)} x2={X(zp)} y1={PT} y2={H - PB} stroke="rgba(255,255,255,0.75)" />
            <circle cx={X(zp)} cy={Y(wp)} r={3.5} fill="white" />
            <text x={X(zp) + 6} y={Y(wp) - 6} fontSize="10.5" fill={VIZ.textBright} fontFamily="var(--font-geist-mono)">w = {formatWithUnit(wp, "length", undefined, 3)}</text>
          </svg>
          <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-[var(--line)] px-4 py-2 text-[11.5px] text-fog-500">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#59cec7]" /> Beam A (M² model)</span>
            {B ? <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#ffb547]" /> Beam B</span> : null}
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-white/40" /> Ideal TEM₀₀ with the same waist</span>
            <span>Radius axis in µm; vertical scale exaggerated relative to z.</span>
          </div>
          <ProfileStrip w={wp} w0={A.w0} />
        </div>
      );
    })()
  );

  return (
    <LabFrame
      eyebrow="Beam & Optics Lab"
      title="Gaussian beam focusing and depth of focus"
      tags={["derived"]}
      description="Embedded-Gaussian (M²) model of a focused beam: w(z) = w₀√(1 + (z/z_R)²). Fiber-delivered multimode beams use the core-imaging relation and the conserved BPP. Diameters are 1/e²; θ is a half-angle."
      compact={compact}
      onReset={() => {
        setA(BASE);
        setB({ ...BASE, D: 10 });
        setZProbe(0);
        setPreset("marker7");
      }}
      visual={visual}
      controls={
        <>
          <ControlGroup title="Handbook examples (§4.6)">
            <PresetChips label="Worked examples" options={PRESETS.map((p) => ({ value: p.id, label: p.label }))} value={preset} onPick={(id) => { const p = PRESETS.find((x) => x.id === id)!; setPreset(id); (edit === "a" ? setA : setB)((c) => ({ ...c, ...p.c })); }} />
          </ControlGroup>
          <ControlGroup title="Configuration">
            <div className="flex flex-wrap items-center gap-3">
              <Switch checked={compare} onChange={(v) => { setCompare(v); if (!v) setEdit("a"); }} label="Compare A / B" />
              {compare ? <Segmented label="Edit configuration" options={[{ value: "a", label: "Edit A" }, { value: "b", label: "Edit B" }]} value={edit} onChange={setEdit} /> : null}
            </div>
            <Segmented label="Beam model" options={[{ value: "lens", label: "Collimated beam + lens" }, { value: "fiber", label: "Fiber core imaging" }]} value={cfg.mode} onChange={(m) => setCfg({ mode: m })} />
            <RangeField label="Wavelength" symbol="λ" value={cfg.nm} min={193} max={11000} log onChange={(v) => setCfg({ nm: v })} format={(v) => formatNumber(v, 4)} unit="nm" />
            {cfg.mode === "lens" ? (
              <>
                <RangeField label="Beam quality" symbol="M²" value={cfg.m2} min={1} max={30} log onChange={(v) => setCfg({ m2: v })} format={(v) => formatNumber(v, 3)} />
                <RangeField label="Beam diameter at lens (1/e²)" symbol="D" value={cfg.D} min={1} max={50} log onChange={(v) => setCfg({ D: v })} format={(v) => formatNumber(v, 3)} unit="mm" />
                <RangeField label="Focal length" symbol="f" value={cfg.f} min={10} max={600} log onChange={(v) => setCfg({ f: v })} format={(v) => formatNumber(v, 3)} unit="mm" />
              </>
            ) : (
              <>
                <RangeField label="Fiber core diameter" symbol="d_core" value={cfg.core} min={10} max={1000} log onChange={(v) => setCfg({ core: v })} format={(v) => formatNumber(v, 3)} unit="µm" />
                <RangeField label="Effective beam NA" symbol="NA_eff" value={cfg.na} min={0.02} max={0.22} step={0.005} onChange={(v) => setCfg({ na: v })} format={(v) => v.toFixed(3)} />
                <RangeField label="Collimator focal length" symbol="f_coll" value={cfg.fc} min={30} max={300} log onChange={(v) => setCfg({ fc: v })} format={(v) => formatNumber(v, 3)} unit="mm" />
                <RangeField label="Focusing focal length" symbol="f_focus" value={cfg.ff} min={50} max={600} log onChange={(v) => setCfg({ ff: v })} format={(v) => formatNumber(v, 3)} unit="mm" />
              </>
            )}
            <RangeField label="Power" symbol="P" value={cfg.power} min={0.1} max={20000} log onChange={(v) => setCfg({ power: v })} format={(v) => formatWithUnit(v, "power", undefined, 3)} />
          </ControlGroup>
          <ControlGroup title="Probe">
            <RangeField label="Position along the caustic" value={zProbe} min={-3} max={3} step={0.01} onChange={setZProbe} format={(v) => `${v.toFixed(2)} z_R`} />
          </ControlGroup>
        </>
      }
      readouts={
        res.ok ? (
          <div className="flex flex-col gap-3">
            {[res.A, res.B].map((r, idx) =>
              r ? (
                <div key={idx}>
                  {res.B ? <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: idx ? "#ffb547" : "#59cec7" }}>Beam {idx ? "B" : "A"}</div> : null}
                  <ReadoutGrid cols={6}>
                    <Readout label="Spot diameter" symbol="d₀" value={formatNumber((2 * r.w0) / 1e-6, 4)} unit="µm" tone="primary" />
                    <Readout label="±5% depth of focus" value={formatWithUnit(r.dof5, "length", undefined, 3)} tone="primary" />
                    <Readout label="2z_R" value={formatWithUnit(2 * r.zR, "length", undefined, 3)} />
                    <Readout label="Half-angle" symbol="θ" value={formatNumber(r.theta * 1e3, 3)} unit="mrad" />
                    <Readout label="BPP" value={formatNumber(r.bpp / 1e-6, 3)} unit="mm·mrad" note={`M² ≈ ${formatNumber(r.m2, 3)}`} />
                    <Readout label={`Intensity (${r.iLabel})`} value={formatNumber(r.i0 / 1e4, 3)} unit="W/cm²" />
                  </ReadoutGrid>
                </div>
              ) : null,
            )}
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/50 px-3 py-2 text-[13.5px]">
              {a.mode === "lens" ? <Tex display math={`d_0 = \\frac{4M^2\\lambda f}{\\pi D} = \\frac{4\\times${formatNumber(a.m2, 3)}\\times${formatNumber(a.nm / 1000, 4)}\\,\\mu\\mathrm{m}\\times${formatNumber(a.f, 4)}\\,\\mathrm{mm}}{\\pi\\times${formatNumber(a.D, 3)}\\,\\mathrm{mm}} = ${formatNumber((2 * res.A.w0) / 1e-6, 4)}\\,\\mu\\mathrm{m}`} /> : <Tex display math={`d_0 \\approx d_{core}\\frac{f_{focus}}{f_{coll}} = ${formatNumber(a.core, 3)}\\,\\mu\\mathrm{m}\\times\\frac{${formatNumber(a.ff, 3)}}{${formatNumber(a.fc, 3)}} = ${formatNumber((2 * res.A.w0) / 1e-6, 4)}\\,\\mu\\mathrm{m},\\quad z_R = \\frac{w_0^2}{BPP}`} />}
            </div>
          </div>
        ) : (
          <Callout kind="limitation">{res.msg}</Callout>
        )
      }
      footer="BPP cannot be improved by passive optics; halving the spot quadruples intensity and cuts depth of focus about four-fold (§4.4, §4.5). The ideal-Gaussian overlay shows how M² shortens the Rayleigh range for the same waist. Aberrations, clipping and thermal lensing are not modelled."
      sources={[{ section: "4.3" }, { section: "4.5" }, { section: "4.6", note: "examples" }, { section: "4.4" }]}
    />
  );
}

function ProfileStrip({ w, w0 }: { w: number; w0: number }) {
  const W = 760, H = 80;
  const rmax = Math.max(w, w0) * 2.2;
  const peak = (w0 / w) ** 2;
  const X = (r: number) => W / 2 + (r / rmax) * (W / 2 - 20);
  const pts = Array.from({ length: 161 }, (_, i) => {
    const r = -rmax + (i / 160) * 2 * rmax;
    return `${i ? "L" : "M"}${X(r).toFixed(1)},${(H - 12 - peak * be.gaussianProfile(r, w) * (H - 26)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border-t border-[var(--line)]" role="img" aria-label="Radial intensity profile at the probe position">
      <path d={pts} fill="none" stroke="#59cec7" strokeWidth={1.6} />
      {[w, -w].map((r) => (
        <line key={r} x1={X(r)} x2={X(r)} y1={14} y2={H - 12} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
      ))}
      <line x1={X(-w * 0.589)} x2={X(w * 0.589)} y1={H - 12 - 0.5 * peak * (H - 26)} y2={H - 12 - 0.5 * peak * (H - 26)} stroke="rgba(233,178,76,0.7)" />
      <text x={X(w) + 4} y={22} fontSize="10" fill={VIZ.textDim} fontFamily="var(--font-geist-sans)">1/e² radius (13.5%)</text>
      <text x={X(w * 0.589) + 4} y={H - 12 - 0.5 * peak * (H - 26) + 4} fontSize="10" fill={VIZ.warn} fontFamily="var(--font-geist-sans)">FWHM = 0.589 × 1/e² diameter</text>
      <text x={12} y={16} fontSize="10" fill={VIZ.textDim} fontFamily="var(--font-geist-sans)">radial intensity at probe (relative to focus: {formatNumber(peak * 100, 3)}%)</text>
    </svg>
  );
}
