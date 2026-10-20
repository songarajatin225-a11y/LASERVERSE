import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, Callout, SectionTitle } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookTable } from "@/components/handbook/Blocks";
import { MachineExplorer } from "@/features/machine-explorer/MachineExplorer";
import { COMPONENTS } from "@/features/machine-explorer/machineData";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { getTable } from "@/lib/content/handbook";

export const metadata: Metadata = { title: "3D Machine Explorer" };

const ITEM = { id: "tool:machine", kind: "tool" as const, title: "3D Machine Explorer", href: "/machine" };

export default function MachinePage() {
  const ids = new Set(COMPONENTS.flatMap((c) => c.calculators ?? []));
  const calcTitles = Object.fromEntries([...ids].map((id) => [id, CALCULATOR_INDEX.get(id)?.title ?? id]));
  const reference = getTable("26.1", 1, ["Aspect", "Typical configuration"]);
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "3D Machine Explorer" }]} />
      <PageHeader
        eyebrow="Laboratory"
        title="3D Machine Explorer"
        description={
          <>
            A generic Class 1 fiber-laser marking workstation assembled from the reference architecture in <SourceRef section="26.1" />. Orbit, zoom and pan; select any
            component for its function, specification and watch-outs; explode the assemblies; toggle the optical, mechanical, vision, automation and safety layers; trace the
            optical path and the control and safety signals; and run a marking job through the conceptual interlock logic.
          </>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="conceptual" />
        <BookmarkButton item={ITEM} />
      </PageHeader>

      <Suspense fallback={<div className="h-[640px] animate-pulse rounded-[var(--radius-xl)] bg-ink-800" />}>
        <MachineExplorer calcTitles={calcTitles} />
      </Suspense>

      <SectionTitle id="about-model" sub="What the model shows, and what it does not.">
        About this model
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Callout kind="conceptual" title="Modelled from the handbook">
          <ul>
            <li>Component list, functions, specifications and watch-outs are taken from the cited handbook sections (§26.1 machine 1, Parts V–VII and XI–XII).</li>
            <li>
              Scanner mirrors rotate by half the optical scan angle, with θ = s / f and f = 160 mm (<SourceRef section="5.1" />, <SourceRef section="26.1" />).
            </li>
            <li>Emission is shown only when the conceptual permission logic is satisfied: key on, E-stop released, door closed, extraction running and a job requested.</li>
          </ul>
        </Callout>
        <Callout kind="limitation" title="Not modelled">
          <ul>
            <li>Geometry is original, simplified and illustrative — not a vendor design and not to scale in every detail. Enclosure and cabinet skins are drawn translucent.</li>
            <li>The 1064 nm beam is invisible in reality; it is drawn in false colour. The beam cone and spot are enlarged for visibility.</li>
            <li>The job pattern is an illustrative 2D-code-like grid, not an encoded DataMatrix. No process physics (mark contrast, heat input) is simulated here.</li>
            <li>The interlock logic is a teaching simplification, not a functional-safety design, and this page does not certify any machine.</li>
          </ul>
        </Callout>
      </div>

      <SectionTitle id="reference-architecture" sub="Handbook table, reproduced as extracted.">
        Reference architecture — fiber laser marking machine (Class 1 workstation)
      </SectionTitle>
      <HandbookTable t={reference} caption={<SourceRef section="26.1" note="machine 1" />} />
    </div>
  );
}
