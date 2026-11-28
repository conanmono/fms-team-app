import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

test("หน้า Home แสดงหัวข้อ h1", () => {
  render(<Page />);
  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "FMS @ KPRU page.tsx file.",
    }),
  ).toBeDefined();
});
