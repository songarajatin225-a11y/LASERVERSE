import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag } from "@/components/ui/primitives";
import { ReferenceNav } from "@/features/reference/ReferenceNav";
import { FigureGallery } from "@/features/reference/FigureGallery";
import { figureGallery } from "@/lib/content/reference";

export const metadata: Metadata = { title: "Figure Gallery" };
const ITEM = { id: "reference:figures", kind: "reference" as const, title: "Figure Gallery", href: "/reference/figures" };

export default function FiguresPage() {
  const figures = figureGallery();
  const diagrams = figures.filter((f) => f.kind === "diagram").length;
  const equations = figures.filter((f) => f.kind === "equation").length;
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Reference Library", href: "/reference" }, { label: "Figure Gallery" }]} />
      <PageHeader
        eyebrow="Reference Library"
        title="Figure Gallery"
        description={
          <>
            All {figures.length} images embedded in the handbook: {diagrams} diagrams and {equations} equation images, each with a title, the section it belongs to
            and, for diagrams, a text description. Equation images carry a <em>review required</em> status because their LaTeX is a manual transcription — see the{" "}
            <Link href="/reference/formulas" className="text-teal-300 underline underline-offset-2">
              Formula Library
            </Link>
            . Titles and diagram descriptions were written from the images for accessibility and search; they describe the figures and are not handbook text.
          </>
        }
      >
        <ClassTag kind="handbook" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <ReferenceNav current="figures" />
      <FigureGallery figures={figures} />
    </div>
  );
}
