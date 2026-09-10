import { verifySession } from "@/lib/dal";
import { NavBar } from "@/components/nav-bar";

// Every page here reads the logged-in session and (on /upload) runs a
// fresh server-side audit per request, so none of it should be frozen as
// static HTML at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession(); // redirects to /login if not signed in

  return (
    <>
      <NavBar username={session.username} role={session.role} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
