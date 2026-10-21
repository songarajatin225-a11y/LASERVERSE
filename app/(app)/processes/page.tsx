import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookTable } from "@/components/handbook/Blocks";
import { PROCESS_DEFS, taxonomy, selectionMatrix } from "@/lib/content/processes";

export const metadata: Metadata = { title: "Process Simulator" };
const ITEM = { id: "tool:processes", kind: "tool" as const, title: "Process Simulator", href: "/processes" };

export default function ProcessesPage() {
  const families = taxonomy();
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Process Simulator" }]} />
      <PageHeader
        eyebrow="Laboratory"
        title="Process Simulator"
        description="Six process workspaces built on handbook Part X. Each combines the handbook's mechanism and decision tables with calculated tools (overlap, fluence, intensity, heat input, spot size) and clearly labelled conceptual animations. None of them is a predictive process model: they show which parameters matter and how, so that a DOE can be planned (§23.6)."
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="derived" />
        <ClassTag kind="conceptual" />
        <BookmarkButton item={ITEM} />
      </PageHeader>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROCESS_DEFS.map((p) => (
          <li key={p.id}>
            <Link href={`/processes/${p.id}`} className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-5 hover:border-teal-500/40">
              <span className="flex items-center justify-between gap-2 text-[16px] font-semibold text-fog-100">
                {p.title}
                <ArrowUpRight aria-hidden className="size-4 text-fog-500 group-hover:text-teal-300" />
              </span>
              <span className="mt-1.5 text-[13px] leading-snug text-fog-400">{p.short}</span>
              <span className="mt-auto pt-3 font-mono text-[11.5px] text-fog-500">§{p.sections.join(", §")}</span>
            </Link>
          </li>
        ))}
      </ul>

      <SectionTitle id="taxonomy" sub="Handbook §10.1 — five process families by mechanism.">
        Process taxonomy
      </SectionTitle>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {families.map((f) => (
          <article key={f["Family"]} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
            <h3 className="text-[15px] font-semibold text-paper">{f["Family"]}</h3>
            <p className="mt-1 text-[13px] leading-snug text-fog-300">{f["Process"]}</p>
            <dl className="mt-3 flex flex-col gap-1.5 text-[12.5px] leading-snug">
              <div>
                <dt className="inline text-fog-500">Mechanism: </dt>
                <dd className="inline text-fog-200">{f["Mechanism"]}</dd>
              </div>
              <div>
                <dt className="inline text-fog-500">Typical lasers: </dt>
                <dd className="inline text-fog-200">{f["Typical lasers"]}</dd>
              </div>
              <div>
                <dt className="inline text-fog-500">Quality metrics: </dt>
                <dd className="inline text-fog-200">{f["Key quality metrics"]}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="mt-3">
        <SourceRef section="10.1" />
      </p>

      <SectionTitle id="selection-matrix" sub="Handbook §B.6 — typical laser per material and process.">
        Process selection matrix
      </SectionTitle>
      <HandbookTable t={selectionMatrix()} caption={<SourceRef section="B.6" />} compact />
    </div>
  );
}
