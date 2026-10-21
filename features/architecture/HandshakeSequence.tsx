"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Button, ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { useMotionAllowed } from "@/components/shell/MotionProvider";
import type { HandshakeData, HandshakeRow } from "./types";

const W = 720;
const MARGIN = 110;
const HEAD = 44;
const ROW0 = 78;
const ROW_H = 50;
/** UI pacing only — the handbook gives no timings for these signals */
const PACE_MS = 1300;

/** "Both" has no named parties; it is drawn between PLC and Laser (platform interpretation). */
function endpoints(r: HandshakeRow, lanes: string[]): { a: number; b: number; both: boolean } | null {
  const idx = (p: string | null) => (p ? lanes.indexOf(p) : -1);
  if (r.parsed.both) {
    const a = lanes.indexOf("PLC");
    const b = lanes.indexOf("Laser");
    return a >= 0 && b >= 0 ? { a, b, both: true } : null;
  }
  const a = idx(r.parsed.from);
  const b = idx(r.parsed.to);
  return a >= 0 && b >= 0 ? { a, b, both: false } : null;
}

export function HandshakeSequence({ data }: { data: HandshakeData }) {
  const { rows, lanes } = data;
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const motionOK = useMotionAllowed();
  const uid = `hs${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const last = rows.length - 1;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setStep((s) => Math.min(last, s + 1)), PACE_MS);
    return () => window.clearInterval(id);
  }, [playing, last]);
  useEffect(() => {
    if (playing && step >= last) setPlaying(false);
  }, [playing, step, last]);

  const play = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    setStep((s) => (s >= last ? 0 : s + 1));
    setPlaying(true);
  };
  const stepOnce = () => {
    setPlaying(false);
    setStep((s) => (s >= last ? last : s + 1));
  };
  const reset = () => {
    setPlaying(false);
    setStep(-1);
  };

  const laneX = (i: number) => MARGIN + (lanes.length > 1 ? (i * (W - 2 * MARGIN)) / (lanes.length - 1) : (W - 2 * MARGIN) / 2);
  const H = ROW0 + rows.length * ROW_H;
  const cur = step >= 0 ? rows[step] : undefined;

  return (
    <section className="@container overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80" aria-labelledby={`${uid}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Handshake · §12.4</div>
          <h3 id={`${uid}-title`} className="text-[17px] font-semibold text-paper">
            Signals of an in-line marking cycle, in table order
          </h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fog-400">
            Each arrow is one row of the handbook table: signal, direction and meaning are shown verbatim. Lanes are the parties named in the Direction column.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ClassTag kind="handbook" short />
          <ClassTag kind="conceptual" short />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-5 py-3">
        <Button size="sm" variant="primary" onClick={play} aria-label={playing ? "Pause the sequence" : "Play the sequence"}>
          {playing ? <Pause aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button size="sm" onClick={stepOnce} disabled={step >= last} aria-label="Step to the next signal">
          <StepForward aria-hidden className="size-3.5" /> Step
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} disabled={step < 0 && !playing} aria-label="Reset the sequence">
          <RotateCcw aria-hidden className="size-3.5" /> Reset
        </Button>
        <p className="ml-auto min-w-0 text-[12.5px] text-fog-300" aria-live="polite">
          {cur ? (
            <>
              <span className="font-mono text-fog-500">
                {step + 1}/{rows.length}
              </span>{" "}
              <strong className="font-semibold text-paper">{cur.signal}</strong> <span className="text-fog-500">({cur.direction})</span> — {cur.meaning}
            </>
          ) : (
            <span className="text-fog-500">Press Play or Step to start.</span>
          )}
        </p>
      </div>

      <div className="grid gap-5 p-5 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="scrollbar-thin min-w-0 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-900 p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[540px]" role="img" aria-label={`Sequence diagram with lanes ${lanes.join(", ")}; ${rows.length} signals.${cur ? ` Current: ${cur.signal}, ${cur.direction}.` : ""}`}>
            <defs>
              <marker id={`${uid}-ahA`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#59cec7" />
              </marker>
              <marker id={`${uid}-ahD`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#3b4a5f" />
              </marker>
              <marker id={`${uid}-ahV`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#007a75" />
              </marker>
            </defs>
            {lanes.map((l, i) => (
              <g key={l}>
                <rect x={laneX(i) - 52} y={8} width={104} height={HEAD - 14} rx={6} fill={l === "Safety" ? "rgba(242,85,90,0.10)" : "rgba(255,255,255,0.04)"} stroke={l === "Safety" ? "rgba(242,85,90,0.45)" : "rgba(255,255,255,0.16)"} />
                <text x={laneX(i)} y={8 + (HEAD - 14) / 2 + 4.5} textAnchor="middle" className="fill-fog-100 text-[13px] font-semibold">
                  {l}
                </text>
                <line x1={laneX(i)} x2={laneX(i)} y1={HEAD - 4} y2={H - 8} stroke="rgba(255,255,255,0.14)" strokeDasharray="4 4" />
              </g>
            ))}
            {rows.map((r, i) => {
              const e = endpoints(r, lanes);
              const y = ROW0 + i * ROW_H;
              const active = i === step;
              const visited = i < step;
              if (!e) return null;
              const xa = laneX(e.a);
              const xb = laneX(e.b);
              const dir = xb > xa ? 1 : -1;
              const x1 = xa + dir * 4;
              const x2 = xb - dir * 4;
              const stroke = active ? "#59cec7" : visited ? "#007a75" : "#3b4a5f";
              const mk = active ? `${uid}-ahA` : visited ? `${uid}-ahV` : `${uid}-ahD`;
              const lineProps = {
                x1,
                x2,
                y1: y,
                y2: y,
                stroke,
                strokeWidth: active ? 2.4 : 1.6,
                strokeDasharray: e.both ? "6 4" : undefined,
                markerEnd: `url(#${mk})`,
                markerStart: e.both ? `url(#${mk})` : undefined,
              };
              return (
                <g key={`${r.signal}-${i}`} onClick={() => { setPlaying(false); setStep(i); }} className="cursor-pointer">
                  <rect x={0} y={y - ROW_H / 2 - 2} width={W} height={ROW_H} fill={active ? "rgba(0,149,144,0.10)" : "transparent"} />
                  <text x={14} y={y + 4} className={cn("font-mono text-[11px]", active ? "fill-teal-200" : "fill-fog-500")}>
                    {i + 1}
                  </text>
                  {active && motionOK && !e.both ? (
                    <motion.line key={`a-${step}`} {...lineProps} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} />
                  ) : (
                    <line {...lineProps} />
                  )}
                  <text x={(xa + xb) / 2} y={y - 8} textAnchor="middle" className={cn("text-[12.5px]", active ? "fill-paper font-semibold" : visited ? "fill-fog-200" : "fill-fog-500")}>
                    {r.signal}
                    {e.both ? " (Both)" : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <ol className="flex flex-col gap-1" aria-label="Handshake signals">
          {rows.map((r, i) => {
            const active = i === step;
            return (
              <li key={`${r.signal}-${i}`}>
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => {
                    setPlaying(false);
                    setStep(i);
                  }}
                  className={cn(
                    "grid w-full grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 rounded-[var(--radius-sm)] border px-2.5 py-2 text-left text-[12.5px] transition-colors",
                    active ? "border-teal-400/60 bg-teal-500/15" : i < step ? "border-[var(--line)] bg-ink-800/60" : "border-[var(--line)] bg-transparent opacity-80 hover:opacity-100",
                  )}
                >
                  <span className="font-mono text-[11px] text-fog-500">{i + 1}</span>
                  <span className="min-w-0">
                    <span className={cn("font-semibold", active ? "text-paper" : "text-fog-100")}>{r.signal}</span>{" "}
                    <span className="font-mono text-[11.5px] text-teal-200/90">{r.direction}</span>
                    <span className="block text-fog-400">{r.meaning}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--line)] px-5 py-4 text-[12px] leading-relaxed text-fog-500 @3xl:flex-row @3xl:items-start @3xl:justify-between">
        <p className="max-w-3xl">
          <ClassTag kind="conceptual" short className="mr-1.5 align-middle" />
          The step-through is a reading aid: the order is the handbook table’s order and the pacing is arbitrary — the handbook gives no timings for these signals, and a real cell
          does not necessarily raise them strictly one after another. For “Both” the handbook names no parties; it is drawn as a two-way dashed arrow between PLC and Laser (platform
          interpretation).
        </p>
        <SourceRef section="12.4" note="handshake table" className="shrink-0" />
      </div>
    </section>
  );
}
