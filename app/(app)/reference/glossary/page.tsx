import type { Metadata } from "next";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { ReferenceNav } from "@/features/reference/ReferenceNav";
import { GlossaryExplorer } from "@/features/reference/GlossaryExplorer";
import { glossaryData } from "@/lib/content/reference";

export const metadata: Metadata = { title: "Glossary & Abbreviations" };
const ITEM = { id: "reference:glossary", kind: "reference" as const, title: "Glossary & Abbreviations", href: "/reference/glossary" };

export default function GlossaryPage() {
  const { terms, abbreviations } = glossaryData();
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Reference Library", href: "/reference" }, { label: "Glossary & Abbreviations" }]} />
      <PageHeader
        eyebrow="Reference Library"
        title="Glossary & Abbreviations"
        description={
          <>
            The handbook&rsquo;s {terms.length} defined terms and {abbreviations.length} abbreviations, verbatim. Filter both lists at once, jump by letter, or link
            straight to an entry — every term and abbreviation has its own stable anchor. Cross-links between a term and its abbreviation are matched on the exact
            letters in both tables. <SourceRef section="B.1" /> <SourceRef section="B.2" />
          </>
        }
      >
        <ClassTag kind="handbook" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <ReferenceNav current="glossary" />
      <GlossaryExplorer terms={terms} abbreviations={abbreviations} />
    </div>
  );
}
