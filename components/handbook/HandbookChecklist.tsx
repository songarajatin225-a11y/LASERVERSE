"use client";

import { Check, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { actions, usePersisted } from "@/lib/persistence/store";
import { cn } from "@/components/ui/primitives";
import { linkRefs } from "./linkRefs";

/** Interactive, persisted version of a handbook checklist (☐ items). */
export function HandbookChecklist({ listId, items, title }: { listId: string; items: Array<{ id: string; text: string }>; title?: string }) {
  const state = usePersisted((s) => s.checklists[listId]);
  const done = items.filter((i) => state?.[i.id]).length;
  return (
    <div className="my-6 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/60">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-2.5">
        <div className="text-[12.5px] text-fog-300">
          {title ? <span className="mr-2 font-semibold text-fog-100">{title}</span> : null}
          <span className="tabular">
            {done} / {items.length} complete
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-ink-600" aria-hidden>
            <motion.div className="h-full bg-teal-400" animate={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          <button type="button" onClick={() => actions.resetChecklist(listId)} className="inline-flex items-center gap-1 text-[12px] text-fog-500 hover:text-fog-200" aria-label="Reset checklist">
            <RotateCcw aria-hidden className="size-3" /> Reset
          </button>
        </div>
      </div>
      <ul className="divide-y divide-[var(--line)]">
        {items.map((it) => {
          const checked = Boolean(state?.[it.id]);
          return (
            <li key={it.id}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 text-[14px] leading-snug hover:bg-white/[0.02]">
                <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => actions.setChecklistItem(listId, it.id, e.target.checked)} />
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-teal-300",
                    checked ? "border-teal-400 bg-teal-500" : "border-white/25 bg-transparent",
                  )}
                >
                  {checked ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                </span>
                <span className={cn(checked ? "text-fog-400 line-through decoration-fog-500/60" : "text-fog-200")}>{linkRefs(it.text)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
