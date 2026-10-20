"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { ClassTag, cn } from "@/components/ui/primitives";
import { SourceList, type SourceRefData } from "@/components/ui/SourceRef";
import type { Classification } from "@/lib/content/classification";
import { ResultFlash } from "@/components/motion/primitives";
import { Sym } from "@/components/ui/Sym";

export function LabFrame({
  title,
  eyebrow,
  tags,
  description,
  visual,
  controls,
  readouts,
  footer,
  sources,
  onReset,
  compact = false,
  visualClassName,
}: {
  title: string;
  eyebrow?: string;
  tags: Classification[];
  description?: ReactNode;
  visual: ReactNode;
  controls: ReactNode;
  readouts?: ReactNode;
  footer?: ReactNode;
  sources?: SourceRefData[];
  onReset?: () => void;
  compact?: boolean;
  visualClassName?: string;
}) {
  return (
    <section className="@container overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          {eyebrow ? <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">{eyebrow}</div> : null}
          <h3 className="text-[17px] font-semibold text-paper">{title}</h3>
          {description ? <div className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fog-400">{description}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <ClassTag key={t} kind={t} short />
          ))}
          {onReset ? (
            <button type="button" onClick={onReset} className="ml-1 inline-flex h-7 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[12px] text-fog-400 hover:bg-white/[0.05] hover:text-fog-100">
              <RotateCcw aria-hidden className="size-3.5" /> Reset
            </button>
          ) : null}
        </div>
      </div>
      <div className={cn("grid", compact ? "@4xl:grid-cols-[minmax(0,1fr)_280px]" : "@4xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className={cn("relative flex min-h-[260px] flex-col border-b border-[var(--line)] bg-ink-900 @4xl:border-b-0 @4xl:border-r", visualClassName)}>{visual}</div>
        <div className="flex flex-col gap-4 p-5">{controls}</div>
      </div>
      {readouts ? <div className="border-t border-[var(--line)] bg-ink-850 px-5 py-4">{readouts}</div> : null}
      {footer || sources?.length ? (
        <div className="flex flex-col gap-4 border-t border-[var(--line)] px-5 py-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
          <div className="max-w-3xl text-[12.5px] leading-relaxed text-fog-400">{footer}</div>
          {sources?.length ? <SourceList refs={sources} className="shrink-0" /> : null}
        </div>
      ) : null}
    </section>
  );
}

export function Readout({ label, value, unit, symbol, tone = "default", note }: { label: ReactNode; value: string; unit?: string; symbol?: string; tone?: "default" | "primary" | "warn" | "muted"; note?: ReactNode }) {
  return (
    <div className={cn("min-w-0 rounded-[var(--radius-md)] border px-3 py-2.5", tone === "primary" ? "border-teal-500/30 bg-teal-500/[0.07]" : tone === "warn" ? "border-warn/30 bg-warn/[0.06]" : "border-[var(--line)] bg-ink-800/60")}>
      <div className="truncate text-[11.5px] text-fog-500">
        {label} {symbol ? <Sym s={symbol} className="font-mono text-fog-500" /> : null}
      </div>
      <div className={cn("mt-0.5 font-mono text-[15px]", tone === "muted" ? "text-fog-400" : "text-paper")}>
        <ResultFlash value={value + (unit ?? "")}>
          <span className="tabular">{value}</span>
          {unit ? <span className="ml-1 text-[12px] text-fog-400">{unit}</span> : null}
        </ResultFlash>
      </div>
      {note ? <div className="mt-0.5 text-[11px] leading-snug text-fog-500">{note}</div> : null}
    </div>
  );
}

export function ReadoutGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6 }) {
  const c = { 2: "@lg:grid-cols-2", 3: "@lg:grid-cols-3", 4: "@xl:grid-cols-3 @4xl:grid-cols-4", 5: "@xl:grid-cols-3 @5xl:grid-cols-5", 6: "@xl:grid-cols-3 @5xl:grid-cols-6" }[cols];
  return <div className={cn("grid grid-cols-2 gap-2.5", c)}>{children}</div>;
}

export function ControlGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {title ? <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">{title}</div> : null}
      {children}
    </div>
  );
}

export function PresetChips<T extends string | number>({ options, value, onPick, label }: { options: Array<{ value: T; label: string; title?: string }>; value: T | null; onPick: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onPick(o.value)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[12px] transition-colors",
            o.value === value ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
