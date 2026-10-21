"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/controls";
import { PhotonExplorer, type HandbookLine } from "./PhotonExplorer";
import { WaveExplorer } from "./WaveExplorer";
import { EnergyLevels } from "./EnergyLevels";
import { CavityExplorer, type ArchBlock, type CouplerRow } from "./CavityExplorer";
import { PulseExplorer } from "./PulseExplorer";

const TABS = [
  { id: "photon", label: "Photon" },
  { id: "wave", label: "Waves & polarisation" },
  { id: "levels", label: "Energy levels" },
  { id: "cavity", label: "Laser cavity" },
  { id: "pulse", label: "Pulses" },
];

export function PhysicsLabTabs({ lines, blocks, couplers }: { lines: HandbookLine[]; blocks: ArchBlock[]; couplers: CouplerRow[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("tab");
  const [tab, setTab] = useState(TABS.some((t) => t.id === initial) ? initial! : "photon");
  useEffect(() => {
    const p = params.get("tab");
    if (p && TABS.some((t) => t.id === p)) setTab(p);
  }, [params]);
  const change = (id: string) => {
    setTab(id);
    router.replace(`/physics-lab?tab=${id}`, { scroll: false });
  };
  return (
    <div className="flex flex-col gap-5">
      <Tabs label="Physics lab tools" tabs={TABS} value={tab} onChange={change} className="self-start" />
      <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {tab === "photon" ? <PhotonExplorer lines={lines} /> : null}
        {tab === "wave" ? <WaveExplorer /> : null}
        {tab === "levels" ? <EnergyLevels /> : null}
        {tab === "cavity" ? <CavityExplorer blocks={blocks} couplers={couplers} /> : null}
        {tab === "pulse" ? <PulseExplorer /> : null}
      </div>
    </div>
  );
}
