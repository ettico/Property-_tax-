"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { runMonthlyAudit } from "./actions";
import { INITIAL_AUDIT_STATE } from "./types";

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: "קריטי",
  REVIEW: "לבדיקה",
  INFO: "מידע",
};

const SEVERITY_CLASSES: Record<string, string> = {
  CRITICAL: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  REVIEW: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  INFO: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

const FINDING_TYPE_LABEL: Record<string, string> = {
  COMMISSION_MISMATCH: "אי-התאמת עמלה",
  SPLIT_IMBALANCE: "פיצול לא מאוזן",
  NEGATIVE_COMMISSION_ON_DECREASE: "עמלה שלילית על הפחתה",
  RULE_NOT_CONFIGURED: "אין כלל מוגדר",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "מריץ בדיקה…" : "הרץ ביקורת"}
    </button>
  );
}

export function UploadForm() {
  const [state, formAction] = useActionState(runMonthlyAudit, INITIAL_AUDIT_STATE);

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="excelFile" className="block text-sm font-medium text-slate-900">
            קובץ האקסל החודשי (.xls)
          </label>
          <p className="mt-1 text-xs text-slate-500">
            הקובץ המקורי שאשד מסרה - טבלת הנתונים לכל הנכסים שהשתנו בחודש הזה.
          </p>
          <input
            id="excelFile"
            name="excelFile"
            type="file"
            accept=".xls,.html,.htm"
            required
            className="mt-2 block w-full text-sm text-slate-700 file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-800 hover:file:bg-teal-100"
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-slate-900">צד</legend>
          <p className="mt-1 text-xs text-slate-500">
            עדיין ידני - זיהוי אוטומטי לפי גוש-חלקה יגיע כשנטען את נספח ד&apos; לצו המיסים.
          </p>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input type="radio" name="side" value="WEST" defaultChecked className="accent-teal-800" />
              מערב ירושלים
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input type="radio" name="side" value="EAST" className="accent-teal-800" />
              מזרח ירושלים
            </label>
          </div>
        </fieldset>

        <SubmitButton />

        {state.status === "error" && (
          <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
            {state.error}
          </p>
        )}
      </form>

      {state.status === "success" && <ResultsPanel state={state} />}
    </div>
  );
}

function ResultsPanel({ state }: { state: typeof INITIAL_AUDIT_STATE }) {
  const findings = state.findings ?? [];
  const counts = countBySeverity(findings);
  const clean = (state.rowCount ?? 0) - findings.filter((f) => f.rowIndex >= 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="שורות שנבדקו" value={state.rowCount ?? 0} />
        <StatTile label="תקינות" value={Math.max(clean, 0)} tone="ok" />
        <StatTile label="קריטי" value={counts.CRITICAL} tone="critical" />
        <StatTile label="לבדיקה" value={counts.REVIEW} tone="review" />
      </div>

      {state.parseWarnings && state.parseWarnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          <p className="font-medium">אזהרות בקריאת הקובץ:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {state.parseWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {findings.length === 0 ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          לא נמצאו חריגות - כל השורות תואמות את הכלל שנבדק מולן.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">חומרה</th>
                <th className="px-4 py-3 font-medium">נכס</th>
                <th className="px-4 py-3 font-medium">סוג</th>
                <th className="px-4 py-3 font-medium">צפוי</th>
                <th className="px-4 py-3 font-medium">בפועל</th>
                <th className="px-4 py-3 font-medium">הסבר</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {findings.map((f, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SEVERITY_CLASSES[f.severity]}`}>
                      {SEVERITY_LABEL[f.severity]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{f.assetId}</td>
                  <td className="px-4 py-3 text-slate-700">{FINDING_TYPE_LABEL[f.findingType] ?? f.findingType}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatIls(f.expectedValue)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatIls(f.actualValue)}</td>
                  <td className="px-4 py-3 max-w-sm text-slate-600">{f.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "ok" | "critical" | "review" }) {
  const toneClasses =
    tone === "critical"
      ? "text-rose-700"
      : tone === "review"
        ? "text-amber-700"
        : tone === "ok"
          ? "text-emerald-700"
          : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClasses}`}>{value}</p>
    </div>
  );
}

function countBySeverity(findings: { severity: string }[]) {
  return findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    { CRITICAL: 0, REVIEW: 0, INFO: 0 } as Record<string, number>,
  );
}

function formatIls(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `₪${value.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}
