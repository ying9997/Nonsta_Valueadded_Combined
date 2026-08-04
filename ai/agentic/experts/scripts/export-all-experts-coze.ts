/**
 * 校验专家 manifest 与 design.md（若存在）是否符合规约，并批量导出 Coze 工作流包到各专家目录下 workflow/。
 *
 * 用法:
 *   npx ts-node -P scripts/tsconfig.json scripts/export-all-experts-coze.ts [--check-only]
 *
 * npm: npm run export:coze:all
 */

import * as fs from "fs";
import * as path from "path";
import {
  convertExpertDirToCoze,
  stringifyDraftWorkflowYml,
  stringifyManifestYml,
} from "./coze-export/emit";
import { loadCozeExportConfig } from "./coze-export/config";
import {
  EXPERT_INVOKE_RESERVED_PROPERTY_KEYS,
  collectInvalidCozeSchemaPropertyPaths,
} from "./coze-export/manifest-io";
import { auditAllExpertsBatchActionsSchema } from "./coze-export/batch-actions-audit";
import { checkExpertCozePortWiring } from "./check-coze-port-wiring";
import { checkCozeNodeCodeImports, findRepoRoot } from "./coze-export/bundle-coze-node-code";
import { zipCozeWorkflowPackage } from "./coze-export/zip-workflow";

const repoRoot = path.resolve(__dirname, "..");
const cozeZipOutputDir = path.join(repoRoot, "experts_coze_output");
const expertsRoot = path.join(repoRoot, "experts");

/** 遍历「领域/专家 id」叶子目录（含 _template 子目录） */
function walkExpertLeafDirs(root: string): string[] {
  const leaves: string[] = [];
  if (!fs.existsSync(root)) return leaves;

  for (const domain of fs.readdirSync(root, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    const dp = path.join(root, domain.name);

    if (domain.name === "_template") {
      for (const sub of fs.readdirSync(dp, { withFileTypes: true })) {
        if (!sub.isDirectory()) continue;
        leaves.push(path.join(dp, sub.name));
      }
      continue;
    }

    for (const sub of fs.readdirSync(dp, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      leaves.push(path.join(dp, sub.name));
    }
  }

  leaves.sort((a, b) => a.localeCompare(b));
  return leaves;
}

/** 含 _template；仅包含同时存在 manifest.json + workflow.json 的目录（可执行 export:coze） */
export function discoverExpertDirs(root: string): string[] {
  return walkExpertLeafDirs(root).filter(
    (d) =>
      fs.existsSync(path.join(d, "manifest.json")) && fs.existsSync(path.join(d, "workflow.json"))
  );
}

/** 有 manifest 但缺 workflow.json（规约可检，但尚不能批量导出 Coze） */
export function discoverManifestWithoutWorkflow(root: string): string[] {
  return walkExpertLeafDirs(root).filter(
    (d) =>
      fs.existsSync(path.join(d, "manifest.json")) && !fs.existsSync(path.join(d, "workflow.json"))
  );
}

/** 含 manifest 的叶子目录（含仅有 manifest、无 workflow 的专家） */
export function discoverManifestExpertDirs(root: string): string[] {
  return walkExpertLeafDirs(root).filter((d) => fs.existsSync(path.join(d, "manifest.json")));
}

/**
 * design-spec §6：若存在 design.md，须含独立章节「## 调用说明」。
 */
export function checkDesignMdConvention(expertDir: string): string[] {
  const designPath = path.join(expertDir, "design.md");
  if (!fs.existsSync(designPath)) return [];
  const text = fs.readFileSync(designPath, "utf-8");
  if (!/^## 调用说明\s*$/m.test(text)) {
    return [
      `${expertDir}: design.md 须含章节「## 调用说明」（见 docs/design-spec.md §6）`,
    ];
  }
  return [];
}

export function checkManifestConvention(expertDir: string): string[] {
  const errs: string[] = [];
  const manPath = path.join(expertDir, "manifest.json");
  let m: {
    id?: string;
    inputSchema?: { properties?: Record<string, unknown> };
    outputSchema?: { properties?: Record<string, unknown> };
  };
  try {
    m = JSON.parse(fs.readFileSync(manPath, "utf-8"));
  } catch (e) {
    errs.push(`${manPath}: ${e instanceof Error ? e.message : e}`);
    return errs;
  }
  const props = m.inputSchema?.properties ?? {};
  for (const k of Object.keys(props)) {
    if (EXPERT_INVOKE_RESERVED_PROPERTY_KEYS.has(k)) {
      errs.push(
        `${expertDir}: inputSchema.properties 不得含保留键 "${k}"（应使用框架顶层 query/customerIntent/inputContext 与 inputs 对象）`
      );
    }
  }
  for (const invalidPath of collectInvalidCozeSchemaPropertyPaths(props, "inputSchema.properties")) {
    errs.push(
      `${expertDir}: Coze 字段名只能包含字母、数字或下划线，并且以字母或下划线开头：${invalidPath}`
    );
  }
  const outputProps = m.outputSchema?.properties ?? {};
  for (const invalidPath of collectInvalidCozeSchemaPropertyPaths(outputProps, "outputSchema.properties")) {
    errs.push(
      `${expertDir}: Coze 字段名只能包含字母、数字或下划线，并且以字母或下划线开头：${invalidPath}`
    );
  }
  return errs;
}

function writeExport(expertDir: string): void {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(expertDir, "manifest.json"), "utf-8")
  ) as { id: string };
  const { manifestDoc, draftDoc } = convertExpertDirToCoze(expertDir);
  const config = loadCozeExportConfig(expertDir, manifest.id);

  const workflowRoot = path.join(expertDir, "workflow");
  const inner = path.join(workflowRoot, "workflow");
  fs.mkdirSync(inner, { recursive: true });

  const yamlName = config.yamlBasename ?? `${manifest.id}-draft.yaml`;

  fs.writeFileSync(
    path.join(workflowRoot, "MANIFEST.yml"),
    stringifyManifestYml(manifestDoc as Record<string, unknown>),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(inner, yamlName),
    stringifyDraftWorkflowYml(draftDoc as Record<string, unknown>),
    "utf-8"
  );

  console.log(`OK  ${manifest.id}  →  workflow/${path.basename(inner)}/${yamlName}`);

  const zipName = `${manifest.id.replace(/[^a-zA-Z0-9._-]+/g, "_")}.zip`;
  const zipPath = path.join(cozeZipOutputDir, zipName);
  zipCozeWorkflowPackage(workflowRoot, zipPath);
  console.log(`    zip → ${path.relative(repoRoot, zipPath).replace(/\\/g, "/")}`);
}

