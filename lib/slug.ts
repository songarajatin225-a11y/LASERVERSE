const SUBS: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "²": "2", "³": "3", "µ": "u", "é": "e" };

/** URL/anchor slug shared by every page and the search index (subscripts transliterated). */
export function slug(s: string): string {
  return s
    .replace(/[₀-₉²³µé]/g, (c) => SUBS[c] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
