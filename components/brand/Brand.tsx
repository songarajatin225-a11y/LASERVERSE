import { cn } from "@/components/ui/primitives";

/**
 * Official TEAL logo (supplied asset, public/brand/teal-logo.webp, 2000 × 450 px, transparent).
 *
 * Integrity rules (docs/MOTION_AND_BRANDING.md):
 * - the artwork is never recoloured, redrawn, stretched, filtered or animated itself;
 * - its grey wordmark (#5F5D5B / #75797C) does not have enough contrast on the dark UI,
 *   so it is always presented on a warm-white plate with clear space of ≥ 0.5× the T-mark height;
 * - width is derived from height at the native 40:9 aspect ratio.
 */
export const TEAL_LOGO = { src: "/brand/teal-logo.webp", width: 2000, height: 450 } as const;
export const TEAL_NAME = "Titan Engineering & Automation Limited (TEAL)";

export function TealLogo({ height = 28, className, plate = true }: { height?: number; className?: string; plate?: boolean }) {
  const width = Math.round((height * TEAL_LOGO.width) / TEAL_LOGO.height);
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={TEAL_LOGO.src}
      width={width}
      height={height}
      alt={`${TEAL_NAME} — A TATA Enterprise`}
      className="block max-w-none select-none"
      style={{ width, height }}
      draggable={false}
    />
  );
  if (!plate) return img;
  const pad = Math.round(height * 0.42);
  return (
    <span
      className={cn("inline-flex w-fit shrink-0 items-center self-start rounded-[10px] bg-paper shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_10px_30px_-14px_rgb(0_0_0/0.8)]", className)}
      style={{ padding: `${Math.round(pad * 0.75)}px ${pad}px` }}
    >
      {img}
    </span>
  );
}

/** LASERVERSE product wordmark (original typographic mark; not the TEAL logo). */
export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "text-[22px]" : size === "sm" ? "text-[14px]" : "text-[16px]";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span aria-hidden className="relative grid size-7 place-items-center rounded-[8px] bg-ink-700 shadow-[0_0_0_1px_rgb(255_255_255/0.08)_inset]">
        <span className="absolute h-[2px] w-4 rounded bg-teal-400 shadow-[0_0_10px_2px_rgb(25_178_171/0.7)]" />
        <span className="absolute size-1.5 translate-x-[7px] rounded-full bg-paper" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-semibold tracking-[0.18em] text-paper", s)}>LASERVERSE</span>
        <span className="mt-1 whitespace-nowrap text-[9.5px] font-medium uppercase tracking-[0.26em] text-fog-500">Photon to Product</span>
      </span>
    </span>
  );
}

export function Attribution({ className, logoHeight = 22 }: { className?: string; logoHeight?: number }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-[11px] leading-snug text-fog-500">A laser knowledge platform by</span>
      <TealLogo height={logoHeight} />
    </div>
  );
}
