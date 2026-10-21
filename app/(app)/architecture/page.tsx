import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookTable, HandbookFigure } from "@/components/handbook/Blocks";
import { outline, partHrefByNumber, ROMAN } from "@/lib/content/outline";
import type { Figure } from "@/lib/content/schema";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { ControlStack } from "@/features/architecture/ControlStack";
import { OpticalChain } from "@/features/architecture/OpticalChain";
import { VisionLoop } from "@/features/architecture/VisionLoop";
import { HandshakeSequence } from "@/features/architecture/HandshakeSequence";
import { InterlockDemo } from "@/features/architecture/InterlockDemo";
import { Configurator } from "@/features/architecture/Configurator";
import {
  architectureQuotes,
  controlStack,
  opticalChain,
  subsystemTables,
  visionData,
  integrationTable,
  recipesTable,
  handshake,
  safetyArchitecture,
  configurator,
  costTable,
} from "@/lib/content/architecture";

export const metadata: Metadata = {
  title: "Architecture & Automation",
  description: "Control stack, optical chain, subsystems, vision-guided loop, handshake, interlocks and a reference-machine configurator built on handbook Parts XI–XII.",
};

const ITEM = { id: "tool:architecture", kind: "tool" as const, title: "Architecture & Automation", href: "/architecture" };

const TOC: Array<{ id: string; label: string; section: string }> = [
  { id: "control-stack", label: "Control stack", section: "§11.2" },
  { id: "optical-chain", label: "Optical chain", section: "§11.1" },
  { id: "mechanical", label: "Mechanical", section: "§11.3" },
  { id: "electrical", label: "Electrical", section: "§11.4" },
  { id: "software", label: "Software", section: "§11.5" },
  { id: "vision-loop", label: "Vision loop", section: "§12.1–12.2" },
  { id: "integration", label: "Integration", section: "§12.3" },
  { id: "handshake", label: "Handshake", section: "§12.4" },
  { id: "recipes", label: "Recipes & SPC", section: "§12.5" },
  { id: "interlocks", label: "Interlocks", section: "§11.6" },
  { id: "configurator", label: "Configurator", section: "§26.1 · §23.1" },
];

const RELATED_CALCULATORS = ["vision-resolution", "galvo-resolution", "cycle-time", "cost-per-part", "roi-payback"];

/** Citation of a Part's introduction (text before its first section). */
function PartRef({ n }: { n: number }) {
  const p = outline.parts.find((x) => x.kind === "part" && x.number === n);
  return (
    <Link
      href={partHrefByNumber(n)}
      className="inline-flex items-baseline gap-1 rounded text-[12.5px] text-teal-300 underline decoration-teal-300/30 underline-offset-[3px] hover:decoration-teal-300"
      title={p ? `${p.fullTitle}${p.page ? ` — handbook page ${p.page}` : ""}` : undefined}
    >
      <BookOpen aria-hidden className="size-3 translate-y-[1px] opacity-70" />
      <span>
        Part {ROMAN[n]} introduction{p?.page ? <span className="text-fog-500"> · p.{p.page}</span> : null}
      </span>
    </Link>
  );
}

function FigureDetails({ fig }: { fig: Figure }) {
  return (
    <details className="mt-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/60 px-4 py-2 text-[13px] text-fog-300">
      <summary className="cursor-pointer select-none py-1 hover:text-fog-100">Show the handbook figure: {fig.title}</summary>
      <HandbookFigure fig={fig} />
    </details>
  );
}

function TableDetails({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="mt-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/60 px-4 py-2 text-[13px] text-fog-300">
      <summary className="cursor-pointer select-none py-1 hover:text-fog-100">{summary}</summary>
      {children}
    </details>
  );
}

