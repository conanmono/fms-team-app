import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-semibold text-zinc-900 dark:text-zinc-50"
        >
          CodingThailand Academy
        </Link>
        {/* อ่าน session ตอน request — แยกไว้ใน Suspense ส่วนอื่นของ header จึง prerender ได้ */}
        <Suspense fallback={<span className="h-8 w-24" />}>
          <NavUser />
        </Suspense>
      </div>
    </header>
  );
}

async function NavUser() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        เข้าสู่ระบบ
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span
        data-testid="nav-user-name"
        className="text-sm text-zinc-700 dark:text-zinc-300"
      >
        {user.name}
        {user.role === "admin" && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            admin
          </span>
        )}
      </span>
      <SignOutButton />
    </div>
  );
}
