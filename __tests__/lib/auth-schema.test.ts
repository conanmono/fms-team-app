import { describe, expect, test } from "vitest";
import { loginSchema } from "@/lib/auth-schema";

function firstError(input: unknown) {
  const result = loginSchema.safeParse(input);
  return result.success ? null : result.error.issues[0];
}

describe("loginSchema", () => {
  test("อีเมลและรหัสผ่านถูกต้องผ่าน และ trim อีเมล", () => {
    const result = loginSchema.safeParse({
      email: "  user@example.com ",
      password: "password123",
    });
    expect(result.success && result.data.email).toBe("user@example.com");
  });

  test("อีเมลว่าง", () => {
    expect(firstError({ email: "", password: "x" })?.message).toBe(
      "กรุณากรอกอีเมล",
    );
  });

  test("อีเมลผิดรูปแบบ", () => {
    expect(firstError({ email: "somchai@", password: "x" })?.message).toBe(
      "รูปแบบอีเมลไม่ถูกต้อง",
    );
  });

  test("รหัสผ่านว่าง", () => {
    const issue = firstError({ email: "user@example.com", password: "" });
    expect(issue?.message).toBe("กรุณากรอกรหัสผ่าน");
    expect(issue?.path).toEqual(["password"]);
  });
});
