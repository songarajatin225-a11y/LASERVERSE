import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CLASSIFICATION, type Classification, type ContentStatus, STATUS_LABEL } from "@/lib/content/classification";
import { AlertTriangle, Info, Lightbulb, ShieldAlert, Sparkles, FlaskConical } from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ buttons */
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-[background,color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-expo)] disabled:opacity-40 disabled:pointer-events-none select-none";
const buttonVariants = {
  primary:
    "bg-teal-500 text-white hover:bg-teal-400 shadow-[0_0_0_1px_rgb(255_255_255/0.08)_inset,0_8px_30px_-12px_rgb(0_149_144/0.7)] active:translate-y-px",
  secondary: "border border-[var(--line-strong)] bg-white/[0.03] text-fog-100 hover:bg-white/[0.07] hover:border-white/20",
  ghost: "text-fog-300 hover:text-fog-100 hover:bg-white/[0.05]",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
};
const buttonSizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes }) {
  return <button type="button" className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes }) {
  return <Link className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />;
}

/* ------------------------------------------------------------------ badges */
const tones: Record<string, string> = {
  teal: "border-teal-500/35 bg-teal-500/10 text-teal-200",
  info: "border-info/35 bg-info/10 text-[#b9d9ff]",
  fog: "border-white/15 bg-white/[0.04] text-fog-300",
  warn: "border-warn/40 bg-warn/10 text-[#f6d79a]",
  concept: "border-concept/40 bg-concept/10 text-[#d6c9ff]",
  ok: "border-ok/40 bg-ok/10 text-[#a6e8cf]",
  danger: "border-danger/40 bg-danger/10 text-[#ffb4b6]",
};

export function Badge({ tone = "fog", children, className, title }: { tone?: keyof typeof tones | string; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap",
        tones[tone] ?? tones.fog,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Labels any element with its source-integrity class. */
export function ClassTag({ kind, className, short = false }: { kind: Classification; className?: string; short?: boolean }) {
  const c = CLASSIFICATION[kind];
  return (
    <Badge tone={c.tone} className={cn("uppercase", className)} title={c.description}>
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />
      {short ? c.short : c.label}
    </Badge>
  );
}

export function StatusPill({ status }: { status: ContentStatus }) {
  const tone = status === "extracted" ? "teal" : status === "validated" ? "ok" : status === "review-required" ? "warn" : "fog";
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>;
}

/* ------------------------------------------------------------------ layout */
export function Panel({ children, className, as: Tag = "div", ...rest }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "aside" } & Record<string, unknown>) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/80 shadow-[0_1px_0_0_rgb(255_255_255/0.03)_inset]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({ title, eyebrow, actions, className }: { title: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-3.5", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-fog-500">{eyebrow}</div> : null}
        <div className="text-[15px] font-semibold text-fog-100">{title}</div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300", className)}>
      <span aria-hidden className="h-px w-6 bg-teal-400/70" />
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 max-w-4xl", className)}>
      {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
      <h1 className="text-balance text-[clamp(1.9rem,3.4vw,2.9rem)] font-semibold leading-[1.06] tracking-[-0.025em] text-paper">{title}</h1>
      {description ? <div className="mt-4 max-w-3xl text-pretty text-[15.5px] leading-relaxed text-fog-300">{description}</div> : null}
      {children ? <div className="mt-5 flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

export function SectionTitle({ id, children, sub, className }: { id?: string; children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 mt-12 first:mt-0", className)}>
      <h2 id={id} className="scroll-mt-24 text-xl font-semibold tracking-[-0.01em] text-paper">
        {children}
      </h2>
      {sub ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-fog-400">{sub}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ callouts */
const calloutKinds = {
  note: { icon: Info, cls: "border-info/30 bg-info/[0.06]", title: "Note" },
  assumption: { icon: Lightbulb, cls: "border-white/12 bg-white/[0.025]", title: "Assumptions" },
  limitation: { icon: AlertTriangle, cls: "border-warn/30 bg-warn/[0.06]", title: "Limitations" },
  safety: { icon: ShieldAlert, cls: "border-danger/35 bg-danger/[0.06]", title: "Safety" },
  conceptual: { icon: Sparkles, cls: "border-concept/30 bg-concept/[0.06]", title: "Conceptual visualization" },
  review: { icon: FlaskConical, cls: "border-warn/35 bg-warn/[0.05]", title: "Flagged for technical review" },
};

export function Callout({
  kind = "note",
  title,
  children,
  className,
}: {
  kind?: keyof typeof calloutKinds;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const k = calloutKinds[kind];
  const Icon = k.icon;
  return (
    <div className={cn("rounded-[var(--radius-md)] border px-4 py-3 text-[13.5px] leading-relaxed text-fog-200", k.cls, className)} role="note">
      <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-fog-100">
        <Icon aria-hidden className="size-3.5" />
        {title ?? k.title}
      </div>
      <div className="[&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/15 bg-white/5 px-1 font-mono text-[10.5px] text-fog-300">
      {children}
    </kbd>
  );
}

export function KeyValue({ items, className }: { items: Array<[ReactNode, ReactNode]>; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-[13.5px]", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-fog-500">{k}</dt>
          <dd className="text-fog-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
