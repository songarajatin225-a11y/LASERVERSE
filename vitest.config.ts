import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    server: { deps: { inline: ["server-only"] } },
    alias: { "server-only": path.resolve(__dirname, "tests/unit/server-only-stub.ts") },
  },
});
