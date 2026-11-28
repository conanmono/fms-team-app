// PostToolUse hook: format only the file that Edit/Write just touched.
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as prettier from "prettier";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const input = JSON.parse(await readStdin());
  const filePath = input?.tool_input?.file_path;
  if (typeof filePath !== "string" || !existsSync(filePath)) return;

  const projectDir = path.resolve(
    process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd(),
  );
  const file = path.resolve(filePath);
  const relative = path.relative(projectDir, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;

  const info = await prettier.getFileInfo(file, {
    ignorePath: path.join(projectDir, ".prettierignore"),
  });
  if (info.ignored || !info.inferredParser) return;

  const source = await readFile(file, "utf8");
  const config = (await prettier.resolveConfig(file)) ?? {};
  const formatted = await prettier.format(source, {
    ...config,
    filepath: file,
  });
  if (formatted !== source) await writeFile(file, formatted, "utf8");
}

main().catch(() => process.exit(0));
