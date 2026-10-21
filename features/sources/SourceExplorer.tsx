"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Search, X, GitCompare } from "lucide-react";
import { Tabs } from "@/components/ui/controls";
import { Badge, Button, Callout, ClassTag, cn } from "@/components/ui/primitives";
import { linkRefs } from "@/components/handbook/linkRefs";
import { SourceRef } from "@/components/ui/SourceRef";
import { wavelengthColor } from "@/lib/physics/photon";
import { formatNumber } from "@/lib/physics/units";
import { duration, ease, spring } from "@/components/motion/tokens";

export interface ClientSourceEntry {
  id: string;
  name: string;
  family: string;
  familyLabel: string;
  section: string;
  fields: Array<[string, string]>;
  joinedFrom?: string;
  wavelengthsNm: Array<[number, number]>;
  modes: string[];
  search: string;
}
type Line = Record<string, string> & { nm: number | null; range: [number, number] | null };

const BANDS: Array<{ id: string; label: string; lo: number; hi: number }> = [
  { id: "uv", label: "UV (< 400 nm)", lo: 100, hi: 400 },
  { id: "vis", label: "Visible", lo: 400, hi: 780 },
  { id: "nir", label: "NIR (0.78–1.4 µm)", lo: 780, hi: 1400 },
  { id: "swir", label: "SWIR (1.4–3 µm)", lo: 1400, hi: 3000 },
  { id: "ir", label: "Mid/long IR (> 3 µm)", lo: 3000, hi: 20000 },
];
const MODES = ["CW", "ms / QCW", "µs pulsed", "ns pulsed", "ps", "fs"];

const field = (e: ClientSourceEntry, re: RegExp) => e.fields.find(([h]) => re.test(h))?.[1];

