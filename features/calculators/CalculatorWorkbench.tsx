"use client";

import Link from "next/link";
import { useMemo, useState, useId } from "react";
import { RotateCcw, ArrowUpRight, AlertTriangle } from "lucide-react";
import { getCalculator } from "./definitions";
import { isChoice, type NumberInput, type CalcOutputDef, CATEGORY_LABEL } from "./types";
import { runCalculator } from "./engine";
import { UNITS, toSI, fromSI, formatQuantity } from "@/lib/physics/units";
import { Panel, PanelHeader, ClassTag, Button, Callout, cn } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/controls";
import { Tex } from "@/components/ui/Tex";
import { Sym } from "@/components/ui/Sym";
import { SourceList } from "@/components/ui/SourceRef";
import { ResultFlash } from "@/components/motion/primitives";
import { BookmarkButton, TrackVisit } from "@/components/shell/Chrome";

interface FieldState {
  text: string;
  unit: string;
}

function parseNum(text: string): number {
  const t = text.trim().replace(/\s/g, "").replace(/[×x]10\^?/i, "e").replace(/,/g, "");
  if (t === "") return Number.NaN;
  return Number(t);
}

function displayText(si: number, inp: NumberInput, unit: string): string {
  const v = fromSI(si, inp.quantity, unit);
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e7)) return v.toExponential(4).replace(/\.?0+e/, "e");
  return String(Number(v.toPrecision(8)));
}

function NumberFieldRow({
  inp,
  state,
  onChange,
  error,
}: {
  inp: NumberInput;
  state: FieldState;
  onChange: (s: FieldState) => void;
  error?: string;
}) {
  const id = useId();
  const units = UNITS[inp.quantity];
  const showUnitSelect = units.length > 1 && !inp.unitLabel;
  const invalid = !Number.isFinite(parseNum(state.text));
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[13px] text-fog-300">
        <span>
          {inp.label}
          {inp.symbol ? <Sym s={inp.symbol} className="ml-1.5 font-mono text-[12px] text-fog-500" /> : null}
        </span>
      </label>
      <div
        className={cn(
          "flex h-10 items-stretch overflow-hidden rounded-[var(--radius-sm)] border bg-ink-850 transition-colors focus-within:border-teal-400",
          invalid || error ? "border-danger/60" : "border-[var(--line-strong)]",
        )}
      >
        <input
          id={id}
          inputMode="decimal"
          value={state.text}
          onChange={(e) => onChange({ ...state, text: e.target.value })}
          className="tabular min-w-0 flex-1 bg-transparent px-3 font-mono text-[14px] text-paper outline-none"
          aria-invalid={invalid || Boolean(error)}
          aria-describedby={error || invalid ? `${id}-err` : inp.help ? `${id}-help` : undefined}
        />
        {showUnitSelect ? (
          <select
            aria-label={`${inp.label} unit`}
            value={state.unit}
            onChange={(e) => {
              const si = toSI(parseNum(state.text), inp.quantity, state.unit);
              onChange({ unit: e.target.value, text: Number.isFinite(si) ? displayText(si, inp, e.target.value) : state.text });
            }}
            className="border-l border-[var(--line)] bg-ink-800 px-2 text-[12.5px] text-fog-300 outline-none"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label || "—"}
              </option>
            ))}
          </select>
        ) : (inp.unitLabel ?? units[0]?.label) ? (
          <span className="flex items-center border-l border-[var(--line)] bg-ink-800 px-2.5 text-[12.5px] text-fog-400">{inp.unitLabel ?? units[0]?.label}</span>
        ) : null}
      </div>
      {invalid ? (
        <p id={`${id}-err`} className="text-[11.5px] text-danger">
          Enter a number (scientific notation such as 1e14 is accepted).
        </p>
      ) : error ? (
        <p id={`${id}-err`} className="text-[11.5px] text-danger">
          {error}
        </p>
      ) : inp.help ? (
        <p id={`${id}-help`} className="text-[11.5px] leading-snug text-fog-500">
          {inp.help}
        </p>
      ) : null}
    </div>
  );
}

