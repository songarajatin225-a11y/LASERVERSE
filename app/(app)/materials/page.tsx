import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { MaterialsLab } from "@/features/materials/MaterialsLab";
import { materialsLabData } from "@/lib/content/materials";

export const metadata: Metadata = { title: "Material Interaction Lab" };
const ITEM = { id: "tool:materials", kind: "tool" as const, title: "Material Interaction Lab", href: "/materials" };

export default function MaterialsPage() {
  const data = materialsLabData();
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Material Interaction Lab" }]} />
      <PageHeader
        eyebrow="Laboratory"
        title="Material Interaction Lab"
        description={
          <>
            “{data.quotes.fates}” <SourceRef section="9.1" /> Explore where materials absorb, how far heat travels during the interaction, how ablation scales with fluence and
            which regime a pulse duration puts you in — using only the values and statements the handbook provides.
          </>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="derived" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <Suspense fallback={<div className="h-[560px] animate-pulse rounded-[var(--radius-xl)] bg-ink-800" />}>
        <MaterialsLab data={data} />
      </Suspense>
    </div>
  );
}
