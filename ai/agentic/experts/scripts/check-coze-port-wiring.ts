/**
 * 校验 workflow.json / coze.config inputBindings：
 * - 代码/LLM 节点每个 input 须能在上游找到同名 node_outputs 键，或显式 inputBindings
 * - ref: __start__ 的 path 须在 manifest.inputSchema 或框架顶层字段中存在
 *   （含 inputs.<业务字段>，Coze start 节点仅展开 manifest 声明的子键）
 *
 * 用法：npx ts-node -P scripts/tsconfig.json scripts/check-coze-port-wiring.ts [--strict]
 */
import fs from "fs";
import path from "path";
import yaml from "yaml";
import type { WorkflowJson, WorkflowJsonNode } from "./coze-export/types";

const FRAMEWORK_START_KEYS = new Set([
  "query",
  "customerIntent",
  "customerCode",
  "customerName",
  "username",
  "language",
  "inputContext",
  "inputs",
  "data",
]);

function findExpertDirs(repo: string): string[] {
  const expertsDir = path.join(repo, "experts");
  const out: string[] = [];
  for (const domain of fs.readdirSync(expertsDir)) {
    const domainPath = path.join(expertsDir, domain);
    if (!fs.statSync(domainPath).isDirectory()) continue;
    for (const id of fs.readdirSync(domainPath)) {
      const expertPath = path.join(domainPath, id);
      if (fs.existsSync(path.join(expertPath, "workflow.json"))) out.push(expertPath);
    }
  }
  return out.sort();
}

function declaredOutputs(node: WorkflowJsonNode): Set<string> {
  return new Set(node.outputs ?? []);
}

function loadManifestBusinessKeys(expertDir: string): Set<string> {
  const p = path.join(expertDir, "manifest.json");
  if (!fs.existsSync(p)) return new Set();
  const manifest = JSON.parse(fs.readFileSync(p, "utf-8")) as {
    inputSchema?: { properties?: Record<string, unknown> };
  };
  return new Set(Object.keys(manifest.inputSchema?.properties ?? {}));
}

/** Coze start 拉线 path 是否合法；非法时返回错误说明 */
function validateStartBindingPath(pathKey: string, businessKeys: Set<string>): string | null {
  if (FRAMEWORK_START_KEYS.has(pathKey)) return null;
  if (pathKey.startsWith("inputs.")) {
    const sub = pathKey.slice("inputs.".length);
    if (!sub || sub.includes(".")) {
      return `__start__ path "${pathKey}" 非法（仅支持 inputs.<业务字段> 单层）`;
    }
    if (!businessKeys.has(sub)) {
      const listed = [...businessKeys].sort().join(", ") || "(无)";
      return `__start__ path "${pathKey}" 不在 manifest.inputSchema.properties [${listed}]`;
    }
    return null;
  }
  return `__start__ path "${pathKey}" 未在 manifest 业务入参或框架顶层字段中`;
}

function loadStartKeys(expertDir: string): Set<string> {
  const businessKeys = loadManifestBusinessKeys(expertDir);
  const keys = new Set<string>(businessKeys);
  for (const k of businessKeys) keys.add(`inputs.${k}`);
  for (const k of FRAMEWORK_START_KEYS) keys.add(k);
  return keys;
}

function virtualNodeIds(config: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  for (const t of (config.textNodes as Array<{ logicalId: string }> | undefined) ?? []) {
    if (t.logicalId) ids.add(t.logicalId);
  }
  const plugins = (config.winitOpenapiPlugins as Array<{ logicalId?: string }> | undefined) ?? [];
  const single = config.winitOpenapiPlugin as { logicalId?: string; enabled?: boolean } | undefined;
  if (single?.enabled !== false && single?.logicalId) ids.add(single.logicalId.trim() || "winit_openapi_plugin");
  for (const p of plugins) {
    if (p.logicalId) ids.add(p.logicalId);
  }
  return ids;
}

export function checkExpertCozePortWiring(expertDir: string): string[] {
  const wf = JSON.parse(
    fs.readFileSync(path.join(expertDir, "workflow.json"), "utf-8")
  ) as WorkflowJson;
  const configPath = path.join(expertDir, "coze.config.yml");
  const config = fs.existsSync(configPath)
    ? ((yaml.parse(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>) ?? {})
    : {};
  const bindings = (config.inputBindings as Record<string, Record<string, { ref: string; path: string }>>) ?? {};
  const businessKeys = loadManifestBusinessKeys(expertDir);
  const startKeys = loadStartKeys(expertDir);

  const byId = new Map(wf.nodes.map((n) => [n.id, n]));
  const virtualIds = virtualNodeIds(config);
  const errs: string[] = [];

  /** 所有 inputBindings 中 ref: __start__ 的 path 须可在 Coze 开始节点解析 */
  for (const [nodeId, nodeBindings] of Object.entries(bindings)) {
    for (const [inputName, binding] of Object.entries(nodeBindings ?? {})) {
      if (binding.ref !== "__start__") continue;
      const msg = validateStartBindingPath(binding.path, businessKeys);
      if (msg) errs.push(`${nodeId}.${inputName}: ${msg}`);
    }
  }

  const producers = new Map<string, string>();
  for (const key of startKeys) producers.set(key, "__start__");

  /** format-output / resolve-analysis-result 额外做完整上下游键校验 */
  const strictNodes = new Set(
    wf.nodes.filter((n) => n.id === "format-output" || n.id === "resolve-analysis-result").map((n) => n.id)
  );

  for (const node of wf.nodes) {
    const strict = strictNodes.has(node.id);
    for (const inputName of node.inputs ?? []) {
      const binding = bindings[node.id]?.[inputName];
      if (binding) {
        if (binding.ref === "__start__") {
          continue;
        }
        if (virtualIds.has(binding.ref)) continue;
        const src = byId.get(binding.ref);
        if (!src) {
          if (strict) errs.push(`${node.id}.${inputName}: inputBindings ref "${binding.ref}" 不存在`);
        } else if (!declaredOutputs(src).has(binding.path)) {
          if (strict) {
            errs.push(
              `${node.id}.${inputName}: binding path "${binding.path}" 不在上游 ${binding.ref}.outputs [${[...declaredOutputs(src)].join(", ")}]`
            );
          }
        }
        continue;
      }
      const producerId = producers.get(inputName);
      if (!producerId) {
        if (strict) {
          errs.push(`${node.id}.${inputName}: 无上游 node_outputs 同名键，请补 inputBindings`);
        }
        continue;
      }
      if (producerId !== "__start__") {
        const src = byId.get(producerId);
        if (src && !declaredOutputs(src).has(inputName)) {
          if (strict) {
            errs.push(
              `${node.id}.${inputName}: 上游 ${producerId} 未在 outputs 显式声明 "${inputName}"`
            );
          }
        }
      }
    }
    for (const out of node.outputs ?? []) producers.set(out, node.id);
  }
  return errs;
}

function main() {
  const strict = process.argv.includes("--strict");
  const repo = path.resolve(__dirname, "..");
  let failed = 0;
  for (const dir of findExpertDirs(repo)) {
    const rel = path.relative(repo, dir);
    const errs = checkExpertCozePortWiring(dir);
    if (errs.length) {
      failed++;
      console.error(`FAIL ${rel}`);
      for (const e of errs) console.error(`  - ${e}`);
    } else if (strict) {
      console.log(`OK   ${rel}`);
    }
  }
  if (failed) {
    console.error(`\n${failed} expert(s) failed coze port wiring check`);
    process.exit(1);
  }
  console.log("All experts pass coze port wiring check.");
}

if (require.main === module) {
  main();
}
