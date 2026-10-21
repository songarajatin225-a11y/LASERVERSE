"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, Search, X } from "lucide-react";
import { cn } from "@/components/ui/primitives";
import { linkRefs } from "@/components/handbook/linkRefs";
import type { AbbreviationEntry, GlossaryEntry } from "./types";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Case- and accent-insensitive text for matching. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

function groupByLetter<T extends { letter: string }>(xs: T[]): Array<[string, T[]]> {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(x.letter, [...(m.get(x.letter) ?? []), x]);
  return [...m.entries()].sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
}

/** Id of a letter heading ("#" — entries not starting with A–Z — becomes "other"). */
const letterId = (prefix: string, letter: string) => `${prefix}-${letter === "#" ? "other" : letter}`;

function JumpBar({ prefix, present, label }: { prefix: string; present: Set<string>; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {LETTERS.map((l) =>
        present.has(l) ? (
          <a
            key={l}
            href={`#${letterId(prefix, l)}`}
            className="inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] font-mono text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100"
          >
            {l}
          </a>
        ) : (
          <span key={l} aria-hidden className="inline-flex size-7 items-center justify-center font-mono text-[12px] text-fog-500/40">
            {l}
          </span>
        ),
      )}
    </nav>
  );
}

function Permalink({ anchor, label }: { anchor: string; label: string }) {
  return (
    <a href={`#${anchor}`} className="text-fog-500 opacity-60 hover:text-teal-300 hover:opacity-100 focus-visible:opacity-100" aria-label={`Link to ${label}`}>
      <Link2 aria-hidden className="size-3.5" />
    </a>
  );
}

const entryCls =
  "scroll-mt-44 rounded-[var(--radius-md)] border border-transparent px-3 py-2.5 transition-colors target:border-teal-400/50 target:bg-teal-500/[0.07]";

