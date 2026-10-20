"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, Clock, Download, RotateCcw, Trash2, Trophy } from "lucide-react";
import { Button, cn } from "@/components/ui/primitives";
import { actions, usePersisted, type ItemRef } from "@/lib/persistence/store";

export interface LevelSummary {
  id: string;
  name: string;
  lessons: Array<{ id: string; href: string }>;
}

const KIND_LABEL: Record<ItemRef["kind"], string> = {
  lesson: "Lesson",
  part: "Part",
  tool: "Tool",
  calculator: "Calculator",
  application: "Application",
  quiz: "Assessment",
  reference: "Reference",
  page: "Page",
};

function when(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return d.toLocaleDateString();
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function ProgressOverview({ levels, totalLessons }: { levels: LevelSummary[]; totalLessons: number }) {
  const lessons = usePersisted((s) => s.lessons);
  const mounted = useMounted();
  const done = mounted ? Object.values(lessons).filter((l) => l.completedAt).length : 0;
  const opened = mounted ? Object.keys(lessons).length : 0;
  return (
    <section aria-labelledby="progress-title" className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-800/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="progress-title" className="text-[15px] font-semibold text-fog-100">
            Learning progress
          </h2>
          <p className="mt-1 text-[12.5px] text-fog-500">Stored in this browser only. A lesson counts as complete when its checks are answered correctly or you mark it complete.</p>
        </div>
        <div className="text-right">
          <div className="tabular font-mono text-[28px] leading-none text-paper">
            {done}
            <span className="text-[16px] text-fog-500">/{totalLessons}</span>
          </div>
          <div className="mt-1 text-[12px] text-fog-400">{opened > done ? `${opened - done} in progress` : "lessons complete"}</div>
        </div>
      </div>
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((l) => {
          const total = l.lessons.length;
          const d = mounted ? l.lessons.filter((x) => lessons[x.id]?.completedAt).length : 0;
          const pct = total ? d / total : 0;
          const next = (mounted ? l.lessons.find((x) => !lessons[x.id]?.completedAt) : undefined) ?? l.lessons[0];
          return (
            <li key={l.id} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/70 p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-fog-100">
                  <span className="mr-1.5 font-mono text-teal-300">{l.id}</span>
                  {l.name}
                </span>
                <span className="tabular text-[11.5px] text-fog-500">
                  {d}/{total}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-600" aria-hidden>
                <div className="h-full bg-teal-400 transition-[width] duration-500" style={{ width: `${pct * 100}%` }} />
              </div>
              {next ? (
                <Link href={next.href} className="mt-2.5 inline-flex items-center gap-1 text-[12px] text-teal-300 hover:text-teal-200">
                  {d === 0 ? "Start level" : d === total ? "Review" : "Continue"} <ArrowRight aria-hidden className="size-3" />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ContinueCard() {
  const recent = usePersisted((s) => s.recent);
  const mounted = useMounted();
  const lastLesson = mounted ? recent.find((r) => r.kind === "lesson") : undefined;
  const lastTool = mounted ? recent.find((r) => r.kind === "tool" || r.kind === "calculator") : undefined;
  return (
    <section aria-label="Continue" className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.08] to-transparent p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-fog-100">Pick up where you left off</h2>
      {lastLesson || lastTool ? (
        <div className="flex flex-col gap-2">
          {[lastLesson, lastTool].filter(Boolean).map((r) => (
            <Link key={r!.id} href={r!.href} className="group flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/70 px-3.5 py-3 hover:border-teal-400/40">
              <span className="min-w-0">
                <span className="block text-[11px] uppercase tracking-[0.14em] text-fog-500">{KIND_LABEL[r!.kind]}</span>
                <span className="block truncate text-[14px] text-fog-100">{r!.title}</span>
              </span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-fog-500 group-hover:text-teal-300" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[13.5px] leading-relaxed text-fog-300">
          Nothing yet. Start with{" "}
          <Link className="text-teal-300 underline underline-offset-2" href="/learn/part-1">
            Part I — Physics
          </Link>
          , open the{" "}
          <Link className="text-teal-300 underline underline-offset-2" href="/machine">
            3D machine
          </Link>
          , or press <kbd className="rounded border border-white/15 px-1 font-mono text-[11px]">/</kbd> to search.
        </p>
      )}
    </section>
  );
}

export function QuizSummary() {
  const attempts = usePersisted((s) => s.quizAttempts);
  const mounted = useMounted();
  const last = mounted ? [...attempts].reverse().slice(0, 4) : [];
  return (
    <section aria-labelledby="quiz-title" className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-800/70 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="quiz-title" className="flex items-center gap-2 text-[15px] font-semibold text-fog-100">
          <Trophy aria-hidden className="size-4 text-teal-300" /> Recent assessments
        </h2>
        <Link href="/assessments" className="text-[12.5px] text-teal-300 hover:text-teal-200">
          All assessments
        </Link>
      </div>
      {last.length ? (
        <ul className="mt-3 flex flex-col divide-y divide-[var(--line)]">
          {last.map((a) => (
            <li key={a.at} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
              <Link href={`/assessments/${a.quizId}`} className="text-fog-200 hover:text-paper">
                {a.quizId.toUpperCase()}
              </Link>
              <span className="flex items-center gap-3">
                <span className={cn("tabular font-mono", a.score / a.total >= 0.7 ? "text-ok" : "text-warn")}>
                  {a.score}/{a.total}
                </span>
                <span className="text-[11.5px] text-fog-500">{when(a.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-fog-400">No attempts yet. Assessments are for practice — they are not a certification.</p>
      )}
    </section>
  );
}

export function BookmarksList() {
  const bookmarks = usePersisted((s) => s.bookmarks);
  const mounted = useMounted();
  const list = mounted ? bookmarks : [];
  return (
    <section id="bookmarks" aria-labelledby="bm-title" className="scroll-mt-24 rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-800/70 p-5 sm:p-6">
      <h2 id="bm-title" className="flex items-center gap-2 text-[15px] font-semibold text-fog-100">
        <Bookmark aria-hidden className="size-4 text-teal-300" /> Bookmarks
        <span className="tabular text-[12px] font-normal text-fog-500">{list.length}</span>
      </h2>
      {list.length ? (
        <ul className="mt-3 flex flex-col divide-y divide-[var(--line)]" data-testid="bookmark-list">
          {list.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link href={b.href} className="min-w-0">
                <span className="block text-[11px] uppercase tracking-[0.14em] text-fog-500">{KIND_LABEL[b.kind]}</span>
                <span className="block truncate text-[14px] text-fog-100 hover:text-paper">{b.title}</span>
              </Link>
              <button
                type="button"
                onClick={() => actions.toggleBookmark(b)}
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] text-fog-500 hover:bg-white/[0.05] hover:text-danger"
                aria-label={`Remove bookmark ${b.title}`}
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-fog-400">Use the Bookmark button on any lesson, lab, calculator or reference page to keep it here.</p>
      )}
    </section>
  );
}

export function RecentList() {
  const recent = usePersisted((s) => s.recent);
  const mounted = useMounted();
  const list = mounted ? recent.slice(0, 10) : [];
  return (
    <section id="recent" aria-labelledby="recent-title" className="scroll-mt-24 rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-800/70 p-5 sm:p-6">
      <h2 id="recent-title" className="flex items-center gap-2 text-[15px] font-semibold text-fog-100">
        <Clock aria-hidden className="size-4 text-teal-300" /> Recent activity
      </h2>
      {list.length ? (
        <ul className="mt-3 flex flex-col divide-y divide-[var(--line)]">
          {list.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <Link href={r.href} className="min-w-0 truncate text-[13.5px] text-fog-200 hover:text-paper">
                <span className="mr-2 text-[11px] uppercase tracking-[0.12em] text-fog-500">{KIND_LABEL[r.kind]}</span>
                {r.title}
              </Link>
              <span className="shrink-0 text-[11.5px] text-fog-500">{when(r.at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-fog-400">Pages you open appear here.</p>
      )}
    </section>
  );
}

export function DataControls() {
  const [confirm, setConfirm] = useState(false);
  const download = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laserverse-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section aria-label="Your data" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] px-5 py-4">
      <p className="max-w-xl text-[12.5px] leading-relaxed text-fog-400">
        Progress, bookmarks, checklists and quiz history live in this browser&apos;s local storage. Nothing is sent to a server.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={download}>
          <Download aria-hidden className="size-3.5" /> Export JSON
        </Button>
        {confirm ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              actions.resetAll();
              setConfirm(false);
            }}
          >
            Confirm reset
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
            <RotateCcw aria-hidden className="size-3.5" /> Reset progress
          </Button>
        )}
      </div>
    </section>
  );
}
