import "server-only";
import { getTable, tableRecords } from "./handbook";

export type SourceFamily = "solid-state" | "fiber" | "gas" | "semiconductor" | "ultrafast" | "specialised";
export const FAMILY_LABEL: Record<SourceFamily, string> = {
  "solid-state": "Solid-state",
  fiber: "Fiber",
  gas: "Gas",
  semiconductor: "Semiconductor",
  ultrafast: "Ultrafast (regime)",
  specialised: "Specialised",
};

export interface SourceEntry {
  id: string;
  name: string;
  family: SourceFamily;
  section: string;
  /** handbook fields in source order: [header, value] */
  fields: Array<[string, string]>;
  /** name of the row in the companion advantages/applications table (when joined) */
  joinedFrom?: string;
  /** DERIVED filter tags (parsed from the handbook text) */
  wavelengthsNm: Array<[number, number]>;
  modes: string[];
  search: string;
}

const SUBS: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "²": "2", "³": "3", "µ": "u", "é": "e" };
const slug = (s: string) =>
  s
    .replace(/[₀₁₂₃₄₅²³µé]/g, (c) => SUBS[c] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Parse wavelength values and ranges from handbook text into [min, max] nm pairs (100 nm – 20 µm only). */
export function parseWavelengths(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const re = /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?/g;
  for (const m of text.matchAll(re)) {
    const at = (m.index ?? 0) + m[0].length;
    const rest = text.slice(at);
    const unitMatch = rest.match(/^\s*\(?[^)]*?\)?\s*(nm|µm)|^[^;]*?(nm|µm)/);
    const unit = unitMatch?.[1] ?? unitMatch?.[2];
    if (!unit) continue;
    const k = unit === "µm" ? 1000 : 1;
    const a = Number(m[1]) * k;
    const b = m[2] ? Number(m[2]) * k : a;
    if (a >= 100 && b <= 20000 && a <= b) out.push([a, b]);
  }
  return out;
}

export function parseModes(text: string): string[] {
  const t = text.toLowerCase();
  const modes = new Set<string>();
  if (/\bcw\b|continuous/.test(t)) modes.add("CW");
  if (/qcw|modulated|free-running|0\.\d+–\d+ ms|ms\b/.test(t)) modes.add("ms / QCW");
  if (/q-switched|\bns\b|ns q|\d+\s*ns|ns–/.test(t)) modes.add("ns pulsed");
  if (/\bps\b|picosecond|\d+\s*ps|ps–/.test(t)) modes.add("ps");
  if (/\bfs\b|femtosecond|\d+\s*fs|< ?10 fs/.test(t)) modes.add("fs");
  if (/µs/.test(t)) modes.add("µs pulsed");
  return [...modes];
}

/** spec-table row name → companion-table row name, where the handbook uses different labels */
const JOIN: Record<string, string> = {
  "Yb fiber, CW single-mode": "Yb CW single-mode",
  "Yb fiber, CW multimode": "Yb CW multimode",
  "Yb fiber, QCW": "Yb QCW",
  "Yb fiber, Q-switched ns": "Yb Q-switched ns",
  "Yb fiber, MOPA ns": "Yb MOPA ns",
  "Yb fiber, picosecond": "Yb ps / fs",
  "Yb fiber, femtosecond": "Yb ps / fs",
  "Er/Yb co-doped": "Er/Yb",
  "Ar-ion": "Ar / Kr ion",
  "Kr-ion": "Ar / Kr ion",
  "Edge-emitting broad-area single emitter": "Broad-area, bars, pump modules",
  "Diode bars and stacks": "Broad-area, bars, pump modules",
  "Fiber-coupled pump module": "Broad-area, bars, pump modules",
  "Direct-diode industrial system": "Direct-diode system",
  "Single-mode ridge (Fabry–Pérot)": "Single-mode FP / DFB / DBR",
  DFB: "Single-mode FP / DFB / DBR",
  DBR: "Single-mode FP / DFB / DBR",
  "Quantum cascade laser (QCL)": "QCL / ICL",
  "Interband cascade laser (ICL)": "QCL / ICL",
};

