import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-slate-900">ביקורת ארנונה</h1>
        <p className="mb-6 text-center text-sm text-slate-500">אשד מול עיריית ירושלים</p>
        <LoginForm next={next ?? "/"} />
      </div>
    </div>
  );
}
