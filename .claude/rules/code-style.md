# Code style (ใช้กับทุกไฟล์)

## TypeScript

- เปิด strict mode ห้ามใช้ any ถ้าเลี่ยงไม่ได้ให้ใช้ unknown แล้ว narrow เอา
- การ import type ให้ใช้ import type { X } หรือ import { type X }
- ห้ามใช้ `@ts-ignore` / `@ts-expect-error` ถ้าไม่มี comment บอกเหตุผลกำกับไว้บรรทัดเดียวกัน

## Import

- ใน `src/` และ `__tests__/` ใช้ alias `@/*` (→ `src/*`) แทน relative path ที่ขึ้นไปเกิน 1 ระดับ (`../../`)
- Prisma Client import จาก `generated/prisma/client` (output ของ `prisma generate`) ห้าม import จาก `@prisma/client`

## รูปแบบโค้ด

- ชื่อไฟล์เป็น kebab-case เช่น allocate-discount.ts
- repo นี้ไม่มี formatter ให้ใช้สไตล์เดียวกับไฟล์อื่นในโฟลเดอร์นั้น: `src/lib/` ใช้ double quote ไม่มี semicolon, `src/app/` ใช้ double quote มี semicolon, `__tests__/` ใช้ single quote ไม่มี semicolon
- ห้าม reformat ไฟล์ที่ไม่ได้แก้ logic

> กฎในหัวข้อ TypeScript และ Import รวมถึง `console.log` ถูกตรวจอัตโนมัติด้วย hook `.claude/hooks/check-style.mjs` หลังแก้ไฟล์ใน `src/` และ `__tests__/`

## ข้อห้าม

- ห้ามทิ้ง console.log หรือโค้ดที่ comment ปิดไว้ใน commit
- ห้าม hard-code secret, API Key ให้อ่านจาก process.env หรือเพิ่มใน .env.example