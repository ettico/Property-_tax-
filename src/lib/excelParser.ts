import * as cheerio from "cheerio";
import { mapActionTypeLabel } from "./actionTypeMap";
import type { ActionType } from "./types";

/**
 * Ashed's monthly "Excel" export is not a real .xls binary - it's an HTML
 * table saved with an .xls extension (a Telerik/ASP.NET grid export, the
 * kind that opens fine in Excel but is plain HTML on disk). This parser
 * reads that HTML directly rather than going through a binary spreadsheet
 * library.
 *
 * Column order is fixed by the source system (confirmed against a real
 * export) rather than by header text, which is more robust here than
 * re-deriving the two-row merged header.
 */
const COLUMN_ORDER = [
  "assetId", // זיהוי נכס
  "accountNumber", // מספר חשבון
  "installment", // מנה
  "inspector", // פוקד
  "effectiveDate", // תאריך תחולה
  "oldArea", // שטח ישן
  "oldTaxCode", // קובעי מס ישן
  "changeDate", // תאריך שינוי
  "newArea", // שטח חדש
  "newTaxCode", // קובעי מס חדש
  "checkStatus", // סטטוס בדיקה
  "areaDiff", // הפרש שטחים
  "levyIncrease", // תוספת חיוב (שח)
  "commissionPaid", // סך עמלה (שח)
  "actionLabel", // מהות פעולה
  "split", // פיצול
  "reductionCancelled", // בוטלה הפחתה
  "changeFactorModified", // שונה גורם שינוי
  "invoiceA", // חשבונית א
  "invoiceB", // חשבונית ב
] as const;

export interface ParsedPropertyRow {
  assetId: string;
  gush: string;
  chelka: string;
  subChelka: string;
  accountNumber: string;
  effectiveDate: string | null; // ISO
  changeDate: string; // ISO
  oldArea: number | null;
  oldTaxCode: number | null;
  newArea: number;
  newTaxCode: number;
  areaDiff: number;
  levyIncrease: number;
  commissionPaid: number;
  actionLabel: string;
  actionType: ActionType | null;
  rowIndex: number;
}

export interface ParseWarning {
  rowIndex: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedPropertyRow[];
  warnings: ParseWarning[];
}

export function parseAshedMonthlyExport(html: string): ParseResult {
  const $ = cheerio.load(html);
  const table = $("table").first();
  const rows: ParsedPropertyRow[] = [];
  const warnings: ParseWarning[] = [];

  const bodyRows = table.find("tbody > tr").length
    ? table.find("tbody > tr")
    : table.find("tr");

  let rowIndex = 0;
  bodyRows.each((_, trEl) => {
    const cells = $(trEl)
      .find("td")
      .map((__, td) => $(td).text().trim())
      .get();

    if (cells.length === 0 || cells.every((c) => c === "")) return; // spacer row
    if (cells.length < COLUMN_ORDER.length) {
      warnings.push({ rowIndex, message: `שורה עם ${cells.length} תאים בלבד (צריך ${COLUMN_ORDER.length}) - דולגה.` });
      rowIndex++;
      return;
    }

    const raw: Record<string, string> = {};
    COLUMN_ORDER.forEach((key, i) => {
      raw[key] = cells[i] ?? "";
    });

    if (!raw.assetId) {
      rowIndex++;
      return;
    }

    const idParts = raw.assetId.split("-");
    const gush = idParts[0] ?? "";
    const chelka = idParts[1] ?? "";
    const subChelka = idParts.slice(2).join("-");

    const actionType = mapActionTypeLabel(raw.actionLabel);
    if (!actionType) {
      warnings.push({
        rowIndex,
        message: `סוג פעולה לא מוכר: "${raw.actionLabel}" (נכס ${raw.assetId}) - לא ניתן לחשב עמלה צפויה בלי מיפוי.`,
      });
    }

    const changeDate = parseIsraeliDate(raw.changeDate);
    if (!changeDate) {
      warnings.push({ rowIndex, message: `תאריך שינוי לא תקין: "${raw.changeDate}" (נכס ${raw.assetId})` });
    }

    rows.push({
      assetId: raw.assetId,
      gush,
      chelka,
      subChelka,
      accountNumber: raw.accountNumber,
      effectiveDate: parseIsraeliDate(raw.effectiveDate),
      changeDate: changeDate ?? "",
      oldArea: parseNumber(raw.oldArea),
      oldTaxCode: parseNumber(raw.oldTaxCode),
      newArea: parseNumber(raw.newArea) ?? 0,
      newTaxCode: parseNumber(raw.newTaxCode) ?? 0,
      areaDiff: parseNumber(raw.areaDiff) ?? 0,
      levyIncrease: parseNumber(raw.levyIncrease) ?? 0,
      commissionPaid: parseNumber(raw.commissionPaid) ?? 0,
      actionLabel: raw.actionLabel,
      actionType,
      rowIndex,
    });

    rowIndex++;
  });

  return { rows, warnings };
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Source dates are dd/mm/yyyy.
function parseIsraeliDate(value: string): string | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
