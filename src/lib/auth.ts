import "server-only"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { headers } from "next/headers"
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-schema"
import { prisma } from "@/lib/db"

// BETTER_AUTH_SECRET และ BETTER_AUTH_URL อ่านจาก process.env อัตโนมัติ
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
  },
  user: {
    additionalFields: {
      // ผู้ใช้กำหนด role เองไม่ได้ (input: false) — admin ตั้งผ่านฐานข้อมูลเท่านั้น
      role: { type: "string", defaultValue: "user", input: false },
    },
  },
  plugins: [nextCookies()],
})

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: string
}

/** อ่านผู้ใช้ที่ login อยู่ ถ้าไม่ได้ login คืน null — ต้องเรียกภายใน <Suspense> */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const { id, name, email, role } = session.user
  return { id, name, email, role }
}
