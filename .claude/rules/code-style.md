# Code style (ใช้กับทุกไฟล์)

## TypeScript

- เปิด strict mode ห้ามใช้ any ถ้าเลี่ยงไม่ได้ให้ใช้ unknown แล้ว narrow เอา
- การ import type ให้ใช้ import type { X } หรือ import { type X }

## รูปแบบโค้ด

- ชื่อไฟล์เป็น kebab-case เช่น allocate-discount.ts

## ข้อห้าม

- ห้ามทิ้ง console.log หรือโค้ดที่ comment ปิดไว้ใน commit
- ห้าม hard-code secret, API Key ให้อ่านจาก process.env หรือเพิ่มใน .env.example