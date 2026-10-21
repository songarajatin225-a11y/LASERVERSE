"use client";

import { useId, useRef, useState, useCallback, type ReactNode, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { cn } from "./primitives";
import { spring } from "../motion/tokens";
import { Sym } from "./Sym";

/* ------------------------------------------------------------------ tabs */
export interface TabDef {
  id: string;
  label: ReactNode;
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
  size = "md",
  label,
}: {
  tabs: TabDef[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
  label: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const groupId = useId();
  const onKey = (e: KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      const t = tabs[next];
      if (t) {
        onChange(t.id);
        refs.current[next]?.focus();
      }
    }
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("scrollbar-thin flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850 p-1", className)}
    >
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`${groupId}-${t.id}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative shrink-0 rounded-[var(--radius-sm)] font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-[12.5px]" : "px-3.5 py-1.5 text-[13.5px]",
              active ? "text-paper" : "text-fog-400 hover:text-fog-100",
            )}
          >
            {active ? (
              <motion.span layoutId={`tab-${groupId}`} transition={spring.layout} className="absolute inset-0 rounded-[var(--radius-sm)] bg-white/[0.08] shadow-[0_0_0_1px_rgb(255_255_255/0.06)_inset]" />
            ) : null}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ segmented */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[var(--radius-sm)] px-2.5 py-1 text-[12.5px] font-medium transition-colors",
            o.value === value ? "bg-teal-500/20 text-teal-100 shadow-[0_0_0_1px_rgb(0_149_144/0.5)_inset]" : "text-fog-400 hover:text-fog-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ switch */
export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
          checked ? "border-teal-400 bg-teal-500/70" : "border-white/15 bg-ink-600",
        )}
      >
        <motion.span layout transition={spring.snappy} className={cn("size-3.5 rounded-full bg-paper shadow", checked ? "ml-[18px]" : "ml-[2px]")} />
      </button>
      <label htmlFor={id} className="cursor-pointer text-[13.5px] leading-snug text-fog-200">
        {label}
        {description ? <span className="block text-[12px] text-fog-500">{description}</span> : null}
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ range */
export interface RangeFieldProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** logarithmic slider mapping (value must be > 0) */
  log?: boolean;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  unit?: ReactNode;
  hint?: ReactNode;
  symbol?: ReactNode;
  className?: string;
}

export function RangeField({ label, value, min, max, step, log, onChange, format, unit, hint, symbol, className }: RangeFieldProps) {
  const id = useId();
  const toSlider = (v: number) => (log ? (Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) : (v - min) / (max - min));
  const fromSlider = (t: number) => (log ? 10 ** (Math.log10(min) + t * (Math.log10(max) - Math.log10(min))) : min + t * (max - min));
  const t = Math.min(1, Math.max(0, toSlider(value)));
  const steps = 1000;
  const display = format ? format(value) : String(value);
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] text-fog-300">
          {label} {symbol ? <span className="text-fog-500">({typeof symbol === "string" ? <Sym s={symbol} /> : symbol})</span> : null}
        </label>
        <output htmlFor={id} className="tabular font-mono text-[13px] text-paper">
          {display}
          {unit ? <span className="ml-1 text-fog-400">{unit}</span> : null}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="lv-range"
        min={0}
        max={steps}
        step={1}
        value={Math.round(t * steps)}
        style={{ ["--fill" as string]: `${t * 100}%` }}
        aria-valuetext={`${display}${typeof unit === "string" ? ` ${unit}` : ""}`}
        onChange={(e) => {
          let v = fromSlider(Number(e.target.value) / steps);
          if (step && !log) v = Math.round(v / step) * step;
          if (log) {
            const mag = 10 ** Math.floor(Math.log10(v));
            v = Math.round((v / mag) * 100) / 100 * mag;
          }
          onChange(Math.min(max, Math.max(min, v)));
        }}
      />
      {hint ? <p className="text-[11.5px] leading-snug text-fog-500">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ select */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  hint,
}: {
  label: ReactNode;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  className?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-[13px] text-fog-300">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-ink-850 px-2.5 text-[13.5px] text-fog-100 outline-none focus-visible:border-teal-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-[11.5px] leading-snug text-fog-500">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ copy */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      setDone(false);
    }
  }, [text]);
  return (
    <button
      type="button"
      onClick={copy}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] px-2.5 text-[12.5px] text-fog-300 hover:text-fog-100", className)}
      aria-live="polite"
    >
      {done ? <Check aria-hidden className="size-3.5 text-ok" /> : <Copy aria-hidden className="size-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}
