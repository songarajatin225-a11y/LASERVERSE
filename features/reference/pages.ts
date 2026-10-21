/** The Reference Library's sub-pages (client-safe; used by the index and the sub-navigation). */
export interface ReferencePageDef {
  id: "glossary" | "formulas" | "figures" | "map" | "decision-tree" | "status" | "sources";
  href: string;
  title: string;
  short: string;
  /** handbook sections the page is built from */
  sections: string[];
}

export const REFERENCE_PAGES: ReferencePageDef[] = [
  {
    id: "map",
    href: "/reference/map",
    title: "Master Technology Map",
    short: "The handbook on one tree, from photon to industry, with branches linked to the Parts the handbook names for them.",
    sections: ["28.0", "front.laser-technology-hierarchy"],
  },
  {
    id: "decision-tree",
    href: "/reference/decision-tree",
    title: "Laser Selection Decision Tree",
    short: "Material class → requirement → candidate laser, plus the §23.3 process selection framework.",
    sections: ["B.5", "23.3"],
  },
  {
    id: "glossary",
    href: "/reference/glossary",
    title: "Glossary & Abbreviations",
    short: "Every handbook term and abbreviation, filterable, with A–Z jump links and stable anchors.",
    sections: ["B.1", "B.2"],
  },
  {
    id: "formulas",
    href: "/reference/formulas",
    title: "Formula Library",
    short: "All equations in the handbook, grouped by section, with the original images and related calculators.",
    sections: ["B.3"],
  },
  {
    id: "figures",
    href: "/reference/figures",
    title: "Figure Gallery",
    short: "Every diagram and equation image in the handbook, filterable by kind, with its review status.",
    sections: [],
  },
  {
    id: "status",
    href: "/reference/status",
    title: "Content & Validation Status",
    short: "What was extracted, what is flagged for review, and what this platform does not implement.",
    sections: [],
  },
  {
    id: "sources",
    href: "/reference/sources",
    title: "Sources & External Links",
    short: "The handbook's Sources page and every external link it cites.",
    sections: ["back.sources"],
  },
];

export function referencePage(id: ReferencePageDef["id"]): ReferencePageDef {
  const p = REFERENCE_PAGES.find((x) => x.id === id);
  if (!p) throw new Error(`unknown reference page ${id}`);
  return p;
}
