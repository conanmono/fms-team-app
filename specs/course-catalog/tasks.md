# Tasks: ค้นหาและกรองคอร์ส (Course Catalog)

- **Spec:** [spec.md](spec.md)
- **Plan:** [plan.md](plan.md)
- **Status:** Approved (2026-11-28) ยังไม่เริ่มพัฒนา

1 task = 1 branch = 1 PR ทุก task ทำตาม spec และ plan ฉบับที่อนุมัติแล้วเท่านั้น
ถ้าพบว่า spec กำกวมหรือขัดกับโค้ดจริง ให้หยุดแล้วแจ้งทีม ห้ามแก้ AC หรือ contract เองเพื่อให้งานผ่าน

## 1. Task board

| ID | Task | Owner | Status | Depends on | FR / AC | Decision ที่ใช้ |
|---|---|---|---|---|---|---|
| T1 | Contract กลาง: type และ const | Akenarin Komkoon | Ready | – | ทุก FR | – |
| T2 | แปลงเงื่อนไขจากลิงก์ | Akenarin Komkoon | Blocked | T1 | FR-02–FR-05 / AC4, AC5, AC6, AC9, AC14, AC15, AC16 | – |
| T3 | คะแนนเฉลี่ยและ mapper | Akenarin Komkoon | Blocked | T1 | FR-06 / AC17, AC18, AC19 | – |
| T4 | เรียงลำดับคอร์ส | Akenarin Komkoon | Blocked | T1 | FR-01, FR-04 / AC1, AC11, AC12, AC13 | – |
| T5 | Data layer และ integration test | Akenarin Komkoon | Blocked | T3, T4 | FR-01–FR-04 / AC1, AC2, AC3, AC7, AC8, AC10, AC11 | D2 |
| T6 | Component: การ์ด, รายการ, ฟอร์มกรอง | Akenarin Komkoon | Blocked | T1 | FR-05–FR-07 / AC17, AC18, AC20, AC21 | D3 |
| T7 | หน้า `/courses` และการตรวจทั้ง flow | Akenarin Komkoon | Blocked | T2, T5, T6 | ทุก FR / AC1–AC21 | D1 |

D คือ technical decisions ใน plan.md ข้อ 8 ซึ่งได้ข้อสรุปครบแล้ว เช่นเดียวกับคำถามของ spec (Q1–Q10) ใน spec.md ข้อ 6

## 2. ลำดับและงานที่ทำขนานได้

```
รอบ 0   T1
         │
รอบ 1   T2      T3      T4      T6        ทำขนานกันได้ 4 คน
         │       └──┬───┘       │
รอบ 2   │          T5          │
         └──────────┼───────────┘
รอบ 3              T7
```

- รอบ 1 ไม่มีไฟล์ที่ซ้อนกัน จึงแยก branch หรือ worktree ทำพร้อมกันได้
- T5 เริ่มได้เมื่อ T3 และ T4 merge แล้ว ระหว่างนั้น T2 และ T6 ทำต่อได้
- T7 เป็นงานรวม ต้องรอ T2, T5 และ T6 merge ครบ

## 3. ไฟล์ที่ใช้ร่วมกัน

| ไฟล์ | เจ้าของ | กติกา |
|---|---|---|
| `src/lib/course/course-types.ts` | T1 | หลัง T1 merge ห้ามแก้ ถ้าจำเป็นต้องตกลงกันทั้งทีมแล้วแก้เป็น PR แยก |
| `src/lib/course/catalog-params.ts` | T1 แล้วส่งต่อให้ T2 | T1 ใส่เฉพาะ type และ const, T2 เพิ่มฟังก์ชันโดยไม่แก้ type |
| `src/lib/repositories.ts`, `src/lib/container.ts`, `src/lib/prisma.ts` | T5 | task อื่นห้ามแตะ |
| `.claude/skills/verify/feature-map.md` | T7 | แก้เฉพาะแถว F3 |
| `specs/course-catalog/` | เจ้าของ spec | แก้ผ่าน PR แยก ไม่รวมใน PR ของ task |

## 4. รายละเอียด task

### T1: Contract กลาง
- **Objective:** สร้าง type และ const ตาม plan.md ข้อ 2 ให้ task อื่นใช้ร่วมกัน ไม่มี logic
- **Allowed changes:** `src/lib/course/course-types.ts`, `src/lib/course/catalog-params.ts` (เฉพาะ `CATALOG_SORTS`, `CatalogSort`, `CatalogParams`, `MAX_QUERY_LENGTH`)
- **Deliverables:** PR ที่ type-check ผ่าน ชื่อและ field ตรงกับ plan.md ข้อ 2 ทุกตัว
- **Done when:** quality gate ผ่าน และทีมที่จะทำ T2–T6 อ่าน contract แล้วไม่มีข้อคัดค้าน

### T2: แปลงเงื่อนไขจากลิงก์
- **Objective:** เขียน `parseCatalogParams` และ `toCatalogQueryString` พร้อม unit test
- **Allowed changes:** `src/lib/course/catalog-params.ts` (เพิ่มฟังก์ชัน), `__tests__/lib/course/catalog-params.test.ts`
- **Tests:** TC-02-01–08, TC-02-16
- **Done when:** AC4, AC5, AC6, AC9, AC14, AC15, AC16 มีเทสต์ที่ผ่าน รวมค่าขอบ 100/101 ตัวอักษร

