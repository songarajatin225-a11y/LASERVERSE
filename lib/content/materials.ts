import "server-only";
import { getTable, tableRecords, quote } from "./handbook";
import { wavelengthMap } from "./sources";
import type { MaterialsData } from "@/features/materials/MaterialsLab";

export type { Band, NonMetalRow as NonMetal } from "@/features/materials/absorption";
import type { Band, NonMetalRow as NonMetal } from "@/features/materials/absorption";

const CO2: Band = { from: 9200, to: 10700, strength: "stated", label: "CO₂ 9.3–10.6 µm" };

/**
 * DERIVED interpretation of §9.3 "Absorbs well at" / "Largely transparent at" wording as
 * wavelength intervals. Keyed by the exact handbook text so a re-ingested handbook with
 * different wording fails the content test instead of silently mismatching.
 * Region words follow §1.10: UV < 380 nm, visible 380–780 nm, NIR 0.78–1.4 µm.
 */
export const ABSORPTION_ENCODING: Record<string, { absorbs: string; transparent: string; a: Band[]; t: Band[]; unencoded?: string }> = {
  "Most polymers (PE, PP, PC, PA, PMMA, PET)": {
    absorbs: "10.6 / 9.3 µm; UV (≤ 355 nm); 2 µm in clear polymers",
    transparent: "0.4–1.1 µm unless pigmented or additive-doped",
    a: [CO2, { from: 100, to: 355, strength: "stated", label: "UV ≤ 355 nm" }, { from: 1900, to: 2100, strength: "partial", label: "~2 µm (clear polymers)" }],
    t: [{ from: 400, to: 1100, strength: "stated", label: "0.4–1.1 µm unless pigmented or doped" }],
  },
  "Polyimide (Kapton, FPC base)": {
    absorbs: "UV (355, 308, 248 nm); 9.3/10.6 µm",
    transparent: "NIR",
    a: [{ from: 240, to: 360, strength: "stated", label: "UV 248–355 nm" }, CO2],
    t: [{ from: 780, to: 1400, strength: "stated", label: "NIR" }],
  },
  "Glass (soda-lime, borosilicate, fused silica)": {
    absorbs: "> ~5 µm (CO₂); < ~200–300 nm",
    transparent: "Visible–NIR",
    a: [{ from: 5000, to: 20000, strength: "stated", label: "> ~5 µm" }, { from: 100, to: 250, strength: "stated", label: "< ~200–300 nm" }],
    t: [{ from: 380, to: 1400, strength: "stated", label: "Visible–NIR" }],
  },
  Sapphire: {
    absorbs: "< ~150 nm (linear)",
    transparent: "Visible–5 µm",
    a: [{ from: 100, to: 150, strength: "stated", label: "< ~150 nm (linear)" }],
    t: [{ from: 380, to: 5000, strength: "stated", label: "Visible–5 µm" }],
  },
  "Ceramics (Al₂O₃, AlN, ZrO₂)": {
    absorbs: "10.6 µm strongly; UV; partly 1 µm",
    transparent: "—",
    a: [{ from: 10500, to: 10700, strength: "strong", label: "10.6 µm strongly" }, { from: 100, to: 380, strength: "stated", label: "UV" }, { from: 1000, to: 1100, strength: "partial", label: "partly 1 µm" }],
    t: [],
  },
  Silicon: {
    absorbs: "< 1.1 µm (strong at 355–532 nm)",
    transparent: "1.2–7 µm",
    a: [{ from: 355, to: 532, strength: "strong", label: "strong 355–532 nm" }, { from: 100, to: 1100, strength: "stated", label: "< 1.1 µm" }],
    t: [{ from: 1200, to: 7000, strength: "stated", label: "1.2–7 µm" }],
  },
  "SiC, GaN": {
    absorbs: "UV (above band gap: < ~380 / 365 nm)",
    transparent: "Visible–NIR",
    a: [{ from: 100, to: 380, strength: "stated", label: "< ~380 nm (SiC) / 365 nm (GaN)" }],
    t: [{ from: 380, to: 1400, strength: "stated", label: "Visible–NIR" }],
  },
  "GaAs, InP": {
    absorbs: "< ~870 / 920 nm",
    transparent: "NIR beyond band gap",
    a: [{ from: 100, to: 870, strength: "stated", label: "< ~870 nm (GaAs) / 920 nm (InP)" }],
    t: [{ from: 920, to: 1400, strength: "stated", label: "NIR beyond band gap" }],
  },
  "FR-4 (glass–epoxy)": {
    absorbs: "9.3/10.6 µm, UV",
    transparent: "Glass fibers transparent at 1 µm",
    a: [CO2, { from: 100, to: 380, strength: "stated", label: "UV" }],
    t: [{ from: 1000, to: 1100, strength: "partial", label: "glass fibers at 1 µm" }],
  },
  "Solder mask (PCB)": {
    absorbs: "9.3 µm very strongly; 10.6 µm; UV",
    transparent: "—",
    a: [{ from: 9200, to: 9400, strength: "strong", label: "9.3 µm very strongly" }, { from: 10500, to: 10700, strength: "stated", label: "10.6 µm" }, { from: 100, to: 380, strength: "stated", label: "UV" }],
    t: [],
  },
  "Battery materials": {
    absorbs: "Cu and Al foils (see metals); NMC/LFP/graphite coatings absorb IR well; PE/PP separators transparent in NIR",
    transparent: "—",
    a: [],
    t: [],
    unencoded: "Coatings “absorb IR well” and separators are “transparent in NIR”; the foils follow the metals row — see §9.2 and §15.4.",
  },
  "Biological tissue": {
    absorbs: "Water: 2.94 µm, 1.94 µm, 10.6 µm; haemoglobin: 400–600 nm; melanin: UV–NIR",
    transparent: "~700–900 nm “optical window”",
    a: [
      { from: 2900, to: 2980, strength: "stated", label: "water 2.94 µm" },
      { from: 1900, to: 1980, strength: "stated", label: "water 1.94 µm" },
      { from: 10500, to: 10700, strength: "stated", label: "water 10.6 µm" },
      { from: 400, to: 600, strength: "stated", label: "haemoglobin 400–600 nm" },
      { from: 100, to: 1400, strength: "stated", label: "melanin UV–NIR" },
    ],
    t: [{ from: 700, to: 900, strength: "stated", label: "~700–900 nm optical window" }],
  },
};

