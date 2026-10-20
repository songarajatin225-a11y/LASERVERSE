"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Tabs, RangeField, SelectField, Switch } from "@/components/ui/controls";
import { Badge, Callout, ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { LabFrame, Readout, ReadoutGrid, ControlGroup } from "@/components/viz/LabFrame";
import { Tex } from "@/components/ui/Tex";
import { wavelengthColor, spectralRegion } from "@/lib/physics/photon";
import * as ia from "@/lib/physics/interaction";
import { meanIntensity } from "@/lib/physics/beam";
import { formatWithUnit, formatNumber } from "@/lib/physics/units";
import { absorptionStatus, STATUS_LABEL, STATUS_TONE, type NonMetalRow } from "./absorption";

/* ------------------------------------------------------------------ data types (from lib/content/materials) */
export interface MaterialsData {
  nonMetals: NonMetalRow[];
  metals: Array<Record<string, string>>;
  cold: { copper: Array<{ source: string; nm: number; text: string }>; aluminium: Array<{ source: string; nm: number; text: string }> };
  lines: Array<Record<string, string> & { nm: number | null; range: [number, number] | null }>;
  diffusivity: Array<{ material: string; kappaMm2s: number; table: Array<{ tau: number; text: string }> }>;
  meltBoil: Array<{ material: string; meltText: string; boilText: string; note: string; melt: { lo: number; hi: number } | null; boil: { lo: number; hi: number } | null }>;
  ablation: Array<Record<string, string>>;
  regimes: Array<Record<string, string>>;
  weldModes: Array<Record<string, string>>;
  quotes: Record<string, string>;
}

const TABS = [
  { id: "absorption", label: "Wavelength & absorption" },
  { id: "thermal", label: "Heat & interaction time" },
  { id: "ablation", label: "Ablation" },
  { id: "regimes", label: "Process regimes" },
];

export function MaterialsLab({ data }: { data: MaterialsData }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("tab");
  const [tab, setTab] = useState(TABS.some((t) => t.id === initial) ? initial! : "absorption");
  useEffect(() => {
    const p = params.get("tab");
    if (p && TABS.some((t) => t.id === p)) setTab(p);
  }, [params]);
  const change = (id: string) => {
    setTab(id);
    router.replace(`/materials?tab=${id}`, { scroll: false });
  };
  const nmParam = Number(params.get("nm"));
  return (
    <div className="flex flex-col gap-5">
      <Tabs label="Material interaction tools" tabs={TABS} value={tab} onChange={change} className="self-start" />
      <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {tab === "absorption" ? <AbsorptionTab data={data} initialNm={Number.isFinite(nmParam) && nmParam >= 150 && nmParam <= 11000 ? nmParam : 1064} /> : null}
        {tab === "thermal" ? <ThermalTab data={data} /> : null}
        {tab === "ablation" ? <AblationTab data={data} /> : null}
        {tab === "regimes" ? <RegimeTab data={data} /> : null}
      </div>
    </div>
  );
}

/* ================================================================== absorption */
const NM_MIN = 150;
const NM_MAX = 12000;
const SX0 = 230;
const SX1 = 985;
const xNm = (nm: number) => SX0 + ((Math.log10(nm) - Math.log10(NM_MIN)) / (Math.log10(NM_MAX) - Math.log10(NM_MIN))) * (SX1 - SX0);
const REGIONS: Array<[string, number, number]> = [
  ["UV", NM_MIN, 380],
  ["VIS", 380, 780],
  ["NIR", 780, 1400],
  ["SWIR", 1400, 3000],
  ["MWIR", 3000, 8000],
  ["LWIR", 8000, NM_MAX],
];
const fmtNm = (nm: number) => (nm >= 1000 ? `${formatNumber(nm / 1000, 3)} µm` : `${Math.round(nm)} nm`);

export function AbsorptionTab({ data, initialNm }: { data: MaterialsData; initialNm: number }) {
  const [nm, setNm] = useState(initialNm);
  const nearest = useMemo(() => {
    let best = data.lines[0]!;
    for (const l of data.lines) if (Math.abs(Math.log(l.nm! / nm)) < Math.abs(Math.log(best.nm! / nm))) best = l;
    return best;
  }, [nm, data.lines]);
  const col = wavelengthColor(nm * 1e-9);
  const rowH = 26;
  const top = 34;
  const H = top + data.nonMetals.length * rowH + 12;
  const rows = data.nonMetals.map((m) => ({ m, s: absorptionStatus(m, nm) }));

  return (
    <div className="flex flex-col gap-5">
      <LabFrame
        title="Which materials absorb this wavelength?"
        eyebrow="Non-metals and engineered materials · §9.3"
        tags={["handbook", "derived"]}
        description={
          <>
            The handbook states, for each material, where it “absorbs well” and where it is “largely transparent”. Those statements are encoded below as wavelength bands
            (derived) — always read the handbook wording next to each result. No absorption coefficients are invented: the handbook gives none for these materials.
          </>
        }
        onReset={() => setNm(1064)}
        visual={
          <div className="scrollbar-thin overflow-x-auto p-3">
            <svg viewBox={`0 0 1000 ${H}`} className="min-w-[680px]" role="img" aria-label={`Absorption bands from handbook §9.3 with a cursor at ${fmtNm(nm)}`}>
              <defs>
                <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#59cec7" strokeWidth="2" strokeOpacity="0.7" />
                </pattern>
              </defs>
              {REGIONS.map(([r, a, b], i) => (
                <g key={r}>
                  <rect x={xNm(a)} y={top - 6} width={xNm(b) - xNm(a)} height={H - top} fill={i % 2 ? "rgba(255,255,255,0.025)" : "transparent"} />
                  <text x={(xNm(a) + xNm(b)) / 2} y={16} textAnchor="middle" className="fill-fog-500 text-[11px] font-semibold tracking-[0.12em]">
                    {r}
                  </text>
                </g>
              ))}
              {[200, 355, 532, 1064, 2000, 5000, 10600].map((v) => (
                <text key={v} x={xNm(v)} y={H - 1} textAnchor="middle" className="fill-fog-600 font-mono text-[9.5px]">
                  {fmtNm(v)}
                </text>
              ))}
              {rows.map(({ m, s }, i) => {
                const y = top + i * rowH;
                return (
                  <g key={m.material}>
                    <text x={SX0 - 10} y={y + 15} textAnchor="end" className={cn("text-[11.5px]", s.status === "strong" || s.status === "absorbs" ? "fill-teal-100" : "fill-fog-300")}>
                      {m.material.length > 34 ? `${m.material.slice(0, 32)}…` : m.material}
                    </text>
                    <rect x={SX0} y={y + 4} width={SX1 - SX0} height={rowH - 8} rx={3} fill="rgba(255,255,255,0.02)" />
                    {m.transparent.map((b) => (
                      <rect key={`t-${b.label}`} x={xNm(Math.max(NM_MIN, b.from))} y={y + 6} width={Math.max(2, xNm(Math.min(NM_MAX, b.to)) - xNm(Math.max(NM_MIN, b.from)))} height={rowH - 12} rx={2} fill="none" stroke="#8b96a4" strokeDasharray="3 2" strokeOpacity={b.strength === "partial" ? 0.5 : 0.85}>
                        <title>{`Largely transparent: ${b.label}`}</title>
                      </rect>
                    ))}
                    {m.absorbs.map((b) => (
                      <rect
                        key={`a-${b.label}`}
                        x={xNm(Math.max(NM_MIN, b.from))}
                        y={y + 6}
                        width={Math.max(3, xNm(Math.min(NM_MAX, b.to)) - xNm(Math.max(NM_MIN, b.from)))}
                        height={rowH - 12}
                        rx={2}
                        fill={b.strength === "partial" ? "url(#hatch)" : "#19b2ab"}
                        fillOpacity={b.strength === "strong" ? 1 : b.strength === "stated" ? 0.6 : 1}
                      >
                        <title>{`Absorbs: ${b.label}`}</title>
                      </rect>
                    ))}
                    {m.unencoded && !m.absorbs.length ? (
                      <text x={SX0 + 8} y={y + 16} className="fill-warn text-[10.5px]">
                        qualitative wording — see text
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <line x1={xNm(nm)} x2={xNm(nm)} y1={top - 8} y2={H - 12} stroke={col.css} strokeWidth={2} />
              <text x={Math.min(SX1 - 4, xNm(nm) + 5)} y={top - 10} textAnchor={xNm(nm) > SX1 - 80 ? "end" : "start"} className="font-mono text-[11px]" fill={col.css}>
                {fmtNm(nm)}
                {col.visible ? "" : " (false colour)"}
              </text>
            </svg>
            <div className="mt-2 flex flex-wrap gap-4 px-1 text-[11.5px] text-fog-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-sm bg-teal-400" /> absorbs (strongly)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-sm bg-teal-400/60" /> absorbs well
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-sm bg-[repeating-linear-gradient(45deg,#59cec7_0_2px,transparent_2px_5px)]" /> partly
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-sm border border-dashed border-fog-400" /> largely transparent
              </span>
            </div>
          </div>
        }
        controls={
          <>
            <ControlGroup title="Wavelength">
              <RangeField label="Wavelength" symbol="λ" value={nm} min={NM_MIN} max={11000} log onChange={setNm} format={fmtNm} hint={`${spectralRegion(nm * 1e-9)}${col.visible ? "" : " · invisible, drawn in false colour"}`} />
              <SelectField
                label="Snap to a handbook wavelength line (§3.8)"
                value={String(nearest.nm)}
                onChange={(v) => setNm(Number(v))}
                options={data.lines.map((l) => ({ value: String(l.nm), label: `${l["Wavelength"]} — ${l["Source technology"]}`.slice(0, 70) }))}
              />
            </ControlGroup>
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/70 p-3 text-[12.5px] leading-relaxed">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-fog-100">{nearest["Wavelength"]}</span>
                <ClassTag kind="handbook" short />
              </div>
              <p className="text-fog-300">
                <span className="text-fog-500">Absorbed well by: </span>
                {nearest["Absorbed well by"]}
              </p>
              <p className="mt-1 text-fog-400">
                <span className="text-fog-500">Typical applications: </span>
                {nearest["Typical applications"]}
              </p>
              <div className="mt-1.5">
                <SourceRef section="3.8" note="wavelength map" />
              </div>
            </div>
          </>
        }
        readouts={
          <ul className="grid gap-2 md:grid-cols-2" aria-label={`Handbook statements at ${fmtNm(nm)}`}>
            {rows.map(({ m, s }) => (
              <li key={m.material} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-900/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-fog-100">{m.material}</span>
                  <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-fog-400">
                  Absorbs well at: <span className="text-fog-200">{m.absorbsText}</span> · Largely transparent at: <span className="text-fog-200">{m.transparentText}</span>
                </p>
                <p className="mt-1 text-[12px] leading-snug text-fog-500">{m.notes}</p>
              </li>
            ))}
          </ul>
        }
        sources={[{ section: "9.3", note: "absorption table" }, { section: "3.8" }, { section: "1.10", note: "spectral regions" }]}
        footer="A material can still be processed outside its stated absorption bands — pigments, additives, coatings, surface state, temperature and nonlinear (ultrafast) absorption all change coupling (§9.2, §9.3, §10.15). Treat this as the handbook's first-pass screen, then run an absorption check and a DOE."
      />
      <MetalsPanel data={data} nm={nm} />
    </div>
  );
}

function parsePct(text: string): [number, number] | null {
  const m = text.match(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*%/);
  if (!m) return null;
  const a = Number(m[1]);
  return [a, m[2] ? Number(m[2]) : a];
}

function MetalsPanel({ data, nm }: { data: MaterialsData; nm: number }) {
  const series = [
    { name: "Copper (cold)", color: "#ffb547", pts: data.cold.copper },
    { name: "Aluminium (cold)", color: "#7fb2ff", pts: data.cold.aluminium },
  ];
  const W = 520;
  const H = 230;
  const x0 = 50;
  const x1 = W - 20;
  const y0 = 20;
  const y1 = H - 36;
  const lx = (v: number) => x0 + ((Math.log10(v) - Math.log10(300)) / (Math.log10(1300) - Math.log10(300))) * (x1 - x0);
  const ly = (p: number) => y1 - (p / 100) * (y1 - y0);
  return (
    <section className="@container rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80" aria-labelledby="metals-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Metals · §9.2, §15.4</div>
          <h3 id="metals-title" className="text-[17px] font-semibold text-paper">
            Metals: a surface property that falls toward the infrared
          </h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fog-400">“{data.quotes.skin}”</p>
        </div>
        <div className="flex gap-1.5">
          <ClassTag kind="handbook" short />
        </div>
      </div>
      <div className="grid gap-5 p-5 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cold absorptance of copper and aluminium at four source wavelengths, handbook §15.4">
            {[0, 25, 50, 75, 100].map((p) => (
              <g key={p}>
                <line x1={x0} x2={x1} y1={ly(p)} y2={ly(p)} stroke="rgba(255,255,255,0.06)" />
                <text x={x0 - 8} y={ly(p) + 4} textAnchor="end" className="fill-fog-500 font-mono text-[10px]">
                  {p}%
                </text>
              </g>
            ))}
            {data.cold.copper.map((c) => (
              <text key={c.nm} x={lx(c.nm)} y={H - 16} textAnchor="middle" className="fill-fog-400 font-mono text-[10px]">
                {c.nm} nm
              </text>
            ))}
            <line x1={lx(Math.min(1300, Math.max(300, nm)))} x2={lx(Math.min(1300, Math.max(300, nm)))} y1={y0} y2={y1} stroke={wavelengthColor(nm * 1e-9).css} strokeOpacity={nm >= 300 && nm <= 1300 ? 0.8 : 0} strokeDasharray="4 3" />
            {series.map((s) => (
              <g key={s.name}>
                {s.pts.map((p) => {
                  const r = parsePct(p.text);
                  if (!r) return null;
                  return (
                    <g key={p.nm}>
                      <line x1={lx(p.nm)} x2={lx(p.nm)} y1={ly(r[0])} y2={ly(r[1])} stroke={s.color} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
                      <text x={s.name.startsWith("Alu") ? lx(p.nm) - 8 : lx(p.nm) + 8} y={ly((r[0] + r[1]) / 2) + 4} textAnchor={s.name.startsWith("Alu") ? "end" : "start"} className="font-mono text-[10.5px]" fill={s.color}>
                        {p.text}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
          <div className="mt-1 flex flex-wrap gap-4 text-[11.5px] text-fog-400">
            {series.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} /> {s.name}
              </span>
            ))}
            <span className="text-fog-500">Values exactly as tabulated in §15.4 (≈, cold metal). The §9.2 absorptance chart is missing from the supplied file.</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-relaxed text-fog-300">“{data.quotes.raise}”</p>
          <ul className="flex flex-col divide-y divide-[var(--line)] rounded-[var(--radius-md)] border border-[var(--line)]">
            {data.metals.map((m) => (
              <li key={m["Metal"]} className="px-3 py-2.5 text-[12.5px] leading-snug">
                <div className="font-medium text-fog-100">{m["Metal"]}</div>
                <div className="text-fog-400">{m["Behaviour under laser"]}</div>
                <div className="mt-0.5 text-teal-200/90">→ {m["Preferred approaches"]}</div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <SourceRef section="9.2" />
            <SourceRef section="15.4" note="Cu/Al absorption row" />
            <Link href="/calculators/hagen-rubens" className="text-[12.5px] text-teal-300 underline underline-offset-2">
              Hagen–Rubens IR reflectivity calculator
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== thermal */
function parseLen(text: string): number | null {
  const m = text.match(/([\d.]+)\s*(nm|µm|mm)/);
  if (!m) return null;
  const k = m[2] === "nm" ? 1e-9 : m[2] === "µm" ? 1e-6 : 1e-3;
  return Number(m[1]) * k;
}
const MAT_COLOURS = ["#ffb547", "#7fb2ff", "#59cec7", "#d6c9ff", "#ff8fb1"];

export function ThermalTab({ data }: { data: MaterialsData }) {
  const [mat, setMat] = useState(data.diffusivity[2]?.material ?? data.diffusivity[0]!.material);
  const [tau, setTau] = useState(100e-9);
  const sel = data.diffusivity.find((d) => d.material === mat) ?? data.diffusivity[0]!;
  const L = ia.thermalDiffusionLength(sel.kappaMm2s * 1e-6, tau);
  const W = 640;
  const H = 360;
  const x0 = 64;
  const x1 = W - 16;
  const y0 = 16;
  const y1 = H - 40;
  const T0 = 1e-12;
  const T1 = 1e-2;
  const L0 = 1e-9;
  const L1 = 1e-2;
  const lx = (t: number) => x0 + ((Math.log10(t) - Math.log10(T0)) / (Math.log10(T1) - Math.log10(T0))) * (x1 - x0);
  const ly = (l: number) => y1 - ((Math.log10(l) - Math.log10(L0)) / (Math.log10(L1) - Math.log10(L0))) * (y1 - y0);
  const curve = (k: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = 10 ** (Math.log10(T0) + (i / 60) * (Math.log10(T1) - Math.log10(T0)));
      pts.push(`${lx(t).toFixed(1)},${ly(ia.thermalDiffusionLength(k * 1e-6, t)).toFixed(1)}`);
    }
    return pts.join(" ");
  };
  const tLabels: Array<[number, string]> = [
    [1e-12, "1 ps"],
    [1e-9, "1 ns"],
    [1e-6, "1 µs"],
    [1e-3, "1 ms"],
  ];
  const lLabels: Array<[number, string]> = [
    [1e-9, "1 nm"],
    [1e-6, "1 µm"],
    [1e-3, "1 mm"],
  ];
  return (
    <div className="flex flex-col gap-5">
      <LabFrame
        title="Thermal diffusion length vs interaction time"
        eyebrow="Thermal regime · §9.4"
        tags={["handbook", "derived"]}
        description={<>“{data.quotes.diffusion}” Lines are calculated from κ; dots are the handbook&apos;s own tabulated values.</>}
        onReset={() => {
          setTau(100e-9);
          setMat(data.diffusivity[2]?.material ?? data.diffusivity[0]!.material);
        }}
        visual={
          <div className="p-3">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Log-log plot of thermal diffusion length against interaction time for five materials">
              <rect x={lx(T0)} y={y0} width={lx(10e-12) - lx(T0)} height={y1 - y0} fill="rgba(166,140,255,0.08)" />
              <text x={lx(T0) + 4} y={y0 + 12} className="fill-concept text-[10px]">
                &lt; ~10 ps: two-temperature regime
              </text>
              {tLabels.map(([t, l]) => (
                <g key={l}>
                  <line x1={lx(t)} x2={lx(t)} y1={y0} y2={y1} stroke="rgba(255,255,255,0.06)" />
                  <text x={lx(t)} y={H - 22} textAnchor="middle" className="fill-fog-500 font-mono text-[10px]">
                    {l}
                  </text>
                </g>
              ))}
              {lLabels.map(([v, l]) => (
                <g key={l}>
                  <line x1={x0} x2={x1} y1={ly(v)} y2={ly(v)} stroke="rgba(255,255,255,0.06)" />
                  <text x={x0 - 8} y={ly(v) + 4} textAnchor="end" className="fill-fog-500 font-mono text-[10px]">
                    {l}
                  </text>
                </g>
              ))}
              <text x={(x0 + x1) / 2} y={H - 4} textAnchor="middle" className="fill-fog-500 text-[10.5px]">
                interaction time τ (log)
              </text>
              {data.diffusivity.map((d, i) => {
                const on = d.material === mat;
                return (
                  <g key={d.material} opacity={on ? 1 : 0.45}>
                    <polyline points={curve(d.kappaMm2s)} fill="none" stroke={MAT_COLOURS[i % 5]} strokeWidth={on ? 2.5 : 1.3} />
                    {d.table.map((p) => {
                      const v = parseLen(p.text);
                      return v ? <circle key={p.tau} cx={lx(p.tau)} cy={ly(v)} r={on ? 4.5 : 3} fill={VIZ_BG} stroke={MAT_COLOURS[i % 5]} strokeWidth={2} /> : null;
                    })}
                    <text x={x1 - 4} y={ly(ia.thermalDiffusionLength(d.kappaMm2s * 1e-6, T1)) - 4} textAnchor="end" className="text-[10.5px]" fill={MAT_COLOURS[i % 5]}>
                      {d.material}
                    </text>
                  </g>
                );
              })}
              <line x1={lx(tau)} x2={lx(tau)} y1={y0} y2={y1} stroke="#e6eaee" strokeDasharray="4 3" strokeOpacity={0.6} />
              <circle cx={lx(tau)} cy={ly(L)} r={5} fill="#e6eaee" />
            </svg>
          </div>
        }
        controls={
          <>
            <ControlGroup title="Inputs">
              <SelectField label="Material (κ from §9.4)" value={mat} onChange={setMat} options={data.diffusivity.map((d) => ({ value: d.material, label: `${d.material} — κ ≈ ${d.kappaMm2s} mm²/s` }))} />
              <RangeField label="Interaction time" symbol="τ" value={tau} min={1e-12} max={1e-2} log onChange={setTau} format={(v) => formatWithUnit(v, "time", undefined, 3)} />
            </ControlGroup>
            <div className="text-[13px] text-fog-300">
              <Tex math="L_{th} \approx 2\sqrt{\kappa\,\tau}" display />
            </div>
          </>
        }
        readouts={
          <ReadoutGrid cols={3}>
            <Readout label="Thermal diffusion length" symbol="L_th" value={formatWithUnit(L, "length", undefined, 3)} tone="primary" />
            <Readout label="Pulse regime (§27.1)" value={ia.pulseRegime(tau)} />
            <Readout label="Diffusivity" symbol="κ" value={`${sel.kappaMm2s} mm²/s`} note="handbook value (≈)" />
          </ReadoutGrid>
        }
        sources={[{ section: "9.4", note: "κ and diffusion-length table" }, { section: "B.3", note: "L_th ≈ 2√(κτ)" }]}
        footer={<>“{data.quotes.twoTemp}”</>}
      />
      <MeltBoil data={data} />
    </div>
  );
}
const VIZ_BG = "#0a0f17";

function MeltBoil({ data }: { data: MaterialsData }) {
  const W = 640;
  const rowH = 30;
  const x0 = 170;
  const x1 = W - 20;
  const H = data.meltBoil.length * rowH + 40;
  const max = 3500;
  const lx = (c: number) => x0 + (c / max) * (x1 - x0);
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80 p-5" aria-labelledby="mb-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="mb-title" className="text-[16px] font-semibold text-paper">
          Melting and boiling points
        </h3>
        <div className="flex items-center gap-2">
          <ClassTag kind="handbook" short />
          <SourceRef section="9.4" note="second table" />
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Melting and boiling points from handbook §9.4">
        {[0, 500, 1000, 1500, 2000, 2500, 3000, 3500].map((c) => (
          <g key={c}>
            <line x1={lx(c)} x2={lx(c)} y1={8} y2={H - 26} stroke="rgba(255,255,255,0.06)" />
            <text x={lx(c)} y={H - 10} textAnchor="middle" className="fill-fog-500 font-mono text-[10px]">
              {c} °C
            </text>
          </g>
        ))}
        {data.meltBoil.map((m, i) => {
          const y = 12 + i * rowH;
          return (
            <g key={m.material}>
              <text x={x0 - 10} y={y + 13} textAnchor="end" className="fill-fog-200 text-[11.5px]">
                {m.material}
              </text>
              {m.melt && m.boil ? <line x1={lx(m.melt.hi)} x2={lx(m.boil.lo)} y1={y + 9} y2={y + 9} stroke="rgba(255,255,255,0.18)" strokeWidth={2} /> : null}
              {m.melt ? (
                <rect x={lx(m.melt.lo) - 4} y={y + 3} width={Math.max(8, lx(m.melt.hi) - lx(m.melt.lo) + 8)} height={12} rx={6} fill="#ffb547">
                  <title>{`Melting ≈ ${m.meltText} °C`}</title>
                </rect>
              ) : null}
              {m.boil ? (
                <rect x={lx(m.boil.lo) - 4} y={y + 3} width={Math.max(8, lx(m.boil.hi) - lx(m.boil.lo) + 8)} height={12} rx={6} fill="#ff6b9a">
                  <title>{`Boiling ≈ ${m.boilText} °C`}</title>
                </rect>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[11.5px] text-fog-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#ffb547]" /> melting (≈)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#ff6b9a]" /> boiling (≈)
        </span>
        <span className="text-fog-500">Hover a marker for the exact handbook value and note. Zinc boils at 907 °C — below steel&apos;s melting point.</span>
      </div>
    </section>
  );
}

/* ================================================================== ablation */
export function AblationTab({ data }: { data: MaterialsData }) {
  const [ratio, setRatio] = useState(Math.E ** 2);
  const W = 640;
  const H = 300;
  const x0 = 56;
  const x1 = W - 20;
  const y0 = 18;
  const y1 = H - 40;
  const R1 = 100;
  const lx = (r: number) => x0 + (Math.log10(r) / Math.log10(R1)) * (x1 - x0);
  const depth = (r: number) => Math.log(r); // d/δ
  const eff = (r: number) => (r <= 1 ? 0 : Math.log(r) ** 2 / r / (4 / Math.E ** 2)); // normalised to max at e²
  const yD = (v: number) => y1 - (v / Math.log(R1)) * (y1 - y0);
  const yE = (v: number) => y1 - v * (y1 - y0);
  const path = (f: (r: number) => number, y: (v: number) => number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const r = 10 ** ((i / 120) * Math.log10(R1));
      pts.push(`${lx(r).toFixed(1)},${y(f(r)).toFixed(1)}`);
    }
    return pts.join(" ");
  };
  return (
    <div className="flex flex-col gap-5">
      <LabFrame
        title="Depth per pulse and energy efficiency above threshold"
        eyebrow="Ablation · §9.5"
        tags={["handbook", "derived"]}
        description={<>“{data.quotes.ablationLog}”</>}
        onReset={() => setRatio(Math.E ** 2)}
        visual={
          <div className="p-3">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Normalised ablation depth and specific removal rate against peak fluence over threshold">
              {[1, 2, 5, 10, 20, 50, 100].map((r) => (
                <g key={r}>
                  <line x1={lx(r)} x2={lx(r)} y1={y0} y2={y1} stroke="rgba(255,255,255,0.06)" />
                  <text x={lx(r)} y={H - 22} textAnchor="middle" className="fill-fog-500 font-mono text-[10px]">
                    {r}×
                  </text>
                </g>
              ))}
              <text x={(x0 + x1) / 2} y={H - 4} textAnchor="middle" className="fill-fog-500 text-[10.5px]">
                peak fluence / threshold fluence, F₀ / F_th (log)
              </text>
              <line x1={lx(Math.E ** 2)} x2={lx(Math.E ** 2)} y1={y0} y2={y1} stroke="#a68cff" strokeDasharray="5 4" />
              <text x={lx(Math.E ** 2) + 5} y={y0 + 12} className="fill-concept text-[10.5px]">
                e²·F_th ≈ 7.4 F_th (§9.5)
              </text>
              <polyline points={path(depth, yD)} fill="none" stroke="#59cec7" strokeWidth={2.4} />
              <polyline points={path(eff, yE)} fill="none" stroke="#ffb547" strokeWidth={2.4} />
              <circle cx={lx(ratio)} cy={yD(depth(ratio))} r={5} fill="#59cec7" />
              <circle cx={lx(ratio)} cy={yE(eff(ratio))} r={5} fill="#ffb547" />
              <text x={x0 + 6} y={y1 - 8} className="fill-fog-500 text-[10px]">
                curves are dimensionless — no material data assumed
              </text>
            </svg>
            <div className="mt-1 flex flex-wrap gap-4 px-1 text-[11.5px] text-fog-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-teal-300" /> depth per pulse d/δ = ln(F₀/F_th)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-[#ffb547]" /> removal per unit energy (Gaussian spot), normalised to its maximum
              </span>
            </div>
          </div>
        }
        controls={
          <>
            <ControlGroup title="Operating point">
              <RangeField label="Peak fluence over threshold" symbol="F₀/F_th" value={ratio} min={1.05} max={100} log onChange={setRatio} format={(v) => `${formatNumber(v, 3)}×`} />
            </ControlGroup>
            <div className="text-[13px] text-fog-300">
              <Tex math="d \approx \delta\,\ln\frac{F_0}{F_{th}}" display />
              <Tex math="\frac{V}{E_p} = \frac{\delta}{2F_0}\ln^2\frac{F_0}{F_{th}}" display />
            </div>
            <p className="text-[12px] leading-snug text-fog-500">
              Absolute depths need the material&apos;s optical penetration depth δ and threshold F_th — measure them; use the{" "}
              <Link href="/calculators/ablation-depth" className="text-teal-300 underline underline-offset-2">
                ablation-depth calculator
              </Link>{" "}
              with your values.
            </p>
          </>
        }
        readouts={
          <ReadoutGrid cols={3}>
            <Readout label="Depth per pulse" value={`${formatNumber(depth(ratio), 3)} δ`} tone="primary" />
            <Readout label="Energy efficiency" value={`${Math.round(eff(ratio) * 100)}% of max`} />
            <Readout label="Optimum" value="F₀ = e²·F_th" note="maximum removal per joule (§9.5)" />
          </ReadoutGrid>
        }
        sources={[{ section: "9.5" }, { section: "B.3", note: "d_pulse ≈ δ ln(F₀/F_th)" }]}
        footer={<>“{data.quotes.accumulation}”</>}
      />
      <section className="grid gap-3 md:grid-cols-2" aria-label="Ablation regimes, handbook §9.5">
        {data.ablation.map((r) => (
          <article key={r["Regime"]} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14.5px] font-semibold text-fog-100">{r["Regime"]}</h3>
              <Badge tone="teal">{r["Pulse / λ"]}</Badge>
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-fog-300">{r["Mechanism"]}</p>
            <p className="mt-1 text-[12.5px] leading-snug text-fog-500">→ {r["Result"]}</p>
          </article>
        ))}
      </section>
      <Callout kind="note" title="Plasma shielding (§9.6)">
        “{data.quotes.plasma}” <SourceRef section="9.6" />
      </Callout>
    </div>
  );
}

/* ================================================================== regimes (reconstruction) */
const REGIME_ORDER = ["fs", "ps", "ns", "µs", "CW / ms"] as const;
const REGIME_SPAN: Record<(typeof REGIME_ORDER)[number], [number, number]> = {
  fs: [1e-14, 1e-12],
  ps: [1e-12, 1e-9],
  ns: [1e-9, 1e-6],
  µs: [1e-6, 1e-4],
  "CW / ms": [1e-4, 1],
};

export function RegimeTab({ data }: { data: MaterialsData }) {
  const [tau, setTau] = useState(50e-9);
  const [cw, setCw] = useState(false);
  const [power, setPower] = useState(2000);
  const [spotUm, setSpotUm] = useState(200);
  const regime = cw ? "CW / ms" : ia.pulseRegime(tau);
  const row = data.regimes.find((r) => r["Regime"] === regime);
  const steel = data.diffusivity.find((d) => /stainless/i.test(d.material));
  const L = steel && !cw ? ia.thermalDiffusionLength(steel.kappaMm2s * 1e-6, tau) : null;
  const I = meanIntensity(power, (spotUm * 1e-6) / 2);
  const mode = ia.weldingModeIndicator(I);
  const modeRow = data.weldModes.find((m) => m["Mode"]?.toLowerCase().startsWith(mode));
  const W = 1000;
  const x0 = 20;
  const x1 = W - 20;
  const lx = (t: number) => x0 + ((Math.log10(t) - -14) / (0 - -14)) * (x1 - x0);
  return (
    <div className="flex flex-col gap-5">
      <Callout kind="review" title="Reconstruction — not the handbook's chart">
        The §9.7 process regime map is missing from the supplied file (placeholder link only). This view is rebuilt only from statements in the text: the pulse-duration regimes of
        §27.1, the ~10 ps non-thermal limit of §9.5 and the ~10⁶ W/cm² keyhole threshold for steel of §9.4/§10.4. Nothing else is placed on the chart. “{data.quotes.regimeMap}” <SourceRef section="9.7" />
      </Callout>
      <LabFrame
        title="Process regime explorer"
        eyebrow="Interaction time · §27.1, §9.4, §9.5, §10.4"
        tags={["handbook", "derived", "conceptual"]}
        onReset={() => {
          setTau(50e-9);
          setCw(false);
          setPower(2000);
          setSpotUm(200);
        }}
        visual={
          <div className="scrollbar-thin overflow-x-auto p-3">
            <svg viewBox={`0 0 ${W} 210`} className="min-w-[640px]" role="img" aria-label="Pulse-duration regimes on a logarithmic time axis">
              {REGIME_ORDER.map((r, i) => {
                const [a, b] = REGIME_SPAN[r];
                const on = r === regime;
                const rr = data.regimes.find((x) => x["Regime"] === r);
                return (
                  <g key={r}>
                    <rect x={lx(a)} y={30} width={lx(b) - lx(a) - 3} height={110} rx={10} fill={on ? "rgba(0,149,144,0.22)" : i % 2 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)"} stroke={on ? "#59cec7" : "rgba(255,255,255,0.08)"} />
                    <text x={lx(a) + 12} y={54} className={cn("text-[15px] font-semibold", on ? "fill-teal-100" : "fill-fog-200")}>
                      {r}
                    </text>
                    <text x={lx(a) + 12} y={74} className="fill-fog-400 text-[11px]">
                      {rr?.["Interaction"]}
                    </text>
                    <text x={lx(a) + 12} y={94} className="fill-fog-500 font-mono text-[10.5px]">
                      L(steel) {rr?.["Thermal diffusion length in steel (≈, §9.4)"]}
                    </text>
                  </g>
                );
              })}
              <line x1={lx(10e-12)} x2={lx(10e-12)} y1={22} y2={150} stroke="#a68cff" strokeDasharray="5 4" />
              <text x={lx(10e-12) + 4} y={164} className="fill-concept text-[10.5px]">
                ~10 ps: non-thermal below (§9.5)
              </text>
              {[1e-14, 1e-12, 1e-9, 1e-6, 1e-3, 1].map((t) => (
                <text key={t} x={lx(t)} y={196} textAnchor="middle" className="fill-fog-500 font-mono text-[10px]">
                  {formatWithUnit(t, "time", undefined, 1)}
                </text>
              ))}
              {!cw ? <line x1={lx(tau)} x2={lx(tau)} y1={20} y2={150} stroke="#e6eaee" strokeWidth={2} /> : null}
            </svg>
          </div>
        }
        controls={
          <>
            <ControlGroup title="Interaction">
              <Switch checked={cw} onChange={setCw} label="Continuous wave (CW)" />
              {!cw ? <RangeField label="Pulse duration" symbol="τ" value={tau} min={20e-15} max={0.5} log onChange={setTau} format={(v) => formatWithUnit(v, "time", undefined, 3)} /> : null}
            </ControlGroup>
            {regime === "CW / ms" ? (
              <ControlGroup title="Welding mode check (steel)">
                <RangeField label="Power" symbol="P" value={power} min={50} max={20000} log onChange={setPower} format={(v) => formatWithUnit(v, "power", undefined, 3)} />
                <RangeField label="Spot diameter" symbol="d" value={spotUm} min={20} max={2000} log onChange={setSpotUm} format={(v) => `${formatNumber(v, 3)} µm`} />
              </ControlGroup>
            ) : null}
          </>
        }
        readouts={
          <div className="flex flex-col gap-4">
            <ReadoutGrid cols={3}>
              <Readout label="Regime (§27.1)" value={regime} tone="primary" />
              <Readout label="Typical processes" value={row?.["Typical processes"] ?? "—"} />
              {L !== null ? <Readout label="L_th in stainless (κ = 4 mm²/s)" value={formatWithUnit(L, "length", undefined, 3)} note="calculated, 2√(κτ)" /> : <Readout label="Thermal diffusion length (steel)" value={row?.["Thermal diffusion length in steel (≈, §9.4)"] ?? "—"} note="handbook" />}
            </ReadoutGrid>
            {regime === "CW / ms" ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-900/60 p-3 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-fog-400">Mean intensity P/(πw²):</span>
                  <span className="font-mono text-paper">{formatNumber(I / 1e4, 3)} W/cm²</span>
                  <Badge tone={mode === "keyhole" ? "warn" : mode === "transition" ? "danger" : "teal"}>{modeRow?.["Mode"] ?? mode}</Badge>
                </div>
                {modeRow ? (
                  <p className="mt-1.5 text-[12.5px] leading-snug text-fog-400">
                    {modeRow["Intensity (≈)"]} · {modeRow["Physics"]} · aspect ratio {modeRow["Aspect ratio (depth/width)"]} · {modeRow["Typical use"]}
                  </p>
                ) : null}
                <p className="mt-1.5 text-[11.5px] text-fog-500">
                  The ~10⁶ W/cm² threshold is stated for steel; the transition band (0.5–2 × 10⁶ W/cm²) is LASERVERSE&apos;s rendering of “~10⁶”. Other metals differ.
                </p>
              </div>
            ) : null}
          </div>
        }
        sources={[{ section: "27.1", note: "pulse-duration regimes" }, { section: "9.4" }, { section: "9.5" }, { section: "10.4", note: "welding modes" }]}
        footer={<>“{data.quotes.sequence}”</>}
      />
    </div>
  );
}
