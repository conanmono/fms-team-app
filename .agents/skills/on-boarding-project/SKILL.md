---
name: on-boarding-project
description: พาสมาชิกใหม่ตั้งค่าโปรเจกต์ CodingThailand Academy (Next.js 16 + Prisma 7/SQLite + Better Auth) ตั้งแต่ clone จนรัน dev server และ login ได้ ใช้เมื่อผู้ใช้พูดว่า "on-board", "เริ่มโปรเจกต์ครั้งแรก", "ตั้งค่าเครื่องใหม่", "setup project", "รันโปรเจกต์ไม่ขึ้น" หรือเพิ่ง clone repo มา
---

# On-boarding Project

พาผู้ใช้ตั้งค่าโปรเจกต์ให้รันได้ครบในรอบเดียว ทำทีละขั้น ตรวจผลก่อนไปขั้นถัดไป และสรุปให้ผู้ใช้เห็นว่าผ่านอะไรแล้ว

## สิ่งที่โปรเจกต์ใช้ (อ่านจาก package.json)

- Next.js 16.4 + React 19.3 (App Router), TypeScript strict
- Prisma 7 + SQLite ผ่าน `@prisma/adapter-better-sqlite3` — ฐานข้อมูลคือไฟล์ `prisma/dev.db` ไม่ต้องติดตั้ง MySQL
- Prisma config อยู่ที่ `prisma.config.ts` (โหลด `.env` ด้วย `dotenv/config`, seed รันด้วย `tsx prisma/seed.ts`), Client generate ไปที่ `generated/prisma/`
- Better Auth (ต้องมี `BETTER_AUTH_SECRET` และ `BETTER_AUTH_URL`)
- shadcn/ui + Tailwind CSS v4 ผ่าน `@tailwindcss/postcss` (`postcss.config.mjs`)
- ฟอร์ม: react-hook-form + zod, state: zustand, กราฟ: recharts

## กติกาสำคัญ

- **ห้ามอ่าน/แก้ `.env` เอง** hook `protect-files` จะบล็อก และห้ามหาทางเลี่ยง ขั้นที่ต้องใส่ค่าลับให้ผู้ใช้ทำเองผ่าน `! <command>` หรือเปิดไฟล์แก้เอง
- ห้ามพิมพ์ค่า secret ลงในแชตหรือ commit `.env`
- ถ้าขั้นไหนล้ม ให้หยุด อธิบายสาเหตุจาก error จริง แล้วแก้ก่อนไปต่อ

## ขั้นตอน

### 1. ตรวจเครื่องมือ

```bash
node -v && npm -v && git --version
```

Node ต้อง **20.9.0 ขึ้นไป** ถ้าต่ำกว่าให้แนะนำอัปเกรด (เช่นผ่าน nvm/fnm) แล้วหยุดรอ

### 2. สร้าง `.env`

```bash
test -f .env && echo "มี .env แล้ว" || cp .env.example .env
```

`DATABASE_URL="file:./prisma/dev.db"` ตั้งมาแล้ว ไม่ต้องแก้

### 3. ตั้ง `BETTER_AUTH_SECRET` (ห้ามข้าม)

ถ้าปล่อยว่าง `npm run dev` ยังรันได้ แต่ `npm run build` จะพังด้วย `You are using the default secret`

ให้ผู้ใช้สุ่มค่าเองด้วย `! npx @better-auth/cli secret` (หรือ `! openssl rand -base64 32` บน macOS/Linux) แล้วนำไปใส่ใน `.env` เอง:

```env
BETTER_AUTH_SECRET=<ค่าที่สุ่มได้>
BETTER_AUTH_URL=http://localhost:3000
```

ถามผู้ใช้ให้ยืนยันว่าใส่แล้วก่อนไปขั้นถัดไป

### 4. ติดตั้ง dependencies

```bash
npm install
npm install-scripts ls
```

npm 11 บล็อก install script ของ dependency เป็นค่าเริ่มต้น อนุญาตเฉพาะแพ็กเกจที่อยู่ในฟิลด์ `allowScripts` ของ `package.json` (ตอนนี้มี `better-sqlite3`, `prisma`, `@prisma/engines`, `esbuild` แบบล็อกเวอร์ชัน)

