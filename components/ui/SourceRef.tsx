import Link from "next/link";
import { BookOpen } from "lucide-react";
import { hrefFor, labelFor, pageFor, outlineSection } from "@/lib/content/outline";
import { cn } from "./primitives";

export interface SourceRefData {
  /** Handbook section id, e.g. "9.4" or "B.3" */
  section: string;
  /** What exactly is taken from that section, e.g. "thermal diffusivity table" */
  note?: string;
}

/** Inline link to the handbook section that supports a statement. */
export function SourceRef({ section, note, className }: SourceRefData & { className?: string }) {
  const known = outlineSection(section);
  const page = pageFor(section);
  if (!known) {
    return <span className="text-danger">[unknown source {section}]</span>;
  }
  return (
    <Link
      href={hrefFor(section)}
      className={cn(
        "group inline-flex items-baseline gap-1 rounded text-[12.5px] text-teal-300 underline decoration-teal-300/30 underline-offset-[3px] hover:decoration-teal-300",
        className,
      )}
      title={`${labelFor(section, true)}${page ? ` — handbook page ${page}` : ""}`}
    >
      <BookOpen aria-hidden className="size-3 translate-y-[1px] opacity-70" />
      <span>
        {labelFor(section)}
        {note ? <span className="text-fog-400 no-underline"> · {note}</span> : null}
        {page ? <span className="text-fog-500"> · p.{page}</span> : null}
      </span>
    </Link>
  );
}

export function SourceList({ refs, className, title = "Handbook sources" }: { refs: SourceRefData[]; className?: string; title?: string }) {
  if (!refs.length) return null;
  return (
    <div className={cn("text-[12.5px]", className)}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">{title}</div>
      <ul className="flex flex-col gap-1">
        {refs.map((r, i) => (
          <li key={`${r.section}-${i}`}>
            <SourceRef {...r} />
          </li>
        ))}
      </ul>
    </div>
  );
}
