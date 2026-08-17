/**
 * 批处理插件上游 list schema 审计：Coze 依赖 item.action / item.data，
 * 上游 node_outputs 的 list.items 须显式含 action、data properties。
 */

import * as fs from "fs";
import * as pathMod from "path";
import YAML from "yaml";
import { loadCozeExportConfig } from "./config";

export type BatchActionsAuditIssue = {
  expertId: string;
  rel: string;
  plugin: string;
  srcNode: string;
  pathKey: string;
  problem: string;
  nonStandard: boolean;
};

const STANDARD_BATCH_ACTION_KEYS = new Set(["actions", "trackingActions"]);

function loadYaml(p: string): Record<string, unknown> | null {
  if (!fs.existsSync(p)) return null;
  return YAML.parse(fs.readFileSync(p, "utf-8")) as Record<string, unknown>;
}

function hasActionDataProps(
  slot: { type?: string; items?: { properties?: Record<string, unknown> } } | undefined
): boolean | null {
  if (!slot) return null;
  if (slot.type !== "list") return false;
  const props = slot.items?.properties;
  return !!(props?.action && props?.data);
}

/** 从 coze.config 收集所有 pluginBatch.actionsFrom.path（含标准名） */
export function collectConfiguredBatchActionPaths(expertDir: string, manifestId: string): string[] {
  const cfgPath = ["coze.config.yml", "coze.config.yaml"]
    .map((f) => pathMod.join(expertDir, f))
    .find(fs.existsSync);
  if (!cfgPath) return [...STANDARD_BATCH_ACTION_KEYS];

  const cfg = loadCozeExportConfig(expertDir, manifestId);
  const plugins = cfg.winitOpenapiPlugins ?? (cfg.winitOpenapiPlugin ? [cfg.winitOpenapiPlugin] : []);
  const paths = new Set<string>(STANDARD_BATCH_ACTION_KEYS);
  for (const p of plugins) {
    if (p?.pluginBatch?.enabled) {
      paths.add(p.pluginBatch.actionsFrom.path?.trim() || "actions");
    }
  }
  return [...paths];
}

export function auditExpertBatchActionsSchema(
  expertDir: string,
  expertsRoot: string
): BatchActionsAuditIssue[] {
  const issues: BatchActionsAuditIssue[] = [];
  const cfgPath = ["coze.config.yml", "coze.config.yaml"]
    .map((f) => pathMod.join(expertDir, f))
    .find(fs.existsSync);
  if (!cfgPath) return issues;

  const manifestPath = pathMod.join(expertDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return issues;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as { id: string };
  const cfg = loadCozeExportConfig(expertDir, manifest.id);
  const plugins =
    cfg.winitOpenapiPlugins ?? (cfg.winitOpenapiPlugin ? [cfg.winitOpenapiPlugin] : []);
  const batchPlugins = plugins.filter((p) => p?.pluginBatch?.enabled);
  if (batchPlugins.length === 0) return issues;

  const rel = pathMod.relative(expertsRoot, expertDir).replace(/\\/g, "/");
  const expertId = manifest.id;
  const basename = String(cfg.yamlBasename ?? `${expertId}-draft.yaml`);
  const draftPath = pathMod.join(expertDir, "workflow", "workflow", basename);
  const draft = loadYaml(draftPath);

  if (!draft) {
    issues.push({
      expertId,
      rel,
      plugin: "(all)",
      srcNode: "",
      pathKey: "",
      problem: "有 pluginBatch 但缺少 draft YAML（请先 export:coze）",
      nonStandard: false,
    });
    return issues;
  }

  const nodes =
    (draft.nodes as Array<{ type?: string; title?: string; parameters?: Record<string, unknown> }>) ??
    [];
  const codeNodes = new Map(nodes.filter((n) => n.type === "code").map((n) => [n.title, n]));

  for (const bp of batchPlugins) {
    const af = bp.pluginBatch!.actionsFrom;
    const pathKey = (af.path ?? "actions").trim();
    const srcTitle = af.logicalId ?? "";
    const pluginTitle = bp.logicalId ?? "?";

    const srcNode = codeNodes.get(srcTitle);
    if (!srcNode) {
      issues.push({
        expertId,
        rel,
        plugin: pluginTitle,
        srcNode: srcTitle,
        pathKey,
        problem: "draft 中找不到上游 code 节点",
        nonStandard: !STANDARD_BATCH_ACTION_KEYS.has(pathKey),
      });
      continue;
    }

    const outputs = (srcNode.parameters?.node_outputs ?? {}) as Record<
      string,
      { type?: string; items?: { properties?: Record<string, unknown> } }
    >;
    const slot = outputs[pathKey];
    if (!slot) {
      issues.push({
        expertId,
        rel,
        plugin: pluginTitle,
        srcNode: srcTitle,
        pathKey,
        problem: "node_outputs 缺少该字段",
        nonStandard: !STANDARD_BATCH_ACTION_KEYS.has(pathKey),
      });
      continue;
    }

    const ok = hasActionDataProps(slot);
    if (ok !== true) {
      const problem =
        ok === false && slot.type !== "list"
          ? `字段 type=${slot.type ?? "?"}，非 list（批处理无法拉线）`
          : "list.items 缺 action/data properties（Coze 会报 item.action/item.data 不存在）";
      issues.push({
        expertId,
        rel,
        plugin: pluginTitle,
        srcNode: srcTitle,
        pathKey,
        problem,
        nonStandard: !STANDARD_BATCH_ACTION_KEYS.has(pathKey),
      });
    }
  }

  return issues;
}

export function auditAllExpertsBatchActionsSchema(expertsRoot: string): BatchActionsAuditIssue[] {
  const issues: BatchActionsAuditIssue[] = [];
  for (const expertDir of discoverExpertDirs(expertsRoot)) {
    issues.push(...auditExpertBatchActionsSchema(expertDir, expertsRoot));
  }
  return issues;
}

function discoverExpertDirs(root: string): string[] {
  const leaves: string[] = [];
  if (!fs.existsSync(root)) return leaves;
  for (const domain of fs.readdirSync(root, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    const dp = pathMod.join(root, domain.name);
    if (domain.name === "_template") {
      for (const sub of fs.readdirSync(dp, { withFileTypes: true })) {
        if (sub.isDirectory()) leaves.push(pathMod.join(dp, sub.name));
      }
      continue;
    }
    for (const sub of fs.readdirSync(dp, { withFileTypes: true })) {
      if (sub.isDirectory()) leaves.push(pathMod.join(dp, sub.name));
    }
  }
  return leaves.filter(
    (d) =>
      fs.existsSync(pathMod.join(d, "manifest.json")) &&
      fs.existsSync(pathMod.join(d, "workflow.json"))
  );
}
