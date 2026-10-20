import { z } from "zod";

/** Inline run of text with optional marks, as produced by the ingestion script. */
export const InlineSchema = z.object({
  t: z.string(),
  b: z.literal(1).optional(),
  i: z.literal(1).optional(),
  sup: z.literal(1).optional(),
  sub: z.literal(1).optional(),
  href: z.string().optional(),
  anchor: z.string().optional(),
});
export type Inline = z.infer<typeof InlineSchema>;

/** A table cell is plain text unless it carries links or marks. */
export const CellSchema = z.union([z.string(), z.array(InlineSchema)]);
export type Cell = z.infer<typeof CellSchema>;

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), spans: z.array(InlineSchema) }),
  z.object({ type: z.literal("subheading"), text: z.string() }),
  z.object({ type: z.literal("list"), ordered: z.boolean(), items: z.array(z.array(InlineSchema)) }),
  z.object({
    type: z.literal("checklist"),
    items: z.array(z.object({ id: z.string(), text: z.string() })),
  }),
  z.object({
    type: z.literal("table"),
    id: z.string(),
    header: z.array(z.string()),
    rows: z.array(z.array(CellSchema)),
  }),
  z.object({ type: z.literal("figure"), figureId: z.string() }),
  z.object({ type: z.literal("preformatted"), text: z.string() }),
  z.object({ type: z.literal("chart-missing"), caption: z.string(), placeholder: z.string() }),
]);
export type Block = z.infer<typeof BlockSchema>;
export type TableBlock = Extract<Block, { type: "table" }>;

export const SectionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  number: z.string().nullable(),
  title: z.string(),
  fullTitle: z.string(),
  partId: z.string(),
  synthetic: z.boolean(),
  page: z.number().int().nullable(),
  refs: z.array(z.string()),
  partRefs: z.array(z.number().int()),
  blocks: z.array(BlockSchema),
});
export type Section = z.infer<typeof SectionSchema>;

export const PartSchema = z.object({
  id: z.string(),
  kind: z.enum(["front", "part", "back", "other"]),
  number: z.number().int().nullable(),
  roman: z.string().nullable(),
  title: z.string(),
  fullTitle: z.string(),
  page: z.number().int().nullable(),
  lead: z.array(BlockSchema),
  sections: z.array(SectionSchema),
});
export type Part = z.infer<typeof PartSchema>;

export const FigureSchema = z.object({
  id: z.string(),
  file: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  sectionId: z.string(),
  kind: z.enum(["equation", "diagram", "unknown"]),
  title: z.string().nullable(),
  latex: z.string().optional(),
  alt: z.string().optional(),
  transcription: z.string().optional(),
  status: z.enum(["extracted", "review-required"]),
});
export type Figure = z.infer<typeof FigureSchema>;

export const HandbookSchema = z.object({
  schemaVersion: z.literal(1),
  generator: z.string(),
  generatedAt: z.string(),
  source: z.object({ file: z.string(), sha256: z.string().length(64), bytes: z.number() }),
  meta: z.object({
    title: z.string().nullable(),
    subtitle: z.string().nullable(),
    author: z.string().nullable(),
    date: z.string().nullable(),
  }),
  toc: z.array(z.object({ title: z.string(), page: z.number().int().nullable() })),
  parts: z.array(PartSchema),
  figures: z.array(FigureSchema),
  externalLinks: z.array(z.object({ href: z.string(), text: z.string(), location: z.string() })),
});
export type Handbook = z.infer<typeof HandbookSchema>;

export const ExtractionFlagSchema = z.object({
  severity: z.enum(["error", "warning", "info"]),
  code: z.string(),
  location: z.string(),
  message: z.string(),
});
export type ExtractionFlag = z.infer<typeof ExtractionFlagSchema>;

export function cellText(cell: Cell | undefined): string {
  if (cell === undefined) return "";
  return typeof cell === "string" ? cell : cell.map((s) => s.t).join("");
}

export function spansText(spans: Inline[]): string {
  return spans.map((s) => s.t).join("");
}

/** Plain text of a block for search indexing and excerpts. */
export function blockText(b: Block): string {
  switch (b.type) {
    case "paragraph":
      return spansText(b.spans);
    case "subheading":
    case "preformatted":
      return b.text;
    case "list":
      return b.items.map(spansText).join(" ");
    case "checklist":
      return b.items.map((i) => i.text).join(" ");
    case "table":
      return [b.header.join(" "), ...b.rows.map((r) => r.map(cellText).join(" "))].join(" ");
    case "chart-missing":
      return b.caption;
    case "figure":
      return "";
  }
}