### T3: คะแนนเฉลี่ยและ mapper
- **Objective:** เขียน `averageRating` และ `toCourseSummary` พร้อม unit test
- **Allowed changes:** `src/lib/review/review-rules.ts`, `src/lib/course/course-mapper.ts`, `__tests__/lib/review/review-rules.test.ts`, `__tests__/lib/course/course-mapper.test.ts`
- **Tests:** TC-02-17, TC-02-18, TC-10-05–07
- **Done when:** AC17 (ส่วนตัวเลข), AC18, AC19 มีเทสต์ที่ผ่าน และ `CourseRow` export ให้ T5 ใช้ได้

### T4: เรียงลำดับคอร์ส
- **Objective:** เขียน `sortCourses` ครบ 4 แบบ พร้อม unit test
- **Allowed changes:** `src/lib/course/course-sort.ts`, `__tests__/lib/course/course-sort.test.ts`
- **Tests:** TC-02-12–15, TC-02-21
- **Done when:** AC1 (ลำดับ), AC11, AC12, AC13 มีเทสต์ที่ผ่าน และ array ต้นทางไม่ถูกแก้

### T5: Data layer และ integration test
- **Objective:** สร้าง Prisma client ของแอป, course repository, `createPrismaRepositories` และ `container.ts` ตาม ADR 0001 พร้อม integration test บน `prisma/test.db`
- **Allowed changes:** `src/lib/prisma.ts`, `src/lib/course/course-repository.ts`, `src/lib/repositories.ts`, `src/lib/container.ts`, `__tests__/helpers/test-prisma.ts`, `__tests__/lib/course/course-repository.test.ts`
- **ห้ามแตะ:** `prisma/schema.prisma`, `prisma/seed.ts`, `generated/`, `prisma/*.db`
- **Tests:** TC-02-09–11, TC-02-19, TC-02-20, TC-02-22
- **Done when:** AC2, AC3, AC7, AC8, AC10 มี integration test ที่ผ่าน, เทสต์ไม่ชี้ `dev.db` และไม่ import `container.ts`, ข้อมูลที่เทสต์สร้างถูกลบใน teardown, ผ่าน `security-reviewer`

### T6: Component
- **Objective:** สร้าง `CourseCard`, `CourseGrid`, `CatalogFilters` เป็น Server Component ที่ไม่ async พร้อม component test ด้วย props ปลอม
- **Allowed changes:** `src/components/course/course-card.tsx`, `src/components/course/course-grid.tsx`, `src/components/course/catalog-filters.tsx`, `__tests__/components/course/` (ไฟล์เทสต์ของทั้งสาม)
- **ห้ามแตะ:** `src/lib/` (ใช้ type จาก T1 เท่านั้น ไม่เรียก repository), `src/app/globals.css`
- **Tests:** component test ตาม plan.md ข้อ 6
- **Done when:** AC17, AC18, AC20, AC21 มีเทสต์ที่ผ่าน

### T7: หน้า `/courses` และการตรวจทั้ง flow
- **Objective:** ประกอบหน้า `/courses` ตามโครงใน plan.md ข้อ 5 แล้วตรวจ AC1–AC21 ในแอปจริง
- **Allowed changes:** `src/app/(front)/courses/page.tsx`, `.claude/skills/verify/feature-map.md` (แถว F3)
- **ห้ามแตะ:** `src/app/layout.tsx`, `src/app/page.tsx`, `next.config.ts` (navbar และหน้าแรกอยู่นอก scope)
- **Tests:** manual ตาม plan.md ข้อ 6 และ skill `verify` (`next build`, smoke `/courses` และ `/courses?q=react`, flow F3)
- **Done when:** AC1–AC21 ตรวจแล้วมีหลักฐานในรายงาน verify, `next build` ผ่านโดยไม่มี blocking-route error, ตาราง Traceability ใน spec.md ครบทุกแถว

## 5. Definition of Done (ทุก task)
- แก้เฉพาะไฟล์ใน Allowed changes
- Quality gate ผ่าน: lint, typegen + tsc, `vitest run`
- `code-reviewer` ให้ผล `APPROVED` โดยอ้าง `specs/course-catalog/spec.md` และ task ที่ทำ
- task ที่แตะ `src/` รัน skill `verify` ก่อน commit และใส่บรรทัด `Verified:` ใน commit message
- PR ระบุ task ID, FR และ AC ที่ครอบคลุม, TC ที่เพิ่ม, และส่วนที่ต่างจาก spec (ถ้ามี ต้องได้รับอนุมัติก่อน)
- ปรับ Status ของ task ในตารางข้อ 1 ใน PR เดียวกัน

## 6. Prompt สำหรับเริ่ม task
ทุกคนใช้ prompt เดียวกัน เปลี่ยนเฉพาะ task ID

```
อ่านไฟล์ต่อไปนี้ก่อน:
- specs/course-catalog/spec.md
- specs/course-catalog/plan.md
- specs/course-catalog/tasks.md
- docs/adr/0001-repository-pattern-and-composition-root.md

ทำ task T2 เท่านั้น

กติกา:
- ทำตาม spec และ contract ใน plan.md ข้อ 2 ห้ามแก้ type กลาง
- แก้เฉพาะไฟล์ใน Allowed changes ของ task
- ห้ามแก้ acceptance criteria หรือค่าที่คาดหวังในเทสต์เพื่อให้ผ่าน
- ถ้า spec กำกวมหรือขัดกับโค้ดจริง ให้หยุดแล้วรายงาน

ก่อนจบงาน:
1. รัน quality gate
2. ส่ง diff ให้ code-reviewer พร้อม path ของ spec
3. แก้ finding ระดับ Critical/High แล้วรัน gate ซ้ำ
4. รัน skill verify แล้วสรุปผลพร้อมบรรทัด Verified:
```