export function SourceExplorer({ entries, lines, families }: { entries: ClientSourceEntry[]; lines: Line[]; families: Array<Record<string, string>> }) {
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState(params.get("view") === "wavelengths" ? "wavelengths" : "catalogue");
  const [fam, setFam] = useState<string | null>(params.get("family"));
  const [band, setBand] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [cmp, setCmp] = useState<string[]>([]);
  const [line, setLine] = useState<number>(lines.findIndex((l) => (l["Wavelength"] ?? "").startsWith("1064")));

  useEffect(() => {
    const f = params.get("family");
    if (f) setFam(f);
    if (params.get("view") === "wavelengths") setView("wavelengths");
    // deep link from search: ?source=<entryId> opens that entry and scrolls its card into view
    const s = params.get("source");
    if (s && entries.some((e) => e.id === s)) {
      setView("catalogue");
      setOpen(s);
      requestAnimationFrame(() => document.getElementById(`source-${s}`)?.scrollIntoView({ block: "center" }));
    }
  }, [params, entries]);

  const familiesList = useMemo(() => [...new Map(entries.map((e) => [e.family, e.familyLabel])).entries()], [entries]);
  const shown = useMemo(
    () =>
      entries.filter((e) => {
        if (fam && e.family !== fam) return false;
        if (mode && !e.modes.includes(mode)) return false;
        if (band) {
          const b = BANDS.find((x) => x.id === band)!;
          if (!e.wavelengthsNm.some(([lo, hi]) => hi >= b.lo && lo < b.hi)) return false;
        }
        if (q && !e.search.includes(q.toLowerCase())) return false;
        return true;
      }),
    [entries, fam, band, mode, q],
  );
  const opened = entries.find((e) => e.id === open);
  const compared = cmp.map((id) => entries.find((e) => e.id === id)!).filter(Boolean);
  const toggleCmp = (id: string) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? [...c.slice(1), id] : [...c, id]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Source explorer views"
          tabs={[
            { id: "catalogue", label: `Catalogue (${entries.length})` },
            { id: "compare", label: `Compare${cmp.length ? ` (${cmp.length})` : ""}` },
            { id: "wavelengths", label: "Wavelength map (§3.8)" },
            { id: "families", label: "Families at a glance" },
          ]}
          value={view}
          onChange={(v) => {
            setView(v);
            router.replace(`/sources${v === "wavelengths" ? "?view=wavelengths" : ""}`, { scroll: false });
          }}
        />
        <div className="flex items-center gap-2">
          <ClassTag kind="handbook" short />
          <ClassTag kind="derived" short />
        </div>
      </div>

      {view === "catalogue" ? (
        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start" aria-label="Filters">
            <label className="flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850 px-3 text-[13px] text-fog-400 focus-within:border-teal-400">
              <Search aria-hidden className="size-4" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. welding, 1550, Raycus" className="w-full bg-transparent text-fog-100 outline-none" aria-label="Search sources" />
            </label>
            <FilterGroup title="Source family" value={fam} onChange={setFam} options={familiesList.map(([id, label]) => ({ id, label }))} />
            <FilterGroup title="Wavelength band" value={band} onChange={setBand} options={BANDS.map((b) => ({ id: b.id, label: b.label }))} />
            <FilterGroup title="Operating mode" value={mode} onChange={setMode} options={MODES.map((m) => ({ id: m, label: m }))} />
            <p className="text-[11.5px] leading-snug text-fog-500">Band and mode filters use tags parsed from the handbook text (derived). Open an entry to read the source rows.</p>
          </aside>
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between text-[12.5px] text-fog-400">
              <span>
                {shown.length} of {entries.length} sources
              </span>
              {cmp.length ? (
                <Button size="sm" variant="secondary" onClick={() => setView("compare")}>
                  <GitCompare aria-hidden className="size-3.5" /> Compare {cmp.length}
                </Button>
              ) : null}
            </div>
            <motion.ul layout className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {shown.map((e) => {
                  const wl = field(e, /wavelength/i) ?? field(e, /duration|specification/i) ?? "";
                  const pw = field(e, /typical power|power \/ energy|typical spec/i);
                  const inCmp = cmp.includes(e.id);
                  return (
                    <motion.li key={e.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: duration.fast, ease: ease.out }}>
                      <div id={`source-${e.id}`} className={cn("flex h-full scroll-mt-24 flex-col rounded-[var(--radius-lg)] border bg-ink-800/70 p-4 transition-colors", open === e.id ? "border-teal-400/60" : "border-[var(--line)] hover:border-white/15")}>
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => setOpen(e.id)} className="text-left text-[15px] font-semibold leading-snug text-fog-100 hover:text-paper">
                            {e.name}
                          </button>
                          <Badge>{e.familyLabel}</Badge>
                        </div>
                        <dl className="mt-2 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1 text-[12.5px] leading-snug">
                          <dt className="text-fog-500">λ</dt>
                          <dd className="line-clamp-2 text-fog-200">{wl || "—"}</dd>
                          {pw ? (
                            <>
                              <dt className="text-fog-500">Power</dt>
                              <dd className="line-clamp-2 text-fog-300">{pw}</dd>
                            </>
                          ) : null}
                        </dl>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {e.modes.map((m) => (
                            <span key={m} className="rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] text-fog-400">
                              {m}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                          <button type="button" onClick={() => setOpen(e.id)} className="text-[12.5px] font-medium text-teal-300 hover:text-teal-200">
                            Details
                          </button>
                          <button type="button" onClick={() => toggleCmp(e.id)} aria-pressed={inCmp} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px]", inCmp ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-400 hover:text-fog-100")}>
                            {inCmp ? <Check aria-hidden className="size-3" /> : null} Compare
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
            {shown.length === 0 ? <p className="py-10 text-center text-sm text-fog-500">No source matches these filters.</p> : null}
          </div>
        </div>
      ) : null}

      {view === "compare" ? (
        compared.length ? (
          <div className="scrollbar-thin overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--line)]">
            <table className="hb-table min-w-[720px]">
              <thead>
                <tr>
                  <th className="w-44">Field</th>
                  {compared.map((e) => (
                    <th key={e.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{e.name}</span>
                        <button type="button" aria-label={`Remove ${e.name}`} onClick={() => toggleCmp(e.id)} className="text-fog-500 hover:text-fog-100">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...new Set(compared.flatMap((e) => e.fields.map(([h]) => h)))].map((h) => (
                  <tr key={h}>
                    <td>{h}</td>
                    {compared.map((e) => (
                      <td key={e.id}>{linkRefs(e.fields.find(([k]) => k === h)?.[1] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td>Handbook section</td>
                  {compared.map((e) => (
                    <td key={e.id}>
                      <SourceRef section={e.section} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <Callout kind="note">Select up to three sources with “Compare” in the catalogue to see their handbook rows side by side.</Callout>
        )
      ) : null}

      {view === "wavelengths" ? <WavelengthMap lines={lines} sel={line} onSel={setLine} /> : null}

      {view === "families" ? (
        <div className="scrollbar-thin overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--line)]">
          <table className="hb-table min-w-[860px]">
            <thead>
              <tr>{Object.keys(families[0] ?? {}).map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {families.map((r) => (
                <tr key={r["Family"]}>
                  {Object.values(r).map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-[12px] text-fog-500">
            Handbook §27.1 “Laser families at a glance”. <SourceRef section="27.1" />
          </p>
        </div>
      ) : null}

      <Callout kind="limitation" title="How to read these figures">
        “Typical” means a representative industrial range, not a specification; values marked ≈ are approximate engineering figures. Supplier names
        are representative, not exhaustive or rankings, and supplier-specific numbers must be confirmed against current datasheets (handbook
        conventions, front matter and Part III).
      </Callout>

      <AnimatePresence>
        {opened ? (
          <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={opened.name}>
            <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)} />
            <motion.div
              className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[var(--line)] bg-ink-850"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={spring.gentle}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--line)] bg-ink-850/95 px-6 py-4 backdrop-blur">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">{opened.familyLabel}</div>
                  <h2 className="text-xl font-semibold text-paper">{opened.name}</h2>
                  {opened.joinedFrom ? <p className="text-[12px] text-fog-500">Advantages and applications from the “{opened.joinedFrom}” row of the companion table.</p> : null}
                </div>
                <button type="button" onClick={() => setOpen(null)} className="inline-flex size-9 items-center justify-center rounded text-fog-300 hover:bg-white/[0.06]" aria-label="Close details">
                  <X className="size-5" />
                </button>
              </div>
              <dl className="flex flex-col gap-4 px-6 py-5">
                {opened.fields.map(([h, v]) => (
                  <div key={h}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fog-500">{h}</dt>
                    <dd className="mt-1 text-[14px] leading-relaxed text-fog-100">{linkRefs(v)}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fog-500">Derived filter tags</dt>
                  <dd className="mt-1 flex flex-wrap gap-1 text-[12px] text-fog-400">
                    {opened.modes.map((m) => (
                      <Badge key={m}>{m}</Badge>
                    ))}
                    {opened.wavelengthsNm.map(([a, b], i) => (
                      <Badge key={i}>{a === b ? `${formatNumber(a, 4)} nm` : `${formatNumber(a, 4)}–${formatNumber(b, 4)} nm`}</Badge>
                    ))}
                  </dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
                <SourceRef section={opened.section} />
                <Link href="/calculators/brightness" className="text-[12.5px] text-fog-300 hover:text-teal-200">
                  Brightness & BPP calculator →
                </Link>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ title, options, value, onChange }: { title: string; options: Array<{ id: string; label: string }>; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">{title}</div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={title}>
        <button type="button" onClick={() => onChange(null)} aria-pressed={value === null} className={cn("rounded-full border px-2.5 py-0.5 text-[12px]", value === null ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-400 hover:text-fog-100")}>
          All
        </button>
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => onChange(value === o.id ? null : o.id)} aria-pressed={value === o.id} className={cn("rounded-full border px-2.5 py-0.5 text-[12px]", value === o.id ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-400 hover:text-fog-100")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function WavelengthMap({ lines, sel, onSel }: { lines: Line[]; sel: number; onSel: (i: number) => void }) {
  const W = 1000, H = 150, lo = 150, hi = 12000;
  const X = (nm: number) => 20 + ((Math.log10(nm) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (W - 40);
  const l = lines[sel];
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80 p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Laser wavelength map">
          <line x1={20} x2={W - 20} y1={H - 30} y2={H - 30} stroke="rgba(255,255,255,0.2)" />
          {[200, 500, 1000, 2000, 5000, 10000].map((v) => (
            <text key={v} x={X(v)} y={H - 12} textAnchor="middle" fontSize="10.5" fill="#6f7a88" fontFamily="var(--font-geist-mono)">
              {v >= 1000 ? `${v / 1000} µm` : `${v} nm`}
            </text>
          ))}
          {lines.map((ln, i) => {
            if (!ln.range) return null;
            const [a, b] = ln.range;
            const c = wavelengthColor(((a + b) / 2) * 1e-9).css;
            const active = i === sel;
            const row = i % 3;
            return (
              <g key={i} role="button" tabIndex={0} aria-label={ln["Wavelength"]} aria-pressed={active} onClick={() => onSel(i)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSel(i)} className="cursor-pointer outline-none">
                {a !== b ? <rect x={X(a)} y={H - 36} width={Math.max(2, X(b) - X(a))} height={12} fill={c} opacity={active ? 0.9 : 0.45} rx={2} /> : null}
                <line x1={X((a + b) / 2)} x2={X((a + b) / 2)} y1={H - 30} y2={24 + row * 26} stroke={c} strokeWidth={active ? 2.5 : 1.25} opacity={active ? 1 : 0.65} />
                <circle cx={X((a + b) / 2)} cy={24 + row * 26} r={active ? 5 : 3.5} fill={c} />
                <text x={X((a + b) / 2)} y={16 + row * 26} textAnchor="middle" fontSize="10" fill={active ? "#e6eaee" : "#8b96a4"} fontFamily="var(--font-geist-sans)">
                  {(ln["Wavelength"] ?? "").replace(/\s*\(.*\)/, "")}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-[11.5px] text-fog-500">Log wavelength axis. Colours are approximate for visible lines and false colour outside 380–780 nm. Click a line.</p>
        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {lines.map((ln, i) => (
            <li key={i}>
              <button type="button" onClick={() => onSel(i)} aria-pressed={i === sel} className={cn("w-full rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-left text-[12.5px]", i === sel ? "border-teal-400/50 bg-teal-500/10 text-fog-100" : "border-[var(--line)] text-fog-400 hover:text-fog-100")}>
                <span className="font-mono">{ln["Wavelength"]}</span> <span className="text-fog-500">· {ln["Source technology"]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {l ? (
        <motion.div key={sel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: duration.base, ease: ease.out }} className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-800/70 p-5 xl:sticky xl:top-20 xl:self-start">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">{l["Source technology"]}</div>
          <h3 className="mt-1 font-mono text-2xl text-paper">{l["Wavelength"]}</h3>
          <dl className="mt-4 flex flex-col gap-3 text-[13.5px] leading-relaxed">
            {["Absorbed well by", "Advantages", "Limitations", "Typical applications", "Typical industries"].map((k) => (
              <div key={k}>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-fog-500">{k}</dt>
                <dd className="mt-0.5 text-fog-100">{l[k]}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-center justify-between">
            <SourceRef section="3.8" />
            {l.nm ? (
              <Link href={`/materials?nm=${Math.round(l.nm)}`} className="text-[12.5px] text-fog-300 hover:text-teal-200">
                Try in Material Lab →
              </Link>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
