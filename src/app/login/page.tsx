import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | CodingThailand Academy",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          เข้าสู่ระบบ
        </h1>
        {/* useSearchParams อ่านค่า ?next= ตอน request จึงต้องอยู่ใน Suspense */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
