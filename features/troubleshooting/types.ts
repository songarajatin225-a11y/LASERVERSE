/**
 * Client-safe data shapes for /troubleshooting. Built on the server by
 * lib/content/troubleshooting.ts; client components import only from here.
 */

export type TroubleTopic = "welding" | "marking" | "thermal" | "scanner-vision" | "beam-optics" | "other";

export const TOPIC_LABEL: Record<TroubleTopic, string> = {
  welding: "Welding",
  marking: "Marking & codes",
  thermal: "Heat & burning",
  "scanner-vision": "Scanner, alignment & vision",
  "beam-optics": "Source, beam & optics",
  other: "Other",
};

export const TOPIC_ORDER: TroubleTopic[] = ["beam-optics", "marking", "welding", "thermal", "scanner-vision", "other"];

export interface TroubleLink {
  label: string;
  href: string;
  kind: "process" | "calculator" | "tool";
}

export interface TroubleCard {
  /** anchor id: slug(symptom) for §27.2, "weld-" + slug(defect) for §10.4 */
  id: string;
  kind: "symptom" | "weld-defect";
  section: "27.2" | "10.4";
  problem: string;
  causes: string[];
  /** null where the handbook table has no diagnostic column (§10.4) */
  checks: string[] | null;
  actions: string[];
  /** DERIVED from keywords in the problem text */
  topic: TroubleTopic;
  links: TroubleLink[];
  /** lower-cased text of all handbook cells of the row, for client-side filtering */
  haystack: string;
}

export interface RecipePractice {
  topic: string;
  practice: string;
}
