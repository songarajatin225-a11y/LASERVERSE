import "server-only";
import { getTable, tableRecords, quote, getFigure, getPartByNumber, getSection } from "./handbook";
import { spansText, type TableBlock, type Figure } from "./schema";
import { referenceMachines } from "./processes";
import { parseLatency, parsePercentRange, parseDirection, parseFlow } from "@/features/architecture/parse";
import { COMPONENT_INDEX } from "@/features/machine-explorer/machineData";
import type {
  ControlLayer,
  ChainStage,
  VisionLoopData,
  HandshakeData,
  HandshakeRow,
  ConfiguratorFamily,
  CostEntry,
  InterlockTexts,
} from "@/features/architecture/types";

/**
 * Adapter for the Architecture & Automation page (/architecture). Every handbook number
 * or sentence the page shows comes from a getTable/tableRecords/quote call here, so a
 * re-ingested handbook whose tables drift fails tests/unit/architecture.test.ts.
 */

function figure(id: string): Figure {
  const f = getFigure(id);
  if (!f) throw new Error(`architecture: figure ${id} missing`);
  return f;
}

/**
 * Verbatim quotation from a Part's lead paragraphs (the text before its first section),
 * using the same sentence rule as quote(). Throws if not found.
 */
export function leadQuote(partNumber: number, startsWith: string, sentences = 1): string {
  const p = getPartByNumber(partNumber);
  if (!p) throw new Error(`leadQuote: unknown part ${partNumber}`);
  for (const b of p.lead) {
    if (b.type !== "paragraph") continue;
    const text = spansText(b.spans);
    const at = text.indexOf(startsWith);
    if (at < 0) continue;
    let end = at + startsWith.length - 1;
    for (let n = 0; n < sentences; n++) {
      const m = /[.!?](\s|$)/.exec(text.slice(end + 1));
      if (!m) {
        end = text.length - 1;
        break;
      }
      end = end + 1 + m.index;
    }
    return text.slice(at, end + 1).trim();
  }
  throw new Error(`leadQuote: "${startsWith}" not found in Part ${partNumber} lead`);
}

/* ------------------------------------------------------------------ quotations */
export function architectureQuotes() {
  return {
    twoChains: leadQuote(11, "A laser machine is two chains running in parallel", 2),
    oneStation: leadQuote(12, "In production, the laser is one station in a line", 2),
    generic: quote("26.1", "Every machine follows the generic pattern"),
    safetyDesign: quote("11.6", "Machine safety is designed from a risk assessment"),
    neverBypass: quote("11.6", "Safety functions are never bypassed for set-up"),
    calibration: quote("12.1", "Calibration links three coordinate systems", 3),
    correction: quote("12.2", "Position correction is applied to the job coordinates before processing"),
    costShares: quote("23.1", "Shares of material and conversion cost"),
    costCaveat: quote("23.1", "These are illustrative engineering estimates for planning, not market data"),
    costPatterns: quote("23.1", "Patterns worth remembering"),
  };
}

/* ------------------------------------------------------------------ §11.2 control stack */
export function controlStack(): { layers: ControlLayer[]; table: TableBlock; figure: Figure } {
  const table = getTable("11.2", 1, ["Layer", "Role", "Typical cycle / latency", "Typical technology"]);
  const latencyKey = table.header[2]!;
  const layers = tableRecords(table).map((r) => {
    const latency = r[latencyKey] ?? "";
    const interval = parseLatency(latency);
    if (!interval) throw new Error(`§11.2: cannot read latency "${latency}" for ${r["Layer"]}`);
    return { layer: r["Layer"] ?? "", role: r["Role"] ?? "", latency, technology: r["Typical technology"] ?? "", interval };
  });
  return { layers, table, figure: figure("image49") };
}

/* ------------------------------------------------------------------ §11.1 optical chain */
/**
 * PLATFORM MAPPING from a §11.1 subsystem to the component of the generic marking
 * workstation in the Machine Explorer (features/machine-explorer/machineData.ts), only
 * where one clearly corresponds. The process head has no counterpart in that model.
 */
export const CHAIN_COMPONENT: Record<string, string | null> = {
  "Laser source": "source",
  Isolator: "collimator",
  "Beam expander": "expander",
  "Beam delivery": "fiber",
  "Galvo / scanner": "galvo",
  "F-theta / focusing lens": "ftheta",
  "Process head": null,
  "Workpiece and fixture": "fixture",
};

