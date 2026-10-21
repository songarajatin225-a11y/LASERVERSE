import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Users } from "lucide-react";
import { getParts, getPartByNumber, sectionHref } from "@/lib/content/handbook";
import { getLevels, getRolePaths } from "@/lib/content/curriculum";
import { ROMAN } from "@/lib/content/outline";
import { Breadcrumbs } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, Badge, SectionTitle } from "@/components/ui/primitives";
import { CompletionMeter } from "@/features/learning/LessonClient";
import { Stagger, StaggerItem } from "@/components/motion/primitives";

export const metadata: Metadata = { title: "Learn — Laser Academy" };

export default function LearnPage() {
  const levels = getLevels();
  const roles = getRolePaths();
  const parts = getParts();
  const numbered = parts.filter((p) => p.kind === "part");
  const other = parts.filter((p) => p.kind !== "part");
  const sectionsOf = (nums: number[]) => nums.flatMap((n) => getPartByNumber(n)?.sections.map((s) => s.id) ?? []);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Learn" }]} />
      <PageHeader
        eyebrow="Laser Academy"
        title="From the photon to the product, in six levels"
        description="Every lesson is a section of The Complete Laser Handbook, rendered faithfully and connected to the interactive labs, calculators and knowledge checks. Follow a level, follow a role path, or open any part directly — none of the tools require completing lessons first."
      >
        <ClassTag kind="handbook" />
        <Badge>{parts.reduce((n, p) => n + p.sections.length, 0)} lessons</Badge>
        <Badge>28 parts + front and back matter</Badge>
      </PageHeader>

      <SectionTitle id="levels" sub="Stages, part ranges, the question each stage lets you answer and its proof-of-competence exercise are taken from the handbook's learning roadmap.">
        Learning levels
      </SectionTitle>
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {levels.map((l) => {
          const firstPart = getPartByNumber(l.parts[0]!);
          const first = firstPart?.sections[0];
          return (
            <StaggerItem key={l.id}>
              <div id={`level-${l.id}`} className="flex h-full scroll-mt-24 flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-5 target:border-teal-400/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[12px] text-teal-300">{l.id}</div>
                    <h3 className="mt-0.5 text-[17px] font-semibold text-paper">{l.name}</h3>
                    <p className="text-[12.5px] text-fog-500">{l.focus}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {l.parts.map((n) => (
                    <Link key={n} href={`/learn/part-${n}`} className="rounded-[5px] border border-[var(--line-strong)] px-1.5 py-0.5 font-mono text-[11px] text-fog-300 hover:border-teal-400/50 hover:text-teal-100" title={getPartByNumber(n)?.title}>
                      {ROMAN[n]}
                    </Link>
                  ))}
                </div>
                <dl className="mt-4 flex flex-col gap-3 text-[13px] leading-snug">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">You can answer</dt>
                    <dd className="mt-1 text-fog-200">“{l.canAnswer}”</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Proof of competence</dt>
                    <dd className="mt-1 text-fog-300">{l.exercise}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                  <CompletionMeter lessonIds={sectionsOf(l.parts)} compact />
                  <div className="flex gap-3 text-[12.5px]">
                    <Link href={`/assessments/${l.id.toLowerCase()}`} className="text-fog-300 hover:text-teal-200">
                      Quiz
                    </Link>
                    {first ? (
                      <Link href={sectionHref(first.id)} className="inline-flex items-center gap-1 font-medium text-teal-300 hover:text-teal-200">
                        Start <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>

      <SectionTitle id="roles" sub="From the handbook's “How to use this handbook” table.">
        Role-oriented paths
      </SectionTitle>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)]">
        <ul className="divide-y divide-[var(--line)]">
          {roles.map((r) => (
            <li key={r.id} id={`role-${r.id}`} className="grid scroll-mt-24 gap-3 bg-ink-800/50 px-5 py-4 target:bg-teal-500/10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.4fr)] md:items-center">
              <div className="flex items-start gap-3">
                <Users aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-300" />
                <div>
                  <div className="text-[14.5px] font-medium text-fog-100">{r.reader}</div>
                  <div className="text-[12px] text-fog-500">Start at {r.startAt}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.coreParts.map((n) => (
                  <Link key={n} href={`/learn/part-${n}`} className="rounded-[5px] border border-[var(--line-strong)] px-1.5 py-0.5 font-mono text-[11px] text-fog-300 hover:border-teal-400/50 hover:text-teal-100" title={getPartByNumber(n)?.title}>
                    {ROMAN[n]}
                  </Link>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] leading-snug text-fog-300">{r.leaveWith}</p>
                <CompletionMeter lessonIds={sectionsOf(r.coreParts)} compact />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <SectionTitle id="parts" sub="Every part and section of the handbook. Parts XVI, XVII, XX and XXVIII have no numbered sections and are presented as one overview lesson each.">
        The 28-part handbook
      </SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {numbered.map((p) => (
          <li key={p.id}>
            <Link href={`/learn/${p.id}`} className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-teal-500/40">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[12px] text-teal-300">Part {p.roman}</span>
                {p.page ? <span className="tabular text-[11.5px] text-fog-500">p.{p.page}</span> : null}
              </div>
              <h3 className="mt-1 text-[14.5px] font-medium leading-snug text-fog-100 group-hover:text-paper">{p.title}</h3>
              <div className="mt-auto pt-4">
                <CompletionMeter lessonIds={p.sections.map((s) => s.id)} compact />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {other.map((p) => (
          <Link key={p.id} href={`/learn/${p.id}`} className="group flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/40 px-4 py-3 hover:border-white/15">
            <span>
              <span className="block text-[14px] font-medium text-fog-100">{p.title}</span>
              <span className="text-[12px] text-fog-500">{p.sections.map((s) => s.number ?? s.title).slice(0, 6).join(" · ")}{p.sections.length > 6 ? " …" : ""}</span>
            </span>
            <ArrowRight aria-hidden className="size-4 text-fog-500 group-hover:text-teal-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