function paired(section: string, family: SourceFamily): SourceEntry[] {
  const specT = getTable(section, 1, ["Type"]);
  const appT = getTable(section, 2, ["Type", "Advantages", "Limitations", "Typical applications", "Representative suppliers"]);
  const specs = tableRecords(specT);
  const apps = tableRecords(appT);
  const used = new Set<string>();
  const entries: SourceEntry[] = specs.map((s) => {
    const name = s["Type"]!;
    const appName = JOIN[name] ?? name;
    const app = apps.find((a) => a["Type"] === appName);
    if (app) used.add(appName);
    const fields: Array<[string, string]> = [
      ...specT.header.slice(1).map((h) => [h, s[h] ?? ""] as [string, string]),
      ...(app ? appT.header.slice(1).map((h) => [h, app[h] ?? ""] as [string, string]) : []),
    ];
    return mk(name, family, section, fields, app && appName !== name ? appName : undefined);
  });
  // companion rows with no spec row (e.g. GaN violet/blue diodes)
  for (const a of apps) {
    if (used.has(a["Type"]!)) continue;
    entries.push(mk(a["Type"]!, family, section, appT.header.slice(1).map((h) => [h, a[h] ?? ""] as [string, string])));
  }
  return entries;
}

function mk(name: string, family: SourceFamily, section: string, fields: Array<[string, string]>, joinedFrom?: string): SourceEntry {
  const get = (re: RegExp) => fields.filter(([h]) => re.test(h)).map(([, v]) => v).join(" ");
  const wl = get(/wavelength/i) || name;
  return {
    id: `${family}-${slug(name)}`,
    name,
    family,
    section,
    fields,
    joinedFrom,
    wavelengthsNm: parseWavelengths(wl + (family === "ultrafast" || family === "specialised" ? ` ${get(/specification|what it is/i)}` : "")),
    modes: parseModes(`${get(/pulse|duration|specification/i)} ${name}`),
    search: `${name} ${fields.map(([, v]) => v).join(" ")}`.toLowerCase(),
  };
}

function single(section: string, family: SourceFamily, firstHeader: string): SourceEntry[] {
  const t = getTable(section, 1, [firstHeader]);
  return tableRecords(t).map((r) => mk(r[firstHeader]!, family, section, t.header.slice(1).map((h) => [h, r[h] ?? ""] as [string, string])));
}

export function sourceCatalogue(): SourceEntry[] {
  const all = [
    ...paired("3.2", "solid-state"),
    ...paired("3.3", "fiber"),
    ...paired("3.4", "gas"),
    ...paired("3.5", "semiconductor"),
    ...single("3.6", "ultrafast", "Regime"),
    ...single("3.7", "specialised", "Type"),
  ];
  // the ultrafast regimes run at Yb 1030 nm and harmonics per §3.6 text
  for (const e of all) if (e.family === "ultrafast" && e.wavelengthsNm.length === 0) e.wavelengthsNm = parseWavelengths(e.fields.map(([, v]) => v).join(" "));
  return all;
}

export function wavelengthMap() {
  const t = getTable("3.8", 1, ["Wavelength", "Source technology", "Absorbed well by", "Advantages", "Limitations", "Typical applications", "Typical industries"]);
  return tableRecords(t).map((r) => {
    const range = parseWavelengths(r["Wavelength"] ?? "")[0] ?? null;
    return { ...r, nm: range ? (range[0] + range[1]) / 2 : null, range } as Record<string, string> & { nm: number | null; range: [number, number] | null };
  });
}

export function familiesAtAGlance() {
  return tableRecords(getTable("27.1", 2, ["Family", "λ", "Average power", "Pulse", "Wall-plug", "Beam quality", "Relative cost", "Sweet spot"]));
}
