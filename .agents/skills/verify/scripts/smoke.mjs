#!/usr/bin/env node
/**
 * Smoke test ระดับ HTTP สำหรับ skill `/verify`
 *
 * ทำไมมีสคริปต์นี้: ก่อนเปิดเบราว์เซอร์ (ช้า) ให้เช็กแบบถูก ๆ ก่อนว่าหน้าไม่ 500
 * ไม่มี error overlay และ login ผ่าน Better Auth ได้จริง ถ้าขั้นนี้ล้มก็ไม่ต้องเสียเวลาเดิน flow
 *
 *   node .claude/skills/verify/scripts/smoke.mjs [ตัวเลือก] <path[=status]> ...
 *
 *   --base <url>               ค่าเริ่มต้น VERIFY_BASE_URL หรือ http://localhost:3000
 *   --wait <วินาที>            รอ server พร้อมก่อนเริ่ม (ค่าเริ่มต้น 0 = ไม่รอ)
 *   --login <email:password>   sign in ก่อน แล้วยิงทุก path ด้วย session cookie
 *   --timeout <ms>             timeout ต่อ request (ค่าเริ่มต้น 30000 เพราะ dev compile ครั้งแรกช้า)
 *
 * ตัวอย่าง:
 *   smoke.mjs --wait 90 / /courses /courses/kubernetes-advanced=404
 *   smoke.mjs --login user@example.com:password123 /my-courses /admin=307
 *
 * status ที่คาดหวัง: ถ้าไม่ระบุ = 2xx; ระบุได้หลายค่าคั่นด้วย comma เช่น `/admin=302,307`
 * exit 0 = ผ่านทุกข้อ, 1 = มีข้อที่ล้ม, 2 = ใช้งานผิด / server ไม่ขึ้น
 */

const ERROR_MARKERS = [
  "Application error: a server-side exception has occurred",
  "Application error: a client-side exception has occurred",
  "Internal Server Error",
  "Unhandled Runtime Error",
  "nextjs__container_errors",
  "Build Error",
]

const args = parseArgs(process.argv.slice(2))
if (!args) process.exit(2)

const base = args.base.replace(/\/$/, "")
const results = []

if (args.wait > 0) {
  const ready = await waitForServer(base, args.wait)
  if (!ready) {
    console.error(`❌ server ที่ ${base} ไม่ตอบภายใน ${args.wait} วินาที (รัน npm run dev แล้วหรือยัง)`)
    process.exit(2)
  }
}

let cookie = ""
if (args.login) {
  cookie = await signIn(base, args.login)
}

for (const spec of args.routes) {
  results.push(await checkRoute(base, spec, cookie))
}

printReport(results)
process.exit(results.every((r) => r.ok) ? 0 : 1)

/** แยก argv เป็นตัวเลือก + รายการ path คืน null ถ้าใช้งานผิด */
function parseArgs(argv) {
  const out = {
    base: process.env.VERIFY_BASE_URL ?? "http://localhost:3000",
    wait: 0,
    login: null,
    timeout: 30000,
    routes: [],
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--base") out.base = argv[++i]
    else if (a === "--wait") out.wait = Number(argv[++i])
    else if (a === "--timeout") out.timeout = Number(argv[++i])
    else if (a === "--login") {
      const value = argv[++i] ?? ""
      const sep = value.indexOf(":")
      if (sep < 1) {
        console.error("--login ต้องเป็นรูปแบบ email:password")
        return null
      }
      out.login = { email: value.slice(0, sep), password: value.slice(sep + 1) }
    } else if (a.startsWith("/")) out.routes.push(parseRouteSpec(a))
    else {
      console.error(`ไม่รู้จักตัวเลือก: ${a}`)
      return null
    }
  }
  if (out.routes.length === 0 && !out.login) {
    console.error("ระบุ path อย่างน้อย 1 ตัว เช่น / หรือ /courses")
    return null
  }
  return out
}

/**
 * "/admin=302,307" → { path: "/admin", expected: [302, 307] } (pure)
 * นับเป็น status เฉพาะเมื่อหลัง `=` ตัวสุดท้ายเป็นตัวเลขล้วน เพื่อให้ query string อย่าง `/courses?q=react` ไม่ถูกตัด
 */
