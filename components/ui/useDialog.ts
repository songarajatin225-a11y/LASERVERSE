"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog keyboard behaviour: Tab/Shift+Tab stay inside `container`, Escape calls
 * `onClose`, focus moves into the dialog when it opens and returns to the previously
 * focused element when it closes. Each part can be switched off for dialogs that
 * already handle it themselves.
 */
export function useDialog(
  open: boolean,
  container: RefObject<HTMLElement | null>,
  onClose: () => void,
  { escape = true, initialFocus = true, restoreFocus = true }: { escape?: boolean; initialFocus?: boolean; restoreFocus?: boolean } = {},
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = container.current;
    if (initialFocus && el) {
      const first = el.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? el).focus({ preventScroll: true });
    }
    const onKey = (e: KeyboardEvent) => {
      const root = container.current;
      if (!root) return;
      if (escape && e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (restoreFocus && previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [open, container, escape, initialFocus, restoreFocus]);
}
