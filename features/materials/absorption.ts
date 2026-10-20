/** Classification of a wavelength against the encoded §9.3 bands (pure, tested). */
export interface Band {
  from: number;
  to: number;
  strength: "strong" | "stated" | "partial";
  label: string;
}
export interface NonMetalRow {
  material: string;
  absorbsText: string;
  transparentText: string;
  notes: string;
  absorbs: Band[];
  transparent: Band[];
  unencoded?: string;
}

export type Status = "strong" | "absorbs" | "mixed" | "partial" | "transparent" | "partly-transparent" | "unstated" | "text-only";
export const STATUS_LABEL: Record<Status, string> = {
  strong: "Absorbs strongly",
  absorbs: "Absorbs well",
  mixed: "Mixed statements",
  partial: "Partly absorbs",
  transparent: "Largely transparent",
  "partly-transparent": "Partly transparent",
  unstated: "Not stated for this λ",
  "text-only": "See handbook text",
};
export const STATUS_TONE: Record<Status, string> = {
  strong: "teal",
  absorbs: "teal",
  mixed: "warn",
  partial: "info",
  transparent: "fog",
  "partly-transparent": "fog",
  unstated: "fog",
  "text-only": "warn",
};

export function absorptionStatus(m: NonMetalRow, nm: number): { status: Status; band?: Band } {
  if (m.unencoded && !m.absorbs.length && !m.transparent.length) return { status: "text-only" };
  const inBand = (b: Band) => nm >= b.from && nm <= b.to;
  const a = m.absorbs.filter(inBand);
  const t = m.transparent.filter(inBand);
  const strong = a.find((b) => b.strength === "strong");
  if (strong) return { status: "strong", band: strong };
  const stated = a.find((b) => b.strength === "stated");
  const tStated = t.find((b) => b.strength !== "partial");
  // the handbook can state both for one material (e.g. melanin absorbs UV–NIR, yet tissue has a 700–900 nm window)
  if (stated && tStated) return { status: "mixed", band: stated };
  if (stated) return { status: "absorbs", band: stated };
  if (tStated) return { status: "transparent", band: tStated };
  if (a[0]) return { status: "partial", band: a[0] };
  if (t[0]) return { status: "partly-transparent", band: t[0] };
  return { status: "unstated" };
}

