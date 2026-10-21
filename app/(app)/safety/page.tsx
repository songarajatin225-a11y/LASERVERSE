import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookTable, HandbookFigure } from "@/components/handbook/Blocks";
import { HandbookChecklist } from "@/components/handbook/HandbookChecklist";
import { ClassSelector } from "@/features/safety/ClassSelector";
import { StandardsFilter } from "@/features/safety/StandardsFilter";
import { SafetyCalculators } from "@/features/safety/SafetyCalculators";
import { HazardCards, SafetyElements } from "@/features/safety/HazardCards";
import { CALCULATOR_INDEX } from "@/features/calculators/definitions";
import { reviewFlagsFor } from "@/content/review-flags";
import { safetyPageData, FEASIBILITY_LIST_ID, DOE_CALCULATORS } from "@/lib/content/safety";

export const metadata: Metadata = { title: "Safety & Quality" };
const ITEM = { id: "tool:safety", kind: "tool" as const, title: "Safety & Quality", href: "/safety" };

const TOC: Array<[string, string]> = [
  ["classes", "Laser classes"],
  ["hazards", "Hazards"],
  ["standards", "Standards"],
  ["safety-architecture", "Safety architecture"],
  ["od-nohd", "Eyewear OD & NOHD"],
  ["metrology", "Quality & metrology"],
  ["feasibility", "Feasibility study"],
  ["doe", "Parameters & DOE"],
  ["checklists", "Checklists"],
];

function PlatformNote({ children }: { children: ReactNode }) {
  return (
    <span className="block">
      <span className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-fog-400">
        <ClassTag kind="additional" short /> Platform guidance (not from the handbook)
      </span>
      {children}
    </span>
  );
}

