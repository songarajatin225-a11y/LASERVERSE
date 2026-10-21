import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookFigure } from "@/components/handbook/Blocks";
import { ReferenceNav } from "@/features/reference/ReferenceNav";
import { formulaGroups, type FormulaGroup } from "@/lib/content/reference";
import { hrefFor, partOf } from "@/lib/content/outline";

export const metadata: Metadata = { title: "Formula Library" };
const ITEM = { id: "reference:formulas", kind: "reference" as const, title: "Formula Library", href: "/reference/formulas" };

function Group({ g, level = 3 }: { g: FormulaGroup; level?: 3 | 4 }) {
  const Heading = level === 3 ? "h3" : "h4";
  return (
    <section aria-labelledby={g.id} className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading id={g.id} className="scroll-mt-24 text-[16px] font-semibold text-paper">
            {g.title}
          </Heading>
          <p className="mt-1 text-[12.5px] text-fog-500">
            {g.figures.length} equation image{g.figures.length === 1 ? "" : "s"} · <SourceRef section={g.sectionId} />
          </p>
        </div>
        <Link
          href={hrefFor(g.sectionId)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-[12.5px] text-teal-100 hover:bg-teal-500/20"
        >
          Open lesson <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      <div className="mt-2">
        {g.figures.map((f) => (
          <div key={f.id} id={f.id} className="scroll-mt-24 [&>figure]:my-4">
            <HandbookFigure fig={f} />
          </div>
        ))}
      </div>
      {g.calculators.length ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-3">
          <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">
            <Calculator aria-hidden className="size-3.5" /> Related calculators
          </span>
          {g.calculators.map((c) => (
            <Link
              key={c.id}
              href={`/calculators/${c.id}`}
              className="inline-flex rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100"
            >
              {c.title}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function FormulasPage() {
  const groups = formulaGroups();
  const sheet = groups.filter((g) => g.sheet);
  const body = groups.filter((g) => !g.sheet);
  const total = groups.reduce((n, g) => n + g.figures.length, 0);
  const byPart = new Map<string, { title: string; groups: FormulaGroup[] }>();
  for (const g of body) {
    const p = partOf(g.sectionId);
    const key = p?.id ?? "other";
    const entry = byPart.get(key) ?? { title: p ? (p.roman ? `Part ${p.roman} — ${p.title}` : p.title) : "Other", groups: [] };
    entry.groups.push(g);
    byPart.set(key, entry);
  }
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Reference Library", href: "/reference" }, { label: "Formula Library" }]} />
      <PageHeader
        eyebrow="Reference Library"
        title="Formula Library"
        description={
          <>
            Every equation in the handbook — {total} equation images — starting with the §B.3 formula sheet and then section by section. Each group links to its
            lesson and to the calculators that implement those equations. Anchors use the figure id, so any equation can be linked directly.
          </>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="unverified" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <ReferenceNav current="formulas" />

      <Callout kind="review" title="Equations are images in the handbook">
        The supplied handbook embeds every equation as a picture, so none could be extracted as text. The LaTeX shown here was transcribed by reading each image and
        is marked <em>Transcribed equation · review</em> until a reviewer signs it off. Open “Show the original handbook image” under any equation to compare.{" "}
        <Link href="/reference/status#equations" className="text-teal-300 underline underline-offset-2">
          Transcription status
        </Link>
      </Callout>

      <nav aria-label="Formula groups" className="mt-6 grid gap-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-850/60 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Formula sheet (§B.3)</div>
          <ul className="flex flex-wrap gap-1.5">
            {sheet.map((g) => (
              <li key={g.id}>
                <a href={`#${g.id}`} className="inline-flex rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
                  {g.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">In the body, by section</div>
          <ul className="flex flex-wrap gap-1.5">
            {body.map((g) => (
              <li key={g.id}>
                <a href={`#${g.id}`} className="inline-flex rounded-full border border-[var(--line-strong)] px-2.5 py-1 font-mono text-[11.5px] text-fog-300 hover:border-teal-400/60 hover:text-teal-100" title={g.title}>
                  §{g.sectionId}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <SectionTitle id="formula-sheet" sub={`Handbook §B.3 — the ${sheet.length} groups of the formula sheet, in the handbook's order.`}>
        Formula sheet
      </SectionTitle>
      <div className="flex flex-col gap-4">
        {sheet.map((g) => (
          <Group key={g.id} g={g} />
        ))}
      </div>

      <SectionTitle id="by-section" sub="Equations where the handbook first develops them, grouped by Part and section.">
        Equations in the body
      </SectionTitle>
      <div className="flex flex-col gap-8">
        {[...byPart.entries()].map(([key, p]) => (
          <div key={key}>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-teal-300">{p.title}</h3>
            <div className="grid gap-4 xl:grid-cols-2">
              {p.groups.map((g) => (
                <Group key={g.id} g={g} level={4} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
