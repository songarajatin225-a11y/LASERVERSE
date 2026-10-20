"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LabFrame, Readout, ReadoutGrid, ControlGroup } from "@/components/viz/LabFrame";
import { RangeField } from "@/components/ui/controls";
import { Badge, cn } from "@/components/ui/primitives";
import { linkRefs } from "@/components/handbook/linkRefs";
import * as be from "@/lib/physics/beam";
import * as op from "@/lib/physics/optics";
import { formatNumber } from "@/lib/physics/units";

export type Row = Record<string, string>;

/* =================================================================== beam train */
const TRAIN = [
  { id: "source", label: "Laser source", table: "chain", key: "Laser source" },
  { id: "isolator", label: "Isolator", table: "chain", key: "Isolator" },
  { id: "expander", label: "Beam expander", table: "components", key: "Beam expanders" },
  { id: "galvo", label: "Galvo mirrors", table: "components", key: "Mirrors" },
  { id: "ftheta", label: "F-theta lens", table: "components", key: "F-theta lenses" },
  { id: "window", label: "Protective window", table: "components", key: "Windows / cover slides" },
  { id: "work", label: "Workpiece", table: "chain", key: "Workpiece and fixture" },
] as const;

export function OpticsComponentExplorer({ components, chain }: { components: Row[]; chain: Row[] }) {
  const [sel, setSel] = useState<(typeof TRAIN)[number]["id"]>("expander");
  const [mag, setMag] = useState(2);
  const [q, setQ] = useState("");
  const raw = 3.5; // mm, illustrative collimated diameter from the source collimator
  const D = raw * mag;
  const spot = be.focusedSpotDiameter(1.064e-6, 1.3, 0.16, D * 1e-3);
  const item = TRAIN.find((t) => t.id === sel)!;
  const row = item.table === "components" ? components.find((r) => r["Component"] === item.key) : chain.find((r) => r["Subsystem"] === item.key);
  const filtered = useMemo(() => components.filter((r) => !q || Object.values(r).join(" ").toLowerCase().includes(q.toLowerCase())), [components, q]);

  const W = 820, H = 170, y = 86;
  const xs = [40, 150, 270, 400, 520, 610, 720];
  const beamW = (k: number) => (k < 2 ? 6 : k < 5 ? 6 * mag : 0);

  return (
    <div className="flex flex-col gap-6">
      <LabFrame
        eyebrow="Beam & Optics Lab"
        title="Beam train of a galvo marking head"
        tags={["handbook", "derived", "conceptual"]}
        description="A generic optical chain (§11.1) with the components of §5.1. Select a component to read its function and key specifications; change the expander magnification to see how it sets the beam diameter at the scanner and the focused spot."
        visual={
          <div className="flex h-full flex-col justify-center p-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Optical chain: select a component">
              {/* beam */}
              <path d={`M ${xs[0]! + 30} ${y - 3} L ${xs[2]!} ${y - 3} L ${xs[2]! + 60} ${y - beamW(3) / 2} L ${xs[4]!} ${y - beamW(3) / 2} L ${xs[4]! + 16} ${y - beamW(3) / 2} L ${xs[6]!} ${y + 30} L ${xs[4]! + 16} ${y + beamW(3) / 2} L ${xs[2]! + 60} ${y + beamW(3) / 2} L ${xs[2]!} ${y + 3} L ${xs[0]! + 30} ${y + 3} Z`} fill="rgba(255,61,127,0.28)" stroke="rgba(255,61,127,0.7)" strokeWidth={1} />
              {TRAIN.map((t, k) => {
                const x = xs[k]!;
                const active = sel === t.id;
                return (
                  <g key={t.id} role="button" tabIndex={0} aria-pressed={active} aria-label={t.label} onClick={() => setSel(t.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(t.id)} className="cursor-pointer outline-none">
                    {t.id === "source" ? <rect x={x - 30} y={y - 22} width={60} height={44} rx={6} fill={active ? "rgba(25,178,171,0.25)" : "#17202e"} stroke={active ? "#59cec7" : "rgba(255,255,255,0.25)"} /> : null}
                    {t.id === "isolator" ? <rect x={x - 16} y={y - 14} width={32} height={28} rx={4} fill={active ? "rgba(25,178,171,0.25)" : "#17202e"} stroke={active ? "#59cec7" : "rgba(255,255,255,0.25)"} /> : null}
                    {t.id === "expander" ? (
                      <g>
                        <ellipse cx={x} cy={y} rx={5} ry={12} fill="rgba(160,200,255,0.18)" stroke={active ? "#59cec7" : "rgba(160,200,255,0.6)"} />
                        <ellipse cx={x + 58} cy={y} rx={7} ry={Math.max(14, 6 * mag)} fill="rgba(160,200,255,0.18)" stroke={active ? "#59cec7" : "rgba(160,200,255,0.6)"} />
                      </g>
                    ) : null}
                    {t.id === "galvo" ? (
                      <g>
                        <rect x={x - 4} y={y - 22} width={8} height={44} transform={`rotate(35 ${x} ${y})`} fill="rgba(230,234,238,0.7)" stroke={active ? "#59cec7" : "none"} />
                        <rect x={x + 44} y={y - 22} width={8} height={44} transform={`rotate(-35 ${x + 48} ${y})`} fill="rgba(230,234,238,0.55)" stroke={active ? "#59cec7" : "none"} />
                      </g>
                    ) : null}
                    {t.id === "ftheta" ? <rect x={x - 12} y={y - 30} width={24} height={60} rx={8} fill="rgba(160,200,255,0.18)" stroke={active ? "#59cec7" : "rgba(160,200,255,0.6)"} /> : null}
                    {t.id === "window" ? <rect x={x - 3} y={y - 26} width={6} height={52} fill="rgba(160,200,255,0.12)" stroke={active ? "#59cec7" : "rgba(160,200,255,0.5)"} /> : null}
                    {t.id === "work" ? <rect x={x - 40} y={y + 30} width={80} height={14} fill={active ? "rgba(25,178,171,0.3)" : "#3b4a5f"} stroke={active ? "#59cec7" : "none"} /> : null}
                    <text x={t.id === "galvo" ? x + 24 : t.id === "expander" ? x + 29 : x} y={H - 10} textAnchor="middle" fontSize="11" fill={active ? "#e6eaee" : "#8b96a4"} fontFamily="var(--font-geist-sans)">
                      {t.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="px-3 pb-1 text-[11px] text-fog-500">Schematic, not to scale. Beam shown in false colour for 1064 nm.</p>
          </div>
        }
        controls={
          <>
            <ControlGroup title={item.label}>
              {row ? (
                <dl className="flex flex-col gap-2 text-[13px] leading-snug">
                  {Object.entries(row)
                    .filter(([k]) => k !== "Component" && k !== "Subsystem")
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[11px] uppercase tracking-[0.12em] text-fog-500">{k}</dt>
                        <dd className="mt-0.5 text-fog-200">{linkRefs(v)}</dd>
                      </div>
                    ))}
                </dl>
              ) : null}
              <Badge tone="teal">From {item.table === "components" ? "§5.1" : "§11.1"}</Badge>
            </ControlGroup>
            <ControlGroup title="Expander">
              <RangeField label="Magnification" value={mag} min={1} max={6} step={0.1} onChange={setMag} format={(v) => `${v.toFixed(1)}×`} hint={`Input beam ${raw} mm (illustrative). λ 1064 nm, M² 1.3, f 160 mm.`} />
            </ControlGroup>
          </>
        }
        readouts={
          <ReadoutGrid cols={3}>
            <Readout label="Beam diameter at scanner" symbol="D" value={formatNumber(D, 3)} unit="mm" />
            <Readout label="Focused spot (1/e²)" symbol="d₀" value={formatNumber(spot * 1e6, 3)} unit="µm" tone="primary" />
            <Readout label="Galvo aperture needed (≥1.5 D)" value={formatNumber(1.5 * D, 3)} unit="mm" note="Larger aperture → more inertia, lower speed (§7.2)" />
          </ReadoutGrid>
        }
        sources={[{ section: "5.1", note: "components" }, { section: "11.1", note: "optical chain" }, { section: "4.5" }, { section: "7.2" }]}
      />

      <section aria-labelledby="catalogue">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 id="catalogue" className="text-[15px] font-semibold text-paper">Optical component catalogue (§5.1)</h3>
          <label className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850 px-3 text-[13px] text-fog-400">
            <Search aria-hidden className="size-4" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter components" className="w-44 bg-transparent text-fog-100 outline-none" aria-label="Filter components" />
          </label>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <li key={r["Component"]} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4 text-[13px] leading-snug">
              <div className="text-[14.5px] font-semibold text-fog-100">{r["Component"]}</div>
              <p className="mt-1 text-fog-300">{r["Function"]}</p>
              <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1 text-[12.5px]">
                <dt className="text-fog-500">Materials</dt>
                <dd className="text-fog-300">{r["Typical materials"]}</dd>
                <dt className="text-fog-500">Key specs</dt>
                <dd className="text-fog-300">{r["Key specifications"]}</dd>
                <dt className="text-fog-500">Used in</dt>
                <dd className="text-fog-300">{linkRefs(r["Where used"] ?? "")}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* =================================================================== materials */
const WL_COLS = ["193 nm", "248 nm", "266 nm", "355 nm", "532 nm", "1064 nm", "1550 nm", "2 µm", "2.94 µm", "10.6 µm"];

export function OpticalMaterialsExplorer({ matrix, details }: { matrix: Row[]; details: Row[] }) {
  const [wl, setWl] = useState("1064 nm");
  const [mat, setMat] = useState("Fused silica");
  const detail = details.find((d) => (d["Material"] ?? "").toLowerCase().startsWith(mat.toLowerCase().split(" ")[0]!));
  const index = Number((detail?.["Index (≈)"] ?? "").match(/[\d.]+/)?.[0]);
  const R = Number.isFinite(index) && index > 1 ? op.fresnelNormal(index) : null;
  const symbol = (v: string) => (v.startsWith("✓") ? "ok" : v.startsWith("△") ? "care" : "no");
  return (
    <LabFrame
      eyebrow="Beam & Optics Lab"
      title="Optical materials and wavelength compatibility"
      tags={["handbook", "derived"]}
      description="Choose a wavelength column to see which materials transmit it (✓ standard use, △ special grade or with care, ✗ not usable in transmission — §5.5). Select a material for its transmission range, index and cautions."
      visual={
        <div className="scrollbar-thin overflow-x-auto p-4">
          <table className="hb-table min-w-[720px]">
            <thead>
              <tr>
                <th>Material</th>
                {WL_COLS.map((c) => (
                  <th key={c}>
                    <button type="button" onClick={() => setWl(c)} aria-pressed={wl === c} className={cn("rounded px-1.5 py-0.5", wl === c ? "bg-teal-500/25 text-teal-100" : "text-fog-300 hover:text-paper")}>
                      {c}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((r) => (
                <tr key={r["Material"]} className={cn(mat === r["Material"] ? "[&>td]:bg-white/[0.04]" : "")}>
                  <td>
                    <button type="button" onClick={() => setMat(r["Material"] ?? "")} className="text-left font-medium text-fog-100 hover:text-teal-200" aria-pressed={mat === r["Material"]}>
                      {r["Material"]}
                    </button>
                  </td>
                  {WL_COLS.map((c) => {
                    const v = r[c] ?? "";
                    const s = symbol(v);
                    return (
                      <td key={c} className={cn("text-center", wl === c ? (s === "ok" ? "bg-ok/15 text-[#bdf0dc]" : s === "care" ? "bg-warn/15 text-[#f6d79a]" : "bg-danger/10 text-[#ffb4b6]") : s === "ok" ? "text-ok" : s === "care" ? "text-warn" : "text-fog-500")}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      controls={
        <ControlGroup title={mat}>
          {detail ? (
            <dl className="flex flex-col gap-2 text-[13px] leading-snug">
              {Object.entries(detail)
                .filter(([k]) => k !== "Material")
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase tracking-[0.12em] text-fog-500">{k}</dt>
                    <dd className="mt-0.5 text-fog-200">{v}</dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-[13px] text-fog-500">No detail row in §5.5 for this material.</p>
          )}
          <p className="text-[12.5px] text-fog-400">
            At <span className="text-fog-100">{wl}</span>: <span className="text-fog-100">{matrix.find((r) => r["Material"] === mat)?.[wl] ?? "—"}</span>
          </p>
        </ControlGroup>
      }
      readouts={
        <ReadoutGrid cols={3}>
          <Readout label="Refractive index (handbook)" value={Number.isFinite(index) ? String(index) : "—"} />
          <Readout label="Uncoated reflectance per surface" symbol="((n−1)/(n+1))²" value={R !== null ? formatNumber(R * 100, 3) : "—"} unit={R !== null ? "%" : undefined} tone="primary" note="Derived from the index; coatings are not optional (§5.2)" />
          <Readout label="Transmission range" value={detail?.["Transmission range (≈)"] ?? "—"} tone="muted" />
        </ReadoutGrid>
      }
      sources={[{ section: "5.5", note: "materials and compatibility tables" }, { section: "5.2", note: "Fresnel loss" }]}
    />
  );
}
