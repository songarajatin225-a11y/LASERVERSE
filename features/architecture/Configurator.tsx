"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import type { ConfiguratorFamily } from "./types";

export function Configurator({
  families,
  machinePanels,
  quotes,
}: {
  families: ConfiguratorFamily[];
  /** server-rendered §26.1 tables keyed by family id */
  machinePanels: Record<string, ReactNode>;
  quotes: { costShares: string; costCaveat: string; costPatterns: string; generic: string };
}) {
  const [id, setId] = useState(families[0]?.id ?? "");
  const fam = families.find((f) => f.id === id) ?? families[0]!;
  const maxHi = Math.max(...families.flatMap((f) => f.cost?.entries.map((e) => e.range?.hi ?? 0) ?? [0]));
  const AX = Math.max(10, Math.ceil(maxHi / 10) * 10);
  const ticks = Array.from({ length: AX / 10 + 1 }, (_, i) => i * 10);
  const costHeaders = families.flatMap((f) => (f.cost ? [f.cost.header] : []));

  return (
    <section className="@container overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80" aria-labelledby="cfg-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Conceptual configurator · §26.1 · §23.1</div>
          <h3 id="cfg-title" className="text-[17px] font-semibold text-paper">
            Reference architecture by application family
          </h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fog-400">
            “{quotes.generic}” <SourceRef section="26.1" />
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ClassTag kind="conceptual" short />
          <ClassTag kind="handbook" short />
          <ClassTag kind="derived" short />
        </div>
      </div>

      <div className="flex items-start gap-3 border-b border-warn/30 bg-warn/[0.08] px-5 py-3 text-[14px] font-medium text-[#f6d79a]" role="note">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>Shows the handbook’s reference architecture; it does not design, size or quote a machine.</p>
      </div>

      <div className="flex flex-col gap-6 p-5">
        <div role="group" aria-label="Application family" className="grid grid-cols-1 gap-1.5 @md:grid-cols-2 @3xl:grid-cols-3">
          {families.map((f) => {
            const on = f.id === fam.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setId(f.id)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-left text-[13.5px] transition-colors",
                  on ? "border-teal-400/60 bg-teal-500/15 text-teal-50" : "border-[var(--line)] bg-ink-800/60 text-fog-200 hover:border-white/20 hover:text-fog-100",
                )}
              >
                <span>{f.label}</span>
                {f.cost ? <span className="font-mono text-[10.5px] text-fog-500">+ §23.1</span> : null}
              </button>
            );
          })}
        </div>
        <p className="-mt-4 text-[11.5px] leading-snug text-fog-500">
          Which §26.1 reference machine and which §23.1 column belong to each application family is a platform mapping (not from the handbook); the tables and entries shown are the
          handbook’s own.
        </p>

        <p className="sr-only" aria-live="polite">
          {`${fam.label}: ${fam.machineTitle}${fam.cost ? `, with the ${fam.cost.header} cost structure` : ", no matching cost-structure column"}`}
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-[16px] font-semibold text-paper">
              <span className="text-fog-500">Reference machine · </span>
              {fam.machineTitle}
            </h4>
            <SourceRef section="26.1" note="reference machine architectures" />
          </div>
          <div className="[&_figure]:my-2">{machinePanels[fam.id]}</div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-[16px] font-semibold text-paper">
              <span className="text-fog-500">Cost structure · </span>
              {fam.cost ? fam.cost.header : "no matching §23.1 column"}
            </h4>
            <SourceRef section="23.1" note="machine cost structure" />
          </div>
          {fam.cost ? (
            <>
              <p className="text-[13px] leading-relaxed text-fog-300">
                <ClassTag kind="handbook" short className="mr-1.5 align-middle" />“{quotes.costShares}”
              </p>
              <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-900 p-3">
                <div className="mb-1 hidden grid-cols-[15rem_minmax(0,1fr)_11rem] gap-x-3 @2xl:grid" aria-hidden>
                  <span />
                  <span className="relative h-4">
                    {ticks.map((t) => (
                      <span key={t} className="absolute top-0 -translate-x-1/2 font-mono text-[10px] text-fog-500" style={{ left: `${(t / AX) * 100}%` }}>
                        {t}%
                      </span>
                    ))}
                  </span>
                  <span />
                </div>
                <ul className="flex flex-col gap-2" aria-label={`Cost shares for ${fam.cost.header}`}>
                  {fam.cost.entries.map((e) => (
                    <li key={e.block} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 @2xl:grid-cols-[15rem_minmax(0,1fr)_11rem]">
                      <span className="text-[12.5px] leading-snug text-fog-200 @2xl:order-1">{e.block}</span>
                      <span className="text-right font-mono text-[12px] text-paper @2xl:order-3 @2xl:text-left">{e.text}</span>
                      <span className="relative col-span-2 h-3 rounded bg-white/[0.04] @2xl:order-2 @2xl:col-span-1" aria-hidden>
                        {ticks.slice(1, -1).map((t) => (
                          <span key={t} className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: `${(t / AX) * 100}%` }} />
                        ))}
                        {e.range ? (
                          <span
                            className="absolute inset-y-0 rounded bg-teal-400/85"
                            style={{ left: `${(e.range.lo / AX) * 100}%`, width: `max(3px, ${((e.range.hi - e.range.lo) / AX) * 100}%)` }}
                          />
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11.5px] leading-snug text-fog-500">
                  Text is the handbook’s entry verbatim; <strong className="font-medium text-fog-300">bar positions parsed from handbook ranges (derived)</strong>, 0–{AX}% axis. “—” means
                  the handbook gives no share for that block. No totals are computed.
                </p>
              </div>
            </>
          ) : (
            <p className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/60 px-4 py-3 text-[13px] text-fog-300">
              The handbook’s cost-structure table has columns for {costHeaders.length} machine types only ({costHeaders.join("; ")}); none corresponds to this family, so no cost structure is shown.
            </p>
          )}
          <div className="grid gap-3 @3xl:grid-cols-2">
            <p className="rounded-[var(--radius-md)] border border-warn/30 bg-warn/[0.06] px-4 py-3 text-[13px] leading-relaxed text-fog-200">
              <ClassTag kind="handbook" short className="mr-1.5 align-middle" />“{quotes.costCaveat}” <SourceRef section="23.1" />
            </p>
            <p className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/60 px-4 py-3 text-[13px] leading-relaxed text-fog-200">
              <ClassTag kind="handbook" short className="mr-1.5 align-middle" />“{quotes.costPatterns}” <SourceRef section="23.1" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
