"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useMotionAllowed } from "@/components/shell/MotionProvider";

export interface CanvasFrame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** seconds since the loop started (frozen when motion is not allowed) */
  t: number;
  dt: number;
}

/** True while the element is at least partly inside the viewport. */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = "100px"): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(Boolean(e?.isIntersecting)), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

/**
 * Responsive, DPR-correct canvas with a draw callback.
 * - animate=true runs a requestAnimationFrame loop only while visible, the tab is
 *   shown and motion is allowed; otherwise a single static frame is drawn.
 * - The latest `draw` is always used (no stale closures) and every frame/observer
 *   is cleaned up on unmount.
 */
export function useCanvas(draw: (f: CanvasFrame) => void, { animate = false, deps = [] as unknown[] } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const motionAllowed = useMotionAllowed();
  const inView = useInView(canvasRef);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const tRef = useRef(0);

  // resize handling
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const apply = () => {
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: rect.width, h: rect.height, dpr };
      c.width = Math.max(1, Math.round(rect.width * dpr));
      c.height = Math.max(1, Math.round(rect.height * dpr));
      paint(0);
    };
    const ro = new ResizeObserver(apply);
    ro.observe(c);
    apply();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paint = (dt: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = size.current;
    if (w === 0 || h === 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawRef.current({ ctx, w, h, t: tRef.current, dt });
  };

  // static redraw when inputs change
  useEffect(() => {
    paint(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // animation loop
  useEffect(() => {
    if (!animate || !motionAllowed || !inView) {
      paint(0);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) {
        tRef.current += dt;
        paint(dt);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, motionAllowed, inView]);

  return { canvasRef, motionAllowed };
}

/** Theme colours for canvas drawing (mirrors app/globals.css tokens). */
export const VIZ = {
  bg: "#0a0f17",
  grid: "rgba(255,255,255,0.05)",
  gridStrong: "rgba(255,255,255,0.10)",
  axis: "rgba(255,255,255,0.28)",
  text: "#a9b2bd",
  textDim: "#6f7a88",
  textBright: "#e6eaee",
  teal: "#19b2ab",
  tealBright: "#59cec7",
  warn: "#e9b24c",
  danger: "#f2555a",
  concept: "#a68cff",
  info: "#5aa9ff",
  font: "12px var(--font-geist-mono), ui-monospace, monospace",
  fontSans: "12px var(--font-geist-sans), ui-sans-serif, system-ui",
};
