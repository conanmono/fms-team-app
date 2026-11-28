#!/usr/bin/env node
// PostToolUse hook: ทำงาน "หลัง" Edit/Write สำเร็จ กับไฟล์ .ts/.tsx/.js/.jsx/.mjs ใน src/ และ __tests__/
// repo นี้ไม่มี Prettier จึงใช้ `eslint --fix` เป็นขั้น format + lint แล้วตรวจกฎทีมที่ ESLint ไม่ครอบคลุม
// (.claude/rules/code-style.md)
// - ไม่มีปัญหา: exit 0 เงียบ ๆ
// - ยังเหลือปัญหา: exit 2 ส่งรายละเอียดทาง stderr ให้ Claude แก้ต่อ (tool ทำงานไปแล้ว ย้อนไม่ได้)

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

let file;
try {
  file = JSON.parse(readFileSync(0, "utf8"))?.tool_input?.file_path;
} catch {
  process.exit(0); // อ่าน input ไม่ได้: ไม่ตัดสิน
}
if (!file) process.exit(0);

const abs = isAbsolute(file) ? file : resolve(root, file);
const rel = relative(root, abs).split("\\").join("/");
if (!/^(src|__tests__)\//.test(rel) || !/\.(tsx?|jsx?|mjs)$/.test(rel) || !existsSync(abs)) {
  process.exit(0);
}

const problems = [];

// 1) ESLint: --fix แก้ที่แก้ได้ แล้ว --max-warnings 0 เพื่อให้ warning (เช่น ตัวแปรไม่ได้ใช้) ถูกส่งกลับให้ Claude ด้วย
const eslint = spawnSync("npx", ["eslint", "--fix", "--max-warnings", "0", rel], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (eslint.status !== 0) {
  const out = [eslint.stdout, eslint.stderr, eslint.error?.message].filter(Boolean).join("\n").trim();
  problems.push(`ESLint:\n${out.slice(0, 3000)}`);
}

// 2) กฎทีมที่ ESLint ไม่ได้ตั้งไว้ (อ่านไฟล์หลัง --fix)
const lines = readFileSync(abs, "utf8").split("\n");
const rules = [
  {
    re: /from\s+["']@prisma\/client["']/,
    msg: 'import Prisma Client จาก generated/prisma/client (output ของ prisma generate) ห้ามใช้ "@prisma/client"',
  },
  {
    re: /(from\s+|import\s*\(\s*)["']\.\.\/\.\.\//,
    msg: 'ใช้ alias "@/*" แทน relative path ที่ขึ้นไปเกิน 1 ระดับ (../../)',
  },
  {
    // ต้องมีเหตุผลกำกับบรรทัดเดียวกัน เช่น `// @ts-expect-error -- lib ยังไม่มี type`
    re: /@ts-(ignore|expect-error)(?!\s*(--|:)?\s*\S{3,})/,
    msg: "@ts-ignore / @ts-expect-error ต้องมี comment บอกเหตุผลบรรทัดเดียวกัน",
  },
  {
    re: /\bconsole\.log\s*\(/,
    msg: "ห้ามทิ้ง console.log ใน src/",
    only: /^src\//,
  },
];
lines.forEach((line, i) => {
  for (const { re, msg, only } of rules) {
    if (only && !only.test(rel)) continue;
    if (re.test(line)) problems.push(`${rel}:${i + 1} ${msg}`);
  }
});

if (problems.length === 0) process.exit(0);

console.error(
  `check-style พบปัญหาใน ${rel} (ตาม .claude/rules/code-style.md) กรุณาแก้ที่โค้ด ห้ามแก้ config เพื่อให้ผ่าน:\n\n` +
    problems.join("\n"),
);
process.exit(2);
