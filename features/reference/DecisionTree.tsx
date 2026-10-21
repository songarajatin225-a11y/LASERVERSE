"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, CircleCheck, GitBranch, RotateCcw } from "lucide-react";
import { Segmented } from "@/components/ui/controls";
import { ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { linkRefs } from "@/components/handbook/linkRefs";
import { duration, ease } from "@/components/motion/tokens";
import type { DecisionTreeData } from "./types";

type View = "guided" | "overview";

const choiceCls = (active: boolean) =>
  cn(
    "group flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-colors",
    active ? "border-teal-400/60 bg-teal-500/[0.12] text-paper shadow-[0_0_0_1px_rgb(0_149_144/0.35)_inset]" : "border-[var(--line)] bg-ink-800/60 text-fog-200 hover:border-white/20 hover:text-fog-100",
  );

function StepLabel({ n, children, done }: { n: number; children: ReactNode; done: boolean }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">
      <span className={cn("grid size-5 place-items-center rounded-full border font-mono text-[10.5px]", done ? "border-teal-400/70 bg-teal-500/20 text-teal-100" : "border-[var(--line-strong)] text-fog-400")}>{n}</span>
      {children}
    </div>
  );
}

/**
 * Interactive §B.5 laser selection decision tree: material class → requirement → candidate laser.
 * Built from the figure transcription; `compact` is the lesson-embed variant.
 */
