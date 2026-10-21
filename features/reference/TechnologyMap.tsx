"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotionConfig } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search, X } from "lucide-react";
import { Segmented } from "@/components/ui/controls";
import { Button, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { outline, ROMAN, partHrefByNumber } from "@/lib/content/outline";
import { ease } from "@/components/motion/tokens";
import type { MapNode, TechnologyMapData } from "./types";

type Direction = "down" | "up";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

const PART_TITLE = new Map(outline.parts.filter((p) => p.kind === "part" && p.number).map((p) => [p.number!, p.title]));

function matches(text: string, tokens: string[]): boolean {
  if (!tokens.length) return false;
  const h = fold(text);
  return tokens.every((t) => h.includes(t));
}

/** Wraps case-insensitive occurrences of the query tokens in <mark>. */
function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const t of tokens) {
    let at = lower.indexOf(t);
    while (at >= 0 && t) {
      ranges.push([at, at + t.length]);
      at = lower.indexOf(t, at + t.length);
    }
  }
  if (!ranges.length) return <>{text}</>;
  ranges.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let last = 0;
  for (const [a, b] of ranges) {
    if (a < last) continue;
    if (a > last) out.push(text.slice(last, a));
    out.push(
      <mark key={a} className="rounded-[3px] bg-teal-400/25 px-0.5 text-teal-50">
        {text.slice(a, b)}
      </mark>,
    );
    last = b;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

function PartLinks({ node, className }: { node: MapNode; className?: string }) {
  if (!node.parts.length) return null;
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fog-500">{node.parts.length > 1 ? "Parts" : "Part"}</span>
      {node.parts.map((n) => (
        <Link
          key={n}
          href={partHrefByNumber(n)}
          title={`Part ${ROMAN[n]} — ${PART_TITLE.get(n) ?? ""}`}
          aria-label={`Part ${ROMAN[n]}: ${PART_TITLE.get(n) ?? ""}`}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-teal-500/45 bg-teal-500/10 px-2 font-mono text-[11px] text-teal-100 transition-colors hover:border-teal-300 hover:bg-teal-500/25"
        >
          {ROMAN[n]}
        </Link>
      ))}
    </span>
  );
}

function ExploreLinks({ node }: { node: MapNode }) {
  if (!node.explore.length && !node.sections.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {node.sections.map((s) => (
        <SourceRef key={s.id} section={s.id} />
      ))}
      {node.explore.map((l) => (
        <Link
          key={l.href + l.label}
          href={l.href}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-2.5 py-0.5 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100"
        >
          {l.label} <ArrowUpRight aria-hidden className="size-3" />
        </Link>
      ))}
    </div>
  );
}

function Items({ items, tokens, small = false }: { items: string[]; tokens: string[]; small?: boolean }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <li
          key={`${it}-${i}`}
          className={cn(
            "rounded-[var(--radius-sm)] border px-2 py-0.5 leading-snug",
            small ? "text-[12px]" : "text-[12.5px]",
            matches(it, tokens) ? "border-teal-400/50 bg-teal-500/10 text-teal-50" : "border-white/[0.08] bg-white/[0.03] text-fog-200",
          )}
        >
          <Highlight text={it} tokens={tokens} />
        </li>
      ))}
    </ul>
  );
}

function ChildCard({ node, tokens }: { node: MapNode; tokens: string[] }) {
  const hit = matches(`${node.label} ${node.items.join(" ")}`, tokens);
  return (
    <li id={node.id} className={cn("min-w-0 scroll-mt-28 rounded-[var(--radius-md)] border bg-ink-850/70 p-3", hit ? "border-teal-400/55" : "border-[var(--line)]")}>
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="h-px w-3 bg-teal-500/50" />
        <h3 className="text-[13.5px] font-semibold text-fog-100">
          <Highlight text={node.label} tokens={tokens} />
        </h3>
        <PartLinks node={node} className="ml-auto" />
      </div>
      {node.items.length ? (
        <div className="mt-2">
          <Items items={node.items} tokens={tokens} small />
        </div>
      ) : null}
      {node.explore.length || node.sections.length ? (
        <div className="mt-2.5">
          <ExploreLinks node={node} />
        </div>
      ) : null}
    </li>
  );
}