export function opticalChain(): { stages: ChainStage[]; table: TableBlock; figure: Figure } {
  const table = getTable("11.1", 1, ["Subsystem", "Function", "Key specification", "Reference"]);
  const stages = tableRecords(table).map((r) => {
    const subsystem = r["Subsystem"] ?? "";
    if (!(subsystem in CHAIN_COMPONENT)) throw new Error(`§11.1: unmapped subsystem "${subsystem}"`);
    const componentId = CHAIN_COMPONENT[subsystem] ?? null;
    const comp = componentId ? COMPONENT_INDEX.get(componentId) : undefined;
    if (componentId && !comp) throw new Error(`§11.1: Machine Explorer has no component "${componentId}"`);
    return {
      subsystem,
      function: r["Function"] ?? "",
      spec: r["Key specification"] ?? "",
      reference: r["Reference"] ?? "",
      componentId,
      componentName: comp?.name ?? null,
    };
  });
  return { stages, table, figure: figure("image48") };
}

/* ------------------------------------------------------------------ §11.3–11.5 subsystem tables */
export function subsystemTables() {
  return {
    mechanical: getTable("11.3", 1, ["Subsystem", "Design goal", "Typical solutions", "Watch-outs"]),
    electrical: getTable("11.4", 1, ["Element", "Role", "Selection notes"]),
    software: getTable("11.5", 1, ["Module", "Function"]),
  };
}

/* ------------------------------------------------------------------ §12.1–12.2 vision */
export function visionData(): { table: TableBlock; figure: Figure; loop: VisionLoopData } {
  const table = getTable("12.1", 1, ["Element", "Options", "Selection notes"]);
  const fig = figure("image51");
  const flow = parseFlow(fig.alt ?? "");
  if (flow.steps.length < 4 || !flow.outcomes) throw new Error("§12.2 figure: vision loop steps not found in the figure description");
  return {
    table,
    figure: fig,
    loop: { steps: flow.steps, outcomes: flow.outcomes, correction: quote("12.2", "Position correction is applied to the job coordinates before processing") },
  };
}

/* ------------------------------------------------------------------ §12.3, §12.5 */
export function integrationTable(): TableBlock {
  return getTable("12.3", 1, ["Element", "Role with the laser", "Integration notes"]);
}

export function recipesTable(): TableBlock {
  return getTable("12.5", 1, ["Topic", "Good practice"]);
}

/* ------------------------------------------------------------------ §12.4 handshake */
/** Lane order for the sequence diagram; parties not listed here are appended. */
const LANE_ORDER = ["PLC", "Laser", "Safety"];

export function handshake(): HandshakeData & { table: TableBlock; figure: Figure } {
  const table = getTable("12.4", 1, ["Signal", "Direction", "Meaning"]);
  const rows: HandshakeRow[] = tableRecords(table).map((r) => {
    const direction = r["Direction"] ?? "";
    const parsed = parseDirection(direction);
    if (!parsed) throw new Error(`§12.4: cannot read direction "${direction}"`);
    return { signal: r["Signal"] ?? "", direction, meaning: r["Meaning"] ?? "", parsed };
  });
  const parties = new Set<string>();
  for (const r of rows) {
    if (r.parsed.from) parties.add(r.parsed.from);
    if (r.parsed.to) parties.add(r.parsed.to);
  }
  const lanes = [...LANE_ORDER.filter((l) => parties.has(l)), ...[...parties].filter((p) => !LANE_ORDER.includes(p))];
  return { rows, lanes, table, figure: figure("image52") };
}

/* ------------------------------------------------------------------ §11.6 safety + interlock texts */
export function safetyArchitecture(): { table: TableBlock; figure: Figure; texts: InterlockTexts } {
  const table = getTable("11.6", 1, ["Element", "Purpose"]);
  const electrical = tableRecords(getTable("11.4", 1, ["Element", "Role", "Selection notes"]));
  const recipes = tableRecords(recipesTable());
  const hs = tableRecords(getTable("12.4", 1, ["Signal", "Direction", "Meaning"]));
  const pick = (rows: Record<string, string>[], key: string, value: string, field: string) => {
    const v = rows.find((r) => r[key] === value)?.[field];
    if (!v) throw new Error(`architecture: row "${value}" (${field}) not found`);
    return v;
  };
  return {
    table,
    figure: figure("image50"),
    texts: {
      processInterlocks: pick(recipes, "Topic", "Process interlocks", "Good practice"),
      hardWired: pick(electrical, "Element", "Laser and chiller interfaces", "Selection notes"),
      emissionEnable: pick(hs, "Signal", "Emission enable", "Meaning"),
    },
  };
}

