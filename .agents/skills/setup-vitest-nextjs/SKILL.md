---
name: setup-vitest-nextjs
description: ติดตั้งและตั้งค่า Vitest + React Testing Library ในโปรเจกต์ Next.js (App Router) พร้อมเขียน unit test แรกและรันให้ผ่าน ใช้เมื่อผู้ใช้ขอ "ติดตั้ง vitest", "ตั้งค่า unit test", "เพิ่ม test ให้ Next.js" หรือโปรเจกต์ยังไม่มี test framework
---

# ติดตั้ง Vitest ใน Next.js

Skill นี้พาติดตั้ง **Vitest** คู่กับ **React Testing Library** สำหรับเขียน **Unit Test** ในโปรเจกต์ Next.js
ทำตามทีละขั้น และอธิบายให้ผู้ใช้ฟังสั้น ๆ ว่าแต่ละขั้นทำไปเพื่ออะไร (ใช้สอน)

> **ข้อควรรู้:** Vitest ยังไม่รองรับ `async` Server Components
> ทดสอบได้เฉพาะ Server Component แบบ sync และ Client Component
> ถ้าเป็น `async` component ให้ใช้ **E2E test** (เช่น Playwright) แทน

---

## ขั้นที่ 0 — ตรวจโปรเจกต์ก่อน

ดูให้รู้ 5 อย่างก่อนลงมือ:

1. **Package manager** — ดูจาก lock file
   - `package-lock.json` → npm
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → yarn
   - `bun.lock` / `bun.lockb` → bun
2. **ภาษา** — มี `tsconfig.json` ไหม (TypeScript หรือ JavaScript)
3. **ตำแหน่ง app** — อยู่ที่ `src/app/` หรือ `app/`
4. **ติดตั้งไปแล้วหรือยัง** — มี `vitest` ใน `package.json` หรือมี `vitest.config.*` อยู่แล้วไหม
   ถ้ามีแล้ว ให้แจ้งผู้ใช้และถามก่อนว่าจะเขียนทับหรือไม่
5. **เวอร์ชัน `@types/node`** — เทียบกับ `node -v`
   Vitest 5 ต้องการ `@types/node` เวอร์ชัน `^22` หรือ `>=24` ถ้าโปรเจกต์ยังเป็น `^20` (ค่าเริ่มต้นของ `create-next-app` รุ่นเก่า) npm จะติดตั้งไม่ผ่าน ดูขั้นที่ 1

---

## ขั้นที่ 1 — ติดตั้ง package

ติดตั้งเป็น dev dependencies (ตัวอย่างนี้ใช้ npm — เปลี่ยนตาม package manager ที่เจอ)

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
```

| Package                  | หน้าที่                                           |
| ------------------------ | ---------------------------------------------- |
| `vitest`                 | ตัวรันเทส                                        |
| `@vitejs/plugin-react`   | ให้ Vitest เข้าใจ JSX / React                    |
| `jsdom`                  | จำลอง browser (DOM) ให้เทสรันได้ใน Node           |
| `@testing-library/react` | render component แล้วค้นหา element แบบที่ผู้ใช้มองเห็น |
| `@testing-library/dom`   | ตัวช่วยค้นหา DOM (peer dependency ของตัวบน)        |

> **ไม่ต้องติดตั้ง `vite-tsconfig-paths`** (เอกสาร Next.js ยังแนะนำอยู่)
> Vitest 5 ใช้ Vite 8 ที่อ่าน path alias จาก `tsconfig.json` ได้เองแล้ว
> ถ้าติดตั้งไป Vite จะขึ้นคำเตือนให้ถอดออก

### ถ้าเจอ `ERESOLVE ... peerOptional @types/node`

แปลว่า `@types/node` ในโปรเจกต์เก่าเกินไป ให้อัปเกรดให้ตรงกับ Node ที่ใช้อยู่ไปพร้อมกันเลย
(เช่น `node -v` ได้ `v24.x` → ใช้ `@types/node@^24`)

```bash
npm install -D @types/node@^<major ของ node> vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
```

**อย่าใช้ `--force` หรือ `--legacy-peer-deps`** เพราะแค่ข้ามปัญหาไป ไม่ได้แก้

---

## ขั้นที่ 2 — สร้างไฟล์ config และ setup

สร้าง 2 ไฟล์ที่ root ของโปรเจกต์

**`vitest.config.mts`** (TypeScript)

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, // ให้ import '@/...' ใช้ได้ในเทส
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

**`vitest.setup.ts`**

```ts
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

ทำไมต้องมีไฟล์ setup:

- Testing Library จะล้าง DOM หลังจบแต่ละเทสเองก็ต่อเมื่อเปิด `globals: true` ซึ่ง config นี้ไม่ได้เปิด
- ถ้าไม่มี `cleanup()` ของที่ render ในเทสแรกจะค้างอยู่ เทสถัดไปจะเจอ error `Found multiple elements`

> ใช้นามสกุล `.mts` เพื่อบังคับให้ไฟล์ config เป็น ES Module แม้ `package.json` จะไม่มี `"type": "module"`
> ถ้าเป็นโปรเจกต์ JavaScript ให้ใช้ `vitest.config.js` / `vitest.setup.js` เนื้อหาเดียวกัน