export function TechnologyMap({ data }: { data: TechnologyMapData }) {
  const branches = data.root.children;
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [direction, setDirection] = useState<Direction>("down");
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotionConfig();
  const tokens = useMemo(() => fold(q).split(/\s+/).filter(Boolean), [q]);

  /** top-level branch id → does it (label, items or a child) match the query */
  const hits = useMemo(() => {
    const m = new Map<string, { self: boolean; inside: boolean }>();
    for (const b of branches) {
      const self = matches(b.label, tokens);
      const inside = b.items.some((i) => matches(i, tokens)) || b.children.some((c) => matches(`${c.label} ${c.items.join(" ")}`, tokens));
      m.set(b.id, { self, inside });
    }
    return m;
  }, [branches, tokens]);
  const hitCount = [...hits.values()].filter((h) => h.self || h.inside).length;

  // Searching opens every branch with a match inside it (the user can still collapse them).
  useEffect(() => {
    if (!tokens.length) return;
    setOpen((prev) => {
      const next = new Set(prev);
      for (const [id, h] of hits) if (h.inside) next.add(id);
      return next;
    });
  }, [tokens, hits]);

  // Deep links (#map-…) open the branch that holds the target.
  useEffect(() => {
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const owner = branches.find((b) => b.id === id || b.children.some((c) => c.id === id));
      if (!owner) return;
      setOpen((prev) => new Set(prev).add(owner.id));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [branches]);

  const setBranch = (id: string, value: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });

  const jumpTo = (id: string) => {
    setBranch(id, true);
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      el?.querySelector<HTMLButtonElement>("[data-map-toggle]")?.focus({ preventScroll: true });
    });
  };

  const onKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const target = e.target as HTMLElement;
    const id = target.dataset.mapToggle;
    if (!id) return;
    const toggles = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-map-toggle]") ?? [])];
    const i = toggles.indexOf(target as HTMLButtonElement);
    let next = -1;
    if (e.key === "ArrowDown") next = Math.min(toggles.length - 1, i + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, i - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = toggles.length - 1;
    else if (e.key === "ArrowRight" && !open.has(id)) {
      e.preventDefault();
      setBranch(id, true);
    } else if (e.key === "ArrowLeft" && open.has(id)) {
      e.preventDefault();
      setBranch(id, false);
    }
    if (next >= 0) {
      e.preventDefault();
      toggles[next]?.focus();
    }
  };

  const ordered = direction === "down" ? branches : [...branches].reverse();
  const allOpen = branches.every((b) => open.has(b.id));

  const root = (
    <div className={cn("relative flex items-center gap-3 pl-1", direction === "down" ? "mb-3" : "mt-3")}>
      <span aria-hidden className="relative grid size-[30px] place-items-center rounded-full border border-teal-300/70 bg-teal-500/20 shadow-[0_0_24px_rgb(0_149_144/0.55)]">
        <span className="size-2.5 rounded-full bg-teal-200 motion-safe:animate-pulse-soft" />
      </span>
      <div>
        <div className="font-mono text-[15px] font-semibold tracking-[0.28em] text-paper">{data.root.label}</div>
        <div className="text-[11.5px] text-fog-500">{direction === "down" ? "Root of the tree — read down to learn" : "Back to the physics that governs it"}</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------ the upward walk (§28.0 closing paragraph) */}
      <section aria-labelledby="walk" className="rounded-[var(--radius-lg)] border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.08] via-ink-800/60 to-ink-850/60 p-4 sm:p-5">
        <h2 id="walk" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">
          Walking the tree upward
        </h2>
        <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-fog-200">“{data.outro}”</p>
        <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2" aria-label={`Upward walk, from ${data.chain[0]?.text ?? ""} to ${data.chain.at(-1)?.text ?? ""}`}>
          {data.chain.map((c, i) => (
            <li key={c.text} className="flex items-center gap-1">
              {c.target ? (
                <button
                  type="button"
                  onClick={() => jumpTo(c.target!)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-ink-900/60 px-2.5 py-1 text-[12.5px] text-fog-100 transition-colors hover:border-teal-400/60 hover:text-teal-100"
                  title="Jump to this branch of the map"
                >
                  <span className="font-mono text-[10.5px] text-teal-300">{i + 1}</span>
                  {c.text}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1 text-[12.5px] text-fog-300">
                  <span className="font-mono text-[10.5px] text-teal-300">{i + 1}</span>
                  {c.text}
                </span>
              )}
              {i < data.chain.length - 1 ? (
                <span aria-hidden className="text-fog-500">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11.5px] text-fog-500">Steps link to the branch that covers them — a LASERVERSE navigation aid, not part of the handbook text.</p>
      </section>

      {/* ------------------------------------------------ controls */}
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-850/60 p-3 md:flex-row md:flex-wrap md:items-center">
        <Segmented<Direction>
          label="Reading direction"
          value={direction}
          onChange={setDirection}
          options={[
            {
              value: "down",
              label: (
                <span className="inline-flex items-center gap-1">
                  <ArrowDown aria-hidden className="size-3.5" /> Read down · learn
                </span>
              ),
            },
            {
              value: "up",
              label: (
                <span className="inline-flex items-center gap-1">
                  <ArrowUp aria-hidden className="size-3.5" /> Read up · solve
                </span>
              ),
            },
          ]}
        />
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-ink-850 px-3 focus-within:border-teal-400 md:min-w-[14rem]">
          <Search aria-hidden className="size-4 shrink-0 text-fog-500" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find in the map, e.g. galvo, keyhole, stent"
            aria-label="Find in the technology map"
            className="w-full min-w-0 bg-transparent text-[13.5px] text-fog-100 outline-none placeholder:text-fog-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-fog-500 hover:text-fog-200">
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </label>
        <Button size="sm" onClick={() => setOpen(allOpen ? new Set() : new Set(branches.map((b) => b.id)))} aria-label={allOpen ? "Collapse all branches" : "Expand all branches"}>
          {allOpen ? <ChevronsDownUp aria-hidden className="size-3.5" /> : <ChevronsUpDown aria-hidden className="size-3.5" />}
          {allOpen ? "Collapse all" : "Expand all"}
        </Button>
      </div>
      <p className="-mt-2 text-[12px] text-fog-500" aria-live="polite">
        {tokens.length
          ? `${hitCount} of ${branches.length} branches match “${q}”.`
          : `${branches.length} branches. Use ↑ ↓ to move between branches, → to expand and ← to collapse.`}
      </p>

      {/* ------------------------------------------------ the tree */}
      <div>
        {direction === "down" ? root : null}
        <div className="relative">
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute bottom-4 left-[15px] top-4 w-px",
              direction === "down" ? "bg-gradient-to-b from-teal-300/80 via-teal-500/35 to-teal-500/10" : "bg-gradient-to-t from-teal-300/80 via-teal-500/35 to-teal-500/10",
            )}
          />
          <ol ref={listRef} onKeyDown={onKey} className="relative flex flex-col gap-2" aria-label="Master laser technology map">
            {ordered.map((b) => {
              const index = branches.indexOf(b) + 1;
              const isOpen = open.has(b.id);
              const hit = hits.get(b.id);
              const lit = Boolean(hit && (hit.self || hit.inside));
              const dimmed = tokens.length > 0 && !lit;
              const panelId = `${b.id}-panel`;
              const summary = b.children.length ? `${b.children.length} branches` : `${b.items.length} choices`;
              return (
                <li key={b.id} id={b.id} className={cn("relative scroll-mt-28 pl-10 transition-opacity", dimmed && "opacity-45")}>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[10px] top-[17px] size-[11px] rounded-full border-2 transition-colors",
                      isOpen || lit ? "border-teal-200 bg-teal-400 shadow-[0_0_12px_rgb(25_178_171/0.8)]" : "border-teal-500/70 bg-ink-900",
                    )}
                  />
                  <div
                    className={cn(
                      "rounded-[var(--radius-lg)] border transition-colors",
                      isOpen ? "border-teal-500/35 bg-ink-800/85 shadow-[0_12px_40px_-24px_rgb(0_149_144/0.6)]" : "border-[var(--line)] bg-ink-800/50 hover:border-white/15",
                      hit?.self && "ring-1 ring-teal-400/60",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 sm:px-4">
                      <button
                        type="button"
                        data-map-toggle={b.id}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setBranch(b.id, !isOpen)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-sm)] py-0.5 text-left"
                      >
                        <ChevronRight aria-hidden className={cn("size-4 shrink-0 text-fog-500 transition-transform duration-200", isOpen && "rotate-90 text-teal-300")} />
                        <span className="tabular font-mono text-[11px] text-fog-500">{String(index).padStart(2, "0")}</span>
                        <span className="min-w-0 text-[13.5px] font-semibold tracking-[0.06em] text-paper">
                          <Highlight text={b.label} tokens={tokens} />
                        </span>
                        <span className="hidden whitespace-nowrap text-[11.5px] text-fog-500 sm:inline">{summary}</span>
                      </button>
                      <PartLinks node={b} />
                    </div>
                    <div id={panelId}>
                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.div
                            key="panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: reduce ? 0 : 0.28, ease: ease.out }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-3 border-t border-[var(--line)] px-3 pb-4 pt-3 sm:px-4">
                              <Items items={b.items} tokens={tokens} />
                              {b.children.length ? (
                                <ul className="grid gap-2 sm:grid-cols-2">
                                  {b.children.map((c) => (
                                    <ChildCard key={c.id} node={c} tokens={tokens} />
                                  ))}
                                </ul>
                              ) : null}
                              {b.explore.length || b.sections.length ? (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fog-500">Explore in LASERVERSE</span>
                                  <ExploreLinks node={b} />
                                </div>
                              ) : null}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        {direction === "up" ? root : null}
      </div>
    </div>
  );
}
