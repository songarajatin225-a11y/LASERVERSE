"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ClassTag, cn } from "@/components/ui/primitives";
import { STANDARD_GROUP_LABEL, type StandardGroup, type StandardRow } from "./types";

const GROUPS = Object.keys(STANDARD_GROUP_LABEL) as StandardGroup[];

/** Case-, superscript- and dash-insensitive matching, so "m2" finds "M²" and "13849-1" finds "13849‑1". */
const norm = (s: string) => s.toLowerCase().replace(/²/g, "2").replace(/[‐‑–—]/g, "-");

export function StandardsFilter({ rows }: { rows: StandardRow[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<StandardGroup | null>(null);
  const tokens = useMemo(
    () =>
      norm(q)
        .split(/\s+/)
        .filter(Boolean),
    [q],
  );
  const list = rows.filter((r) => {
    if (group && r.group !== group) return false;
    const hay = norm(`${r.standard} ${r.scope}`);
    return tokens.every((t) => hay.includes(t));
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* a div, not a label: a label may not contain a second labelable element (the clear button) */}
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-ink-850 px-3 focus-within:border-teal-400">
          <Search aria-hidden className="size-4 shrink-0 text-fog-500" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter, e.g. eyewear, 13849, welding, M²"
            className="w-full min-w-0 bg-transparent text-[13.5px] text-fog-100 outline-none placeholder:text-fog-500 [&::-webkit-search-cancel-button]:hidden"
            aria-label="Filter standards by number or scope"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Clear filter" className="shrink-0 text-fog-500 hover:text-fog-200">
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
        <div role="group" aria-label="Standard group (derived)" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={group === null}
            onClick={() => setGroup(null)}
            className={cn("rounded-full border px-3 py-1 text-[12.5px]", group === null ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100")}
          >
            All <span className="text-fog-500">{rows.length}</span>
          </button>
          {GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => setGroup(group === g ? null : g)}
              className={cn("rounded-full border px-3 py-1 text-[12.5px]", group === g ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100")}
            >
              {STANDARD_GROUP_LABEL[g]} <span className="text-fog-500">{rows.filter((r) => r.group === g).length}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-[11.5px] leading-snug text-fog-500">
        <ClassTag kind="derived" short /> Groups are a LASERVERSE sorting aid built from keywords in the scope text, not a handbook classification.
      </p>
      <p className="sr-only" aria-live="polite">
        {list.length} of {rows.length} standards shown
      </p>
      <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70">
        {list.map((r) => (
          <li key={r.standard} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)] sm:gap-4">
            <span className="font-mono text-[13px] font-medium text-teal-200">{r.standard}</span>
            <span className="text-[13.5px] leading-snug text-fog-200">
              {r.scope}
              <span className="ml-2 whitespace-nowrap text-[11px] text-fog-500">· {STANDARD_GROUP_LABEL[r.group]}</span>
            </span>
          </li>
        ))}
        {!list.length ? <li className="px-4 py-6 text-[13px] text-fog-400">No standard in §24.3 matches this filter.</li> : null}
      </ul>
    </div>
  );
}
