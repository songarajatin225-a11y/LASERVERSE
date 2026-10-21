import Link from "next/link";
import type { ReactNode } from "react";
import { hrefFor, outlineSection, partHrefByNumber } from "@/lib/content/outline";
import { romanToInt } from "@/lib/content/parts";

const XREF = /(§\s?(?:\d+|B)\.\d+(?:\s?[–-]\s?(?:\d+\.)?\d+)?)|(\bParts?\s+[IVXL]+(?:\s?[–-]\s?[IVXL]+)?\b)/g;

/** Turns "§9.2", "§23.5–23.6", "Part XXIV", "Parts XI–XII" into links to the corresponding lessons. */
export function linkRefs(text: string, keyBase = ""): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(XREF)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const token = m[0];
    let href: string | null = null;
    if (m[1]) {
      const id = token.replace(/§\s?/, "").split(/[–-]/)[0]!.trim();
      if (outlineSection(id)) href = hrefFor(id);
    } else {
      const n = romanToInt(token.replace(/Parts?\s+/, "").split(/[–-]/)[0]!.trim());
      if (n && n >= 1 && n <= 28) href = partHrefByNumber(n);
    }
    out.push(
      href ? (
        <Link key={`${keyBase}x${at}`} href={href} className="text-teal-300 underline decoration-teal-300/30 underline-offset-[3px]">
          {token}
        </Link>
      ) : (
        token
      ),
    );
    last = at + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
