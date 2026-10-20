"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search, X } from "lucide-react";
import { Badge, ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";

export interface ChainData {
  id: string;
  industry: string;
  product: string;
  component: string;
  material: string;
  process: string;
  laser: string;
  lambda: string;
  power: string;
  pulse: string;
  machine: string;
  families: string[];
}
export interface CaseRef {
  id: string;
  number: number;
  title: string;
  industries: string[];
}

export function ApplicationExplorer({
  chains,
  quality,
  cases,
  requirements,
}: {
  chains: ChainData[];
  quality: Record<string, string>;
  cases: CaseRef[];
  requirements: Array<Record<string, string>>;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const industries = useMemo(() => [...new Set(chains.map((c) => c.industry))], [chains]);
  const [industry, setIndustry] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string>(chains[0]!.id);

  useEffect(() => {
    const ind = params.get("industry");
    if (ind) {
      const match = industries.find((i) => i.toLowerCase() === ind.toLowerCase() || i.toLowerCase().replace(/[^a-z]+/g, "-") === ind.toLowerCase());
      if (match) setIndustry(match);
    }
    const ch = params.get("chain");
    if (ch && chains.some((c) => c.id === ch)) setSel(ch);
  }, [params, industries, chains]);

  const pick = (ind: string | null) => {
    setIndustry(ind);
    const first = chains.find((c) => !ind || c.industry === ind);
    if (first) setSel(first.id);
    router.replace(ind ? `/applications?industry=${encodeURIComponent(ind)}` : "/applications", { scroll: false });
  };

  const list = chains.filter((c) => (!industry || c.industry === industry) && (!q || Object.values(c).join(" ").toLowerCase().includes(q.toLowerCase())));
  const chain = chains.find((c) => c.id === sel) ?? list[0];
  const relatedCases = chain ? cases.filter((k) => k.industries.includes(chain.industry)) : [];
  const req = chain ? requirements.find((r) => (r["Product"] ?? "").toLowerCase().split(/[ ,/]+/).some((w) => w.length > 3 && `${chain.product} ${chain.industry}`.toLowerCase().includes(w))) : undefined;

  const steps: Array<{ label: string; value: string; note?: string; source: string }> = chain
    ? [
        { label: "Industry", value: chain.industry, source: "20.0" },
        { label: "End product", value: chain.product, source: "20.0" },
        { label: "Component", value: chain.component, source: "20.0" },
        { label: "Material", value: chain.material, source: "20.0" },
        ...(req ? [{ label: "Requirement", value: req["Decisive requirements and risks"] ?? "", note: `decisive requirements for “${req["Product"]}”`, source: "23.4" }] : []),
        { label: "Process", value: chain.process, source: "20.0" },
        { label: "Laser source", value: `${chain.laser} · ${chain.lambda}`, note: `average power ≈ ${chain.power} · pulse ${chain.pulse}`, source: "20.0" },
        { label: "Machine", value: chain.machine, source: "20.0" },
        ...(chain.families.length
          ? [{ label: "Quality metrics", value: chain.families.map((f) => `${f}: ${quality[f]}`).join(" | "), note: "process-family metrics from §10.1 (derived mapping)", source: "10.1" }]
          : []),
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by industry">
        <button type="button" onClick={() => pick(null)} aria-pressed={!industry} className={cn("rounded-full border px-3 py-1 text-[12.5px]", !industry ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100")}>
          All industries <span className="text-fog-500">{chains.length}</span>
        </button>
        {industries.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => pick(i)}
            aria-pressed={industry === i}
            className={cn("rounded-full border px-3 py-1 text-[12.5px]", industry === i ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100")}
          >
            {i} <span className="text-fog-500">{chains.filter((c) => c.industry === i).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <label className="flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-ink-850 px-3 focus-within:border-teal-400">
            <Search aria-hidden className="size-4 text-fog-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by product, material, process or laser…" className="w-full bg-transparent text-[13.5px] text-fog-100 outline-none placeholder:text-fog-500" aria-label="Filter applications" />
            {q ? (
              <button type="button" onClick={() => setQ("")} aria-label="Clear filter" className="text-fog-500 hover:text-fog-200">
                <X aria-hidden className="size-4" />
              </button>
            ) : null}
          </label>
          <ul className="scrollbar-thin flex max-h-[640px] flex-col divide-y divide-[var(--line)] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-850/60" aria-label="Application chains">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={chain?.id === c.id}
                  onClick={() => {
                    setSel(c.id);
                    router.replace(`/applications?${industry ? `industry=${encodeURIComponent(industry)}&` : ""}chain=${c.id}`, { scroll: false });
                  }}
                  className={cn("flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors", chain?.id === c.id ? "bg-teal-500/10" : "hover:bg-white/[0.03]")}
                >
                  <span className="text-[11px] uppercase tracking-[0.12em] text-fog-500">
                    {c.industry} · {c.product}
                  </span>
                  <span className={cn("text-[14px]", chain?.id === c.id ? "text-teal-100" : "text-fog-100")}>
                    {c.component} — {c.process}
                  </span>
                  <span className="text-[12px] text-fog-400">
                    {c.material} · {c.laser}
                  </span>
                </button>
              </li>
            ))}
            {!list.length ? <li className="px-4 py-6 text-[13px] text-fog-400">No chains match this filter.</li> : null}
          </ul>
        </div>

        <AnimatePresence mode="wait">
          {chain ? (
            <motion.section
              key={chain.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-800/70 p-5"
              aria-label={`Application chain: ${chain.product}, ${chain.component}`}
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[17px] font-semibold text-paper">
                  {chain.product} · {chain.component}
                </h2>
                <div className="flex gap-1.5">
                  <ClassTag kind="handbook" short />
                  <Badge tone="warn">Typical, not optimal</Badge>
                </div>
              </div>
              <ol className="relative mt-5 flex flex-col gap-0">
                {steps.map((s, i) => (
                  <li key={s.label} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
                    {i < steps.length - 1 ? <span aria-hidden className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-gradient-to-b from-teal-500/50 to-teal-500/10" /> : null}
                    <span className="mt-0.5 grid size-7 place-items-center rounded-full border border-teal-500/40 bg-ink-900 font-mono text-[11px] text-teal-200">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">{s.label}</span>
                        <SourceRef section={s.source} />
                      </div>
                      <div className="mt-0.5 text-[14px] leading-snug text-fog-100">{s.value}</div>
                      {s.note ? <div className="text-[12px] text-fog-500">{s.note}</div> : null}
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                {relatedCases.map((k) => (
                  <Link key={k.id} href={`/applications/${k.id}`} className="inline-flex items-center gap-1 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[12.5px] text-teal-100 hover:bg-teal-500/20">
                    Case {k.number}: {k.title} <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                ))}
                <Link href="/sources" className="inline-flex rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[12.5px] text-fog-200 hover:text-teal-100">
                  Compare sources
                </Link>
                <Link href="/reference/decision-tree" className="inline-flex rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[12.5px] text-fog-200 hover:text-teal-100">
                  Laser selection tree
                </Link>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export interface ProductMapData {
  id: string;
  title: string;
  rows: Array<Record<string, string>>;
}

export function ProductMaps({ maps }: { maps: ProductMapData[] }) {
  const [id, setId] = useState(maps[0]!.id);
  const m = maps.find((x) => x.id === id) ?? maps[0]!;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Product">
        {maps.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={x.id === id}
            onClick={() => setId(x.id)}
            className={cn("rounded-full border px-3 py-1 text-[12.5px]", x.id === id ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100")}
          >
            {x.title.split("(")[0]!.trim()}
          </button>
        ))}
      </div>
      <h3 className="text-[15px] font-semibold text-fog-100">{m.title}</h3>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {m.rows.map((r) => (
          <li key={`${r["Component"]}-${r["Process"]}`} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
            <div className="text-[14px] font-semibold text-paper">{r["Component"]}</div>
            <dl className="mt-2 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-[12.5px] leading-snug">
              <dt className="text-fog-500">Material</dt>
              <dd className="text-fog-200">{r["Material"]}</dd>
              <dt className="text-fog-500">Process</dt>
              <dd className="text-fog-200">{r["Process"]}</dd>
              <dt className="text-fog-500">Laser / λ</dt>
              <dd className="text-teal-100">{r["Laser / λ"]}</dd>
              <dt className="text-fog-500">Machine</dt>
              <dd className="text-fog-200">{r["Machine type"]}</dd>
            </dl>
          </li>
        ))}
      </ul>
      <SourceRef section="19.2" note="exploded application maps" />
    </div>
  );
}
