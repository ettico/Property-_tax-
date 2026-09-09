/**
 * A "פיצול" (split) is when one billing unit ("נכס אב") loses area on a
 * given date and a brand-new unit ("נכס בן", actionType NEW_PROPERTY /
 * NEW_CONSTRUCTION) gains area on the same date, both under the same
 * gush+chelka. The two are legitimate only if the areas net out exactly -
 * area lost by the parent must equal area gained by the child. Anything
 * else means area appeared from nowhere or vanished.
 */
export interface SplitCandidateRow {
  id: string;
  gush: string;
  chelka: string;
  changeDate: string; // ISO date
  areaDiff: number; // "הפרש שטחים" - negative for the parent, positive for the child
  actionType: string;
}

export interface SplitImbalance {
  parentId: string;
  childId: string;
  parentAreaLost: number;
  childAreaGained: number;
  imbalance: number;
}

export function findSplitImbalances(
  rows: SplitCandidateRow[],
  toleranceSqm = 0.02,
): SplitImbalance[] {
  const byGushChelkaDate = new Map<string, SplitCandidateRow[]>();
  for (const row of rows) {
    const key = `${row.gush}|${row.chelka}|${row.changeDate}`;
    const bucket = byGushChelkaDate.get(key) ?? [];
    bucket.push(row);
    byGushChelkaDate.set(key, bucket);
  }

  const imbalances: SplitImbalance[] = [];

  for (const bucket of byGushChelkaDate.values()) {
    const parents = bucket.filter((r) => r.areaDiff < 0);
    const children = bucket.filter(
      (r) => r.areaDiff > 0 && (r.actionType === "NEW_PROPERTY" || r.actionType === "NEW_CONSTRUCTION"),
    );
    if (parents.length === 0 || children.length === 0) continue;

    const totalLost = -parents.reduce((sum, r) => sum + r.areaDiff, 0);
    const totalGained = children.reduce((sum, r) => sum + r.areaDiff, 0);
    const imbalance = round2(totalGained - totalLost);

    if (Math.abs(imbalance) > toleranceSqm) {
      imbalances.push({
        parentId: parents.map((p) => p.id).join(","),
        childId: children.map((c) => c.id).join(","),
        parentAreaLost: round2(totalLost),
        childAreaGained: round2(totalGained),
        imbalance,
      });
    }
  }

  return imbalances;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
