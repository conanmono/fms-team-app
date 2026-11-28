# Code Review Standards

เกณฑ์ที่ subagent `code-reviewer` ใช้ตัดสิน diff ของโปรเจกต์ CodingThailand Academy
(Next.js 16 App Router + Prisma 7/SQLite + Better Auth) ไฟล์นี้เป็นไฟล์ harness ที่ hook `protect-files.mjs`
ป้องกันไว้ ให้มนุษย์แก้ผ่าน PR เท่านั้น ส่วน CI ต้องอ่านไฟล์นี้จาก base branch ไม่ใช่จาก PR ที่กำลัง review

## Correctness
- Meet acceptance criteria: ตรงตาม acceptance criteria ใน `specs/<feature>.md` (ถ้ามี) และ requirement/acceptance criteria ใน `docs/requirements/user-stories-and-test-cases.md`
- Handle invalid input and edge cases: ค่าว่าง, ค่าติดลบ, ค่าขอบ เช่น คืนเงินวันที่ 7 vs 8, progress 20% vs 21%
- Preserve existing behavior: ไม่เปลี่ยนพฤติกรรมเดิมที่ไม่เกี่ยวกับงาน
- เงินเป็น integer สตางค์ทุกที่ (ชื่อลงท้าย `Satang`) ห้ามคำนวณเป็นทศนิยม แสดงผลด้วย `formatTHB`
- เปอร์เซ็นต์ปัดลง ยอดสุทธิไม่ติดลบ เศษสตางค์ลงรายการสุดท้าย
- เวลาใน domain ต้องรับ `Clock` ห้ามเรียก `new Date()` / `Date.now()` ตรง ๆ วันที่ธุรกิจตีความตาม Asia/Bangkok
- งานที่เขียนหลายตาราง (order + enrollment, refund) ต้องอยู่ใน `$transaction`

## Security
- Validate external input: input จากฟอร์ม, search params, route params และ body ต้องผ่าน schema validation ฝั่ง server (แนะนำ zod)
- Never hardcode secrets: secret, API key, URL ของ environment ต้องอ่านจาก `process.env` และมีชื่อใน `.env.example`
- Enforce authentication and authorization: Server Action และ Route Handler ต้องตรวจ session และ role (`user.role = 'admin'`) ภายในฟังก์ชันเอง และตรวจ **ownership** ของ resource (order, enrollment, review, progress) ก่อนอ่านหรือแก้ ห้ามพึ่งการซ่อนปุ่มใน UI
- ห้ามส่ง secret หรือข้อมูลของผู้ใช้อื่นไป client component ตัวแปร env ที่ขึ้นต้น `NEXT_PUBLIC_` ต้องไม่ใช่ secret
- ประเด็นซับซ้อน (auth flow, injection, XSS) ให้รายงานและแนะนำส่งต่อ `security-reviewer`

## Error handling
- business error ไม่ throw ให้คืน `Result<T>` ด้วย `ok(...)` / `err(appError("CODE"))`
- รหัส error ใหม่ต้องอยู่ใน `ERROR_MESSAGES` (`src/lib/shared/errors.ts`) พร้อมข้อความภาษาไทย
- throw ได้เฉพาะ error ที่ไม่คาดคิด และต้องไม่กลืน error เงียบ ๆ (`catch {}` ที่ไม่ทำอะไร)

## Maintainability
- Avoid unnecessary complexity: ไม่สร้าง abstraction เกินความจำเป็น ไม่มีโค้ดตาย หรือโค้ดที่ comment ปิดไว้
- Use meaningful names: ชื่อไฟล์ kebab-case, component PascalCase
- Follow project architecture: กติกาธุรกิจเป็น pure function, เข้าถึง DB ผ่าน repository ที่รับ `PrismaClient`, route อยู่ใน route group ที่ถูกต้อง, Tailwind ผ่าน Turbopack loader (ห้ามเพิ่ม PostCSS config), ใช้ Server Component เป็นค่าเริ่มต้น, ข้อมูล dynamic อยู่ใน `<Suspense>` (Cache Components)
- ตาม `code-style.md`: ไม่มี `any`, ไม่มี `@ts-ignore` ที่ไม่มีเหตุผล, import Prisma จาก `generated/prisma/client` ไม่ใช่ `@prisma/client`, ใช้ alias `@/*` แทน `../../`, ไม่มี `console.log`

## Testing
- Cover important business rules: กติกาธุรกิจใหม่หรือที่แก้ต้องมีเทสต์ใน `__tests__/` ครอบคลุมค่าขอบ
- Include regression tests for bug fixes: bug fix ต้องมีเทสต์ที่ fail ก่อนแก้
- Do not weaken existing assertions: ห้ามลบเทสต์, `skip`, หรือผ่อน assertion เพื่อให้ผ่าน
- integration test ต้องใช้ `prisma/test.db` เท่านั้น ห้ามชี้ `dev.db`

## Breaking changes
- เปลี่ยน signature ของ function/type ที่มีผู้เรียกใช้ ต้องแก้ผู้เรียกทุกจุดใน diff เดียวกัน
- แก้ `prisma/schema.prisma` ต้องไม่ทำให้ข้อมูลเดิมหาย และต้องอัปเดต seed (`prisma/seed.ts`) ถ้าจำเป็น
- เปลี่ยน URL ของหน้าหรือ API ต้องอัปเดตลิงก์และ `.claude/skills/verify/feature-map.md`

## Quality harness
- ห้ามแก้กฎเพื่อให้ verification ผ่าน: `.claude/settings.json`, `.claude/hooks/`, `.claude/rules/review.md`, `eslint.config.mjs`, `tsconfig.json`, `vitest.config.mts`, `vitest.setup.ts`
- ห้ามปิด lint rule ด้วย `eslint-disable` โดยไม่มีเหตุผลกำกับ
- ห้ามแก้ `generated/`, `prisma/*.db`, `package-lock.json` ด้วยมือ

## Severity
| Severity | ความหมาย | ตัวอย่าง |
|---|---|---|
| Critical | ความเสียหายร้ายแรง ต้องแก้ทันที | secret หลุด, ข้ามการตรวจสิทธิ์ admin, คิดเงินผิดในทุกออเดอร์ |
| High | ปัญหาสำคัญ ต้องแก้ก่อนส่งมอบ | ไม่ตรวจ ownership, กติกาธุรกิจผิดที่ค่าขอบ, แก้กฎ harness, ลบ assertion |
| Medium | ควรพิจารณาแก้ | ขาดเทสต์ค่าขอบ, error handling ไม่ครบ, ผิดสถาปัตยกรรมแบบไม่กระทบผู้ใช้ |
| Low | ข้อเสนอแนะเพื่อปรับปรุง | ชื่อไม่สื่อ, comment ไม่อธิบายเหตุผล |

## Review Decision
- Block changes with critical or high-severity findings: มี Critical หรือ High อย่างน้อย 1 ข้อ → `CHANGES REQUIRED`
- Report minor improvements separately: Medium/Low ไม่ block รายงานแยกเป็นข้อเสนอแนะ → `APPROVED`
- ผลการ review เป็นการประเมิน ไม่ใช่การ block จริง การ block ต้องอยู่ใน CI หรือ branch protection
