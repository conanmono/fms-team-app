---
paths:
  - "src/app/**/*"
  - "src/components/**/*"
  - "next.config.ts"
---
# Next.js 16 / UI conventions

## ก่อนเขียนโค้ด
- อ่านเอกสารใน `node_modules/next/dist/docs/` ก่อนใช้ API ของ Next.js ถ้าไม่แน่ใจให้ใช้ subagent `nextjs-docs-researcher` อย่าเขียนจากความจำ

## Cache Components (`cacheComponents: true`)
- Server Component ที่อ่านข้อมูล dynamic (cookies, headers, searchParams, DB ต่อผู้ใช้) ต้องอยู่ใน `<Suspense>` และต้องมี fallback
- ข้อมูลที่ cache ได้ (เช่น รายการคอร์สที่เผยแพร่แล้ว) ให้ใช้ `"use cache"` พร้อม `cacheLife` / `cacheTag` แทนการ fetch ซ้ำทุก request
- หลัง mutation ให้ล้าง cache ด้วย tag ที่ตรงกับตอน cache (`updateTag` / `revalidateTag` อ่านความต่างใน `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/` ก่อนเลือก)

## Route & Props
- layout/page ใช้ type `LayoutProps<"/route">` / `PageProps<"/route">` ที่ระบบ generate ให้ ห้ามเขียน prop type เอง
- route ใหม่ให้อยู่ใน route group: `(front)` storefront/เรียน, `(auth)` login/register, `(admin)` หลังบ้าน (ตอนนี้มีแค่ `src/app/page.tsx` ถ้าย้ายหน้าแรกเข้า `(front)` ให้แก้ `__tests__/page.test.tsx` และ `feature-map.md` ด้วย)

## Server vs Client
- ใช้ Server Component เป็นค่าเริ่มต้น ใส่ `"use client"` เฉพาะ component ที่ต้องมี state, event handler หรือ browser API และแยกให้เป็น component ใบเล็กที่สุด
- Server Action และ Route Handler ต้องตรวจ session/role ภายในฟังก์ชันเองทุกครั้ง ห้ามพึ่งการซ่อนปุ่มใน UI
- input จากฟอร์มต้อง validate ฝั่ง server ด้วย schema (แนะนำ zod) ใช้ schema เดียวกันทั้ง client และ server ถ้ายังไม่ได้ติดตั้ง library ให้เสนอผู้ใช้ก่อน ห้ามติดตั้งเอง

## UI
- repo นี้ยังไม่มี UI library ถ้าจะใช้ shadcn ต้อง `npx shadcn init` ก่อน และให้ผู้ใช้ยืนยันตัวเลือก หลังจากนั้นเพิ่ม component ด้วย `npx shadcn add <ชื่อ>` ไม่ต้อง copy มาวาง
- สีใช้ theme token จาก `@theme inline` ใน `src/app/globals.css` (ตอนนี้มี `--background`, `--foreground`) ถ้าต้องการสีใหม่ให้เพิ่ม token ก่อน ห้าม hard-code hex
- Tailwind v4 รันผ่าน **Turbopack loader** (`@tailwindcss/turbopack` ใน `next.config.ts`) ไม่ใช่ PostCSS ห้ามเพิ่ม `postcss.config.*` หรือ `tailwind.config.*` ให้ปรับ theme ใน `globals.css`
- แสดงเงินด้วย `formatTHB` เท่านั้น
- `next/image` กับรูปจากโดเมนอื่น ต้องเพิ่ม host ใน `images.remotePatterns` ของ `next.config.ts` ก่อน (ตอนนี้ยังไม่มี รูปคอร์สอยู่ใน `public/course-image/`)
