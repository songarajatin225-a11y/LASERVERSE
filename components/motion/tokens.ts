/**
 * Motion language for LASERVERSE.
 *
 * - Entrances use expo-out: fast start, long settle — reads as "precise".
 * - Durations scale with travel distance and importance, not one global value.
 * - Springs are reserved for direct manipulation (drag, selection, camera).
 * Framer Motion owns DOM/SVG animation; React Three Fiber's frame loop owns 3D.
 */
export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.83, 0, 0.17, 1] as const,
  standard: [0.4, 0, 0.2, 1] as const,
};

export const duration = {
  instant: 0.12,
  fast: 0.2,
  base: 0.36,
  slow: 0.6,
  cinematic: 1.1,
};

export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const,
  gentle: { type: "spring", stiffness: 170, damping: 26 } as const,
  layout: { type: "spring", stiffness: 300, damping: 32 } as const,
};

export const stagger = { tight: 0.035, base: 0.06, loose: 0.1 };

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
};
