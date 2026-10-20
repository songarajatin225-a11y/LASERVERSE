import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Calculator, FlaskConical, BookOpen, Target } from "lucide-react";
import { getParts, getPart, getSectionBySlug, neighbours, sectionHref, sectionLabel, allSections, figuresInSection, handbook, flagsFor } from "@/lib/content/handbook";
import { levelOfPart, getLevels } from "@/lib/content/curriculum";
import { lessonEnhancement } from "@/content/lessons";
import { questionsForSection } from "@/content/assessments/questions";
import { reviewFlagsFor } from "@/content/review-flags";
import { getCalculator } from "@/features/calculators/definitions";
import { Blocks } from "@/components/handbook/Blocks";
import { Breadcrumbs, BookmarkButton, TrackVisit } from "@/components/shell/Chrome";
import { ClassTag, StatusPill, Callout, Badge, Panel } from "@/components/ui/primitives";
import { LessonProgress, KnowledgeCheck } from "@/features/learning/LessonClient";
import { LessonEmbed } from "@/features/learning/LessonEmbed";

export function generateStaticParams() {
  return getParts().flatMap((p) => p.sections.map((s) => ({ part: p.id, section: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ part: string; section: string }> }): Promise<Metadata> {
  const { part, section } = await params;
  const s = getSectionBySlug(part, section);
  return { title: s ? `${s.number ? `${s.number} ` : ""}${s.title}` : "Lesson" };
}

export default async function LessonPage({ params }: { params: Promise<{ part: string; section: string }> }) {
  const { part: partId, section: slug } = await params;
  const part = getPart(partId);
  const section = getSectionBySlug(partId, slug);
  if (!part || !section) notFound();

  const { prev, next } = neighbours(section.id);
  const figures = new Map(figuresInSection(section.id).map((f) => [f.id, f]));
  const enh = lessonEnhancement(section.id);
  const questions = questionsForSection(section.id);
  const levelId = levelOfPart(part.number);
  const level = getLevels().find((l) => l.id === levelId);
  const reviewFlags = reviewFlagsFor(section.id);
  const extraction = flagsFor(section.id).filter((f) => f.code !== "EQUATION_TRANSCRIBED" && f.code !== "SYNTHETIC_SECTION" && f.code !== "CHART_MISSING");
  const equationCount = [...figures.values()].filter((f) => f.kind === "equation").length;
  const hasMissingChart = section.blocks.some((b) => b.type === "chart-missing");
  const status = hasMissingChart || reviewFlags.some((f) => f.severity !== "info") ? "review-required" : "extracted";
  const referencedBy = allSections().filter((s) => s.refs.includes(section.id));
  const heading = section.synthetic ? part.title : section.title;
  const lessonId = section.id;
  const href = sectionHref(section.id);

  return (
    <div>
      <TrackVisit item={{ id: lessonId, kind: "lesson", title: `${section.number ? `${section.number} ` : ""}${heading}`, href }} />
      <Breadcrumbs
        items={[
          { label: "Learn", href: "/learn" },
          { label: part.roman ? `Part ${part.roman}` : part.title, href: `/learn/${part.id}` },
          { label: section.number ? `§${section.number}` : heading },
        ]}
      />
      <header className="mb-8 max-w-4xl">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
          <Link href={`/learn/${part.id}`} className="font-semibold uppercase tracking-[0.18em] text-teal-300 hover:text-teal-200">
            {part.fullTitle}
          </Link>
        </div>
        <h1 className="text-balance text-[clamp(1.8rem,3.2vw,2.7rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-paper">
          {section.number ? <span className="mr-3 font-mono text-[0.72em] font-medium text-fog-500">{section.number}</span> : null}
          {heading}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <ClassTag kind="handbook" />
          <StatusPill status={status} />
          {level ? <Badge tone="info">{`${level.id} · ${level.name}`}</Badge> : <Badge>Reference</Badge>}
          {section.page ? <Badge title="Page number from the handbook's table of contents (Word pagination)">Handbook p.{section.page}</Badge> : null}
          {equationCount ? <Badge tone="warn">{equationCount} transcribed equation{equationCount > 1 ? "s" : ""}</Badge> : null}
          <span className="ml-auto">
            <BookmarkButton item={{ id: lessonId, kind: "lesson", title: `${section.number ? `${section.number} ` : ""}${heading}`, href }} />
          </span>
        </div>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0 max-w-[780px]">
          {enh.objective ? (
            <div className="mb-8 rounded-[var(--radius-lg)] border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.08] to-transparent px-5 py-4">
              <div className="mb-1.5 flex items-center gap-2">
                <Target aria-hidden className="size-4 text-teal-300" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-200">Learning objective</span>
                <ClassTag kind="additional" short className="ml-auto" />
              </div>
              <p className="text-[15px] leading-relaxed text-fog-100">{enh.objective}</p>
            </div>
          ) : null}

          {reviewFlags.map((f) => (
            <Callout key={f.id} kind="review" title={f.title} className="mb-4">
              {f.detail}
            </Callout>
          ))}
          {extraction.map((f, i) => (
            <Callout key={i} kind="review" title={`Extraction: ${f.code}`} className="mb-4">
              {f.message}
            </Callout>
          ))}

          {part.lead.length && section.id === part.sections[0]?.id ? (
            <div className="mb-8 border-l-2 border-teal-500/50 pl-5 text-[16.5px] italic leading-relaxed text-fog-200">
              <Blocks blocks={part.lead} figures={new Map(figuresInSection(part.id).map((f) => [f.id, f]))} sectionId={part.id} />
            </div>
          ) : null}

          <Blocks blocks={section.blocks} figures={figures} sectionId={section.id} />

          {enh.embed ? (
            <section aria-labelledby="explore-title" className="mt-12">
              <div className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Interactive</div>
                <h2 id="explore-title" className="mt-1 text-xl font-semibold text-paper">
                  Explore it
                </h2>
              </div>
              <LessonEmbed kind={enh.embed} />
            </section>
          ) : null}

          {questions.length ? <KnowledgeCheck lessonId={lessonId} questionIds={questions.map((q) => q.id)} /> : null}

          <nav aria-label="Lesson navigation" className="mt-14 grid gap-3 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
            {prev ? (
              <Link href={sectionHref(prev.id)} className="group rounded-[var(--radius-md)] border border-[var(--line)] px-4 py-3 hover:border-white/15">
                <span className="flex items-center gap-1.5 text-[12px] text-fog-500">
                  <ArrowLeft aria-hidden className="size-3.5" /> Previous
                </span>
                <span className="mt-1 block text-[14px] text-fog-200 group-hover:text-paper">
                  {sectionLabel(prev.id)} {prev.synthetic ? "" : prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={sectionHref(next.id)} className="group rounded-[var(--radius-md)] border border-[var(--line)] px-4 py-3 text-right hover:border-white/15">
                <span className="flex items-center justify-end gap-1.5 text-[12px] text-fog-500">
                  Next <ArrowRight aria-hidden className="size-3.5" />
                </span>
                <span className="mt-1 block text-[14px] text-fog-200 group-hover:text-paper">
                  {sectionLabel(next.id)} {next.synthetic ? "" : next.title}
                </span>
              </Link>
            ) : null}
          </nav>
        </article>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto xl:pb-6">
          <Panel className="p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">Progress</div>
            <LessonProgress lessonId={lessonId} hasChecks={questions.length > 0} />
          </Panel>
          {enh.calculators?.length || enh.tools?.length ? (
            <Panel className="p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">Use it</div>
              <ul className="flex flex-col gap-1.5 text-[13.5px]">
                {enh.calculators?.map((id) => (
                  <li key={id}>
                    <Link href={`/calculators/${id}`} className="flex items-start gap-2 text-fog-200 hover:text-teal-200">
                      <Calculator aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fog-500" />
                      {getCalculator(id)?.title ?? id}
                    </Link>
                  </li>
                ))}
                {enh.tools?.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="flex items-start gap-2 text-fog-200 hover:text-teal-200">
                      <FlaskConical aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fog-500" />
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {section.refs.length || referencedBy.length ? (
            <Panel className="p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">Related topics</div>
              {section.refs.length ? (
                <>
                  <div className="mb-1 text-[11.5px] text-fog-500">This section points to</div>
                  <ul className="mb-3 flex flex-col gap-1 text-[13px]">
                    {section.refs.map((r) => (
                      <li key={r}>
                        <Link href={sectionHref(r)} className="text-fog-200 hover:text-teal-200">
                          <span className="font-mono text-[11.5px] text-fog-500">{sectionLabel(r)}</span> {allSections().find((s) => s.id === r)?.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {referencedBy.length ? (
                <>
                  <div className="mb-1 text-[11.5px] text-fog-500">Referenced from</div>
                  <ul className="flex flex-col gap-1 text-[13px]">
                    {referencedBy.slice(0, 10).map((s) => (
                      <li key={s.id}>
                        <Link href={sectionHref(s.id)} className="text-fog-200 hover:text-teal-200">
                          <span className="font-mono text-[11.5px] text-fog-500">{sectionLabel(s.id)}</span> {s.synthetic ? "" : s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Panel>
          ) : null}
          <Panel className="p-4 text-[12.5px] leading-relaxed text-fog-400">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">
              <BookOpen aria-hidden className="size-3.5" /> Source
            </div>
            <p>
              <em className="text-fog-200">{handbook.meta.title}</em>, {handbook.meta.author}, {handbook.meta.date}. {section.number ? `§${section.number}` : section.title}
              {section.page ? `, p. ${section.page} (contents pagination)` : ""}.
            </p>
            <p className="mt-2 text-[11.5px] text-fog-500">Text, tables and figures are rendered from the ingested source without rewording. Cross-references are converted into links.</p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
