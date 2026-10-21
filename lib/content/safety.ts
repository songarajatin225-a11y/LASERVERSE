import "server-only";
import { getSection, getTable, tableRecords, quote, getFigure } from "./handbook";
import { spansText, type TableBlock, type Figure } from "./schema";
import type { LaserClass, Hazard, StandardGroup, StandardRow, SafetyElement, ChecklistItem } from "@/features/safety/types";

export type { LaserClass, Hazard, StandardGroup, StandardRow, SafetyElement, ChecklistItem };
export { STANDARD_GROUP_LABEL } from "@/features/safety/types";

/**
 * Adapters for the Safety & Quality page (/safety). Every handbook string handed to
 * the UI comes from getTable / tableRecords / quote / getSection, so a drift in a
 * re-ingested handbook fails tests/unit/safety.test.ts instead of rendering stale text.
 */

const req = (r: Record<string, string>, key: string): string => {
  const v = r[key];
  if (v === undefined) throw new Error(`safety: column "${key}" missing (have ${Object.keys(r).join(", ")})`);
  return v;
};

/* ------------------------------------------------------------------ §24.1 laser classes */
const UNIT_W: Record<string, number> = { µW: 1e-6, mW: 1e-3, W: 1, kW: 1e3 };

/** Parse "≤ 1 mW" / "> 500 mW" into an operator and a power in watts. */
export function parseAel(cell: string): LaserClass["aelLimit"] {
  const m = /^\s*(≤|>)\s*(\d+(?:\.\d+)?)\s*(µW|mW|kW|W)\s*$/.exec(cell);
  if (!m) return null;
  return { op: m[1] as "≤" | ">", watts: Number(m[2]) * UNIT_W[m[3]!]! };
}

export function laserClasses(): LaserClass[] {
  const t = getTable("24.1", 1, ["Class", "Meaning", "Typical AEL", "Examples", "Key requirements"]);
  return tableRecords(t).map((r) => {
    const ael = req(r, t.header[2]!);
    return {
      cls: req(r, "Class"),
      meaning: req(r, "Meaning"),
      ael,
      examples: req(r, "Examples"),
      requirements: req(r, "Key requirements"),
      aelLimit: parseAel(ael),
    };
  });
}

/* ------------------------------------------------------------------ §24.2 hazards */
export function hazards(): Hazard[] {
  return tableRecords(getTable("24.2", 1, ["Hazard", "Mechanism", "Controls"])).map((r, i) => ({
    id: `hazard-${i + 1}`,
    hazard: req(r, "Hazard"),
    mechanism: req(r, "Mechanism"),
    controls: req(r, "Controls"),
  }));
}

/* ------------------------------------------------------------------ §24.3 standards */
/**
 * DERIVED sorting aid (not a handbook classification): groups a §24.3 row by keywords
 * in its scope text. Anything that is not clearly measurement or process quality is
 * treated as safety/regulation.
 */
export function standardGroup(scope: string): StandardGroup {
  const s = scope.toLowerCase();
  if (/quality of|quality levels|welding procedure|procedure qualification/.test(s)) return "quality";
  if (/vocabulary|beam widths|test methods|density distribution|pointing|damage threshold/.test(s)) return "measurement";
  return "safety";
}

export function standards(): StandardRow[] {
  return tableRecords(getTable("24.3", 1, ["Standard", "Scope"])).map((r) => {
    const scope = req(r, "Scope");
    return { standard: req(r, "Standard"), scope, group: standardGroup(scope) };
  });
}

/* ------------------------------------------------------------------ §11.6 safety architecture */
/**
 * Links from a §11.6 element to the matching part of the generic Class 1 workstation in
 * the 3D Machine Explorer (/machine?select=<componentId>). Matching is by element name;
 * elements without a modelled counterpart (e.g. laser shutters) get no link.
 */
const ELEMENT_COMPONENT: Array<[RegExp, string]> = [
  [/^interlocks?/i, "interlock"],
  [/^emergency stop/i, "estop"],
  [/^beam enclosure/i, "enclosure"],
  [/^warning lights/i, "beacon"],
  [/^key switch/i, "key"],
  [/^safety plc/i, "safety"],
  [/^fire and fume/i, "extraction"],
];

export function safetyArchitecture(): SafetyElement[] {
  return tableRecords(getTable("11.6", 1, ["Element", "Purpose"])).map((r) => {
    const element = req(r, "Element");
    return { element, purpose: req(r, "Purpose"), componentId: ELEMENT_COMPONENT.find(([re]) => re.test(element))?.[1] ?? null };
  });
}

/* ------------------------------------------------------------------ §24.4 metrology */
export function metrologyTable(): TableBlock {
  return getTable("24.4", 1, ["Quantity", "Instruments", "Principle", "Practical notes"]);
}

