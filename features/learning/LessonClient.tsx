"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { actions, usePersisted } from "@/lib/persistence/store";
import { QUESTION_INDEX } from "@/content/assessments/questions";
import { QuestionCard } from "./QuestionCard";
import { Button, cn } from "@/components/ui/primitives";

/** Lesson completion control. Rule: complete when every knowledge check is answered correctly, or when marked complete manually. */
export function LessonProgress({ lessonId, hasChecks }: { lessonId: string; hasChecks: boolean }) {
  const rec = usePersisted((s) => s.lessons[lessonId]);
  const done = Boolean(rec?.completedAt);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[13px]">
        {done ? <CheckCircle2 aria-hidden className="size-4 text-ok" /> : <Circle aria-hidden className="size-4 text-fog-500" />}
        <span className={done ? "text-fog-100" : "text-fog-400"}>
          {done ? `Completed${rec?.via === "check" ? " via knowledge check" : ""}` : rec?.openedAt ? "Opened — not completed" : "Not started"}
        </span>
      </div>
      {done ? (
        <Button size="sm" variant="ghost" onClick={() => actions.uncompleteLesson(lessonId)}>
          <RotateCcw aria-hidden className="size-3.5" /> Mark as not complete
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => actions.completeLesson(lessonId, "manual")}>
          <CheckCircle2 aria-hidden className="size-3.5" /> Mark as complete
        </Button>
      )}
      <p className="text-[11.5px] leading-snug text-fog-500">
        {hasChecks ? "Answering every knowledge check correctly also completes this lesson." : "This lesson has no knowledge check; mark it complete when you have worked through it."}
      </p>
    </div>
  );
}

export function KnowledgeCheck({ lessonId, questionIds }: { lessonId: string; questionIds: string[] }) {
  const checks = usePersisted((s) => s.checks);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const questions = questionIds.map((id) => QUESTION_INDEX.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q));
  const correct = questions.filter((q) => checks[q.id]?.correct).length;
  return (
    <section aria-labelledby="kc-title" className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Knowledge check</div>
          <h2 id="kc-title" className="mt-1 text-xl font-semibold text-paper">
            Test your understanding
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[12.5px] text-fog-400">
          <span className="tabular">
            {mounted ? correct : 0} / {questions.length} correct
          </span>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-ink-600" aria-hidden>
            <motion.div className="h-full bg-ok" animate={{ width: `${((mounted ? correct : 0) / Math.max(1, questions.length)) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            onAnswer={(r) => {
              actions.recordCheck(q.id, r.correct);
              const s = { ...checks, [q.id]: { correct: r.correct, at: "" } };
              if (questions.every((qq) => s[qq.id]?.correct)) actions.completeLesson(lessonId, "check");
            }}
          />
        ))}
      </div>
      <p className={cn("mt-3 text-[12px] text-fog-500")}>Learning assessment only — not a professional certification.</p>
    </section>
  );
}

/** Completed / total badge for a set of lessons (part cards, level cards). */
export function CompletionMeter({ lessonIds, label = "lessons", compact = false }: { lessonIds: string[]; label?: string; compact?: boolean }) {
  const lessons = usePersisted((s) => s.lessons);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const done = mounted ? lessonIds.filter((id) => lessons[id]?.completedAt).length : 0;
  const opened = mounted ? lessonIds.filter((id) => lessons[id]?.openedAt).length : 0;
  const pct = lessonIds.length ? done / lessonIds.length : 0;
  return (
    <div className={cn("flex items-center gap-2.5", compact ? "text-[11.5px]" : "text-[12.5px]")}>
      <div className={cn("overflow-hidden rounded-full bg-ink-600", compact ? "h-1 w-16" : "h-1.5 w-24")} aria-hidden>
        <motion.div className="h-full bg-teal-400" initial={false} animate={{ width: `${pct * 100}%` }} />
      </div>
      <span className="tabular text-fog-400">
        {done}/{lessonIds.length} {label}
        {!compact && opened > done ? <span className="text-fog-500"> · {opened - done} in progress</span> : null}
      </span>
    </div>
  );
}
