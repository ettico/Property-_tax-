import type { CommissionRule } from "./types";

/**
 * Commission rules extracted from the two signed Ashed <-> Jerusalem
 * municipality contracts:
 *   - East: מכרז פומבי 159.2022, signed 13/09/2022 - single method, price-only
 *     tender, winning bid 29%.
 *   - West: מכרז פומבי 80.2021, signed 19/10/2021, contract year 1.1.22-31.12.22
 *     - two priced methods (שיטה א' / שיטה ב'), winning bid form stamped by
 *     the municipality's tenders department 19/10/2021.
 *
 * The 258 ILS flat fee for OCCUPANT_LOCATE on the West side was reverse
 * engineered from 28 identical rows in a real monthly export (see notes) -
 * it was NOT found written out in the contract text we reviewed, so it is
 * marked `unverified` until someone locates the actual clause/appendix.
 */
export const SEED_COMMISSION_RULES: CommissionRule[] = [
  {
    side: "EAST",
    actionType: "LEVY_CHANGE",
    calcMethod: "PERCENT_OF_INCREASE",
    rate: 0.29,
    validFrom: "2022-09-13",
    sourceNote: "מכרז 159.2022, סעיף 7(א) לחוזה - 29% מגידול החיוב, שנה קלנדרית אחת",
  },
  {
    side: "EAST",
    actionType: "ASSESSMENT",
    calcMethod: "PERCENT_OF_INCREASE_HALF",
    rate: 0.29,
    validFrom: "2022-09-13",
    sourceNote: "מכרז 159.2022, סעיף 7(ג) - חיוב לפי הערכה: 50% מהתמורה",
  },
  {
    side: "WEST",
    actionType: "LEVY_CHANGE",
    calcMethod: "PERCENT_OF_INCREASE",
    rate: 0.094,
    validFrom: "2021-10-19",
    sourceNote: "מכרז 80.2021, נספח ה' שיטה א' - 9.40% מגידול החיוב",
  },
  {
    side: "WEST",
    actionType: "ASSESSMENT",
    calcMethod: "PERCENT_OF_INCREASE_HALF",
    rate: 0.094,
    validFrom: "2021-10-19",
    sourceNote: "מכרז 80.2021, חוזה סעיף 6 - חיוב לפי הערכה: 50% מהתמורה לפי שיטה א'",
  },
  {
    side: "WEST",
    actionType: "NEW_CONSTRUCTION",
    calcMethod: "FIXED_PER_SQM",
    rate: 0.5,
    validFrom: "2021-10-19",
    sourceNote: "מכרז 80.2021, נספח ה' שיטה ב' - 0.50 ש\"ח לכל מ\"ר שנמדד, לא צמוד למדד",
  },
  {
    side: "WEST",
    actionType: "NEW_PROPERTY",
    calcMethod: "FIXED_PER_SQM",
    rate: 0.5,
    validFrom: "2021-10-19",
    sourceNote: "מכרז 80.2021, נספח ה' שיטה ב' - זהה ל-NEW_CONSTRUCTION",
  },
  {
    side: "WEST",
    actionType: "OCCUPANT_LOCATE",
    calcMethod: "FIXED_FLAT",
    rate: 258,
    validFrom: "2021-10-19",
    sourceNote:
      "לא אותר סעיף חוזי מפורש - שוחזר מ-28 שורות זהות (258.0 ש\"ח) בייבוא אמיתי. יש לאתר את הנספח המקורי ולאמת (סביר שצמוד מדד מסכום בסיס 2021).",
    unverified: true,
  },
];
