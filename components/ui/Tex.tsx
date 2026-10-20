import katex from "katex";
import { cn } from "./primitives";

/**
 * KaTeX renderer usable from server and client components. Errors render the raw
 * source in a visible "unparsed" box instead of failing silently.
 */
export function Tex({ math, display = false, className }: { math: string; display?: boolean; className?: string }) {
  let html: string;
  try {
    html = katex.renderToString(math, { displayMode: display, throwOnError: true, strict: "ignore", output: "html" });
  } catch {
    return (
      <code className={cn("rounded border border-danger/40 px-1 text-danger", className)} title="Equation could not be parsed">
        {math}
      </code>
    );
  }
  return <span className={cn(display ? "block" : "inline", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
