"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Maximize2, Search, Sigma, X } from "lucide-react";
import { Segmented } from "@/components/ui/controls";
import { Badge, StatusPill, cn } from "@/components/ui/primitives";
import type { FigureCard } from "./types";
import { withBase } from "@/lib/basePath";

type KindFilter = "all" | "diagram" | "equation";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export function FigureGallery({ figures }: { figures: FigureCard[] }) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [q, setQ] = useState("");
  const tokens = useMemo(() => fold(q).split(/\s+/).filter(Boolean), [q]);
  const counts = useMemo(
    () => ({ all: figures.length, diagram: figures.filter((f) => f.kind === "diagram").length, equation: figures.filter((f) => f.kind === "equation").length }),
    [figures],
  );
  const visible = figures.filter((f) => {
    if (kind !== "all" && f.kind !== kind) return false;
    if (reviewOnly && f.status !== "review-required") return false;
    const hay = fold(`${f.id} ${f.title ?? ""} ${f.alt ?? ""} ${f.sectionLabel}`);
    return tokens.every((t) => hay.includes(t));
  });

  // A deep link (#imageN) to a figure hidden by the filters clears them so the target exists.
  useEffect(() => {
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !figures.some((f) => f.id === id)) return;
      setKind("all");
      setReviewOnly(false);
      setQ("");
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [figures]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-850/60 p-3 lg:flex-row lg:items-center">
        <Segmented<KindFilter>
          label="Figure kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: `All ${counts.all}` },
            { value: "diagram", label: `Diagrams ${counts.diagram}` },
            { value: "equation", label: `Equations ${counts.equation}` },
          ]}
        />
        <button
          type="button"
          aria-pressed={reviewOnly}
          onClick={() => setReviewOnly((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center self-start rounded-full border px-3 text-[12.5px] lg:self-auto",
            reviewOnly ? "border-warn/50 bg-warn/10 text-[#f6d79a]" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100",
          )}
        >
          Review required only
        </button>
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-ink-850 px-3 focus-within:border-teal-400">
          <Search aria-hidden className="size-4 shrink-0 text-fog-500" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by title, description or section"
            aria-label="Filter figures"
            className="w-full min-w-0 bg-transparent text-[13.5px] text-fog-100 outline-none placeholder:text-fog-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Clear filter" className="text-fog-500 hover:text-fog-200">
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </label>
      </div>
      <p className="-mt-2 text-[12px] text-fog-500" aria-live="polite">
        Showing {visible.length} of {figures.length} figures
      </p>

      {visible.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((f) => (
            <li key={f.id} id={f.id} className="scroll-mt-24">
              <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 transition-colors hover:border-white/15 [li:target_&]:border-teal-400/60">
                <div className="relative flex h-52 items-center justify-center bg-[#fbfbfa] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={withBase(f.file)}
                    alt={f.alt ?? f.title ?? `Handbook figure ${f.id}`}
                    width={f.width ?? undefined}
                    height={f.height ?? undefined}
                    loading="lazy"
                    decoding="async"
                    className="h-full max-h-full w-auto max-w-full object-contain"
                  />
                  <a
                    href={withBase(f.file)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${f.title ?? f.id} full size`}
                    className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded bg-black/55 text-white/90 hover:bg-black/75"
                  >
                    <Maximize2 aria-hidden className="size-3.5" />
                  </a>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={f.kind === "equation" ? "info" : "fog"}>{f.kind === "equation" ? "Equation" : "Diagram"}</Badge>
                    <StatusPill status={f.status} />
                    <span className="ml-auto font-mono text-[11px] text-fog-500">{f.id}</span>
                  </div>
                  <h3 className="text-[14.5px] font-semibold leading-snug text-fog-100">{f.title ?? f.id}</h3>
                  {f.alt ? (
                    <p className="line-clamp-4 text-[12.5px] leading-snug text-fog-400" title={f.alt}>
                      <span className="text-fog-500">Description (LASERVERSE, not handbook text): </span>
                      {f.alt}
                    </p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[12.5px]">
                    <Link href={f.sectionHref} className="inline-flex items-center gap-1 text-teal-300 hover:underline">
                      {f.sectionLabel} <ArrowUpRight aria-hidden className="size-3" />
                    </Link>
                    {f.kind === "equation" ? (
                      <Link href={`/reference/formulas#${f.id}`} className="inline-flex items-center gap-1 text-fog-300 hover:text-teal-100">
                        <Sigma aria-hidden className="size-3.5" /> Transcribed LaTeX
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--line-strong)] px-4 py-8 text-center text-[13.5px] text-fog-400">No figure matches these filters.</p>
      )}
    </div>
  );
}
