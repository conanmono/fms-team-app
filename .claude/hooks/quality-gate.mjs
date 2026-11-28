#!/usr/bin/env node
// Stop hook: ตรวจรับงานก่อน Claude จบ turn (lint → typecheck → test)
// - ไม่มีไฟล์โค้ดค้าง: ข้าม เพื่อไม่ให้ turn ที่แค่ถามตอบช้า
// - ไม่ผ่านรอบแรก: exit 2 ให้ Claude แก้ต่อ 1 รอบ
// - ไม่ผ่านรอบสอง (stop_hook_active): แจ้งมนุษย์ทาง systemMessage แล้วปล่อยให้จบ กันวนไม่สิ้นสุด
// การจบ turn ไม่ได้แปลว่า gate ผ่าน CI ต้องตรวจซ้ำก่อน merge

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // ไม่มี input ก็ถือว่าเป็นรอบแรก
}

const run = (cmd, args) =>
  spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: process.platform === "win32" });

// ไฟล์ที่ทำให้ต้องรัน gate: โค้ด, schema, script และ config ที่มีผลกับ lint/tsc/test
const CODE_PATH =
  /^(src\/|__tests__\/|prisma\/(?!.*\.db)|scripts\/|next\.config\.ts$|eslint\.config\.mjs$|tsconfig\.json$|vitest\.config\.mts$|vitest\.setup\.ts$|package\.json$)/;
const status = run("git", ["status", "--porcelain"]);
if (status.status === 0) {
  const changed = status.stdout
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3).split(" -> ").pop().replace(/^"|"$/g, ""));
  if (!changed.some((p) => CODE_PATH.test(p))) process.exit(0);
}

// ใช้ `vitest run` เพราะ `npm run test` เป็น watch mode จะค้าง
// typecheck ต้อง typegen ก่อน เพราะ tsc ต้องใช้ route types ใน .next/types
const checks = [
  { name: "lint", steps: [["npm", ["run", "lint"]]] },
  {
    name: "typecheck",
    steps: [
      ["npx", ["next", "typegen"]],
      ["npx", ["tsc", "--noEmit"]],
    ],
  },
  { name: "test", steps: [["npx", ["vitest", "run"]]] },
];

const failures = [];
for (const { name, steps } of checks) {
  for (const [cmd, args] of steps) {
    const result = run(cmd, args);
    if (result.status !== 0) {
      const out = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\n").trim();
      // เก็บท้าย log เพราะสรุป error ของ tsc/vitest อยู่ท้ายสุด
      failures.push(`Failed: ${name} (${cmd} ${args.join(" ")})\n${out.slice(-4000)}`);
      break;
    }
  }
}

if (failures.length === 0) process.exit(0);

const message = failures.join("\n\n");

if (input.stop_hook_active) {
  console.log(
    JSON.stringify({
      systemMessage: `Quality gate ยังไม่ผ่านหลังแก้อัตโนมัติ 1 รอบ ต้องให้มนุษย์ตรวจ\n${message}`,
    }),
  );
  process.exit(0);
}

console.error(message);
console.error(
  "\nQuality gate ไม่ผ่าน: แก้ที่โค้ดแล้วจบ turn อีกครั้ง ห้ามแก้ config, hook หรือผ่อนเทสต์เพื่อให้ผ่าน",
);
process.exit(2);