export function nonMetals(): NonMetal[] {
  const t = getTable("9.3", 1, ["Material", "Absorbs well at", "Largely transparent at", "Interaction notes"]);
  return tableRecords(t).map((r) => {
    const material = r["Material"] ?? "";
    const enc = ABSORPTION_ENCODING[material];
    const absorbsText = r["Absorbs well at"] ?? "";
    const transparentText = r["Largely transparent at"] ?? "";
    const matches = enc && enc.absorbs === absorbsText && enc.transparent === transparentText;
    return {
      material,
      absorbsText,
      transparentText,
      notes: r["Interaction notes"] ?? "",
      absorbs: matches ? enc.a : [],
      transparent: matches ? enc.t : [],
      unencoded: matches ? enc.unencoded : "Handbook wording changed since the ranges were encoded — showing text only.",
    };
  });
}

export function metals() {
  return tableRecords(getTable("9.2", 1, ["Metal", "Behaviour under laser", "Preferred approaches"]));
}

/** Cold absorptance of Cu and Al by source (§15.4) — the only tabulated metal absorptance values in the handbook. */
export function coldAbsorptance() {
  const t = getTable("15.4", 1, ["Criterion", "IR fiber CW (1070 nm)", "Green (515/532 nm)", "Blue diode (~450 nm)", "IR QCW / pulsed", "UV (355 nm)", "Ultrafast (ps/fs)"]);
  const rows = tableRecords(t);
  const cols: Array<{ header: string; nm: number | null }> = [
    { header: "UV (355 nm)", nm: 355 },
    { header: "Blue diode (~450 nm)", nm: 450 },
    { header: "Green (515/532 nm)", nm: 523 },
    { header: "IR fiber CW (1070 nm)", nm: 1070 },
  ];
  const pick = (name: string) => {
    const r = rows.find((x) => x["Criterion"] === name);
    if (!r) throw new Error(`§15.4: row "${name}" not found`);
    return cols.map((c) => ({ source: c.header, nm: c.nm!, text: r[c.header] ?? "" }));
  };
  return { copper: pick("Cu absorption (cold)"), aluminium: pick("Al absorption (cold)") };
}

