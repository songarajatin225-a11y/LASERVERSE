import { Fragment, type ReactNode } from "react";
import { ExternalLink, ImageOff, Maximize2 } from "lucide-react";
import type { Block, Inline, Cell, TableBlock, Figure } from "@/lib/content/schema";
import { Tex } from "@/components/ui/Tex";
import { Badge, Callout, cn } from "@/components/ui/primitives";
import { HandbookChecklist } from "./HandbookChecklist";
import { linkRefs } from "./linkRefs";

export { linkRefs };

export function Spans({ spans, refs = true }: { spans: Inline[]; refs?: boolean }) {
  return (
    <>
      {spans.map((s, i) => {
        let node: ReactNode = s.href ? (
          s.href.startsWith("http://node/") ? (
            s.t
          ) : (
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline">
              {s.t}
              <ExternalLink aria-hidden className="ml-0.5 inline size-3 align-[-1px] opacity-60" />
            </a>
          )
        ) : refs ? (
          linkRefs(s.t, `${i}-`)
        ) : (
          s.t
        );
        if (s.sup) node = <sup>{node}</sup>;
        if (s.sub) node = <sub>{node}</sub>;
        if (s.i) node = <em>{node}</em>;
        if (s.b) node = <strong>{node}</strong>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

function CellContent({ cell }: { cell: Cell | undefined }) {
  if (cell === undefined) return null;
  if (typeof cell === "string") return <>{linkRefs(cell)}</>;
  return <Spans spans={cell} />;
}

/* ---------------------------------------------------------------- tables */
export function HandbookTable({ t, caption, compact = false }: { t: TableBlock; caption?: ReactNode; compact?: boolean }) {
  const tall = t.rows.length > 14;
  return (
    <figure className="my-6" id={`table-${t.id.replace(/[^a-z0-9]/gi, "-")}`}>
      <div
        className={cn(
          "scrollbar-thin overflow-auto rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/60",
          tall ? "max-h-[70vh]" : "",
        )}
        tabIndex={0}
        role="region"
        aria-label={`Handbook table ${t.id}${caption ? "" : `: ${t.header.slice(0, 3).join(", ")}`}`}
      >
        <table className={cn("hb-table", compact ? "text-[12.5px]" : "")}>
          <thead>
            <tr>
              {t.header.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, ri) => (
              <tr key={ri}>
                {t.header.map((_h, ci) => (
                  <td key={ci}>
                    <CellContent cell={r[ci]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? <figcaption className="mt-2 text-[12px] text-fog-500">{caption}</figcaption> : null}
    </figure>
  );
}

/* ---------------------------------------------------------------- figures */
export function HandbookFigure({ fig }: { fig: Figure | undefined }) {
  if (!fig) {
    return (
      <div className="my-6 flex items-center gap-2 rounded border border-danger/40 p-3 text-sm text-danger">
        <ImageOff aria-hidden className="size-4" /> Figure missing from the ingested handbook.
      </div>
    );
  }
  if (fig.kind === "equation" && fig.latex) {
    return (
      <figure className="my-6 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/70" id={`fig-${fig.id}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2">
          <figcaption className="text-[12px] font-medium text-fog-300">{fig.title}</figcaption>
          <Badge tone="warn" title="Equations in the handbook are images. This LaTeX was transcribed from the image and needs review; the original is available below.">
            Transcribed equation · review
          </Badge>
        </div>
        <div className="scrollbar-thin overflow-x-auto px-4 py-4 text-[15px]">
          <Tex math={fig.latex} display />
        </div>
        <details className="group border-t border-[var(--line)] px-4 py-2 text-[12px] text-fog-500">
          <summary className="cursor-pointer select-none hover:text-fog-300">Show the original handbook image</summary>
          <div className="mt-3 overflow-x-auto rounded bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fig.file} alt={`Original equation image: ${fig.title ?? fig.id}`} width={fig.width ?? undefined} height={fig.height ?? undefined} loading="lazy" className="h-auto max-h-56 w-auto max-w-full" />
          </div>
        </details>
      </figure>
    );
  }
  const tallNarrow = (fig.height ?? 0) > (fig.width ?? 1) * 2;
  return (
    <figure className="my-8" id={`fig-${fig.id}`}>
      <div className={cn("relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[#fbfbfa] p-4", tallNarrow ? "mx-auto max-w-[340px]" : "")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fig.file} alt={fig.alt ?? fig.title ?? "Handbook figure"} width={fig.width ?? undefined} height={fig.height ?? undefined} loading="lazy" className={cn("mx-auto h-auto w-auto max-w-full", tallNarrow ? "max-h-[560px]" : "max-h-[620px]")} />
        <a href={fig.file} target="_blank" rel="noopener noreferrer" className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded bg-black/55 text-white/90 hover:bg-black/75" aria-label={`Open ${fig.title ?? "figure"} full size`}>
          <Maximize2 aria-hidden className="size-3.5" />
        </a>
      </div>
      <figcaption className="mt-2 text-[12.5px] leading-snug text-fog-400">
        <span className="font-medium text-fog-200">{fig.title}</span>
        {fig.alt ? <span className="block text-fog-500">{fig.alt}</span> : null}
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- blocks */
export function Blocks({ blocks, figures, sectionId }: { blocks: Block[]; figures: Map<string, Figure>; sectionId: string }) {
  return (
    <div className="prose-hb">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "paragraph":
            return (
              <p key={i} className="text-pretty">
                <Spans spans={b.spans} />
              </p>
            );
          case "subheading":
            return (
              <h3 key={i} className="mb-3 mt-9 text-[16px] font-semibold tracking-[-0.005em] text-paper first:mt-0">
                {linkRefs(b.text)}
              </h3>
            );
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={cn("my-4 flex flex-col gap-2 pl-5", b.ordered ? "list-decimal" : "list-disc")}>
                {b.items.map((it, k) => (
                  <li key={k} className="pl-1 marker:text-fog-500">
                    <Spans spans={it} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "checklist":
            return <HandbookChecklist key={i} listId={`${sectionId}#${i}`} items={b.items} />;
          case "table":
            return <HandbookTable key={i} t={b} />;
          case "figure":
            return <HandbookFigure key={i} fig={figures.get(b.figureId)} />;
          case "preformatted":
            return (
              <pre key={i} className="scrollbar-thin my-6 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-950 p-4 font-mono text-[12px] leading-[1.6] text-fog-200">
                {b.text}
              </pre>
            );
          case "chart-missing":
            return (
              <Callout key={i} kind="review" title="Chart missing from the supplied handbook" className="my-6">
                <p>
                  The handbook refers to a chart here — <em>“{b.caption}”</em> — but the supplied .docx contains only a placeholder link, not
                  the chart data or image. LASERVERSE does not reconstruct it. Values quoted elsewhere in the text are used where available and
                  cited individually.
                </p>
              </Callout>
            );
        }
      })}
    </div>
  );
}
