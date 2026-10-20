"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft, Loader2, ArrowRight } from "lucide-react";
import { loadSearch, KIND_LABEL, type LocalSearch, type SearchResult } from "@/lib/search/engine";
import { NAV_ITEMS } from "@/lib/nav";
import { usePersisted } from "@/lib/persistence/store";
import { cn } from "@/components/ui/primitives";
import { duration, ease } from "@/components/motion/tokens";

const OPEN_EVENT = "laserverse:open-search";
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function Highlight({ segments }: { segments: SearchResult["excerpt"] }) {
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

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [engine, setEngine] = useState<LocalSearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const recent = usePersisted((s) => s.recent.slice(0, 5));

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    if (!engine) {
      loadSearch()
        .then(setEngine)
        .catch(() => setError("The search index could not be loaded."));
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, engine]);

  const results = useMemo(() => (engine && q.trim() ? engine.search(q, { limit: 24 }) : []), [engine, q]);

  type Row = { key: string; title: string; meta: string; href: string; excerpt?: SearchResult["excerpt"] };
  const rows: Row[] = useMemo(() => {
    if (q.trim()) {
      return results.map((r) => ({ key: r.doc.id, title: r.doc.title, meta: `${KIND_LABEL[r.doc.kind]} · ${r.doc.location}`, href: r.doc.href, excerpt: r.excerpt }));
    }
    const rec = recent.map((r) => ({ key: `recent-${r.id}`, title: r.title, meta: "Recent", href: r.href }));
    const nav = NAV_ITEMS.map((n) => ({ key: `nav-${n.id}`, title: n.label, meta: n.description, href: n.href }));
    return [...rec, ...nav];
  }, [q, results, recent]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      router.push(href);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(rows.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey || !rows[active]) {
        if (q.trim()) go(`/search?q=${encodeURIComponent(q)}`);
      } else {
        go(rows[active]!.href);
      }
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search">
          <motion.div className="absolute inset-0 bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            className="relative flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-ink-850 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)]"
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: duration.base, ease: ease.out }}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
              <Search aria-hidden className="size-4 text-fog-500" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder="Search lessons, equations, sources, materials, components…"
                className="h-14 flex-1 bg-transparent text-[15px] text-paper outline-none placeholder:text-fog-500"
                aria-label="Search query"
                aria-controls="palette-results"
                aria-activedescendant={rows[active] ? `palette-${rows[active]!.key}` : undefined}
                role="combobox"
                aria-expanded="true"
              />
              {!engine && !error ? <Loader2 aria-label="Loading index" className="size-4 animate-spin text-fog-500" /> : null}
            </div>
            {error ? <p className="px-4 py-3 text-sm text-danger">{error}</p> : null}
            <ul id="palette-results" ref={listRef} role="listbox" className="scrollbar-thin flex-1 overflow-y-auto p-2">
              {!q.trim() ? <li className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fog-500">Jump to</li> : null}
              {rows.map((r, i) => (
                <li
                  key={r.key}
                  id={`palette-${r.key}`}
                  data-idx={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(r.href)}
                  className={cn("cursor-pointer rounded-[var(--radius-md)] px-3 py-2.5", i === active ? "bg-white/[0.06]" : "")}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-fog-100">{r.title}</span>
                    {i === active ? <CornerDownLeft aria-hidden className="ml-auto size-3.5 shrink-0 text-fog-500" /> : null}
                  </div>
                  <div className="truncate text-[12px] text-fog-500">{r.meta}</div>
                  {r.excerpt?.length ? (
                    <div className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-fog-400">
                      <Highlight segments={r.excerpt} />
                    </div>
                  ) : null}
                </li>
              ))}
              {q.trim() && engine && rows.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-fog-500">No matches in the handbook index for “{q}”.</li>
              ) : null}
            </ul>
            {q.trim() ? (
              <button
                type="button"
                onClick={() => go(`/search?q=${encodeURIComponent(q)}`)}
                className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2.5 text-[12.5px] text-fog-400 hover:text-fog-100"
              >
                <span>
                  All results for “{q}” {engine ? `(${results.length}${results.length === 24 ? "+" : ""})` : ""}
                </span>
                <ArrowRight aria-hidden className="size-3.5" />
              </button>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
