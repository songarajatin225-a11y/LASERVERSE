import "server-only";
import raw from "@/content/handbook/handbook.json";
import rawReport from "@/content/handbook/extraction-report.json";
import {
  HandbookSchema,
  ExtractionFlagSchema,
  cellText,
  type Handbook,
  type Part,
  type Section,
  type TableBlock,
  type Figure,
  type ExtractionFlag,
} from "./schema";
import { z } from "zod";

/**
 * Server-only access to the ingested handbook. Parsing with Zod at module load
 * means a malformed re-ingestion fails the build instead of rendering silently.
 */
export const handbook: Handbook = HandbookSchema.parse(raw);

export const extractionReport = z
  .object({
    generatedAt: z.string(),
    counts: z.record(z.number()),
    flags: z.array(ExtractionFlagSchema),
  })
  .passthrough()
  .parse(rawReport);

export const extractionFlags: ExtractionFlag[] = extractionReport.flags;

const sectionIndex = new Map<string, { section: Section; part: Part; order: number }>();
const orderedSections: Section[] = [];
for (const part of handbook.parts) {
  for (const section of part.sections) {
    sectionIndex.set(section.id, { section, part, order: orderedSections.length });
    orderedSections.push(section);
  }
}
const figureIndex = new Map(handbook.figures.map((f) => [f.id, f]));

export function getParts(): Part[] {
  return handbook.parts;
}

export function getPart(partId: string): Part | undefined {
  return handbook.parts.find((p) => p.id === partId);
}

export function getPartByNumber(n: number): Part | undefined {
  return handbook.parts.find((p) => p.kind === "part" && p.number === n);
}

export function getSection(sectionId: string): Section | undefined {
  return sectionIndex.get(sectionId)?.section;
}

export function getSectionWithPart(sectionId: string) {
  return sectionIndex.get(sectionId);
}

export function getSectionBySlug(partId: string, slug: string): Section | undefined {
  return getPart(partId)?.sections.find((s) => s.slug === slug);
}

export function allSections(): Section[] {
  return orderedSections;
}

export function neighbours(sectionId: string): { prev?: Section; next?: Section } {
  const entry = sectionIndex.get(sectionId);
  if (!entry) return {};
  return { prev: orderedSections[entry.order - 1], next: orderedSections[entry.order + 1] };
}

export function sectionHref(sectionId: string): string {
  const entry = sectionIndex.get(sectionId);
  if (!entry) throw new Error(`Unknown handbook section ${sectionId}`);
  return `/learn/${entry.part.id}/${entry.section.slug}`;
}

export function partHref(partId: string): string {
  return `/learn/${partId}`;
}

/** "§9.2" style label for a section, or its title for unnumbered front/back matter. */
export function sectionLabel(sectionId: string): string {
  const s = getSection(sectionId);
  if (!s) return sectionId;
  if (s.number) return `§${s.number}`;
  if (s.synthetic) {
    const p = sectionIndex.get(sectionId)?.part;
    return p?.roman ? `Part ${p.roman}` : s.title;
  }
  return s.title;
}

export function getFigure(id: string): Figure | undefined {
  return figureIndex.get(id);
}

export function figuresInSection(sectionId: string): Figure[] {
  return handbook.figures.filter((f) => f.sectionId === sectionId);
}

export function tablesIn(sectionId: string): TableBlock[] {
  const s = getSection(sectionId);
  if (!s) return [];
  return s.blocks.filter((b): b is TableBlock => b.type === "table");
}

/**
 * Fetch the n-th (1-based) table of a section and verify its header.
 * Feature modules build their data from handbook tables through this function,
 * so a structural change in a re-ingested handbook surfaces as a clear error.
 */
export function getTable(sectionId: string, index: number, expectHeaderStartsWith?: string[]): TableBlock {
  const tables = tablesIn(sectionId);
  const t = tables[index - 1];
  if (!t) throw new Error(`Handbook table ${sectionId}#t${index} not found (section has ${tables.length})`);
  if (expectHeaderStartsWith) {
    expectHeaderStartsWith.forEach((h, i) => {
      if (!(t.header[i] ?? "").toLowerCase().startsWith(h.toLowerCase())) {
        throw new Error(`Handbook table ${t.id}: expected header[${i}] to start with "${h}", got "${t.header[i]}"`);
      }
    });
  }
  return t;
}

/** Table rows as objects keyed by header text, cells flattened to strings. */
export function tableRecords(t: TableBlock): Record<string, string>[] {
  return t.rows.map((row) => Object.fromEntries(t.header.map((h, i) => [h, cellText(row[i])])));
}

export interface NavSection {
  id: string;
  number: string | null;
  title: string;
  href: string;
  page: number | null;
  synthetic: boolean;
}
export interface NavPart {
  id: string;
  kind: Part["kind"];
  roman: string | null;
  number: number | null;
  title: string;
  fullTitle: string;
  href: string;
  page: number | null;
  sections: NavSection[];
}

/** Small, client-safe outline of the handbook (no content). */
export function handbookOutline(): NavPart[] {
  return handbook.parts.map((p) => ({
    id: p.id,
    kind: p.kind,
    roman: p.roman,
    number: p.number,
    title: p.title,
    fullTitle: p.fullTitle,
    href: partHref(p.id),
    page: p.page,
    sections: p.sections.map((s) => ({
      id: s.id,
      number: s.number,
      title: s.title,
      href: `/learn/${p.id}/${s.slug}`,
      page: s.page,
      synthetic: s.synthetic,
    })),
  }));
}

export function flagsFor(location: string): ExtractionFlag[] {
  return extractionFlags.filter((f) => f.location === location);
}
