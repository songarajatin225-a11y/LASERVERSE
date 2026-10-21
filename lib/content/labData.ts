import "server-only";
import { getTable, tableRecords } from "./handbook";
import type { HandbookLine } from "@/features/physics-lab/PhotonExplorer";
import type { ArchBlock, CouplerRow } from "@/features/physics-lab/CavityExplorer";

/** Parse "193 nm (ArF)" / "10.6 µm (CO₂)" / "2 µm (2.05–2.1 µm)" → nm. */
export function parseWavelengthNm(text: string): number | null {
  const m = text.match(/([\d.]+)\s*(nm|µm)/);
  if (!m) return null;
  const v = Number(m[1]);
  return m[2] === "µm" ? v * 1000 : v;
}

export function photonLines(): HandbookLine[] {
  const t = getTable("1.6", 1, ["Wavelength", "Frequency", "Photon energy", "Photons/s per W", "What it can do"]);
  return tableRecords(t).flatMap((r) => {
    const nm = parseWavelengthNm(r["Wavelength"] ?? "");
    return nm ? [{ label: r["Wavelength"] ?? "", nm, note: r["What it can do directly"] ?? "" }] : [];
  });
}

export function archBlocks(): ArchBlock[] {
  const t = getTable("2.7", 1, ["Block", "Function", "Industrial examples", "Key engineering concerns"]);
  return tableRecords(t).map((r) => ({ block: r["Block"] ?? "", fn: r["Function"] ?? "", examples: r["Industrial examples"] ?? "", concerns: r["Key engineering concerns"] ?? "" }));
}

export function couplers(): CouplerRow[] {
  const t = getTable("2.4", 1, ["Laser", "Output-coupler reflectivity", "Reason"]);
  return tableRecords(t).map((r) => ({ laser: r["Laser"] ?? "", reflectivity: r["Output-coupler reflectivity (≈)"] ?? "", reason: r["Reason"] ?? "" }));
}

export function opticalComponents() {
  return tableRecords(getTable("5.1", 1, ["Component", "Function", "Typical materials", "Key specifications", "Where used"]));
}
export function opticalChain() {
  return tableRecords(getTable("11.1", 1, ["Subsystem", "Function", "Key specification", "Reference"]));
}
export function opticalMaterials() {
  return tableRecords(getTable("5.5", 1, ["Material", "Transmission range", "Index"]));
}
export function opticalMatrix() {
  return tableRecords(getTable("5.5", 2, ["Material", "193 nm", "248 nm"]));
}