function main(): void {
const checkOnly = process.argv.includes("--check-only");

const dirs = discoverExpertDirs(expertsRoot);
const manifestOnly = discoverManifestWithoutWorkflow(expertsRoot);

if (dirs.length === 0) {
  console.error(`未找到可导出的专家目录（需 manifest.json + workflow.json）: ${expertsRoot}`);
  process.exit(1);
}

const allErrors: string[] = [];
for (const d of dirs) {
  allErrors.push(...checkManifestConvention(d));
  allErrors.push(...checkCozeNodeCodeImports(d, repoRoot));
}
for (const d of manifestOnly) {
  allErrors.push(...checkManifestConvention(d));
}

const manifestExpertDirs = discoverManifestExpertDirs(expertsRoot);
for (const d of manifestExpertDirs) {
  allErrors.push(...checkDesignMdConvention(d));
}

if (checkOnly) {
  for (const b of auditAllExpertsBatchActionsSchema(expertsRoot)) {
    allErrors.push(
      `${b.rel}: 批处理 schema — ${b.plugin} ← ${b.srcNode}.${b.pathKey}: ${b.problem}`
    );
  }
  for (const d of dirs) {
    for (const e of checkExpertCozePortWiring(d)) {
      allErrors.push(`${path.relative(repoRoot, d).replace(/\\/g, "/")}: 端口拉线 — ${e}`);
    }
  }
}

if (allErrors.length > 0) {
  console.error("专家规约检查失败（manifest / design.md / coze 节点代码）：");
  for (const e of allErrors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `规约检查通过：可导出 ${dirs.length} 个（含 workflow）；另有 ${manifestOnly.length} 个仅有 manifest、尚无 workflow.json。`
);
if (manifestOnly.length > 0) {
  console.log("  未导出（缺 workflow.json）：");
  for (const d of manifestOnly) {
    console.log(`    - ${path.relative(repoRoot, d).replace(/\\/g, "/")}`);
  }
}
if (checkOnly) {
  process.exit(0);
}

console.log("开始导出 Coze 工作流…");
for (const d of dirs) {
  try {
    writeExport(d);
  } catch (e) {
    console.error(`FAIL ${d}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

const postExportBatchIssues = auditAllExpertsBatchActionsSchema(expertsRoot);
if (postExportBatchIssues.length > 0) {
  console.error("导出后批处理 schema 审计失败：");
  for (const b of postExportBatchIssues) {
    console.error(
      `  - ${b.rel}: ${b.plugin} ← ${b.srcNode}.${b.pathKey}: ${b.problem}`
    );
  }
  process.exit(1);
}

console.log(
  `完成：已写入各专家目录下的 workflow/，并在 ${path.relative(repoRoot, cozeZipOutputDir).replace(/\\/g, "/")}/ 下生成对应 zip。`
);
}

if (require.main === module) {
  main();
}
