import { describe, expect, test } from "vitest";
import { safeRedirectPath } from "@/lib/shared/redirect";

describe("safeRedirectPath", () => {
  test("TC-01-13 path ภายในเว็บใช้ได้ตามเดิม", () => {
    expect(safeRedirectPath("/checkout")).toBe("/checkout");
  });

  test.each([null, undefined, ""])("TC-01-14 ค่าว่าง (%s) ได้ /", (input) => {
    expect(safeRedirectPath(input)).toBe("/");
  });

  test("TC-01-15 URL ภายนอกได้ /", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/");
  });

  test.each(["//evil.com", "/\\evil.com"])("TC-01-16 %s ได้ /", (input) => {
    expect(safeRedirectPath(input)).toBe("/");
  });

  test("TC-01-17 tab ที่ browser ตัดทิ้งแล้วกลายเป็น //evil.com ได้ /", () => {
    expect(safeRedirectPath("/\t/evil.com")).toBe("/");
  });

  test("TC-01-18 normalize path ด้วย URL parser", () => {
    expect(safeRedirectPath("/ok/../admin")).toBe("/admin");
  });

  test("คง query string ไว้", () => {
    expect(safeRedirectPath("/courses?level=beginner")).toBe(
      "/courses?level=beginner",
    );
  });
});
