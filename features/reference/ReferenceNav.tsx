import Link from "next/link";
import { cn } from "@/components/ui/primitives";
import { REFERENCE_PAGES, type ReferencePageDef } from "./pages";

/** Sub-navigation between the Reference Library pages (scrolls horizontally on narrow screens). */
export function ReferenceNav({ current, className }: { current?: ReferencePageDef["id"]; className?: string }) {
  const items = [{ id: undefined, href: "/reference", title: "Overview" }, ...REFERENCE_PAGES];
  return (
    <nav aria-label="Reference Library pages" className={cn("scrollbar-thin -mt-2 mb-8 overflow-x-auto pb-1", className)}>
      <ul className="flex w-max gap-1.5">
        {items.map((p) => {
          const active = p.id === current;
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-[12.5px] transition-colors",
                  active ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:border-white/20 hover:text-fog-100",
                )}
              >
                {p.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
