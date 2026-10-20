import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getParts, getPart, figuresInSection, tablesIn } from "@/lib/content/handbook";
import { levelOfPart, getLevels } from "@/lib/content/curriculum";
import { lessonEnhancement } from "@/content/lessons";
import { questionsForSection } from "@/content/assessments/questions";
import { reviewFlagsFor } from "@/content/review-flags";
import { Blocks } from "@/components/handbook/Blocks";
import { Breadcrumbs, BookmarkButton, TrackVisit } from "@/components/shell/Chrome";
import { Badge, ClassTag, PageHeader, StatusPill } from "@/components/ui/primitives";
import { CompletionMeter } from "@/features/learning/LessonClient";

export function generateStaticParams() {
  return getParts().map((p) => ({ part: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ part: string }> }): Promise<Metadata> {
  const { part } = await params;
  const p = getPart(part);
  return { title: p ? p.fullTitle : "Part" };
}

export default async function PartPage({ params }: { params: Promise<{ part: string }> }) {
  const { part: partId } = await params;
  const part = getPart(partId);
  if (!part) notFound();
  const levelId = levelOfPart(part.number);
  const level = getLevels().find((l) => l.id === levelId);
  const href = `/learn/${part.id}`;
  return (
    <div>
      <TrackVisit item={{ id: `part:${part.id}`, kind: "part", title: part.fullTitle, href }} />
      <Breadcrumbs items={[{ label: "Learn", href: "/learn" }, { label: part.roman ? `Part ${part.roman}` : part.title }]} />
      <PageHeader
        eyebrow={part.roman ? `Part ${part.roman}` : part.kind === "front" ? "Front matter" : "Back matter"}
        title={part.roman ? part.title : part.fullTitle}
        description={part.lead.length ? <Blocks blocks={part.lead} figures={new Map(figuresInSection(part.id).map((f) => [f.id, f]))} sectionId={part.id} /> : undefined}
      >
        <ClassTag kind="handbook" />
        {level ? <Badge tone="info">{`${level.id} · ${level.name}`}</Badge> : <Badge>Reference</Badge>}
        {part.page ? <Badge>Handbook p.{part.page}</Badge> : null}
        <BookmarkButton item={{ id: `part:${part.id}`, kind: "part", title: part.fullTitle, href }} />
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-fog-400">
          {part.sections.length} lesson{part.sections.length === 1 ? "" : "s"}
        </h2>
        <CompletionMeter lessonIds={part.sections.map((s) => s.id)} />
      </div>
      <ol className="flex flex-col divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60">
        {part.sections.map((s) => {
          const enh = lessonEnhancement(s.id);
          const q = questionsForSection(s.id).length;
          const t = tablesIn(s.id).length;
          const flagged = s.blocks.some((b) => b.type === "chart-missing") || reviewFlagsFor(s.id).some((f) => f.severity !== "info");
          return (
            <li key={s.id}>
              <Link href={`/learn/${part.id}/${s.slug}`} className="group flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center">
                <span className="tabular w-14 shrink-0 font-mono text-[13px] text-fog-500">{s.number ?? (s.synthetic ? "—" : "·")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-fog-100 group-hover:text-paper">{s.synthetic ? part.title : s.title}</span>
                  {enh.objective ? <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-fog-500">{enh.objective}</span> : null}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {enh.embed ? <Badge tone="concept">Interactive</Badge> : null}
                  {q ? <Badge tone="info">{q} check{q > 1 ? "s" : ""}</Badge> : null}
                  {t ? <Badge>{t} table{t > 1 ? "s" : ""}</Badge> : null}
                  {flagged ? <StatusPill status="review-required" /> : null}
                  {s.page ? <span className="tabular w-12 text-right text-[12px] text-fog-500">p.{s.page}</span> : null}
                  <ArrowRight aria-hidden className="size-4 text-fog-500 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
