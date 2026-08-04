/**
 * 一次性迁移：format-output / coze.config / workflow.json 对齐 call-expert 四字段合约。
 * 用法：npx ts-node -P scripts/tsconfig.json scripts/migrate-format-output-contract.ts
 */
import fs from "fs";
import path from "path";
import yaml from "yaml";

const REPO = path.resolve(__dirname, "..");
const EXPERTS_DIR = path.join(REPO, "experts");

const STANDARD_END_OUTPUTS = {
  structured: { ref: "format-output", path: "structured" },
  analysis: { ref: "format-output", path: "analysis" },
  outputContext: { ref: "format-output", path: "outputContext" },
  enrichedContext: { ref: "format-output", path: "enrichedContext" },
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

function updateCozeConfig(expertDir: string): boolean {
  const p = path.join(expertDir, "coze.config.yml");
  if (!fs.existsSync(p)) return false;
  const doc = yaml.parseDocument(fs.readFileSync(p, "utf-8"));
  doc.set("endOutputs", STANDARD_END_OUTPUTS);
  fs.writeFileSync(p, String(doc));
  return true;
}

function standardFormatOutputCozeIo(): Record<string, unknown> {
  return {
    outputs: {
      structured: { type: "object", additionalProperties: true },
      analysis: { type: "string" },
      outputContext: { type: "object", additionalProperties: true },
      enrichedContext: { type: "object", additionalProperties: true },
    },
  };
}

function updateWorkflowJson(expertDir: string): boolean {
  const p = path.join(expertDir, "workflow.json");
  const wf = JSON.parse(fs.readFileSync(p, "utf-8")) as {
    nodes: Array<Record<string, unknown>>;
  };
  const node = wf.nodes.find((n) => n.id === "format-output");
  if (!node) return false;
  node.outputs = ["structured", "analysis", "outputContext", "enrichedContext"];
  const cozeIo = (node.cozeIo as Record<string, unknown> | undefined) ?? {};
  node.cozeIo = { ...cozeIo, ...standardFormatOutputCozeIo() };
  delete node.outputSchema;
  fs.writeFileSync(p, `${JSON.stringify(wf, null, 2)}\n`);
  return true;
}

/** 启发式 TS 迁移：去 result 包装、enrichedContext 提升到根级 */
function migrateFormatOutputTs(content: string): string {
  let s = content;

  // outputContext 内嵌 enrichedContext → 根级（保留块内容）
  s = s.replace(
    /outputContext:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*),\s*enrichedContext:\s*(\{[\s\S]*?\}),?\s*\}/g,
    (_m, ocBody, ecBlock) =>
      `outputContext: {${ocBody.trim().replace(/,\s*$/, "")} },\n    enrichedContext: ${ecBlock}`
  );

  // return { result: { structured, analysis }, outputContext } → 扁平
  s = s.replace(
    /return\s*\{\s*result:\s*\{\s*structured(?:,\s*analysis|\s*,\s*analysis)[^}]*\}\s*,\s*outputContext/g,
    (m) => m.replace(/result:\s*\{\s*structured,\s*analysis\s*\}\s*,\s*/, "structured,\n    analysis,\n    ")
  );

  // return { result, structured, analysis, outputContext → 去 result 行
  s = s.replace(/return\s*\{\s*result,\s*structured,/g, "return {\n    structured,");

  // const result = { structured, analysis }; 若仅用于 return 则删除（简化：删 standalone result 变量声明）
  s = s.replace(/\n\s*const result = \{ structured, analysis \};\n/g, "\n");

  // return { result: coerced, outputContext } where coerced has structured+analysis
  s = s.replace(
    /return\s*\{\s*result:\s*coerced,\s*outputContext/g,
    "return {\n    structured: coerced.structured,\n    analysis: coerced.analysis,\n    outputContext"
  );

  // ret = { result, outputContext }
  s = s.replace(
    /const ret = \{\s*["']?result["']?:\s*result,\s*["']?outputContext["']?:\s*outputContext\s*\};/g,
    `const ret = {
    structured: result.structured,
    analysis: result.analysis,
    outputContext,
    enrichedContext: {},
  };`
  );

  // delivery-style: result: { structured, analysis } inside return
  s = s.replace(
    /return\s*\{\s*result:\s*\{\s*structured,\s*analysis\s*\}\s*,\s*outputContext/g,
    "return {\n    structured,\n    analysis,\n    outputContext"
  );

  // substitute/pod style result wrapper
  s = s.replace(
    /return\s*\{\s*result:\s*\{\s*structured,\s*analysis:\s*([^,}]+),\s*\}\s*,\s*outputContext/g,
    "return {\n    structured,\n    analysis: $1,\n    outputContext"
  );

  // product-info style duplicate
  s = s.replace(
    /return\s*\{\s*result,\s*outputContext,\s*structured:\s*result\.structured,\s*analysis:\s*result\.analysis,\s*\}/g,
    `return {
    structured: result.structured,
    analysis: result.analysis,
    outputContext,
    enrichedContext: {},
  }`
  );

  // 若 return 块含 outputContext 但无 enrichedContext，在闭合前补 {}
  if (s.includes("async function main") && s.includes("outputContext") && !/enrichedContext:/.test(s)) {
    s = s.replace(
      /(return\s*\{[\s\S]*?outputContext:\s*\{[\s\S]*?\},)(\s*\};)/g,
      "$1\n    enrichedContext: {},$2"
    );
  }

  // chainId 缺省
  s = s.replace(/chainId:\s*inputContext\?\.chainId(?!\s*\?\?)/g, "chainId: inputContext?.chainId ?? \"\"");
  s = s.replace(/chainId:\s*inputContext\.chainId(?!\s*\?\?)/g, "chainId: inputContext.chainId ?? \"\"");

  return s;
}

function updateFormatOutputTs(expertDir: string): boolean {
  const p = path.join(expertDir, "nodes", "format-output.ts");
  if (!fs.existsSync(p)) return false;
  const before = fs.readFileSync(p, "utf-8");
  const after = migrateFormatOutputTs(before);
  if (after !== before) fs.writeFileSync(p, after);
  return true;
}

function main() {
  const dirs = findExpertDirs();
  console.log(`Migrating ${dirs.length} experts...`);
  for (const dir of dirs) {
    const name = path.relative(REPO, dir);
    const flags = [
      updateCozeConfig(dir) && "coze.config",
      updateWorkflowJson(dir) && "workflow.json",
      updateFormatOutputTs(dir) && "format-output.ts",
    ].filter(Boolean);
    console.log(`  ${name}: ${flags.join(", ") || "skip"}`);
  }
}

main();