---

## ขั้นที่ 3 — เพิ่ม script ใน `package.json`

เพิ่ม `"test"` ใน `scripts` โดย **ไม่แตะ** script เดิม

```bash
npm pkg set scripts.test=vitest
```

- `npm run test` → รันแบบ **watch** (แก้โค้ดแล้วรันใหม่อัตโนมัติ) เหมาะตอนพัฒนา
- `npx vitest run` → รันครั้งเดียวแล้วจบ เหมาะกับ CI และตอนตรวจผล

---

## ขั้นที่ 4 — เขียนเทสแรก

สร้างโฟลเดอร์ `__tests__/` ที่ root แล้วเขียนเทสหน้า Home

**`__tests__/page.test.tsx`**

```tsx
import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

test("หน้า Home แสดงหัวข้อ h1", () => {
  render(<Page />);
  expect(
    screen.getByRole("heading", { level: 1, name: "<ข้อความใน h1 จริง>" }),
  ).toBeDefined();
});
```

ข้อควรปรับก่อนใช้:

- **path import** — ถ้า app อยู่ที่ `src/app/` ใช้ `@/app/page` ได้เลย (alias `@/*` → `./src/*`)
  ถ้าไม่มี alias ให้ใช้ relative path เช่น `../app/page`
- **เนื้อหาที่ตรวจ** — เปิด `page.tsx` ดูก่อนว่ามี `<h1>` จริงไหม และข้อความคืออะไร
  `name` คือข้อความทั้งหมดใน h1 รวม element ข้างใน เช่น
  `<h1>edit the <code>page.tsx</code> file.</h1>` → `name: 'edit the page.tsx file.'`
  ถ้าไม่มี `<h1>` ให้เลือกตรวจ element อื่นที่มีอยู่จริง **ห้ามแก้หน้าเว็บเพื่อให้เทสผ่าน** เว้นแต่ผู้ใช้สั่ง
- **ถ้า `page.tsx` เป็น `async`** — Vitest เทสไม่ได้ (ดูข้อควรรู้ด้านบน) ให้เลือก component sync ตัวอื่นแทน

> จะวางไฟล์เทสไว้ข้าง component ใน `app/` ก็ได้ เช่น `app/page.test.tsx` — `__tests__/` เป็นแค่ธรรมเนียมที่นิยม

---

## ขั้นที่ 5 — รันและตรวจผล

```bash
npx vitest run
```

ผลที่ต้องการ: ทุกเทส **passed** ✅ และ **ไม่มีคำเตือน**

จากนั้นรัน type-check และ lint ของโปรเจกต์ (ดูคำสั่งใน `CLAUDE.md` / `package.json`)
เพื่อเช็กว่าไฟล์ใหม่ไม่ทำให้ type หรือ lint พัง

ถ้ายังไม่ผ่าน ให้ดูตารางนี้ก่อน

| อาการ                                          | สาเหตุที่พบบ่อย                         | วิธีแก้                                           |
| ---------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| `ERESOLVE ... @types/node` ตอนติดตั้ง             | `@types/node` เก่ากว่าที่ Vitest ต้องการ | อัปเกรด `@types/node` (ขั้นที่ 1)                   |
| `The plugin "vite-tsconfig-paths" is detected` | ใช้ plugin ตามเอกสารเก่า              | ถอด plugin แล้วใช้ `resolve.tsconfigPaths: true` |
| `Failed to resolve import "@/..."`             | ไม่ได้เปิด `tsconfigPaths`             | ใส่ `resolve.tsconfigPaths: true`               |
| `document is not defined`                      | ไม่ได้ตั้ง environment                  | ใส่ `environment: 'jsdom'`                      |
| `Found multiple elements with the role ...`    | DOM ไม่ถูกล้างระหว่างเทส                | เพิ่ม `vitest.setup.ts` ที่เรียก `cleanup()`        |
| `Unable to find role="heading"`                | ข้อความ/ระดับหัวข้อไม่ตรง                | เปิด `page.tsx` ดูของจริงแล้วแก้เทส                 |
| เทส `async` component ไม่ผ่าน                    | Vitest ไม่รองรับ                      | ใช้ E2E test แทน                                |

---

## ขั้นที่ 6 — สรุปให้ผู้ใช้

แจ้งผู้ใช้สั้น ๆ ว่า:

1. ติดตั้ง package อะไรไปบ้าง (และอัปเกรด `@types/node` หรือไม่)
2. สร้าง / แก้ไฟล์อะไร (`vitest.config.mts`, `vitest.setup.ts`, `package.json`, `__tests__/page.test.tsx`)
3. ผลการรันเทส, type-check และ lint
4. คำสั่งที่ใช้ต่อ: `npm run test` (watch) และ `npx vitest run` (รันครั้งเดียว)

---

## อ้างอิง

- เอกสาร Next.js: `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`
  หรือ https://nextjs.org/docs/app/guides/testing/vitest
  (ยังใช้ `vite-tsconfig-paths` — skill นี้เปลี่ยนเป็นแบบ native ตามคำแนะนำของ Vite 8)
- ตัวอย่างสำเร็จรูป: `npx create-next-app@latest --example with-vitest with-vitest-app`
- Vitest: https://vitest.dev/guide/
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
