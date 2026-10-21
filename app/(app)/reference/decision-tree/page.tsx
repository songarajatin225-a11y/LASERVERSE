import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookFigure, HandbookTable } from "@/components/handbook/Blocks";
import { linkRefs } from "@/components/handbook/linkRefs";
import { ReferenceNav } from "@/features/reference/ReferenceNav";
import { DecisionTree } from "@/features/reference/DecisionTree";
import { decisionTreeData, decisionTreeFigure, selectionFramework } from "@/lib/content/reference";

export const metadata: Metadata = { title: "Laser Selection Decision Tree" };
const ITEM = { id: "reference:decision-tree", kind: "reference" as const, title: "Laser Selection Decision Tree", href: "/reference/decision-tree" };

export default function DecisionTreePage() {
  const data = decisionTreeData();
  const figure = decisionTreeFigure();
  const framework = selectionFramework();
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Reference Library", href: "/reference" }, { label: "Laser Selection Decision Tree" }]} />
      <PageHeader
        eyebrow="Reference Library · §B.5"
        title="Laser Selection Decision Tree"
        description={
          <>
            Walk the handbook&rsquo;s selection tree from a material class to a candidate laser, then confirm it the way the handbook asks: “{linkRefs(data.confirm)}”{" "}
            <SourceRef section="B.5" />
          </>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="unverified" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <ReferenceNav current="decision-tree" />

      <Callout kind="review" title="Transcribed from the handbook figure — needs review" className="mb-6">
        In the handbook this tree exists only as an image. The branches below were encoded from a text transcription of that image and are checked against it by a
        test, but the transcription itself has not yet been reviewed against the original. Compare with the figure further down. The tree names candidate laser types;
        it does not replace the absorption, HAZ and DOE checks, and LASERVERSE does not certify any process choice.
      </Callout>

      <DecisionTree data={data} />

      <SectionTitle id="figure" sub="The original handbook figure the interactive tree was transcribed from.">
        Original figure
      </SectionTitle>
      <div className="mx-auto max-w-3xl">
        <HandbookFigure fig={figure} />
      </div>

      <SectionTitle id="framework" sub="Handbook §23.3 — the selection questions with the rule for each, the framework figure, and worked selections.">
        Laser process selection framework
      </SectionTitle>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-semibold text-fog-100">Selection questions and rules</h3>
          <HandbookTable t={framework.questions} caption={<SourceRef section="23.3" note="selection questions" />} compact />
          <h3 className="mt-8 text-[14.5px] font-semibold text-fog-100">Worked selections</h3>
          <HandbookTable t={framework.examples} caption={<SourceRef section="23.3" note="examples" />} compact />
        </div>
        <div className="min-w-0">
          <HandbookFigure fig={framework.figure} />
        </div>
      </div>
      <p className="mt-2 text-[13px] text-fog-400">
        Related: the{" "}
        <Link href="/processes#selection-matrix" className="text-teal-300 underline underline-offset-2">
          process selection matrix (§B.6)
        </Link>{" "}
        and{" "}
        <Link href="/reference#families" className="text-teal-300 underline underline-offset-2">
          laser families at a glance (§27.1)
        </Link>
        .
      </p>
    </div>
  );
}
