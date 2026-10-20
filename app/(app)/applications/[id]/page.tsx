import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { caseStudies, applicationQuotes } from "@/lib/content/applications";

export function generateStaticParams() {
  return caseStudies().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = caseStudies().find((x) => x.id === id);
  return { title: c ? `Case ${c.number}: ${c.title}` : "Case study" };
}

/** Links from a step's wording to the tool that explores it. */
function toolsFor(step: string, decision: string): Array<{ label: string; href: string }> {
  const s = `${step} ${decision}`.toLowerCase();
  const out: Array<{ label: string; href: string }> = [];
  if (/laser|source/.test(step.toLowerCase())) out.push({ label: "Source explorer", href: "/sources" });
  if (/optic|spot|f-theta|lens/.test(s)) out.push({ label: "Beam & optics lab", href: "/beam-optics" });
  if (/machine/.test(step.toLowerCase())) out.push({ label: "Reference machines", href: "/architecture#configurator" });
  if (/validation|grade|inspection|microscopy/.test(s)) out.push({ label: "Safety & quality", href: "/safety#metrology" });
  if (/process/.test(step.toLowerCase())) out.push({ label: "Process simulator", href: "/processes" });
  if (/material/.test(step.toLowerCase())) out.push({ label: "Material lab", href: "/materials" });
  return out;
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = caseStudies();
  const c = all.find((x) => x.id === id);
  if (!c) notFound();
  const prev = all[c.number - 2];
  const next = all[c.number];
  const item = { id: `case:${c.id}`, kind: "application" as const, title: `Case ${c.number}: ${c.title}`, href: `/applications/${c.id}` };
  return (
    <div>
      <TrackVisit item={item} />
      <Breadcrumbs items={[{ label: "Industrial Applications", href: "/applications" }, { label: `Case ${c.number}` }]} />
      <PageHeader eyebrow={`End-to-end case study ${c.number} of ${all.length}`} title={c.title} description={<>{c.chain.join("  →  ")}</>}>
        <ClassTag kind="handbook" />
        <BookmarkButton item={item} />
      </PageHeader>
      <Callout kind="limitation" title="Indicative starting points" className="mb-6">
        “{applicationQuotes().cases}” <SourceRef section="26.2" />
      </Callout>
      <ol className="relative flex flex-col">
        {c.steps.map((s, i) => (
          <li key={s.step} className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-4 pb-6 last:pb-0">
            {i < c.steps.length - 1 ? <span aria-hidden className="absolute left-[17px] top-9 h-[calc(100%-24px)] w-px bg-gradient-to-b from-teal-500/50 to-teal-500/10" /> : null}
            <span className="grid size-9 place-items-center rounded-full border border-teal-500/40 bg-ink-900 font-mono text-[12px] text-teal-200">{i + 1}</span>
            <div className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">{s.step}</div>
              <p className="mt-1 text-[14.5px] leading-relaxed text-fog-100">{s.decision}</p>
              {toolsFor(s.step, s.decision).length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {toolsFor(s.step, s.decision).map((t) => (
                    <Link key={t.href} href={t.href} className="rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-[12px] text-fog-300 hover:border-teal-400/60 hover:text-teal-100">
                      {t.label} →
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4">
        <SourceRef section="26.2" note={`case ${c.number}`} />
      </p>
      <nav className="mt-10 flex flex-wrap justify-between gap-3 border-t border-[var(--line)] pt-5" aria-label="Case navigation">
        {prev ? (
          <Link href={`/applications/${prev.id}`} className="inline-flex items-center gap-2 text-[13.5px] text-fog-300 hover:text-teal-200">
            <ArrowLeft aria-hidden className="size-4" /> Case {prev.number}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/applications/${next.id}`} className="inline-flex items-center gap-2 text-[13.5px] text-fog-300 hover:text-teal-200">
            Case {next.number}: {next.title} <ArrowRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
