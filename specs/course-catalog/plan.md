# Implementation Plan: ค้นหาและกรองคอร์ส (Course Catalog)

- **Spec:** [spec.md](spec.md) (FR-01–FR-07, AC1–AC21)
- **Tasks:** [tasks.md](tasks.md)
- **Status:** Approved (2026-11-28)
- **ADR:** [0001 Repository pattern + composition root](../../docs/adr/0001-repository-pattern-and-composition-root.md) (Accepted)

เอกสารนี้บอกว่า **จะสร้างอย่างไร** ถ้า plan ขัดกับ spec ให้ถือ spec เป็นหลัก แล้วแก้ plan
plan นี้ไม่เพิ่ม requirement ใหม่ ทุกหัวข้ออ้างกลับไปที่ FR/AC ของ spec

## 1. ภาพรวม

```
/courses?q=…&category=…&level=…&sort=…
   │
   ▼
src/app/(front)/courses/page.tsx        อ่าน searchParams ภายใน <Suspense>
   │  parseCatalogParams(searchParams)   → CatalogParams (ค่าผิดรูปแบบถูกปรับที่นี่)
   ▼
container.repos.courses                  composition root (ADR 0001)
   │  getCourseList(params)              กรองใน DB → toCourseSummary → sortCourses
   │  listCategories()
   ▼
CatalogFilters + CourseGrid → CourseCard  Server Component ไม่ async
```

- อ่านข้อมูลอย่างเดียว ไม่มี Server Action, Route Handler หรือการแก้ schema
- กติกาทั้งหมดเป็น pure function ใน `src/lib/` ส่วน DB เข้าถึงผ่าน repository ที่รับ `PrismaClient`
- ฟอร์มกรองเป็น `<form method="get">` ที่ submit กลับมาที่ `/courses` จึงไม่ต้องมี client component (ข้อสรุป Q7 ใน spec)

## 2. Contract กลาง (ส่งมอบใน T1)
task ที่ทำขนานกันทุกตัวพึ่ง type ชุดนี้ จึงต้อง merge ก่อนแยกงาน หลัง T1 merge แล้ว การแก้ type เหล่านี้ต้องตกลงกันทั้งทีมก่อน

```ts
// src/lib/course/catalog-params.ts
export const CATALOG_SORTS = ["newest", "price-asc", "price-desc", "rating"] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]
export const MAX_QUERY_LENGTH = 100
export type CatalogParams = {
  q: string
  category?: string        // slug ของหมวด
  level?: CourseLevel      // จาก @/lib/shared/status
  sort: CatalogSort
}

// src/lib/course/course-types.ts
export type CourseSummary = {
  id: number
  slug: string
  title: string
  summary: string
  priceSatang: number
  level: CourseLevel
  imageName: string
  categoryName: string
  categorySlug: string
  lessonCount: number
  totalMinutes: number
  averageRating: number | null
  reviewCount: number
  createdAt: Date
}
export type CategoryOption = { name: string; slug: string }
export type CourseRepository = {
  getCourseList(params: CatalogParams): Promise<CourseSummary[]>
  listCategories(): Promise<CategoryOption[]>
}
```

Props ของ component: `CourseCard({ course: CourseSummary })`, `CourseGrid({ courses: CourseSummary[] })`, `CatalogFilters({ params: CatalogParams; categories: CategoryOption[] })`

## 3. ไฟล์ที่เพิ่มหรือแก้
ไม่มีไฟล์เดิมถูกแก้ ยกเว้น `feature-map.md` ใน T7

