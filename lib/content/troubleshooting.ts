import "server-only";
import { getTable, tableRecords, quote } from "./handbook";
import type { TableBlock } from "./schema";
import { slug } from "@/lib/slug";
import { TOPIC_LABEL, TOPIC_ORDER, type TroubleTopic, type TroubleLink, type TroubleCard, type RecipePractice } from "@/features/troubleshooting/types";

export { TOPIC_LABEL, TOPIC_ORDER };
export type { TroubleTopic, TroubleLink, TroubleCard, RecipePractice };

/**
 * Adapters for /troubleshooting. Problem, causes, checks and actions are the handbook
 * cells of §27.2 (and §10.4 for weld defects), split only at top-level semicolons so
 * that joining the pieces with "; " gives the cell back exactly. The handbook has no
 * verification column; the page renders verification as labelled platform guidance.
 */

/** Split a cell at semicolons that are not inside parentheses. Pieces are trimmed but otherwise verbatim. */
export function splitCell(cell: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < cell.length; i++) {
    const c = cell[i]!;
    if (c === "(") depth++;
    if (c === ")") depth = Math.max(0, depth - 1);
    if (c === ";" && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out.filter((s) => s.length > 0);
}

/* ------------------------------------------------------------------ derived topic groups */
/**
 * DERIVED grouping from keywords in the symptom (problem) text only. First match wins,
 * so "Weld porosity" is welding and "Poor contrast (codes)" is marking.
 */
export function topicOf(problem: string): TroubleTopic {
  const p = problem.toLowerCase();
  if (/weld|porosity|spatter|crack|penetration|fusion|burn-through|blow-hole|undercut|underfill|humping/.test(p)) return "welding";
  if (/mark|contrast|code/.test(p)) return "marking";
  if (/haz\b|burning|charring/.test(p)) return "thermal";
  if (/misalign|galvo|scanner|vision/.test(p)) return "scanner-vision";
  if (/power|spot|beam|lens|optic|fiber|focus/.test(p)) return "beam-optics";
  return "other";
}

/* ------------------------------------------------------------------ links */
/**
 * Link rules. Process workspaces are matched on the problem text only; calculators and
 * tools on an explicit term in the row's own handbook text (problem, causes, checks,
 * actions). Calculator ids are verified against CALCULATOR_INDEX in the unit test.
 */
interface LinkRule {
  on: "problem" | "row";
  test: RegExp;
  link: TroubleLink;
}

export const LINK_RULES: LinkRule[] = [
  { on: "problem", test: /weld|porosity|spatter|crack|penetration|fusion|burn-through|undercut|humping/i, link: { label: "Welding workspace", href: "/processes/welding", kind: "process" } },
  { on: "problem", test: /mark|contrast|code/i, link: { label: "Marking workspace", href: "/processes/marking", kind: "process" } },
  { on: "problem", test: /\bcut|kerf|dross/i, link: { label: "Cutting workspace", href: "/processes/cutting", kind: "process" } },
  { on: "problem", test: /polymer|wood|pcb/i, link: { label: "UV & CO₂ workspace", href: "/processes/uv-co2", kind: "process" } },
  { on: "problem", test: /\bdrill/i, link: { label: "Drilling workspace", href: "/processes/drilling", kind: "process" } },
  { on: "problem", test: /^low power/i, link: { label: "Power measurement (§24.4)", href: "/safety#metrology", kind: "tool" } },
  { on: "problem", test: /spot|focus/i, link: { label: "Focused spot & depth of focus", href: "/calculators/focus-spot", kind: "calculator" } },
  { on: "problem", test: /beam distortion|large spot/i, link: { label: "Beam & Optics Lab", href: "/beam-optics", kind: "tool" } },
  { on: "problem", test: /galvo/i, link: { label: "Galvo resolution", href: "/calculators/galvo-resolution", kind: "calculator" } },
  { on: "problem", test: /vision/i, link: { label: "Vision resolution", href: "/calculators/vision-resolution", kind: "calculator" } },
  { on: "row", test: /vision/i, link: { label: "Vision loop", href: "/architecture#vision-loop", kind: "tool" } },
  { on: "row", test: /fluence/i, link: { label: "Fluence", href: "/calculators/fluence", kind: "calculator" } },
  { on: "row", test: /\bhatch\b/i, link: { label: "Pulse & hatch overlap", href: "/calculators/pulse-overlap", kind: "calculator" } },
  { on: "row", test: /heat input/i, link: { label: "Heat input per length", href: "/calculators/energy-per-length", kind: "calculator" } },
  { on: "row", test: /keyhole/i, link: { label: "CW intensity & weld mode", href: "/calculators/cw-intensity", kind: "calculator" } },
  { on: "row", test: /long pulses|heat accumulation/i, link: { label: "Thermal diffusion length", href: "/calculators/thermal-diffusion", kind: "calculator" } },
];

const MAX_LINKS = 4;

export function linksFor(problem: string, rowText: string): TroubleLink[] {
  const out: TroubleLink[] = [];
  for (const r of LINK_RULES) {
    const hay = r.on === "problem" ? problem : rowText;
    if (r.test.test(hay) && !out.some((l) => l.href === r.link.href)) out.push(r.link);
  }
  return out.slice(0, MAX_LINKS);
}

/* ------------------------------------------------------------------ cards */
export function symptomTable(): TableBlock {
  return getTable("27.2", 1, ["Symptom", "Possible causes", "Diagnostic", "Corrective action"]);
}

export function weldDefectTable(): TableBlock {
  return getTable("10.4", 2, ["Defect", "Main causes", "Countermeasures"]);
}

export function symptomCards(): TroubleCard[] {
  return tableRecords(symptomTable()).map((r) => {
    const problem = r["Symptom"] ?? "";
    const causes = r["Possible causes"] ?? "";
    const diag = r["Diagnostic"] ?? "";
    const action = r["Corrective action"] ?? "";
    const row = [problem, causes, diag, action].join(" \n ");
    return {
      id: slug(problem),
      kind: "symptom",
      section: "27.2",
      problem,
      causes: splitCell(causes),
      checks: splitCell(diag),
      actions: splitCell(action),
      topic: topicOf(problem),
      links: linksFor(problem, row),
      haystack: row.toLowerCase(),
    };
  });
}

export function weldDefectCards(): TroubleCard[] {
  return tableRecords(weldDefectTable()).map((r) => {
    const problem = r["Defect"] ?? "";
    const causes = r["Main causes"] ?? "";
    const action = r["Countermeasures"] ?? "";
    const row = [problem, causes, action].join(" \n ");
    return {
      id: `weld-${slug(problem)}`,
      kind: "weld-defect",
      section: "10.4",
      problem,
      causes: splitCell(causes),
      checks: null,
      actions: splitCell(action),
      topic: "welding",
      links: linksFor(problem, row),
      haystack: row.toLowerCase(),
    };
  });
}

/* ------------------------------------------------------------------ quotations */
/**
 * The four fault families named in the §27.2 lead sentence ("most faults are …, not the
 * laser"), parsed from the quotation so that they cannot drift from the handbook.
 */
export function commonFaults(): string[] {
  const q = quote("27.2", "Work from the workpiece back to the source");
  const m = /most faults are (.+?), not the laser/.exec(q);
  if (!m) throw new Error("§27.2: 'most faults are …' clause not found");
  const out = m[1]!
    .split(/,\s*|\s+or\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (out.length < 3) throw new Error("§27.2: expected at least three fault families");
  return out;
}

/** §12.5 "Recipes" good-practice row, cited by the platform's verification guidance. */
export function recipePractice(): RecipePractice {
  const rows = tableRecords(getTable("12.5", 1, ["Topic", "Good practice"]));
  const r = rows.find((x) => x["Topic"] === "Recipes");
  if (!r) throw new Error("§12.5: Recipes row not found");
  const practice = r["Good practice"] ?? "";
  if (!/versioned/.test(practice) || !/change control/.test(practice)) throw new Error("§12.5: Recipes row no longer mentions versioning/change control");
  return { topic: "Recipes", practice };
}

export function troubleshootingQuotes() {
  return {
    lead: quote("27.2", "Work from the workpiece back to the source"),
    neverBypassed: quote("11.6", "Safety functions are never bypassed for set-up"),
    noBypassHandbook: quote("24.2", "This handbook does not describe bypassing or defeating safety systems"),
  };
}

export function troubleshootingData() {
  return {
    symptoms: symptomCards(),
    welds: weldDefectCards(),
    faults: commonFaults(),
    recipe: recipePractice(),
    quotes: troubleshootingQuotes(),
  };
}
