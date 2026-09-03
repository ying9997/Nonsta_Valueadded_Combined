import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../..");
const copilotRoot = resolve(here, "..");

/**
 * Load key=value files into process.env without overwriting existing values.
 * Never logs secret values.
 */
export function loadEnvFiles(extraPaths: string[] = []): void {
  const candidates = [
    resolve(copilotRoot, ".env"),
    resolve(projectRoot, ".env"),
    resolve(projectRoot, "ai/agentic/experts/.env"),
    ...extraPaths,
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] == null) process.env[key] = value;
    }
  }
}

export function envText(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

export function copilotDir(): string {
  return copilotRoot;
}

export function projectDir(): string {
  return projectRoot;
}
