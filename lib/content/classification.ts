/**
 * Source-integrity taxonomy. Every published item in LASERVERSE carries one of these
 * labels so that handbook statements, derived numbers, supplemental explanation and
 * conceptual animation are never confused with one another.
 */
export type Classification =
  | "handbook"
  | "derived"
  | "additional"
  | "external"
  | "conceptual"
  | "validated"
  | "unverified";

export const CLASSIFICATION: Record<Classification, { label: string; short: string; description: string; tone: string }> = {
  handbook: {
    label: "Handbook source",
    short: "Handbook",
    description: "Directly supported by The Complete Laser Handbook; wording preserved where quoted.",
    tone: "teal",
  },
  derived: {
    label: "Derived calculation",
    short: "Derived",
    description: "Computed from a documented equation with explicit inputs, units and a tested implementation.",
    tone: "info",
  },
  additional: {
    label: "Additional explanation",
    short: "Explanation",
    description: "Supplemental teaching text written for LASERVERSE; not a quotation or finding of the handbook.",
    tone: "fog",
  },
  external: {
    label: "External reference",
    short: "External",
    description: "Information from a manufacturer, publication or standard outside the handbook. Verify before use.",
    tone: "warn",
  },
  conceptual: {
    label: "Conceptual visualization",
    short: "Conceptual",
    description: "Illustrates a mechanism qualitatively. It is not a validated numerical model and predicts nothing.",
    tone: "concept",
  },
  validated: {
    label: "Experimentally validated result",
    short: "Validated",
    description: "Supported by defined experimental evidence. (No content in this release carries this label.)",
    tone: "ok",
  },
  unverified: {
    label: "Unverified",
    short: "Review",
    description: "Requires technical review, additional evidence or experimental confirmation.",
    tone: "danger",
  },
};

export type ContentStatus = "extracted" | "review-required" | "validated" | "not-yet-implemented";

export const STATUS_LABEL: Record<ContentStatus, string> = {
  extracted: "Extracted",
  "review-required": "Review required",
  validated: "Validated",
  "not-yet-implemented": "Not yet implemented",
};
