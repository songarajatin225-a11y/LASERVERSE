import type { Metadata } from "next";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookFigure } from "@/components/handbook/Blocks";
import { ReferenceNav } from "@/features/reference/ReferenceNav";
import { TechnologyMap } from "@/features/reference/TechnologyMap";
import { technologyMapData, hierarchyFigure } from "@/lib/content/reference";

export const metadata: Metadata = {
  title: "Master Laser Technology Map",
  description: "The Complete Laser Handbook's master technology map as an interactive tree, from the photon to industries, with branches linked to the Parts the handbook names for them.",
};
const ITEM = { id: "reference:map", kind: "reference" as const, title: "Master Laser Technology Map", href: "/reference/map" };

export default function TechnologyMapPage() {
  const data = technologyMapData();
  const hierarchy = hierarchyFigure();
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Reference Library", href: "/reference" }, { label: "Master Technology Map" }]} />
      <PageHeader
        eyebrow="Reference Library · Part XXVIII"
        title="Master Laser Technology Map"
        description={
          <>
            “{data.intro}” <SourceRef section="28.0" />
          </>
        }
      >
        <ClassTag kind="handbook" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <ReferenceNav current="map" />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <TechnologyMap data={data} />
          <details className="group mt-8 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-850/60">
            <summary className="cursor-pointer select-none px-4 py-3 text-[13px] text-fog-300 hover:text-fog-100">
              Show the handbook&rsquo;s original text tree <span className="text-fog-500">(§28.0, verbatim)</span>
            </summary>
            <pre className="scrollbar-thin overflow-x-auto border-t border-[var(--line)] p-4 font-mono text-[11.5px] leading-[1.6] text-fog-200">{data.preformatted}</pre>
          </details>
        </div>

        <aside aria-labelledby="hierarchy" className="min-w-0 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto xl:pr-1 scrollbar-thin">
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
            <h2 id="hierarchy" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">
              Laser technology hierarchy
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fog-200">
              “{hierarchy.note}” <SourceRef section="front.laser-technology-hierarchy" />
            </p>
            <div className="[&>figure]:mb-0 [&>figure]:mt-4">
              <HandbookFigure fig={hierarchy.figure} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