export function GlossaryExplorer({ terms, abbreviations }: { terms: GlossaryEntry[]; abbreviations: AbbreviationEntry[] }) {
  const [q, setQ] = useState("");
  const tokens = useMemo(() => fold(q).split(/\s+/).filter(Boolean), [q]);
  const match = (hay: string) => {
    const h = fold(hay);
    return tokens.every((t) => h.includes(t));
  };
  const shownTerms = terms.filter((t) => match(`${t.term} ${t.definition}`));
  const shownAbbr = abbreviations.filter((a) => match(`${a.abbr} ${a.meaning}`));
  const termGroups = groupByLetter(shownTerms);
  const abbrGroups = groupByLetter(shownAbbr);

  // Following a link to an entry the filter hides (a search hit, or a term ↔ abbreviation
  // cross-link) clears the filter so the target exists, then scrolls to it.
  useEffect(() => {
    const known = new Set([...terms.map((t) => t.anchor), ...abbreviations.map((a) => a.anchor)]);
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!known.has(id) || document.getElementById(id)) return;
      setQ("");
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [terms, abbreviations]);

  return (
    <div className="flex flex-col gap-8">
      <div className="sticky top-16 z-10 flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-900/90 p-3 backdrop-blur">
        <div className="flex h-10 min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-ink-850 px-3 focus-within:border-teal-400">
          <Search aria-hidden className="size-4 shrink-0 text-fog-500" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter terms and abbreviations, e.g. fluence, HAZ, threshold"
            className="w-full min-w-0 bg-transparent text-[14px] text-fog-100 outline-none placeholder:text-fog-500 [&::-webkit-search-cancel-button]:hidden"
            aria-label="Filter glossary and abbreviations"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Clear filter" className="text-fog-500 hover:text-fog-200">
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
        <p className="text-[12px] text-fog-500" aria-live="polite">
          Showing {shownTerms.length} of {terms.length} terms · {shownAbbr.length} of {abbreviations.length} abbreviations ·{" "}
          <a href="#glossary" className="text-teal-300 hover:underline">
            Glossary
          </a>{" "}
          ·{" "}
          <a href="#abbreviations" className="text-teal-300 hover:underline">
            Abbreviations
          </a>
        </p>
      </div>

      {/* ------------------------------------------------ §B.1 glossary */}
      <section id="glossary" aria-labelledby="glossary-heading" className="flex scroll-mt-44 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="glossary-heading" className="text-xl font-semibold text-paper">
            Glossary <span className="font-mono text-[13px] font-normal text-fog-500">§B.1 · {terms.length} terms</span>
          </h2>
        </div>
        <JumpBar prefix="glossary" present={new Set(termGroups.map(([l]) => l))} label="Glossary letters" />
        {termGroups.length ? (
          <div className="flex flex-col gap-6">
            {termGroups.map(([letter, items]) => (
              <div key={letter} className="grid gap-x-6 md:grid-cols-[3rem_1fr]">
                <h3 id={letterId("glossary", letter)} className="scroll-mt-44 font-mono text-[22px] font-semibold text-teal-300 md:pt-2">
                  {letter}
                </h3>
                <dl className="divide-y divide-[var(--line)] rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60">
                  {items.map((t) => (
                    <div key={t.anchor} id={t.anchor} className={entryCls}>
                      <dt className="flex items-center gap-2 text-[14.5px] font-semibold text-fog-100">
                        {t.term}
                        <Permalink anchor={t.anchor} label={t.term} />
                      </dt>
                      <dd className="mt-1 text-[13.5px] leading-relaxed text-fog-300">
                        {linkRefs(t.definition, `${t.anchor}-`)}
                        {t.abbr ? (
                          <a href={`#${t.abbr.anchor}`} aria-label={`Abbreviation ${t.abbr.label}`} className="ml-2 inline-flex rounded-full border border-[var(--line-strong)] px-2 py-0.5 font-mono text-[11px] text-fog-300 hover:border-teal-400/60 hover:text-teal-100">
                            {t.abbr.label} ↓
                          </a>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--line-strong)] px-4 py-6 text-center text-[13.5px] text-fog-400">No glossary term matches “{q}”.</p>
        )}
      </section>

      {/* ------------------------------------------------ §B.2 abbreviations */}
      <section id="abbreviations" aria-labelledby="abbreviations-heading" className="flex scroll-mt-44 flex-col gap-4">
        <h2 id="abbreviations-heading" className="text-xl font-semibold text-paper">
          Abbreviations <span className="font-mono text-[13px] font-normal text-fog-500">§B.2 · {abbreviations.length} entries</span>
        </h2>
        <JumpBar prefix="abbreviations" present={new Set(abbrGroups.map(([l]) => l))} label="Abbreviation letters" />
        {abbrGroups.length ? (
          <div className="flex flex-col gap-6">
            {abbrGroups.map(([letter, items]) => (
              <div key={letter} className="grid gap-x-6 md:grid-cols-[3rem_1fr]">
                <h3 id={letterId("abbreviations", letter)} className="scroll-mt-44 font-mono text-[22px] font-semibold text-teal-300 md:pt-2">
                  {letter}
                </h3>
                <dl className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
                  {items.map((a) => (
                    <div key={a.anchor} id={a.anchor} className={cn(entryCls, "rounded-none bg-ink-800")}>
                      <dt className="flex items-center gap-2 font-mono text-[13.5px] font-semibold text-teal-100">
                        {a.abbr}
                        <Permalink anchor={a.anchor} label={a.abbr} />
                      </dt>
                      <dd className="mt-0.5 text-[13.5px] leading-snug text-fog-300">
                        {linkRefs(a.meaning, `${a.anchor}-`)}
                        {a.terms.length ? (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {a.terms.map((t) => (
                              <a key={t.anchor} href={`#${t.anchor}`} aria-label={`Glossary term ${t.label}`} className="inline-flex rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[11px] text-fog-400 hover:border-teal-400/60 hover:text-teal-100">
                                ↑ {t.label}
                              </a>
                            ))}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--line-strong)] px-4 py-6 text-center text-[13.5px] text-fog-400">No abbreviation matches “{q}”.</p>
        )}
      </section>
    </div>
  );
}
