"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/logout/actions";

interface NavBarProps {
  username: string;
  role: "ADMIN" | "MEMBER";
}

export function NavBar({ username, role }: NavBarProps) {
  const pathname = usePathname();

  const links = [
    { href: "/upload", label: "ביקורת חודשית" },
    { href: "/methodology", label: "איך המערכת מחשבת" },
    ...(role === "ADMIN" ? [{ href: "/users", label: "משתמשים" }] : []),
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-bold text-slate-900">
          ביקורת ארנונה
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-teal-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden />
          <span className="text-sm text-slate-500">{username}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              יציאה
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
