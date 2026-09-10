import ExcelJS from "exceljs";
import type { CategorizedRow } from "./auditPipeline";

const FINDING_TYPE_LABEL: Record<string, string> = {
  COMMISSION_MISMATCH: "אי-התאמת עמלה",
  SPLIT_IMBALANCE: "פיצול לא מאוזן",
  NEGATIVE_COMMISSION_ON_DECREASE: "עמלה שלילית על הפחתה",
  RULE_NOT_CONFIGURED: "אין כלל מוגדר",
};

const COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: "נכס", key: "assetId", width: 26 },
  { header: "סוג ממצא", key: "findingLabel", width: 22 },
  { header: "עמלה צפויה (₪)", key: "expectedValue", width: 16, style: { numFmt: "#,##0.00" } },
  { header: "עמלה בפועל (₪)", key: "actualValue", width: 16, style: { numFmt: "#,##0.00" } },
  { header: "הפרש (₪)", key: "diff", width: 14, style: { numFmt: "#,##0.00" } },
  { header: "הסבר", key: "explanation", width: 70 },
];

function addSheet(workbook: ExcelJS.Workbook, title: string, rows: CategorizedRow[]) {
  const sheet = workbook.addWorksheet(title, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: "right" };

  for (const row of rows) {
    sheet.addRow({
      assetId: row.assetId,
      findingLabel: row.findingType ? FINDING_TYPE_LABEL[row.findingType] ?? row.findingType : "תקין",
      expectedValue: row.expectedValue,
      actualValue: row.actualValue,
      diff: row.diff,
      explanation: row.explanation,
    });
  }

  for (const row of sheet.getRows(2, Math.max(rows.length, 1)) ?? []) {
    row.alignment = { horizontal: "right", wrapText: true };
  }
}

/**
 * One workbook, three sheets - clean / review / critical - so a reader
 * can act on each list separately instead of filtering one giant table.
 * Same row shape as what /upload renders on screen, just written to
 * disk-native format instead of HTML.
 */
export async function buildAuditWorkbook(rows: CategorizedRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "מערכת ביקורת ארנונה";
  workbook.created = new Date();

  addSheet(workbook, "תקינים", rows.filter((r) => r.category === "CLEAN"));
  addSheet(workbook, "לבדיקה", rows.filter((r) => r.category === "REVIEW"));
  addSheet(workbook, "קריטי", rows.filter((r) => r.category === "CRITICAL"));

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
