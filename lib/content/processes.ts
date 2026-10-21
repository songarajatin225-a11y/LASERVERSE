import "server-only";
import { getTable, tableRecords, quote, getSection } from "./handbook";
import type { TableBlock } from "./schema";

export type ProcessId = "marking" | "welding" | "cutting" | "cleaning" | "drilling" | "uv-co2";

export interface ProcessDef {
  id: ProcessId;
  title: string;
  short: string;
  sections: string[];
  /** first-paragraph quotations (verbatim) */
  intro: Array<{ text: string; section: string }>;
  tables: Array<{ section: string; index: number; title: string }>;
  calculators: string[];
  /** reference machine numbers in §26.1 */
  machines: string[];
}

export const PROCESS_DEFS: ProcessDef[] = [
  {
    id: "marking",
    title: "Laser marking",
    short: "Mechanisms, the material × wavelength decision matrix and a pulse-overlap simulator.",
    sections: ["10.2"],
    intro: [{ text: "Laser marking creates a permanent, contact-free, ink-free identifier", section: "10.2" }],
    tables: [
      { section: "10.2", index: 1, title: "Marking mechanisms" },
      { section: "10.2", index: 2, title: "Laser technology comparison for marking" },
      { section: "10.2", index: 4, title: "Identifiers and traceability" },
    ],
    calculators: ["pulse-overlap", "fluence", "hatch-time", "galvo-resolution"],
    machines: ["1. Fiber laser marking machine", "2. CO₂ PCB marking machine", "3. UV marking machine"],
  },
  {
    id: "welding",
    title: "Laser welding",
    short: "Conduction vs keyhole, heat input per length, defects and countermeasures.",
    sections: ["10.4"],
    intro: [{ text: "Laser welding melts the joint interface with a concentrated beam", section: "10.4" }],
    tables: [
      { section: "10.4", index: 2, title: "Weld defects: causes and countermeasures" },
      { section: "10.4", index: 3, title: "Laser sources for welding" },
      { section: "10.4", index: 4, title: "Applications" },
    ],
    calculators: ["cw-intensity", "energy-per-length", "fiber-imaging"],
    machines: ["4. Laser welding machine", "6. Battery module welding machine"],
  },
  {
    id: "cutting",
    title: "Laser cutting",
    short: "Cutting mechanisms, assist gas, parameters and the technology comparison matrix.",
    sections: ["10.3"],
    intro: [{ text: "Laser cutting melts or vaporises a narrow kerf", section: "10.3" }],
    tables: [
      { section: "10.3", index: 2, title: "Cutting parameters" },
      { section: "10.3", index: 4, title: "Applications" },
    ],
    calculators: ["cw-intensity", "energy-per-length", "fiber-imaging", "focus-spot"],
    machines: ["8. Laser cutting machine"],
  },
  {
    id: "cleaning",
    title: "Laser cleaning",
    short: "Self-limiting removal between two thresholds, with spot and hatch overlap.",
    sections: ["10.9"],
    intro: [{ text: "Laser cleaning removes a surface layer whose ablation threshold is lower than the substrate", section: "10.9" }],
    tables: [{ section: "10.9", index: 1, title: "Cleaning targets" }],
    calculators: ["fluence", "pulse-overlap", "ablation-depth"],
    machines: ["7. Laser cleaning machine"],
  },
  {
    id: "drilling",
    title: "Drilling and micromachining",
    short: "Single-pulse, percussion, trepanning, helical and selective-etch drilling; µm-scale removal.",
    sections: ["10.7", "10.8"],
    intro: [
      { text: "Applications: turbine-blade and combustor cooling holes", section: "10.7" },
      { text: "Micromachining removes µm-scale volumes with controlled depth", section: "10.8" },
    ],
    tables: [],
    calculators: ["ablation-depth", "fluence", "pulse-parameters"],
    machines: ["10. Ultrafast laser micromachining machine"],
  },
  {
    id: "uv-co2",
    title: "Wavelength choice: UV and CO₂",
    short: "Why 355 nm gives fine, low-heat features and why 9–11 µm suits non-metals.",
    sections: ["10.13", "10.14"],
    intro: [
      { text: "The CO₂ laser is the industrial workhorse for non-metals", section: "10.13" },
      { text: "Industrial UV lasers at 343–355 nm are infrared lasers", section: "10.14" },
    ],
    tables: [
      { section: "10.13", index: 1, title: "CO₂ bands and branches" },
      { section: "10.13", index: 2, title: "CO₂ excitation and architecture" },
      { section: "10.13", index: 3, title: "CO₂ applications" },
      { section: "10.14", index: 1, title: "UV applications by sector" },
    ],
    calculators: ["photon-energy", "focus-spot"],
    machines: ["2. CO₂ PCB marking machine", "3. UV marking machine"],
  },
];

