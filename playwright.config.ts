import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
import "dotenv/config";

const PORT = 3311;

// Only the sandbox this project was first built in ships a pre-installed
// Chromium at a fixed path with browser downloads disabled. Everywhere
// else (a developer's own machine, CI) has no reason to have that exact
// path, so this must never be a hard default - it would make `npx
// playwright test` fail on every other machine with a confusing "no such
// file" instead of Playwright's normal "browser not installed, run npx
// playwright install" message. Resolve order: explicit env var, then the
// known sandbox path only if it actually exists, otherwise leave it unset
// so Playwright uses its own managed browser (run `npx playwright install
// chromium` once locally if you see a missing-browser error).
const SANDBOX_CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    // /login is the one page that never requires a session, so it's a
    // reliable readiness check regardless of the auth changes elsewhere.
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
