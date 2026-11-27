const FALLBACK_PATH = "/"
const BASE_ORIGIN = "http://localhost"

/**
 * แปลงค่า `?next=` ให้เป็น path ภายในเว็บเท่านั้น (กัน open redirect)
 * ค่าที่ชี้ออกนอกเว็บ เช่น "https://evil.com", "//evil.com", "/\\evil.com" จะได้ "/"
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return FALLBACK_PATH

  // browser ตัด tab/newline ทิ้งก่อนตีความ URL — "/\t/evil.com" จะกลายเป็น "//evil.com"
  const cleaned = next.replace(/[\t\n\r]/g, "")
  if (cleaned.startsWith("//") || cleaned.startsWith("/\\")) return FALLBACK_PATH

  let url: URL
  try {
    url = new URL(cleaned, BASE_ORIGIN)
  } catch {
    return FALLBACK_PATH
  }
  if (url.origin !== BASE_ORIGIN) return FALLBACK_PATH

  return `${url.pathname}${url.search}${url.hash}`
}
