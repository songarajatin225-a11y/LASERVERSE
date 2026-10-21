import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag } from "@/components/ui/primitives";
import { BeamOpticsTabs } from "@/features/beam-optics/BeamOpticsTabs";
import { opticalComponents, opticalChain, opticalMaterials, opticalMatrix } from "@/lib/content/labData";

export const metadata: Metadata = { title: "Beam & Optics Lab" };

export default function BeamOpticsPage() {
  return (
    <div>
      <TrackVisit item={{ id: "tool:beam-optics", kind: "tool", title: "Beam & Optics Lab", href: "/beam-optics" }} />
      <Breadcrumbs items={[{ label: "Beam & Optics Lab" }]} />
      <PageHeader
        eyebrow="Laboratory"
        title="Beam & Optics Lab"
        description="Gaussian beams, M², BPP, spot size and depth of focus; the optical components of a beam train; and the optical materials that transmit each wavelength. Built on handbook Parts IV and V."
      >
        <ClassTag kind="derived" />
        <ClassTag kind="handbook" />
        <BookmarkButton item={{ id: "tool:beam-optics", kind: "tool", title: "Beam & Optics Lab", href: "/beam-optics" }} />
      </PageHeader>
      <Suspense fallback={<div className="h-[520px] animate-pulse rounded-[var(--radius-xl)] bg-ink-800" />}>
        <BeamOpticsTabs components={opticalComponents()} chain={opticalChain()} materials={opticalMaterials()} matrix={opticalMatrix()} />
      </Suspense>
    </div>
  );
}
