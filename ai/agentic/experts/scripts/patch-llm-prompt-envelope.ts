/**
 * 批量将 Prompt 中扁平 LLM JSON 示例包一层 envelope（与 workflow.json LLM outputs[0] 对齐）。
 * 用法: npx ts-node -P scripts/tsconfig.json scripts/patch-llm-prompt-envelope.ts [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";

const EXPERTS_ROOT = path.join(__dirname, "..", "experts");
const dryRun = process.argv.includes("--dry-run");

interface WorkflowNode {
  id?: string;
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
      if (fs.existsSync(path.join(expertPath, "workflow.json"))) {
        out.push(expertPath);
      }
    }
  }
  return out;
}

function buildPromptEnvelopeMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const expertDir of listExpertDirs()) {
    const wfPath = path.join(expertDir, "workflow.json");
    let wf: WorkflowJson;
    try {
      wf = JSON.parse(fs.readFileSync(wfPath, "utf-8")) as WorkflowJson;
    } catch {
      continue;
    }
    for (const node of wf.nodes ?? []) {
      if (node.type !== "llm" || !node.outputs?.[0]) continue;
      const promptRel = node.promptFile ?? "prompts/main.md";
      const promptAbs = path.join(expertDir, promptRel);
      map.set(promptAbs, node.outputs[0]);
    }
  }
  return map;
}

function isLlmOutputShape(obj: Record<string, unknown>): boolean {
  return (
    ("structured" in obj || "analysis" in obj) &&
    typeof obj === "object" &&
    !Array.isArray(obj)
  );
}

function wrapJsonBlock(inner: string, envelopeKey: string): string | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(inner.trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!(envelopeKey in parsed) && isLlmOutputShape(parsed)) {
    const wrapped = { [envelopeKey]: parsed };
    return JSON.stringify(wrapped, null, 2);
  }
  return null;
}

function patchMarkdown(content: string, envelopeKey: string): string {
  let next = content;

  next = next.replace(
    /顶层\s*仅有\s*`structured`\s*与\s*`analysis`/g,
    `顶层 **仅有** \`${envelopeKey}\`（与 workflow LLM 节点 outputs 一致），其内包含 \`structured\` 与 \`analysis\``
  );
  next = next.replace(
    /只输出\s*\*\*一个\*\*\s*JSON\s*对象，顶层\s*仅有\s*`structured`\s*与\s*`analysis`/g,
    `只输出 **一个** JSON 对象，顶层 **仅有** \`${envelopeKey}\`，其内包含 \`structured\` 与 \`analysis\``
  );
  next = next.replace(
    /只输出一个 JSON 对象，顶层仅有 `structured` 与 `analysis`/g,
    `只输出一个 JSON 对象，顶层仅有 \`${envelopeKey}\`，其内包含 \`structured\` 与 \`analysis\``
  );
  next = next.replace(
    /不要再包一层 `analysisResult`/g,
    `须使用外层键 \`${envelopeKey}\` 包裹`
  );
  next = next.replace(
    /顶层 \*\*仅有\*\* `structured` 与 `analysis` 两个键[^;]*;/g,
    `顶层 **仅有** \`${envelopeKey}\` 一个键，其内包含 \`structured\` 与 \`analysis\`;`
  );

  next = next.replace(/```json\s*\n([\s\S]*?)```/g, (full, body: string) => {
    const wrapped = wrapJsonBlock(body, envelopeKey);
    if (!wrapped) return full;
    return "```json\n" + wrapped + "\n```";
  });

  return next;
}

function main(): void {
  const map = buildPromptEnvelopeMap();
  let changed = 0;

  for (const [promptPath, envelopeKey] of map) {
    if (!fs.existsSync(promptPath)) continue;
    const before = fs.readFileSync(promptPath, "utf-8");
    const after = patchMarkdown(before, envelopeKey);
    if (after !== before) {
      changed++;
      const rel = path.relative(path.join(__dirname, ".."), promptPath);
      console.log(dryRun ? "[dry-run] would patch:" : "patched:", rel, "->", envelopeKey);
      if (!dryRun) fs.writeFileSync(promptPath, after, "utf-8");
    }
  }

  // examples.md：按同专家 main 的 envelope 键包裹（若存在 workflow）
  for (const expertDir of listExpertDirs()) {
    const examplesPath = path.join(expertDir, "prompts", "examples.md");
    if (!fs.existsSync(examplesPath)) continue;
    const mainPath = path.join(expertDir, "prompts", "main.md");
    const envelopeKey = map.get(mainPath) ?? "analysisResult";
    const before = fs.readFileSync(examplesPath, "utf-8");
    const after = patchMarkdown(before, envelopeKey);
    if (after !== before) {
      changed++;
      const rel = path.relative(path.join(__dirname, ".."), examplesPath);
      console.log(dryRun ? "[dry-run] would patch:" : "patched:", rel);
      if (!dryRun) fs.writeFileSync(examplesPath, after, "utf-8");
    }
  }

  console.log(`done: ${changed} file(s) ${dryRun ? "would change" : "changed"}`);
}

main();
