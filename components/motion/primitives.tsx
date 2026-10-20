"use client";

import { motion, useInView, type HTMLMotionProps } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { duration, ease, stagger as staggerTokens, fadeUp } from "./tokens";

/** Section/element reveal on first entry into the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: duration.slow, ease: ease.out, delay }}
    >
      {children}
    </Comp>
  );
}

/** Parent that staggers its <StaggerItem> children when it enters the viewport. */
export function Stagger({
  children,
  className,
  gap = staggerTokens.base,
  ...rest
}: { children: ReactNode; className?: string; gap?: number } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/** Word-by-word masked headline reveal. Text stays a single accessible string. */
export function HeadlineReveal({
  text,
  className,
  delay = 0,
  as = "h1",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true });
  const words = text.split(" ");
  const Tag = as;
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "105%" }}
            animate={inView ? { y: "0%" } : undefined}
            transition={{ duration: duration.cinematic, ease: ease.out, delay: delay + i * 0.08 }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Calculator result update: the new value cross-fades in with a short teal underline
 * flash. Values are never tweened through intermediate numbers, which would show
 * physically meaningless transient results.
 */
export function ResultFlash({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <motion.span
        key={value}
        className="inline-block"
        initial={{ opacity: 0.25, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.fast, ease: ease.out }}
      >
        {children}
      </motion.span>
      <motion.span
        key={`${value}-bar`}
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-teal-400"
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: duration.slow, ease: ease.out }}
      />
    </span>
  );
}