| ไฟล์ | export | รายละเอียด | Task |
|---|---|---|---|
| `src/lib/course/course-types.ts` | ตามข้อ 2 | type อย่างเดียว | T1 |
| `src/lib/course/catalog-params.ts` | const/type ตามข้อ 2 | | T1 |
| | `parseCatalogParams(searchParams: Record<string, string \| string[] \| undefined>): CatalogParams` | pure: ค่า array ใช้ตัวแรก, trim แล้วตัดเหลือ 100 ตัว (`slice` นับเป็น UTF-16 code unit), `level` ตรวจด้วย `isOneOf(COURSE_LEVELS, …)`, `sort` ที่ไม่รู้จักเป็น `"newest"`, `category` trim และค่าว่างเป็น `undefined` ไม่คืน `Result` เพราะไม่มีกรณี error | T2 |
| | `toCatalogQueryString(params: Partial<CatalogParams>): string` | pure: ตัดค่า default (`q: ""`, `sort: "newest"`, `undefined`) คืน `""` ถ้าไม่เหลืออะไร ไม่งั้นคืน `"?…"` | T2 |
| `src/lib/review/review-rules.ts` | `averageRating(ratings: readonly number[]): number \| null` | pure: ปัดทศนิยม 1 ตำแหน่งจากผลรวมจำนวนเต็ม (`Math.round((sum * 10) / n) / 10`) เพื่อเลี่ยงค่าคลาดของทศนิยม วางไว้ที่ review ให้ US-10 ใช้ตัวเดียวกัน (Q4) | T3 |
| `src/lib/course/course-mapper.ts` | `type CourseRow`, `toCourseSummary(row: CourseRow): CourseSummary` | pure: `CourseRow` คือผลของ Prisma query ที่ include `category`, `lessons.durationMinutes`, `reviews.rating`; `level` ผิดค่าเป็น `"BEGINNER"` ไม่ throw | T3 |
| `src/lib/course/course-sort.ts` | `sortCourses(courses: readonly CourseSummary[], sort: CatalogSort): CourseSummary[]` | pure: คืน array ใหม่; `rating`: เฉลี่ยมากไปน้อย, เท่ากันดู `reviewCount` มากไปน้อย, `null` ท้ายสุด; ค่าเสมอกันทุกแบบใช้ `createdAt` ใหม่ไปเก่า แล้ว `id` มากไปน้อยเพื่อให้ลำดับคงที่ (Q3) | T4 |
| `src/lib/course/course-repository.ts` | `createPrismaCourseRepository(db: PrismaClient): CourseRepository` | ดูข้อ 4 | T5 |
| `src/lib/repositories.ts` | `type Repositories = { courses: CourseRepository }`, `createPrismaRepositories(db: PrismaClient): Repositories` | feature ถัดไปเพิ่ม key ของตัวเอง | T5 |
| `src/lib/prisma.ts` | `prisma` | `PrismaClient` ของแอป (adapter better-sqlite3 อ่าน `process.env.DATABASE_URL`) เก็บใน `globalThis` กันสร้างซ้ำตอน dev reload import ได้เฉพาะจาก `container.ts` | T5 |
| `src/lib/container.ts` | `container = { repos: createPrismaRepositories(prisma) }` | composition root เทสต์ห้าม import | T5 |
| `__tests__/helpers/test-prisma.ts` | `createTestPrisma()` | `PrismaClient` ที่ชี้ `file:./prisma/test.db` แบบค่าคงที่ ไม่อ่าน `DATABASE_URL` เพื่อไม่ให้ชี้ `dev.db` ได้ | T5 |
| `src/components/course/course-card.tsx` | `CourseCard` | AC17–AC19: ราคาใช้ `formatTHB`, ระดับใช้ `COURSE_LEVEL_LABELS`, รูปจาก `/course-image/<imageName>` ด้วย `next/image`, ลิงก์ไป `/courses/<slug>` | T6 |
| `src/components/course/course-grid.tsx` | `CourseGrid` | แสดงการ์ด หรือ empty state พร้อมลิงก์ล้างเงื่อนไขไป `/courses` (AC20) แยกออกมาเพื่อให้เทสต์ empty state ได้ เพราะ Vitest render page ที่เป็น async ไม่ได้ | T6 |
| `src/components/course/catalog-filters.tsx` | `CatalogFilters` | ฟอร์ม GET: ช่องค้นหา (`maxLength` 100), select หมวด, select ระดับ, select การเรียง, ปุ่มค้นหา, ลิงก์ล้างเงื่อนไข ค่าเริ่มต้นของแต่ละช่องมาจาก `params` (AC21) | T6 |
| `src/app/(front)/courses/page.tsx` | default export | ดูข้อ 5 | T7 |
| `.claude/skills/verify/feature-map.md` | – | ปรับแถว F3 ให้ตรงกับ UI จริง (ข้อความปุ่ม, path) | T7 |

