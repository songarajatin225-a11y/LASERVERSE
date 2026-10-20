"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV } from "@/lib/nav";
import { cn } from "@/components/ui/primitives";
import { Wordmark, Attribution } from "@/components/brand/Brand";
import { spring } from "@/components/motion/tokens";

export function NavList({ onNavigate, idPrefix = "side" }: { onNavigate?: () => void; idPrefix?: string }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Primary" className="flex flex-col gap-6">
      {NAV.map((group) => (
        <div key={group.label}>
          <div className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-fog-500">{group.label}</div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-[7px] text-[13.5px] transition-colors",
                      active ? "text-paper" : "text-fog-400 hover:bg-white/[0.035] hover:text-fog-100",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`${idPrefix}-active`}
                        transition={spring.layout}
                        className="absolute inset-0 rounded-[var(--radius-sm)] bg-white/[0.06] shadow-[0_0_0_1px_rgb(255_255_255/0.05)_inset]"
                      />
                    ) : null}
                    {active ? <span aria-hidden className="absolute -left-3 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded bg-teal-400 shadow-[0_0_8px_rgb(25_178_171)]" /> : null}
                    <Icon aria-hidden className={cn("relative size-[15px] shrink-0", active ? "text-teal-300" : "text-fog-500 group-hover:text-fog-300")} />
                    <span className="relative truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-[var(--line)] bg-ink-950/60 lg:flex">
      <div className="px-5 pb-4 pt-5">
        <Link href="/" aria-label="LASERVERSE — back to the Photon to Product journey" className="inline-flex rounded">
          <Wordmark />
        </Link>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6 pt-2">
        <NavList />
      </div>
      <div className="border-t border-[var(--line)] px-5 py-4">
        <Attribution logoHeight={20} />
      </div>
    </aside>
  );
}
