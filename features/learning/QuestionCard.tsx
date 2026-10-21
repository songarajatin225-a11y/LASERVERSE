"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Lightbulb } from "lucide-react";
import type { Question } from "@/content/assessments/questions";
import { SourceRef } from "@/components/ui/SourceRef";
import { Button, cn } from "@/components/ui/primitives";
import { duration, ease, spring } from "@/components/motion/tokens";

export interface AnswerRecord {
  correct: boolean;
  response: string;
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function gradeNumeric(q: Extract<Question, { type: "numeric" }>, text: string): boolean {
  const v = Number(text.trim().replace(/,/g, "").replace(/[×x]10\^?/i, "e"));
  if (!Number.isFinite(v)) return false;
  return Math.abs(v - q.answer) / Math.abs(q.answer) <= q.tolerance;
}

/**
 * One assessment item with check, hint, explanation and source reference.
 * `review` shows a stored answer read-only.
 */
export function QuestionCard({
  q,
  index,
  onAnswer,
  review,
}: {
  q: Question;
  index?: number;
  onAnswer?: (r: AnswerRecord) => void;
  review?: AnswerRecord;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AnswerRecord | null>(review ?? null);
  const [showHint, setShowHint] = useState(false);
  const rights = useMemo(() => (q.type === "match" ? seededShuffle(q.pairs.map((p) => p[1]), q.id) : []), [q]);
  const locked = Boolean(result);

  const submit = () => {
    let rec: AnswerRecord;
    if (q.type === "mcq") rec = { correct: choice === q.answer, response: String(choice) };
    else if (q.type === "numeric") rec = { correct: gradeNumeric(q, text), response: text };
    else rec = { correct: q.pairs.every((p, i) => matches[i] === p[1]), response: JSON.stringify(matches) };
    setResult(rec);
    onAnswer?.(rec);
  };
  const canSubmit = q.type === "mcq" ? choice !== null : q.type === "numeric" ? text.trim() !== "" : Object.keys(matches).length === (q.type === "match" ? q.pairs.length : 0);
  const reviewedChoice = review && q.type === "mcq" ? Number(review.response) : choice;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-5">
      <div className="mb-3 flex items-start gap-3">
        {index !== undefined ? <span className="tabular mt-0.5 font-mono text-[12px] text-fog-500">{String(index + 1).padStart(2, "0")}</span> : null}
        <p className="text-[15px] font-medium leading-snug text-paper">{q.prompt}</p>
      </div>

      {q.type === "mcq" ? (
        <div role="radiogroup" aria-label="Answer choices" className="flex flex-col gap-2">
          {q.choices.map((c, i) => {
            const selected = reviewedChoice === i;
            const isAnswer = locked && i === q.answer;
            const wrongPick = locked && selected && i !== q.answer;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={locked}
                onClick={() => setChoice(i)}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 text-left text-[14px] leading-snug transition-colors",
                  isAnswer ? "border-ok/60 bg-ok/10 text-fog-100" : wrongPick ? "border-danger/60 bg-danger/10 text-fog-100" : selected ? "border-teal-400/70 bg-teal-500/10 text-fog-100" : "border-[var(--line-strong)] text-fog-300 hover:border-white/20 hover:text-fog-100",
                )}
              >
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", selected ? "border-teal-300" : "border-white/30")}>
                  {selected ? <span className="size-2 rounded-full bg-teal-300" /> : null}
                </span>
                <span>{c}</span>
                {isAnswer ? <Check aria-label="Correct answer" className="ml-auto size-4 shrink-0 text-ok" /> : null}
                {wrongPick ? <X aria-label="Your answer" className="ml-auto size-4 shrink-0 text-danger" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {q.type === "numeric" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`num-${q.id}`}>
            Numerical answer
          </label>
          <input
            id={`num-${q.id}`}
            inputMode="decimal"
            value={review ? review.response : text}
            disabled={locked}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && !locked && submit()}
            placeholder="Your answer"
            className="tabular h-10 w-44 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-ink-850 px-3 font-mono text-[14px] text-paper outline-none focus-visible:border-teal-400"
          />
          {q.unit ? <span className="text-[13.5px] text-fog-400">{q.unit}</span> : null}
          <span className="text-[12px] text-fog-500">tolerance ±{Math.round(q.tolerance * 1000) / 10}%</span>
        </div>
      ) : null}

      {q.type === "match" ? (
        <div className="flex flex-col gap-2">
          {q.pairs.map((p, i) => {
            const val = review ? (JSON.parse(review.response) as Record<string, string>)[i] : matches[i];
            const ok = locked && val === p[1];
            return (
              <div key={i} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <span className="text-[14px] text-fog-200">{p[0]}</span>
                <select
                  aria-label={`Match for ${p[0]}`}
                  disabled={locked}
                  value={val ?? ""}
                  onChange={(e) => setMatches((m) => ({ ...m, [i]: e.target.value }))}
                  className={cn("h-9 rounded-[var(--radius-sm)] border bg-ink-850 px-2 text-[13.5px] text-fog-100", locked ? (ok ? "border-ok/60" : "border-danger/60") : "border-[var(--line-strong)]")}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {rights.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!locked ? (
          <Button variant="primary" size="sm" disabled={!canSubmit} onClick={submit}>
            Check answer
          </Button>
        ) : null}
        {!locked && q.hint ? (
          <Button size="sm" variant="ghost" onClick={() => setShowHint((h) => !h)} aria-expanded={showHint}>
            <Lightbulb aria-hidden className="size-3.5" /> Hint
          </Button>
        ) : null}
        <span className="ml-auto">
          <SourceRef section={q.section} />
        </span>
      </div>
      <AnimatePresence initial={false}>
        {showHint && !locked && q.hint ? (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden text-[13px] text-fog-400">
            {q.hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {result ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className={cn("mt-4 rounded-[var(--radius-md)] border px-4 py-3 text-[13.5px] leading-relaxed", result.correct ? "border-ok/40 bg-ok/[0.07]" : "border-danger/40 bg-danger/[0.07]")}
            aria-live="polite"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={spring.snappy} className={cn("mb-1 flex items-center gap-1.5 font-semibold", result.correct ? "text-ok" : "text-danger")}>
              {result.correct ? <Check aria-hidden className="size-4" /> : <X aria-hidden className="size-4" />}
              {result.correct ? "Correct" : q.type === "numeric" ? `Not quite — expected ≈ ${q.answer.toLocaleString("en-US", { maximumSignificantDigits: 4 })} ${q.unit}` : "Not quite"}
            </motion.div>
            <p className="text-fog-200">{q.explanation}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
