import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { CategorizedRow } from "../auditPipeline";
import { buildAuditWorkbook } from "../excelExport";

const ROWS: CategorizedRow[] = [
  {
    assetId: "clean-1",
    rowIndex: 0,
    category: "CLEAN",
    expectedValue: 94,
    actualValue: 94,
    diff: 0,
    explanation: "9.4% × 1,000 ש\"ח תוספת חיוב.",
  },
  {
    assetId: "review-1",
    rowIndex: 1,
    category: "REVIEW",
    findingType: "NEGATIVE_COMMISSION_ON_DECREASE",
    expectedValue: 0,
    actualValue: 13.4,
    diff: 13.4,
    explanation: "עמלה על הפחתת חיוב.",
  },
  {
    assetId: "critical-1",
    rowIndex: 2,
    category: "CRITICAL",
    findingType: "COMMISSION_MISMATCH",
    expectedValue: 14.66,
    actualValue: 500,
    diff: 485.34,
    explanation: "אי-התאמה.",
  },
];

describe("buildAuditWorkbook", () => {
  it("writes one sheet per category, each with only its own rows", async () => {
    const buffer = await buildAuditWorkbook(ROWS);
    const workbook = new ExcelJS.Workbook();
    // exceljs's own .d.ts merges a broken `interface Buffer extends
    // ArrayBuffer {}` into the global Buffer type, which newer
    // @types/node's real Buffer no longer structurally satisfies - an
    // exceljs packaging issue, not a real type error in our code.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);

    expect(workbook.worksheets.map((s) => s.name)).toEqual(["תקינים", "לבדיקה", "קריטי"]);

    // Column keys (e.g. "assetId") only exist on the in-memory workbook
    // that wrote the file - a workbook loaded back from the buffer only
    // has positional columns, per exceljs. Column order: assetId(1),
    // findingLabel(2), expectedValue(3), actualValue(4), diff(5), explanation(6).
    const clean = workbook.getWorksheet("תקינים")!;
    expect(clean.rowCount).toBe(2); // header + 1 data row
    expect(clean.getRow(2).getCell(1).value).toBe("clean-1");

    const review = workbook.getWorksheet("לבדיקה")!;
    expect(review.getRow(2).getCell(1).value).toBe("review-1");
    expect(review.getRow(2).getCell(2).value).toBe("עמלה שלילית על הפחתה");

    const critical = workbook.getWorksheet("קריטי")!;
    expect(critical.getRow(2).getCell(1).value).toBe("critical-1");
  });

  it("produces an empty (header-only) sheet rather than omitting it when a category has no rows", async () => {
    const buffer = await buildAuditWorkbook([ROWS[0]]);
    const workbook = new ExcelJS.Workbook();
    // exceljs's own .d.ts merges a broken `interface Buffer extends
    // ArrayBuffer {}` into the global Buffer type, which newer
    // @types/node's real Buffer no longer structurally satisfies - an
    // exceljs packaging issue, not a real type error in our code.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);

    expect(workbook.getWorksheet("לבדיקה")!.rowCount).toBe(1); // header only
    expect(workbook.getWorksheet("קריטי")!.rowCount).toBe(1);
  });
});