สไตล์โค้ดตาม `code-style.md`: `src/lib/` ไม่มี semicolon, `src/app/` มี semicolon, `__tests__/` ใช้ single quote ไม่มี semicolon

## 4. Data access
- `getCourseList(params)` กรองใน DB ด้วย `where: { isPublished: true, title: { contains: q }, category: { slug }, level }` โดยใส่แต่ละเงื่อนไขเมื่อมีค่าเท่านั้น include `category`, `lessons { durationMinutes }`, `reviews { rating }` แล้ว `toCourseSummary` และ `sortCourses` ในหน่วยความจำ (การเรียงตามคะแนนต้องใช้ค่าเฉลี่ยที่คำนวณแล้ว ตาม ADR 0001)
- `contains` บน SQLite แปลงเป็น `LIKE` ซึ่งไม่สนตัวพิมพ์เฉพาะ ASCII ตรงกับข้อสรุป Q5 และ Prisma ไม่รองรับ `mode: "insensitive"` บน SQLite
- หมวดที่ไม่มีอยู่จริงให้ผลว่างเองจากเงื่อนไข `category.slug` (ข้อสรุป Q1) ไม่ต้อง query ตรวจแยก
- `listCategories()` คืนทุกหมวดเรียงตามชื่อ (ข้อสรุป Q10)
- Prisma Client import จาก `generated/prisma/client` และ query ทั้งหมดเป็น parameterized จึงไม่มีการต่อ string จากคำค้น

## 5. Rendering และ caching
`next.config.ts` เปิด `cacheComponents: true` การอ่าน `searchParams` และ DB จึงต้องอยู่ใน `<Suspense>` (อ้างอิง `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` หัวข้อ "Working with runtime APIs" และตัวอย่าง search page ในหัวข้อ Prefetching)

```tsx
// src/app/(front)/courses/page.tsx
export default function CoursesPage(props: PageProps<"/courses">) {
  return (
    <main>
      <h1>คอร์สทั้งหมด</h1>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function CatalogContent({ searchParams }: Pick<PageProps<"/courses">, "searchParams">) {
  const params = parseCatalogParams(await searchParams);
  const [courses, categories] = await Promise.all([
    container.repos.courses.getCourseList(params),
    container.repos.courses.listCategories(),
  ]);
  return (
    <>
      <CatalogFilters params={params} categories={categories} />
      <CourseGrid courses={courses} />
    </>
  );
}
```

- หัวข้อของหน้าอยู่ใน static shell ส่วนฟอร์มและผลลัพธ์ stream ตามมา
- รอบนี้ **ไม่ใช้ `"use cache"`** (ดู D1 ในข้อ 8)
- โครงนี้มาจากเอกสาร ยังไม่ได้ build จริง T7 ต้องรัน `next build` ยืนยันว่าไม่มี blocking-route error

## 6. Testing strategy
เลข TC ตาม `docs/requirements/user-stories-and-test-cases.md` ส่วน TC-02-19 ขึ้นไปเพิ่มโดย plan นี้

**Unit (Vitest)** เรียกฟังก์ชันตรง ไม่มี mock เงินใน fixture เป็นสตางค์

