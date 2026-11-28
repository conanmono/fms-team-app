---
name: verify
description: ตรวจว่าการเปลี่ยนแปลงใช้งานได้จริงแบบ end-to-end ก่อน commit — รัน quality gate, ส่ง diff ให้ code-reviewer/security-reviewer แล้วแก้ finding, เปิดแอปจริง (dev server + SQLite seed), ยิง smoke test แล้วไล่ flow ของผู้ใช้ในเบราว์เซอร์ตาม feature map พร้อมเก็บหลักฐาน ใช้ทุกครั้งก่อน commit หรือเปิด PR ที่แตะ src/ หรือ prisma/ และเมื่อผู้ใช้พูดว่า "verify", "ตรวจงาน", "ลองในแอปจริง", "smoke test", "เช็กว่าใช้ได้จริงไหม"
---

# Verify

พิสูจน์ว่างานที่เพิ่งแก้ **ใช้งานได้จริงในแอป** ไม่ใช่แค่ test ผ่าน
unit test ผ่านได้ทั้งที่ฟีเจอร์ยังพัง การเปิดแอปแล้วเดิน flow แบบผู้ใช้จริงหลอกได้ยากกว่า

ผลลัพธ์ของ skill นี้คือ **รายงานพร้อมหลักฐาน** ไม่ใช่คำว่า "น่าจะใช้ได้"

## กติกา (อ่านก่อนเริ่ม)

- **ห้ามแก้ตัวตรวจเพื่อให้ผ่าน** ห้ามแก้ test, `scripts/smoke.mjs`, `feature-map.md` หรือ hook ในงานเดียวกับที่กำลังถูกตรวจ ถ้าเห็นว่าตัวตรวจผิด ให้รายงานผู้ใช้แยกต่างหาก
- **ห้าม retry จนผ่าน** ถ้า check ล้มแบบไม่แน่นอน (flaky) ห้าม rerun ซ้ำ ห้ามใส่ sleep ห้าม skip ให้หาสาเหตุ ถ้าหาไม่เจอให้รายงานว่า flaky พร้อมหลักฐาน
- **แก้ได้ไม่เกิน 3 รอบ** ถ้าแก้โค้ดแล้ว verify ยังล้มครบ 3 รอบ ให้หยุดแล้วสรุปให้ผู้ใช้ตัดสินใจ อย่าวนต่อ
- **ใช้ `prisma/dev.db` เท่านั้นในการเปิดแอป** และ integration test ต้องชี้ `prisma/test.db` ตาม CLAUDE.md
- **ห้ามอ่าน/แก้ `.env`** ถ้าแอปบอกว่า env ขาด ให้ผู้ใช้แก้เอง
- **ใช้ข้อมูลทดสอบเท่านั้น** บัญชี `@example.com` และบัตร fake gateway ห้ามกรอกข้อมูลจริงของใครในเบราว์เซอร์
- **ไม่ commit เอง** skill นี้จบที่รายงาน การ commit ต้องรอผู้ใช้ดู diff และสั่งก่อน

## ขั้นตอน

ทำตามลำดับ ขั้นที่ถูกกว่าไปก่อน ถ้าขั้นไหนล้มให้หยุดแก้ก่อนไปขั้นถัดไป (ไม่ต้องเปิดเบราว์เซอร์ถ้า type-check ยังพัง)

### 0. ดูว่าเปลี่ยนอะไร แล้วเลือกสิ่งที่ต้องตรวจ

```bash
git status --short && git diff --stat HEAD
```

เปิด [feature-map.md](feature-map.md) แล้วเลือก **เฉพาะฟีเจอร์ที่ไฟล์ใน diff ไปแตะ** (ดูคอลัมน์ "ไฟล์ที่เกี่ยว") บวก smoke พื้นฐาน (หน้าแรก + login) เสมอ
ถ้าแก้ของที่ใช้ร่วมกัน (`src/lib/shared/`, `src/app/layout.tsx`, `globals.css`, `prisma/schema.prisma`, auth) ให้ตรวจทุกฟีเจอร์ที่มีหน้าแล้ว

ถ้า diff มี route ใหม่ใน `src/app/` (`page.tsx`, `route.ts`) ที่ยังไม่มีแถวใน feature map ให้บันทึกเป็น ⚠️ ในรายงาน ("หน้าใหม่ไม่มีใน feature map — ไม่ได้เดิน flow") อย่าข้ามเงียบ ๆ เพราะขั้น 6 เลือก flow จาก feature map เท่านั้น

เขียนรายการที่จะตรวจไว้ก่อน (3–10 ข้อ) จะได้รู้ว่าเมื่อไรเสร็จ

### 1. Quality gate (เร็ว ถูก ทำก่อน)

