/**
 * Client-safe data shapes for the Safety & Quality page. The server adapter
 * (lib/content/safety.ts) builds these from the handbook; client components import
 * only from here, never from the server-only adapter.
 */

export interface LaserClass {
  cls: string;
  meaning: string;
  /** "Typical AEL (CW, visible)" cell, verbatim */
  ael: string;
  examples: string;
  requirements: string;
  /**
   * DERIVED: the numeric power limit parsed from the AEL cell (W), with its comparison
   * operator, or null when the cell carries no number ("Class 1 limit", "—").
   */
  aelLimit: { op: "≤" | ">"; watts: number } | null;
}

export interface Hazard {
  id: string;
  hazard: string;
  mechanism: string;
  controls: string;
}

export type StandardGroup = "safety" | "measurement" | "quality";

export const STANDARD_GROUP_LABEL: Record<StandardGroup, string> = {
  safety: "Safety & regulation",
  measurement: "Beam & measurement",
  quality: "Process quality",
};

export interface StandardRow {
  standard: string;
  scope: string;
  /** DERIVED sorting aid, not a handbook classification */
  group: StandardGroup;
}

export interface SafetyElement {
  element: string;
  purpose: string;
  /** id of the matching component in the 3D Machine Explorer, if one is modelled */
  componentId: string | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
}
