import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { HandbookTable } from "@/components/handbook/Blocks";
import { TroubleshootingExplorer } from "@/features/troubleshooting/TroubleshootingExplorer";
import { troubleshootingData, symptomTable, weldDefectTable } from "@/lib/content/troubleshooting";

export const metadata: Metadata = { title: "Troubleshooting" };
const ITEM = { id: "tool:troubleshooting", kind: "tool" as const, title: "Troubleshooting", href: "/troubleshooting" };

const FLOW: Array<{ label: string; source: "handbook" | "additional"; note: string }> = [
  { label: "Problem", source: "handbook", note: "Symptom / defect" },
  { label: "Causes", source: "handbook", note: "Possible / main causes" },
  { label: "Checks", source: "handbook", note: "Diagnostic (§27.2 only)" },
  { label: "Actions", source: "handbook", note: "Corrective action / countermeasures" },
  { label: "Verification", source: "additional", note: "Platform guidance" },
];

export default function TroubleshootingPage() {
  const d = troubleshootingData();
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Troubleshooting" }]} />
      <PageHeader
        eyebrow="Engineering"
        title="Troubleshooting"
        description={
          <div className="flex flex-col gap-2">
            <p>
              “{d.quotes.lead}” <SourceRef section="27.2" />
            </p>
            <p>
              Every card follows the same path from problem to verified fix. Problem, causes, checks and actions are the handbook’s own table cells; the handbook has
              no verification column, so that step is platform guidance and is labelled as such.
            </p>
          </div>
        }
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="additional" />
        <BookmarkButton item={ITEM} />
      </PageHeader>

      <ol aria-label="Troubleshooting flow" className="mb-6 flex flex-wrap items-stretch gap-1.5">
        {FLOW.map((f, i) => (
          <li key={f.label} className="flex items-center gap-1.5">
            <span className="flex flex-col rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/70 px-3 py-2">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-fog-100">
                {f.label} <ClassTag kind={f.source} short />
              </span>
              <span className="text-[11.5px] text-fog-500">{f.note}</span>
            </span>
            {i < FLOW.length - 1 ? <ChevronRight aria-hidden className="size-4 text-fog-500" /> : null}
          </li>
        ))}
      </ol>

      <TroubleshootingExplorer symptoms={d.symptoms} welds={d.welds} faults={d.faults} recipe={d.recipe} />

      <Callout kind="safety" title="Before opening a machine" className="mt-10">
        <p>
          “{d.quotes.neverBypassed}” <SourceRef section="11.6" />
        </p>
        <p className="mt-1">
          “{d.quotes.noBypassHandbook}” <SourceRef section="24.2" />
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <ClassTag kind="additional" short />
          <span>
            Platform guidance (not from the handbook): never bypass, override or defeat interlocks or other safety functions while diagnosing a fault. This page
            is a learning aid and does not replace the machine’s service documentation.
          </span>
        </p>
      </Callout>

      <details className="mt-8 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-850/60 px-4 py-3 text-[13px] text-fog-300">
        <summary className="cursor-pointer select-none py-1 hover:text-fog-100">Show the original handbook tables</summary>
        <HandbookTable t={symptomTable()} caption={<SourceRef section="27.2" note="troubleshooting table" />} compact />
        <HandbookTable t={weldDefectTable()} caption={<SourceRef section="10.4" note="weld defects: causes and countermeasures" />} compact />
      </details>
    </div>
  );
}
