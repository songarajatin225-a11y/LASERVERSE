import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { CALCULATORS } from "@/features/calculators/definitions";
import { CATEGORY_LABEL, type CalcCategory } from "@/features/calculators/types";
import { PageHeader, ClassTag, Callout } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/shell/Chrome";
import { Tex } from "@/components/ui/Tex";

export const metadata: Metadata = { title: "Engineering Calculators" };

const ORDER: CalcCategory[] = ["physics", "laser", "pulse", "beam", "interaction", "process", "safety", "economics"];

export default function CalculatorsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Engineering Calculators" }]} />
      <PageHeader
        eyebrow="Engineering toolbox"
        title="Engineering calculators"
        description={
          <>
            {CALCULATORS.length} unit-aware calculators built on the handbook&apos;s equations. Each one shows the equation, variable definitions,
            assumptions, limitations and the handbook section it comes from, and every implementation is covered by tests that reproduce the
            handbook&apos;s own worked examples.
          </>
        }
      >
        <ClassTag kind="derived" />
      </PageHeader>
      <Callout kind="note" className="mb-10 max-w-3xl">
        Calculators evaluate documented relationships for the inputs you give them. They do not predict process quality, certify safety or
        replace measurement. Financial results are illustrative and depend entirely on your assumptions.
      </Callout>
      <div className="flex flex-col gap-12">
        {ORDER.map((cat) => {
          const items = CALCULATORS.filter((c) => c.category === cat);
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-fog-400">
                {CATEGORY_LABEL[cat]} <span className="text-fog-500">· {items.length}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/calculators/${c.id}`}
                      className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4 transition-[border-color,background,transform] duration-300 hover:-translate-y-0.5 hover:border-teal-500/40 hover:bg-ink-750"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[15px] font-semibold leading-snug text-fog-100 group-hover:text-paper">{c.title}</h3>
                        <ArrowRight aria-hidden className="mt-0.5 size-4 shrink-0 text-fog-500 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300" />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-fog-400">{c.summary}</p>
                      <div className="mt-auto overflow-hidden pt-4 text-[13px] text-fog-300 [&_.katex]:text-[0.95em]">
                        <Tex math={c.equations[0]!} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