| TC | สิ่งที่ทดสอบ | Task | AC |
|---|---|---|---|
| TC-02-01 | `parseCatalogParams({})` คืน `{ q: "", category: undefined, level: undefined, sort: "newest" }` | T2 | AC1, AC5 |
| TC-02-02 | `q: "  react  "` เป็น `"react"` และ `q: "   "` เป็น `""` | T2 | AC4, AC5 |
| TC-02-03 | `q` ยาว 100 ผ่าน / 101 ถูกตัดเหลือ 100 (BVA) | T2 | AC6 |
| TC-02-04 | `level: "BEGINNER"` คงค่า | T2 | AC8 |
| TC-02-05 | `level: "EXPERT"` เป็น `undefined` | T2 | AC9 |
| TC-02-06 | `sort` 4 ค่าที่รู้จักคืนค่าเดิม (`test.each`) | T2 | AC11, AC12 |
| TC-02-07 | `sort: "cheap"` เป็น `"newest"` | T2 | AC14 |
| TC-02-08 | `q: ["a","b"]` เป็น `"a"` | T2 | AC15 |
| TC-02-16 | `toCatalogQueryString({ q: "react", sort: "newest" })` เป็น `"?q=react"` และ `toCatalogQueryString({})` เป็น `""` | T2 | AC16 |
| TC-02-12 | `price-asc` ราคา `[299000, 99000, 189000]` สตางค์ เป็น `[99000, 189000, 299000]` และ `price-desc` กลับกัน | T4 | AC11 |
| TC-02-13 | `rating` มีคอร์ส `averageRating: null` อยู่ท้ายสุด | T4 | AC12 |
| TC-02-14 | `rating` เท่ากัน 4.5 รีวิว 2 กับ 10: 10 ขึ้นก่อน | T4 | AC13 |
| TC-02-15 | `sortCourses(list, …)` แล้ว `list` เดิมไม่เปลี่ยน | T4 | invariant |
| TC-02-21 | `newest` เรียงตาม `createdAt` ใหม่ไปเก่า และราคาเท่ากันให้คอร์สใหม่กว่าขึ้นก่อน | T4 | AC1, AC11 |
| TC-02-17 | row บทเรียน 10+15 นาที รีวิว `[5,4,4]` ได้ `lessonCount: 2, totalMinutes: 25, averageRating: 4.3, reviewCount: 3` | T3 | AC17 |
| TC-02-18 | row `level: "EXPERT"` ได้ `level: "BEGINNER"` ไม่ throw | T3 | AC19 |
| TC-10-05–07 | `averageRating([])` เป็น `null`, `[5,4,4]` เป็น `4.3`, `[5,4]` เป็น `4.5` | T3 | AC17, AC18 |

**Integration (Vitest + `prisma/test.db`)** เรียก `createPrismaRepositories(createTestPrisma()).courses` ห้าม mock Prisma และห้าม import `container.ts`
- เตรียม DB ด้วย `npm run db:test:setup` (มีข้อมูล seed)
- ไฟล์เทสต์ต้องขึ้นต้นด้วย `// @vitest-environment node` เพราะ config ของทีมตั้ง `jsdom` เป็นค่าเริ่มต้น และ `vitest.config.mts` เป็นไฟล์ harness ที่ห้ามแก้
- เทสต์ที่เพิ่มข้อมูลต้องลบทิ้งใน teardown เพราะ `test.db` ใช้ร่วมกันทุกไฟล์เทสต์

| TC | สิ่งที่ทดสอบ | Task | AC |
|---|---|---|---|
| TC-02-09 | ค้น `"test"` ได้เฉพาะคอร์สที่ชื่อมี "test" (ไม่สนตัวพิมพ์) และ published โดยสร้างคอร์ส unpublished ที่ชื่อมี "Test" ใน setup แล้วลบใน teardown (seed ไม่มีกรณีนี้) | T5 | AC2, AC3 |
| TC-02-10 | `sort: "price-asc"` แล้ว `priceSatang` ไม่ลดลงตลอดรายการ | T5 | AC11 |
| TC-02-11 | คอร์ส unpublished ใน seed (`kubernetes-advanced`) ไม่อยู่ในผลลัพธ์แม้ไม่ใส่เงื่อนไข | T5 | AC2 |
| TC-02-19 | กรอง `category` / `level` / ผสมกับ `q` แล้วทุกแถวตรงเงื่อนไข | T5 | AC7, AC8, AC10 |
| TC-02-20 | `category: "xyz"` ได้ `[]` ไม่ throw | T5 | AC7, AC20 |
| TC-02-22 | `listCategories()` คืน 5 หมวดของ seed เรียงตามชื่อ | T5 | AC7 |

**Component (Vitest + RTL)** render ด้วย props ปลอม (T6)
- `CourseCard`: ชื่อ, หมวด, ระดับภาษาไทย, ราคาจาก `formatTHB`, "2 บท", "25 นาที", "4.3", "3 รีวิว", ลิงก์ `/courses/<slug>` (`getByRole("link")`); `averageRating: null` แสดงข้อความยังไม่มีรีวิว (AC17, AC18)
- `CourseGrid`: รายการว่างแสดงข้อความไม่พบคอร์สและลิงก์ล้างเงื่อนไขไป `/courses`; มีรายการแสดงการ์ดครบจำนวน (AC20)
- `CatalogFilters`: ช่องค้นหาและ select ทั้งสามแสดงค่าจาก `params`, ช่องค้นหามี `maxLength` 100, มีลิงก์ล้างเงื่อนไข (AC21)

