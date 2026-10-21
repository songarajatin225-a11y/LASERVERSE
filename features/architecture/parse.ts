/**
 * Pure parsers for handbook text used by the Architecture & Automation page.
 * No server-only imports: the content adapter (lib/content/architecture.ts) runs them on
 * the server and the unit tests run them directly. Every parsed value is DERIVED from
 * the handbook's own wording, which is always shown verbatim next to it.
 */

function norm(t: string): string {
  return t.replace(/μ/g, "µ").replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ latency (§11.2) */
export type LatencyBound = "range" | "point" | "upper" | "order";

export interface LatencyInterval {
  /** seconds */
  lo: number;
  /** seconds */
  hi: number;
  /** text carries "~" or "≈" */
  approx: boolean;
  /**
   * range: "1–10 ms"; point: "100 ms"; upper: "≤ ~10–20 ms" (an upper bound);
   * order: a unit word without a number ("Seconds", "ns–µs")
   */
  bound: LatencyBound;
}

const UNIT_S: Record<string, number> = { ns: 1e-9, "µs": 1e-6, ms: 1e-3, s: 1 };
const WORD_S: Record<string, number> = { nanoseconds: 1e-9, microseconds: 1e-6, milliseconds: 1e-3, seconds: 1, nanosecond: 1e-9, microsecond: 1e-6, millisecond: 1e-3, second: 1 };

/**
 * Reads the "Typical cycle / latency (≈)" cell of handbook §11.2 into an interval in seconds.
 * Returns null when no time can be read, so callers can fail loudly.
 */
export function parseLatency(text: string): LatencyInterval | null {
  const t = norm(text);
  const approx = /[~≈]/.test(t);
  const upper = /≤|<=|\bup to\b/i.test(t);
  const num = /(\d+(?:\.\d+)?)\s?(?:[–-]\s?(\d+(?:\.\d+)?)\s?)?(ns|µs|ms|s)(?![a-zA-Z])/.exec(t);
  if (num) {
    const u = UNIT_S[num[3]!]!;
    const lo = Number(num[1]) * u;
    const hi = (num[2] !== undefined ? Number(num[2]) : Number(num[1])) * u;
    return { lo, hi, approx, bound: upper ? "upper" : num[2] !== undefined ? "range" : "point" };
  }
  const units = /(?:^|[\s(])(ns|µs|ms|s)\s?[–-]\s?(ns|µs|ms|s)(?![a-zA-Z])/.exec(` ${t}`);
  if (units) {
    return { lo: UNIT_S[units[1]!]!, hi: UNIT_S[units[2]!]!, approx, bound: "order" };
  }
  const word = /\b(nanoseconds?|microseconds?|milliseconds?|seconds?)\b/i.exec(t);
  if (word) {
    const v = WORD_S[word[1]!.toLowerCase()]!;
    return { lo: v, hi: v, approx, bound: "order" };
  }
  return null;
}

/** "1 ns", "250 µs", "10 ms", "1 s" style label for a time in seconds. */
export function formatSeconds(s: number): string {
  const units: Array<[string, number]> = [
    ["s", 1],
    ["ms", 1e-3],
    ["µs", 1e-6],
    ["ns", 1e-9],
  ];
  for (const [u, f] of units) {
    if (s >= f * 0.9999) {
      const v = s / f;
      return `${Number(v.toPrecision(3))} ${u}`;
    }
  }
  return `${Number((s / 1e-9).toPrecision(3))} ns`;
}

/* ------------------------------------------------------------------ cost shares (§23.1) */
export interface PercentRange {
  lo: number;
  hi: number;
}

/** "30–45%", "5–8% (cutting head)", "0–8%" → {lo, hi}; "—" (no entry) → null. */
export function parsePercentRange(text: string): PercentRange | null {
  const t = norm(text);
  const m = /(\d+(?:\.\d+)?)\s?(?:[–-]\s?(\d+(?:\.\d+)?)\s?)?%/.exec(t);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] !== undefined ? Number(m[2]) : lo;
  return { lo, hi };
}

/* ------------------------------------------------------------------ handshake direction (§12.4) */
export interface Direction {
  from: string | null;
  to: string | null;
  /** the handbook says "Both" */
  both: boolean;
}

/** "Laser → PLC" → {from: "Laser", to: "PLC"}; "Both" → {both: true}; anything else → null. */
export function parseDirection(text: string): Direction | null {
  const t = norm(text);
  const m = /^(.+?)\s?(?:→|->)\s?(.+)$/.exec(t);
  if (m) return { from: m[1]!.trim(), to: m[2]!.trim(), both: false };
  if (/^both$/i.test(t)) return { from: null, to: null, both: true };
  return null;
}

/* ------------------------------------------------------------------ flowchart alt text (§12.2 figure) */
export interface FlowParse {
  steps: string[];
  outcomes: { pass: string; fail: string } | null;
}

/**
 * Splits a figure's flowchart description ("Flowchart: A → B → C → pass: X; fail: Y.")
 * into its steps, keeping each step's text verbatim. A trailing "pass: …; fail: …" step is
 * returned separately as outcomes.
 */
export function parseFlow(alt: string): FlowParse {
  const body = norm(alt).replace(/^[A-Za-z ]+:\s/, "");
  const parts = body.split(/\s?→\s?/).map((s) => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const oc = /^pass:\s?(.+?);\s?fail:\s?(.+?)\.?$/i.exec(last);
  if (oc) return { steps: parts.slice(0, -1), outcomes: { pass: oc[1]!.trim(), fail: oc[2]!.trim() } };
  return { steps: parts.map((p) => p.replace(/\.$/, "")), outcomes: null };
}
