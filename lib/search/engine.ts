import MiniSearch from "minisearch";

export type SearchKind =
  | "lesson"
  | "part"
  | "glossary"
  | "abbreviation"
  | "formula"
  | "figure"
  | "tool"
  | "calculator"
  | "source"
  | "application"
  | "troubleshooting"
  | "component"
  | "quiz";

export interface SearchDoc {
  id: string;
  kind: SearchKind;
  title: string;
  /** Where the item lives, e.g. "Part IX — Laser–Material Interaction" */
  location: string;
  href: string;
  /** Searchable body text; also used for excerpts */
  text: string;
  /** Extra terms (symbols, synonyms) */
  keywords?: string;
  /** Source reference shown with the result, e.g. "§9.4 · p.59" */
  source?: string;
}

export interface SearchSegment {
  text: string;
  hit: boolean;
}
export interface SearchResult {
  doc: SearchDoc;
  score: number;
  excerpt: SearchSegment[];
}

/**
 * Provider interface: the local lexical engine implements it today; a semantic or
 * retrieval-augmented provider can implement the same contract later without UI changes.
 */
export interface SearchProvider {
  search(query: string, opts?: { limit?: number; kinds?: SearchKind[] }): SearchResult[];
}

const KIND_WEIGHT: Partial<Record<SearchKind, number>> = {
  tool: 1.25,
  calculator: 1.2,
  glossary: 1.15,
  lesson: 1,
};

export function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[\s,;:()/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function excerpt(text: string, terms: string[], radius = 90): SearchSegment[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  const start = at < 0 ? 0 : Math.max(0, at - radius);
  const end = Math.min(text.length, (at < 0 ? 0 : at) + radius * 2);
  let slice = text.slice(start, end).replace(/\s+/g, " ");
  if (start > 0) slice = `…${slice}`;
  if (end < text.length) slice = `${slice}…`;
  if (!terms.length) return [{ text: slice, hit: false }];
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return slice
    .split(pattern)
    .filter((s) => s.length > 0)
    .map((s) => ({ text: s, hit: terms.some((t) => s.toLowerCase() === t) }));
}

export class LocalSearch implements SearchProvider {
  private ms: MiniSearch<SearchDoc>;
  private docs = new Map<string, SearchDoc>();

  constructor(docs: SearchDoc[]) {
    this.ms = new MiniSearch<SearchDoc>({
      fields: ["title", "text", "location", "keywords"],
      storeFields: ["id"],
      searchOptions: {
        boost: { title: 4, keywords: 3, location: 0.6, text: 1 },
        prefix: (term) => term.length >= 2,
        fuzzy: (term) => (term.length >= 5 ? 0.18 : false),
      },
      processTerm: (term) => term.toLowerCase().replace(/[^\p{L}\p{N}µ²₂°.-]/gu, "") || null,
    });
    for (const d of docs) this.docs.set(d.id, d);
    this.ms.addAll(docs);
  }

  get size() {
    return this.docs.size;
  }

  search(query: string, opts: { limit?: number; kinds?: SearchKind[] } = {}): SearchResult[] {
    const q = query.trim();
    if (!q) return [];
    const filter = opts.kinds ? (r: { id: string }) => opts.kinds!.includes(this.docs.get(r.id)!.kind) : undefined;
    let hits = this.ms.search(q, { combineWith: "AND", filter });
    if (hits.length === 0) hits = this.ms.search(q, { combineWith: "OR", filter });
    const terms = tokenizeQuery(q);
    return hits
      .map((h) => {
        const doc = this.docs.get(h.id)!;
        return { doc, score: h.score * (KIND_WEIGHT[doc.kind] ?? 1), excerpt: excerpt(doc.text, terms) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit ?? 50);
  }
}

let cached: Promise<LocalSearch> | null = null;
/** Lazily download the static index and build the engine once per page session. */
export function loadSearch(): Promise<LocalSearch> {
  if (!cached) {
    cached = fetch("/search-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`search index HTTP ${r.status}`);
        return r.json() as Promise<{ docs: SearchDoc[] }>;
      })
      .then((j) => new LocalSearch(j.docs))
      .catch((e) => {
        cached = null;
        throw e;
      });
  }
  return cached;
}

export const KIND_LABEL: Record<SearchKind, string> = {
  lesson: "Lesson",
  part: "Part",
  glossary: "Glossary",
  abbreviation: "Abbreviation",
  formula: "Formula",
  figure: "Figure",
  tool: "Tool",
  calculator: "Calculator",
  source: "Laser source",
  application: "Application",
  troubleshooting: "Troubleshooting",
  component: "Machine component",
  quiz: "Assessment",
};