/* ------------------------------------------------------------------ configurator (§26.1 + §23.1) */
interface FamilyDef {
  id: string;
  label: string;
  /** prefix of the §26.1 machine subheading */
  machine: string;
  /** prefix of the §23.1 column header, or null when §23.1 has no matching column */
  cost: string | null;
}

/**
 * PLATFORM MAPPING from an application family to the handbook's §26.1 reference machine
 * and, where one exists, the matching §23.1 cost-structure column.
 */
export const CONFIGURATOR_FAMILIES: FamilyDef[] = [
  { id: "marking-metals", label: "Marking metals", machine: "1. Fiber laser marking machine", cost: "Fiber marking workstation" },
  { id: "pcb-marking", label: "PCB / non-metal marking", machine: "2. CO₂ PCB marking machine", cost: "CO₂ in-line PCB marker" },
  { id: "uv-marking", label: "UV fine marking", machine: "3. UV marking machine", cost: null },
  { id: "welding", label: "Welding", machine: "4. Laser welding machine", cost: null },
  { id: "battery-welding", label: "Battery welding", machine: "6. Battery module welding machine", cost: "Battery module welding cell" },
  { id: "cleaning", label: "Cleaning", machine: "7. Laser cleaning machine", cost: null },
  { id: "sheet-cutting", label: "Sheet cutting", machine: "8. Laser cutting machine", cost: "6 kW flatbed fiber cutter" },
  { id: "semiconductor-marking", label: "Semiconductor marking", machine: "9. Semiconductor marking machine", cost: null },
  { id: "ultrafast", label: "Ultrafast micromachining", machine: "10. Ultrafast laser micromachining machine", cost: "Ultrafast micromachining station" },
];

export function costTable(): TableBlock {
  return getTable("23.1", 1, [
    "Cost block",
    "Fiber marking workstation",
    "CO₂ in-line PCB marker",
    "6 kW flatbed fiber cutter",
    "Battery module welding cell",
    "Ultrafast micromachining station",
  ]);
}

/**
 * The §26.1 subheading that precedes each machine table, read from the section itself.
 * referenceMachines() pairs titles with tables by position; this check makes a re-ordered
 * or re-titled §26.1 fail loudly instead of showing a table under the wrong machine.
 */
export function referenceMachineHeadings(): Map<string, string> {
  const sec = getSection("26.1");
  if (!sec) throw new Error("§26.1 missing");
  const headingOf = new Map<string, string>();
  let last: string | null = null;
  for (const b of sec.blocks) {
    if (b.type === "subheading") last = b.text;
    else if (b.type === "table" && last) headingOf.set(b.id, last);
  }
  return headingOf;
}

export function configurator(): { families: ConfiguratorFamily[]; machines: Record<string, TableBlock> } {
  const machines = referenceMachines();
  const headings = referenceMachineHeadings();
  const cost = costTable();
  const records = tableRecords(cost);
  const families: ConfiguratorFamily[] = [];
  const tables: Record<string, TableBlock> = {};
  for (const f of CONFIGURATOR_FAMILIES) {
    const m = machines.find((x) => x.title.startsWith(f.machine));
    if (!m) throw new Error(`§26.1: reference machine "${f.machine}" not found`);
    const heading = headings.get(m.table.id);
    if (heading !== m.title) throw new Error(`§26.1: table ${m.table.id} sits under "${heading}", not "${m.title}"`);
    tables[f.id] = m.table;
    let costCol: ConfiguratorFamily["cost"] = null;
    if (f.cost) {
      const header = cost.header.find((h) => h.startsWith(f.cost!));
      if (!header) throw new Error(`§23.1: cost column "${f.cost}" not found`);
      const entries: CostEntry[] = records.map((r) => {
        const text = r[header] ?? "";
        return { block: r["Cost block"] ?? "", text, range: parsePercentRange(text) };
      });
      costCol = { header, entries };
    }
    families.push({ id: f.id, label: f.label, machineTitle: heading, cost: costCol });
  }
  return { families, machines: tables };
}
