import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../..");
const copilotRoot = resolve(here, "..");

const SECRETS_ENV = resolve(homedir(), ".secrets", "vas-internal-review.env");

function applyEnvFile(file: string, overwrite: boolean): void {
  if (!existsSync(file)) return;
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
    if (!key) continue;
    if (!overwrite && process.env[key] != null) continue;
    process.env[key] = value;
  }
}

function envFileCandidates(): string[] {
  const fromEnv = (process.env.IRC_ENV_FILE || "").trim();
  return [
    fromEnv,
    SECRETS_ENV,
    resolve(copilotRoot, ".env"),
    resolve(projectRoot, ".env"),
    resolve(projectRoot, "ai/agentic/experts/.env"),
  ].filter(Boolean);
}

/**
 * Load key=value files into process.env without overwriting existing values.
 * Prefer systemd EnvironmentFile / IRC_ENV_FILE / ~/.secrets/vas-internal-review.env.
 * Never logs secret values.
 */
export function loadEnvFiles(extraPaths: string[] = []): void {
  for (const file of [...envFileCandidates(), ...extraPaths]) {
    applyEnvFile(file, false);
  }
}

/**
 * Re-apply secrets + copilot `.env` so long-running poll can pick up rate-limit
 * changes without restart. Secrets / IRC_ENV_FILE win over tree `.env`.
 */
export function reloadCopilotEnv(): void {
  for (const file of [
    resolve(copilotRoot, ".env"),
    resolve(projectRoot, ".env"),
    resolve(projectRoot, "ai/agentic/experts/.env"),
  ]) {
    applyEnvFile(file, true);
  }
  const fromEnv = (process.env.IRC_ENV_FILE || "").trim();
  if (fromEnv) applyEnvFile(fromEnv, true);
  applyEnvFile(SECRETS_ENV, true);
}

export function envText(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

export function envNumber(name: string, fallback: number): number {
  const n = Number(envText(name));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function copilotDir(): string {
  return copilotRoot;
}

export function projectDir(): string {
  return projectRoot;
}
