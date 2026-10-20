import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { QUIZZES } from "@/content/assessments/questions";
import { Breadcrumbs, TrackVisit } from "@/components/shell/Chrome";
import { PageHeader, Badge } from "@/components/ui/primitives";
import { QuizRunner } from "@/features/assessment/QuizRunner";

export function generateStaticParams() {
  return QUIZZES.map((q) => ({ quiz: q.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ quiz: string }> }): Promise<Metadata> {
  const { quiz } = await params;
  return { title: QUIZZES.find((q) => q.id === quiz)?.title ?? "Quiz" };
}

export default async function QuizPage({ params }: { params: Promise<{ quiz: string }> }) {
  const { quiz: id } = await params;
  const quiz = QUIZZES.find((q) => q.id === id);
  if (!quiz) notFound();
  return (
    <div>
      <TrackVisit item={{ id: `quiz:${quiz.id}`, kind: "quiz", title: quiz.title, href: `/assessments/${quiz.id}` }} />
      <Breadcrumbs items={[{ label: "Assessments", href: "/assessments" }, { label: quiz.title }]} />
      <PageHeader eyebrow="Quiz" title={quiz.title} description={quiz.description}>
        <Badge>{quiz.questionIds.length} questions</Badge>
        <Badge tone="info">Hints and explanations included</Badge>
      </PageHeader>
      <QuizRunner quizId={quiz.id} />
    </div>
  );
}
