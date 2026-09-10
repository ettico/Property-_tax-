import Link from "next/link";
import { verifySession } from "@/lib/dal";

const CARDS = [
  {
    href: "/upload",
    title: "ביקורת חודשית",
    description: "מעלים את קובץ האקסל של אשד ומריצים את כל הבדיקות מול החוזה.",
  },
  {
    href: "/methodology",
    title: "איך המערכת מחשבת",
    description: "ההסבר המלא: כל כלל, כל שיעור, וכל שלב בדרך למסקנה.",
  },
] as const;

export default async function HomePage() {
  const session = await verifySession();

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold text-slate-900">מערכת ביקורת ארנונה - אשד</h1>
      <p className="mt-2 text-slate-600">
        שלום {session.username}. מצליבה, אחת לחודש, בין קובץ האקסל שאשד
        מוסרת לעיריית ירושלים לבין חוזי העמלה (מזרח/מערב), ומדגישה כל שורה
        שהעמלה בה לא תואמת לחוזה.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-700 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{card.description}</p>
          </Link>
        ))}
        {session.role === "ADMIN" && (
          <Link
            href="/users"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-700 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">ניהול משתמשים</h2>
            <p className="mt-1.5 text-sm text-slate-600">הוספת משתמשים חדשים למערכת (מנהל בלבד).</p>
          </Link>
        )}
      </div>
    </div>
  );
}
