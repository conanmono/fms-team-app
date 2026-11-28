#!/usr/bin/env node
/**
 * เปิด Prisma Studio กับฐานข้อมูล SQLite ที่ DATABASE_URL ชี้อยู่
 *
 * ทำไมต้องมีสคริปต์นี้: Prisma CLI 7.10 แยก protocol ด้วย url.split("://")
 * ทำให้ URL แบบ relative อย่าง "file:./prisma/dev.db" ถูกมองว่า protocol ไม่รองรับ
 * สคริปต์นี้จึงแปลงเป็น URL แบบ absolute ("file:///C:/.../dev.db") แล้วส่งผ่าน --url
 *
 *   npm run db:studio                 # เปิด Studio ที่ http://localhost:5555
 *   npm run db:studio -- --port 5600  # ส่ง option อื่นต่อให้ prisma studio ได้
 *
 * หมายเหตุ: ไม่ใช้ pathToFileURL เพราะจะแปลงช่องว่างเป็น %20 ซึ่ง Studio ไม่ decode กลับ
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve, sep } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("ไม่พบ DATABASE_URL — สร้างไฟล์ .env จาก .env.example ก่อน");
  process.exit(1);
}

let studioUrl = databaseUrl;
if (databaseUrl.startsWith("file:") && !databaseUrl.startsWith("file://")) {
  const absolutePath = resolve(process.cwd(), databaseUrl.slice("file:".length))
    .split(sep)
    .join("/");
  studioUrl = `file://${absolutePath.startsWith("/") ? "" : "/"}${absolutePath}`;
}

const prismaCli = createRequire(import.meta.url).resolve(
  "prisma/build/index.js",
);
const child = spawn(
  process.execPath,
  [prismaCli, "studio", "--url", studioUrl, ...process.argv.slice(2)],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 0));
