"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/controls";
import { CalculatorWorkbench } from "@/features/calculators/CalculatorWorkbench";

/** Short tab labels so both fit at 375 px; the embedded workbench shows the full title as its heading. */
const TABS = [
  { id: "optical-density", label: "Eyewear OD" },
  { id: "nohd", label: "NOHD (hazard distance)" },
];
const PANEL_LABEL: Record<string, string> = {
  "optical-density": "Eyewear optical density calculator",
  nohd: "Nominal ocular hazard distance calculator",
};

/**
 * The two §24.2 calculators, one at a time, so the page stays readable on small screens.
 * `embedded` makes each workbench render an h2 (the page keeps its single h1) and keeps it
 * out of recent activity and bookmarks, which belong to /safety itself.
 */
export function SafetyCalculators() {
  const [tab, setTab] = useState(TABS[0]!.id);
  return (
    <div className="flex flex-col gap-4">
      <Tabs label="Safety calculators" tabs={TABS} value={tab} onChange={setTab} className="self-start" />
      <div role="tabpanel" aria-label={PANEL_LABEL[tab]} className="min-w-0 rounded-[var(--radius-xl)] border border-[var(--line)] bg-ink-850/60 p-4 sm:p-5">
        <CalculatorWorkbench key={tab} id={tab} embedded />
      </div>
    </div>
  );
}
