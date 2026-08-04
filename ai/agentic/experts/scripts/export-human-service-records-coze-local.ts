/**
 * Export human-service-records for Coze local/online verification.
 *
 * This script injects Feishu secrets only into ignored local export artifacts:
 * - tmp/human-service-records-coze-local/
 * - experts_coze_output/human-service-records.local.zip
 *
 * It never writes real secrets back into tracked expert source files.
 */

import "dotenv/config";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { zipCozeWorkflowPackage } from "./coze-export/zip-workflow";

const repoRoot = path.resolve(__dirname, "..");
const expertDir = path.join(repoRoot, "experts", "customer", "human-service-records");
const outRoot = path.join(repoRoot, "tmp", "human-service-records-coze-local");
const workflowRoot = path.join(outRoot, "workflow");
const draftYamlPath = path.join(workflowRoot, "workflow", "human_service_records-draft.yaml");
const zipPath = path.join(repoRoot, "experts_coze_output", "human-service-records.local.zip");

const requiredEnv = [
  "FEISHU_APP_ID",
  "FEISHU_APP_SECRET",
  "FEISHU_HUMAN_SERVICE_WIKI_NODE_TOKEN",
] as const;

function requireEnv(name: (typeof requiredEnv)[number]): string {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function jsStringContent(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function replaceAll(text: string, from: string, to: string): string {
  return text.split(from).join(to);
}

function injectSecretsIntoDraftYaml(): void {
  if (!fs.existsSync(draftYamlPath)) {
    throw new Error(`Missing generated draft yaml: ${draftYamlPath}`);
  }

  const replacements: Record<string, string> = {
    "__FEISHU_APP_ID__": jsStringContent(requireEnv("FEISHU_APP_ID")),
    "__FEISHU_APP_SECRET__": jsStringContent(requireEnv("FEISHU_APP_SECRET")),
    "__FEISHU_HUMAN_SERVICE_WIKI_NODE_TOKEN__": jsStringContent(
      requireEnv("FEISHU_HUMAN_SERVICE_WIKI_NODE_TOKEN")
    ),
  };

  let yaml = fs.readFileSync(draftYamlPath, "utf8");
  for (const [placeholder, value] of Object.entries(replacements)) {
    yaml = replaceAll(yaml, placeholder, value);
  }

  const remaining = Object.keys(replacements).filter((placeholder) => yaml.includes(placeholder));
  if (remaining.length > 0) {
    throw new Error(`Failed to inject placeholders: ${remaining.join(", ")}`);
  }

  fs.writeFileSync(draftYamlPath, yaml, "utf8");
}

function runExport(): void {
  execFileSync(
    process.execPath,
    [
      path.join(repoRoot, "node_modules", "ts-node", "dist", "bin.js"),
      "-P",
      path.join(repoRoot, "scripts", "tsconfig.json"),
      path.join(repoRoot, "scripts", "expert-to-coze-cli.ts"),
      expertDir,
      "--out",
      outRoot,
      "--validate",
      "--no-zip",
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    }
  );
}

for (const name of requiredEnv) {
  requireEnv(name);
}

fs.rmSync(outRoot, { recursive: true, force: true });
runExport();
injectSecretsIntoDraftYaml();
zipCozeWorkflowPackage(workflowRoot, zipPath);

process.stdout.write(`Wrote local Coze verification package: ${zipPath}\n`);
process.stdout.write("Feishu secrets were injected only into ignored local export artifacts.\n");
