"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { CategorizedRow, RowCategory } from "@/lib/auditPipeline";
import { runMonthlyAudit } from "./actions";
import { INITIAL_AUDIT_STATE } from "./types";

const FINDING_TYPE_LABEL: Record<string, string> = {
  COMMISSION_MISMATCH: "אי-התאמת עמלה",
  SPLIT_IMBALANCE: "פיצול לא מאוזן",
  NEGATIVE_COMMISSION_ON_DECREASE: "עמלה שלילית על הפחתה",
  RULE_NOT_CONFIGURED: "אין כלל מוגדר",
};

const CATEGORY_META: Record<RowCategory, { label: string; badge: string; openByDefault: boolean }> = {
  CLEAN: {
    label: "תקינים",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    openByDefault: false,
  },
  REVIEW: {
    label: "לבדיקה",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    openByDefault: true,
  },
  CRITICAL: {
    label: "קריטי",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    openByDefault: true,
  },
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

  function downloadWorkbook() {
    if (!state.workbookBase64) return;
    const bytes = Uint8Array.from(atob(state.workbookBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ביקורת-ארנונה-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

      {state.status === "success" && state.results && (
        <ResultsPanel
          results={state.results}
          rowCount={state.rowCount ?? 0}
          parseWarnings={state.parseWarnings}
          canDownload={Boolean(state.workbookBase64)}
          onDownload={downloadWorkbook}
        />
      )}
    </div>
  );
}

function ResultsPanel({
  results,
  rowCount,
  parseWarnings,
  canDownload,
  onDownload,
}: {
  results: CategorizedRow[];
  rowCount: number;
  parseWarnings?: string[];
  canDownload: boolean;
  onDownload: () => void;
}) {
  const byCategory: Record<RowCategory, CategorizedRow[]> = { CLEAN: [], REVIEW: [], CRITICAL: [] };
  for (const r of results) byCategory[r.category].push(r);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="שורות שנבדקו" value={rowCount} />
          <StatTile label="תקינות" value={byCategory.CLEAN.length} tone="ok" />
          <StatTile label="לבדיקה" value={byCategory.REVIEW.length} tone="review" />
          <StatTile label="קריטי" value={byCategory.CRITICAL.length} tone="critical" />
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={!canDownload}
          className="shrink-0 rounded-lg border border-teal-800 px-4 py-2.5 text-sm font-medium text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          הורדת אקסל (3 גליונות) ↓
        </button>
      </div>

      {parseWarnings && parseWarnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          <p className="font-medium">אזהרות בקריאת הקובץ:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {parseWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {(["CRITICAL", "REVIEW", "CLEAN"] as const).map((category) => (
        <CategorySection key={category} category={category} rows={byCategory[category]} />
      ))}
    </div>
  );
}

function CategorySection({ category, rows }: { category: RowCategory; rows: CategorizedRow[] }) {
  const meta = CATEGORY_META[category];
  return (
    <details open={meta.openByDefault && rows.length > 0} className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-medium text-slate-900">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}>{meta.label}</span>
        <span className="text-slate-500">{rows.length} נכסים</span>
      </summary>
      {rows.length === 0 ? (
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">אין נכסים ברשימה הזו.</p>
      ) : (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">נכס</th>
                {category !== "CLEAN" && <th className="px-4 py-3 font-medium">סוג</th>}
                <th className="px-4 py-3 font-medium">צפוי</th>
                <th className="px-4 py-3 font-medium">בפועל</th>
                <th className="px-4 py-3 font-medium">הסבר החישוב</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.assetId}</td>
                  {category !== "CLEAN" && (
                    <td className="px-4 py-3 text-slate-700">
                      {r.findingType ? (FINDING_TYPE_LABEL[r.findingType] ?? r.findingType) : ""}
                    </td>
                  )}
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatIls(r.expectedValue)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatIls(r.actualValue)}</td>
                  <td className="max-w-md px-4 py-3 text-slate-600">{r.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
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

function formatIls(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `₪${value.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}