export function processDef(id: string) {
  return PROCESS_DEFS.find((p) => p.id === id);
}

export function processIntro(def: ProcessDef) {
  return def.intro.map((q) => ({ text: quote(q.section, q.text, 2), section: q.section }));
}

export function processTables(def: ProcessDef): Array<{ title: string; section: string; table: TableBlock }> {
  return def.tables.map((t) => ({ title: t.title, section: t.section, table: getTable(t.section, t.index) }));
}

export function taxonomy() {
  return tableRecords(getTable("10.1", 1, ["Family", "Process", "Mechanism", "Typical lasers", "Key quality metrics"]));
}

export function selectionMatrix(): TableBlock {
  return getTable("B.6", 1, ["Material", "Marking", "Cutting", "Welding / joining", "Drilling", "Cleaning", "Micromachining"]);
}

/** §26.1 reference machine tables, each paired with the subheading that precedes it in the handbook. */
export function referenceMachines(): Array<{ title: string; table: TableBlock }> {
  const section = getSection("26.1");
  if (!section) throw new Error("§26.1 not found");
  const out: Array<{ title: string; table: TableBlock }> = [];
  let heading: string | null = null;
  for (const b of section.blocks) {
    if (b.type === "subheading") heading = b.text;
    if (b.type === "table") {
      if (!heading || !/^\d+\.\s/.test(heading)) throw new Error(`§26.1: table ${b.id} has no numbered machine heading`);
      out.push({ title: heading, table: b });
      heading = null;
    }
  }
  if (out.length < 9) throw new Error(`§26.1: expected at least 9 machine tables, found ${out.length}`);
  return out;
}

/* ------------------------------------------------------------------ per-process tool data */
export function markingData() {
  return {
    mechanisms: tableRecords(getTable("10.2", 1, ["Mechanism", "What happens", "Typical materials", "Typical laser", "Result"])),
    matrix: tableRecords(getTable("10.2", 3, ["Material", "Wavelength", "Laser type", "Marking method", "Result"])),
    quality: quote("10.2", "Marking quality depends on eight parameters", 2),
  };
}

export function weldingData() {
  return {
    modes: tableRecords(getTable("10.4", 1, ["Mode", "Intensity", "Physics", "Aspect ratio", "Typical use"])),
    defects: tableRecords(getTable("10.4", 2, ["Defect", "Main causes", "Countermeasures"])),
    penetration: quote("10.4", "Penetration depth grows with power and falls with speed", 2),
    steelAbs: "Good absorption at 1 µm (~35%)",
    keyhole: quote("9.2", "Three effects raise effective absorption above the chart during processing", 2),
  };
}

export function cuttingData() {
  return {
    mechanisms: tableRecords(getTable("10.3", 1, ["Mechanism", "How material leaves the kerf", "Gas", "Materials", "Edge result"])),
    comparison: getTable("10.3", 3, ["Criterion", "CW fiber", "CO₂", "UV ns", "Ultrashort"]),
    front: quote("10.3", "Physics of the cut front", 4),
    iso: quote("10.3", "Cut quality is specified by ISO 9013"),
  };
}

export function cleaningData() {
  return {
    targets: tableRecords(getTable("10.9", 1, ["Target", "Mechanism", "Typical laser", "Notes"])),
    window: quote("10.9", "Fluence must exceed the contaminant threshold", 4),
  };
}

export function drillingData() {
  return {
    methods: tableRecords(getTable("10.7", 1, ["Method", "Principle", "Hole diameter", "Aspect ratio", "Quality", "Typical lasers"])),
  };
}

export function wavelengthData() {
  return {
    uvCold: quote("10.14", "“Cold” processing, stated precisely", 4),
    co2Optics: quote("10.13", "Beam delivery and optics", 4),
    uvSpec: quote("10.14", "Typical specification (≈)"),
    ultrafast: quote("10.15", "Select ultrafast only when quality requirements cannot be met with ns UV/green", 2),
  };
}

/** Bond energies stated in the §1.6 reference-energies paragraph. */
export function bondEnergies(): Array<{ name: string; ev: number }> {
  const text = quote("1.6", "Reference energies (≈)", 2);
  const part = text.slice(text.indexOf("Bond energies:"));
  const out = [...part.matchAll(/([A-Z][a-z]?[–=][A-Z][a-z]?) (\d+(?:\.\d+)?) eV/g)].map((m) => ({ name: m[1]!, ev: Number(m[2]) }));
  if (out.length < 5) throw new Error("§1.6: bond energies not found");
  return out;
}
