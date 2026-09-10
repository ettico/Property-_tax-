"use client";

import { deleteUser } from "./actions";

export function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
  const boundDelete = deleteUser.bind(null, userId);

  return (
    <form
      action={boundDelete}
      onSubmit={(e) => {
        if (!confirm(`למחוק את המשתמש "${username}"?`)) e.preventDefault();
      }}
    >
      <button type="submit" className="text-sm font-medium text-rose-600 hover:underline">
        מחיקה
      </button>
    </form>
  );
}