export default function ArchitecturePage() {
  const q = architectureQuotes();
  const stack = controlStack();
  const chain = opticalChain();
  const sub = subsystemTables();
  const vision = visionData();
  const hs = handshake();
  const safety = safetyArchitecture();
  const cfg = configurator();
  const machinePanels = Object.fromEntries(
    cfg.families.map((f) => [f.id, <HandbookTable key={f.id} t={cfg.machines[f.id]!} compact caption={<SourceRef section="26.1" note={f.machineTitle} />} />]),
  );

  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Architecture & Automation" }]} />
      <PageHeader
        eyebrow="Engineering"
        title="Architecture & Automation"
        description={
          <>
            <p>
              “{q.twoChains}” <PartRef n={11} />
            </p>
            <p className="mt-2 text-[14px] text-fog-400">
              Handbook Parts XI and XII as working tools: the control stack and its timescales, the machine’s subsystems, a conceptual vision-guided loop, the in-line handshake,
              interlock logic and a configurator that shows the handbook’s reference machine for an application family. Nothing here designs, certifies or sizes a machine.
            </p>
          </>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="derived" />
        <ClassTag kind="conceptual" />
        <ClassTag kind="additional" />
        <BookmarkButton item={ITEM} />
      </PageHeader>

      <nav aria-label="On this page" className="mb-10 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">On this page</div>
        <ol className="flex flex-wrap gap-1.5">
          {TOC.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-[var(--line-strong)] px-3 py-1 text-[12.5px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100"
              >
                {t.label}
                <span className="font-mono text-[10.5px] text-fog-500">{t.section}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ------------------------------------------------------------ control stack */}
      <SectionTitle id="control-stack" sub="Handbook §11.2 — who decides what, and how fast, from the factory MES down to laser gating.">
        Control stack
      </SectionTitle>
      <ControlStack layers={stack.layers} />
      <FigureDetails fig={stack.figure} />
      <TableDetails summary="Show the §11.2 table">
        <HandbookTable t={stack.table} compact caption={<SourceRef section="11.2" />} />
      </TableDetails>

      {/* ------------------------------------------------------------ optical chain */}
      <SectionTitle id="optical-chain" sub="Handbook §11.1 — the subsystems the beam passes through, with their key specifications.">
        Optical chain
      </SectionTitle>
      <OpticalChain stages={chain.stages} />
      <FigureDetails fig={chain.figure} />
      <TableDetails summary="Show the §11.1 table">
        <HandbookTable t={chain.table} compact caption={<SourceRef section="11.1" />} />
      </TableDetails>

      {/* ------------------------------------------------------------ subsystems */}
      <SectionTitle id="mechanical" sub="Handbook §11.3 — design goals, typical solutions and watch-outs.">
        Mechanical engineering
      </SectionTitle>
      <HandbookTable t={sub.mechanical} compact caption={<SourceRef section="11.3" />} />

      <SectionTitle id="electrical" sub="Handbook §11.4 — control, drive, sensor and panel elements.">
        Electrical engineering
      </SectionTitle>
      <HandbookTable t={sub.electrical} compact caption={<SourceRef section="11.4" />} />

      <SectionTitle id="software" sub="Handbook §11.5 — software modules of a production laser machine.">
        Software architecture
      </SectionTitle>
      <HandbookTable t={sub.software} compact caption={<SourceRef section="11.5" />} />

      {/* ------------------------------------------------------------ vision */}
      <SectionTitle
        id="vision-loop"
        sub={
          <>
            “{q.oneStation}” <PartRef n={12} />
          </>
        }
      >
        Vision-guided loop
      </SectionTitle>
      <VisionLoop loop={vision.loop} calibration={q.calibration} />
      <FigureDetails fig={vision.figure} />
      <h3 className="mb-1 mt-8 text-[15px] font-semibold text-paper">Vision system building blocks</h3>
      <HandbookTable t={vision.table} compact caption={<SourceRef section="12.1" />} />

      {/* ------------------------------------------------------------ integration */}
      <SectionTitle id="integration" sub="Handbook §12.3 — the laser's role alongside PLCs, robots, conveyors, MES and SCADA.">
        Integration with automation
      </SectionTitle>
      <HandbookTable t={integrationTable()} compact caption={<SourceRef section="12.3" />} />

      {/* ------------------------------------------------------------ handshake */}
      <SectionTitle id="handshake" sub="Handbook §12.4 — a typical in-line marking cycle, signal by signal.">
        Handshake
      </SectionTitle>
      <HandshakeSequence data={{ rows: hs.rows, lanes: hs.lanes }} />
      <FigureDetails fig={hs.figure} />

      {/* ------------------------------------------------------------ recipes */}
      <SectionTitle id="recipes" sub="Handbook §12.5 — recipes, interlocks, data logging, traceability and SPC.">
        Recipes, traceability and SPC
      </SectionTitle>
      <HandbookTable t={recipesTable()} compact caption={<SourceRef section="12.5" />} />

      {/* ------------------------------------------------------------ interlocks */}
      <SectionTitle id="interlocks" sub="Handbook §11.6 with §11.4 and §12.5 — how emission permission is built from interlocks.">
        Interlocks and safety architecture
      </SectionTitle>
      <Callout kind="safety" title="Safety functions are never bypassed" className="mb-5">
        <p>
          “{q.neverBypass}” <SourceRef section="11.6" />
        </p>
        <p className="mt-2">
          “{q.safetyDesign}” <SourceRef section="11.6" />
        </p>
        <p className="mt-2">
          <ClassTag kind="additional" short className="mr-1.5 align-middle" />
          The demo below is a teaching simplification, not a functional-safety design: it does not certify a machine, demonstrate compliance with any standard or replace a risk
          assessment. Safety-related electrical selection is covered in <SourceRef section="11.4" />.
        </p>
      </Callout>
      <InterlockDemo texts={safety.texts} />
      <h3 className="mb-1 mt-8 text-[15px] font-semibold text-paper">Safety architecture elements</h3>
      <HandbookTable t={safety.table} compact caption={<SourceRef section="11.6" />} />
      <FigureDetails fig={safety.figure} />
      <p className="mt-4 flex flex-wrap gap-2">
        <Link href="/machine?layer=safety" className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[13px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
          Safety layer in the Machine Explorer <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
        <Link href="/safety#safety-architecture" className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[13px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
          Safety & Quality: safety architecture <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </p>

      {/* ------------------------------------------------------------ configurator */}
      <SectionTitle id="configurator" sub="Conceptual — pick an application family to see the handbook's §26.1 reference machine and, where the handbook has one, its §23.1 cost structure.">
        Machine configurator
      </SectionTitle>
      <Configurator families={cfg.families} machinePanels={machinePanels} quotes={{ costShares: q.costShares, costCaveat: q.costCaveat, costPatterns: q.costPatterns, generic: q.generic }} />
      <TableDetails summary="Show the full §23.1 cost-structure table">
        <HandbookTable t={costTable()} compact caption={<SourceRef section="23.1" />} />
      </TableDetails>

      <SectionTitle id="tools">Related tools</SectionTitle>
      <ul className="flex flex-wrap gap-2">
        {RELATED_CALCULATORS.filter((c) => CALCULATOR_INDEX.has(c)).map((c) => (
          <li key={c}>
            <Link href={`/calculators/${c}`} className="inline-flex rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[13px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
              {CALCULATOR_INDEX.get(c)?.title ?? c}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/machine" className="inline-flex rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[13px] text-teal-100 hover:bg-teal-500/20">
            Machine Explorer →
          </Link>
        </li>
        <li>
          <Link href="/applications" className="inline-flex rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[13px] text-teal-100 hover:bg-teal-500/20">
            Applications →
          </Link>
        </li>
      </ul>
    </div>
  );
}
