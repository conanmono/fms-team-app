import { createAuthClient } from "better-auth/react";

// ไม่ระบุ baseURL — ใช้ origin เดียวกับหน้าเว็บ (/api/auth)
export const authClient = createAuthClient();
