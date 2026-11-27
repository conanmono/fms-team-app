# Course Platform Kit — ข้อมูลตั้งต้นของแพลตฟอร์มขายคอร์ส CodingThailand Academy

ชุดนี้ใช้กับโปรเจกต์ที่สร้างจาก `create-next-app` (TypeScript + Tailwind + App Router + `src/` + alias `@/*`) มีเฉพาะ **ข้อมูลและกติกาของแอป** ส่วนหน้าเว็บ, Vitest, subagents และ hooks นักเรียนจะสร้างเองระหว่าง workshop

## ในชุดนี้มีอะไร

| ไฟล์/โฟลเดอร์ | ใช้ทำอะไร |
|---|---|
| `prisma/schema.prisma` | โครงสร้างฐานข้อมูล (SQLite) |
| `prisma/seed.ts`, `prisma/seed-data/` | ข้อมูลตัวอย่าง: 5 หมวด, 13 คอร์ส, ~75 บทเรียน, คูปอง 3 ใบ, ผู้ใช้ 22 คน, คำสั่งซื้อ 90 วัน |
| `prisma.config.ts` | ตั้งค่า Prisma 7 และคำสั่ง seed |
| `scripts/setup-test-db.mjs` | สร้างฐานข้อมูลสำหรับเทสต์ `prisma/test.db` แยกจาก `dev.db` |
| `src/lib/` | กติกาธุรกิจที่ seed ใช้: เงิน (สตางค์), คูปอง, กระจายส่วนลด, progress, รหัสใบประกาศ |
| `public/course-image/` | รูปปกคอร์ส 13 รูป |
| `docs/requirements/` | user stories และ test case design |
| `.env.example` | ต้นแบบไฟล์ `.env` |

## ขั้นตอน

### 1. คัดลอกไฟล์

คัดลอก **ทุกอย่างในโฟลเดอร์นี้** (รวมไฟล์ที่ขึ้นต้นด้วยจุด `.env.example`) ไปวางที่ root ของโปรเจกต์ ให้ `prisma/` อยู่ระดับเดียวกับ `package.json` และ `src/lib/` อยู่ใน `src/` เดิม

> macOS/Linux: `cp -R course-platform-kit/. ./` — Finder ซ่อนไฟล์ที่ขึ้นต้นด้วยจุด กด `Cmd+Shift+.` เพื่อให้เห็น

### 2. ติดตั้ง dependency

```bash
npm install @prisma/client@^7.10.0 @prisma/adapter-better-sqlite3@^7.10.0 better-auth@^1.7.0 dotenv@^17.4.2
npm install -D prisma@^7.10.0 tsx@^4.21.0
```

npm 11 จะไม่รัน install script ของ dependency จนกว่าจะอนุมัติ ตรวจด้วย:

```bash
npm install-scripts ls
```

ถ้ามี `better-sqlite3`, `prisma`, `@prisma/engines`, `esbuild` ค้างอยู่ ให้อนุมัติแล้ว rebuild (การอนุมัติจะบันทึกลงฟิลด์ `allowScripts` ใน `package.json`):

```bash
npm install-scripts approve better-sqlite3 prisma @prisma/engines esbuild
npm rebuild
```

### 3. เพิ่ม script ใน `package.json`

```bash
npm pkg set scripts.db:seed="prisma db seed" scripts.db:test:setup="node scripts/setup-test-db.mjs"
```

### 4. แก้ `.gitignore`

create-next-app ใส่ `.env*` ไว้ ซึ่งจะ ignore `.env.example` ไปด้วย ให้เพิ่มบรรทัดเหล่านี้ท้ายไฟล์:

```gitignore
!.env.example

/generated/prisma

# sqlite
prisma/*.db
prisma/*.db-journal
prisma/*.db.bak
```

### 5. สร้าง `.env` และตั้ง `BETTER_AUTH_SECRET`

```bash
cp .env.example .env
npx @better-auth/cli secret
```

> Windows (Command Prompt) ใช้ `copy .env.example .env`

นำค่าที่สุ่มได้ไปใส่ใน `.env` ที่บรรทัด `BETTER_AUTH_SECRET=` (**ห้ามข้าม** ไม่งั้น `npm run build` จะพังเมื่อเริ่มใช้ Better Auth) ส่วน `DATABASE_URL` ตั้งไว้ให้แล้ว

### 6. สร้างฐานข้อมูลและใส่ข้อมูลตัวอย่าง

```bash
npx prisma generate    # สร้าง Prisma Client ที่ generated/prisma/
npx prisma db push     # สร้าง prisma/dev.db พร้อมตาราง
npm run db:seed        # ใส่ข้อมูลตัวอย่าง (รันซ้ำได้)
```

### 7. ตรวจว่าพร้อม

```bash
npx tsc --noEmit
npx prisma studio      # เปิดดูข้อมูลในเบราว์เซอร์
```

## บัญชีตัวอย่าง (รหัสผ่าน `password123` ทุกบัญชี)

| อีเมล | หมายเหตุ |
|---|---|
| `admin@example.com` | ผู้ดูแลระบบ (`role = admin`) |
| `user@example.com` | ซื้อคอร์ส React ไว้ 2 วันก่อน เรียนไป 1 บท (ยังขอคืนเงินได้) |
| `student01…20@example.com` | ลูกค้าที่มีประวัติการสั่งซื้อ |

## กติกาทางธุรกิจ

| เรื่อง | กติกา | ไฟล์ |
|---|---|---|
| เงิน | เก็บเป็น **สตางค์ (Int)** ทุกที่ แสดงผลด้วย `formatTHB` | `src/lib/shared/money.ts` |
| คูปอง | `PERCENT` (ปัดลงเป็นสตางค์ + เพดานส่วนลด) / `FIXED` ส่วนลดไม่เกินยอดรวม, 1 ใบต่อคำสั่งซื้อ | `src/lib/coupon/coupon-rules.ts` |
| กระจายส่วนลด | แบ่งตามสัดส่วนราคา เศษสตางค์ไปรายการสุดท้าย | `src/lib/checkout/allocate-discount.ts` |
| ความคืบหน้า | `floor(จบ / ทั้งหมด × 100)` ครบ 100% ออกใบประกาศ `CT-YYYY-XXXXXX` | `src/lib/learning/` |
| ชำระเงิน* | Fake gateway: `4242424242424242` ผ่าน, `4000000000000002` ถูกปฏิเสธ, `4000000000000119` ระบบล่ม | |
| คืนเงิน* | รายคอร์ส ภายใน **7 วัน** และเรียน **ไม่เกิน 20%** | |
| รีวิว* | เฉพาะผู้ลงทะเบียน 1 คน 1 รีวิว/คอร์ส คะแนน 1–5 ความยาว 10–1000 | |

\* สร้างระหว่าง workshop — รายละเอียดและ test case อยู่ใน `docs/requirements/user-stories-and-test-cases.md`

## ปัญหาที่เจอบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `Could not locate the bindings file` | install script ของ `better-sqlite3` ไม่ได้รัน ทำขั้นที่ 2 (approve + `npm rebuild`) |
| `Cannot find module '../generated/prisma/client'` | ยังไม่ได้ `npx prisma generate` |
| `no such table` | ยังไม่ได้ `npx prisma db push` |
| `ไม่พบ DATABASE_URL` | ยังไม่ได้สร้าง `.env` (ขั้นที่ 5) |
| `Cannot find module '@/lib/...'` | โปรเจกต์ไม่ได้ใช้ `src/` หรือ alias ไม่ใช่ `@/*` → `./src/*` ตรวจ `paths` ใน `tsconfig.json` |
