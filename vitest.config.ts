import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // e2e/ holds Playwright specs, run separately via `npm run test:e2e` -
    // vitest's default include pattern would otherwise try (and fail) to
    // run them itself.
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
