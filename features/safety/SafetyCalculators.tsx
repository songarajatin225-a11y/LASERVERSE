"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/controls";
import { CalculatorWorkbench } from "@/features/calculators/CalculatorWorkbench";

const TABS = [
  { id: "optical-density", label: "Eyewear optical density" },
  { id: "nohd", label: "Nominal ocular hazard distance" },
];

/** The two §24.2 calculators, one at a time, so the page stays readable on small screens. */
export function SafetyCalculators() {
  const [tab, setTab] = useState(TABS[0]!.id);
  return (
    <div className="flex flex-col gap-4">
      <Tabs label="Safety calculators" tabs={TABS} value={tab} onChange={setTab} className="self-start" />
      <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label} className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/60 p-4 sm:p-5">
        <CalculatorWorkbench key={tab} id={tab} />
      </div>
    </div>
  );
}
