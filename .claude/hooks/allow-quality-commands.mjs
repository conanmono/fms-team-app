#!/usr/bin/env node
// PreToolUse hook สำหรับ subagent `quality-gate-runner`
// อ่าน hook input (JSON) จาก stdin แล้วอนุญาตเฉพาะคำสั่ง Quality Gate ของทีม
// exit 0 = อนุญาต, exit 2 = บล็อก (ข้อความใน stderr จะถูกส่งกลับให้ agent อ่าน)

const ALLOWED = [
  /^npm run lint(\s|$)/,
  /^npx next typegen(\s|$)/,
  /^npx tsc --noEmit(\s|$)/,
  /^npx vitest run(\s|$)/,
];

// ห้ามต่อคำสั่ง / redirect / substitution เพื่อกันการแอบรันคำสั่งอื่นต่อท้าย
const FORBIDDEN_CHARS = /[;|&`$<>\n]/;

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let command = '';
  try {
    command = String(JSON.parse(raw)?.tool_input?.command ?? '').trim();
  } catch {
    console.error('Blocked: อ่าน hook input ไม่ได้');
    process.exit(2);
  }

  // อนุญาต "A && B" เฉพาะกรณีที่ทุกส่วนเป็นคำสั่งที่อนุญาต
  const parts = command.split(/\s*&&\s*/);
  const ok =
    parts.length > 0 &&
    parts.every((p) => !FORBIDDEN_CHARS.test(p) && ALLOWED.some((re) => re.test(p)));

  if (!ok) {
    console.error(
      `Blocked: quality-gate-runner รันได้เฉพาะ npm run lint, npx next typegen, npx tsc --noEmit, npx vitest run (ได้รับ: ${command})`,
    );
    process.exit(2);
  }
  process.exit(0);
});
