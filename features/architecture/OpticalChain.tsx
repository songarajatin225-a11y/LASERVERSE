"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { linkRefs } from "@/components/handbook/linkRefs";
import type { ChainStage } from "./types";

export function OpticalChain({ stages }: { stages: ChainStage[] }) {
  const [sel, setSel] = useState(0);
  const cur = stages[sel] ?? stages[0]!;
  return (
    <section className="@container overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80" aria-labelledby="oc-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Optical chain · §11.1</div>
          <h3 id="oc-title" className="text-[17px] font-semibold text-paper">
            Source to workpiece, one subsystem at a time
          </h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fog-400">Follow the beam. Each chip is a row of the handbook table; where the Machine Explorer has a matching part, open it there.</p>
        </div>
        <ClassTag kind="handbook" short />
      </div>

      <div className="p-5">
        <ol className="flex flex-wrap items-center gap-y-2" aria-label="Optical chain, in beam order">
          {stages.map((s, i) => {
            const on = i === sel;
            return (
              <li key={s.subsystem} className="flex items-center">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSel(i)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                    on ? "border-teal-400/70 bg-teal-500/20 text-teal-50 shadow-[0_0_0_1px_rgb(0_149_144/0.4)_inset]" : "border-[var(--line-strong)] bg-ink-800/60 text-fog-200 hover:border-white/25 hover:text-fog-100",
                  )}
                >
                  <span className="mr-1.5 font-mono text-[11px] text-fog-500">{i + 1}</span>
                  {s.subsystem}
                </button>
                {i < stages.length - 1 ? <ChevronRight aria-hidden className="mx-1 size-4 shrink-0 text-teal-400/70" /> : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[17px] font-semibold text-paper">{cur.subsystem}</h4>
            <ClassTag kind="handbook" short />
          </div>
          <dl className="mt-3 grid gap-3 text-[13.5px] @lg:grid-cols-[150px_minmax(0,1fr)]">
            <dt className="text-fog-500">Function</dt>
            <dd className="text-fog-100">{cur.function}</dd>
            <dt className="text-fog-500">Key specification</dt>
            <dd className="text-fog-200">{cur.spec}</dd>
            <dt className="text-fog-500">Reference</dt>
            <dd className="text-fog-200">{linkRefs(cur.reference)}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
            {cur.componentId ? (
              <Link
                href={`/machine?select=${cur.componentId}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[13px] text-teal-100 hover:bg-teal-500/20"
              >
                Open “{cur.componentName}” in the Machine Explorer <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            ) : (
              <span className="text-[12.5px] text-fog-500">No matching component in the Machine Explorer’s marking-workstation model.</span>
            )}
            <SourceRef section="11.1" note="optical chain table" />
          </div>
          <p className="mt-2 text-[11.5px] text-fog-500">Links to Machine Explorer parts are a platform mapping (not from the handbook) onto its generic marking workstation.</p>
        </div>
      </div>
    </section>
  );
}
