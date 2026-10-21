"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDialog } from "@/components/ui/useDialog";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X, Bookmark, Gauge } from "lucide-react";
import { NavList } from "./Sidebar";
import { Wordmark, Attribution } from "@/components/brand/Brand";
import { Kbd, cn } from "@/components/ui/primitives";
import { openCommandPalette } from "./CommandPalette";
import { usePersisted, actions } from "@/lib/persistence/store";
import { duration, ease } from "@/components/motion/tokens";

function MotionToggle() {
  const pref = usePersisted((s) => s.settings.motion);
  const next = pref === "system" ? "reduce" : pref === "reduce" ? "full" : "system";
  const label = pref === "system" ? "Motion: system" : pref === "reduce" ? "Motion: reduced" : "Motion: full";
  return (
    <button
      type="button"
      onClick={() => actions.setMotion(next)}
      className="hidden h-9 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-[12.5px] text-fog-400 hover:bg-white/[0.05] hover:text-fog-100 md:inline-flex"
      title="Cycle motion preference (system → reduced → full)"
      aria-label={`${label}. Activate to change.`}
    >
      <Gauge aria-hidden className="size-4" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

export function TopBar() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialog(open, drawerRef, () => setOpen(false));
  const pathname = usePathname();
  const bookmarks = usePersisted((s) => s.bookmarks.length);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[var(--line)] bg-ink-900/80 px-4 backdrop-blur-xl md:px-6">
        <button
          type="button"
          className="-ml-1 inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-fog-300 hover:bg-white/[0.06] lg:hidden"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <Link href="/" className="mr-2 lg:hidden" aria-label="LASERVERSE home">
          <Wordmark size="sm" />
        </Link>
        <button
          type="button"
          onClick={openCommandPalette}
          className="ml-auto flex h-9 min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-white/[0.025] px-3 text-[13px] text-fog-500 transition-colors hover:border-white/15 hover:text-fog-300 sm:w-72 lg:ml-0"
          aria-label="Search the handbook and tools"
        >
          <Search aria-hidden className="size-4 shrink-0" />
          <span className="hidden truncate sm:inline">Search handbook, tools, terms…</span>
          <span className="ml-auto hidden items-center gap-1 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <MotionToggle />
          <Link
            href="/home#bookmarks"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-[12.5px] text-fog-400 hover:bg-white/[0.05] hover:text-fog-100"
            aria-label={`Bookmarks (${bookmarks})`}
          >
            <Bookmark aria-hidden className="size-4" />
            <span className="tabular hidden sm:inline">{bookmarks}</span>
          </Link>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={drawerRef}
              className="absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col border-r border-[var(--line)] bg-ink-900"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: duration.base, ease: ease.out }}
            >
              <div className="flex items-center justify-between px-5 py-4">
                <Wordmark size="sm" />
                <button type="button" className="inline-flex size-9 items-center justify-center rounded text-fog-300 hover:bg-white/[0.06]" aria-label="Close navigation" onClick={() => setOpen(false)}>
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
                <NavList idPrefix="drawer" onNavigate={() => setOpen(false)} />
              </div>
              <div className={cn("border-t border-[var(--line)] px-5 py-4")}>
                <Attribution logoHeight={20} />
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
