import Link from "next/link";
import { ArrowDown, ArrowUpRight, Cog, Droplets, Eye, FlipHorizontal2, Flame, Hand, Radiation, ShieldAlert, Wind, Zap, type LucideIcon } from "lucide-react";
import type { Hazard, SafetyElement } from "./types";

/** Icon by keyword in the hazard name (presentation only). */
function iconFor(hazard: string): LucideIcon {
  const h = hazard.toLowerCase();
  if (h.startsWith("eye")) return Eye;
  if (h.startsWith("skin")) return Hand;
  if (h.startsWith("reflection")) return FlipHorizontal2;
  if (h.startsWith("fire")) return Flame;
  if (h.startsWith("fume")) return Wind;
  if (h.startsWith("electrical")) return Zap;
  if (h.startsWith("cooling")) return Droplets;
  if (h.startsWith("collateral")) return Radiation;
  if (h.startsWith("mechanical")) return Cog;
  return ShieldAlert;
}

export function HazardCards({ hazards }: { hazards: Hazard[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {hazards.map((h) => {
        const Icon = iconFor(h.hazard);
        const eyewear = /eyewear|\bOD\b/.test(h.controls);
        return (
          <li key={h.id}>
            <article className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4">
              <h3 className="flex items-start gap-2.5 text-[15px] font-semibold leading-snug text-paper">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-danger/30 bg-danger/[0.08] text-[#ffb4b6]">
                  <Icon className="size-4" />
                </span>
                <span className="pt-1">{h.hazard}</span>
              </h3>
              <dl className="mt-3 flex flex-1 flex-col gap-2.5 text-[13px] leading-snug">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Mechanism</dt>
                  <dd className="mt-0.5 text-fog-200">{h.mechanism}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Controls</dt>
                  <dd className="mt-0.5 text-fog-200">{h.controls}</dd>
                </div>
              </dl>
              {eyewear ? (
                <a href="#od-nohd" className="mt-3 inline-flex items-center gap-1 self-start text-[12.5px] text-teal-300 hover:text-teal-200">
                  Eyewear OD and NOHD calculations <ArrowDown aria-hidden className="size-3" />
                </a>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function SafetyElements({ elements }: { elements: SafetyElement[] }) {
  return (
    <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70">
      {elements.map((e) => (
        <li key={e.element} className="flex flex-col gap-1 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[14px] font-semibold text-fog-100">{e.element}</span>
            {e.componentId ? (
              <Link href={`/machine?select=${e.componentId}`} className="inline-flex items-center gap-1 text-[12px] text-teal-300 hover:text-teal-200">
                Show in 3D Machine Explorer <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            ) : null}
          </div>
          <span className="text-[13px] leading-snug text-fog-300">{e.purpose}</span>
        </li>
      ))}
    </ul>
  );
}
