import { describe, expect, it } from "vitest";
import { compareCommission } from "../commissionEngine";
import { SEED_COMMISSION_RULES } from "../rules.seed";

// Every case below (except the two clearly-marked synthetic ones) is a real
// row pulled from an authorized monthly Ashed export for West Jerusalem,
// cross-checked against the two signed contracts. See conversation history
// for the row-by-row derivation.

describe("compareCommission - West Jerusalem, real rows", () => {
  it("30006-030-004-0072: plain levy increase -> 9.40%", () => {
    const result = compareCommission(
      {
        side: "WEST",
        actionType: "LEVY_CHANGE",
        levyIncrease: 15602.17,
        newArea: 120.1,
        changeDate: "2026-06-18",
      },
      1466.6,
      SEED_COMMISSION_RULES,
    );
    expect(result.isMatch).toBe(true);
    expect(result.expected).toBeCloseTo(1466.6, 1);
  });

  it("30074-009-000-1018: small correction after an objection -> 9.40%", () => {
    const result = compareCommission(
      {
        side: "WEST",
        actionType: "LEVY_CHANGE",
        levyIncrease: 155.95,
        newArea: 186.15,
        changeDate: "2026-06-24",
      },
      14.65,
      SEED_COMMISSION_RULES,
    );
    expect(result.isMatch).toBe(true);
  });

  it("30076-056-004-0023: billed by assessment -> half of 9.40%", () => {
    const result = compareCommission(
      {
        side: "WEST",
        actionType: "ASSESSMENT",
        levyIncrease: 1381.44,
        newArea: 133.34,
        changeDate: "2026-06-18",
      },
      64.92,
      SEED_COMMISSION_RULES,
    );
    expect(result.isMatch).toBe(true);
  });

  it("30074-012-000-0253: new construction -> fixed 0.50 ILS/sqm, not a percentage", () => {
    const result = compareCommission(
      {
        side: "WEST",
        actionType: "NEW_CONSTRUCTION",
        levyIncrease: 4127.29,
        newArea: 38.34,
        changeDate: "2026-06-02",
      },
      19.17,
      SEED_COMMISSION_RULES,
    );
    expect(result.isMatch).toBe(true);
    expect(result.expected).toBe(19.17);
  });

  it("occupant-locate rows: flat 258 ILS regardless of area (rule marked unverified)", () => {
    const result = compareCommission(
      {
        side: "WEST",
        actionType: "OCCUPANT_LOCATE",
        levyIncrease: 24529.67,
        newArea: 269.35,
        changeDate: "2026-06-15",
      },
      258.0,
      SEED_COMMISSION_RULES,
    );
    expect(result.isMatch).toBe(true);
    expect(SEED_COMMISSION_RULES.find((r) => r.actionType === "OCCUPANT_LOCATE")?.unverified).toBe(true);
  });

  it("levy decrease -> zero commission, even though a real row here still paid one (flag it)", () => {
    const result = compareCommission(
      {
        side: "WEST",
        actionType: "LEVY_CHANGE",
        levyIncrease: -10301.34,
        newArea: 510.36,
        changeDate: "2026-06-30",
      },
      0,
      SEED_COMMISSION_RULES,
    );
    expect(result.isMatch).toBe(true);
    expect(result.expected).toBe(0);
  });

  it("flags a positive commission paid on a levy decrease as a mismatch", () => {
    // Mirrors the one real anomaly found (30569-421-014-0062): decrease but
    // a positive commission was recorded - the engine must not wave this
    // through just because *some* decrease rows legitimately get 0.
    const result = compareCommission(
      {
        side: "WEST",
        actionType: "LEVY_CHANGE",
        levyIncrease: -1766.17,
        newArea: 82.88,
        changeDate: "2025-06-08",
      },
      13.4,
      SEED_COMMISSION_RULES,
    );
    expect(result.isMatch).toBe(false);
    expect(result.expected).toBe(0);
    expect(result.diff).toBe(13.4);
  });
});

describe("compareCommission - East Jerusalem (synthetic, single-method contract)", () => {
  it("uses the flat 29% rate with no fixed-fee methods available", () => {
    const result = compareCommission(
      {
        side: "EAST",
        actionType: "LEVY_CHANGE",
        levyIncrease: 1000,
        newArea: 50,
        changeDate: "2023-01-01",
      },
      290,
      SEED_COMMISSION_RULES,
    );
    expect(result.isMatch).toBe(true);
  });

  it("has no NEW_PROPERTY rule configured - must surface RULE_NOT_CONFIGURED, not silently pass", () => {
    const result = compareCommission(
      {
        side: "EAST",
        actionType: "NEW_PROPERTY",
        levyIncrease: 1000,
        newArea: 50,
        changeDate: "2023-01-01",
      },
      100,
      SEED_COMMISSION_RULES,
    );
    expect(result.expected).toBeNull();
    expect(result.isMatch).toBe(false);
  });
});
