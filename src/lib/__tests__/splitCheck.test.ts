import { describe, expect, it } from "vitest";
import { findSplitImbalances } from "../splitCheck";

describe("findSplitImbalances", () => {
  it("does not flag a real, balanced split (30074-009-000-1018 -> 1034)", () => {
    const imbalances = findSplitImbalances([
      {
        id: "parent-1018",
        gush: "30074",
        chelka: "009",
        changeDate: "2026-03-02",
        areaDiff: -59.03,
        actionType: "LEVY_CHANGE",
      },
      {
        id: "child-1034",
        gush: "30074",
        chelka: "009",
        changeDate: "2026-03-02",
        areaDiff: 59.03,
        actionType: "NEW_PROPERTY",
      },
    ]);
    expect(imbalances).toHaveLength(0);
  });

  it("flags a split where the child gained more area than the parent lost", () => {
    const imbalances = findSplitImbalances([
      {
        id: "parent-A",
        gush: "30001",
        chelka: "010",
        changeDate: "2026-01-01",
        areaDiff: -50,
        actionType: "LEVY_CHANGE",
      },
      {
        id: "child-B",
        gush: "30001",
        chelka: "010",
        changeDate: "2026-01-01",
        areaDiff: 70,
        actionType: "NEW_PROPERTY",
      },
    ]);
    expect(imbalances).toHaveLength(1);
    expect(imbalances[0].imbalance).toBe(20);
  });

  it("ignores unrelated rows on the same gush but a different date", () => {
    const imbalances = findSplitImbalances([
      {
        id: "parent-A",
        gush: "30001",
        chelka: "010",
        changeDate: "2026-01-01",
        areaDiff: -50,
        actionType: "LEVY_CHANGE",
      },
      {
        id: "child-B",
        gush: "30001",
        chelka: "010",
        changeDate: "2026-02-01",
        areaDiff: 50,
        actionType: "NEW_PROPERTY",
      },
    ]);
    // Different dates -> not treated as one split event; each is its own
    // unmatched half, which the caller should raise separately if it looks
    // suspicious on its own merits.
    expect(imbalances).toHaveLength(0);
  });
});
