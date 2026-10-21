import "server-only";
import { getSection, getTable, tableRecords, quote } from "./handbook";
import { cellText } from "./schema";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export interface AppChain {
  id: string;
  industry: string;
  product: string;
  component: string;
  material: string;
  process: string;
  laser: string;
  lambda: string;
  power: string;
  pulse: string;
  machine: string;
  families: string[];
  /** requirement stated in a related §26.2 case (same industry and process type), named explicitly */
  caseRequirement?: { caseId: string; caseNumber: number; caseTitle: string; text: string };
  /** §23.4 decisive requirements and risks for the machine type, when the type is unambiguous */
  machineRisks?: { product: string; text: string };
}

/**
 * DERIVED mapping from a process name to the §10.1 process family (or families) whose
 * “key quality metrics” apply. Marking spans Modification (annealing, colour) and
 * Removal (engraving, ablation) in §10.1, so it maps to both.
 */
export function familiesOf(process: string): string[] {
  const p = process.toLowerCase();
  const out = new Set<string>();
  if (/weld|join|solder|braz|bond/.test(p)) out.add("Joining");
  if (/cut|dic|slic|drill|depanel|trim|scrib|perforat|separat/.test(p)) out.add("Separation");
  if (/clad|powder-bed|lpbf|ded|additive|deposition/.test(p)) out.add("Addition");
  if (/clean|strip|ablat|lift-off|texturing|engrav|contact opening|decontaminat|structuring|legend/.test(p)) out.add("Removal");
  if (/mark|anneal|harden|coding|serialis|imaging|id\b/.test(p)) {
    out.add("Modification");
    out.add("Removal");
  }
  return [...out];
}

const PROCESS_WORDS = ["marking", "welding", "cutting", "dicing", "drilling", "cleaning", "soldering"];

/** §23.4 "What differs by product type": machine type → row, only for unambiguous wording. */
function machineTypeRow(machine: string, industry: string): string | null {
  const m = machine.toLowerCase();
  if (industry === "Semiconductor") return "Semiconductor laser equipment";
  if (/marking|marker|coder|serialisation/.test(m)) return "Laser marking machine";
  if (/weld/.test(m)) return "Laser welding machine";
  if (/solder/.test(m)) return "Laser soldering machine";
  if (/cutting|cutter/.test(m)) return "Laser cutting machine";
  if (/clean/.test(m)) return "Laser cleaning machine";
  return null;
}

export function applicationMatrix(): AppChain[] {
  const cases = caseStudies();
  const risks = productRequirements();
  return applicationMatrixRaw().map((c) => {
    const words = PROCESS_WORDS.filter((w) => c.process.toLowerCase().includes(w));
    const k = cases.find((x) => x.industries.includes(c.industry) && words.some((w) => x.title.toLowerCase().includes(w)));
    const req = k?.steps.find((st) => st.step === "Requirement");
    const rowName = machineTypeRow(c.machine, c.industry);
    const row = rowName ? risks.find((r) => r["Product"] === rowName) : undefined;
    return {
      ...c,
      caseRequirement: k && req ? { caseId: k.id, caseNumber: k.number, caseTitle: k.title, text: req.decision } : undefined,
      machineRisks: row ? { product: row["Product"] ?? "", text: row["Decisive requirements and risks"] ?? "" } : undefined,
    };
  });
}

function applicationMatrixRaw(): AppChain[] {
  const t = getTable("20.0", 1, ["Industry", "Product", "Component", "Material", "Process", "Laser type", "λ", "Avg power", "Pulse", "Machine type"]);
  const seen = new Map<string, number>();
  return tableRecords(t).map((r) => {
    let id = slug(`${r["Industry"]}-${r["Product"]}-${r["Component"]}`);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n) id = `${id}-${n + 1}`;
    return {
      id,
      industry: r["Industry"] ?? "",
      product: r["Product"] ?? "",
      component: r["Component"] ?? "",
      material: r["Material"] ?? "",
      process: r["Process"] ?? "",
      laser: r["Laser type"] ?? "",
      lambda: r["λ"] ?? "",
      power: r["Avg power (≈)"] ?? "",
      pulse: r["Pulse"] ?? "",
      machine: r["Machine type"] ?? "",
      families: familiesOf(r["Process"] ?? ""),
    };
  });
}

