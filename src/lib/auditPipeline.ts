import { compareCommission } from "./commissionEngine";
import type { ParsedPropertyRow } from "./excelParser";
import { findSplitImbalances } from "./splitCheck";
import type { CommissionRule, Side } from "./types";

export type FindingType =
  | "COMMISSION_MISMATCH"
  | "SPLIT_IMBALANCE"
  | "NEGATIVE_COMMISSION_ON_DECREASE"
  | "RULE_NOT_CONFIGURED";

export type FindingSeverity = "INFO" | "REVIEW" | "CRITICAL";

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

export interface AuditOptions {
  resolveSide: (gush: string, chelka: string) => Side | null;
  toleranceIls?: number;
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
  const findings: Finding[] = [];
  const tolerance = options.toleranceIls ?? 0.05;

  for (const row of rows) {
    if (!row.actionType) {
      findings.push({
        assetId: row.assetId,
        rowIndex: row.rowIndex,
        findingType: "RULE_NOT_CONFIGURED",
        severity: "CRITICAL",
        expectedValue: null,
        actualValue: row.commissionPaid,
        diff: null,
        explanation: `סוג הפעולה "${row.actionLabel}" לא ידוע למערכת - אין אפשרות לחשב עמלה צפויה.`,
      });
      continue;
    }

    const side = options.resolveSide(row.gush, row.chelka);
    if (!side) {
      findings.push({
        assetId: row.assetId,
        rowIndex: row.rowIndex,
        findingType: "RULE_NOT_CONFIGURED",
        severity: "CRITICAL",
        expectedValue: null,
        actualValue: row.commissionPaid,
        diff: null,
        explanation: `לא ניתן לקבוע אם גוש ${row.gush} חלקה ${row.chelka} הוא מזרח או מערב (חסר בטבלת האזורים).`,
      });
      continue;
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
      findings.push({
        assetId: row.assetId,
        rowIndex: row.rowIndex,
        findingType: "RULE_NOT_CONFIGURED",
        severity: "CRITICAL",
        expectedValue: null,
        actualValue: row.commissionPaid,
        diff: null,
        explanation: comparison.explanation,
      });
      continue;
    }

    if (!comparison.isMatch) {
      const isNegativeOnDecrease = row.levyIncrease < 0 && row.commissionPaid !== 0;
      findings.push({
        assetId: row.assetId,
        rowIndex: row.rowIndex,
        findingType: isNegativeOnDecrease ? "NEGATIVE_COMMISSION_ON_DECREASE" : "COMMISSION_MISMATCH",
        // A decrease that still paid a commission is often a legitimate
        // clawback of a previous month's overpayment (contract clause
        // requires refunding overpayments) - flag for human review rather
        // than assert it's wrong outright.
        severity: isNegativeOnDecrease ? "REVIEW" : "CRITICAL",
        expectedValue: comparison.expected,
        actualValue: comparison.actual,
        diff: comparison.diff,
        explanation: isNegativeOnDecrease
          ? `עמלה של ${row.commissionPaid} ש"ח נרשמה על הפחתת חיוב (${row.levyIncrease} ש"ח) - ייתכן קיזוז/החזר עמלה קודמת ששולמה ביתר; ייתכן גם טעות. דורש בדיקה ידנית.`
          : comparison.explanation,
      });
    }
  }

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

  for (const imbalance of splitImbalances) {
    findings.push({
      assetId: `${imbalance.parentId} <-> ${imbalance.childId}`,
      rowIndex: -1,
      findingType: "SPLIT_IMBALANCE",
      severity: "CRITICAL",
      expectedValue: imbalance.parentAreaLost,
      actualValue: imbalance.childAreaGained,
      diff: imbalance.imbalance,
      explanation: `בפיצול בין ${imbalance.parentId} ל-${imbalance.childId}: האב הפסיד ${imbalance.parentAreaLost} מ"ר אבל הבן קיבל ${imbalance.childAreaGained} מ"ר (הפרש ${imbalance.imbalance} מ"ר).`,
    });
  }

  return findings;
}