export default function SafetyPage() {
  const d = safetyPageData();
  const q = d.quotes;
  const flags = reviewFlagsFor("24.1");
  const b7 = d.checklists.filter((c) => c.sectionId === "B.7");
  const b8 = d.checklists.filter((c) => c.sectionId === "B.8");
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Safety & Quality" }]} />
      <PageHeader
        eyebrow="Engineering"
        title="Safety & Quality"
        description={
          <div className="flex flex-col gap-2">
            <p>
              “{q.architecture}” <SourceRef section="11.6" />
            </p>
            <p>
              Laser classes, hazards, standards, the machine safety architecture, eyewear calculations, metrology, the feasibility and DOE templates and the
              handbook checklists — in one place. This is a learning aid: it does not certify machines or demonstrate regulatory compliance.
            </p>
          </div>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="derived" />
        <ClassTag kind="additional" />
        <BookmarkButton item={ITEM} />
      </PageHeader>

      <nav aria-label="On this page" className="mb-2">
        <ul className="flex flex-wrap gap-1.5">
          {TOC.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="inline-flex rounded-full border border-[var(--line-strong)] px-3 py-1 text-[12.5px] text-fog-300 hover:border-teal-400/60 hover:text-teal-100">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ------------------------------------------------------------ classes */}
      <section aria-labelledby="classes" className="mt-12">
        <SectionTitle id="classes" sub={<>“{q.classesIntro}” <SourceRef section="24.1" /></>}>
          Laser classes (IEC 60825-1)
        </SectionTitle>
        <ClassSelector classes={d.classes} aelNote={q.aelNote} />
      </section>

      {/* ------------------------------------------------------------ hazards */}
      <section aria-labelledby="hazards" className="mt-12">
        <SectionTitle id="hazards" sub={<>Hazard, mechanism and controls for each hazard listed in the handbook. <SourceRef section="24.2" /></>}>
          Hazards
        </SectionTitle>
        <HazardCards hazards={d.hazards} />
      </section>

      {/* ------------------------------------------------------------ standards */}
      <section aria-labelledby="standards" className="mt-12">
        <SectionTitle id="standards" sub={<>The standards the handbook lists, with their scope. <SourceRef section="24.3" /></>}>
          Relevant standards
        </SectionTitle>
        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <Callout kind="limitation" title="Listing a standard is not a compliance claim">
            <PlatformNote>
              A standard appears here because handbook §24.3 lists it. Its presence is not a statement that any machine, product or this website complies with
              it, and the current editions have not been verified here. Conformity of a real product is shown through the assessment that applies to it,
              carried out by competent people.
            </PlatformNote>
          </Callout>
          {flags.map((f) => (
            <Callout key={f.id} kind="review" title={f.title}>
              {f.detail}
            </Callout>
          ))}
        </div>
        <StandardsFilter rows={d.standards} />
      </section>

      {/* ------------------------------------------------------------ safety architecture */}
      <section aria-labelledby="safety-architecture" className="mt-12">
        <SectionTitle id="safety-architecture" sub={<>Elements of the machine safety architecture and their purpose. <SourceRef section="11.6" /></>}>
          Safety architecture
        </SectionTitle>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <HandbookFigure fig={d.figures.architecture} />
            <p className="text-[13.5px] leading-relaxed text-fog-300">
              “{q.neverBypassed}” <SourceRef section="11.6" />
            </p>
            <p className="mt-3">
              <Link href="/architecture#interlocks" className="inline-flex items-center gap-1 text-[13px] text-teal-300 hover:text-teal-200">
                Interlock logic in the machine architecture <ArrowUpRight aria-hidden className="size-3.5" />
              </Link>
            </p>
          </div>
          <div className="min-w-0 xl:mt-8">
            <SafetyElements elements={d.architecture} />
            <p className="mt-2 text-[12px] text-fog-500">
              Explorer links open the matching part of a generic, illustrative Class 1 workstation; it is not a validated safety design.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ OD / NOHD */}
      <section aria-labelledby="od-nohd" className="mt-12">
        <SectionTitle id="od-nohd" sub={<>“{q.calculated}” <SourceRef section="24.2" /></>}>
          Eyewear optical density and NOHD
        </SectionTitle>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <HandbookFigure fig={d.figures.odNohd} />
            <p className="text-[13px] leading-relaxed text-fog-300">
              “{q.variables}” <SourceRef section="24.2" />
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-3 lg:mt-6">
            <Callout kind="safety" title="Specified by a laser safety officer, not by this page">
              <PlatformNote>
                Laser eyewear and the nominal ocular hazard distance must be specified by a laser safety officer from the actual MPE values for the wavelength,
                exposure duration and pulse format, taken from the standard. The calculators below are teaching aids: they show how the equations behave, do not
                supply MPE values, and do not select or certify eyewear.
              </PlatformNote>
            </Callout>
            <Callout kind="note" title="Engineering controls first (§24.2)">
              “{q.noBypassHandbook}” <SourceRef section="24.2" />
            </Callout>
          </div>
        </div>
        <div className="mt-5">
          <SafetyCalculators />
        </div>
      </section>

      {/* ------------------------------------------------------------ metrology */}
      <section aria-labelledby="metrology" className="mt-12">
        <SectionTitle id="metrology" sub={<>Instruments, principles and practical notes per measured quantity. <SourceRef section="24.4" /></>}>
          Quality and metrology
        </SectionTitle>
        <HandbookTable t={d.metrology} caption={<SourceRef section="24.4" note="quality and metrology" />} compact />
        <Callout kind="note" title="Production practice (§24.4)">
          “{q.production}” <SourceRef section="24.4" />
        </Callout>
      </section>

      {/* ------------------------------------------------------------ feasibility */}
      <section aria-labelledby="feasibility" className="mt-12">
        <SectionTitle id="feasibility" sub={<>The handbook’s application feasibility study template, as a checklist you can tick off. <SourceRef section="23.5" /></>}>
          Application feasibility study
        </SectionTitle>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <HandbookChecklist listId={FEASIBILITY_LIST_ID} items={d.feasibility} title="Feasibility study record (§23.5)" />
          </div>
          <div className="flex min-w-0 flex-col gap-3 xl:mt-6">
            <Callout kind="assumption" title="How to use this list">
              <PlatformNote>
                Tick a section once your study records what the handbook asks for in it. Ticks are stored only in this browser. The list is a practice aid for
                structuring a study; it is not an approval, a sign-off or evidence of feasibility.
              </PlatformNote>
            </Callout>
            <a href="#doe" className="inline-flex items-center gap-1 self-start text-[13px] text-teal-300 hover:text-teal-200">
              Section 6 in depth: parameter development and DOE ↓
            </a>
            <details className="rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-850/60 px-4 py-2 text-[13px] text-fog-300">
              <summary className="cursor-pointer select-none py-1 hover:text-fog-100">Show the handbook’s feasibility flow diagram</summary>
              <HandbookFigure fig={d.figures.feasibility} />
            </details>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ DOE */}
      <section aria-labelledby="doe" className="mt-12">
        <SectionTitle id="doe" sub={<>Parameters, their primary effects, couplings and watch-outs. <SourceRef section="23.6" /></>}>
          Laser parameter development and DOE
        </SectionTitle>
        <HandbookTable t={d.doe.table} caption={<SourceRef section="23.6" note="parameter development" />} compact />
        <Callout kind="note" title="Work in derived quantities (§23.6)">
          <p>
            “{d.doe.derived}” <SourceRef section="23.6" />
          </p>
          <ul className="mt-2 flex flex-wrap gap-2 list-none! pl-0!">
            {DOE_CALCULATORS.map((c) => (
              <li key={c} className="mt-0!">
                <Link href={`/calculators/${c}`} className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-3 py-1 text-[12.5px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
                  {CALCULATOR_INDEX.get(c)?.title ?? c} <ArrowUpRight aria-hidden className="size-3" />
                </Link>
              </li>
            ))}
          </ul>
        </Callout>
        <h3 className="mb-3 mt-8 text-[16px] font-semibold text-paper">{d.doe.methodTitle}</h3>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {d.doe.method.map((m, i) => (
            <li key={i} className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4">
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border border-teal-500/40 bg-ink-900 font-mono text-[11px] text-teal-200">
                {i + 1}
              </span>
              <span className="text-[13.5px] leading-snug text-fog-200">{m}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2">
          <SourceRef section="23.6" note="DOE methodology" />
        </p>
        <Callout kind="note" title="Worked example (§23.6)" className="mt-4">
          “{d.doe.example}” <SourceRef section="23.6" />
        </Callout>
      </section>

      {/* ------------------------------------------------------------ checklists */}
      <section aria-labelledby="checklists" className="mt-12">
        <SectionTitle
          id="checklists"
          sub={<>The handbook’s safety, product-manager, application-engineer and proof-of-concept checklists. Progress is shared with the lesson pages and stored only in this browser.</>}
        >
          Checklists
        </SectionTitle>
        <div className="grid gap-x-5 lg:grid-cols-2">
          {[...b7, ...b8].map((c) => (
            <div key={c.listId} className="min-w-0">
              <h3 className="mt-4 flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold text-paper">
                {c.title} <SourceRef section={c.sectionId} />
              </h3>
              <HandbookChecklist listId={c.listId} items={c.items} />
            </div>
          ))}
        </div>
        <Callout kind="limitation" title="Practice aid, not certification">
          <PlatformNote>
            Ticking every item does not certify a machine, validate a safety function or replace the risk assessment, the applicable standards and the judgement
            of a competent laser safety officer.
          </PlatformNote>
        </Callout>
      </section>

      {/* ------------------------------------------------------------ footer disclaimer */}
      <footer className="mt-12">
        <Callout kind="safety" title="Scope of this page">
          <PlatformNote>
            LASERVERSE does not certify machines, classify laser products or demonstrate regulatory compliance. Never bypass, override or defeat interlocks or any
            other safety function — not for set-up, not for service, not for a test.
          </PlatformNote>
          <p className="mt-2">
            “{q.neverBypassed}” <SourceRef section="11.6" />
          </p>
          <p className="mt-1">
            “{q.noBypassHandbook}” <SourceRef section="24.2" />
          </p>
        </Callout>
      </footer>
    </div>
  );
}
