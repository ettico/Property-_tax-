import { defineConfig } from "@playwright/test";

const PORT = 3311;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // This environment ships a pre-installed Chromium and disables
    // Playwright's own browser download - point at it explicitly instead
    // of the default managed browser path.
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
    },
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/upload`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
