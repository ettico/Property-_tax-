"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { INITIAL_LOGIN_STATE } from "./types";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, INITIAL_LOGIN_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-slate-700">
          שם משתמש
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoFocus
          autoComplete="username"
          className="rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          סיסמה
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-center text-sm text-rose-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-800 py-2 font-medium text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "נכנס/ת…" : "כניסה"}
      </button>
    </form>
  );
}
