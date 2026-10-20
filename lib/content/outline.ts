import outlineJson from "@/content/handbook/outline.json";

/** Client-safe handbook outline: ids, titles, Word-rendered page numbers. No content. */
export interface OutlineSection {
  id: string;
  slug: string;
  number: string | null;
  title: string;
  page: number | null;
  synthetic: boolean;
}
export interface OutlinePart {
  id: string;
  kind: "front" | "part" | "back" | "other";
  number: number | null;
  roman: string | null;
  title: string;
  fullTitle: string;
  page: number | null;
  sections: OutlineSection[];
}

export const outline = outlineJson as { schemaVersion: number; sourceSha256: string; parts: OutlinePart[] };

const bySection = new Map<string, { s: OutlineSection; p: OutlinePart }>();
for (const p of outline.parts) for (const s of p.sections) bySection.set(s.id, { s, p });

export function outlineSection(id: string) {
  return bySection.get(id);
}

export function hrefFor(sectionId: string): string {
  const e = bySection.get(sectionId);
  return e ? `/learn/${e.p.id}/${e.s.slug}` : "/learn";
}

export function partHrefByNumber(n: number): string {
  return `/learn/part-${n}`;
}

/** "§9.2 Metals" or "Part XVI Automotive" style label. */
export function labelFor(sectionId: string, withTitle = false): string {
  const e = bySection.get(sectionId);
  if (!e) return sectionId;
  const { s, p } = e;
  const tag = s.number ? `§${s.number}` : s.synthetic && p.roman ? `Part ${p.roman}` : s.title;
  return withTitle && (s.number || s.synthetic) ? `${tag} ${s.synthetic ? p.title : s.title}` : tag;
}

export function pageFor(sectionId: string): number | null {
  return bySection.get(sectionId)?.s.page ?? null;
}

export function partOf(sectionId: string): OutlinePart | undefined {
  return bySection.get(sectionId)?.p;
}

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII"];
