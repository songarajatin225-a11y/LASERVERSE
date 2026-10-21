/**
 * Plain, serialisable props passed from the server page (lib/content/architecture.ts)
 * to the client components of the Architecture & Automation page. Client-safe: types only.
 */
import type { LatencyInterval, PercentRange, Direction } from "./parse";

export interface ControlLayer {
  layer: string;
  role: string;
  /** verbatim "Typical cycle / latency (≈)" cell */
  latency: string;
  technology: string;
  /** DERIVED from `latency` by parseLatency() */
  interval: LatencyInterval;
}

export interface ChainStage {
  subsystem: string;
  function: string;
  spec: string;
  reference: string;
  /** Machine Explorer component id where one clearly matches (platform mapping), else null */
  componentId: string | null;
  componentName: string | null;
}

export interface VisionLoopData {
  /** verbatim steps of the §12.2 figure's flowchart description */
  steps: string[];
  outcomes: { pass: string; fail: string };
  correction: string;
}

export interface HandshakeRow {
  signal: string;
  direction: string;
  meaning: string;
  parsed: Direction;
}

export interface HandshakeData {
  rows: HandshakeRow[];
  /** parties named in the Direction column, in lane order */
  lanes: string[];
}

export interface CostEntry {
  block: string;
  /** verbatim cell */
  text: string;
  /** DERIVED from `text` by parsePercentRange(); null for "—" */
  range: PercentRange | null;
}

export interface ConfiguratorFamily {
  id: string;
  label: string;
  /** §26.1 subheading text */
  machineTitle: string;
  /** §23.1 column header (verbatim) and its entries, or null where §23.1 has no matching column */
  cost: { header: string; entries: CostEntry[] } | null;
}

export interface InterlockTexts {
  /** §12.5 "Process interlocks" good practice (verbatim) */
  processInterlocks: string;
  /** §11.4 "Laser and chiller interfaces" selection notes (verbatim) */
  hardWired: string;
  /** §12.4 "Emission enable" meaning (verbatim) */
  emissionEnable: string;
}