export function DecisionTree({ data, compact = false }: { data: DecisionTreeData; compact?: boolean }) {
  const [clsId, setClsId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [view, setView] = useState<View>("guided");
  const cls = data.classes.find((c) => c.id === clsId) ?? null;
  const branch = cls?.branches.find((b) => b.id === branchId) ?? null;

  const pickClass = (id: string) => {
    setClsId(id);
    setBranchId(null);
  };
  const reset = () => {
    setClsId(null);
    setBranchId(null);
  };
  const pickLeaf = (c: string, b: string) => {
    setClsId(c);
    setBranchId(b);
    setView("guided");
  };

  return (
    <section className="@container overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/80" aria-label="Laser selection decision tree">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">
            <GitBranch aria-hidden className="size-3.5" /> Decision tree · §B.5
          </div>
          <h3 className="text-[16.5px] font-semibold text-paper">Laser selection by material class</h3>
          <p className="mt-1 text-[12.5px] text-fog-400">Transcribed from the handbook figure — needs review.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ClassTag kind="handbook" short />
          <ClassTag kind="unverified" short />
          {clsId ? (
            <button type="button" onClick={reset} className="ml-1 inline-flex h-7 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[12px] text-fog-400 hover:bg-white/[0.05] hover:text-fog-100">
              <RotateCcw aria-hidden className="size-3.5" /> Start over
            </button>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="border-b border-[var(--line)] px-4 py-2.5 sm:px-5">
          <Segmented<View>
            label="Decision tree view"
            value={view}
            onChange={setView}
            options={[
              { value: "guided", label: "Guided" },
              { value: "overview", label: "Whole tree" },
            ]}
          />
        </div>
      ) : null}

      {view === "overview" && !compact ? (
        <div className="p-4 sm:p-5">
          <p className="mb-3 text-[13px] text-fog-400">
            <span className="font-medium text-fog-200">{data.question}</span> — every branch of the transcribed tree. Choose a leaf to open it in the guided view.
          </p>
          <div className="grid gap-3 @2xl:grid-cols-2">
            {data.classes.map((c) => (
              <div key={c.id} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/50 p-3.5">
                <div className="mb-2 text-[14px] font-semibold text-paper">{c.label}</div>
                <ul className="flex flex-col gap-1.5">
                  {c.branches.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => pickLeaf(c.id, b.id)} className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[13px] hover:bg-white/[0.04]">
                        <span className="text-fog-300">{b.condition}</span>
                        <ArrowRight aria-hidden className="size-3.5 text-teal-400" />
                        <span className="font-medium text-teal-100">{b.recommendation}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={cn("grid gap-0", compact ? "@3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : "@4xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]")}>
          {/* step 1 */}
          <div className={cn("border-b border-[var(--line)] p-4 sm:p-5", compact ? "@3xl:border-b-0 @3xl:border-r" : "@4xl:border-b-0 @4xl:border-r")}>
            <StepLabel n={1} done={Boolean(cls)}>
              {data.question}
            </StepLabel>
            <div role="group" aria-label={data.question} className="flex flex-col gap-2">
              {data.classes.map((c) => (
                <button key={c.id} type="button" aria-pressed={c.id === clsId} onClick={() => pickClass(c.id)} className={choiceCls(c.id === clsId)}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{c.label}</span>
                    <span className="mt-0.5 block text-[12px] text-fog-500">
                      {c.branches.length} branch{c.branches.length === 1 ? "" : "es"}
                    </span>
                  </span>
                  <ArrowRight aria-hidden className={cn("mt-1 size-4 shrink-0 transition-colors", c.id === clsId ? "text-teal-300" : "text-fog-500 group-hover:text-fog-300")} />
                </button>
              ))}
            </div>
          </div>

          {/* step 2 */}
          <div className={cn("p-4 sm:p-5", !compact && "border-b border-[var(--line)] @4xl:border-b-0 @4xl:border-r")}>
            <StepLabel n={2} done={Boolean(branch)}>
              {cls ? `${cls.label}: what is the job?` : "Requirement"}
            </StepLabel>
            {cls ? (
              <div role="group" aria-label={`${cls.label} requirements`} className="flex flex-col gap-2">
                {cls.branches.map((b) => (
                  <button key={b.id} type="button" aria-pressed={b.id === branchId} onClick={() => setBranchId(b.id)} className={choiceCls(b.id === branchId)}>
                    <span className="min-w-0 flex-1 text-[13.5px] font-medium">{b.condition}</span>
                    <ArrowRight aria-hidden className={cn("mt-0.5 size-4 shrink-0", b.id === branchId ? "text-teal-300" : "text-fog-500")} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--line-strong)] px-3 py-6 text-center text-[12.5px] text-fog-500">Choose a material class first.</p>
            )}
            {compact && branch ? <Leaf data={data} clsLabel={cls!.label} branch={branch} sections={cls!.sections} compact /> : null}
          </div>

          {/* step 3 */}
          {!compact ? (
            <div className="p-4 sm:p-5" aria-live="polite">
              <StepLabel n={3} done={Boolean(branch)}>
                Candidate laser
              </StepLabel>
              {branch && cls ? (
                <Leaf data={data} clsLabel={cls.label} branch={branch} sections={cls.sections} />
              ) : (
                <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--line-strong)] px-3 py-6 text-center text-[12.5px] text-fog-500">
                  {cls ? "Choose the requirement." : "The recommendation appears here."}
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3 text-[12px] text-fog-500 sm:px-5">
        <span>
          Encoded from the transcription of the handbook figure “{data.figureTitle}”; a test fails if the two differ. <SourceRef section="B.5" />
        </span>
        {compact ? (
          <Link href="/reference/decision-tree" className="inline-flex items-center gap-1 text-teal-300 hover:text-teal-200">
            Open the full decision tree <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function Leaf({
  data,
  clsLabel,
  branch,
  sections,
  compact = false,
}: {
  data: DecisionTreeData;
  clsLabel: string;
  branch: DecisionTreeData["classes"][number]["branches"][number];
  sections: DecisionTreeData["classes"][number]["sections"];
  compact?: boolean;
}) {
  return (
    <motion.div
      key={branch.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: ease.out }}
      className={cn("flex flex-col gap-3", compact && "mt-4 border-t border-[var(--line)] pt-4")}
    >
      <div className="rounded-[var(--radius-lg)] border border-teal-500/35 bg-gradient-to-br from-teal-500/[0.14] to-teal-500/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-fog-400">
          <span>{data.question}</span>
          <ArrowRight aria-hidden className="size-3" />
          <span className="text-fog-200">{clsLabel}</span>
          <ArrowRight aria-hidden className="size-3" />
          <span className="text-fog-200">{branch.condition}</span>
        </div>
        <div className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.01em] text-paper">{branch.recommendation}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ClassTag kind="handbook" short />
          <ClassTag kind="unverified" short />
        </div>
      </div>
      <div className="rounded-[var(--radius-md)] border border-warn/30 bg-warn/[0.05] px-3.5 py-3 text-[13px] leading-relaxed text-fog-200">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-100">
          <CircleCheck aria-hidden className="size-3.5" /> Before relying on it
        </div>
        “{linkRefs(data.confirm, `${branch.id}-`)}” <SourceRef section="B.5" />
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {data.checks.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] bg-ink-900/40 px-2.5 py-1 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
                {c.label} <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {branch.explore.length || sections.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fog-500">Explore next (LASERVERSE links)</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {branch.explore.map((l) => (
              <Link key={l.href + l.label} href={l.href} className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
                {l.label} <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            ))}
            {sections.map((s) => (
              <SourceRef key={s.id} section={s.id} />
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
