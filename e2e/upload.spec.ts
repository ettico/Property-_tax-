import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "monthly-export.xls");

// End-to-end proof that the real pipeline works, not just the unit-tested
// pieces in isolation: a browser uploads the fixture file, the Server
// Action (src/app/upload/actions.ts) parses it and runs the audit engine
// entirely server-side, and the client renders whatever comes back - no
// mocking on either side.
test("uploading the monthly export renders the expected findings", async ({ page }) => {
  await page.goto("/upload");

  await page.setInputFiles("#excelFile", FIXTURE_PATH);
  // "מערב ירושלים" (West) is the default-checked radio - the fixture's
  // commission figures were computed against the West side's rules.
  await page.getByRole("button", { name: "הרץ ביקורת" }).click();

  await expect(page.getByText("שורות שנבדקו")).toBeVisible();
  await expect(page.getByText("3", { exact: true })).toBeVisible();

  const table = page.locator("table");
  await expect(table).toBeVisible();

  // Row 1 (30006-030-004-0072) was left correctly priced - it must not
  // appear as a finding.
  await expect(table.getByText("30006-030-004-0072")).toHaveCount(0);

  // Row 2: commission tampered to 500 against an expected 9.40% * 155.95 = 14.66.
  const mismatchRow = table.locator("tr", { has: page.getByText("30074-009-000-1018") });
  await expect(mismatchRow).toContainText("קריטי");
  await expect(mismatchRow).toContainText("14.66");
  await expect(mismatchRow).toContainText("500");

  // Row 3: a levy decrease that still recorded a positive commission -
  // flagged for human review, not asserted as an outright error.
  const decreaseRow = table.locator("tr", { has: page.getByText("30569-421-014-0062") });
  await expect(decreaseRow).toContainText("לבדיקה");
});

test("rejects a submission with no file selected", async ({ page }) => {
  await page.goto("/upload");
  await page.getByRole("button", { name: "הרץ ביקורת" }).click();
  // The browser's own `required` validation blocks submission - the
  // Server Action's own "יש לבחור קובץ" message is the fallback if that
  // native check is ever bypassed.
  await expect(page.locator("table")).toHaveCount(0);
});
