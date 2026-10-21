"use client";

import { MotionConfig, useReducedMotion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { usePersisted } from "@/lib/persistence/store";

/**
 * Motion preference: "system" follows prefers-reduced-motion, "reduce" forces calm mode,
 * "full" enables all motion. Applied to Framer Motion, CSS (html[data-motion]) and
 * read by canvas/WebGL scenes through useMotionAllowed().
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const pref = usePersisted((s) => s.settings.motion);
  useEffect(() => {
    const el = document.documentElement;
    if (pref === "reduce") el.dataset.motion = "reduce";
    else delete el.dataset.motion;
  }, [pref]);
  return <MotionConfig reducedMotion={pref === "reduce" ? "always" : pref === "full" ? "never" : "user"}>{children}</MotionConfig>;
}

/** True when continuous animation (canvas loops, 3D auto-motion) may run. */
export function useMotionAllowed(): boolean {
  const pref = usePersisted((s) => s.settings.motion);
  const systemReduced = useReducedMotion();
  if (pref === "reduce") return false;
  if (pref === "full") return true;
  return !systemReduced;
}
