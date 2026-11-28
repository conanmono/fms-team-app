---
paths:
  - "__tests__/**/*"
  - "vitest.config.mts"
  - "vitest.setup.ts"
---
# Testing conventions

- ใช้ Vitest + React Testing Library เทสต์อยู่ใน `__tests__/` และตั้งชื่อไฟล์ `<ชื่อไฟล์ที่เทสต์>.test.ts(x)`
- ชื่อ test เขียนเป็นภาษาไทย บอกพฤติกรรมที่คาดหวัง เช่น `test("คูปอง PERCENT ไม่เกินเพดานส่วนลด", ...)`
- ค้น element ด้วย `getByRole` / `getByLabelText` ก่อน ใช้ `getByTestId` เป็นทางเลือกสุดท้าย
- business error ให้ assert ที่ `code` ไม่ใช่ข้อความ: `expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: "COUPON_INACTIVE" }) })`
- เทสต์ที่เกี่ยวกับเวลาต้องใช้ `fixedClock(...)` ห้ามพึ่งเวลาจริง
- เงินใน fixture เป็นสตางค์เสมอ (`129050` ไม่ใช่ `1290.5`)
- กติกาทางธุรกิจต้องมีเทสต์ครอบคลุมค่าขอบ (boundary) เช่น คืนเงินวันที่ 7 กับวันที่ 8 และ progress 20% กับ 21%

## Integration test กับฐานข้อมูล
- ใช้ได้เฉพาะ `prisma/test.db` (สร้างด้วย `npm run db:test:setup`) **ห้ามชี้ไปที่ `dev.db` เด็ดขาด**
- inject `PrismaClient` ที่ชี้ test.db เข้า repository ห้าม mock Prisma ทั้งก้อน

## ข้อจำกัด
- Vitest render `async` Server Component ไม่ได้ ให้แยก logic ไปเป็น function แล้วเทสต์ตรง ๆ หรือเทสต์เฉพาะ client component ที่รับ props
