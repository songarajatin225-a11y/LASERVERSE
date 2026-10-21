import { Suspense } from "react";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { Breadcrumbs, TrackVisit } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, Callout } from "@/components/ui/primitives";
import { SearchPage } from "@/features/search/SearchPage";
import { buildSearchIndex } from "@/lib/search/buildIndex";
import type { SearchKind } from "@/lib/search/engine";

export const metadata: Metadata = { title: "Search", description: "Local search across the handbook's lessons, glossary, equations, figures and every LASERVERSE tool." };

const ITEM = { id: "page:search", kind: "page" as const, title: "Search", href: "/search" };

function SearchFallback() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="flex h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line-strong)] bg-ink-850 px-4 text-[15px] text-fog-500">
        <Search aria-hidden className="size-4" />
        Loading search…
      </div>
      <div className="h-8 w-full max-w-xl animate-pulse rounded-full bg-ink-800/60 motion-reduce:animate-none" />
    </div>
  );
}

export default function SearchRoute() {
  const docs = buildSearchIndex();
  const totals: Partial<Record<SearchKind, number>> = {};
  for (const d of docs) totals[d.kind] = (totals[d.kind] ?? 0) + 1;

  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Search" }]} />
      <PageHeader
        eyebrow="Reference"
        title="Search"
        description="One index over the handbook — every section, part, glossary term, abbreviation, equation and figure — and every LASERVERSE tool: calculators, labs, source entries, application chains, case studies, troubleshooting cards, machine components and assessments."
      >
        <ClassTag kind="handbook" short />
        <ClassTag kind="derived" short />
        <ClassTag kind="additional" short />
      </PageHeader>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <Suspense fallback={<SearchFallback />}>
            <SearchPage totals={totals} total={docs.length} />
          </Suspense>
        </div>
        <aside className="flex flex-col gap-3 xl:sticky xl:top-20 xl:self-start" aria-label="About search">
          <Callout kind="note" title="How this search works">
            <p>
              Matching runs in your browser over a static index built from the handbook and the platform’s tool registries. It is lexical: words, prefixes and small
              spelling slips match, and titles and keywords weigh more than body text.
            </p>
            <p className="mt-2">
              The engine sits behind a provider interface, so a semantic provider could be added later without changing this page. No AI model or remote search
              service is involved.
            </p>
          </Callout>
          <p className="text-[12px] leading-relaxed text-fog-500">
            Each result carries the class of the text it shows: handbook text, a derived calculator, or a description written for LASERVERSE — of a tool, machine
            component, assessment, figure or equation image — which cites, but does not quote, the handbook.
          </p>
        </aside>
      </div>
    </div>
  );
}
