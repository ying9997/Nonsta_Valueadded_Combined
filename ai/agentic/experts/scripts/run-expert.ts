/**
 * 通用 Runner：读取 workflow.json，按序执行节点
 * 支持 Coze 代码节点（spawn ts-node）与 LLM 节点（Mock）
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as pathMod from "path";
import YAML from "yaml";
import { runLlmNode } from "./llm-openai";
import { normalizeExpertInvokeParams } from "./expert-invoke-params";
import { unwrapLlmEnvelope } from "../shared/unwrap-llm-envelope";

interface WorkflowNode {
  id: string;
  type?: string;
  file?: string;
  promptFile?: string;
  inputs: string[];
  outputs: string[];
}

interface WorkflowConfig {
  nodes: WorkflowNode[];
}

interface CozeTextNodeSpec {
  logicalId?: string;
  sourceFile?: string;
}

interface CozeInputBinding {
  ref?: string;
  path?: string;
}

interface CozeConfig {
  textNodes?: CozeTextNodeSpec[];
  inputBindings?: Record<string, Record<string, CozeInputBinding>>;
}

interface RunOptions {
  expertDir: string;
  initialParams: Record<string, unknown>;
  /** 自定义 LLM 实现；未提供且 OPENAI_API_KEY 已配置时使用 OpenAI */
  llmHandler?: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * 查找专家目录（通过 manifest.json 的 id）
 */
function findExpertDir(projectRoot: string, expertId: string): string | null {
  const expertsDir = pathMod.join(projectRoot, "experts");
  if (!fs.existsSync(expertsDir)) return null;

  const dirs = fs.readdirSync(expertsDir);
  for (const domain of dirs) {
    const domainPath = pathMod.join(expertsDir, domain);
    if (!fs.statSync(domainPath).isDirectory()) continue;
    const experts = fs.readdirSync(domainPath);
    for (const id of experts) {
      if (id.startsWith("_")) continue;
      const manifestPath = pathMod.join(domainPath, id, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
          if (manifest.id === expertId) {
            return pathMod.join(domainPath, id);
          }
        } catch {
          // ignore
        }
      }
    }
  }
  return null;
}

/**
 * 执行单个代码节点（spawn ts-node）
 */
async function runCodeNode(
  expertDir: string,
  node: WorkflowNode,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const nodeFilePath = pathMod.join(expertDir, node.file!);
  if (!fs.existsSync(nodeFilePath)) {
    throw new Error(`Node file not found: ${nodeFilePath}`);
  }

  const projectRoot = process.cwd();
  const absoluteNodePath = pathMod.resolve(expertDir, node.file!);

  const tsNodeRegister = pathMod.join(projectRoot, "node_modules", "ts-node", "register");
  const nodeExec = process.execPath;
  const childEnv = {
    ...process.env,
    TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: "CommonJS", moduleResolution: "node" }),
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(nodeExec, ["-r", tsNodeRegister, absoluteNodePath, JSON.stringify(params)], {
      cwd: projectRoot,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Node ${node.id} exited with code ${code}\n${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        reject(new Error(`Node ${node.id} invalid JSON output:\n${stdout}`));
      }
    });

    proc.on("error", reject);
  });
}

/**
 * 默认 LLM Mock：返回预设的 analysisResult（当未配置 OpenAI 时使用）
 */
