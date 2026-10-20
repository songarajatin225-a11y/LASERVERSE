"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { History, RotateCcw, Trophy } from "lucide-react";
import { QUESTION_INDEX, QUIZZES } from "@/content/assessments/questions";
import { QuestionCard, type AnswerRecord } from "@/features/learning/QuestionCard";
import { actions, usePersisted } from "@/lib/persistence/store";
import { Button, Badge, Panel, cn } from "@/components/ui/primitives";
import { spring } from "@/components/motion/tokens";

export function QuizRunner({ quizId }: { quizId: string }) {
  const quiz = QUIZZES.find((q) => q.id === quizId)!;
  const questions = quiz.questionIds.map((id) => QUESTION_INDEX.get(id)!);
  const attempts = usePersisted((s) => s.quizAttempts.filter((a) => a.quizId === quizId));
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({});
  const [run, setRun] = useState(0);
  const [review, setReview] = useState<number | null>(null);
  const answered = Object.keys(answers).length;
  const score = Object.values(answers).filter((a) => a.correct).length;
  const done = answered === questions.length;
  const [saved, setSaved] = useState(false);

  const best = useMemo(() => attempts.reduce((m, a) => Math.max(m, a.score / a.total), 0), [attempts]);
  const reviewAttempt = review !== null ? attempts[review] : null;

  useEffect(() => {
    if (done && !saved) {
      actions.recordQuiz({ quizId, score, total: questions.length, answers });
      setSaved(true);
    }
  }, [done, saved, quizId, score, questions.length, answers]);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        {reviewAttempt ? (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-info/30 bg-info/[0.06] px-4 py-2.5 text-[13px] text-fog-200">
            <span>
              Review mode — attempt of {new Date(reviewAttempt.at).toLocaleString()} · {reviewAttempt.score}/{reviewAttempt.total}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setReview(null)}>
              Back to quiz
            </Button>
          </div>
        ) : null}
        {questions.map((q, i) => (
          <QuestionCard
            key={`${run}-${review ?? "live"}-${q.id}`}
            q={q}
            index={i}
            review={reviewAttempt ? reviewAttempt.answers[q.id] ?? { correct: false, response: "" } : undefined}
            onAnswer={(r) => setAnswers((a) => ({ ...a, [q.id]: r }))}
          />
        ))}
      </div>
      <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
        <Panel className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">This attempt</div>
          <div className="mt-2 flex items-baseline gap-2">
            <motion.span key={score} initial={{ scale: 0.85, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={spring.snappy} className="tabular text-[34px] font-semibold text-paper">
              {score}
            </motion.span>
            <span className="text-fog-400">/ {questions.length} correct</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-600" aria-hidden>
            <motion.div className="h-full bg-teal-400" animate={{ width: `${(answered / questions.length) * 100}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-fog-500">
            {answered}/{questions.length} answered{done ? " · attempt saved" : ""}
          </p>
          {done ? (
            <div className={cn("mt-4 flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-[13px]", score / questions.length >= 0.8 ? "border-ok/40 text-ok" : "border-warn/40 text-warn")}>
              <Trophy aria-hidden className="size-4" />
              {score / questions.length >= 0.8 ? "Strong result — review any misses below." : "Revisit the cited sections and try again."}
            </div>
          ) : null}
          <Button
            className="mt-4 w-full"
            size="sm"
            onClick={() => {
              setAnswers({});
              setSaved(false);
              setReview(null);
              setRun((r) => r + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <RotateCcw aria-hidden className="size-3.5" /> Restart quiz
          </Button>
        </Panel>
        <Panel className="p-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">
            <History aria-hidden className="size-3.5" /> Attempt history
          </div>
          {attempts.length ? (
            <>
              <p className="mb-2 text-[12.5px] text-fog-400">Best: {Math.round(best * 100)}%</p>
              <ul className="flex flex-col gap-1 text-[12.5px]">
                {attempts
                  .map((a, i) => ({ a, i }))
                  .reverse()
                  .slice(0, 8)
                  .map(({ a, i }) => (
                    <li key={a.at}>
                      <button type="button" onClick={() => setReview(i)} className={cn("flex w-full justify-between rounded px-2 py-1 text-left hover:bg-white/[0.04]", review === i ? "bg-white/[0.06] text-fog-100" : "text-fog-300")}>
                        <span>{new Date(a.at).toLocaleDateString()} {new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="tabular">
                          {a.score}/{a.total}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="text-[12.5px] text-fog-500">No attempts yet. Attempts are stored in this browser only.</p>
          )}
        </Panel>
        <p className="text-[11.5px] leading-snug text-fog-500">
          Learning assessment, not professional certification. Every explanation cites the handbook section it is based on. <Link href="/assessments" className="text-teal-300 underline">All quizzes</Link>
        </p>
        <Badge>{quiz.questionIds.length} questions</Badge>
      </aside>
    </div>
  );
}

export function QuizBestScore({ quizId }: { quizId: string }) {
  const attempts = usePersisted((s) => s.quizAttempts.filter((a) => a.quizId === quizId));
  if (!attempts.length) return <span className="text-[12px] text-fog-500">Not attempted</span>;
  const best = attempts.reduce((m, a) => Math.max(m, a.score / a.total), 0);
  return (
    <span className="text-[12px] text-fog-300">
      Best {Math.round(best * 100)}% · {attempts.length} attempt{attempts.length > 1 ? "s" : ""}
    </span>
  );
}
