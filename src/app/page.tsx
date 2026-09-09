import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-900">מערכת ביקורת ארנונה - אשד</h1>
      <p className="mt-4 text-slate-600">
        מצליבה, אחת לחודש, בין קובץ האקסל שאשד מוסרת לעיריית ירושלים לבין
        חוזי העמלה (מזרח/מערב), ומדגישה כל שורה שהעמלה בה לא תואמת לחוזה.
      </p>
      <Link
        href="/upload"
        className="mt-6 inline-block rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900"
      >
        להרצת ביקורת חודשית ←
      </Link>
    </main>
  );
}
