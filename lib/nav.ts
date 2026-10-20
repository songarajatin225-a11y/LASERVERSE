import {
  Home,
  GraduationCap,
  ClipboardCheck,
  Atom,
  Zap,
  Target,
  Flame,
  Workflow,
  Box,
  Factory,
  Calculator,
  Cpu,
  ShieldCheck,
  Wrench,
  Library,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** The fifteen product areas, grouped for the sidebar and command palette. */
export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "home", label: "Home", href: "/home", icon: Home, description: "Your progress, bookmarks and the fastest routes into the tools." },
      { id: "learn", label: "Learn", href: "/learn", icon: GraduationCap, description: "The handbook's 28 parts as a six-level academy with role paths." },
      { id: "assessments", label: "Assessments", href: "/assessments", icon: ClipboardCheck, description: "Source-grounded quizzes and numerical exercises." },
    ],
  },
  {
    label: "Laboratories",
    items: [
      { id: "physics-lab", label: "Physics Lab", href: "/physics-lab", icon: Atom, description: "Photons, waves, polarisation, energy levels, cavities and pulses." },
      { id: "sources", label: "Laser Source Explorer", href: "/sources", icon: Zap, description: "Every source family in the handbook, filterable and comparable." },
      { id: "beam-optics", label: "Beam & Optics Lab", href: "/beam-optics", icon: Target, description: "Gaussian propagation, focusing design, BPP and optical components." },
      { id: "materials", label: "Material Interaction", href: "/materials", icon: Flame, description: "Absorption, penetration, thermal diffusion and process regimes." },
      { id: "processes", label: "Process Simulator", href: "/processes", icon: Workflow, description: "Marking, welding, cutting, cleaning, drilling and wavelength choice." },
      { id: "machine", label: "3D Machine Explorer", href: "/machine", icon: Box, description: "A Class 1 fiber marking workstation you can open, explode and trace." },
    ],
  },
  {
    label: "Engineering",
    items: [
      { id: "applications", label: "Industrial Applications", href: "/applications", icon: Factory, description: "Industry → product → component → process → laser → machine." },
      { id: "calculators", label: "Engineering Calculators", href: "/calculators", icon: Calculator, description: "Unit-aware, tested calculators with equations and assumptions." },
      { id: "architecture", label: "Architecture & Automation", href: "/architecture", icon: Cpu, description: "Control stack, vision loop, handshakes, interlocks and a configurator." },
      { id: "safety", label: "Safety & Quality", href: "/safety", icon: ShieldCheck, description: "Laser classes, hazards, standards, metrology and checklists." },
      { id: "troubleshooting", label: "Troubleshooting", href: "/troubleshooting", icon: Wrench, description: "Symptom → causes → checks → actions → verification." },
    ],
  },
  {
    label: "Reference",
    items: [{ id: "reference", label: "Reference Library", href: "/reference", icon: Library, description: "Glossary, formulas, figures, tables, maps and content status." }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
}