ถ้ายังไม่มี `prisma/test.db` หรือ diff แตะ `prisma/` ให้สร้าง test.db ใหม่ก่อน ไม่งั้นเทสต์จะรันกับ schema เก่า:

```bash
test -f prisma/test.db || npm run db:test:setup
```

```bash
npm run lint && npx next typegen && npx tsc --noEmit && npx vitest run
```

หรือใช้ subagent `quality-gate-runner` ก็ได้ ถ้าล้มให้แก้ก่อน ไม่ต้องไปขั้นถัดไป

ถ้า diff แตะ `src/app/`, `src/components/`, `next.config.ts` หรือ `prisma/` ให้ build ด้วย เหมือน job `build` ใน CI (`cacheComponents` ทำให้ error ตอน prerender บางอย่างเห็นเฉพาะตอน build ไม่เห็นใน dev):

```bash
npm run db:test:setup && DATABASE_URL="file:./prisma/test.db" npm run build
```

`next build` เขียนผลไว้แยกจาก `next dev` (`.next/dev`) จึงรันขณะที่ dev server เปิดอยู่ได้

### 2. Code review (หลัง gate ผ่าน ก่อนเปิดแอป)

รีวิวหลัง gate ผ่านเท่านั้น reviewer จะได้ไม่เสียรอบกับ error ที่ lint/tsc จับได้อยู่แล้ว และรีวิวก่อนเปิดแอป เพราะถ้าต้องแก้ตาม finding จะได้ไม่ต้องเดิน flow ในเบราว์เซอร์ซ้ำ

1. เก็บ diff: `git diff HEAD` บวกรายชื่อไฟล์ใหม่จาก `git status --short` (`??` ไม่อยู่ใน diff ให้ส่ง path ไปให้ reviewer อ่านเอง)
2. เรียก subagent `code-reviewer` โดยส่ง diff กับรายการไฟล์ที่เปลี่ยนไปใน prompt (agent นี้ไม่รัน git เอง) ถ้ามี `specs/<feature>.md` ของงานนี้ให้แนบ path ไปด้วย
3. ถ้า diff แตะ auth, `src/app/api/`, Server Action, ฟอร์ม, `next.config.ts` หรือ `.env.example` ให้เรียก `security-reviewer` คู่กันในข้อความเดียว (รันขนานกันได้) agent นี้ดู diff เองด้วย `git diff HEAD` ซึ่งไม่เห็นไฟล์ใหม่ที่ยังไม่ได้ `git add` จึงต้องส่งรายชื่อไฟล์ `??` ไปใน prompt ด้วย
4. จัดการผล:
   - **Critical/High** (ผล `CHANGES REQUIRED`): แก้ แล้วกลับไปรันขั้น 1 ใหม่ จากนั้นส่งเฉพาะ diff ที่เพิ่งแก้พร้อม finding รอบก่อนให้ reviewer ยืนยันว่าปิดแล้ว ไม่ต้องรีวิวใหม่ทั้งหมด นับเป็น 1 รอบของกติกา "แก้ได้ไม่เกิน 3 รอบ"
   - **Medium/Low**: ไม่ต้องแก้ในงานนี้ ใส่ในรายงานให้ผู้ใช้ตัดสินใจ จะได้ไม่ขยาย scope
   - ถ้าไม่เห็นด้วยกับ finding ห้ามข้ามเงียบ ๆ ให้เขียนเหตุผลไว้ในรายงาน
5. ถ้าขั้นหลังจากนี้ทำให้ต้องแก้โค้ดอีก ให้รันขั้น 1 และส่ง diff ส่วนที่แก้ให้ `code-reviewer` ดูอีกครั้งก่อนรายงาน งานที่แก้หลังรีวิวแล้วถือว่ายังไม่ได้รีวิว แล้ว **กลับไปรันขั้นที่ล้มซ้ำ** (smoke, flow ในเบราว์เซอร์ หรือกรณีที่ต้องล้ม) ห้ามรายงานว่าผ่านจากผลรอบก่อนแก้ นับเป็น 1 รอบของกติกา "แก้ได้ไม่เกิน 3 รอบ"

### 3. เตรียมฐานข้อมูล

```bash
test -f generated/prisma/client.ts || npx prisma generate
test -f prisma/dev.db || npx prisma db push
```

- ถ้า diff แตะ `prisma/schema.prisma` ให้รัน `npx prisma generate && npx prisma db push` เสมอ
- ถ้า flow ที่จะตรวจต้องใช้สถานะตั้งต้นที่แน่นอน (เช่น ขอคืนเงินของ `user@example.com`) หรือข้อมูลเพี้ยนจากการทดสอบรอบก่อน ให้รัน `npm run db:seed` (ลบเฉพาะคอร์ส/คำสั่งซื้อ/ผู้ใช้ `@example.com` แล้วใส่ใหม่) — **บอกผู้ใช้ก่อน** ถ้าเขามีข้อมูลที่สร้างเองใน dev.db
- ถ้าเจอ `Could not locate the bindings file` ให้ดู `npm install-scripts ls` แล้วถามผู้ใช้ (ห้าม approve เอง)

