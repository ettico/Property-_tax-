"use server";

import { categorizeRows } from "@/lib/auditPipeline";
import { verifySession } from "@/lib/dal";
import { buildAuditWorkbook } from "@/lib/excelExport";
import { parseAshedMonthlyExport } from "@/lib/excelParser";
import { SEED_COMMISSION_RULES } from "@/lib/rules.seed";
import type { Side } from "@/lib/types";
import type { AuditRunState } from "./types";

/**
 * Server Action: the only place this app parses an uploaded file or runs
 * the audit engine. The file's bytes and every row of the parsed export
 * stay on the server; the client only ever receives the resulting
 * categorized rows/summary and, if requested, the finished .xlsx bytes -
 * never the raw file content.
 *
 * `side` is a temporary stand-in for the real per-property zone lookup
 * (Appendix D of the tax order, not loaded yet) - see README "מה עדיין
 * חסור". Until that table exists, the whole uploaded batch is checked as
 * one side, chosen on the form.
 */
export async function runMonthlyAudit(
  _prevState: AuditRunState,
  formData: FormData,
): Promise<AuditRunState> {
  await verifySession(); // redirects to /login if the session cookie is missing/invalid

  const file = formData.get("excelFile");
  const side = formData.get("side");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", error: "יש לבחור קובץ אקסל חודשי (.xls) לפני ההרצה." };
  }
  if (side !== "EAST" && side !== "WEST") {
    return { status: "error", error: "יש לבחור צד: מזרח או מערב ירושלים." };
  }

  const html = await file.text();
  const { rows, warnings } = parseAshedMonthlyExport(html);

  if (rows.length === 0) {
    return {
      status: "error",
      error: "לא נמצאו שורות נתונים בקובץ. ודאי שזה קובץ הייצוא החודשי המקורי של אשד (.xls), לא קובץ אחר.",
    };
  }

  const resolvedSide = side as Side;
  const results = categorizeRows(rows, SEED_COMMISSION_RULES, {
    resolveSide: () => resolvedSide,
  });

  const workbook = await buildAuditWorkbook(results);

  return {
    status: "success",
    rowCount: rows.length,
    parseWarnings: warnings.map((w) => w.message),
    results,
    workbookBase64: workbook.toString("base64"),
  };
}
