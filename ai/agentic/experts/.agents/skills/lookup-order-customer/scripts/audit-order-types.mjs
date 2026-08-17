#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(skillDir, "..", "..", "..");
const registry = JSON.parse(fs.readFileSync(path.join(skillDir, "references", "order-types.json"), "utf8"));

const identifierPattern = /(?:order|booking|tracking|claim|pod|transport|business|inquiry|package|container).*(?:no|nos|id|ids|identifier|identifiers)$/i;
const excludedPattern = /(?:output|result|record|records|data|facts|summary|plan|plans|action|actions|count|counts|evidence|context|kb|plugin|request|response|verified|rejected|candidate|previous|status)/i;
const excludedExact = new Set(["outOutboundOrderNos", "outTrackingIds", "trackingByOrderNo", "wiOrderNos"]);

function walk(dir, filename, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "tmp" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filename, out);
    else if (entry.name === filename) out.push(full);
  }
  return out;
}

const found = new Map();
for (const manifestPath of walk(path.join(repoRoot, "experts"), "manifest.json")) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    continue;
  }
  for (const name of Object.keys(manifest.inputSchema?.properties ?? {})) {
    if (!identifierPattern.test(name) || excludedPattern.test(name) || excludedExact.has(name)) continue;
    if (!found.has(name)) found.set(name, new Set());
    found.get(name).add(path.relative(repoRoot, manifestPath).replaceAll("\\", "/"));
  }
}

for (const workflowPath of walk(path.join(repoRoot, "experts"), "workflow.json")) {
  let workflow;
  try {
    workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  } catch {
    continue;
  }
  for (const node of workflow.nodes ?? []) {
    for (const input of node.inputs ?? []) {
      const name = String(input);
      if (!identifierPattern.test(name) || excludedPattern.test(name) || excludedExact.has(name)) continue;
      if (!found.has(name)) found.set(name, new Set());
      found.get(name).add(path.relative(repoRoot, workflowPath).replaceAll("\\", "/"));
    }
  }
}

const covered = new Set(registry.coveredInputs ?? []);
const uncovered = [...found.keys()].filter((name) => !covered.has(name)).sort();
const stale = [...covered].filter((name) => !found.has(name)).sort();

console.log(`Registry version: ${registry.version}`);
console.log(`Current identifier inputs: ${found.size}`);
for (const [name, files] of [...found.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`- ${name}: ${[...files].join(", ")}`);
}

if (stale.length > 0) console.log(`Registry-only inputs: ${stale.join(", ")}`);
if (uncovered.length > 0) {
  console.error(`Uncovered identifier inputs: ${uncovered.join(", ")}`);
  process.exit(1);
}

console.log("Coverage audit: PASS");
