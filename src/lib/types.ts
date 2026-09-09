export type Side = "EAST" | "WEST";

export type ActionType =
  | "LEVY_CHANGE" // שינוי חיוב
  | "NEW_CONSTRUCTION" // בניה חדשה
  | "NEW_PROPERTY" // נכס חדש
  | "ASSESSMENT" // הערכת נכס
  | "OCCUPANT_LOCATE"; // איתור מחזיקים

export type CalcMethod =
  | "PERCENT_OF_INCREASE"
  | "PERCENT_OF_INCREASE_HALF"
  | "FIXED_PER_SQM"
  | "FIXED_FLAT";

// A single pricing rule taken from a signed contract. `rate` is a decimal
// fraction (0.094) for the two percent methods, and a ₪ amount for the two
// fixed methods. Kept as plain data (not hardcoded branches) so a new
// contract year or CPI update is a data change, not a code change.
export interface CommissionRule {
  side: Side;
  actionType: ActionType;
  calcMethod: CalcMethod;
  rate: number;
  validFrom: string; // ISO date
  validTo?: string; // ISO date, undefined = still active
  sourceNote: string;
  /**
   * Set when the rate has not been directly verified against contract text
   * (only reverse-engineered from observed system output). The engine still
   * uses it, but findings mention the caveat instead of asserting certainty.
   */
  unverified?: boolean;
}

export interface CommissionCheckInput {
  side: Side;
  actionType: ActionType;
  levyIncrease: number; // "תוספת חיוב (שח)", can be negative
  newArea: number; // "שטח חדש"
  changeDate: string; // ISO date, used to pick the rule valid at that time
}

export interface CommissionCheckResult {
  expectedCommission: number | null;
  methodUsed: CalcMethod | null;
  matchedRule: CommissionRule | null;
  explanation: string;
}
