"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, X, RotateCcw, CornerDownLeft } from "lucide-react";
import { loadSearch, excerpt, tokenizeQuery, KIND_LABEL, type SearchKind, type SearchProvider, type SearchResult, type SearchSegment } from "@/lib/search/engine";
import { Badge, Button, ClassTag, Kbd, cn } from "@/components/ui/primitives";
import { KIND_CLASS, KIND_ORDER, SUGGESTED_QUERIES, isSearchKind } from "./kinds";

const PAGE = 40;
const MAX_RESULTS = 600;
const DEBOUNCE_MS = 300;

type Status = "loading" | "ready" | "error";

function parseKinds(raw: string | null): SearchKind[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((k) => k.trim()).filter(isSearchKind))];
}

/** Canonical query string for the URL (empty when there is nothing to keep). */
function queryString(q: string, kinds: SearchKind[]): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q);
  if (kinds.length) p.set("kind", [...kinds].sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b)).join(","));
  return p.toString();
}

function Marked({ segments }: { segments: SearchSegment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.hit ? (
          <mark key={i} className="rounded-[3px] bg-teal-500/25 px-0.5 text-teal-100">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

export function SearchPage({ totals, total }: { totals: Partial<Record<SearchKind, number>>; total: number }) {
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const urlKindRaw = params.get("kind");

  const [q, setQ] = useState(urlQ);
  const [kinds, setKinds] = useState<SearchKind[]>(() => parseKinds(urlKindRaw));
  const [engine, setEngine] = useState<SearchProvider | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const lastWritten = useRef(queryString(urlQ, parseKinds(urlKindRaw)));
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  /* ---------------------------------------------------------- index loading */
  useEffect(() => {
    let alive = true;
    setStatus("loading");
    loadSearch()
      .then((e) => {
        if (!alive) return;
        setEngine(e);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!urlQ) inputRef.current?.focus();
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------- URL <-> state */
  // external navigation (back/forward, the command palette's "See all results")
  useEffect(() => {
    const nextKinds = parseKinds(urlKindRaw);
    const key = queryString(urlQ, nextKinds);
    if (key === lastWritten.current) return;
    lastWritten.current = key;
    setQ(urlQ);
    setKinds(nextKinds);
  }, [urlQ, urlKindRaw]);

  // The native History API (integrated with the App Router since Next 14.1, so useSearchParams
  // stays in sync) updates the address bar without a soft navigation or an RSC request per
  // keystroke, and without adding history entries.
  const writeUrl = useCallback((nextQ: string, nextKinds: SearchKind[]) => {
    const key = queryString(nextQ, nextKinds);
    if (key === lastWritten.current) return;
    lastWritten.current = key;
    window.history.replaceState(null, "", key ? `/search?${key}` : "/search");
  }, []);

  // debounced while typing
  useEffect(() => {
    const t = setTimeout(() => writeUrl(q, kinds), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, kinds, writeUrl]);

  /* ---------------------------------------------------------- results */
  const deferredQ = useDeferredValue(q);
  const query = deferredQ.trim();
  const terms = useMemo(() => tokenizeQuery(query), [query]);
  const all: SearchResult[] = useMemo(() => (engine && query ? engine.search(query, { limit: MAX_RESULTS }) : []), [engine, query]);
  const counts = useMemo(() => {
    const c: Partial<Record<SearchKind, number>> = {};
    for (const r of all) c[r.doc.kind] = (c[r.doc.kind] ?? 0) + 1;
    return c;
  }, [all]);
  const filtered = useMemo(() => (kinds.length ? all.filter((r) => kinds.includes(r.doc.kind)) : all), [all, kinds]);
  const shown = filtered.slice(0, limit);

  useEffect(() => setLimit(PAGE), [query, kinds]);

  const chipCounts = query ? counts : totals;
  const chipTotal = query ? all.length : total;

  const toggleKind = (k: SearchKind) => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  const runSuggestion = (s: string) => {
    setQ(s);
    setKinds([]);
    writeUrl(s, []);
    inputRef.current?.focus();
  };

  /* ---------------------------------------------------------- keyboard */
  const focusResult = (i: number) => {
    const el = listRef.current?.querySelector<HTMLAnchorElement>(`[data-idx="${i}"]`);
    el?.focus();
  };
  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && shown.length) {
      e.preventDefault();
      focusResult(0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      writeUrl(q, kinds);
    } else if (e.key === "Escape" && q) {
      e.preventDefault();
      setQ("");
    }
  };
  const onResultKey = (e: React.KeyboardEvent<HTMLAnchorElement>, i: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (i + 1 < shown.length) focusResult(i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i === 0) inputRef.current?.focus();
      else focusResult(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusResult(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusResult(shown.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  const hiddenByFilter = kinds.length > 0 && filtered.length === 0 && all.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------ input */}
      <div role="search" className="flex flex-col gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search the handbook and LASERVERSE tools
        </label>
        <div className="flex h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line-strong)] bg-ink-850 px-4 focus-within:border-teal-400/70">
          <Search aria-hidden className="size-4 shrink-0 text-fog-500" />
          <input
            ref={inputRef}
            id="search-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search lessons, glossary, equations, sources, tools…"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="search-help"
            aria-controls="search-results"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-paper outline-none placeholder:text-fog-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {status === "loading" ? <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-fog-500 motion-reduce:animate-none" /> : null}
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="rounded p-1 text-fog-500 hover:text-fog-100"
            >
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
        <p id="search-help" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-fog-500">
          <Kbd>↓</Kbd>
          <Kbd>↑</Kbd> move through results · <Kbd>Enter</Kbd> opens the focused result · <Kbd>Esc</Kbd> returns to the box
        </p>
      </div>

      {/* ------------------------------------------------------ kind filter */}
      <div role="group" aria-label="Filter results by kind" className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={kinds.length === 0}
          onClick={() => setKinds([])}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors",
            kinds.length === 0 ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100",
          )}
        >
          All <span className="font-mono text-[11px] opacity-75">{chipTotal}</span>
        </button>
        {KIND_ORDER.map((k) => {
          const n = chipCounts[k] ?? 0;
          const on = kinds.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => toggleKind(k)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors",
                on ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100",
                !on && n === 0 ? "opacity-45" : "",
              )}
            >
              {KIND_LABEL[k]} <span className="font-mono text-[11px] opacity-75">{n}</span>
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {status === "loading"
          ? "Loading the search index."
          : status === "error"
            ? "The search index could not be loaded."
            : query
              ? `${filtered.length} result${filtered.length === 1 ? "" : "s"} for ${query}.`
              : ""}
      </p>

      {/* ------------------------------------------------------ states */}
      {/* always rendered, so the input's aria-controls target exists in every state */}
      <section id="search-results" aria-labelledby="search-results-heading" className="min-w-0">
        <h2 id="search-results-heading" className="sr-only">
          Search results
        </h2>
        {status === "error" ? (
          <div role="alert" className="rounded-[var(--radius-lg)] border border-danger/40 bg-danger/[0.06] p-5">
            <p className="text-[14px] font-semibold text-fog-100">The search index could not be loaded.</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fog-300">
              Search needs the static file <code className="font-mono text-fog-200">/search-index.json</code>. Check your connection and try again; every page is still reachable from the
              sidebar.
            </p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw aria-hidden className="size-3.5" /> Retry
            </Button>
          </div>
        ) : status === "loading" && query ? (
          <ul aria-busy="true" aria-label="Loading results" className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-[92px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/50 motion-reduce:animate-none" />
            ))}
          </ul>
        ) : !query ? (
          <EmptyState total={total} totals={totals} onPick={runSuggestion} />
        ) : filtered.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-5">
            <p className="text-[14.5px] font-semibold text-fog-100">
              {hiddenByFilter ? `No ${kinds.map((k) => KIND_LABEL[k].toLowerCase()).join(" or ")} results for “${query}”.` : `No matches for “${query}”.`}
            </p>
            <ul className="mt-2 list-disc pl-5 text-[13px] leading-relaxed text-fog-300">
              {hiddenByFilter ? <li>{all.length} results in other kinds are hidden by the filter.</li> : null}
              <li>Check the spelling, or try a shorter word — prefixes match (for example “galv” finds galvo).</li>
              <li>Try the handbook’s abbreviation or the full term (BPP or beam parameter product).</li>
              <li>Search matches words, not meaning: use the terms the handbook uses.</li>
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {hiddenByFilter ? (
                <Button size="sm" variant="secondary" onClick={() => setKinds([])}>
                  Show all kinds
                </Button>
              ) : null}
              <Suggestions onPick={runSuggestion} />
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-[12.5px] text-fog-400">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
              {kinds.length ? ` in ${kinds.map((k) => KIND_LABEL[k]).join(", ")}` : ""}
              {all.length === MAX_RESULTS ? " (first matches only)" : ""}
            </p>
            <ol ref={listRef} className="flex flex-col gap-2" aria-label="Search results">
              {shown.map((r, i) => {
                const cls = KIND_CLASS[r.doc.kind];
                return (
                  <li key={r.doc.id}>
                    <Link
                      href={r.doc.href}
                      data-idx={i}
                      onKeyDown={(e) => onResultKey(e, i)}
                      className="group block rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 px-4 py-3 outline-none transition-colors hover:border-white/15 focus-visible:border-teal-400/70 focus-visible:bg-ink-750"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge tone="fog">{KIND_LABEL[r.doc.kind]}</Badge>
                        <span className="min-w-0 truncate text-[12px] text-fog-500">{r.doc.location}</span>
                        <CornerDownLeft aria-hidden className="ml-auto hidden size-3.5 shrink-0 text-fog-500 group-focus-visible:block" />
                      </div>
                      <div className="mt-1.5 text-[15px] font-semibold leading-snug text-fog-100 group-hover:text-paper">
                        <Marked segments={excerpt(r.doc.title, terms, 10_000)} />
                      </div>
                      {r.excerpt.length ? (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-fog-400">
                          <Marked segments={r.excerpt} />
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-fog-500">
                        <ClassTag kind={cls} short />
                        {r.doc.source ? (
                          <span className="font-mono">
                            {cls === "handbook" ? "Source" : "Cites"} {r.doc.source}
                          </span>
                        ) : null}
                        <span className="ml-auto max-w-full truncate font-mono text-fog-500/80">{r.doc.href}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {filtered.length > shown.length ? (
              <div className="mt-3 flex justify-center">
                <Button size="sm" variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                  Show more ({filtered.length - shown.length} remaining)
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function Suggestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <>
      {SUGGESTED_QUERIES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="inline-flex h-7 items-center rounded-full border border-[var(--line-strong)] px-2.5 font-mono text-[12px] text-fog-300 hover:border-teal-400/50 hover:text-fog-100"
        >
          {s}
        </button>
      ))}
    </>
  );
}

function EmptyState({ total, totals, onPick }: { total: number; totals: Partial<Record<SearchKind, number>>; onPick: (q: string) => void }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-5">
      <p className="text-[14.5px] font-semibold text-fog-100">Type a term to search {total} entries.</p>
      <p className="mt-1 text-[13px] leading-relaxed text-fog-400">
        {KIND_ORDER.filter((k) => (totals[k] ?? 0) > 0)
          .map((k) => `${KIND_LABEL[k]} ${totals[k]}`)
          .join(" · ")}
      </p>
      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-500">Try</p>
      <div className="flex flex-wrap gap-2">
        <Suggestions onPick={onPick} />
      </div>
    </div>
  );
}
