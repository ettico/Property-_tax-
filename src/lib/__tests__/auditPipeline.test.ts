import { describe, expect, it } from "vitest";
import { categorizeRows, runAudit } from "../auditPipeline";
import type { ParsedPropertyRow } from "../excelParser";
import { SEED_COMMISSION_RULES } from "../rules.seed";

function row(overrides: Partial<ParsedPropertyRow>): ParsedPropertyRow {
  return {
    assetId: "30000-000-000-0000",
    gush: "30000",
    chelka: "000",
    subChelka: "000-0000",
    accountNumber: "0-0",
    effectiveDate: null,
    changeDate: "2026-06-01",
    oldArea: 100,
    oldTaxCode: 81100,
    newArea: 110,
    newTaxCode: 81100,
    areaDiff: 10,
    levyIncrease: 1000,
    commissionPaid: 94,
    actionLabel: "שינוי חיוב",
    actionType: "LEVY_CHANGE",
    rowIndex: 0,
    ...overrides,
  };
}

// Every gush in these tests is treated as West Jerusalem, mirroring the
// real monthly export we validated the engine against.
const resolveSide = () => "WEST" as const;

describe("runAudit", () => {
  it("produces no findings for a correctly-priced row", () => {
    const findings = runAudit([row({})], SEED_COMMISSION_RULES, { resolveSide });
    expect(findings).toHaveLength(0);
  });

  it("flags a real commission mismatch as CRITICAL", () => {
    const findings = runAudit(
      [row({ assetId: "X", commissionPaid: 500 })],
      SEED_COMMISSION_RULES,
      { resolveSide },
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].findingType).toBe("COMMISSION_MISMATCH");
    expect(findings[0].severity).toBe("CRITICAL");
  });

  it("downgrades a positive commission on a decrease to REVIEW, not CRITICAL", () => {
    const findings = runAudit(
      [
        row({
          assetId: "30569-421-014-0062",
          levyIncrease: -1766.17,
          areaDiff: -5,
          commissionPaid: 13.4,
        }),
      ],
      SEED_COMMISSION_RULES,
      { resolveSide },
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].findingType).toBe("NEGATIVE_COMMISSION_ON_DECREASE");
    expect(findings[0].severity).toBe("REVIEW");
  });

  it("flags an unmapped action label as RULE_NOT_CONFIGURED / CRITICAL", () => {
    const findings = runAudit(
      [row({ actionType: null, actionLabel: "משהו חדש" })],
      SEED_COMMISSION_RULES,
      { resolveSide },
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].findingType).toBe("RULE_NOT_CONFIGURED");
  });

  it("flags a side that cannot be resolved instead of guessing", () => {
    const findings = runAudit([row({})], SEED_COMMISSION_RULES, {
      resolveSide: () => null,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].findingType).toBe("RULE_NOT_CONFIGURED");
  });

  it("detects a real split (parent+child) with no imbalance -> no SPLIT_IMBALANCE finding", () => {
    const findings = runAudit(
      [
        row({
          assetId: "30074-009-000-1018",
          gush: "30074",
          chelka: "009",
          changeDate: "2026-03-02",
          areaDiff: -59.03,
          levyIncrease: -4745.42,
          commissionPaid: 0,
        }),
        row({
          assetId: "30074-009-000-1034",
          gush: "30074",
          chelka: "009",
          changeDate: "2026-03-02",
          areaDiff: 59.03,
          newArea: 59.03,
          levyIncrease: 4745.42,
          commissionPaid: 29.52, // 0.50 * 59.03, rounded
          actionType: "NEW_PROPERTY",
          actionLabel: "נכס חדש",
        }),
      ],
      SEED_COMMISSION_RULES,
      { resolveSide },
    );
    expect(findings.filter((f) => f.findingType === "SPLIT_IMBALANCE")).toHaveLength(0);
  });

  it("flags an unbalanced split", () => {
    const findings = runAudit(
      [
        row({ assetId: "P", gush: "1", chelka: "1", areaDiff: -50, levyIncrease: -100, commissionPaid: 0 }),
        row({
          assetId: "C",
          gush: "1",
          chelka: "1",
          areaDiff: 80,
          newArea: 80,
          levyIncrease: 100,
          commissionPaid: 40,
          actionType: "NEW_PROPERTY",
          actionLabel: "נכס חדש",
        }),
      ],
      SEED_COMMISSION_RULES,
      { resolveSide },
    );
    expect(findings.some((f) => f.findingType === "SPLIT_IMBALANCE")).toBe(true);
  });
});

describe("categorizeRows", () => {
  it("returns a CLEAN entry (with the calculation explained) for a correctly-priced row, not just silence", () => {
    const results = categorizeRows([row({})], SEED_COMMISSION_RULES, { resolveSide });
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("CLEAN");
    expect(results[0].expectedValue).toBeCloseTo(94, 1);
    // A clean row must still carry the "how" - not just "it's fine".
    expect(results[0].explanation).toMatch(/9\.4|0\.094/);
  });

  it("keeps flagged rows out of CLEAN, with the same finding data runAudit exposes", () => {
    const results = categorizeRows([row({ assetId: "X", commissionPaid: 500 })], SEED_COMMISSION_RULES, {
      resolveSide,
    });
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("CRITICAL");
    expect(results[0].findingType).toBe("COMMISSION_MISMATCH");
  });

  it("returns one entry per input row plus split-imbalance entries, never dropping a row silently", () => {
    const results = categorizeRows(
      [row({ assetId: "A" }), row({ assetId: "B", commissionPaid: 999 })],
      SEED_COMMISSION_RULES,
      { resolveSide },
    );
    expect(results.map((r) => r.assetId).sort()).toEqual(["A", "B"]);
  });
});