function OutputValue({ o, value }: { o: CalcOutputDef; value: number | string | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-fog-500">not applicable</span>;
  if (typeof value === "string" || !o.quantity) return <span className="text-paper">{String(value)}</span>;
  const f = formatQuantity(value, o.quantity, o.unit, o.sig ?? 4);
  const unit = o.unitLabel ?? f.unit;
  return (
    <ResultFlash value={`${f.value}${unit}`}>
      <span className="tabular font-mono text-paper">{f.value}</span>
      {unit ? <span className="ml-1 text-fog-400">{unit}</span> : null}
    </ResultFlash>
  );
}

/**
 * `embedded` renders the workbench inside another page: the title becomes an h2 and the
 * calculator is not recorded in recent activity or offered as a separate bookmark.
 */
export function CalculatorWorkbench({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const def = getCalculator(id);
  if (!def) throw new Error(`Unknown calculator ${id}`);

  const initial = () =>
    Object.fromEntries(def.inputs.map((i) => [i.key, isChoice(i) ? { text: i.value, unit: "" } : { text: String(i.value), unit: i.unit }])) as Record<string, FieldState>;
  const [fields, setFields] = useState<Record<string, FieldState>>(initial);
  const [activeExample, setActiveExample] = useState<string | null>(null);

  const { values, choices, parseError } = useMemo(() => {
    const values: Record<string, number> = {};
    const choices: Record<string, string> = {};
    let parseError = false;
    for (const inp of def.inputs) {
      const st = fields[inp.key]!;
      if (isChoice(inp)) choices[inp.key] = st.text;
      else {
        const n = parseNum(st.text);
        if (!Number.isFinite(n)) parseError = true;
        values[inp.key] = toSI(n, inp.quantity, st.unit);
      }
    }
    return { values, choices, parseError };
  }, [fields, def.inputs]);

  const outcome = useMemo(() => (parseError ? null : runCalculator(def, values, choices)), [def, values, choices, parseError]);
  const errorField = outcome && !outcome.ok ? outcome.field : undefined;
  const ef = errorField?.toLowerCase() ?? "";
  const fieldForError = ef
    ? def.inputs.find((i) => !isChoice(i) && (i.key.toLowerCase() === ef || i.label.toLowerCase().startsWith(ef) || ef.startsWith(i.label.toLowerCase())))
    : undefined;

  const loadExample = (label: string, ex: Record<string, number | string>) => {
    setActiveExample(label);
    setFields(
      Object.fromEntries(
        def.inputs.map((i) => {
          const v = ex[i.key];
          if (isChoice(i)) return [i.key, { text: typeof v === "string" ? v : i.value, unit: "" }];
          return [i.key, { text: String(typeof v === "number" ? v : i.value), unit: i.unit }];
        }),
      ),
    );
  };

  const copyText = useMemo(() => {
    const lines = [`${def.title} — LASERVERSE (derived calculation)`];
    for (const i of def.inputs) {
      const st = fields[i.key]!;
      if (isChoice(i)) lines.push(`${i.label}: ${i.choice.find((c) => c.value === st.text)?.label ?? st.text}`);
      else lines.push(`${i.label}: ${st.text} ${i.unitLabel ?? UNITS[i.quantity].find((u) => u.id === st.unit)?.label ?? ""}`.trim());
    }
    lines.push("—");
    if (outcome?.ok) {
      for (const o of def.outputs) {
        const v = outcome.result[o.key];
        if (v === null || v === undefined) continue;
        if (typeof v === "string" || !o.quantity) lines.push(`${o.label}: ${v}`);
        else {
          const f = formatQuantity(v, o.quantity, o.unit, o.sig ?? 4);
          lines.push(`${o.label}: ${f.value} ${o.unitLabel ?? f.unit}`.trim());
        }
      }
    }
    lines.push(`Sources: ${def.sources.map((s) => `§${s.section}`).join(", ")} of The Complete Laser Handbook`);
    return lines.join("\n");
  }, [def, fields, outcome]);

  const primary = def.outputs.filter((o) => o.primary);
  const secondary = def.outputs.filter((o) => !o.primary);
  const interpretation = outcome?.ok && def.interpret ? def.interpret(outcome.result, values, choices) : [];

  return (
    <div>
      {embedded ? null : <TrackVisit item={{ id: `calc:${def.id}`, kind: "calculator", title: def.title, href: `/calculators/${def.id}` }} />}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">{CATEGORY_LABEL[def.category]}</span>
            <ClassTag kind={def.classification} />
          </div>
          {embedded ? (
            <h2 className="text-balance text-[clamp(1.3rem,2.2vw,1.8rem)] font-semibold leading-tight tracking-[-0.02em] text-paper">
              <Link href={`/calculators/${def.id}`} className="hover:text-teal-100">
                {def.title}
              </Link>
            </h2>
          ) : (
            <h1 className="text-balance text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-paper">{def.title}</h1>
          )}
          <p className="mt-2 text-[15px] leading-relaxed text-fog-300">{def.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {embedded ? null : <BookmarkButton item={{ id: `calc:${def.id}`, kind: "calculator", title: def.title, href: `/calculators/${def.id}` }} />}
          <CopyButton text={copyText} label="Copy result" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Panel>
          <PanelHeader
            title="Inputs"
            eyebrow="Unit-aware"
            actions={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFields(initial());
                  setActiveExample(null);
                }}
              >
                <RotateCcw aria-hidden className="size-3.5" /> Reset
              </Button>
            }
          />
          <div className="flex flex-col gap-4 p-5">
            {def.examples?.length ? (
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Examples</div>
                <div className="flex flex-wrap gap-1.5">
                  {def.examples.map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      onClick={() => loadExample(ex.label, ex.values)}
                      title={ex.note}
                      aria-pressed={activeExample === ex.label}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                        activeExample === ex.label ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100",
                      )}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {def.inputs.map((inp) =>
              isChoice(inp) ? (
                <div key={inp.key} className="flex flex-col gap-1">
                  <label className="text-[13px] text-fog-300" htmlFor={`choice-${inp.key}`}>
                    {inp.label}
                  </label>
                  <select
                    id={`choice-${inp.key}`}
                    value={fields[inp.key]!.text}
                    onChange={(e) => setFields((f) => ({ ...f, [inp.key]: { text: e.target.value, unit: "" } }))}
                    className="h-10 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-ink-850 px-2.5 text-[13.5px] text-fog-100 outline-none focus-visible:border-teal-400"
                  >
                    {inp.choice.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <NumberFieldRow
                  key={inp.key}
                  inp={inp}
                  state={fields[inp.key]!}
                  onChange={(s) => {
                    setActiveExample(null);
                    setFields((f) => ({ ...f, [inp.key]: s }));
                  }}
                  error={fieldForError?.key === inp.key && outcome && !outcome.ok ? outcome.message : undefined}
                />
              ),
            )}
            {def.externalNote ? (
              <Callout kind="limitation" title="External / illustrative data">
                {def.externalNote}
              </Callout>
            ) : null}
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader title="Results" eyebrow="Derived from the inputs" />
            <div className="p-5" aria-live="polite">
              {outcome && !outcome.ok ? (
                <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/40 bg-danger/[0.06] px-4 py-3 text-[13.5px] text-[#ffc9cb]">
                  <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>{outcome.message}. No result is shown until the inputs are valid.</span>
                </div>
              ) : parseError ? (
                <p className="text-[13.5px] text-fog-500">Waiting for valid numeric inputs…</p>
              ) : outcome?.ok ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {primary.map((o) => (
                      <div key={o.key} className="rounded-[var(--radius-md)] border border-teal-500/25 bg-teal-500/[0.06] px-4 py-3.5">
                        <div className="text-[12px] text-fog-400">
                          {o.label} {o.symbol ? <Sym s={o.symbol} className="font-mono text-fog-500" /> : null}
                        </div>
                        <div className="mt-1 text-[22px] font-medium leading-tight">
                          <OutputValue o={o} value={outcome.result[o.key]} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {secondary.length ? (
                    <dl className="mt-4 divide-y divide-[var(--line)]">
                      {secondary.map((o) => (
                        <div key={o.key} className="flex items-baseline justify-between gap-4 py-2 text-[13.5px]">
                          <dt className="text-fog-400">
                            {o.label} {o.symbol ? <Sym s={o.symbol} className="font-mono text-[12px] text-fog-500" /> : null}
                          </dt>
                          <dd className="text-right">
                            <OutputValue o={o} value={outcome.result[o.key]} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {interpretation.length ? (
                    <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--line)] bg-white/[0.02] px-4 py-3">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Interpretation</div>
                      <ul className="list-disc space-y-1 pl-4 text-[13.5px] leading-relaxed text-fog-200">
                        {interpretation.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Model" eyebrow="Equation · variables · assumptions" />
            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850 px-4 py-4">
                {def.equations.map((eq, i) => (
                  <Tex key={i} math={eq} display />
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="hb-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Meaning</th>
                      <th>SI unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {def.variables.map((v) => (
                      <tr key={v.symbol}>
                        <td className="font-mono">
                          <Sym s={v.symbol} />
                        </td>
                        <td>{v.meaning}</td>
                        <td className="whitespace-nowrap">{v.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Callout kind="assumption">
                <ul>
                  {def.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </Callout>
              {def.limitations?.length ? (
                <Callout kind="limitation">
                  <ul>
                    {def.limitations.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </Callout>
              ) : null}
              <div className="flex flex-wrap justify-between gap-6">
                <SourceList refs={def.sources} />
                {def.related ? (
                  <div className="text-[12.5px]">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Related</div>
                    <ul className="flex flex-col gap-1">
                      {def.related.calculators?.map((r) => (
                        <li key={r}>
                          <Link href={`/calculators/${r}`} className="inline-flex items-center gap-1 text-fog-200 hover:text-teal-200">
                            {getCalculator(r)?.title} <ArrowUpRight aria-hidden className="size-3" />
                          </Link>
                        </li>
                      ))}
                      {def.related.tools?.map((t) => (
                        <li key={t.href}>
                          <Link href={t.href} className="inline-flex items-center gap-1 text-fog-200 hover:text-teal-200">
                            {t.label} <ArrowUpRight aria-hidden className="size-3" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>
        </div>
      </div>
      <p className="mt-4 text-[12px] text-fog-500">Results are displayed to four significant figures; large and small values use scientific notation (a × 10ⁿ).</p>
    </div>
  );
}
