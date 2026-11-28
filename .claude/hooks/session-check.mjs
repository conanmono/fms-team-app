#!/usr/bin/env node
// SessionStart hook: ตรวจความพร้อมของโปรเจกต์ + ใส่ context ของทีมให้ Claude ตั้งแต่เริ่ม session
// ข้อความใน `additionalContext` จะถูกใส่เข้า context ก่อน prompt แรก
// SessionStart บล็อกไม่ได้ ถ้าสคริปต์พังก็แค่ข้ามไป จึง exit 0 เสมอ

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

let source = "startup";
try {
  source = JSON.parse(readFileSync(0, "utf8"))?.source ?? source;
} catch {
  // ไม่มี input ก็ใช้ค่าเริ่มต้น
}

const git = (...args) => {
  try {
    // trimEnd ไม่ใช่ trim: บรรทัดแรกของ `git status --porcelain` อาจขึ้นต้นด้วยช่องว่าง (" M file")
    // ถ้าตัดทิ้ง slice(3) ด้านล่างจะกินตัวอักษรแรกของ path (".claude" → "claude")
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trimEnd();
  } catch {
    return "";
  }
};

// ตรวจแค่ว่า "มีไฟล์" ห้ามอ่านเนื้อหา .env เพราะเป็น secret
const readiness = [
  ["node_modules", "npm install"],
  [".env", "cp .env.example .env แล้วให้ผู้ใช้กรอก BETTER_AUTH_SECRET / BETTER_AUTH_URL"],
  ["generated/prisma", "npx prisma generate"],
  ["prisma/dev.db", "npx prisma db push && npm run db:seed"],
];
const missing = readiness.filter(([p]) => !existsSync(join(root, p)));

const branch = git("branch", "--show-current") || "(detached)";
const changed = git("status", "--porcelain").split("\n").filter(Boolean);
let specs = [];
try {
  specs = readdirSync(join(root, "specs")).filter((f) => f.endsWith(".md") && f !== "README.md");
} catch {
  // ยังไม่มีโฟลเดอร์ specs
}

// hook ของทีม (protect-files.mjs, quality-gate-runner) ตรวจเฉพาะ Bash tool
// บน Windows ถ้า PowerShell tool ยังเปิด Claude จะรันคำสั่งผ่าน PowerShell แล้วการป้องกันจะหายไปเงียบ ๆ
// settings.json ตั้ง CLAUDE_CODE_USE_POWERSHELL_TOOL=0 ไว้แล้ว ค่าอื่นแปลว่าถูกตั้งทับในเครื่อง
const shellWarning =
  process.platform === "win32" && process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL !== "0"
    ? "⚠️ Windows: PowerShell tool ยังเปิดอยู่ hook ที่ตรวจคำสั่ง shell จะไม่ทำงาน ให้ติดตั้ง Git Bash และตั้ง CLAUDE_CODE_USE_POWERSHELL_TOOL=0 (ดู docs/workshop-module-04.md ขั้น 0)"
    : "";

const lines = [
  ...(shellWarning ? [shellWarning] : []),
  `[session-check] source=${source}`,
  missing.length
    ? `โปรเจกต์ยังไม่พร้อม ขาด: ${missing.map(([p, fix]) => `${p} (รัน: ${fix})`).join("; ")}`
    : "ความพร้อม: node_modules, .env, generated/prisma, prisma/dev.db ครบ",
  `Branch ปัจจุบัน: ${branch}${branch === "main" ? " ⚠️ ห้าม commit ตรงเข้า main ให้แตก branch ก่อน (git.md)" : ""}`,
  changed.length
    ? `ไฟล์ที่ยังไม่ commit (${changed.length}): ${changed.slice(0, 15).map((l) => l.slice(3)).join(", ")}${changed.length > 15 ? ", ..." : ""}`
    : "ไม่มีไฟล์ค้าง (working tree สะอาด)",
  specs.length ? `Specs ใน specs/: ${specs.join(", ")}` : "ยังไม่มี spec ใน specs/",
  "ก่อนเปิด PR ให้รัน quality-gate-runner แล้วตามด้วย code-reviewer (ส่ง diff เข้าไป) และ security-reviewer",
];

process.stdout.write(
  JSON.stringify({
    // systemMessage ให้มนุษย์เห็นคำเตือนด้วย ไม่ใช่แค่ Claude
    ...(shellWarning ? { systemMessage: shellWarning } : {}),
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: lines.join("\n") },
  }),
);
process.exit(0);
