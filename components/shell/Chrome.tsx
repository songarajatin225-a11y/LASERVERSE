"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bookmark, BookmarkCheck, ChevronRight } from "lucide-react";
import { actions, usePersisted, type ItemRef } from "@/lib/persistence/store";
import { cn } from "@/components/ui/primitives";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-6 text-[12.5px]", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-fog-500">
        <li>
          <Link href="/home" className="hover:text-fog-200">
            Home
          </Link>
        </li>
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight aria-hidden className="size-3 opacity-60" />
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="hover:text-fog-200">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className={i === items.length - 1 ? "text-fog-300" : ""}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BookmarkButton({ item, className }: { item: ItemRef; className?: string }) {
  const marked = usePersisted((s) => s.bookmarks.some((b) => b.id === item.id));
  return (
    <button
      type="button"
      onClick={() => actions.toggleBookmark(item)}
      aria-pressed={marked}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-[12.5px] transition-colors",
        marked ? "border-teal-500/50 bg-teal-500/10 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100",
        className,
      )}
    >
      {marked ? <BookmarkCheck aria-hidden className="size-3.5" /> : <Bookmark aria-hidden className="size-3.5" />}
      {marked ? "Bookmarked" : "Bookmark"}
    </button>
  );
}

/** Records the page in recent activity (and lesson-opened state for lessons). */
export function TrackVisit({ item }: { item: ItemRef }) {
  useEffect(() => {
    actions.pushRecent(item);
    if (item.kind === "lesson") actions.openLesson(item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return null;
}
