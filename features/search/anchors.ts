import { slug } from "@/lib/slug";

/**
 * Anchor ids for repeated items on one page (glossary terms, abbreviations). Each value
 * is slugged with lib/slug; a slug that has already been used earlier in table order gets
 * a "-2", "-3", … suffix. The reference pages and the search index both call this, so a
 * search hit always lands on the row it names.
 */
export function uniqueSlugs(values: string[]): string[] {
  const seen = new Map<string, number>();
  return values.map((v) => {
    const base = slug(v) || "item";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

/** `term-<slug>` anchors for the §B.1 glossary, in table order. */
export function glossaryAnchors(terms: string[]): string[] {
  return uniqueSlugs(terms).map((s) => `term-${s}`);
}

/** `abbr-<slug>` anchors for the §B.2 abbreviation dictionary, in table order. */
export function abbreviationAnchors(abbreviations: string[]): string[] {
  return uniqueSlugs(abbreviations).map((s) => `abbr-${s}`);
}
