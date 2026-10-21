/**
 * Path prefix the app is served under — e.g. "/LASERVERSE" for the GitHub Pages export —
 * and empty for a normal deployment. Next.js applies it to <Link>, the router and its own
 * assets; raw URLs (img src, fetch, history) go through withBase().
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? `${BASE_PATH}${path}` : path;
}
