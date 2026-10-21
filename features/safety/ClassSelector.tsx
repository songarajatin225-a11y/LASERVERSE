"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Badge, ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import type { LaserClass } from "./types";

/**
 * Visual-only ordering colour per class (conceptual ramp from Class 1 to Class 4).
 * It carries no data; the class label and handbook text always accompany it.
 */
function tone(cls: string): string {
  if (cls.startsWith("1")) return "#19b2ab";
  if (cls.startsWith("2")) return "#5aa9ff";
  if (cls === "3R") return "#e9b24c";
  if (cls === "3B") return "#f08a4b";
  return "#f2555a";
}

export function ClassSelector({ classes, aelNote }: { classes: LaserClass[]; aelNote: string }) {
  const [sel, setSel] = useState(classes.find((c) => c.cls === "4")?.cls ?? classes[0]?.cls ?? "");
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const cur = classes.find((c) => c.cls === sel) ?? classes[0];

  const onKey = (e: KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % classes.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + classes.length) % classes.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = classes.length - 1;
    if (next >= 0) {
      e.preventDefault();
      const c = classes[next];
      if (c) {
        setSel(c.cls);
        refs.current[next]?.focus();
      }
    }
  };

  if (!cur) return null;
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Laser class" className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {classes.map((c, i) => {
          const on = c.cls === cur.cls;
          return (
            <button
              key={c.cls}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setSel(c.cls)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-[var(--radius-md)] border px-2 py-2.5 text-center transition-colors",
                on ? "border-teal-400/60 bg-teal-500/[0.12] text-paper" : "border-[var(--line)] bg-ink-800/70 text-fog-300 hover:border-white/20 hover:text-fog-100",
              )}
            >
              <span aria-hidden className="h-1 w-8 rounded-full" style={{ background: tone(c.cls), opacity: on ? 1 : 0.55 }} />
              <span className="text-[11px] uppercase tracking-[0.12em] text-fog-500">Class</span>
              <span className="font-mono text-[17px] font-semibold leading-none">{c.cls}</span>
            </button>
          );
        })}
      </div>

      <article aria-live="polite" className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)] border font-mono text-[18px] font-semibold" style={{ borderColor: tone(cur.cls), color: tone(cur.cls) }}>
              {cur.cls}
            </span>
            <div>
              <h3 className="text-[17px] font-semibold text-paper">Class {cur.cls}</h3>
              <p className="mt-0.5 max-w-2xl text-[14px] leading-snug text-fog-200">{cur.meaning}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClassTag kind="handbook" short />
            <SourceRef section="24.1" />
          </div>
        </div>
        <dl className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/70 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Typical AEL (CW, visible)</dt>
            <dd className="mt-1 font-mono text-[15px] text-paper">{cur.ael}</dd>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/70 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Examples</dt>
            <dd className="mt-1 text-[13.5px] leading-snug text-fog-200">{cur.examples}</dd>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/70 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Key requirements</dt>
            <dd className="mt-1 text-[13.5px] leading-snug text-fog-200">{cur.requirements}</dd>
          </div>
        </dl>
      </article>

      <AelScale classes={classes} selected={cur.cls} />
      <p className="text-[12.5px] leading-relaxed text-fog-400">
        “{aelNote}” <SourceRef section="24.1" />
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ AEL scale */
const W_MIN = 1e-4;
const W_MAX = 10;
const X0 = 24;
const X1 = 496;
const xW = (w: number) => X0 + ((Math.log10(w) - Math.log10(W_MIN)) / (Math.log10(W_MAX) - Math.log10(W_MIN))) * (X1 - X0);
const TICKS: Array<[number, string]> = [
  [1e-4, "0.1 mW"],
  [1e-3, "1 mW"],
  [1e-2, "10 mW"],
  [1e-1, "100 mW"],
  [1, "1 W"],
  [10, "10 W"],
];

interface Band {
  cls: string;
  lo: number | null;
  hi: number | null;
  label: string;
}

