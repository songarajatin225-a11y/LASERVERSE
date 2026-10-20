import { Fragment } from "react";

/**
 * Renders compact symbol strings such as "z_R", "2z_{±5%}", "E_p,0", "w^2" with real
 * sub/superscripts. Plain text otherwise; no math engine needed for labels.
 */
export function Sym({ s, className }: { s: string; className?: string }) {
  const out: React.ReactNode[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) out.push(<Fragment key={out.length}>{buf}</Fragment>);
    buf = "";
  };
  while (i < s.length) {
    const ch = s[i]!;
    if ((ch === "_" || ch === "^") && i + 1 < s.length) {
      flush();
      let content = "";
      if (s[i + 1] === "{") {
        const end = s.indexOf("}", i + 2);
        content = s.slice(i + 2, end < 0 ? s.length : end);
        i = end < 0 ? s.length : end + 1;
      } else {
        const m = /^[A-Za-z0-9,.±%]+/.exec(s.slice(i + 1));
        content = m ? m[0] : s[i + 1]!;
        i += 1 + content.length;
      }
      out.push(
        ch === "_" ? (
          <sub key={out.length} className="text-[0.75em]">
            {content}
          </sub>
        ) : (
          <sup key={out.length} className="text-[0.75em]">
            {content}
          </sup>
        ),
      );
      continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return <span className={className}>{out}</span>;
}
