import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Wordmark, TealLogo, TEAL_NAME } from "@/components/brand/Brand";
import { ButtonLink, Eyebrow, Badge } from "@/components/ui/primitives";
import { Footer } from "@/components/shell/Footer";
import { LandingNarrative, type ChapterData } from "@/features/landing/LandingNarrative";
import { NAV } from "@/lib/nav";
import { quote, extractionReport } from "@/lib/content/handbook";
import { getLevels, getRolePaths } from "@/lib/content/curriculum";
import { photonEnergyEv } from "@/lib/physics/photon";
import { CALCULATORS } from "@/features/calculators/definitions";

function chapters(): ChapterData[] {
  const ev = photonEnergyEv(1064e-9);
  return [
    {
      letter: "A",
      name: "Photon",
      title: "Light arrives in quanta.",
      quote: quote("1.5", "A photon is the quantum of the electromagnetic field"),
      quoteSection: "1.5",
      facts: [{ text: `A 1064 nm photon carries E = hc/λ ≈ ${ev.toFixed(2)} eV`, derived: true }],
      links: [{ label: "Photon explorer", href: "/physics-lab?tab=photon" }],
    },
    {
      letter: "B",
      name: "Laser",
      title: "A cavity turns gain into a laser.",
      quote: quote("2.4", "Light bouncing between the mirrors is amplified on every pass", 2).replace(/:$/, "."),
      quoteSection: "2.4",
      facts: [{ text: "Pump → gain medium → resonator → output coupler: the generic architecture", section: "2.7" }],
      links: [
        { label: "Cavity explorer", href: "/physics-lab?tab=cavity" },
        { label: "Source explorer", href: "/sources" },
      ],
    },
    {
      letter: "C",
      name: "Beam",
      title: "A beam is something you design.",
      quote: quote("4.1", "A TEM₀₀ laser beam has a Gaussian intensity profile"),
      quoteSection: "4.1",
      facts: [{ text: "Spot size, Rayleigh range and depth of focus follow from λ, M², f and D", section: "4.5" }],
      links: [
        { label: "Beam & Optics Lab", href: "/beam-optics" },
        { label: "Focus-spot calculator", href: "/calculators/focus-spot" },
      ],
    },
    {
      letter: "D",
      name: "Material",
      title: "Value is created where energy meets matter.",
      quote: quote("9.1", "At a surface, light is reflected, absorbed, transmitted or scattered"),
      quoteSection: "9.1",
      facts: [{ text: quote("front.executive-overview", "The same 1064 nm fiber laser"), section: "front.executive-overview" }],
      links: [{ label: "Material Interaction Lab", href: "/materials" }],
    },
    {
      letter: "E",
      name: "Machine",
      title: "A machine is a chain of subsystems.",
      quote: quote("front.executive-overview", "A laser is not a tool"),
      quoteSection: "front.executive-overview",
      facts: [
        { text: "Optical chain: source, isolator, expander, delivery, scanner, lens, head, workpiece", section: "11.1" },
        { text: "Controls, vision, automation and safety architecture", section: "11.6" },
      ],
      links: [
        { label: "3D Machine Explorer", href: "/machine" },
        { label: "Architecture & Automation", href: "/architecture" },
      ],
    },
    {
      letter: "F",
      name: "Product",
      title: "Read the tree upward from the product.",
      quote: quote("28.0", "Every application question resolves by walking this tree upward"),
      quoteSection: "28.0",
      facts: [{ text: "Case studies walk the chain from product to machine", section: "26.2" }],
      links: [
        { label: "Industrial Applications", href: "/applications" },
        { label: "Technology Map", href: "/reference/map" },
      ],
    },
  ];
}

