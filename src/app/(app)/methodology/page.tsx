const RULE_ROWS = [
  { side: "מזרח", action: "שינוי חיוב (תוספת חיוב חיובית)", method: "9.4% × X% מהתוספת", rate: "29%", note: "שיטה יחידה בחוזה - אין שיטה ב׳ במזרח." },
  { side: "מזרח", action: "הערכת נכס (חיוב בלי מדידה בפועל)", method: "מחצית מהשיעור", rate: "14.5%", note: "50% מ-29%, לפי סעיף 7(ג) לחוזה." },
  { side: "מזרח", action: "תוספת חיוב ≤ 0", method: "עמלה = 0", rate: "0%", note: "אין עמלה על הפחתה, לפי הגדרת \"אחוז מגידול\"." },
  { side: "מערב", action: "שינוי חיוב (תוספת חיוב חיובית)", method: "9.4% מהתוספת", rate: "9.40%", note: "שיטה א׳, נספח ה׳ למכרז 80.2021." },
  { side: "מערב", action: "בניה חדשה / נכס חדש", method: "0.50 ₪ × שטח חדש", rate: "0.50 ₪/מ״ר", note: "שיטה ב׳ - קבוע, לא אחוז. לא צמוד למדד." },
  { side: "מערב", action: "איתור מחזיקים", method: "סכום קבוע לנכס", rate: "258 ₪", note: "שוחזר מנתונים אמיתיים - לא אומת מול נוסח החוזה." },
  { side: "מערב", action: "הערכת נכס", method: "מחצית מ-9.4%", rate: "4.70%", note: "50% מהתמורה, משולם תוך 90 יום מהערכה." },
  { side: "מערב", action: "תוספת חיוב ≤ 0", method: "עמלה = 0", rate: "0%", note: "כמו במזרח." },
] as const;

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">איך המערכת מחשבת</h1>
        <p className="mt-2 text-slate-600">
          כל מה שהמנוע עושה על כל שורה באקסל, בסדר שבו הוא עושה את זה. שום
          חלק כאן אינו &quot;קופסה שחורה&quot; - כל מסקנה מתחילה מסעיף מסוים בחוזה
          החתום או בצו המיסים.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">1. מקור החוקים</h2>
        <p className="mt-2 text-slate-600">
          המערכת לא מנחשת אחוזים - היא קוראת אותם מטבלת כללים (
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">rules.seed.ts</code>) שכל שורה
          בה מצוטטת ישירות מהחוזה החתום: מכרז 159.2022 (מזרח) ומכרז
          80.2021 (מערב). אם מחר יתעדכן תעריף (למשל הצמדת מדד), זה שינוי
          נתונים בטבלה הזו - לא שינוי בקוד של מנוע החישוב.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">2. שלב ראשון: קביעת הצד</h2>
        <p className="mt-2 text-slate-600">
          לכל שורה נקבע קודם כל אם מדובר בנכס במזרח או במערב ירושלים - כי
          לכל צד יש חוזה עמלה שונה לגמרי. כרגע (עד שתיטען טבלת האזורים
          המלאה מנספח ד&apos; לצו המיסים) זה נבחר ידנית בטופס ההעלאה לכל
          הקובץ כולו; ברגע שהטבלה תיטען, זה ייקבע אוטומטית לכל נכס לפי
          הגוש-חלקה שלו.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">3. שלב שני: זיהוי סוג הפעולה</h2>
        <p className="mt-2 text-slate-600">
          עמודת &quot;מהות פעולה&quot; באקסל (שינוי חיוב / בניה חדשה / נכס
          חדש / הערכת נכס / איתור מחזיקים) קובעת איזו נוסחה חלה - כי
          לכל אחת מהן יש כלל תמחור שונה בחוזה, לא רק אחוז אחיד. סוג פעולה
          שהמערכת לא מזהה (למשל תווית חדשה שאשד התחילו להשתמש בה) לא
          מנוחש - הוא מסומן <b>קריטי</b> עם ההסבר &quot;אין כלל מוגדר&quot;,
          כדי שלא תיווצר תשובה שגויה בשקט.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">4. שלב שלישי: חישוב העמלה הצפויה</h2>
        <p className="mt-2 text-slate-600">
          לפי צד + סוג פעולה, הטבלה הבאה מציגה בדיוק מה המנוע מפעיל על כל
          שורה:
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">צד</th>
                <th className="px-4 py-3 font-medium">מקרה</th>
                <th className="px-4 py-3 font-medium">נוסחה</th>
                <th className="px-4 py-3 font-medium">שיעור</th>
                <th className="px-4 py-3 font-medium">הערה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {RULE_ROWS.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.side}</td>
                  <td className="px-4 py-3 text-slate-700">{r.action}</td>
                  <td className="px-4 py-3 text-slate-700">{r.method}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-teal-800">{r.rate}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-500">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">5. שלב רביעי: פיצול (נכס אב/בן)</h2>
        <p className="mt-2 text-slate-600">
          לפני שקובעים תקין/לא-תקין, המנוע מחפש זוגות שורות באותו גוש-חלקה
          ובאותו תאריך שינוי, שבהן שורה אחת מאבדת שטח (&quot;אב&quot;)
          ושורה אחרת מקבלת שטח כ&quot;נכס חדש&quot; (&quot;בן&quot;) - זה
          פיצול. הכלל: השטח שהאב הפסיד חייב להיות שווה <i>בדיוק</i> לשטח
          שהבן קיבל. אם לא - זו חריגה קריטית (&quot;פיצול לא מאוזן&quot;),
          כי המשמעות היא ששטח נעלם או הופיע משום מקום.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">6. שלב חמישי: השוואה למה שדווח בפועל</h2>
        <p className="mt-2 text-slate-600">
          העמלה הצפויה (משלב 4) מושווית לעמודת &quot;סך עמלה&quot; בפועל
          באקסל, בטולרנס של 5 אגורות (לספוג עיגולים, לא לטשטש טעויות
          אמיתיות). מכאן שלוש אפשרויות:
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border-r-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-slate-700">
            <b className="text-emerald-800">תואם (תקין):</b> ההפרש בתוך הטולרנס. השורה עוברת לרשימת
            &quot;תקינים&quot; - עם הסבר הנוסחה המדויקת שבה חושבה, לא רק וי ירוק.
          </div>
          <div className="rounded-lg border-r-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-slate-700">
            <b className="text-amber-800">לבדיקה:</b> מקרה אחד ויחיד - עמלה חיובית שנרשמה על הפחתת
            חיוב. זה <i>יכול</i> להיות קיזוז לגיטימי של עמלה ששולמה ביתר
            בחודש קודם (מותר בחוזה), אבל גם יכול להיות טעות - המערכת לא
            מכריעה בשבילך, רק מסמנת שיש כאן שיקול דעת.
          </div>
          <div className="rounded-lg border-r-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-slate-700">
            <b className="text-rose-800">קריטי:</b> כל אי-התאמה אחרת - כולל סוג פעולה/צד לא ידועים,
            ופיצול לא מאוזן. אלה נחשבים טעות עד שיוכח אחרת.
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">מה עדיין לא נבדק אוטומטית</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
          <li>התאמת השטח שדווח באקסל מול תוכנית המדידה הסרוקה בפועל (דורש חיבור שכבת חילוץ המסמכים).</li>
          <li>תעריף &quot;איתור מחזיקים&quot; (258 ₪) - שוחזר מנתונים, לא אומת מול נוסח חוזה.</li>
          <li>זיהוי אוטומטי של צד (מזרח/מערב) - כרגע נבחר ידנית לכל הקובץ.</li>
        </ul>
      </section>
    </div>
  );
}
