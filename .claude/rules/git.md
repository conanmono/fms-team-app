# Git workflow (ใช้กับทุกงาน)

## Branch
- ห้าม commit โดยตรงเข้าที่ main ให้แตก branch ก่อนเริ่มงาน เช่น `feat/<เรื่อง​>`, `fix/<เรื่อง>`

## Commit message

- ใช้ conventional commits: `<type>: <สรุปส้ันๆ>` โดย type คือ feat, fix, refactor, test, docs, chore
- ใช้ภาษาอังกฤษ ตัวพิมพ์เล็ก ไม่เกิน 72 ตัวอักษร เช่น `feat: add coupon validate at checkout`
- 1 commit ต่อ 1 เรื่อง ห้ามรวมการจัด format ไฟล์อื่นไปกับการแก้ logic

## ก่อน commit / เปิด PR

- ห้าม commit เองถ้าผู้ใช้ยังไม่ได้ดู diff และสั่งให้ commit
- งานที่แตะ `src/` หรือ `prisma/` ให้รัน skill `verify` ก่อน commit (gate → review → แอปจริง)
- ก่อนเปิด PR ต้องรัน `quality-gate-runner` ให้ผ่าน แล้วตามด้วย `code-reviewer` (+ `security-reviewer` ถ้าแตะ auth, API, Server Action, ฟอร์ม หรือ config)
- ห้าม commit `.env*` (ยกเว้น `.env.example`), `prisma/*.db` และ `generated/`