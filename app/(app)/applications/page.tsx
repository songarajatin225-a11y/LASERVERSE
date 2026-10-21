import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { ApplicationExplorer, ProductMaps } from "@/features/applications/ApplicationExplorer";
import { applicationMatrix, qualityByFamily, caseStudies, explodedMaps, applicationQuotes, INDUSTRY_SECTIONS } from "@/lib/content/applications";
import { hrefFor, labelFor } from "@/lib/content/outline";

export const metadata: Metadata = { title: "Industrial Applications" };
const ITEM = { id: "tool:applications", kind: "tool" as const, title: "Industrial Applications", href: "/applications" };

export default function ApplicationsPage() {
  const q = applicationQuotes();
  const cases = caseStudies();
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Industrial Applications" }]} />
      <PageHeader
        eyebrow="Engineering"
        title="Industrial Applications"
        description={
          <>
            Walk each application chain from industry and end product to component, material, process, laser source, machine and quality. “{q.tree}” <SourceRef section="28.0" />
          </>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="derived" />
        <BookmarkButton item={ITEM} />
      </PageHeader>

      <Callout kind="limitation" title="There is no universally optimal laser" className="mb-6">
        Each chain shows the handbook&apos;s typical choice for that application, not the only or the best one. “{q.confirm}” <SourceRef section="B.5" /> “{q.cases}” <SourceRef section="26.2" />
      </Callout>

      <Suspense fallback={<div className="h-[640px] animate-pulse rounded-[var(--radius-xl)] bg-ink-800" />}>
        <ApplicationExplorer chains={applicationMatrix()} quality={qualityByFamily()} cases={cases.map(({ id, number, title, industries }) => ({ id, number, title, industries }))} />
      </Suspense>

      <SectionTitle id="case-studies" sub="Handbook §26.2 — eight end-to-end walks from product to machine.">
        End-to-end case studies
      </SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cases.map((c) => (
          <li key={c.id}>
            <Link href={`/applications/${c.id}`} className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4 hover:border-teal-500/40">
              <span className="flex items-center justify-between font-mono text-[12px] text-teal-300">
                Case {c.number} <ArrowUpRight aria-hidden className="size-4 text-fog-500 group-hover:text-teal-300" />
              </span>
              <span className="mt-1.5 text-[14px] font-medium leading-snug text-fog-100">{c.chain.join(" → ")}</span>
              <span className="mt-auto pt-3 text-[12px] text-fog-500">{c.steps.length} decisions</span>
            </Link>
          </li>
        ))}
      </ul>

      <SectionTitle id="product-maps" sub="Handbook §19.2 — the laser processes inside fifteen products, component by component.">
        Exploded product maps
      </SectionTitle>
      <ProductMaps maps={explodedMaps()} />

      <SectionTitle id="industries" sub="Read the industry parts of the handbook in full.">
        Industry deep dives
      </SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INDUSTRY_SECTIONS.map((g) => (
          <li key={g.label} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
            <div className="text-[14.5px] font-semibold text-fog-100">{g.label}</div>
            <ul className="mt-2 flex flex-col gap-1 text-[13px]">
              {g.sections.map((s) => (
                <li key={s}>
                  <Link href={hrefFor(s)} className="text-teal-300 hover:text-teal-200">
                    {labelFor(s, true)}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
