import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag } from "@/components/ui/primitives";
import { PhysicsLabTabs } from "@/features/physics-lab/PhysicsLabTabs";
import { photonLines, archBlocks, couplers } from "@/lib/content/labData";

export const metadata: Metadata = { title: "Physics Lab" };

export default function PhysicsLabPage() {
  return (
    <div>
      <TrackVisit item={{ id: "tool:physics-lab", kind: "tool", title: "Physics Lab", href: "/physics-lab" }} />
      <Breadcrumbs items={[{ label: "Physics Lab" }]} />
      <PageHeader
        eyebrow="Laboratory"
        title="Physics Lab"
        description={
          <>
            Light from first principles: photon energy, waves and polarisation, energy levels and inversion, the optical cavity and pulse
            formats. Numbers come from tested calculation functions; animations are labelled conceptual. Companion lessons:{" "}
            <Link className="text-teal-300 underline" href="/learn/part-1">
              Part I
            </Link>{" "}
            and{" "}
            <Link className="text-teal-300 underline" href="/learn/part-2">
              Part II
            </Link>
            .
          </>
        }
      >
        <ClassTag kind="derived" />
        <ClassTag kind="conceptual" />
        <BookmarkButton item={{ id: "tool:physics-lab", kind: "tool", title: "Physics Lab", href: "/physics-lab" }} />
      </PageHeader>
      <Suspense fallback={<div className="h-[520px] animate-pulse rounded-[var(--radius-xl)] bg-ink-800" />}>
        <PhysicsLabTabs lines={photonLines()} blocks={archBlocks()} couplers={couplers()} />
      </Suspense>
    </div>
  );
}
