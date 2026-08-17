/**
 * 审计各专家 Coze 导出常见问题（不含 inbound-order-status 可 --exclude）：
 * - draft YAML code 块仍含 import
 * - 批处理 actions/trackingActions 缺 action/data properties
 * - 源节点含 shared 以外 import
 * - 源节点含 export
 * - 启用 winit 批处理但 draft 缺失 item.action 拉线
 */

import * as fs from "fs";
import * as pathMod from "path";
import YAML from "yaml";
import { auditAllExpertsBatchActionsSchema } from "./coze-export/batch-actions-audit";
import { auditAllExpertsKbOutputTypes } from "./check-coze-kb-output-types";
import { auditAllExpertsNodeOutputTypes } from "./check-coze-node-output-types";
import { discoverExpertDirs } from "./export-all-experts-coze";
import { bundleCozeNodeCodeForExport, findRepoRoot } from "./coze-export/bundle-coze-node-code";

const repoRoot = findRepoRoot(__dirname);
const expertsRoot = pathMod.join(repoRoot, "experts");

const exclude = new Set(
  process.argv
    .slice(2)
    .filter((a) => !a.startsWith("--"))
    .map((id) => id.trim())
    .filter(Boolean)
);

type Issue = { expert: string; kind: string; detail: string };

function walkYamlFiles(expertDir: string): string[] {
  const inner = pathMod.join(expertDir, "workflow", "workflow");
  if (!fs.existsSync(inner)) return [];
  return fs
    .readdirSync(inner)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => pathMod.join(inner, f));
}

function auditExpert(expertDir: string, manifestId: string): Issue[] {
  const issues: Issue[] = [];
  const rel = pathMod.relative(expertsRoot, expertDir).replace(/\\/g, "/");

  const wfPath = pathMod.join(expertDir, "workflow.json");
  if (!fs.existsSync(wfPath)) return issues;

  const workflow = JSON.parse(fs.readFileSync(wfPath, "utf-8")) as {
    nodes?: Array<{ id?: string; file?: string; cozeIo?: { outputs?: Record<string, unknown> } }>;
  };

  for (const node of workflow.nodes ?? []) {
    if (!node.file?.trim()) continue;
    const abs = pathMod.join(expertDir, node.file);
    if (!fs.existsSync(abs)) {
      issues.push({ expert: rel, kind: "missing-node-file", detail: `${node.id}: ${node.file}` });
      continue;
    }
    const src = fs.readFileSync(abs, "utf-8");
    if (/^\s*export\s/m.test(src)) {
      issues.push({ expert: rel, kind: "source-export", detail: `${node.id}: 源文件含 export` });
    }
    const importRe = /^\s*import\s[\s\S]*?\bfrom\s+["']([^"']+)["']/gm;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src)) !== null) {
      const spec = m[1]!;
      const resolved = pathMod
        .relative(repoRoot, pathMod.resolve(pathMod.dirname(abs), spec))
        .replace(/\\/g, "/");
      if (!resolved.startsWith("shared/") && !resolved.startsWith("shared\\")) {
        issues.push({
          expert: rel,
          kind: "illegal-import",
          detail: `${node.id}: import "${spec}" → ${resolved}（非 shared/）`,
        });
      }
    }
    try {
      const bundled = bundleCozeNodeCodeForExport(abs, repoRoot);
      if (/^\s*import\s/m.test(bundled)) {
        issues.push({ expert: rel, kind: "bundle-import-left", detail: `${node.id}: 内联后仍有 import` });
      }
    } catch (e) {
      issues.push({
        expert: rel,
        kind: "bundle-fail",
        detail: `${node.id}: ${e instanceof Error ? e.message : e}`,
      });
    }

    for (const key of ["actions", "trackingActions"] as const) {
      const out = node.cozeIo?.outputs?.[key] as
        | { type?: string; items?: { properties?: Record<string, unknown> } }
        | undefined;
      if (!out || out.type !== "array") continue;
      const props = out.items?.properties;
      if (!props?.action || !props?.data) {
        issues.push({
          expert: rel,
          kind: "actions-schema",
          detail: `${node.id}: cozeIo.outputs.${key} 缺 action/data properties（导出会自动补，但建议 workflow.json 显式声明）`,
        });
      }
    }
  }

  for (const yamlPath of walkYamlFiles(expertDir)) {
    const doc = YAML.parse(fs.readFileSync(yamlPath, "utf-8")) as {
      nodes?: Array<{ type?: string; title?: string; parameters?: Record<string, unknown> }>;
    };
    const nodes = doc.nodes ?? [];
    for (const n of nodes) {
      if (n.type !== "code") continue;
      const code = String((n.parameters as Record<string, unknown> | undefined)?.code ?? "");
      if (/^\s*import\s/m.test(code)) {
        issues.push({
          expert: rel,
          kind: "yaml-import",
          detail: `节点 ${n.title}: draft YAML code 仍含 import（需 re-export）`,
        });
      }
      const outputs = (n.parameters as Record<string, unknown> | undefined)?.node_outputs as
        | Record<string, { type?: string; items?: { properties?: Record<string, unknown> } }>
        | undefined;
      if (!outputs) continue;
      for (const key of ["actions", "trackingActions"]) {
        const slot = outputs[key];
        if (!slot || slot.type !== "list") continue;
        const props = slot.items?.properties;
        if (!props?.action || !props?.data) {
          issues.push({
            expert: rel,
            kind: "yaml-actions-schema",
            detail: `节点 ${n.title}: node_outputs.${key} 缺 action/data（需 re-export）`,
          });
        }
      }
    }

    const hasBatchPlugin = nodes.some(
      (n) =>
        n.type === "plugin" &&
        (n.parameters as Record<string, unknown> | undefined)?.batch != null
    );
    const hasItemAction = YAML.stringify(doc).includes("path: item.action");
    if (hasBatchPlugin && !hasItemAction) {
      issues.push({
        expert: rel,
        kind: "batch-plugin-wiring",
        detail: "存在批处理插件但未发现 item.action 拉线",
      });
    }
  }

  const yamlFiles = walkYamlFiles(expertDir);
  if (yamlFiles.length === 0 && fs.existsSync(pathMod.join(expertDir, "coze.config.yml"))) {
    issues.push({ expert: rel, kind: "no-draft", detail: "有 coze.config 但无 workflow/workflow/*.yaml" });
  }

  return issues;
}

