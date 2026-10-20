import type { Quantity } from "@/lib/physics/units";
import type { SourceRefData } from "@/components/ui/SourceRef";
import type { Classification } from "@/lib/content/classification";

export type CalcCategory = "physics" | "laser" | "pulse" | "beam" | "interaction" | "process" | "safety" | "economics";

export const CATEGORY_LABEL: Record<CalcCategory, string> = {
  physics: "Fundamental physics",
  laser: "Laser physics",
  pulse: "Pulse and power",
  beam: "Beam and optics",
  interaction: "Laser–material interaction",
  process: "Process and machine engineering",
  safety: "Laser safety",
  economics: "Product economics",
};

export interface NumberInput {
  key: string;
  label: string;
  symbol?: string;
  quantity: Quantity;
  /** default display unit id (see lib/physics/units) */
  unit: string;
  /** default value in the default unit */
  value: number;
  help?: string;
  /** label to show for dimensionless quantities (e.g. "1/m", "currency") */
  unitLabel?: string;
}

export interface ChoiceInput {
  key: string;
  label: string;
  choice: Array<{ value: string; label: string }>;
  value: string;
  help?: string;
}

export type CalcInputDef = NumberInput | ChoiceInput;
export const isChoice = (i: CalcInputDef): i is ChoiceInput => "choice" in i;

export interface CalcOutputDef {
  key: string;
  label: string;
  symbol?: string;
  /** omitted for text outputs */
  quantity?: Quantity;
  /** fixed display unit id; auto-selected when omitted */
  unit?: string;
  unitLabel?: string;
  sig?: number;
  primary?: boolean;
  help?: string;
}

export type CalcValues = Record<string, number>;
export type CalcChoices = Record<string, string>;
export type CalcResult = Record<string, number | string | null>;

export interface CalcExample {
  label: string;
  /** values in each input's default unit; choices by key */
  values: Record<string, number | string>;
  note?: string;
}

export interface CalculatorDef {
  id: string;
  title: string;
  category: CalcCategory;
  summary: string;
  inputs: CalcInputDef[];
  outputs: CalcOutputDef[];
  /** values in SI; throw CalcError for invalid input */
  compute: (v: CalcValues, c: CalcChoices) => CalcResult;
  equations: string[];
  variables: Array<{ symbol: string; meaning: string; unit: string }>;
  assumptions: string[];
  limitations?: string[];
  interpret?: (r: CalcResult, v: CalcValues, c: CalcChoices) => string[];
  sources: SourceRefData[];
  /** derived unless a calculator mixes external constants */
  classification: Classification;
  /** inputs whose default values are external (non-handbook) data */
  externalNote?: string;
  examples?: CalcExample[];
  related?: { calculators?: string[]; tools?: Array<{ label: string; href: string }> };
  keywords?: string;
}
