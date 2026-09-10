import { UploadForm } from "./upload-form";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">ביקורת חודשית</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        מעלים את קובץ האקסל החודשי של אשד, והמערכת מריצה עליו את כל הבדיקות
        (התאמת עמלה לחוזה, איזון פיצולים) ומציגה את התקינים, את מה שצריך
        בדיקה, ואת מה שקריטי לתיקון בנפרד. פענוח הקובץ והרצת המנוע קורים
        כולם בשרת - שום נתון גולמי לא נשמר או מעובד בדפדפן.
      </p>
      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  );
}