function main() {
  const dirs = discoverExpertDirs(expertsRoot).filter((d) => {
    const id = JSON.parse(fs.readFileSync(pathMod.join(d, "manifest.json"), "utf-8")).id as string;
    return !exclude.has(id);
  });

  const all: Issue[] = [];
  for (const d of dirs) {
    const id = JSON.parse(fs.readFileSync(pathMod.join(d, "manifest.json"), "utf-8")).id as string;
    all.push(...auditExpert(d, id));
  }

  for (const b of auditAllExpertsBatchActionsSchema(expertsRoot)) {
    if (exclude.has(b.expertId)) continue;
    all.push({
      expert: b.rel,
      kind: "batch-actions-schema",
      detail: `${b.plugin} ← ${b.srcNode}.${b.pathKey}: ${b.problem}`,
    });
  }

  for (const t of auditAllExpertsKbOutputTypes(expertsRoot)) {
    const id = (() => {
      try {
        return JSON.parse(fs.readFileSync(`${t.expert}/manifest.json`, "utf-8")).id as string;
      } catch {
        return "";
      }
    })();
    if (exclude.has(id)) continue;
    all.push({
      expert: t.rel,
      kind: "kb-output-type",
      detail: `${t.node}.${t.key}: ${t.hint}`,
    });
  }

  for (const t of auditAllExpertsNodeOutputTypes(expertsRoot)) {
    const id = (() => {
      try {
        return JSON.parse(fs.readFileSync(`${t.expert}/manifest.json`, "utf-8")).id as string;
      } catch {
        return "";
      }
    })();
    if (exclude.has(id)) continue;
    all.push({
      expert: t.rel,
      kind: "node-output-type",
      detail: `${t.node}.${t.key}: ${t.hint}`,
    });
  }

  const byKind = new Map<string, Issue[]>();
  for (const i of all) {
    const list = byKind.get(i.kind) ?? [];
    list.push(i);
    byKind.set(i.kind, list);
  }

  console.log(`审计 ${dirs.length} 个专家（排除: ${[...exclude].join(", ") || "无"}）\n`);

  if (all.length === 0) {
    console.log("未发现类似 inbound-order-status 的问题。");
    return;
  }

  for (const [kind, list] of [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n## ${kind} (${list.length})`);
    for (const i of list) {
      console.log(`  - ${i.expert}: ${i.detail}`);
    }
  }

  const critical = all.filter((i) =>
    [
      "yaml-import",
      "bundle-fail",
      "illegal-import",
      "bundle-import-left",
      "yaml-actions-schema",
      "batch-actions-schema",
      "kb-output-type",
      "node-output-type",
    ].includes(i.kind)
  );
  if (critical.length > 0) process.exit(1);
}

main();