/** DERIVED: bands between the numeric limits printed in the AEL column (CW visible only). */
function bandsOf(classes: LaserClass[]): Band[] {
  const upper = classes.filter((c) => c.aelLimit?.op === "≤").sort((a, b) => a.aelLimit!.watts - b.aelLimit!.watts);
  const out: Band[] = upper.map((c, i) => ({ cls: c.cls, lo: i === 0 ? null : upper[i - 1]!.aelLimit!.watts, hi: c.aelLimit!.watts, label: c.ael }));
  for (const c of classes) if (c.aelLimit?.op === ">") out.push({ cls: c.cls, lo: c.aelLimit.watts, hi: null, label: c.ael });
  return out;
}

function AelScale({ classes, selected }: { classes: LaserClass[]; selected: string }) {
  const bands = useMemo(() => bandsOf(classes), [classes]);
  const gid = `ael${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hasBand = bands.some((b) => b.cls === selected);
  const sel = classes.find((c) => c.cls === selected);
  return (
    <figure className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-850/70 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-[13px] font-medium text-fog-200">Where the CW visible power figures sit</figcaption>
        <div className="flex flex-wrap gap-1.5">
          <ClassTag kind="derived" short />
          <Badge tone="fog">Log scale</Badge>
        </div>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <svg viewBox="0 0 520 92" className="h-auto w-full min-w-[440px]" role="img" aria-label={`Logarithmic power scale from 0.1 mW to 10 W showing the upper limits in the AEL column: ${bands.map((b) => `Class ${b.cls} ${b.label}`).join(", ")}.`}>
          <defs>
            {bands
              .filter((b) => b.lo === null)
              .map((b) => (
                <linearGradient key={b.cls} id={`${gid}-fade-${b.cls}`} x1="0" x2="1">
                  <stop offset="0" stopColor={tone(b.cls)} stopOpacity="0" />
                  <stop offset="0.45" stopColor={tone(b.cls)} stopOpacity="1" />
                </linearGradient>
              ))}
          </defs>
          {bands.map((b) => {
            const xa = b.lo === null ? X0 : xW(b.lo);
            const xb = b.hi === null ? X1 : xW(b.hi);
            const on = b.cls === selected;
            const color = tone(b.cls);
            return (
              <g key={b.cls}>
                <rect
                  x={xa}
                  y={22}
                  width={Math.max(2, xb - xa)}
                  height={24}
                  rx={4}
                  fill={b.lo === null ? `url(#${gid}-fade-${b.cls})` : color}
                  fillOpacity={on ? 0.55 : 0.16}
                  stroke={on && b.lo !== null ? color : "none"}
                  strokeWidth={1.5}
                />
                <text x={(xa + xb) / 2} y={38} textAnchor="middle" fontSize={11} fontWeight={600} fill={on ? "#f4f2ed" : "#a9b2bd"}>
                  {b.cls}
                </text>
              </g>
            );
          })}
          <line x1={X0} x2={X1} y1={56} y2={56} stroke="rgb(255 255 255 / 0.2)" />
          {TICKS.map(([w, l]) => (
            <g key={l}>
              <line x1={xW(w)} x2={xW(w)} y1={53} y2={59} stroke="rgb(255 255 255 / 0.35)" />
              <text x={xW(w)} y={72} textAnchor="middle" fontSize={10} fill="#8b96a4">
                {l}
              </text>
            </g>
          ))}
          {bands
            .filter((b) => b.hi !== null)
            .map((b) => (
              <text key={`l-${b.cls}`} x={xW(b.hi!)} y={15} textAnchor="middle" fontSize={10} fill={b.cls === selected ? "#f4f2ed" : "#6f7a88"}>
                {b.label}
              </text>
            ))}
          <text x={X1} y={88} textAnchor="end" fontSize={9.5} fill="#6f7a88">
            power (W), CW visible
          </text>
        </svg>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-fog-500">
        {hasBand
          ? `Class ${selected} is drawn up to the limit printed in its AEL cell (“${sel?.ael}”). Bands are bounded by neighbouring printed limits; the lower bound of the first band (the Class 1 limit) is not given numerically in the table, so it fades out.`
          : `Class ${selected} has no numeric CW visible figure in the AEL column (“${sel?.ael}”), so it is not placed on the scale.`}{" "}
        The scale only orders the handbook’s figures; it does not classify a product, which follows the measurement conditions of IEC 60825-1.
      </p>
    </figure>
  );
}