/* ------------------------------------------------------------------ §23.5 feasibility template */
export const FEASIBILITY_LIST_ID = "feasibility-23.5";

/** §23.5 rows as checklist items: text = "Section — Content to record"; id from the row number. */
export function feasibilityItems(): ChecklistItem[] {
  const rows = tableRecords(getTable("23.5", 1, ["Section", "Content to record"]));
  return rows.map((r, i) => {
    const section = req(r, "Section");
    const n = /^(\d+)\./.exec(section)?.[1] ?? String(i + 1);
    return { id: `s${n}`, text: `${section} — ${req(r, "Content to record")}` };
  });
}

/* ------------------------------------------------------------------ §23.6 parameter development / DOE */
export interface DoeData {
  table: TableBlock;
  /** the subheading that introduces the methodology list ("DOE methodology") */
  methodTitle: string;
  /** methodology list items, verbatim */
  method: string[];
  /** "Work in derived quantities…" sentence */
  derived: string;
  /** worked example paragraph (two sentences) */
  example: string;
}

export function doeData(): DoeData {
  const table = getTable("23.6", 1, ["Parameter", "Primary effect", "Coupled with", "Typical watch-out"]);
  const s = getSection("23.6");
  if (!s) throw new Error("§23.6 missing");
  let heading = "";
  let methodTitle = "";
  let method: string[] = [];
  for (const b of s.blocks) {
    if (b.type === "subheading") heading = b.text;
    if (b.type === "list" && /DOE/i.test(heading) && !method.length) {
      methodTitle = heading;
      method = b.items.map(spansText);
    }
  }
  if (!method.length) throw new Error("§23.6: DOE methodology list not found");
  return {
    table,
    methodTitle,
    method,
    derived: quote("23.6", "Work in derived quantities"),
    example: quote("23.6", "Example — black annealing", 2),
  };
}

/** Calculators for the derived quantities the §23.6 sentence names (fluence, intensity, J/mm, overlap). */
export const DOE_CALCULATORS = ["fluence", "cw-intensity", "energy-per-length", "pulse-overlap"] as const;

/* ------------------------------------------------------------------ §B.7 / §B.8 checklists */
export interface SectionChecklist {
  /** `${sectionId}#${blockIndex}` — identical to components/handbook/Blocks.tsx, so progress is shared with the lesson page */
  listId: string;
  sectionId: string;
  title: string;
  items: ChecklistItem[];
}

export function sectionChecklists(sectionId: string): SectionChecklist[] {
  const s = getSection(sectionId);
  if (!s) throw new Error(`unknown section ${sectionId}`);
  const out: SectionChecklist[] = [];
  let heading = "";
  s.blocks.forEach((b, i) => {
    if (b.type === "subheading") heading = b.text;
    if (b.type === "checklist") out.push({ listId: `${sectionId}#${i}`, sectionId, title: heading || s.title, items: b.items });
  });
  if (!out.length) throw new Error(`§${sectionId}: no checklist blocks`);
  return out;
}

export function safetyChecklists(): SectionChecklist[] {
  return [...sectionChecklists("B.7"), ...sectionChecklists("B.8")];
}

/* ------------------------------------------------------------------ figures & quotations */
export interface SafetyFigures {
  architecture: Figure | undefined;
  odNohd: Figure | undefined;
  feasibility: Figure | undefined;
}

export function safetyFigures(): SafetyFigures {
  return { architecture: getFigure("image50"), odNohd: getFigure("image62"), feasibility: getFigure("image61") };
}

export function safetyQuotes() {
  return {
    /** §24.1: edition, scope, and "check for later amendments" */
    classesIntro: quote("24.1", "IEC 60825-1:2014 (Edition 3) classifies laser products"),
    aelNote: quote("24.1", "Accessible emission limits (AELs) depend on wavelength and exposure time"),
    calculated: quote("24.2", "Eyewear optical density and hazard distance are calculated, not guessed"),
    variables: quote("24.2", "H₀ is the worst-case exposure"),
    noBypassHandbook: quote("24.2", "This handbook does not describe bypassing or defeating safety systems"),
    architecture: quote("11.6", "Machine safety is designed from a risk assessment"),
    neverBypassed: quote("11.6", "Safety functions are never bypassed for set-up"),
    production: quote("24.4", "Production practice:"),
  };
}

export function safetyPageData() {
  return {
    classes: laserClasses(),
    hazards: hazards(),
    standards: standards(),
    architecture: safetyArchitecture(),
    metrology: metrologyTable(),
    feasibility: feasibilityItems(),
    doe: doeData(),
    checklists: safetyChecklists(),
    figures: safetyFigures(),
    quotes: safetyQuotes(),
  };
}
