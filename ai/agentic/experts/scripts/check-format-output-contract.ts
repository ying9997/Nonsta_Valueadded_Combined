/**
 * 校验各专家 format-output / coze.config / workflow.json 是否符合四字段合约。
 * 用法：npx ts-node -P scripts/tsconfig.json scripts/check-format-output-contract.ts [--strict]
 */
import fs from "fs";
import path from "path";
import yaml from "yaml";

const REPO = path.resolve(__dirname, "..");
const EXPERTS_DIR = path.join(REPO, "experts");

const REQUIRED_OUTPUTS = ["structured", "analysis", "outputContext", "enrichedContext"] as const;

const STANDARD_END_PATHS: Record<string, string> = {
  structured: "structured",
  analysis: "analysis",
  outputContext: "outputContext",
  enrichedContext: "enrichedContext",
};

function findExpertDirs(): string[] {
  const out: string[] = [];
  for (const domain of fs.readdirSync(EXPERTS_DIR)) {
    const domainPath = path.join(EXPERTS_DIR, domain);
    if (!fs.statSync(domainPath).isDirectory()) continue;
    for (const id of fs.readdirSync(domainPath)) {
      const expertPath = path.join(domainPath, id);
      if (fs.existsSync(path.join(expertPath, "workflow.json"))) out.push(expertPath);
    }
  }
  return out.sort();
}

function checkCozeConfig(expertDir: string): string[] {
  const p = path.join(expertDir, "coze.config.yml");
  if (!fs.existsSync(p)) return ["missing coze.config.yml"];
  const doc = yaml.parse(fs.readFileSync(p, "utf-8")) as {
    endOutputs?: Record<string, { ref?: string; path?: string }>;
  };
  const errs: string[] = [];
  const eo = doc.endOutputs ?? {};
  for (const key of REQUIRED_OUTPUTS) {
    const spec = eo[key];
    if (!spec) {
      errs.push(`endOutputs.${key} missing`);
      continue;
    }
    if (spec.ref !== "format-output") errs.push(`endOutputs.${key}.ref must be format-output`);
    if (spec.path !== STANDARD_END_PATHS[key]) {
      errs.push(`endOutputs.${key}.path must be "${STANDARD_END_PATHS[key]}" (got ${spec.path ?? "?"})`);
    }
  }
  return errs;
}

function checkWorkflowJson(expertDir: string): string[] {
  const p = path.join(expertDir, "workflow.json");
  const wf = JSON.parse(fs.readFileSync(p, "utf-8")) as {
    nodes: Array<{ id?: string; outputs?: string[] }>;
  };
  const node = wf.nodes.find((n) => n.id === "format-output");
  if (!node) return ["workflow.json: no format-output node"];
  const outs = node.outputs ?? [];
  const errs: string[] = [];
  for (const key of REQUIRED_OUTPUTS) {
    if (!outs.includes(key)) errs.push(`format-output.outputs missing "${key}"`);
  }
  if (outs.includes("result")) errs.push('format-output.outputs must not include "result"');
  return errs;
}

function checkFormatOutputTs(expertDir: string): string[] {
  const p = path.join(expertDir, "nodes", "format-output.ts");
  if (!fs.existsSync(p)) return ["missing nodes/format-output.ts"];
  const s = fs.readFileSync(p, "utf-8");
  const errs: string[] = [];
  if (/\breturn\s*\{[\s\S]*?\bresult\s*:/.test(s) && !/\breturn\s*\{[\s\S]*?\bstructured\s*,/.test(s)) {
    errs.push("format-output.ts: return must not use result wrapper");
  }
  if (/outputContext:\s*\{[^}]*enrichedContext\s*:/.test(s)) {
    errs.push("format-output.ts: enrichedContext must be root-level, not inside outputContext");
  }
  if (!/\benrichedContext\b/.test(s)) {
    errs.push("format-output.ts: must return enrichedContext (use {} when empty)");
  }
  if (!/\breturn\s*\{[\s\S]*?\bstructured\b/.test(s)) errs.push("format-output.ts: must return structured");
  if (!/\breturn\s*\{[\s\S]*?\banalysis\b/.test(s)) errs.push("format-output.ts: must return analysis");
  if (!/\breturn\s*\{[\s\S]*?\boutputContext\b/.test(s)) errs.push("format-output.ts: must return outputContext");
  return errs;
}

function main() {
  const strict = process.argv.includes("--strict");
  let failed = 0;
  for (const dir of findExpertDirs()) {
    const name = path.relative(REPO, dir);
    const errs = [
      ...checkCozeConfig(dir),
      ...checkWorkflowJson(dir),
      ...checkFormatOutputTs(dir),
    ];
    if (errs.length) {
      failed++;
      console.error(`FAIL ${name}`);
      for (const e of errs) console.error(`  - ${e}`);
    } else if (strict) {
      console.log(`OK   ${name}`);
    }
  }
  if (failed) {
    console.error(`\n${failed} expert(s) failed format-output contract check`);
    process.exit(1);
  }
  console.log("All experts pass format-output contract check.");
}

main();
