"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight, ChevronsDown, Map as MapIcon } from "lucide-react";
import { ButtonLink, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { Attribution } from "@/components/brand/Brand";
import { HeadlineReveal } from "@/components/motion/primitives";
import { useMotionAllowed } from "@/components/shell/MotionProvider";
import { ease } from "@/components/motion/tokens";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

export interface ChapterData {
  letter: string;
  name: string;
  title: string;
  quote: string;
  quoteSection: string;
  facts: Array<{ text: string; section?: string; derived?: boolean }>;
  links: Array<{ label: string; href: string }>;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const SCREENS = 7; // hero + chapters A–F

export function LandingNarrative({ chapters }: { chapters: ChapterData[] }) {
  const track = useRef<HTMLDivElement>(null);
  const motionOk = useMotionAllowed();
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const chapter = useTransform(scrollYProgress, (v) => v * (SCREENS - 1));
  const [current, setCurrent] = useState(0);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [active, setActive] = useState(true);
  useMotionValueEvent(chapter, "change", (v) => setCurrent(Math.round(v)));

  useEffect(() => setWebgl(hasWebGL()), []);
  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setActive(!!e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY + i * window.innerHeight;
    window.scrollTo({ top, behavior: motionOk ? "smooth" : "auto" });
  };

  return (
    <div ref={track} className="relative" style={{ height: `${SCREENS * 100}svh` }}>
      {/* sticky stage */}
      <div className="sticky top-0 h-svh overflow-hidden">
        {webgl ? <HeroScene chapter={chapter} motion={motionOk} active={active} /> : webgl === false ? <Fallback2D current={current} /> : null}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_40%,transparent_30%,rgb(5_8_13/0.75)_75%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#05080d]/90 via-[#05080d]/40 to-transparent md:w-[58%]" />
        <p className="absolute bottom-4 right-4 hidden max-w-xs text-right text-[11px] leading-snug text-fog-500 sm:block">
          {webgl === false ? "2D illustration — WebGL is not available in this browser." : "Conceptual 3D visualization · scales exaggerated · 1064 nm drawn in false colour (infrared is invisible)."}
        </p>
        {/* chapter rail */}
        <nav aria-label="Story chapters" className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 md:flex">
          {["Start", ...chapters.map((c) => `${c.letter} · ${c.name}`)].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goTo(i)}
              aria-current={current === i ? "step" : undefined}
              className={cn(
                "group flex items-center justify-end gap-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors",
                current === i ? "text-teal-200" : "text-fog-500 hover:text-fog-200",
              )}
            >
              <span className={cn("transition-opacity", current === i ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{label}</span>
              <span className={cn("h-px transition-all", current === i ? "w-8 bg-teal-300" : "w-4 bg-fog-600")} />
            </button>
          ))}
        </nav>
      </div>

      {/* scrolling content */}
      <div className="absolute inset-0">
        <section className="relative flex h-svh flex-col justify-center px-5 pb-16 pt-24 sm:px-10 lg:px-[6vw]" aria-label="Introduction">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: ease.out }}
            className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-300 sm:text-[12px]"
          >
            <span aria-hidden className="h-px w-8 bg-teal-400/80" />
            The interactive laser technology platform
          </motion.div>
          <HeadlineReveal
            text="PHOTON TO PRODUCT"
            className="max-w-[12ch] text-[clamp(3rem,9vw,8.2rem)] font-semibold leading-[0.9] tracking-[-0.045em] text-paper"
            delay={0.15}
          />
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: ease.out, delay: 0.55 }}
            className="mt-7 max-w-xl text-pretty text-[clamp(1rem,1.5vw,1.2rem)] leading-relaxed text-fog-200"
          >
            Explore laser physics, understand industrial laser systems, and investigate the engineering behind real-world laser applications.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: ease.out, delay: 0.75 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <ButtonLink href="/home" variant="primary" size="lg">
              Enter the Laboratory <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
            <ButtonLink href="/reference/map" variant="secondary" size="lg" className="backdrop-blur">
              <MapIcon aria-hidden className="size-4" /> Explore the Technology Map
            </ButtonLink>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-10"
          >
            <button type="button" onClick={() => goTo(1)} className="inline-flex items-center gap-2 text-[12.5px] text-fog-400 hover:text-fog-100">
              <ChevronsDown aria-hidden className="size-4 motion-safe:animate-bounce" />
              Scroll the story: photon → laser → beam → material → machine → product
            </button>
            <Attribution logoHeight={22} />
          </motion.div>
        </section>

        {chapters.map((c, i) => (
          <section key={c.letter} id={`chapter-${c.letter.toLowerCase()}`} className="flex h-svh items-end px-4 pb-10 sm:px-10 md:items-center md:pb-0 lg:px-[6vw]" aria-labelledby={`ch-${c.letter}`}>
            <ChapterCard c={c} index={i} onNext={() => (i < chapters.length - 1 ? goTo(i + 2) : document.getElementById("enter")?.scrollIntoView({ behavior: motionOk ? "smooth" : "auto" }))} last={i === chapters.length - 1} />
          </section>
        ))}
      </div>
    </div>
  );
}

