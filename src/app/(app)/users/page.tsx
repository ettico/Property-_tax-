import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { DeleteUserButton } from "./delete-user-button";
import { UserForm } from "./user-form";

const ROLE_LABEL: Record<string, string> = { ADMIN: "מנהל", MEMBER: "משתמש רגיל" };

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">ניהול משתמשים</h1>
      <p className="mt-2 text-sm text-slate-600">
        רק מנהל יכול להוסיף או להסיר משתמשים. חשבונות חדשים נכנסים בשם
        המשתמש והסיסמה הזמנית שתיצרי כאן.
      </p>

      <div className="mt-6">
        <UserForm />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">שם משתמש</th>
              <th className="px-4 py-3 font-medium">הרשאה</th>
              <th className="px-4 py-3 font-medium">נוצר</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {user.username}
                  {user.id === admin.userId && <span className="mr-2 text-xs text-slate-400">(את/ה)</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">{ROLE_LABEL[user.role]}</td>
                <td className="px-4 py-3 tabular-nums text-slate-500">
                  {user.createdAt.toLocaleDateString("he-IL")}
                </td>
                <td className="px-4 py-3">
                  {user.id !== admin.userId && <DeleteUserButton userId={user.id} username={user.username} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
