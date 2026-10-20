"use client";

import { motion } from "framer-motion";
import { duration, ease } from "@/components/motion/tokens";

/** Page entry: a short fade/rise on every in-app navigation (instant under reduced motion). */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: duration.base, ease: ease.out }}>
      {children}
    </motion.div>
  );
}
