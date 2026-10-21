"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/controls";
import { BeamCaustic } from "./BeamCaustic";
import { OpticsComponentExplorer, OpticalMaterialsExplorer, type Row } from "./OpticsExplorers";

const TABS = [
  { id: "beam", label: "Beam focusing" },
  { id: "components", label: "Optical components" },
  { id: "materials", label: "Optical materials" },
];

export function BeamOpticsTabs({ components, chain, materials, matrix }: { components: Row[]; chain: Row[]; materials: Row[]; matrix: Row[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("tab");
  const [tab, setTab] = useState(TABS.some((t) => t.id === initial) ? initial! : "beam");
  useEffect(() => {
    const p = params.get("tab");
    if (p && TABS.some((t) => t.id === p)) setTab(p);
  }, [params]);
  return (
    <div className="flex flex-col gap-5">
      <Tabs
        label="Beam and optics tools"
        tabs={TABS}
        value={tab}
        onChange={(id) => {
          setTab(id);
          router.replace(`/beam-optics?tab=${id}`, { scroll: false });
        }}
        className="self-start"
      />
      <div role="tabpanel">
        {tab === "beam" ? <BeamCaustic /> : null}
        {tab === "components" ? <OpticsComponentExplorer components={components} chain={chain} /> : null}
        {tab === "materials" ? <OpticalMaterialsExplorer matrix={matrix} details={materials} /> : null}
      </div>
    </div>
  );
}