**Manual** (T7) `npm run dev` แล้วไล่ AC1–AC21 ที่ `/courses` ด้วยข้อมูล seed รวมถึงลิงก์ผิดรูปแบบ `?level=EXPERT&sort=cheap&q=a&q=b` และ `?category=xyz`

**E2E** ไม่มี (อยู่นอก scope ของ spec)

## 7. Verification
ทุก PR ที่แตะ `src/` ต้องผ่านตามลำดับ
1. Quality gate: `npm run lint && npx next typegen && npx tsc --noEmit && npx vitest run`
2. `code-reviewer` โดยส่ง diff และ path ของ `specs/course-catalog/spec.md` (T5 และ T7 เพิ่ม `security-reviewer` เพราะแตะ config ของ DB และ input จาก URL)
3. skill `verify` ก่อน commit สำหรับ T7 ต้องรวม `next build` กับ `test.db`, smoke `/courses` และ `/courses?q=react`, และ flow F3 ในเบราว์เซอร์
4. CI (`quality-gate` และ `build`) เมื่อ repo มี remote

## 8. Technical decisions และความเสี่ยง
ทุกข้อได้ข้อสรุปใน Plan Review เมื่อ 2026-11-28 แล้ว

| # | เรื่อง | ข้อสรุป | เหตุผล | กระทบ |
|---|---|---|---|---|
| D1 | Cache Components: cache รายการคอร์สด้วย `"use cache"` + `cacheTag("courses")` หรือ query ทุก request | query ทุก request ภายใน `<Suspense>` ยังไม่ cache | AC2 ต้องการให้คอร์สที่ปิดการเผยแพร่หายทันที แต่ตัวที่จะ invalidate (US-15 แก้คอร์ส, US-10 รีวิวใหม่) ยังไม่มี และคำค้นอิสระทำให้ cache key มีได้ไม่จำกัด ให้ทบทวนเมื่อทำ US-15 | T7 |
| D2 | การสร้าง `PrismaClient` ไม่ให้ซ้ำตอน dev reload | เก็บ instance ใน `globalThis` เมื่อไม่ใช่ production | เป็นรูปแบบมาตรฐานของ Prisma กับ Next.js | T5 |
| D3 | shadcn/ui ยังไม่ถูก init (ไม่มี `components.json`) | T6 ใช้ element HTML กับ Tailwind token ไปก่อน | การ init เพิ่ม dependency และไฟล์ config ซึ่งผู้ใช้ต้องเป็นคนตัดสินใจ และฟีเจอร์นี้ใช้แค่ input, select, ปุ่ม | T6 |
| D4 | การตรวจ input ไม่ใช้ zod | เขียน `parseCatalogParams` เอง | `review.md` แนะนำ zod สำหรับ input ภายนอก แต่ zod ยังไม่ได้ติดตั้ง และ catalog ไม่มีกรณี error ให้รายงาน ทุกค่าถูกปรับเป็นค่าที่ใช้ได้ | T2 |

ความเสี่ยงที่ตรวจแล้ว
- รูปปกเป็น `.svg`: `next/image` ส่งไฟล์ `.svg` ตามเดิมโดยไม่ optimize เมื่อใช้ loader เริ่มต้น (`node_modules/next/dist/shared/lib/get-img-props.js:245`) จึงไม่ต้องตั้ง `dangerouslyAllowSVG`
- ADR 0001 เป็น Accepted แล้ว (2026-11-28) T5 สร้างโครงตาม ADR นี้ ซึ่ง feature อื่นจะใช้ต่อ
- การเรียงในหน่วยความจำพอสำหรับข้อมูลขนาด seed (ADR 0001 ระบุให้ทบทวนเมื่อคอร์สถึงหลักพัน) และ spec ตัด pagination ออกจาก scope
