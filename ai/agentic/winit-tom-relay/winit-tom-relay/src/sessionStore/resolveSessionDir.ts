import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** 项目根下 `sessions`（从 `src/config` 或 `dist/config` 的目录上溯两级到项目根）。 */
export function defaultSessionStoreDirFromConfigMeta(importMetaUrl: string): string {
  const configDir = dirname(fileURLToPath(importMetaUrl));
  return join(configDir, "..", "..", "sessions");
}

/**
 * `RELAY_SESSION_STORE_DIR`：可选；绝对路径直接使用，相对路径相对 `process.cwd()` 解析。
 * 未设置时默认 `sessions`（相对本包源码/编译目录的项目根）。
 */
export function resolveSessionDir(importMetaUrlForDefault: string): string {
  const fromEnv = process.env.RELAY_SESSION_STORE_DIR?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv);
  }
  return defaultSessionStoreDirFromConfigMeta(importMetaUrlForDefault);
}