export default function Landing() {
  const levels = getLevels();
  const roles = getRolePaths();
  const counts = extractionReport.counts;
  const stats: Array<[string, string | number]> = [
    ["Parts", counts["numbered parts"] ?? 0],
    ["Sections", counts["sections"] ?? 0],
    ["Tables", counts["tables"] ?? 0],
    ["Figures", counts["figures"] ?? 0],
    ["Calculators", CALCULATORS.length],
  ];
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 bg-gradient-to-b from-[#05080d]/90 to-transparent px-4 py-3 sm:px-8">
        <Link href="/" aria-label="LASERVERSE home" className="rounded-[var(--radius-md)] bg-[#05080d]/60 px-2 py-1 backdrop-blur">
          <Wordmark size="sm" />
        </Link>
        <nav aria-label="Quick entry" className="flex items-center gap-1.5 sm:gap-2">
          <a href="#enter" className="hidden rounded-[var(--radius-md)] px-3 py-2 text-[13px] text-fog-300 backdrop-blur hover:text-fog-100 sm:inline-flex">
            Skip intro
          </a>
          <ButtonLink href="/home" variant="primary" size="sm">
            <span className="sm:hidden">Enter</span>
            <span className="hidden sm:inline">Enter the Laboratory</span>
          </ButtonLink>
        </nav>
      </header>

      <main id="main">
        <LandingNarrative chapters={chapters()} />

        <section id="enter" className="relative scroll-mt-16 border-t border-[var(--line)] bg-ink-900 px-4 py-20 sm:px-8 lg:px-[6vw]">
          <div className="mx-auto max-w-7xl">
            <Eyebrow>Enter the platform</Eyebrow>
            <h2 className="mt-4 max-w-3xl text-balance text-[clamp(1.8rem,3.4vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-paper">
              Fifteen working areas, one handbook underneath.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fog-300">
              Every lab, calculator and explorer is built from <em>The Complete Laser Handbook</em> and labels what is taken from the handbook, what is calculated, and what is
              a conceptual visualization.
            </p>
            <div className="mt-10 flex flex-col gap-10">
              {NAV.map((g) => (
                <div key={g.label}>
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-fog-500">{g.label}</h3>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((it) => {
                      const Icon = it.icon;
                      return (
                        <li key={it.id}>
                          <Link
                            href={it.href}
                            className="group flex h-full items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4 transition-colors hover:border-teal-500/40 hover:bg-ink-800"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-teal-500/10 text-teal-300">
                              <Icon aria-hidden className="size-[18px]" />
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1 text-[14.5px] font-semibold text-fog-100">
                                {it.label}
                                <ArrowUpRight aria-hidden className="size-3.5 text-fog-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-teal-300" />
                              </span>
                              <span className="mt-0.5 block text-[13px] leading-snug text-fog-400">{it.description}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--line)] px-4 py-20 sm:px-8 lg:px-[6vw]" aria-labelledby="levels-title">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <Eyebrow>Learning academy</Eyebrow>
              <h2 id="levels-title" className="mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-paper">
                Six levels, from first principles to expert.
              </h2>
              <ol className="mt-8 flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {levels.map((l) => (
                  <li key={l.id}>
                    <Link href={`/learn#level-${l.id}`} className="group flex items-baseline gap-4 py-3.5">
                      <span className="w-8 shrink-0 font-mono text-[13px] text-teal-300">{l.id}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-fog-100 group-hover:text-paper">{l.name}</span>
                        <span className="block text-[13px] leading-snug text-fog-400">{l.focus}</span>
                      </span>
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-fog-600 group-hover:text-teal-300" />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <Eyebrow>Role paths</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-paper">Start where your work starts.</h2>
              <ul className="mt-8 flex flex-wrap gap-2">
                {roles.map((r) => (
                  <li key={r.id}>
                    <Link href={`/learn#role-${r.id}`} className="inline-flex rounded-full border border-[var(--line-strong)] px-3.5 py-2 text-[13.5px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
                      {r.reader}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-12 rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-800/60 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-fog-100">Built on The Complete Laser Handbook</h3>
                  <Badge tone="teal">Extracted content</Badge>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-5">
                  {stats.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-fog-500">{k}</dt>
                      <dd className="tabular mt-1 font-mono text-[22px] text-paper">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-[12.5px] leading-relaxed text-fog-400">
                  Counts come from the ingestion report. Items flagged during extraction are marked for review rather than silently corrected —{" "}
                  <Link href="/reference/status" className="text-teal-300 underline underline-offset-2">
                    see content &amp; validation status
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--line)] px-4 py-16 sm:px-8 lg:px-[6vw]" aria-label="About">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fog-500">A laser knowledge platform by</p>
              <p className="mt-2 text-[15px] leading-relaxed text-fog-300">
                {TEAL_NAME}. LASERVERSE is an educational and engineering-reference platform; it does not certify machines or demonstrate regulatory compliance.
              </p>
            </div>
            <TealLogo height={36} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
