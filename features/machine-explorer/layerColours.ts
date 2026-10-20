import type { Layer } from "./machineData";

/** Display colours for layer chips (a UI convention, not a standard). */
export const LAYER_COLOUR: Record<Layer, string> = {
  optical: "#ff6b9a",
  mechanical: "#b9c0c8",
  vision: "#7fb2ff",
  automation: "#38d6cf",
  safety: "#ffb547",
};
