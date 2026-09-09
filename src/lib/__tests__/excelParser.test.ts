import { describe, expect, it } from "vitest";
import { parseAshedMonthlyExport } from "../excelParser";

// Trimmed-down fixture matching the real structure of Ashed's monthly
// "Telerik grid export saved as .xls" file: an HTML table with a merged
// two-row header, a blank spacer row, then data rows. Cell values below are
// two real rows from an authorized export (see conversation history).
const FIXTURE_HTML = `
<html><body>
<table>
  <thead>
    <tr><th colspan="7"></th><th colspan="13"></th></tr>
    <tr><th>זיהוי נכס</th><th>מספר חשבון</th><th>מנה</th><th>פוקד</th><th>תאריך תחולה</th><th>שטח ישן</th><th>קובעי מס ישן</th>
        <th>תאריך שינוי</th><th>שטח חדש</th><th>קובעי מס חדש</th><th>סטטוס בדיקה</th><th>הפרש שטחים</th><th>תוספת חיוב (שח)</th>
        <th>סך עמלה (שח)</th><th>מהות פעולה</th><th>פיצול</th><th>בוטלה הפחתה</th><th>שונה גורם שינוי</th><th>חשבונית א</th><th>חשבונית ב</th></tr>
  </thead>
  <tbody>
    <tr><td></td></tr>
    <tr>
      <td>30006-030-004-0072</td><td>4389505-001</td><td>12926.0</td><td>כהן כהן</td><td>14/06/2026</td><td>79.00</td><td>81200.0</td>
      <td>18/06/2026</td><td>120.10</td><td>81100.0</td><td>מאושר</td><td>41.10</td><td>15602.17</td>
      <td>1466.60</td><td>שינוי חיוב</td><td></td><td></td><td></td><td></td><td></td>
    </tr>
    <tr>
      <td>30074-009-000-1018</td><td>2331790-002</td><td>12867.0</td><td>כהן כהן</td><td>12/04/2026</td><td>184.21</td><td>91141.0</td>
      <td>08/06/2026</td><td>186.15</td><td>91141.0</td><td>מאושר</td><td>1.94</td><td>155.95</td>
      <td>14.65</td><td>שינוי חיוב</td><td></td><td></td><td></td><td></td><td></td>
    </tr>
    <tr>
      <td>99999-001-000-0001</td><td>1-1</td><td>1</td><td>x</td><td>01/01/2026</td><td></td><td></td>
      <td>01/01/2026</td><td>10</td><td>1</td><td>מאושר</td><td>10</td><td>500</td>
      <td>47</td><td>סוג לא קיים</td><td></td><td></td><td></td><td></td><td></td>
    </tr>
  </tbody>
</table>
</body></html>
`;

describe("parseAshedMonthlyExport", () => {
  const { rows, warnings } = parseAshedMonthlyExport(FIXTURE_HTML);

  it("skips the blank spacer row and parses the real data rows", () => {
    expect(rows).toHaveLength(3);
  });

  it("splits the asset id into gush/chelka/subChelka", () => {
    const row = rows.find((r) => r.assetId === "30074-009-000-1018")!;
    expect(row.gush).toBe("30074");
    expect(row.chelka).toBe("009");
    expect(row.subChelka).toBe("000-1018");
  });

  it("converts Israeli dd/mm/yyyy dates to ISO", () => {
    const row = rows.find((r) => r.assetId === "30074-009-000-1018")!;
    expect(row.changeDate).toBe("2026-06-08");
    expect(row.effectiveDate).toBe("2026-04-12");
  });

  it("parses numeric fields", () => {
    const row = rows.find((r) => r.assetId === "30006-030-004-0072")!;
    expect(row.newArea).toBe(120.1);
    expect(row.levyIncrease).toBe(15602.17);
    expect(row.commissionPaid).toBe(1466.6);
  });

  it("maps known action labels to ActionType", () => {
    const row = rows.find((r) => r.assetId === "30006-030-004-0072")!;
    expect(row.actionType).toBe("LEVY_CHANGE");
  });

  it("warns instead of silently dropping an unrecognised action label", () => {
    const row = rows.find((r) => r.assetId === "99999-001-000-0001")!;
    expect(row.actionType).toBeNull();
    expect(warnings.some((w) => w.message.includes("סוג פעולה לא מוכר"))).toBe(true);
  });
});
