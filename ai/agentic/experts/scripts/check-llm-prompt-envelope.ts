/**
 * 校验 LLM Prompt JSON 示例是否含与 workflow.json outputs[0] 一致的外层 envelope 键。
 * npm run check:llm-prompt-envelope
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
const EXPERTS_ROOT = path.join(ROOT, "experts");

interface WorkflowNode {
  type?: string;
  promptFile?: string;
  outputs?: string[];
}

interface WorkflowJson {
  nodes: WorkflowNode[];
}

function listExpertDirs(): string[] {
  const out: string[] = [];
  for (const domain of fs.readdirSync(EXPERTS_ROOT)) {
    const domainPath = path.join(EXPERTS_ROOT, domain);
    if (!fs.statSync(domainPath).isDirectory()) continue;
    for (const expertId of fs.readdirSync(domainPath)) {
      const expertPath = path.join(domainPath, expertId);
      if (fs.existsSync(path.join(expertPath, "workflow.json"))) out.push(expertPath);
    }
  }
  return out;
}

function buildPromptEnvelopeMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const expertDir of listExpertDirs()) {
    const wf = JSON.parse(fs.readFileSync(path.join(expertDir, "workflow.json"), "utf-8")) as WorkflowJson;
    for (const node of wf.nodes ?? []) {
      if (node.type !== "llm" || !node.outputs?.[0]) continue;
      const promptAbs = path.join(expertDir, node.promptFile ?? "prompts/main.md");
      map.set(promptAbs, node.outputs[0]);
    }
  }
  return map;
}

function checkPromptFile(promptPath: string, envelopeKey: string): string[] {
  const issues: string[] = [];
  const content = fs.readFileSync(promptPath, "utf-8");
  const blocks = [...content.matchAll(/```json\s*\n([\s\S]*?)```/g)];

  if (blocks.length === 0) {
    issues.push("no ```json example block");
    return issues;
  }

  let hasValidExample = false;
  for (const [, body] of blocks) {
    try {
      const parsed = JSON.parse(body.trim()) as Record<string, unknown>;
      if (envelopeKey in parsed) {
        const inner = parsed[envelopeKey];
        if (inner && typeof inner === "object" && !Array.isArray(inner)) {
          const o = inner as Record<string, unknown>;
          if ("structured" in o || "analysis" in o) {
            hasValidExample = true;
            continue;
          }
        }
      }
      if ("structured" in parsed || "analysis" in parsed) {
        issues.push("flat { structured, analysis } without envelope key in a json block");
      }
    } catch {
      /* skip non-parseable examples */
    }
  }

  if (!hasValidExample) {
    issues.push(`missing wrapped example with "${envelopeKey}"`);
  }

  if (/顶层\s*仅有\s*`structured`\s*与\s*`analysis`/i.test(content)) {
    issues.push("still says top-level only structured and analysis");
  }

  return issues;
}

function main(): void {
  const map = buildPromptEnvelopeMap();
  const failures: string[] = [];

  for (const [promptPath, envelopeKey] of map) {
    if (!fs.existsSync(promptPath)) {
      failures.push(`${path.relative(ROOT, promptPath)}: missing file`);
      continue;
    }
    const issues = checkPromptFile(promptPath, envelopeKey);
    if (issues.length > 0) {
      failures.push(`${path.relative(ROOT, promptPath)} (${envelopeKey}): ${issues.join("; ")}`);
    }
  }

  if (failures.length > 0) {
    console.error("check:llm-prompt-envelope FAILED:\n" + failures.map((f) => "  - " + f).join("\n"));
    process.exit(1);
  }
  console.log(`check:llm-prompt-envelope OK (${map.size} prompt file(s))`);
}

main();
