import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { QUIZZES, QUESTIONS } from "@/content/assessments/questions";
import { Breadcrumbs } from "@/components/shell/Chrome";
import { PageHeader, Badge, Callout } from "@/components/ui/primitives";
import { QuizBestScore } from "@/features/assessment/QuizRunner";

export const metadata: Metadata = { title: "Assessments" };

export default function AssessmentsPage() {
  const types = QUESTIONS.reduce<Record<string, number>>((m, q) => ({ ...m, [q.type]: (m[q.type] ?? 0) + 1 }), {});
  return (
    <div>
      <Breadcrumbs items={[{ label: "Assessments" }]} />
      <PageHeader
        eyebrow="Assessments"
        title="Test what you have learned"
        description="Source-grounded quizzes for each learning level plus a numerical set that reproduces the handbook's worked examples. Every answer explanation links to the section it comes from; numeric answers are verified against the calculation library in the test suite."
      >
        <Badge>{QUESTIONS.length} questions</Badge>
        <Badge>{types.mcq ?? 0} multiple choice</Badge>
        <Badge>{types.numeric ?? 0} numerical</Badge>
        <Badge>{types.match ?? 0} matching</Badge>
      </PageHeader>
      <Callout kind="note" className="mb-8 max-w-3xl">
        These are learning assessments. They are not a professional certification and results are stored only in this browser.
      </Callout>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {QUIZZES.map((z) => (
          <li key={z.id}>
            <Link href={`/assessments/${z.id}`} className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-teal-500/40">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-teal-300">{z.level ?? "Numerical"}</span>
                <span className="text-[12px] text-fog-500">{z.questionIds.length} questions</span>
              </div>
              <h2 className="mt-1 text-[17px] font-semibold text-paper">{z.title}</h2>
              <p className="mt-1 text-[13px] leading-snug text-fog-400">{z.description}</p>
              <div className="mt-auto flex items-center justify-between pt-5">
                <QuizBestScore quizId={z.id} />
                <ArrowRight aria-hidden className="size-4 text-fog-500 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
