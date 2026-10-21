/**
 * Plain, client-safe data shapes for the Reference Library. The server adapter
 * (lib/content/reference.ts) builds these from the ingested handbook; client
 * components only ever receive them as props.
 */

export interface PlatformLink {
  label: string;
  href: string;
}

/* ------------------------------------------------------------------ glossary */
export interface GlossaryEntry {
  term: string;
  definition: string;
  /** unique DOM anchor, `term-<slug(term)>` (suffix -2, -3 … on duplicates) */
  anchor: string;
  /** A–Z jump letter ("#" for anything else) */
  letter: string;
  /** the §B.2 abbreviation this term names in parentheses (or is), when there is one */
  abbr?: { anchor: string; label: string };
}

export interface AbbreviationEntry {
  abbr: string;
  meaning: string;
  /** unique DOM anchor, `abbr-<slug(abbreviation)>` */
  anchor: string;
  letter: string;
  /** §B.1 glossary terms that spell this abbreviation out */
  terms: Array<{ anchor: string; label: string }>;
}

/* ------------------------------------------------------------------ figures */
export interface FigureCard {
  id: string;
  file: string;
  width: number | null;
  height: number | null;
  kind: "equation" | "diagram" | "unknown";
  title: string | null;
  alt: string | null;
  status: "extracted" | "review-required";
  sectionId: string;
  sectionLabel: string;
  sectionHref: string;
  hasLatex: boolean;
}

/* ------------------------------------------------------------------ technology map */
export interface MapNode {
  /** unique DOM-safe id */
  id: string;
  /** branch name exactly as printed in the §28.0 tree */
  label: string;
  /** "·"-separated choices listed on the branch, verbatim */
  items: string[];
  /** Part reference printed at the end of the branch, e.g. "Parts XI–XII" */
  partText: string | null;
  /** part numbers parsed from partText */
  parts: number[];
  children: MapNode[];
  /** platform links (not handbook content) */
  explore: PlatformLink[];
  /** handbook sections whose titles name this branch (navigation aid) */
  sections: Array<{ id: string; label: string; href: string }>;
}

export interface TechnologyMapData {
  root: MapNode;
  /** §28.0 opening paragraph (verbatim) */
  intro: string;
  /** §28.0 closing paragraph (verbatim) */
  outro: string;
  /** the upward walk named in the closing paragraph, split on "→"; target = map node id to jump to (navigation aid) */
  chain: Array<{ text: string; target: string | null }>;
  /** the original preformatted tree, verbatim */
  preformatted: string;
}

/* ------------------------------------------------------------------ decision tree */
export interface DecisionBranch {
  id: string;
  /** condition text as transcribed from the §B.5 figure */
  condition: string;
  /** recommendation text as transcribed from the §B.5 figure */
  recommendation: string;
  /** platform links for the next step (not handbook content) */
  explore: PlatformLink[];
}

export interface DecisionClass {
  id: string;
  label: string;
  branches: DecisionBranch[];
  /** handbook lessons on this material class (navigation aid) */
  sections: Array<{ id: string; label: string; href: string }>;
}

export interface DecisionTreeData {
  question: string;
  classes: DecisionClass[];
  /** §B.5 paragraph (verbatim) */
  confirm: string;
  figureId: string;
  figureTitle: string;
  /** platform links for the three confirmation checks named in §B.5 */
  checks: PlatformLink[];
}
