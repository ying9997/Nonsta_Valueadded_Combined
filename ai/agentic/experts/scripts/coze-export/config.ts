import * as fs from "fs";
import * as pathMod from "path";
import { createHash } from "crypto";
import YAML from "yaml";
import type {
  CozeExportConfig,
  WinitOpenapiPluginBatchConfig,
  WinitOpenapiPluginConfig,
} from "./types";

type ParsedCozeYaml = Partial<CozeExportConfig> & Record<string, unknown>;

const CONFIG_FILENAMES = ["coze.config.yml", "coze.config.yaml"];

export function loadCozeExportConfig(expertDir: string, manifestId: string): CozeExportConfig {
  let fileContent: string | null = null;
  for (const name of CONFIG_FILENAMES) {
    const p = pathMod.join(expertDir, name);
    if (fs.existsSync(p)) {
      fileContent = fs.readFileSync(p, "utf-8");
      break;
    }
  }

  const parsed =
    fileContent !== null
      ? (YAML.parse(fileContent) as Partial<CozeExportConfig>)
      : {};

  const workflowId = String(
    parsed.workflowId !== undefined && parsed.workflowId !== null
      ? parsed.workflowId
      : stableWorkflowIdFromExpertId(manifestId)
  );

  const defaultSlug = slugifyExpertIdForCoze(manifestId);
  const yamlBasename = normalizeYamlBasename(
    parsed.yamlBasename ?? `${defaultSlug}-draft.yaml`
  );
  const packageMainName = normalizeCozeWorkflowName(
    parsed.packageMainName ?? defaultSlug
  );

  const winitOpenapiPlugins = normalizeWinitOpenapiPluginsList(parsed);

  return {
    workflowId,
    yamlBasename,
    packageMainName,
    packageDescription: parsed.packageDescription,
    icon: parsed.icon ?? "plugin_icon/workflow.png",
    nodeIds: parsed.nodeIds,
    branching: parsed.branching,
    textNodes: parsed.textNodes ?? [],
    inputBindings: parsed.inputBindings,
    endOutputs: parsed.endOutputs,
    codeNode: parsed.codeNode,
    llmNode: parsed.llmNode,
    positions: parsed.positions,
    /** 与 `winitOpenapiPlugins[0]` 一致，供仍读单对象逻辑的代码使用 */
    winitOpenapiPlugin: winitOpenapiPlugins[0],
    winitOpenapiPlugins,
    omitCodeNodeInputs: parsed.omitCodeNodeInputs,
    branchOnlyNodeIds: parsed.branchOnlyNodeIds,
  };
}

function normalizeRequestDataFrom(
  raw: unknown
): { logicalId: string; path?: string } | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as { logicalId?: string; path?: string };
  const logicalId = typeof o.logicalId === "string" ? o.logicalId.trim() : "";
  if (!logicalId) return undefined;
  const p = o.path;
  return {
    logicalId,
    path: typeof p === "string" && p.trim() !== "" ? p.trim() : undefined,
  };
}

function normalizePluginBatch(raw: unknown): WinitOpenapiPluginBatchConfig | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (o.enabled !== true) return undefined;
  const actionsFrom = normalizeRequestDataFrom(o.actionsFrom);
  if (!actionsFrom?.logicalId) {
    throw new Error(
      "coze.config.yml: pluginBatch.enabled 为 true 时必须设置 pluginBatch.actionsFrom.logicalId"
    );
  }
  const batchSize =
    typeof o.batchSize === "number" && Number.isFinite(o.batchSize) && o.batchSize >= 1
      ? Math.floor(o.batchSize)
      : 100;
  const concurrentSize =
    typeof o.concurrentSize === "number" &&
    Number.isFinite(o.concurrentSize) &&
    o.concurrentSize >= 1
      ? Math.floor(o.concurrentSize)
      : 10;
  return {
    enabled: true,
    batchSize,
    concurrentSize,
    actionsFrom: {
      logicalId: actionsFrom.logicalId,
      path: actionsFrom.path?.trim() || "actions",
    },
  };
}

