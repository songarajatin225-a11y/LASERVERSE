import type { EmbedKind } from "@/content/lessons";
import { PhotonExplorer } from "@/features/physics-lab/PhotonExplorer";
import { WaveExplorer } from "@/features/physics-lab/WaveExplorer";
import { EnergyLevels } from "@/features/physics-lab/EnergyLevels";
import { CavityExplorer } from "@/features/physics-lab/CavityExplorer";
import { PulseExplorer } from "@/features/physics-lab/PulseExplorer";
import { BeamCaustic } from "@/features/beam-optics/BeamCaustic";
import { photonLines, archBlocks, couplers } from "@/lib/content/labData";
import { AbsorptionTab, ThermalTab, AblationTab, RegimeTab } from "@/features/materials/MaterialsLab";
import { materialsLabData } from "@/lib/content/materials";
import { OverlapSimulator } from "@/features/processes/OverlapSimulator";
import { WeldingTool } from "@/features/processes/ProcessTools";
import { weldingData } from "@/lib/content/processes";
import { DecisionTree } from "@/features/reference/DecisionTree";
import { decisionTreeData } from "@/lib/content/reference";

/** Server component: loads the handbook data a lab needs and renders it compactly inside a lesson. */
export function LessonEmbed({ kind, section }: { kind: EmbedKind; section?: string }) {
  switch (kind) {
    case "photon":
      return <PhotonExplorer lines={photonLines()} compact />;
    case "wave":
      return <WaveExplorer compact />;
    case "levels":
      return <EnergyLevels compact />;
    case "cavity":
      return <CavityExplorer blocks={archBlocks()} couplers={couplers()} compact />;
    case "pulse":
      return <PulseExplorer compact />;
    case "caustic":
      return <BeamCaustic compact />;
    case "material": {
      const data = materialsLabData();
      if (section === "9.4") return <ThermalTab data={data} />;
      if (section === "9.5") return <AblationTab data={data} />;
      return <AbsorptionTab data={data} initialNm={1064} />;
    }
    case "regime":
      return <RegimeTab data={materialsLabData()} />;
    case "marking":
      return <OverlapSimulator context="marking" compact />;
    case "welding":
      return <WeldingTool modes={weldingData().modes} compact />;
    case "decision-tree":
      return <DecisionTree data={decisionTreeData()} compact />;
    default:
      return null;
  }
}
