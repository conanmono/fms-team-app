import { z } from "zod";

/** ใช้ร่วมกับ minPasswordLength ใน auth.ts — แก้ที่นี่ที่เดียว */
export const MIN_PASSWORD_LENGTH = 8;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "กรุณากรอกอีเมล")
    .pipe(z.email("รูปแบบอีเมลไม่ถูกต้อง")),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type LoginInput = z.infer<typeof loginSchema>;
