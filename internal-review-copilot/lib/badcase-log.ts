import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { projectDir } from "./env.ts";

function dayStamp(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", "");
}

export function badcaseLogPath(day = dayStamp()): string {
  return resolve(projectDir(), `_runs/${day}_badcase`, "badcase-log.jsonl");
}

export function appendBadcase(entry: Record<string, unknown>): string {
  const path = badcaseLogPath();
  mkdirSync(resolve(path, ".."), { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  appendFileSync(path, `${line}\n`, "utf8");
  return path;
}
