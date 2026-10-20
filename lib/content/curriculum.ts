import "server-only";
import { getTable, tableRecords } from "./handbook";
import { parsePartList } from "./parts";
import type { Level } from "@/content/assessments/questions";

export interface LevelDef {
  id: Level;
  name: string;
  focus: string;
  parts: number[];
  canAnswer: string;
  exercise: string;
}

/** Display names and focus lines (prompt specification; matches the handbook's stage names). */
const LEVEL_META: Record<Level, { name: string; focus: string }> = {
  L1: { name: "Foundations", focus: "Physics and laser science" },
  L2: { name: "Sources and Beams", focus: "Source technologies, beam characteristics, optics and delivery" },
  L3: { name: "Processes", focus: "Material interaction and laser manufacturing" },
  L4: { name: "Machines", focus: "Machine design, automation, vision and safety" },
  L5: { name: "Applications and Business", focus: "Industrial applications, feasibility, product architecture and economics" },
  L6: { name: "Expert Practice", focus: "Advanced technologies, troubleshooting, quality and technical decisions" },
};

/** Levels built from the handbook's "Learning roadmap: beginner to expert" table. */
export function getLevels(): LevelDef[] {
  const t = getTable("front.learning-roadmap-beginner-to-expert", 1, ["Stage", "Parts", "You can answer", "Proof"]);
  return tableRecords(t).map((r) => {
    const id = (r["Stage"] ?? "").slice(0, 2) as Level;
    return {
      id,
      ...LEVEL_META[id],
      parts: parsePartList(r["Parts"] ?? ""),
      canAnswer: r["You can answer"] ?? "",
      exercise: r["Proof-of-competence exercise"] ?? "",
    };
  });
}

export function levelOfPart(partNumber: number | null): Level | null {
  if (partNumber === null) return null;
  return getLevels().find((l) => l.parts.includes(partNumber))?.id ?? null;
}

export interface RolePath {
  id: string;
  reader: string;
  startAt: string;
  coreParts: number[];
  coreText: string;
  leaveWith: string;
}

/** Role paths from the handbook's "How to use this handbook" table. */
export function getRolePaths(): RolePath[] {
  const t = getTable("front.how-to-use-this-handbook", 1, ["Reader", "Start at", "Core Parts", "Leave with"]);
  return tableRecords(t).map((r) => ({
    id: (r["Reader"] ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    reader: r["Reader"] ?? "",
    startAt: r["Start at"] ?? "",
    coreParts: parsePartList(r["Core Parts"] ?? ""),
    coreText: r["Core Parts"] ?? "",
    leaveWith: r["Leave with"] ?? "",
  }));
}
