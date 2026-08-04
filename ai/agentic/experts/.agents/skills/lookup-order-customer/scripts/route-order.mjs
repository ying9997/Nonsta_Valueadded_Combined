#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.join(scriptDir, "..", "references", "order-types.json");

function usage() {
  console.error("Usage: node route-order.mjs <identifier> [--hint <text>] [--json]");
}

function parseArgs(argv) {
  const args = { identifier: "", hint: "", json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--hint") args.hint = String(argv[++i] ?? "");
    else if (value === "--json") args.json = true;
    else if (!args.identifier) args.identifier = value;
    else args.identifier += ` ${value}`;
  }
  return args;
}

function matchesPattern(value, patterns) {
  return patterns.some((pattern) => new RegExp(pattern, "i").test(value));
}

const args = parseArgs(process.argv.slice(2));
const original = String(args.identifier ?? "");
const normalized = original.trim();
if (!normalized) {
  usage();
  process.exit(2);
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const hintText = `${args.hint} ${original}`.toLowerCase();
const candidates = registry.types
  .filter((type) => {
    if (type.id === "unknown-identifier") return false;
    const patternMatch = matchesPattern(normalized, type.patterns ?? []);
    const hintMatch = (type.hints ?? []).some((hint) => hintText.includes(String(hint).toLowerCase()));
    return patternMatch || hintMatch;
  })
  .sort((a, b) => a.priority - b.priority)
  .map((type) => ({
    id: type.id,
    status: type.status,
    route: type.route,
    searchLabels: type.searchLabels,
    gap: type.gap ?? ""
  }));

if (candidates.length === 0) {
  const fallback = registry.types.find((type) => type.id === "unknown-identifier");
  candidates.push({
    id: fallback.id,
    status: fallback.status,
    route: fallback.route,
    searchLabels: fallback.searchLabels,
    gap: fallback.gap
  });
}

const result = {
  identifier: original,
  normalized,
  candidates,
  fallbackFields: ["customerCode", "customerName", "username"]
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Identifier: ${normalized}`);
  for (const candidate of candidates) {
    console.log(`- ${candidate.id} [${candidate.status}] -> ${candidate.route}`);
  }
  console.log("Fallback: customerCode, customerName, username");
}