function normalizeWinitOpenapiPlugin(
  raw: Partial<WinitOpenapiPluginConfig> | undefined | null
): WinitOpenapiPluginConfig | undefined {
  if (raw == null || typeof raw !== "object" || raw.enabled === false) return undefined;
  const insertBefore = typeof raw.insertBefore === "string" ? raw.insertBefore.trim() : "";
  if (!insertBefore) {
    throw new Error(
      "coze.config.yml: 万邑通插件项必须设置 insertBefore（workflow 节点 id）；若使用 winitOpenapiPlugin 单块，须 enabled 且非 false"
    );
  }
  const openapiAction =
    typeof raw.openapiAction === "string" && raw.openapiAction.trim() !== ""
      ? raw.openapiAction.trim()
      : undefined;
  let requestActionFrom: { logicalId: string; path?: string } | undefined;
  if (raw.requestActionFrom != null && typeof raw.requestActionFrom === "object") {
    const logicalId =
      typeof (raw.requestActionFrom as { logicalId?: string }).logicalId === "string"
        ? (raw.requestActionFrom as { logicalId: string }).logicalId.trim()
        : "";
    if (logicalId) {
      const p = (raw.requestActionFrom as { path?: string }).path;
      requestActionFrom = {
        logicalId,
        path: typeof p === "string" && p.trim() !== "" ? p.trim() : undefined,
      };
    }
  }
  const pluginBatch = normalizePluginBatch(raw.pluginBatch);
  return {
    enabled: true,
    insertBefore,
    logicalId: typeof raw.logicalId === "string" ? raw.logicalId.trim() : undefined,
    fetchSkuBindings: raw.fetchSkuBindings,
    pluginBatch,
    openapiAction,
    requestActionFrom,
    requestDataFrom: normalizeRequestDataFrom(raw.requestDataFrom),
  };
}

/**
 * 合并 YAML 中 `winitOpenapiPlugins` 数组与 legacy `winitOpenapiPlugin`；
 * 若数组非空则仅用数组项，否则用单对象。
 */
function normalizeWinitOpenapiPluginsList(parsed: ParsedCozeYaml): WinitOpenapiPluginConfig[] {
  const fromArray = parsed.winitOpenapiPlugins;
  const list: WinitOpenapiPluginConfig[] = [];
  if (Array.isArray(fromArray) && fromArray.length > 0) {
    for (let i = 0; i < fromArray.length; i++) {
      const n = normalizeWinitOpenapiPlugin(fromArray[i] as Partial<WinitOpenapiPluginConfig>);
      if (n) list.push(n);
    }
  } else {
    const n = normalizeWinitOpenapiPlugin(parsed.winitOpenapiPlugin);
    if (n) list.push(n);
  }
  const keys = list.map((p) => p.logicalId?.trim() || "winit_openapi_plugin");
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k)) {
      throw new Error(
        `coze.config.yml: 多个万邑通插件不得共用同一 logicalId（冲突: "${k}"）；请为每项设置唯一 logicalId`
      );
    }
    seen.add(k);
  }
  return list;
}

/**
 * Coze：`packageMainName` 与 draft 文件名中的 **slug 段**（`-draft` 之前的部分）**不得含 `-`**，须为 `_`。
 * 加载配置时会自动把 slug 里的 `-` 转为 `_`。
 */
export function normalizeCozeWorkflowName(s: string): string {
  const t = s
    .replace(/-/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return t || "workflow";
}

/**
 * draft 文件名：slug 段仅 `_`，与字面量 `draft` 之间**必须用单个 `-` 连接**，如 `e_template-draft.yaml`。
 * 支持配置写成 `xxx_draft.yaml` 或 `xxx-draft.yaml`，均规范为 `normalize(slug)-draft.ext`。
 */
export function normalizeYamlBasename(filename: string): string {
  const i = filename.lastIndexOf(".");
  const ext = i > 0 ? filename.slice(i) : "";
  const base = i > 0 ? filename.slice(0, i) : filename;
  const draftSuffix = /^(.*?)[_-]draft$/i.exec(base);
  if (draftSuffix) {
    const slug = normalizeCozeWorkflowName(draftSuffix[1] ?? "");
    return `${slug || "workflow"}-draft${ext}`;
  }
  if (i <= 0) return normalizeCozeWorkflowName(filename);
  return `${normalizeCozeWorkflowName(base)}${ext}`;
}

/** 由专家 manifest `id` 生成默认 Coze 包名片段（仅字母数字与 `_`） */
function slugifyExpertIdForCoze(manifestId: string): string {
  return normalizeCozeWorkflowName(manifestId.replace(/[^a-zA-Z0-9]+/g, "_"));
}

function stableWorkflowIdFromExpertId(expertId: string): string {
  const h = createHash("sha256").update(`coze|${expertId}`).digest();
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(h[i]!);
  const mod = 10n ** 18n;
  const id = 7n * 10n ** 18n + (n % mod);
  return id.toString();
}