- ถ้า `npm install-scripts ls` ขึ้น `No packages with unreviewed install scripts.` = ผ่าน
- ถ้ามีรายการค้าง (มักเกิดหลังอัปเกรดแพ็กเกจพวกนี้) **อย่า approve เอง** ให้แสดงรายการแล้วให้ผู้ใช้ตัดสินใจ ถ้าผู้ใช้อนุมัติให้รัน `npm install-scripts approve <pkg...> && npm rebuild` (การ approve จะแก้ `package.json` ต้อง commit ด้วย)
- ตรวจว่า SQLite ใช้ได้: `node -e 'require("better-sqlite3")(":memory:")'` ถ้า error เรื่อง bindings แปลว่า script ของ `better-sqlite3` ยังไม่ได้รัน

### 5. เตรียมฐานข้อมูล

```bash
npx prisma generate   # สร้าง Prisma Client ที่ generated/prisma/
npx prisma db push    # สร้าง prisma/dev.db พร้อมตารางทั้งหมด
```

### 6. ใส่ข้อมูลตัวอย่าง

```bash
npm run db:seed
```

ได้ 5 หมวดหมู่, 13 คอร์ส, ~75 บทเรียน, คูปอง 3 ใบ, ผู้ใช้ 22 คน และคำสั่งซื้อย้อนหลัง 90 วัน รันซ้ำได้ (ลบข้อมูล `@example.com` เดิมก่อน)

ถ้าจะเขียน integration test ให้สร้างฐานข้อมูลแยกด้วย `npm run db:test:setup` (ได้ `prisma/test.db`, ใส่ `-- --empty` ถ้าต้องการตารางเปล่า) — ห้ามให้เทสต์ชี้ไปที่ `dev.db`

### 7. ตรวจคุณภาพ

```bash
npm run lint
npx tsc --noEmit
```

### 8. รันเซิร์ฟเวอร์

แนะนำให้ผู้ใช้รัน `npm run dev` เอง แล้วเปิด http://localhost:3000

ถ้ารันพอร์ตอื่นต้องตั้ง `BETTER_AUTH_URL` ให้ตรง ไม่งั้น login ขึ้น `Invalid origin`:
`BETTER_AUTH_URL=http://localhost:3100 npm run dev -- -p 3100`

## บัญชีทดสอบหลัง seed (รหัสผ่าน `password123` ทุกบัญชี)

| อีเมล | บทบาท |
|---|---|
| `admin@example.com` | แอดมิน เข้า `/admin` ได้ |
| `user@example.com` | ซื้อคอร์ส React ไว้ 2 วันก่อน เรียนไป 1 บท (ยังขอคืนเงินได้) |
| `student01…20@example.com` | ลูกค้าที่มีประวัติการสั่งซื้อ |

## ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `You are using the default secret` ตอน build | ยังไม่ได้ตั้ง `BETTER_AUTH_SECRET` (ขั้น 3) |
| `Invalid origin` ตอน login | `BETTER_AUTH_URL` ไม่ตรงกับพอร์ตที่รัน |
| `Could not locate the bindings file` (better-sqlite3) | install script ถูกข้าม ดู `npm install-scripts ls` แล้ว approve + `npm rebuild` (ขั้น 4) |
| import `generated/prisma` ไม่เจอ | ยังไม่ได้ `npx prisma generate` |
| `no such table` | ยังไม่ได้ `npx prisma db push` หรือแก้ schema แล้วยังไม่ push ใหม่ |
| หน้า `/admin` เข้าไม่ได้ | ใช้ `admin@example.com` หรือแก้ `role` เป็น `admin` ผ่าน `npx prisma studio` แล้ว logout/login ใหม่ |

## สรุปท้าย on-boarding

แจ้งผู้ใช้เป็นตาราง ✅/❌ ของแต่ละขั้น และชี้เอกสารที่ควรอ่านต่อ:

- `README.md` — กติกาทางธุรกิจ (เงินเก็บเป็นสตางค์, คูปอง, คืนเงิน 7 วัน/20%) และรายการหน้าเว็บ
- `docs/requirements/user-stories-and-test-cases.md` — user stories และ test cases
- `CLAUDE.md`, `AGENTS.md` — มาตรฐานทีม (อ่าน docs ใน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด Next.js)
- `docs/subagents.md`, `docs/hooks.md` — subagents และ hooks ของทีม
