import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { Blocks } from "@/components/handbook/Blocks";
import { ReferenceNav } from "@/features/reference/ReferenceNav";
import { sourcesData } from "@/lib/content/reference";

export const metadata: Metadata = { title: "Sources & External Links" };
const ITEM = { id: "reference:sources", kind: "reference" as const, title: "Sources & External Links", href: "/reference/sources" };

export default function SourcesPage() {
  const { blocks, links, total } = sourcesData();
  const cited = links.filter((l) => l.locations.some((x) => x !== "back.sources"));
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Reference Library", href: "/reference" }, { label: "Sources & External Links" }]} />
      <PageHeader
        eyebrow="Reference Library"
        title="Sources & External Links"
        description={
          <>
            The handbook&rsquo;s own Sources page, reproduced as written, followed by every external link found in the handbook ({links.length} distinct pages,{" "}
            {total} links in all; {cited.length} of the pages are cited in the body of the handbook). <SourceRef section="back.sources" />
          </>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="external" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <ReferenceNav current="sources" />

      <Callout kind="limitation" title="External pages are not verified by LASERVERSE">
        These links point to third-party sites. LASERVERSE has not checked that they are still online, unchanged or accurate, and does not endorse them. Supplier
        specifications and regulatory texts must be checked against their current, official versions.
      </Callout>

      <SectionTitle id="handbook-sources" sub="Handbook back matter — Sources.">
        The handbook&rsquo;s Sources page
      </SectionTitle>
      <div className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/50 p-4 sm:p-6">
        <Blocks blocks={blocks} figures={new Map()} sectionId="back.sources" />
      </div>

      <SectionTitle id="external-links" sub="Every external link in the handbook, with the places that cite it. Links open in a new tab.">
        All external links
      </SectionTitle>
      <ul className="grid gap-3 md:grid-cols-2">
        {links.map((l) => (
          <li key={l.href} className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
            <a href={l.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-1.5 text-[14px] font-medium leading-snug text-fog-100 hover:text-teal-100">
              <span>{l.text}</span>
              <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fog-500 group-hover:text-teal-300" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <div className="mt-1 break-all font-mono text-[11.5px] text-fog-500">{l.host}</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fog-500">
              <span>Cited in</span>
              {l.locations.map((loc) => (
                <SourceRef key={loc} section={loc} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