### 4. เปิดแอป

ตรวจก่อนว่ามี dev server รันอยู่แล้วไหม ถ้ามีให้ใช้ตัวเดิม อย่าเปิดซ้อน:

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 3 http://localhost:3000/ || echo down
```

ถ้ายังไม่รัน ให้รัน `npm run dev` ด้วย Bash แบบ `run_in_background: true` แล้วให้สคริปต์รอจนพร้อม (ขั้น 5 ใช้ `--wait`)
พอร์ตต้องเป็น 3000 เพราะ `BETTER_AUTH_URL` ใน `.env` ชี้ที่นั่น ถ้าพอร์ตไม่ตรง login จะได้ `Invalid origin`

### 5. Smoke test ระดับ HTTP

ตอนนี้ repo มีแค่หน้าแรก:

```bash
node .claude/skills/verify/scripts/smoke.mjs --wait 90 /
```

เมื่อสร้างหน้าและ auth แล้ว ให้เพิ่ม path ตามคอลัมน์ "smoke" ใน feature map เช่น

```bash
node .claude/skills/verify/scripts/smoke.mjs --wait 90 / /courses /courses/react-fundamentals
node .claude/skills/verify/scripts/smoke.mjs --login user@example.com:password123 /my-courses /orders
node .claude/skills/verify/scripts/smoke.mjs --login admin@example.com:password123 /admin
```

ใส่เฉพาะ path ของหน้าที่มีอยู่แล้ว และใช้ `--login` ได้ต่อเมื่อมี route `/api/auth/[...all]` ของ Better Auth แล้วเท่านั้น สคริปต์จะ:

- รอ server พร้อม (`--wait <วินาที>`)
- GET ทุก path แล้วตรวจ status, เวลา และหาร่องรอย error ของ Next.js ใน HTML (`Application error`, `Internal Server Error`, error overlay)
- `--login` จะ sign in ผ่าน Better Auth (`POST /api/auth/sign-in/email`) ตรวจ session cookie และ `GET /api/auth/get-session` แล้วยิง path ทั้งหมดด้วย cookie นั้น
- ระบุ status ที่คาดหวังได้ด้วย `path=code` เช่น `/admin=307` (ผู้ใช้ทั่วไปต้องโดน redirect)
- exit code ไม่ใช่ 0 = มีข้อที่ล้ม

ผ่านขั้นนี้แปลว่า "หน้าไม่พัง" เท่านั้น ยังไม่ได้แปลว่าฟีเจอร์ถูก

### 6. เดิน flow จริงในเบราว์เซอร์

ใช้ Claude in Chrome (โหลด skill `claude-in-chrome` ก่อน และเปิด **tab ใหม่** เสมอ) เดินตาม flow ของฟีเจอร์ที่เลือกในขั้น 0 ตาม [feature-map.md](feature-map.md):

1. ทำตาม "ขั้นตอน" ของฟีเจอร์นั้นแบบผู้ใช้จริง (คลิก กรอก ฟอร์ม) ไม่ใช่เปิด URL ตรงข้ามขั้น
2. เทียบผลกับคอลัมน์ "ผลที่ต้องเห็น" ทีละข้อ
3. อ่าน console ด้วย `read_console_messages` (pattern `error|warn|hydration`) ทุกหน้าที่ผ่าน
4. ถ้า flow ยาวหลายขั้น (checkout, refund) ให้อัด GIF ด้วย `gif_creator` ตั้งชื่อตาม flow เช่น `verify-checkout.gif`
5. ตรวจผลฝั่งข้อมูลด้วย ถ้า flow เขียน DB (เช่น สั่งซื้อแล้วต้องมี Enrollment) ให้ยืนยันจากหน้าที่แสดงผล เช่น `/my-courses` หรือ query อ่านอย่างเดียว:
   ```bash
   sqlite3 -readonly prisma/dev.db "select id, status, totalSatang from orders order by id desc limit 3;"
   ```
   (ชื่อตารางมาจาก `@@map` ใน `prisma/schema.prisma` เช่น `orders`, `order_items`, `enrollments` ให้เปิดดูก่อน query)

หลีกเลี่ยงปุ่มที่เปิด `confirm()`/`alert()` ของเบราว์เซอร์ (จะทำให้ extension ค้าง) ถ้าจำเป็นต้องกด ให้เตือนผู้ใช้ก่อน
ถ้า Chrome extension ไม่ตอบ 2–3 ครั้ง ให้หยุดถามผู้ใช้ อย่าวนลองต่อ

### 7. ตรวจกรณีผิดพลาดอย่างน้อย 1 ข้อ

ทุกฟีเจอร์ที่ตรวจ ให้ลองเส้นทางที่ควรล้มอย่างน้อย 1 กรณีจากคอลัมน์ "กรณีที่ต้องล้ม" (เช่น บัตร `4000000000000002`, คูปอง `OLDCODE`, ผู้ใช้ทั่วไปเปิด `/admin`) แล้วยืนยันว่าระบบปฏิเสธด้วยข้อความที่เข้าใจได้ และไม่มีข้อมูลผิดถูกบันทึก

### 8. รายงานผล

สรุปในรูปแบบนี้ (ภาษาไทย สั้น มีหลักฐาน):

```markdown
## ผล verify: ✅ ผ่าน | ❌ ไม่ผ่าน | ⚠️ ผ่านบางส่วน

