import { compareCommission } from "./commissionEngine";
import type { ParsedPropertyRow } from "./excelParser";
import { findSplitImbalances } from "./splitCheck";
import type { CommissionRule, Side } from "./types";

export type FindingType =
  | "COMMISSION_MISMATCH"
  | "SPLIT_IMBALANCE"
  | "NEGATIVE_COMMISSION_ON_DECREASE"
  | "RULE_NOT_CONFIGURED";

// Only REVIEW and CRITICAL are ever actually produced below - no code
// path assigns "INFO", so it's not offered as a type option here.
export type FindingSeverity = "REVIEW" | "CRITICAL";
export type RowCategory = "CLEAN" | FindingSeverity;

export interface Finding {
  assetId: string;
  rowIndex: number;
  findingType: FindingType;
  severity: FindingSeverity;
  expectedValue: number | null;
  actualValue: number | null;
  diff: number | null;
  explanation: string;
}

// One row's full audit outcome, clean or not - unlike Finding, this exists
// for every row that could be evaluated, so a clean row's calculation is
// just as visible (and just as explained) as a flagged one.
export interface CategorizedRow {
  assetId: string;
  rowIndex: number;
  category: RowCategory;
  findingType?: FindingType;
  expectedValue: number | null;
  actualValue: number | null;
  diff: number | null;
  explanation: string;
}

export interface AuditOptions {
  resolveSide: (gush: string, chelka: string) => Side | null;
  toleranceIls?: number;
}

function evaluateRow(row: ParsedPropertyRow, rules: CommissionRule[], options: AuditOptions): CategorizedRow {
  const tolerance = options.toleranceIls ?? 0.05;

  if (!row.actionType) {
    return {
      assetId: row.assetId,
      rowIndex: row.rowIndex,
      category: "CRITICAL",
      findingType: "RULE_NOT_CONFIGURED",
      expectedValue: null,
      actualValue: row.commissionPaid,
      diff: null,
      explanation: `סוג הפעולה "${row.actionLabel}" לא ידוע למערכת - אין אפשרות לחשב עמלה צפויה.`,
    };
  }

  const side = options.resolveSide(row.gush, row.chelka);
  if (!side) {
    return {
      assetId: row.assetId,
      rowIndex: row.rowIndex,
      category: "CRITICAL",
      findingType: "RULE_NOT_CONFIGURED",
      expectedValue: null,
      actualValue: row.commissionPaid,
      diff: null,
      explanation: `לא ניתן לקבוע אם גוש ${row.gush} חלקה ${row.chelka} הוא מזרח או מערב (חסר בטבלת האזורים).`,
    };
  }

  const comparison = compareCommission(
    {
      side,
      actionType: row.actionType,
      levyIncrease: row.levyIncrease,
      newArea: row.newArea,
      changeDate: row.changeDate,
    },
    row.commissionPaid,
    rules,
    tolerance,
  );

  if (comparison.expected === null) {
    return {
      assetId: row.assetId,
      rowIndex: row.rowIndex,
      category: "CRITICAL",
      findingType: "RULE_NOT_CONFIGURED",
      expectedValue: null,
      actualValue: row.commissionPaid,
      diff: null,
      explanation: comparison.explanation,
    };
  }

  if (comparison.isMatch) {
    return {
      assetId: row.assetId,
      rowIndex: row.rowIndex,
      category: "CLEAN",
      expectedValue: comparison.expected,
      actualValue: comparison.actual,
      diff: comparison.diff,
      explanation: comparison.explanation,
    };
  }

  // A decrease that still paid a commission is often a legitimate clawback
  // of a previous month's overpayment (the contract requires refunding
  // overpayments) - flag for human review rather than assert it's wrong
  // outright.
  const isNegativeOnDecrease = row.levyIncrease < 0 && row.commissionPaid !== 0;
  return {
    assetId: row.assetId,
    rowIndex: row.rowIndex,
    category: isNegativeOnDecrease ? "REVIEW" : "CRITICAL",
    findingType: isNegativeOnDecrease ? "NEGATIVE_COMMISSION_ON_DECREASE" : "COMMISSION_MISMATCH",
    expectedValue: comparison.expected,
    actualValue: comparison.actual,
    diff: comparison.diff,
    explanation: isNegativeOnDecrease
      ? `עמלה של ${row.commissionPaid} ש"ח נרשמה על הפחתת חיוב (${row.levyIncrease} ש"ח) - ייתכן קיזוז/החזר עמלה קודמת ששולמה ביתר; ייתכן גם טעות. דורש בדיקה ידנית.`
      : comparison.explanation,
  };
}

function splitImbalanceRows(rows: ParsedPropertyRow[]): CategorizedRow[] {
  const splitImbalances = findSplitImbalances(
    rows.map((r) => ({
      id: r.assetId,
      gush: r.gush,
      chelka: r.chelka,
      changeDate: r.changeDate,
      areaDiff: r.areaDiff,
      actionType: r.actionType ?? "",
    })),
  );

  return splitImbalances.map((imbalance) => ({
    assetId: `${imbalance.parentId} <-> ${imbalance.childId}`,
    rowIndex: -1,
    category: "CRITICAL" as const,
    findingType: "SPLIT_IMBALANCE" as const,
    expectedValue: imbalance.parentAreaLost,
    actualValue: imbalance.childAreaGained,
    diff: imbalance.imbalance,
    explanation: `בפיצול בין ${imbalance.parentId} ל-${imbalance.childId}: האב הפסיד ${imbalance.parentAreaLost} מ"ר אבל הבן קיבל ${imbalance.childAreaGained} מ"ר (הפרש ${imbalance.imbalance} מ"ר).`,
  }));
}

/**
 * The full per-row audit outcome for a month - one entry per input row,
 * CLEAN ones included, plus one synthetic entry per unbalanced split.
 * This is what /upload shows as three separate lists and what the Excel
 * export is built from; `runAudit` below is a thin, findings-only view
 * over the same evaluation for callers that only want problems.
 */
export function categorizeRows(rows: ParsedPropertyRow[], rules: CommissionRule[], options: AuditOptions): CategorizedRow[] {
  return [...rows.map((row) => evaluateRow(row, rules, options)), ...splitImbalanceRows(rows)];
}

/**
 * Runs every automated check the spec calls for on one month's parsed
 * rows: commission-vs-contract, split-area balance, and the specific
 * "negative commission on a decrease" pattern that turned out to need its
 * own severity (it's sometimes a legitimate clawback, so REVIEW not
 * CRITICAL - see conversation history for the real example).
 *
 * Deliberately does NOT include the area-vs-survey-document check (that
 * needs the matched SurveyDocument records, which live in the DB layer,
 * not in this pure-data pipeline).
 */
export function runAudit(rows: ParsedPropertyRow[], rules: CommissionRule[], options: AuditOptions): Finding[] {
  return categorizeRows(rows, rules, options)
    .filter((r): r is CategorizedRow & { category: FindingSeverity; findingType: FindingType } => r.category !== "CLEAN")
    .map((r) => ({
      assetId: r.assetId,
      rowIndex: r.rowIndex,
      findingType: r.findingType,
      severity: r.category,
      expectedValue: r.expectedValue,
      actualValue: r.actualValue,
      diff: r.diff,
      explanation: r.explanation,
    }));
}
