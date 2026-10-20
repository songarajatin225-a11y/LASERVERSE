const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };

export function romanToInt(r: string): number | null {
  const s = r.trim().toUpperCase();
  if (!/^[IVXL]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN_VALUES[s[i]!]!;
    const next = ROMAN_VALUES[s[i + 1] ?? ""] ?? 0;
    total += v < next ? -v : v;
  }
  return total;
}

/** Parse handbook part lists such as "I–IV, IX, X", "Parts XIII–XV", "XI, XII, XXVI". */
export function parsePartList(text: string): number[] {
  const out = new Set<number>();
  const cleaned = text.replace(/Parts?/gi, " ").replace(/\(.*?\)/g, " ");
  for (const chunk of cleaned.split(/[,;]/)) {
    const m = chunk.trim().match(/^([IVXL]+)\s*(?:[–-]\s*([IVXL]+))?/i);
    if (!m) continue;
    const a = romanToInt(m[1]!);
    const b = m[2] ? romanToInt(m[2]) : a;
    if (a && b) for (let k = Math.min(a, b); k <= Math.max(a, b); k++) out.add(k);
  }
  return [...out].sort((x, y) => x - y);
}
