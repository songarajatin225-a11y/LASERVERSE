import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, Badge } from "@/components/ui/primitives";
import { SourceExplorer } from "@/features/sources/SourceExplorer";
import { sourceCatalogue, wavelengthMap, familiesAtAGlance, FAMILY_LABEL } from "@/lib/content/sources";

export const metadata: Metadata = { title: "Laser Source Explorer" };

export default function SourcesPage() {
  const entries = sourceCatalogue().map((e) => ({ ...e, familyLabel: FAMILY_LABEL[e.family] }));
  return (
    <div>
      <TrackVisit item={{ id: "tool:sources", kind: "tool", title: "Laser Source Explorer", href: "/sources" }} />
      <Breadcrumbs items={[{ label: "Laser Source Explorer" }]} />
      <PageHeader
        eyebrow="Laboratory"
        title="Laser Source Explorer"
        description="Every source family in handbook Part III — solid-state, fiber, gas, semiconductor, ultrafast regimes and specialised lasers — with physics, pump, wavelength, power, pulse regime, efficiency, beam quality, advantages, limitations, applications and representative suppliers, exactly as the handbook tables state them."
      >
        <ClassTag kind="handbook" />
        <Badge>{entries.length} source entries</Badge>
        <Badge>24 wavelength lines</Badge>
        <BookmarkButton item={{ id: "tool:sources", kind: "tool", title: "Laser Source Explorer", href: "/sources" }} />
      </PageHeader>
      <Suspense>
        <SourceExplorer entries={entries} lines={wavelengthMap()} families={familiesAtAGlance()} />
      </Suspense>
    </div>
  );
}
