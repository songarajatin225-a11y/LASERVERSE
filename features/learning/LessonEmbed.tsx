import type { EmbedKind } from "@/content/lessons";
import { PhotonExplorer } from "@/features/physics-lab/PhotonExplorer";
import { WaveExplorer } from "@/features/physics-lab/WaveExplorer";
import { EnergyLevels } from "@/features/physics-lab/EnergyLevels";
import { CavityExplorer } from "@/features/physics-lab/CavityExplorer";
import { PulseExplorer } from "@/features/physics-lab/PulseExplorer";
import { BeamCaustic } from "@/features/beam-optics/BeamCaustic";
import { photonLines, archBlocks, couplers } from "@/lib/content/labData";

/** Server component: loads the handbook data a lab needs and renders it compactly inside a lesson. */
export function LessonEmbed({ kind }: { kind: EmbedKind }) {
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
    default:
      return null;
  }
}
