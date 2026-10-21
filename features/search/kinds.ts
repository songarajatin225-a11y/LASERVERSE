import type { SearchKind } from "@/lib/search/engine";
import type { Classification } from "@/lib/content/classification";

/** Display order of the kind filter chips on /search. */
export const KIND_ORDER: SearchKind[] = [
  "lesson",
  "part",
  "glossary",
  "abbreviation",
  "formula",
  "figure",
  "tool",
  "calculator",
  "source",
  "application",
  "troubleshooting",
  "component",
  "quiz",
];

/**
 * Source-integrity class of the text a result shows. Lesson, part, glossary, abbreviation,
 * source, application and troubleshooting text is handbook wording (tables and paragraphs).
 * Figure and equation results show titles and descriptions written for LASERVERSE from the
 * images (the handbook embeds them as pictures), and tool, component and quiz descriptions are
 * platform text too: they cite handbook sections but are not quotations. Calculators are derived.
 */
export const KIND_CLASS: Record<SearchKind, Classification> = {
  lesson: "handbook",
  part: "handbook",
  glossary: "handbook",
  abbreviation: "handbook",
  formula: "additional",
  figure: "additional",
  tool: "additional",
  calculator: "derived",
  source: "handbook",
  application: "handbook",
  troubleshooting: "handbook",
  component: "additional",
  quiz: "additional",
};

/** Starter queries offered on the empty and no-results states. */
export const SUGGESTED_QUERIES = ["keyhole", "BPP", "galvo", "DataMatrix", "Rayleigh range", "NOHD", "fluence", "MOPA", "porosity", "IEC 60825-1"];

export function isSearchKind(k: string): k is SearchKind {
  return (KIND_ORDER as string[]).includes(k);
}