**สิ่งที่เปลี่ยน:** <สรุป diff 1–2 บรรทัด>

| ขั้น | ผล | หลักฐาน |
|---|---|---|
| Quality gate | ✅ | lint 0 error, tsc ผ่าน, vitest 42/42 |
| Build | ✅ | `next build` ผ่านกับ test.db |
| Review | ✅ | code-reviewer APPROVED (แก้ High 1 ข้อแล้ว รัน gate ซ้ำผ่าน), Medium 1 ข้อรอผู้ใช้ตัดสิน |
| Smoke (anon) | ✅ | 3/3 path 200, เวลาสูงสุด 840ms |
| Smoke (user) | ✅ | session = user@example.com, /my-courses 200 |
| Flow: checkout + คูปอง WELCOME20 | ✅ | ยอด ฿1,032.00, Order PAID, เห็นคอร์สใน /my-courses, GIF verify-checkout.gif |
| กรณีล้ม: บัตรถูกปฏิเสธ | ✅ | ขึ้น "บัตรถูกปฏิเสธ" ไม่มี Order ใหม่ |
| Console | ⚠️ | hydration warning 1 รายการที่ /courses (มีอยู่ก่อนแล้ว) |

**ที่ไม่ได้ตรวจ และเหตุผล:** <เช่น /admin ยังไม่มีหน้า>
**ปัญหาที่พบ:** <step ที่ล้ม + ข้อความ error จริง + screenshot/GIF>

Verified: lint, tsc, vitest, build, review(code), smoke(anon,user), browser(checkout)
```

- แยกให้ชัดว่าอะไร **ตรวจแล้วเห็นกับตา** อะไร **ไม่ได้ตรวจ** ห้ามเขียนว่าผ่านถ้าไม่ได้รันจริง
- ปัญหาที่มีอยู่ก่อน diff นี้ให้ติดป้าย "(มีอยู่ก่อนแล้ว)" ไม่นับเป็นความผิดของงานนี้
- บรรทัด `Verified:` ให้ผู้ใช้ใส่เป็น trailer ใน commit message ได้ ถ้าไม่ได้ verify ให้เขียน `Verified: none (<เหตุผล>)` เพื่อให้ค้นย้อนหลังได้ว่า commit ไหนยังไม่ผ่านการตรวจ

### 9. เก็บกวาด

- ปิด tab ที่เปิดเอง
- ถ้าเปิด dev server เองในขั้น 4 ให้ถามผู้ใช้ว่าจะปล่อยรันไว้หรือหยุด
- ถ้าทดสอบแล้วข้อมูลใน dev.db เปลี่ยน (สั่งซื้อ, ขอคืนเงิน) ให้บอกผู้ใช้ว่าจะ `npm run db:seed` คืนสถานะเมื่อไรก็ได้

## ดูแล skill นี้

skill นี้คือ smoke test harness ของทีม ต้อง **เร็วและเชื่อถือได้**:

- ทุกครั้งที่สร้างหน้า/ฟีเจอร์ใหม่ ให้เพิ่มแถวใน `feature-map.md` ใน PR เดียวกับฟีเจอร์ (แต่ห้ามแก้แถวของฟีเจอร์ที่ PR นั้นกำลังถูกตรวจเพื่อให้ผ่าน)
- ถ้าพบบั๊กที่ verify ควรจับได้แต่หลุดไป ให้เพิ่มขั้นตอนหรือ "กรณีที่ต้องล้ม" ที่จับบั๊กนั้นได้
- ตัดขั้นตอนที่ไม่เคยจับอะไรได้และทำให้ช้าออกเป็นระยะ อย่าปล่อยให้โตไม่หยุด
