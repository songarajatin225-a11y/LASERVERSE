"use client";

import { useRef, useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * Local, per-browser persistence for learning progress, bookmarks, quiz attempts,
 * checklists, recent activity and settings. Nothing leaves the device.
 *
 * Completion rule (documented in docs/PRODUCT_ARCHITECTURE.md):
 *   a lesson is "completed" when the learner either answers every knowledge
 *   check attached to it correctly, or explicitly marks it complete after opening it.
 */
const STORAGE_KEY = "laserverse:v1";

const ItemRef = z.object({
  id: z.string(),
  kind: z.enum(["lesson", "part", "tool", "calculator", "application", "quiz", "reference", "page"]),
  title: z.string(),
  href: z.string(),
});
export type ItemRef = z.infer<typeof ItemRef>;

const QuizAttempt = z.object({
  quizId: z.string(),
  at: z.string(),
  score: z.number(),
  total: z.number(),
  answers: z.record(z.object({ correct: z.boolean(), response: z.string() })),
});
export type QuizAttempt = z.infer<typeof QuizAttempt>;

const StateSchema = z.object({
  version: z.literal(1),
  lessons: z.record(
    z.object({ openedAt: z.string(), lastOpenedAt: z.string(), completedAt: z.string().optional(), via: z.enum(["check", "manual"]).optional() }),
  ),
  checks: z.record(z.object({ correct: z.boolean(), at: z.string() })),
  bookmarks: z.array(ItemRef.extend({ at: z.string() })),
  recent: z.array(ItemRef.extend({ at: z.string() })),
  quizAttempts: z.array(QuizAttempt),
  checklists: z.record(z.record(z.boolean())),
  settings: z.object({ motion: z.enum(["system", "reduce", "full"]) }),
});
export type PersistedState = z.infer<typeof StateSchema>;

const EMPTY: PersistedState = {
  version: 1,
  lessons: {},
  checks: {},
  bookmarks: [],
  recent: [],
  quizAttempts: [],
  checklists: {},
  settings: { motion: "system" },
};

let state: PersistedState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): PersistedState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = StateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = load();
    loaded = true;
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        state = load();
        listeners.forEach((l) => l());
      }
    });
  }
}

function commit(next: PersistedState) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: keep in-memory state */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  ensureLoaded();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getState(): PersistedState {
  ensureLoaded();
  return state;
}

/**
 * Subscribe to a slice of persisted state. The selected value is cached per state
 * object so selectors that derive arrays/objects keep a stable snapshot identity
 * (required by useSyncExternalStore).
 */
export function usePersisted<T>(selector: (s: PersistedState) => T): T {
  const cache = useRef<{ state: PersistedState; value: T } | null>(null);
  const serverCache = useRef<{ value: T } | null>(null);
  const read = () => {
    const s = getState();
    if (cache.current && cache.current.state === s) return cache.current.value;
    const value = selector(s);
    cache.current = { state: s, value };
    return value;
  };
  const readServer = () => {
    if (!serverCache.current) serverCache.current = { value: selector(EMPTY) };
    return serverCache.current.value;
  };
  return useSyncExternalStore(subscribe, read, readServer);
}

const now = () => new Date().toISOString();

export const actions = {
  openLesson(id: string) {
    const s = getState();
    const prev = s.lessons[id];
    commit({ ...s, lessons: { ...s.lessons, [id]: { ...prev, openedAt: prev?.openedAt ?? now(), lastOpenedAt: now() } } });
  },
  completeLesson(id: string, via: "check" | "manual") {
    const s = getState();
    const prev = s.lessons[id] ?? { openedAt: now(), lastOpenedAt: now() };
    if (prev.completedAt) return;
    commit({ ...s, lessons: { ...s.lessons, [id]: { ...prev, completedAt: now(), via } } });
  },
  uncompleteLesson(id: string) {
    const s = getState();
    const prev = s.lessons[id];
    if (!prev) return;
    const { completedAt: _c, via: _v, ...rest } = prev;
    commit({ ...s, lessons: { ...s.lessons, [id]: rest } });
  },
  recordCheck(questionId: string, correct: boolean) {
    const s = getState();
    commit({ ...s, checks: { ...s.checks, [questionId]: { correct, at: now() } } });
  },
  toggleBookmark(item: ItemRef) {
    const s = getState();
    const exists = s.bookmarks.some((b) => b.id === item.id);
    commit({
      ...s,
      bookmarks: exists ? s.bookmarks.filter((b) => b.id !== item.id) : [{ ...item, at: now() }, ...s.bookmarks],
    });
  },
  pushRecent(item: ItemRef) {
    const s = getState();
    const rest = s.recent.filter((r) => r.id !== item.id);
    commit({ ...s, recent: [{ ...item, at: now() }, ...rest].slice(0, 30) });
  },
  recordQuiz(attempt: Omit<QuizAttempt, "at">) {
    const s = getState();
    commit({ ...s, quizAttempts: [...s.quizAttempts, { ...attempt, at: now() }].slice(-200) });
  },
  setChecklistItem(listId: string, itemId: string, checked: boolean) {
    const s = getState();
    commit({ ...s, checklists: { ...s.checklists, [listId]: { ...s.checklists[listId], [itemId]: checked } } });
  },
  resetChecklist(listId: string) {
    const s = getState();
    const { [listId]: _removed, ...rest } = s.checklists;
    commit({ ...s, checklists: rest });
  },
  setMotion(motion: PersistedState["settings"]["motion"]) {
    const s = getState();
    commit({ ...s, settings: { ...s.settings, motion } });
  },
  resetAll() {
    commit(EMPTY);
  },
  exportJson(): string {
    return JSON.stringify(getState(), null, 2);
  },
};