export function qualityByFamily(): Record<string, string> {
  const t = getTable("10.1", 1, ["Family", "Process", "Mechanism", "Typical lasers", "Key quality metrics"]);
  return Object.fromEntries(tableRecords(t).map((r) => [r["Family"] ?? "", r["Key quality metrics"] ?? ""]));
}

/** Tables of a section paired with the subheading that precedes each. */
function headedTables(sectionId: string) {
  const s = getSection(sectionId);
  if (!s) throw new Error(`unknown section ${sectionId}`);
  const out: Array<{ heading: string; header: string[]; rows: string[][] }> = [];
  let heading = "";
  for (const b of s.blocks) {
    if (b.type === "subheading") heading = b.text;
    if (b.type === "table") out.push({ heading, header: b.header, rows: b.rows.map((r) => b.header.map((_, i) => cellText(r[i]))) });
  }
  return out;
}

export interface ProductMap {
  id: string;
  title: string;
  rows: Array<Record<string, string>>;
}

export function explodedMaps(): ProductMap[] {
  return headedTables("19.2").map((t) => {
    const title = t.heading.replace(/^\d+\.\s*/, "");
    return {
      id: slug(title.split("(")[0]!.trim()),
      title,
      rows: t.rows.map((r) => Object.fromEntries(t.header.map((h, i) => [h, r[i] ?? ""]))),
    };
  });
}

/** Industry tags for the §26.2 cases (from each case's first chain element). */
const CASE_INDUSTRIES: Record<number, string[]> = {
  1: ["Electronics"],
  2: ["EMS"],
  3: ["Battery"],
  4: ["Semiconductor"],
  5: ["Automotive", "EV"],
  6: ["Medical"],
  7: [],
  8: ["Electronics", "Consumer electronics"],
};

export interface CaseStudy {
  id: string;
  number: number;
  title: string;
  chain: string[];
  industries: string[];
  steps: Array<{ step: string; decision: string }>;
}

export function caseStudies(): CaseStudy[] {
  return headedTables("26.2").map((t, i) => {
    const title = t.heading.replace(/^Case \d+ — /, "");
    return {
      id: `case-${i + 1}`,
      number: i + 1,
      title,
      chain: title.split("→").map((x) => x.trim()),
      industries: CASE_INDUSTRIES[i + 1] ?? [],
      steps: t.rows.map((r) => ({ step: r[0] ?? "", decision: r[1] ?? "" })),
    };
  });
}

export function productRequirements() {
  return tableRecords(getTable("23.4", 2, ["Product", "Decisive requirements and risks"]));
}

export function applicationQuotes() {
  return {
    cases: quote("26.2", "Each case walks the handbook’s chain from product to machine", 2),
    confirm: quote("B.5", "Confirm every branch with the absorption check"),
    tree: quote("28.0", "Every application question resolves by walking this tree upward"),
  };
}

/** Industry deep-dive sections in Parts XIII–XIX. */
export const INDUSTRY_SECTIONS: Array<{ label: string; sections: string[] }> = [
  { label: "Semiconductor", sections: ["13.1", "13.2", "13.3"] },
  { label: "Electronics and EMS", sections: ["14.1", "14.2", "14.3"] },
  { label: "Battery and new energy", sections: ["15.1", "15.2", "15.3", "15.4"] },
  { label: "Automotive", sections: ["16.0"] },
  { label: "Aerospace", sections: ["17.0"] },
  { label: "Medical", sections: ["18.1", "18.2"] },
  { label: "Consumer and end products", sections: ["19.1", "19.2"] },
];
