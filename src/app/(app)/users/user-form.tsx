"use client";

import { useActionState } from "react";
import { createUser } from "./actions";
import { INITIAL_CREATE_USER_STATE } from "./types";

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, INITIAL_CREATE_USER_STATE);

  return (
    <form action={formAction} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-900">
          שם משתמש
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-900">
          סיסמה זמנית
        </label>
        <input
          id="password"
          name="password"
          type="text"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
        <p className="mt-1 text-xs text-slate-500">לפחות 8 תווים. תעבירי למשתמש בערוץ נפרד מהמערכת.</p>
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-slate-900">
          הרשאה
        </label>
        <select
          id="role"
          name="role"
          defaultValue="MEMBER"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-teal-700"
        >
          <option value="MEMBER">משתמש רגיל</option>
          <option value="ADMIN">מנהל</option>
        </select>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "מוסיף/ה…" : "הוסף משתמש"}
        </button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="sm:col-span-2 text-sm text-rose-600">
          {state.error}
        </p>
      )}
      {state.status === "success" && (
        <p className="sm:col-span-2 text-sm text-emerald-700">המשתמש נוסף בהצלחה.</p>
      )}
    </form>
  );
}
