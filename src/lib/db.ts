import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("ไม่พบ DATABASE_URL");
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// เก็บ client ไว้ที่ globalThis เพื่อไม่ให้ hot reload ตอน dev เปิด connection ใหม่ทุกครั้ง
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