export function diffusivity() {
  const t = getTable("9.4", 1, ["Material", "κ", "10 ps", "10 ns", "100 ns", "1 ms"]);
  return tableRecords(t).map((r) => ({
    material: r["Material"] ?? "",
    kappaMm2s: Number((r["κ (mm²/s, ≈)"] ?? "").replace(/[^\d.]/g, "")),
    table: [
      { tau: 10e-12, text: r["10 ps"] ?? "" },
      { tau: 10e-9, text: r["10 ns"] ?? "" },
      { tau: 100e-9, text: r["100 ns"] ?? "" },
      { tau: 1e-3, text: r["1 ms"] ?? "" },
    ],
  }));
}

export function meltBoil() {
  const t = getTable("9.4", 2, ["Material", "Melting point", "Boiling point", "Note"]);
  const num = (s: string) => {
    const m = s.match(/[\d.]+/g);
    if (!m) return null;
    const v = m.map(Number);
    return { lo: Math.min(...v), hi: Math.max(...v) };
  };
  return tableRecords(t).map((r) => ({
    material: r["Material"] ?? "",
    meltText: r["Melting point (°C, ≈)"] ?? "",
    boilText: r["Boiling point (°C, ≈)"] ?? "",
    note: r["Note"] ?? "",
    melt: num(r["Melting point (°C, ≈)"] ?? ""),
    boil: num(r["Boiling point (°C, ≈)"] ?? ""),
  }));
}

export function ablationRegimes() {
  return tableRecords(getTable("9.5", 1, ["Regime", "Pulse / λ", "Mechanism", "Result"]));
}

export function timeRegimes() {
  return tableRecords(getTable("27.1", 4, ["Regime", "Thermal diffusion length in steel", "Interaction", "Typical processes"]));
}

export function weldModes() {
  return tableRecords(getTable("10.4", 1, ["Mode", "Intensity", "Physics", "Aspect ratio", "Typical use"]));
}

export function materialQuotes() {
  return {
    fates: quote("9.1", "At a surface, light is reflected, absorbed, transmitted or scattered"),
    skin: quote("9.2", "Metals absorb in a 10–20 nm skin layer", 2),
    raise: quote("9.2", "Three effects raise effective absorption above the chart during processing"),
    diffusion: quote("9.4", "For pulses longer than ~10 ps, absorbed energy becomes heat almost instantly").replace(/:$/, "."),
    twoTemp: quote("9.4", "For ps and fs pulses in metals"),
    sequence: quote("9.4", "Sequence as intensity rises"),
    ablationLog: quote("9.5", "Ablation depth per pulse grows logarithmically with fluence above a threshold"),
    accumulation: quote("9.5", "Heat accumulation"),
    plasma: quote("9.6", "Above the vaporisation threshold, the vapour plume ionises", 2),
    regimeMap: quote("9.7", "The map is the most compact summary of laser processing", 2),
  };
}

export function absorptionLines() {
  return wavelengthMap().filter((l) => l.nm !== null);
}

export function materialsLabData(): MaterialsData {
  return {
    nonMetals: nonMetals(),
    metals: metals(),
    cold: coldAbsorptance(),
    lines: absorptionLines(),
    diffusivity: diffusivity(),
    meltBoil: meltBoil(),
    ablation: ablationRegimes(),
    regimes: timeRegimes(),
    weldModes: weldModes(),
    quotes: materialQuotes(),
  };
}