function ChapterCard({ c, index, onNext, last }: { c: ChapterData; index: number; onNext: () => void; last: boolean }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.5 }}
      transition={{ duration: 0.7, ease: ease.out }}
      className="w-full max-w-[30rem] rounded-[var(--radius-xl)] border border-white/10 bg-ink-900/75 p-6 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur-md sm:p-7"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full border border-teal-400/50 font-mono text-[14px] text-teal-200">{c.letter}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fog-400">
          Chapter {index + 1} of 6 · {c.name}
        </span>
      </div>
      <h2 id={`ch-${c.letter}`} className="text-balance text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-paper">
        {c.title}
      </h2>
      <blockquote className="mt-4 border-l-2 border-teal-500/60 pl-4 text-[14.5px] leading-relaxed text-fog-200">
        “{c.quote}”
        <footer className="mt-1.5">
          <SourceRef section={c.quoteSection} />
        </footer>
      </blockquote>
      {c.facts.length ? (
        <ul className="mt-4 flex flex-col gap-1.5 text-[13px] leading-snug text-fog-300">
          {c.facts.map((f) => (
            <li key={f.text} className="flex gap-2">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-teal-400" />
              <span>
                {f.text} {f.derived ? <span className="text-fog-500">(calculated)</span> : null} {f.section ? <SourceRef section={f.section} /> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {c.links.map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[12.5px] font-medium text-teal-100 hover:bg-teal-500/20">
            {l.label} <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        ))}
        <button type="button" onClick={onNext} className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-fog-400 hover:text-fog-100">
          {last ? "Enter the platform" : "Next"} <ArrowDown aria-hidden className="size-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

/** Non-WebGL fallback: a labelled 2D beam-line illustration. */
function Fallback2D({ current }: { current: number }) {
  const stations = ["Photon", "Laser", "Beam", "Material", "Machine", "Product"];
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#05080d]">
      <svg viewBox="0 0 900 240" className="w-[min(92vw,900px)] opacity-90 md:translate-x-[18%]" role="img" aria-label="Beam line from photon to product">
        <line x1="40" y1="120" x2="860" y2="120" stroke="#ff3d7f" strokeWidth="3" strokeOpacity="0.7" />
        {stations.map((s, i) => {
          const x = 70 + i * 152;
          const on = current === i + 1;
          return (
            <g key={s}>
              <circle cx={x} cy={120} r={on ? 22 : 14} fill={on ? "#009590" : "#0e141e"} stroke={on ? "#59cec7" : "#3b4a5f"} strokeWidth="2" />
              <text x={x} y={170} textAnchor="middle" className={on ? "fill-teal-100 text-[15px] font-semibold" : "fill-fog-500 text-[13px]"}>
                {String.fromCharCode(65 + i)} · {s}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
