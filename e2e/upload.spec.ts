import path from "node:path";
import { expect, test } from "@playwright/test";
import { signInAs } from "./auth-helper";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "monthly-export.xls");

test.beforeEach(async ({ context, baseURL }) => {
  await signInAs(context, baseURL!);
});

// End-to-end proof that the real pipeline works, not just the unit-tested
// pieces in isolation: a browser uploads the fixture file, the Server
// Action (src/app/(app)/upload/actions.ts) parses it and runs the audit
// engine entirely server-side, and the client renders whatever comes back
// - no mocking on either side.
test("uploading the monthly export renders three separate CLEAN / REVIEW / CRITICAL lists", async ({ page }) => {
  await page.goto("/upload");

  await page.setInputFiles("#excelFile", FIXTURE_PATH);
  // "מערב ירושלים" (West) is the default-checked radio - the fixture's
  // commission figures were computed against the West side's rules.
  await page.getByRole("button", { name: "הרץ ביקורת" }).click();

  await expect(page.getByText("שורות שנבדקו")).toBeVisible();

  // CRITICAL section (open by default): row 2, commission tampered to 500
  // against an expected 9.40% * 155.95 = 14.66.
  const criticalSection = page.locator("details", { has: page.getByText("קריטי") }).first();
  await expect(criticalSection).toContainText("30074-009-000-1018");
  await expect(criticalSection).toContainText("14.66");
  await expect(criticalSection).toContainText("500");

  // REVIEW section (open by default): row 3, a levy decrease that still
  // recorded a positive commission - flagged for human judgment, not
  // asserted as an outright error.
  const reviewSection = page.locator("details", { has: page.getByText("לבדיקה") }).first();
  await expect(reviewSection).toContainText("30569-421-014-0062");

  // CLEAN section is collapsed by default - expand it and confirm row 1
  // (left correctly priced) shows up there, with its calculation
  // explained rather than just being absent.
  const cleanSection = page.locator("details", { has: page.getByText("תקינים") }).first();
  await cleanSection.locator("summary").click();
  await expect(cleanSection).toContainText("30006-030-004-0072");
  await expect(cleanSection).toContainText("1,466.6"); // he-IL locale formatting adds the thousands comma

  // The finished workbook is ready to download.
  await expect(page.getByRole("button", { name: /הורדת אקסל/ })).toBeEnabled();
});

test("rejects a submission with no file selected", async ({ page }) => {
  await page.goto("/upload");
  await page.getByRole("button", { name: "הרץ ביקורת" }).click();
  // The browser's own `required` validation blocks submission - the
  // Server Action's own "יש לבחור קובץ" message is the fallback if that
  // native check is ever bypassed.
  await expect(page.getByText("שורות שנבדקו")).toHaveCount(0);
});

test("redirects an unauthenticated visitor to /login", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/upload");
  await expect(page).toHaveURL(/\/login/);
});
