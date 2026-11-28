#!/usr/bin/env node
// PreToolUse hook: ป้องกัน "ก่อน" tool ทำงาน
// - Read/Edit/Write ไฟล์ .env* (ยกเว้น .env.example): กัน secret หลุดเข้า context
// - Edit/Write ไฟล์ quality harness: กัน AI แก้กฎเพื่อให้ verification ผ่าน ให้มนุษย์แก้ผ่าน PR
// - Edit/Write ไฟล์ generate / ข้อมูล: generated/, prisma/*.db, package-lock.json
// - Bash อันตราย: rm -rf ที่ root/home/.., git push --force, git reset --hard, อ่าน .env ผ่าน shell
// exit 2 = บล็อก tool call นั้น และส่งข้อความใน stderr ให้ Claude อ่าน
// ข้อจำกัด: ตรวจจาก path และข้อความคำสั่ง ยังอ้อมผ่าน Bash ได้ ต้องใช้คู่กับ permissions.deny, sandbox และ CI

import { readFileSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const block = (msg) => {
  console.error(`Blocked by protect-files: ${msg}`);
  process.exit(2);
};

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // อ่าน input ไม่ได้: ไม่ตัดสิน ปล่อยให้ระบบ permission ปกติจัดการ
}

const tool = input.tool_name;
const ti = input.tool_input ?? {};

const isSecretFile = (p) => {
  const name = basename(String(p ?? ""));
  return /^\.env(\..+)?$/.test(name) && name !== ".env.example";
};

const HARNESS = [
  /^\.claude\/settings\.json$/,
  /^\.claude\/hooks\//,
  /^\.claude\/rules\/review\.md$/,
  /^eslint\.config\.mjs$/,
  /^tsconfig\.json$/,
  /^vitest\.config\.mts$/,
  /^vitest\.setup\.ts$/,
];
const GENERATED = [/^generated\//, /^prisma\/.*\.db(-journal|-wal|-shm)?$/, /^package-lock\.json$/];

const toRel = (p) => {
  const abs = isAbsolute(p) ? p : resolve(root, p);
  return relative(root, abs).split("\\").join("/");
};

if (["Read", "Edit", "Write"].includes(tool) && isSecretFile(ti.file_path)) {
  block(`ห้าม ${tool} ไฟล์ secret (${basename(ti.file_path)}) ให้ใช้ .env.example เป็นตัวอย่าง และขอให้ผู้ใช้แก้ .env เอง`);
}

if (["Edit", "Write"].includes(tool) && ti.file_path) {
  const rel = toRel(String(ti.file_path));
  if (HARNESS.some((re) => re.test(rel))) {
    block(
      `${rel} เป็นไฟล์ quality harness ห้าม AI แก้เพื่อให้ verification ผ่าน ` +
        "ให้แก้ที่โค้ดแทน ถ้าจำเป็นต้องเปลี่ยนกฎจริงให้เสนอผู้ใช้แก้เองผ่าน PR",
    );
  }
  if (GENERATED.some((re) => re.test(rel))) {
    block(`${rel} เป็นไฟล์ที่ generate หรือเป็นข้อมูล ให้ใช้คำสั่ง (npx prisma generate / db push / npm install) แทนการแก้มือ`);
  }
}

if (tool === "Bash") {
  const cmd = String(ti.command ?? "");
  const rules = [
    [/\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+(\/|~|\.\.)(\s|$|\/)/, "rm -rf ที่ root, home หรือโฟลเดอร์แม่"],
    [/\bgit\s+push\b.*(--force(?![-\w])|\s-f\b)/, "git push --force (ให้ใช้ --force-with-lease และขออนุญาตก่อน)"],
    [/\bgit\s+reset\s+--hard\b/, "git reset --hard (งานที่ยังไม่ commit จะหาย)"],
    [/(^|[\s;|&])(cat|less|more|head|tail|source|grep)\s+[^|;&]*\.env(?!\.example)\b/, "อ่านไฟล์ .env ผ่าน shell"],
  ];
  for (const [re, why] of rules) if (re.test(cmd)) block(why);
}

process.exit(0);
