import type { CommissionCheckInput, CommissionCheckResult, CommissionRule } from "./types";

function isRuleActiveAt(rule: CommissionRule, isoDate: string): boolean {
  if (rule.validFrom > isoDate) return false;
  if (rule.validTo && rule.validTo < isoDate) return false;
  return true;
}

function findRule(
  rules: CommissionRule[],
  input: CommissionCheckInput,
): CommissionRule | null {
  const candidates = rules.filter(
    (r) =>
      r.side === input.side &&
      r.actionType === input.actionType &&
      isRuleActiveAt(r, input.changeDate),
  );
  if (candidates.length === 0) return null;
  // Most recently effective rule wins if more than one is active.
  return candidates.reduce((latest, r) => (r.validFrom > latest.validFrom ? r : latest));
}

/**
 * Computes the commission Ashed *should* have been paid for one property
 * record, per the contract rule matching its side + action type + date.
 *
 * Returns expectedCommission = null (not 0) when no rule is configured for
 * the combination, so the caller can raise a RULE_NOT_CONFIGURED finding
 * instead of silently comparing against a wrong default.
 */
export function computeExpectedCommission(
  input: CommissionCheckInput,
  rules: CommissionRule[],
): CommissionCheckResult {
  const rule = findRule(rules, input);
  if (!rule) {
    return {
      expectedCommission: null,
      methodUsed: null,
      matchedRule: null,
      explanation: `אין כלל עמלה מוגדר לצד=${input.side} סוג פעולה=${input.actionType} בתאריך ${input.changeDate}.`,
    };
  }

  const caveat = rule.unverified
    ? ` (שיעור זה לא אומת מול נוסח החוזה - ${rule.sourceNote})`
    : ` (${rule.sourceNote})`;

  switch (rule.calcMethod) {
    case "FIXED_FLAT":
      return {
        expectedCommission: rule.rate,
        methodUsed: rule.calcMethod,
        matchedRule: rule,
        explanation: `עמלה קבועה של ${rule.rate} ש"ח, ללא קשר לשטח.${caveat}`,
      };

    case "FIXED_PER_SQM":
      return {
        expectedCommission: round2(rule.rate * input.newArea),
        methodUsed: rule.calcMethod,
        matchedRule: rule,
        explanation: `${rule.rate} ש"ח × ${input.newArea} מ"ר (שטח חדש).${caveat}`,
      };

    case "PERCENT_OF_INCREASE": {
      if (input.levyIncrease <= 0) {
        return {
          expectedCommission: 0,
          methodUsed: rule.calcMethod,
          matchedRule: rule,
          explanation: `אין עמלה על הפחתת חיוב/חיוב לא-חיובי (תוספת חיוב = ${input.levyIncrease}).${caveat}`,
        };
      }
      return {
        expectedCommission: round2(rule.rate * input.levyIncrease),
        methodUsed: rule.calcMethod,
        matchedRule: rule,
        explanation: `${rule.rate * 100}% × ${input.levyIncrease} ש"ח תוספת חיוב.${caveat}`,
      };
    }

    case "PERCENT_OF_INCREASE_HALF": {
      if (input.levyIncrease <= 0) {
        return {
          expectedCommission: 0,
          methodUsed: rule.calcMethod,
          matchedRule: rule,
          explanation: `אין עמלה על הפחתת חיוב/חיוב לא-חיובי (תוספת חיוב = ${input.levyIncrease}).${caveat}`,
        };
      }
      return {
        expectedCommission: round2(rule.rate * 0.5 * input.levyIncrease),
        methodUsed: rule.calcMethod,
        matchedRule: rule,
        explanation: `מחצית מהשיעור המלא (חיוב לפי הערכה): ${rule.rate * 100}% × 50% × ${input.levyIncrease} ש"ח.${caveat}`,
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface CommissionComparison {
  isMatch: boolean;
  expected: number | null;
  actual: number;
  diff: number | null;
  explanation: string;
}

/**
 * Compares the commission actually recorded in Ashed's monthly export
 * against what the matching contract rule says it should be. `toleranceIls`
 * absorbs rounding noise (agorot), not real discrepancies.
 */
export function compareCommission(
  input: CommissionCheckInput,
  actualCommission: number,
  rules: CommissionRule[],
  toleranceIls = 0.05,
): CommissionComparison {
  const result = computeExpectedCommission(input, rules);
  if (result.expectedCommission === null) {
    return {
      isMatch: false,
      expected: null,
      actual: actualCommission,
      diff: null,
      explanation: result.explanation,
    };
  }

  const diff = round2(actualCommission - result.expectedCommission);
  return {
    isMatch: Math.abs(diff) <= toleranceIls,
    expected: result.expectedCommission,
    actual: actualCommission,
    diff,
    explanation: result.explanation,
  };
}
