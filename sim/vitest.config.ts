import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/engine.ts", "src/settle.ts", "src/ledger.ts", "src/util.ts"],
      reporter: ["text"],
    },
  },
});