function parseRouteSpec(spec) {
  const sep = spec.lastIndexOf("=")
  const codes = sep === -1 ? "" : spec.slice(sep + 1)
  if (!/^\d+(,\d+)*$/.test(codes)) return { path: spec, expected: null }
  return { path: spec.slice(0, sep), expected: codes.split(",").map(Number) }
}

async function waitForServer(baseUrl, seconds) {
  const deadline = Date.now() + seconds * 1000
  while (Date.now() < deadline) {
    try {
      await fetch(baseUrl, { redirect: "manual", signal: AbortSignal.timeout(5000) })
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  return false
}

/**
 * sign in ผ่าน endpoint ของ Better Auth แล้วยืนยันด้วย get-session
 * ต้องส่ง Origin ให้ตรงกับ BETTER_AUTH_URL ไม่งั้นโดน CSRF check ปฏิเสธ (Invalid origin)
 */
async function signIn(baseUrl, { email, password }) {
  const label = `login ${email}`
  const started = Date.now()
  let res
  try {
    res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(args.timeout),
    })
  } catch (error) {
    results.push({ label, ok: false, detail: `เรียกไม่ได้: ${error.message}` })
    return ""
  }

  const ms = Date.now() - started
  if (res.status === 404) {
    results.push({ label, ok: false, status: 404, ms, detail: "ยังไม่มี route /api/auth/[...all]" })
    return ""
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200)
    results.push({ label, ok: false, status: res.status, ms, detail: body })
    return ""
  }

  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0])
  const sessionCookie = cookies.filter((c) => c.includes("session_token"))
  if (sessionCookie.length === 0) {
    results.push({ label, ok: false, status: res.status, ms, detail: "ไม่มี session_token ใน set-cookie" })
    return ""
  }
  const cookieHeader = cookies.join("; ")

  let sessionRes
  try {
    sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
      signal: AbortSignal.timeout(args.timeout),
    })
  } catch (error) {
    results.push({ label, ok: false, status: res.status, ms, detail: `เรียก get-session ไม่ได้: ${error.message}` })
    return ""
  }
  const session = sessionRes.ok ? await sessionRes.json().catch(() => null) : null
  const sessionEmail = session?.user?.email
  const ok = sessionEmail === email
  results.push({
    label,
    ok,
    status: res.status,
    ms,
    detail: ok ? `session = ${sessionEmail}` : `get-session ได้ ${sessionRes.status} / ${sessionEmail ?? "ไม่มี user"}`,
  })
  return ok ? cookieHeader : ""
}

async function checkRoute(baseUrl, { path, expected }, cookieHeader) {
  const label = `GET ${path}`
  const started = Date.now()
  let res
  try {
    res = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      signal: AbortSignal.timeout(args.timeout),
    })
  } catch (error) {
    return { label, ok: false, detail: `เรียกไม่ได้: ${error.message}` }
  }

  const ms = Date.now() - started
  const body = await res.text()
  const statusOk = expected ? expected.includes(res.status) : res.status >= 200 && res.status < 300
  const marker = res.status < 300 ? ERROR_MARKERS.find((m) => body.includes(m)) : undefined
  const location = res.headers.get("location")

  let detail = ""
  if (!statusOk) {
    detail = res.status === 404 && !expected ? "ไม่พบหน้า (ยังไม่ได้สร้าง?)" : `คาดหวัง ${expected?.join(",") ?? "2xx"}`
  } else if (marker) {
    detail = `พบ error ใน HTML: "${marker}"`
  } else if (location) {
    detail = `→ ${location}`
  }
  return { label, ok: statusOk && !marker, status: res.status, ms, detail }
}

function printReport(rows) {
  for (const r of rows) {
    const status = r.status ? String(r.status) : "---"
    const ms = r.ms !== undefined ? `${r.ms}ms` : ""
    console.log(`${r.ok ? "✅" : "❌"} ${r.label.padEnd(40)} ${status.padEnd(4)} ${ms.padStart(7)}  ${r.detail ?? ""}`)
  }
  const passed = rows.filter((r) => r.ok).length
  const slowest = Math.max(0, ...rows.map((r) => r.ms ?? 0))
  console.log(`\nสรุป: ผ่าน ${passed}/${rows.length}, ช้าสุด ${slowest}ms`)
}
