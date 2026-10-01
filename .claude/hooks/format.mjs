// Claude Code PostToolUse hook: runs Prettier on a file right after Claude edits or writes it.
// Reads the hook JSON from stdin. It must NEVER block or fail an edit, so every problem is swallowed
// and the process always exits 0.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const FORMATTED = new Set([".ts", ".tsx", ".mjs", ".css", ".json"]);
const SKIPPED_NAMES = new Set(["package-lock.json"]);
const SKIPPED_DIRS = ["node_modules", ".next", "out", "coverage", ".git"];

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

try {
  const input = JSON.parse(await readStdin());
  const raw = input?.tool_response?.filePath ?? input?.tool_input?.file_path;
  if (typeof raw === "string" && raw) {
    const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
    const file = path.resolve(root, raw);
    const relative = path.relative(root, file);
    const inside = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
    const parts = relative.split(path.sep);
    const wanted =
      inside &&
      FORMATTED.has(path.extname(file).toLowerCase()) &&
      !SKIPPED_NAMES.has(path.basename(file)) &&
      !parts.some((p) => SKIPPED_DIRS.includes(p)) &&
      existsSync(file);
    const prettier = path.join(root, "node_modules", "prettier", "bin", "prettier.cjs");
    if (wanted && existsSync(prettier)) {
      // Local Prettier only (no network, no npx). Output is silenced; failures are ignored.
      spawnSync(process.execPath, [prettier, "--write", "--log-level", "silent", file], {
        cwd: root,
        stdio: "ignore",
        timeout: 20000,
      });
    }
  }
} catch {
  // never break an edit because of formatting
}
process.exit(0);
