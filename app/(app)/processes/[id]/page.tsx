import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookTable } from "@/components/handbook/Blocks";
import { OverlapSimulator } from "@/features/processes/OverlapSimulator";
import { MarkingSelector, WeldingTool, CuttingTool, DrillingTool, WavelengthTool } from "@/features/processes/ProcessTools";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";
import {
  PROCESS_DEFS,
  processDef,
  processIntro,
  processTables,
  referenceMachines,
  markingData,
  weldingData,
  cuttingData,
  cleaningData,
  drillingData,
  wavelengthData,
  bondEnergies,
  type ProcessDef,
} from "@/lib/content/processes";

export function generateStaticParams() {
  return PROCESS_DEFS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: processDef(id)?.title ?? "Process" };
}

function Tool({ def }: { def: ProcessDef }) {
  switch (def.id) {
    case "marking": {
      const d = markingData();
      return (
        <>
          <MarkingSelector matrix={d.matrix} mechanisms={d.mechanisms} />
          <OverlapSimulator context="marking" />
          <Callout kind="note" title="Marking parameters (§10.2)">
            “{d.quality}”
          </Callout>
        </>
      );
    }
    case "welding": {
      const d = weldingData();
      return (
        <>
          <WeldingTool modes={d.modes} />
          <Callout kind="note" title="Penetration and heat input (§10.4)">
            “{d.penetration}”
          </Callout>
          <Callout kind="note" title="Why effective absorption rises during welding (§9.2)">
            “{d.keyhole}”
          </Callout>
        </>
      );
    }
    case "cutting": {
      const d = cuttingData();
      return (
        <>
          <CuttingTool mechanisms={d.mechanisms} />
          <Callout kind="note" title="The cut front (§10.3)">
            “{d.front}” “{d.iso}”
          </Callout>
          <SectionTitle id="comparison" sub="Handbook §10.3 — technology comparison across criteria.">
            CW fiber vs CO₂ vs UV ns vs ultrashort pulse
          </SectionTitle>
          <HandbookTable t={d.comparison} caption={<SourceRef section="10.3" note="technology comparison" />} compact />
        </>
      );
    }
    case "cleaning": {
      const d = cleaningData();
      return (
        <>
          <Callout kind="note" title="The process window (§10.9)">
            “{d.window}”
          </Callout>
          <OverlapSimulator context="cleaning" />
        </>
      );
    }
    case "drilling": {
      const d = drillingData();
      return <DrillingTool methods={d.methods} />;
    }
    case "uv-co2": {
      const d = wavelengthData();
      return (
        <>
          <WavelengthTool bonds={bondEnergies()} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Callout kind="note" title="“Cold” UV processing, stated precisely (§10.14)">
              “{d.uvCold}”
            </Callout>
            <Callout kind="note" title="CO₂ beam delivery and spot size (§10.13)">
              “{d.co2Optics}”
            </Callout>
          </div>
          <Callout kind="note" title="When ultrafast instead (§10.15)">
            “{d.ultrafast}”
          </Callout>
        </>
      );
    }
  }
}

export default async function ProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const def = processDef(id);
  if (!def) notFound();
  const intro = processIntro(def);
  const tables = processTables(def);
  const machines = referenceMachines().filter((m) => def.machines.some((name) => m.title.startsWith(name)));
  const item = { id: `process:${def.id}`, kind: "tool" as const, title: def.title, href: `/processes/${def.id}` };
  return (
    <div>
      <TrackVisit item={item} />
      <Breadcrumbs items={[{ label: "Process Simulator", href: "/processes" }, { label: def.title }]} />
      <PageHeader
        eyebrow="Process workspace"
        title={def.title}
        description={
          <div className="flex flex-col gap-2">
            {intro.map((q) => (
              <p key={q.section}>
                “{q.text}” <SourceRef section={q.section} />
              </p>
            ))}
          </div>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="derived" />
        <ClassTag kind="conceptual" />
        <BookmarkButton item={item} />
      </PageHeader>

      <div className="flex flex-col gap-5">
        <Tool def={def} />
      </div>

      {tables.map((t) => (
        <section key={`${t.section}-${t.title}`}>
          <SectionTitle id={t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>{t.title}</SectionTitle>
          <HandbookTable t={t.table} caption={<SourceRef section={t.section} />} compact />
        </section>
      ))}

      {machines.length ? (
        <>
          <SectionTitle id="machines" sub="Handbook §26.1 reference machine architectures for this process.">
            Reference machines
          </SectionTitle>
          <div className="grid gap-4 xl:grid-cols-2">
            {machines.map((m) => (
              <div key={m.title}>
                <h3 className="text-[14.5px] font-semibold text-fog-100">{m.title}</h3>
                <HandbookTable t={m.table} caption={<SourceRef section="26.1" />} compact />
              </div>
            ))}
          </div>
        </>
      ) : null}

      <SectionTitle id="tools">Calculators for this process</SectionTitle>
      <ul className="flex flex-wrap gap-2">
        {def.calculators.map((c) => (
          <li key={c}>
            <Link href={`/calculators/${c}`} className="inline-flex rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[13px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
              {CALCULATOR_INDEX.get(c)?.title ?? c}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/troubleshooting" className="inline-flex rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[13px] text-teal-100 hover:bg-teal-500/20">
            Troubleshooting →
          </Link>
        </li>
      </ul>
    </div>
  );
}