function defaultLlmMock(expertDir: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const expertId = pathMod.basename(expertDir);
  if (expertId === "substitute-claim") {
    const facts = params.compensateListFacts;
    const factsObj =
      facts !== undefined && facts !== null && typeof facts === "object" && !Array.isArray(facts)
        ? (facts as Record<string, unknown>)
        : {};
    const listStatus = typeof factsObj.listStatus === "string" ? factsObj.listStatus : "unknown";
    const qk = factsObj.queryKeys;
    const queryKeys =
      qk !== undefined && qk !== null && typeof qk === "object" && !Array.isArray(qk)
        ? (qk as Record<string, unknown>)
        : {};
    return Promise.resolve({
      analysisResult: {
        structured: {
          queryKeys: {
            trackingIds: Array.isArray(queryKeys.trackingIds) ? queryKeys.trackingIds : [],
            outboundOrderNos: Array.isArray(queryKeys.outboundOrderNos) ? queryKeys.outboundOrderNos : [],
            claimIds: Array.isArray(queryKeys.claimIds) ? queryKeys.claimIds : [],
          },
          records: Array.isArray(factsObj.records) ? factsObj.records : [],
          statusSummary: { listStatus, mock: true },
          nextAction: "请配置 OPENAI_API_KEY 以使用真实 LLM 生成对客话术",
          missingFacts: [],
        },
        analysis: `[本地调试] LLM 节点 Mock（substitute-claim）。列表状态：${listStatus}。请设置 OPENAI_API_KEY 使用真实 LLM。`,
      },
    });
  }
  if (expertId === "tracking-inquiry") {
    const facts = params.tailTraceFacts;
    const factsObj =
      facts !== undefined && facts !== null && typeof facts === "object" && !Array.isArray(facts)
        ? (facts as Record<string, unknown>)
        : {};
    const listStatus = typeof factsObj.listStatus === "string" ? factsObj.listStatus : "unknown";
    const qk = factsObj.queryKeys;
    const queryKeys =
      qk !== undefined && qk !== null && typeof qk === "object" && !Array.isArray(qk)
        ? (qk as Record<string, unknown>)
        : {};
    return Promise.resolve({
      analysisResult: {
        structured: {
          queryKeys: {
            inquiryIds: Array.isArray(queryKeys.inquiryIds) ? queryKeys.inquiryIds : [],
            trackingIds: Array.isArray(queryKeys.trackingIds) ? queryKeys.trackingIds : [],
            outboundOrderNos: Array.isArray(queryKeys.outboundOrderNos) ? queryKeys.outboundOrderNos : [],
          },
          submissionGuidanceUrl: factsObj.submissionGuidanceUrl,
          sopBranch: factsObj.sopBranch,
          records: Array.isArray(factsObj.records) ? factsObj.records : [],
          statusSummary: { listStatus, mock: true },
          nextAction: "请配置 OPENAI_API_KEY 以使用真实 LLM 生成对客话术",
          missingFacts: [],
        },
        analysis: `[本地调试] LLM 节点 Mock（tracking-inquiry）。列表状态：${listStatus}。请设置 OPENAI_API_KEY 使用真实 LLM。`,
      },
    });
  }
  if (expertId === "supplier-tracking") {
    return Promise.resolve({
      analysisResult: {
        structured: {
          fetchStatus: "fallback_links",
          branch: "has_portals",
          country: String(params.country ?? ""),
          matchedProductKey: "",
          trackingPortalUrls: [],
          selfServiceSteps: "",
          suggestedNextExperts: ["delivery-status"],
          missingFacts: [],
          events: [],
        },
        analysis:
          "[本地调试] supplier-tracking Mock：未配置 OPENAI_API_KEY。本专家仅基于 KB 输出官方物流查询网址与步骤；轨迹解读请使用 delivery-status 或系统侧轨迹能力。",
      },
    });
  }
  return Promise.resolve({
    analysisResult: {
      structured: {
        outboundOrderNos: [],
        status: "MOCK",
        statusName: "Mock 状态",
        isTruncated: false,
      },
      analysis: "[本地调试] LLM 节点 Mock：请设置 OPENAI_API_KEY 使用真实 LLM",
    },
  });
}

/**
 * 获取 LLM 处理器：优先 OpenAI（若已配置），否则 Mock
 */
function getLlmHandler(expertDir: string, options: RunOptions): (params: Record<string, unknown>) => Promise<Record<string, unknown>> {
  if (options.llmHandler) return options.llmHandler;
  return (params) => defaultLlmMock(expertDir, params);
}

function readUtf8NormalizedLf(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
}

