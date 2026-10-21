"use client";

import { useState } from "react";
import { ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import type { ControlLayer } from "./types";
import { formatSeconds, type LatencyInterval } from "./parse";

/* log axis: 1 ns … 10 s */
const DEC_MIN = -9;
const DEC_MAX = 1;
const W = 780;
const X0 = 138;
const X1 = W - 14;
const xOf = (s: number) => X0 + ((Math.log10(s) - DEC_MIN) / (DEC_MAX - DEC_MIN)) * (X1 - X0);

function barSpan(iv: LatencyInterval): [number, number] {
  if (iv.bound === "order" && iv.lo === iv.hi) return [xOf(iv.lo), xOf(Math.min(10 ** DEC_MAX, iv.lo * 10))];
  return [xOf(iv.lo), xOf(iv.hi)];
}

export function ControlStack({ layers }: { layers: ControlLayer[] }) {
  const [sel, setSel] = useState(0);
  const cur = layers[sel] ?? layers[0]!;
  const top = 34;
  const rowH = 28;
  const H = top + layers.length * rowH + 12;
  const orderOnly = layers.filter((l) => l.interval.bound === "order").map((l) => l.layer);
  const upperOnly = layers.filter((l) => l.interval.bound === "upper").map((l) => l.layer);

  return (
    <section className="@container overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80" aria-labelledby="cs-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Control architecture · §11.2</div>
          <h3 id="cs-title" className="text-[17px] font-semibold text-paper">
            From factory seconds to laser nanoseconds
          </h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fog-400">Select a layer to read its role, typical cycle or latency and typical technology exactly as the handbook tabulates them.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ClassTag kind="handbook" short />
          <ClassTag kind="derived" short />
        </div>
      </div>

      <div className="grid gap-5 p-5 @3xl:grid-cols-[260px_minmax(0,1fr)]">
        <ol className="flex flex-col gap-1" aria-label="Control layers, factory level first">
          {layers.map((l, i) => {
            const on = i === sel;
            const safety = /safety/i.test(l.layer);
            return (
              <li key={l.layer}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSel(i)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2 text-left text-[13.5px] transition-colors",
                    on ? "border-teal-400/60 bg-teal-500/15 text-teal-50" : "border-[var(--line)] bg-ink-800/60 text-fog-200 hover:border-white/20 hover:text-fog-100",
                    safety && !on ? "border-l-2 border-l-danger/60" : "",
                  )}
                >
                  <span className="font-medium">{l.layer}</span>
                  <span className="truncate font-mono text-[11.5px] text-fog-400">{l.latency}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[18px] font-semibold text-paper">{cur.layer}</h4>
              <ClassTag kind="handbook" short />
            </div>
            <dl className="mt-3 grid gap-3 text-[13.5px] @lg:grid-cols-[150px_minmax(0,1fr)]">
              <dt className="text-fog-500">Role</dt>
              <dd className="text-fog-100">{cur.role}</dd>
              <dt className="text-fog-500">Typical cycle / latency (≈)</dt>
              <dd className="font-mono text-teal-100">{cur.latency}</dd>
              <dt className="text-fog-500">Typical technology</dt>
              <dd className="text-fog-200">{cur.technology}</dd>
            </dl>
            <p className="mt-3">
              <SourceRef section="11.2" note="control architecture table" />
            </p>
          </div>

          <figure className="min-w-0">
            <div className="scrollbar-thin overflow-x-auto rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-900 p-2">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px]" role="img" aria-label={`Typical cycle or latency of each control layer on a logarithmic time axis from 1 ns to 10 s; ${cur.layer} selected.`}>
                {Array.from({ length: DEC_MAX - DEC_MIN + 1 }, (_, k) => DEC_MIN + k).map((d) => {
                  const x = xOf(10 ** d);
                  return (
                    <g key={d}>
                      <line x1={x} x2={x} y1={top - 6} y2={H - 8} stroke="rgba(255,255,255,0.06)" />
                      <text x={x} y={16} textAnchor="middle" className="fill-fog-500 font-mono text-[10.5px]">
                        {formatSeconds(10 ** d)}
                      </text>
                    </g>
                  );
                })}
                {layers.map((l, i) => {
                  const y = top + i * rowH;
                  const on = i === sel;
                  const [a, b] = barSpan(l.interval);
                  const w = Math.max(4, b - a);
                  const textW = l.latency.length * 6.3;
                  const right = a + w + 8 + textW < W;
                  const colour = on ? "#59cec7" : "#19b2ab";
                  return (
                    <g key={l.layer} onClick={() => setSel(i)} className="cursor-pointer">
                      <rect x={0} y={y} width={W} height={rowH} fill={on ? "rgba(0,149,144,0.10)" : "transparent"} />
                      <text x={X0 - 10} y={y + rowH / 2 + 4} textAnchor="end" className={cn("text-[12px]", on ? "fill-teal-100 font-semibold" : "fill-fog-300")}>
                        {l.layer}
                      </text>
                      {l.interval.bound === "point" ? (
                        <circle cx={a} cy={y + rowH / 2} r={5} fill={colour} />
                      ) : l.interval.bound === "order" ? (
                        <rect x={a} y={y + 8} width={w} height={rowH - 16} rx={3} fill="rgba(25,178,171,0.12)" stroke={colour} strokeDasharray="4 3" />
                      ) : (
                        <rect x={a} y={y + 8} width={w} height={rowH - 16} rx={3} fill={colour} fillOpacity={on ? 1 : 0.75} />
                      )}
                      {l.interval.bound === "upper" ? (
                        <g stroke={colour} strokeWidth={1.5} fill="none">
                          <line x1={a} x2={a - 34} y1={y + rowH / 2} y2={y + rowH / 2} strokeDasharray="3 3" />
                          <polyline points={`${a - 28},${y + rowH / 2 - 4} ${a - 34},${y + rowH / 2} ${a - 28},${y + rowH / 2 + 4}`} />
                        </g>
                      ) : null}
                      <text
                        x={right ? a + w + 8 : (l.interval.bound === "upper" ? a - 40 : a - 8)}
                        y={y + rowH / 2 + 4}
                        textAnchor={right ? "start" : "end"}
                        className={cn("font-mono text-[11px]", on ? "fill-paper" : "fill-fog-400")}
                      >
                        {l.latency}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <figcaption className="mt-2 flex flex-col gap-1.5 text-[11.5px] leading-snug text-fog-500">
              <span>
                Logarithmic time axis, 1 ns to 10 s. Labels are the handbook’s text verbatim; <strong className="font-medium text-fog-300">positions parsed from handbook ranges (derived)</strong>.
              </span>
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-5 rounded-sm bg-teal-400" /> stated range
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-full bg-teal-400" /> single stated value
                </span>
                {orderOnly.length ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="h-2 w-5 rounded-sm border border-dashed border-teal-400" /> unit without a number ({orderOnly.join(", ")}): order of magnitude only
                  </span>
                ) : null}
                {upperOnly.length ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="font-mono text-teal-300">←</span> stated as an upper bound ({upperOnly.join(", ")})
                  </span>
                ) : null}
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
