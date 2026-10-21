import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 builds a fully static site into out/ (used for GitHub Pages);
 * NEXT_PUBLIC_BASE_PATH sets the sub-path it is served under, e.g. "/LASERVERSE".
 */
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const, trailingSlash: true } : {}),
  ...(basePath ? { basePath } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // The handbook JSON is large and must stay on the server: it is only imported
  // from server components and route handlers (enforced with `server-only`).
  experimental: {
    optimizePackageImports: ["@react-three/drei", "framer-motion"],
  },
};

export default nextConfig;