function loadLocalCozeTextBindings(expertDir: string): Map<string, Map<string, unknown>> {
  const configPath = pathMod.join(expertDir, "coze.config.yml");
  if (!fs.existsSync(configPath)) return new Map();

  const config = (YAML.parse(fs.readFileSync(configPath, "utf-8")) ?? {}) as CozeConfig;
  const textOutputs = new Map<string, string>();
  for (const textNode of config.textNodes ?? []) {
    const logicalId = String(textNode.logicalId || "").trim();
    const sourceFile = String(textNode.sourceFile || "").trim();
    if (!logicalId || !sourceFile) continue;
    const textPath = pathMod.join(expertDir, sourceFile);
    if (!fs.existsSync(textPath)) continue;
    textOutputs.set(logicalId, readUtf8NormalizedLf(textPath));
  }

  const nodeBindings = new Map<string, Map<string, unknown>>();
  for (const [nodeId, bindings] of Object.entries(config.inputBindings ?? {})) {
    for (const [inputName, binding] of Object.entries(bindings ?? {})) {
      const ref = String(binding.ref || "").trim();
      const path = String(binding.path || "").trim();
      if (path !== "output" || !textOutputs.has(ref)) continue;
      if (!nodeBindings.has(nodeId)) nodeBindings.set(nodeId, new Map());
      nodeBindings.get(nodeId)!.set(inputName, textOutputs.get(ref));
    }
  }

  return nodeBindings;
}

/**
 * 运行专家工作流，可选在指定节点后停止（用于测试中间态）
 */
async function runExpertUntil(
  options: RunOptions,
  stopAfterNodeId?: string
): Promise<Record<string, unknown>> {
  const { expertDir, initialParams } = options;
  const llmHandler = getLlmHandler(expertDir, options);

  const workflowPath = pathMod.join(expertDir, "workflow.json");
  if (!fs.existsSync(workflowPath)) {
    throw new Error(`workflow.json not found: ${workflowPath}`);
  }

  const workflow: WorkflowConfig = JSON.parse(fs.readFileSync(workflowPath, "utf-8"));
  let context: Record<string, unknown> = normalizeExpertInvokeParams(initialParams);
  const localCozeTextBindings = loadLocalCozeTextBindings(expertDir);

  for (const node of workflow.nodes) {
    if (
      node.type === "llm" &&
      node.inputs.includes("examplesMd") &&
      !("examplesMd" in context)
    ) {
      const examplesPath = pathMod.join(expertDir, "prompts", "examples.md");
      if (fs.existsSync(examplesPath)) {
        context.examplesMd = fs.readFileSync(examplesPath, "utf-8");
      }
    }

    const params: Record<string, unknown> = {};
    for (const key of node.inputs) {
      if (key in context) {
        params[key] = context[key];
      }
    }
    const textBindings = localCozeTextBindings.get(node.id);
    if (textBindings) {
      for (const [key, value] of textBindings.entries()) {
        if (node.inputs.includes(key) && !(key in params)) {
          params[key] = value;
        }
      }
    }

    let output: Record<string, unknown>;
    if (node.type === "llm") {
      output = options.llmHandler
        ? await llmHandler(params)
        : process.env.OPENAI_API_KEY
          ? await runLlmNode(expertDir, params, {
              promptFile: node.promptFile,
              outputKey: node.outputs[0],
            })
          : await llmHandler(params);
      if (
        node.outputs.length === 1 &&
        !(node.outputs[0]! in output) &&
        output.analysisResult !== undefined
      ) {
        output[node.outputs[0]!] = output.analysisResult;
      }
      for (const outputKey of node.outputs) {
        if (outputKey in output && output[outputKey] != null) {
          const p = unwrapLlmEnvelope(output[outputKey], outputKey);
          output[outputKey] = { structured: p.structured, analysis: p.analysis };
        }
      }
    } else {
      output = await runCodeNode(expertDir, node, params);
    }

    for (const key of node.outputs) {
      if (key in output) {
        context[key] = output[key];
      }
    }

    if (stopAfterNodeId && node.id === stopAfterNodeId) break;
  }

  return context;
}

/**
 * 运行专家工作流
 */
async function runExpert(options: RunOptions): Promise<Record<string, unknown>> {
  return runExpertUntil(options);
}

export { findExpertDir, runExpert, runExpertUntil };
