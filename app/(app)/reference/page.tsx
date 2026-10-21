import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookA, Globe, GitBranch, Images, ListChecks, Network, Sigma, type LucideIcon } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookTable, linkRefs } from "@/components/handbook/Blocks";
import { ReferenceNav } from "@/features/reference/ReferenceNav";
import { REFERENCE_PAGES, type ReferencePageDef } from "@/features/reference/pages";
import { referenceIndexData, glossaryTable, abbreviationTable, formulaGroups, figureGallery, statusData, sourcesData, technologyMapData, decisionTreeData } from "@/lib/content/reference";
import { labelFor } from "@/lib/content/outline";

export const metadata: Metadata = { title: "Reference Library" };
const ITEM = { id: "reference:index", kind: "reference" as const, title: "Reference Library", href: "/reference" };

const ICONS: Record<ReferencePageDef["id"], LucideIcon> = {
  map: Network,
  "decision-tree": GitBranch,
  glossary: BookA,
  formulas: Sigma,
  figures: Images,
  status: ListChecks,
  sources: Globe,
};

export default function ReferencePage() {
  const d = referenceIndexData();
  const status = statusData();
  const facts: Record<ReferencePageDef["id"], string> = {
    map: `${technologyMapData().root.children.length} branches`,
    "decision-tree": `${decisionTreeData().classes.length} material classes`,
    glossary: `${glossaryTable().rows.length} terms · ${abbreviationTable().rows.length} abbreviations`,
    formulas: `${formulaGroups().reduce((n, g) => n + g.figures.length, 0)} equations`,
    figures: `${figureGallery().length} figures`,
    status: `${status.flags.length} extraction flags · ${status.reviewFlags.length} review flags`,
    sources: `${sourcesData().links.length} external pages`,
  };
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Reference Library" }]} />
      <PageHeader
        eyebrow="Reference"
        title="Reference Library"
        description="The handbook's reference apparatus in one place: the master technology map, the selection decision tree, glossary and abbreviations, every formula and figure, the quick-reference tables — and an honest account of what was extracted and what still needs review."
      >
        <ClassTag kind="handbook" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <ReferenceNav />

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REFERENCE_PAGES.map((p, i) => {
          const Icon = ICONS[p.id];
          const featured = i === 0;
          return (
            <li key={p.id} className={cn(featured && "sm:col-span-2 xl:col-span-1 xl:row-span-2")}>
              <Link
                href={p.href}
                className={cn(
                  "group flex h-full flex-col rounded-[var(--radius-lg)] border p-5 transition-colors",
                  featured
                    ? "border-teal-500/40 bg-gradient-to-br from-teal-500/[0.16] via-ink-800/70 to-ink-850/70 hover:border-teal-400/70"
                    : "border-[var(--line)] bg-ink-800/60 hover:border-teal-500/40",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className={cn("grid size-9 place-items-center rounded-[var(--radius-md)] border", featured ? "border-teal-400/50 bg-teal-500/20 text-teal-100" : "border-[var(--line-strong)] text-teal-300")}>
                    <Icon aria-hidden className="size-4.5" />
                  </span>
                  <ArrowUpRight aria-hidden className="size-4 text-fog-500 group-hover:text-teal-300" />
                </span>
                <span className={cn("mt-4 font-semibold text-paper", featured ? "text-[19px]" : "text-[16px]")}>{p.title}</span>
                <span className="mt-1.5 text-[13px] leading-snug text-fog-400">{p.short}</span>
                <span className="mt-auto flex flex-wrap items-center gap-x-2 pt-4 font-mono text-[11.5px] text-fog-500">
                  <span>{facts[p.id]}</span>
                  {p.sections.length ? <span>· {p.sections.map((s) => labelFor(s)).join(", ")}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <SectionTitle id="at-a-glance" sub="Handbook §B.10 — one decision, one governing rule and the numbers to remember at each layer.">
        Laser technology at a glance
      </SectionTitle>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute bottom-3 left-[13px] top-3 w-px bg-gradient-to-b from-teal-300/70 via-teal-500/30 to-teal-500/10" />
        <ol className="relative flex flex-col gap-2">
          {d.glanceRows.map((r, i) => (
            <li key={r.layer} className="relative pl-9">
              <span aria-hidden className="absolute left-[3px] top-4 grid size-[21px] place-items-center rounded-full border border-teal-400/60 bg-ink-900 font-mono text-[10px] text-teal-200">
                {i + 1}
              </span>
              <div className="grid gap-x-5 gap-y-2 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 px-4 py-3 md:grid-cols-[9rem_minmax(0,1.2fr)_minmax(0,1fr)]">
                <div>
                  <div className="text-[14.5px] font-semibold text-paper">{r.layer}</div>
                  <div className="text-[12.5px] text-teal-200">{r.decision}</div>
                </div>
                <div className="text-[13px] leading-snug text-fog-200">
                  <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fog-500">Governing rule</span>
                  {linkRefs(r.rule, `${i}-r`)}
                </div>
                <div className="text-[13px] leading-snug text-fog-300">
                  <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fog-500">Numbers to remember</span>
                  {linkRefs(r.numbers, `${i}-n`)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-3">
        <SourceRef section="B.10" />
      </p>

      <SectionTitle id="quick-reference" sub="Handbook §27.1 — where to find each topic, and the most-used numbers.">
        Quick reference
      </SectionTitle>
      <div className="grid gap-x-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-semibold text-fog-100">Where to find it</h3>
          <HandbookTable t={d.quickRef} caption={<SourceRef section="27.1" />} compact />
        </div>
        <div className="min-w-0">
          <h3 id="power" className="scroll-mt-24 text-[14.5px] font-semibold text-fog-100">
            Typical average power by application
          </h3>
          <HandbookTable t={d.powerByApp} caption={<SourceRef section="27.1" note="≈ values" />} compact />
        </div>
      </div>
      <h3 id="families" className="mt-4 scroll-mt-24 text-[14.5px] font-semibold text-fog-100">
        Laser families at a glance
      </h3>
      <HandbookTable t={d.families} caption={<SourceRef section="27.1" note="≈ values" />} compact />
      <h3 id="regimes" className="mt-4 scroll-mt-24 text-[14.5px] font-semibold text-fog-100">
        Pulse-duration regimes
      </h3>
      <HandbookTable t={d.regimes} caption={<SourceRef section="27.1" />} compact />

      <SectionTitle id="charts" sub="Handbook §B.4 — the reference charts and matrices in the body, and where LASERVERSE presents them interactively.">
        Charts and matrices
      </SectionTitle>
      <ul className="grid gap-2 md:grid-cols-2">
        {d.charts.map((c, i) => (
          <li key={c.item} className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 px-4 py-3">
            <div className="text-[14px] font-semibold text-fog-100">{c.item}</div>
            <div className="mt-0.5 text-[13px] text-fog-300">{linkRefs(c.where, `c${i}-`)}</div>
            {c.links.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.links.map((l) => (
                  <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-2.5 py-0.5 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
                    {l.label} <ArrowUpRight aria-hidden className="size-3" />
                  </Link>
                ))}
              </div>
            ) : null}
          </li>
        ))}
        <li className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 px-4 py-3">
          <div className="text-[14px] font-semibold text-fog-100">Process selection matrix</div>
          <div className="mt-0.5 text-[13px] text-fog-300">{linkRefs("§B.6", "b6-")}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link href="/processes#selection-matrix" className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-2.5 py-0.5 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
              Process Simulator matrix <ArrowUpRight aria-hidden className="size-3" />
            </Link>
          </div>
        </li>
      </ul>
      <p className="mt-2 text-[12px] text-fog-500">
        <SourceRef section="B.4" /> · Platform links point to the LASERVERSE pages that present each item; they are navigation, not handbook content.
      </p>

      <SectionTitle id="learning-path" sub="Handbook §B.9 — what to study at each stage, with the handbook's suggested resources.">
        Recommended learning path
      </SectionTitle>
      <HandbookTable t={d.learningPath} caption={<SourceRef section="B.9" />} compact />
      <p className="mt-2 text-[13px] text-fog-400">
        The academy follows the same progression:{" "}
        <Link href="/learn" className="text-teal-300 underline underline-offset-2">
          Learn
        </Link>
        .
      </p>
    </div>
  );
}
