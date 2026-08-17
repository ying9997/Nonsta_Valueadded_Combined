import * as fs from "fs";
import * as pathMod from "path";
import YAML from "yaml";
import { COZE_ICONS, WORKFLOW_PACKAGE_ICON } from "./icons";
import { defaultLlmParamList, mergeSystemPromptIntoLlmParams } from "./defaults";
import {
  expertStartNodeOutputs,
  defaultEndOutputsFromManifest,
  codeNodeOutputsForNode,
  collectBatchActionOutputKeys,
  collectInvalidCozeSchemaPropertyPaths,
  cozePropertyToNodeOutput,
  cozeInputWireShape,
} from "./manifest-io";
import {
  buildChain,
  buildEdges,
  chainLogicalKey,
  assignCozeNodeIds,
  lastWorkflowNode,
  winitPluginLogicalKey,
} from "./graph";
import {
  buildWinitOpenapiBatchPluginNode,
  buildWinitOpenapiPluginNode,
  DEFAULT_WINIT_OPENAPI_ACTION_INVENTORY_LIST,
  type BuildWinitOpenapiPluginNodeOptions,
} from "./winit-openapi-plugin-shared";
import type {
  BranchingSpec,
  CozeExportConfig,
  JsonSchemaProperty,
  ManifestJson,
  WorkflowJson,
  WorkflowJsonNode,
} from "./types";
import { loadCozeExportConfig, normalizeCozeWorkflowName } from "./config";
import { bundleCozeNodeCodeForExport, findRepoRoot } from "./bundle-coze-node-code";

/** 统一换行，避免 Windows CRLF 进入 YAML 后变成双引号转义块，导致 COZE 解析失败 */
function readUtf8NormalizedLf(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
}

function readCozeCodeNodeBody(expertDir: string, nodeFileAbs: string): string {
  const repoRoot = findRepoRoot(expertDir);
  return bundleCozeNodeCodeForExport(nodeFileAbs, repoRoot);
}

interface Producer {
  logicalKey: string;
  cozeId: string;
  /** Coze 引用开始节点的 path；缺省等于 producer 的 key（input 名） */
  pathFromStart?: string;
}

function expertStartProducerEntries(manifest: ManifestJson): Array<{ name: string; path: string }> {
  const business = Object.keys(manifest.inputSchema?.properties ?? {});
  const top = [
    "query",
    "customerIntent",
    "inputContext",
    "inputs",
    "customerCode",
    "customerName",
    "username",
    "language",
  ] as const;
  return [
    ...top.map((name) => ({ name, path: name })),
    ...business.map((name) => ({ name, path: `inputs.${name}` })),
  ];
}

function buildStartProducerEntries(manifest: ManifestJson): Array<{ name: string; path: string }> {
  return expertStartProducerEntries(manifest);
}

/** 专家内嵌插件：`data` 从代码节点产出，不从开始节点传入。 */
function resolveWinitPluginRequestDataSource(
  workflow: WorkflowJson,
  wp: NonNullable<CozeExportConfig["winitOpenapiPlugin"]>
): { logicalId: string; path: string } {
  if (wp.requestDataFrom?.logicalId?.trim()) {
    return {
      logicalId: wp.requestDataFrom.logicalId.trim(),
      path: wp.requestDataFrom.path?.trim() || "winitRequestData",
    };
  }
  const idx = workflow.nodes.findIndex((n) => n.id === wp.insertBefore);
  if (idx <= 0) {
    throw new Error(
      `coze export: winitOpenapiPlugin.insertBefore="${wp.insertBefore}" 须指向 workflow.json 中第二个及之后的节点，以便其前有代码节点拼装插件 data；或配置 winitOpenapiPlugin.requestDataFrom。`
    );
  }
  const prev = workflow.nodes[idx - 1]!;
  if (prev.type === "llm") {
    throw new Error(
      `coze export: 插件上游节点 "${prev.id}" 为 LLM，不能作为 data 来源；请在 insertBefore 前增加代码节点或配置 requestDataFrom。`
    );
  }
  return { logicalId: prev.id, path: "winitRequestData" };
}

/** 专家内嵌插件：`action` 从代码节点产出（可选，与 openapiAction 字面量二选一）。 */
function resolveWinitPluginRequestActionSource(
  wp: NonNullable<CozeExportConfig["winitOpenapiPlugin"]>
): { logicalId: string; path: string } {
  const logicalId = wp.requestActionFrom?.logicalId?.trim();
  if (!logicalId) {
    throw new Error("coze export: resolveWinitPluginRequestActionSource 仅在 requestActionFrom 已配置时调用");
  }
  return {
    logicalId,
    path: wp.requestActionFrom?.path?.trim() || "winitOpenapiAction",
  };
}

class ProducerTracker {
  private readonly producer = new Map<string, Producer>();

  constructor(
    startEntries: Array<{ name: string; path: string }>,
    startCozeId: string,
    private readonly idMap: Map<string, string>,
    private readonly inputBindings: CozeExportConfig["inputBindings"]
  ) {
    for (const { name, path } of startEntries) {
      this.producer.set(name, {
        logicalKey: "__start__",
        cozeId: startCozeId,
        pathFromStart: path === name ? undefined : path,
      });
    }
  }

  resolveInput(
    nodeLogicalId: string,
    inputName: string
  ): { ref_node: string; path: string; wireName: string } {
    const binding = this.inputBindings?.[nodeLogicalId]?.[inputName];
    const wireName = binding?.aliasAs ?? inputName;
    if (binding) {
      const cozeId =
        binding.ref === "__start__"
          ? this.idMap.get("__start__")!
          : this.idMap.get(binding.ref);
      if (!cozeId) throw new Error(`Unknown binding ref "${binding.ref}" for ${nodeLogicalId}.${inputName}`);
      return { ref_node: cozeId, path: binding.path, wireName };
    }
    const p = this.producer.get(inputName);
    if (!p) {
      throw new Error(
        `No producer for input "${inputName}" when building node "${nodeLogicalId}". ` +
          `Extend coze.config.yml inputBindings or fix workflow.json order/outputs.`
      );
    }
    const path = p.pathFromStart ?? inputName;
    return { ref_node: p.cozeId, path, wireName: inputName };
  }

  consumeOutputs(logicalKey: string, outputs: string[]) {
    const cozeId = this.idMap.get(logicalKey);
    if (!cozeId) throw new Error(`Missing coze id for ${logicalKey}`);
    for (const o of outputs) {
      this.producer.set(o, { logicalKey, cozeId });
    }
  }
}

function useObjectInputWrapper(wireName: string, path: string): boolean {
  if (path !== wireName && path.includes(".")) return false;
  if (path === "outputContext" && wireName === "inputContext") return false;
  return false;
}

function buildNodeInputLine(
  wireName: string,
  refNode: string,
  path: string,
  cozeInputProp?: JsonSchemaProperty
): Record<string, unknown> {
  const value = { path, ref_node: refNode };
  if (cozeInputProp) {
    // Coze 要求 node_inputs 整对象拉线：勿展开 properties，否则平台会为子字段
    //（如 structured / analysis）生成独立入参并要求在上游 node_outputs 显式声明。
    const typeBits = cozeInputWireShape(cozeInputProp);
    return { name: wireName, input: { ...typeBits, value } };
  }
  const objectWrap = useObjectInputWrapper(wireName, path);
  const input = objectWrap ? { type: "object", value } : { value };
  return { name: wireName, input };
}

function defaultCodeSetting(config: CozeExportConfig) {
  return (
    config.codeNode?.settingOnError ?? {
      processType: 1,
      retryTimes: 0,
      timeoutMs: 60000,
    }
  );
}

function defaultLlmSetting(config: CozeExportConfig) {
  return (
    config.llmNode?.settingOnError ?? {
      processType: 1,
      retryTimes: 0,
      switch: false,
      timeoutMs: 180000,
    }
  );
}

function positionFor(
  logicalKey: string,
  index: number,
  config: CozeExportConfig
): { x: number; y: number } {
  if (config.positions?.[logicalKey]) return config.positions[logicalKey]!;
  if (logicalKey === "__start__") return { x: -149.557913881682, y: 231.51531952084514 };
  if (logicalKey === "__end__") return { x: 1053.3053365464475, y: 309.27940455803343 };
  return { x: 480, y: -13 + index * 240 };
}

function mergeExportInputBindings(config: CozeExportConfig): CozeExportConfig["inputBindings"] {
  const base = { ...(config.inputBindings ?? {}) };
  const plugins = config.winitOpenapiPlugins ?? [];
  const wp = plugins[0];
  if (!wp?.enabled) return base;
  const lid = wp.logicalId?.trim() || "winit_openapi_plugin";
  const fetchId = "fetch-sku-inventory";
  const existing = { ...(base[fetchId] ?? {}) };
  const defaults = { skuUsableQty: { ref: lid, path: "data" } };
  base[fetchId] = { ...defaults, ...existing, ...(wp.fetchSkuBindings ?? {}) };
  return base;
}

function mergeExportOmitInputs(config: CozeExportConfig): CozeExportConfig["omitCodeNodeInputs"] {
  const raw = { ...(config.omitCodeNodeInputs ?? {}) };
  const fetchId = "fetch-sku-inventory";
  const list = [...(raw[fetchId] ?? [])];
  if ((config.winitOpenapiPlugins ?? []).some((p) => p.enabled)) {
    if (!list.includes("warehouseCodes")) list.push("warehouseCodes");
  } else {
    for (const x of ["skuUsableQty", "warehouseCodes"] as const) {
      if (!list.includes(x)) list.push(x);
    }
  }
  raw[fetchId] = list;
  return raw;
}

function buildExportConfig(base: CozeExportConfig): CozeExportConfig {
  return {
    ...base,
    inputBindings: mergeExportInputBindings(base),
    omitCodeNodeInputs: mergeExportOmitInputs(base),
  };
}

function emitStart(
  manifest: ManifestJson,
  cozeId: string,
  index: number,
  config: CozeExportConfig
): Record<string, unknown> {
  const node_outputs: Record<string, unknown> = {
    ...expertStartNodeOutputs(manifest),
  };
  return {
    id: cozeId,
    type: "start",
    title: "开始",
    icon: COZE_ICONS.start,
    description: "工作流的起始节点，用于设定启动工作流需要的信息",
    position: positionFor("__start__", index, config),
    parameters: {
      node_outputs,
    },
  };
}

/** 结束节点对外连线：整对象路径为 object，叶子如 result.analysis 为 string */
function endNodeInputIsObject(name: string, path: string): boolean {
  if (path === "result" || path === "enrichedContext") return true;
  return (
    name === "structured" ||
    name === "outputContext" ||
    path === "outputContext" ||
    path.includes("structured")
  );
}

function emitEnd(
  endMappings: Record<string, { ref: string; path: string }>,
  idMap: Map<string, string>,
  cozeId: string,
  index: number,
  config: CozeExportConfig
): Record<string, unknown> {
  const node_inputs = Object.entries(endMappings).map(([name, spec]) => {
    const ref = idMap.get(spec.ref);
    if (!ref) throw new Error(`endOutputs: unknown ref ${spec.ref}`);
    const value = { path: spec.path, ref_node: ref };
    const input = endNodeInputIsObject(name, spec.path)
      ? { type: "object", value }
      : { type: "string", value };
    return { name, input };
  });

  return {
    id: cozeId,
    type: "end",
    title: "结束",
    icon: COZE_ICONS.end,
    description: "工作流的最终节点，用于返回工作流运行后的结果信息",
    position: positionFor("__end__", index, config),
    parameters: {
      node_inputs,
      terminatePlan: "returnVariables",
    },
  };
}

function emitConditionNode(
  spec: BranchingSpec,
  cozeId: string,
  idMap: Map<string, string>,
  index: number,
  config: CozeExportConfig
): Record<string, unknown> {
  const refLogical = spec.refNode ?? spec.after;
  const refCozeId = idMap.get(refLogical);
  if (!refCozeId) throw new Error(`condition refNode/after "${refLogical}" missing coze id`);

  const branches: Record<string, unknown>[] = [];
  for (const r of spec.routes) {
    if (!r.whenEquals) continue;
    const op = r.whenEquals.operator ?? 7;
    branches.push({
      condition: {
        conditions: [
          {
            left: {
              input: {
                value: {
                  path: r.whenEquals.path,
                  ref_node: refCozeId,
                },
              },
            },
            operator: op,
            right: {
              input: {
                type: "string",
                value: r.whenEquals.value,
              },
            },
          },
        ],
        logic: 2,
      },
    });
  }

  return {
    id: cozeId,
    type: "condition",
    title: spec.title ?? "选择器",
    icon: COZE_ICONS.condition,
    description:
      "连接多个下游分支，若设定的条件成立则仅运行对应的分支，若均不成立则只运行“否则”分支",
    position: positionFor(spec.logicalId, index, config),
    parameters: {
      branches,
    },
  };
}

function emitCodeNode(
  expertDir: string,
  node: WorkflowJsonNode,
  manifest: ManifestJson,
  cozeId: string,
  tracker: ProducerTracker,
  index: number,
  config: CozeExportConfig,
  batchActionOutputKeys: Set<string>
): Record<string, unknown> {
  if (!node.file) throw new Error(`Code node ${node.id} missing file`);
  const abs = pathMod.join(expertDir, node.file);
  if (!fs.existsSync(abs)) throw new Error(`Code file not found: ${abs}`);
  const code = readCozeCodeNodeBody(expertDir, abs);

  const omitSet = new Set(config.omitCodeNodeInputs?.[node.id] ?? []);
  const bindings = config.inputBindings ?? {};
  const node_inputs: Record<string, unknown>[] = [];
  for (const inputName of node.inputs) {
    if (omitSet.has(inputName) && !bindings[node.id]?.[inputName]) {
      continue;
    }
    const { ref_node, path, wireName } = tracker.resolveInput(node.id, inputName);
    const cozeIn = node.cozeIo?.inputs?.[inputName];
    node_inputs.push(buildNodeInputLine(wireName, ref_node, path, cozeIn));
  }

  tracker.consumeOutputs(node.id, node.outputs);

  return {
    id: cozeId,
    type: "code",
    title: node.id,
    icon: COZE_ICONS.code,
    description: "编写代码，处理输入变量来生成返回值",
    version: config.codeNode?.version ?? "v2",
    position: positionFor(node.id, index, config),
    parameters: {
      code,
      language: config.codeNode?.language ?? 5,
      node_inputs,
      node_outputs: codeNodeOutputsForNode(node, manifest, batchActionOutputKeys),
      settingOnError: defaultCodeSetting(config),
    },
  };
}

function emitLlmNode(
  node: WorkflowJsonNode,
  cozeId: string,
  tracker: ProducerTracker,
  systemPrompt: string,
  index: number,
  config: CozeExportConfig
): Record<string, unknown> {
  const node_inputs = node.inputs.map((inputName) => {
    const { ref_node, path, wireName } = tracker.resolveInput(node.id, inputName);
    const cozeIn = node.cozeIo?.inputs?.[inputName];
    return buildNodeInputLine(wireName, ref_node, path, cozeIn);
  });

  tracker.consumeOutputs(node.id, node.outputs);

  const llmParam = mergeSystemPromptIntoLlmParams(
    defaultLlmParamList(config.llmNode?.model, { maxTokens: config.llmNode?.maxTokens }),
    systemPrompt
  );

  const defaultLlmNodeOutputs: Record<string, unknown> = {
    analysisResult: {
      type: "object",
      properties: {
        analysis: { type: "string", value: null },
        structured: { type: "object", value: null },
      },
      value: null,
    },
    reasoning_content: { type: "string", value: null },
  };
  const cozeOut = node.cozeIo?.outputs;
  const node_outputs: Record<string, unknown> = { ...defaultLlmNodeOutputs };
  if (cozeOut) {
    for (const [k, prop] of Object.entries(cozeOut)) {
      node_outputs[k] = cozePropertyToNodeOutput(prop);
    }
  }
  for (const outputName of node.outputs) {
    if (outputName in node_outputs) continue;
    const fromNodeOutputSchema = node.outputSchema?.properties?.[outputName];
    node_outputs[outputName] = fromNodeOutputSchema
      ? cozePropertyToNodeOutput(fromNodeOutputSchema)
      : { type: "object", value: null };
  }

  return {
    id: cozeId,
    type: "llm",
    title: node.id,
    icon: COZE_ICONS.llm,
    description: "调用大语言模型,使用变量和提示词生成回复",
    version: config.llmNode?.version ?? "3",
    position: positionFor(node.id, index, config),
    parameters: {
      fcParamVar: { knowledgeFCParam: {} },
      llmParam,
      node_inputs,
      node_outputs,
      settingOnError: defaultLlmSetting(config),
    },
  };
}

function emitTextNode(
  expertDir: string,
  spec: import("./types").TextNodeSpec,
  cozeId: string,
  index: number,
  config: CozeExportConfig
): Record<string, unknown> {
  const abs = pathMod.join(expertDir, spec.sourceFile);
  const body = readUtf8NormalizedLf(abs);
  const title = spec.title ?? pathMod.basename(spec.sourceFile);

  return {
    id: cozeId,
    type: "text",
    title,
    icon: COZE_ICONS.text,
    description: "用于处理多个字符串类型变量的格式",
    position: positionFor(spec.logicalId, index, config),
    parameters: {
      concatParams: [
        { name: "concatResult", input: { type: "string", value: body } },
        { name: "arrayItemConcatChar", input: { type: "string", value: "，" } },
        {
          name: "allArrayItemConcatChars",
          input: {
            type: "list",
            items: { type: "object", value: null },
            value: [
              { isDefault: true, label: "换行", value: "\n" },
              { isDefault: true, label: "制表符", value: "\t" },
              { isDefault: true, label: "句号", value: "。" },
              { isDefault: true, label: "逗号", value: "，" },
              { isDefault: true, label: "分号", value: "；" },
              { isDefault: true, label: "空格", value: " " },
            ],
          },
        },
      ],
      method: "concat",
      node_outputs: {
        output: { type: "string", value: null },
      },
    },
  };
}

export interface ConvertResult {
  manifestDoc: Record<string, unknown>;
  draftDoc: Record<string, unknown>;
  workflowPackageIcon: string;
}

export function convertExpertDirToCoze(expertDir: string): ConvertResult {
  const manifestPath = pathMod.join(expertDir, "manifest.json");
  const workflowPath = pathMod.join(expertDir, "workflow.json");
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing manifest.json: ${manifestPath}`);
  if (!fs.existsSync(workflowPath)) throw new Error(`Missing workflow.json: ${workflowPath}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ManifestJson;
  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf-8")) as WorkflowJson;

  const invalidSchemaNames = [
    ...collectInvalidCozeSchemaPropertyPaths(
      (manifest.inputSchema?.properties ?? {}) as Record<string, unknown>,
      "inputSchema.properties"
    ),
    ...collectInvalidCozeSchemaPropertyPaths(
      (manifest.outputSchema?.properties ?? {}) as Record<string, unknown>,
      "outputSchema.properties"
    ),
  ];
  if (invalidSchemaNames.length > 0) {
    throw new Error(
      `Coze 字段名只能包含字母、数字或下划线，并且以字母或下划线开头：${invalidSchemaNames.join(", ")}`
    );
  }

  const rawConfig = loadCozeExportConfig(expertDir, manifest.id);
  const config = buildExportConfig(rawConfig);
  const batchActionOutputKeys = collectBatchActionOutputKeys(config);

  const textSpecs = (config.textNodes ?? []).filter((t) => {
    const p = pathMod.join(expertDir, t.sourceFile);
    return fs.existsSync(p);
  });

  if (config.branching && textSpecs.length > 0) {
    throw new Error(
      "coze export: 已配置 branching 时不支持与 textNodes 同时使用，请从 coze.config.yml 中移除其一。"
    );
  }

  const winitPlugins = config.winitOpenapiPlugins ?? [];
  const chain = buildChain(workflow, textSpecs, config.branching ?? null, winitPlugins);
  const idMap = assignCozeNodeIds(chain, config);

  const startEntries = buildStartProducerEntries(manifest);
  const startCozeId = idMap.get("__start__")!;
  const endCozeId = idMap.get("__end__")!;
  const tracker = new ProducerTracker(startEntries, startCozeId, idMap, config.inputBindings);

  const lastWf = lastWorkflowNode(workflow);
  const endMap = {
    ...defaultEndOutputsFromManifest(manifest, lastWf.id),
    ...(config.endOutputs ?? {}),
  };

  function readLlmSystemPrompt(node: WorkflowJsonNode): string {
    const promptRel = node.promptFile?.trim() || pathMod.join("prompts", "main.md");
    const promptPath = pathMod.join(expertDir, promptRel);
    let prompt = fs.existsSync(promptPath) ? readUtf8NormalizedLf(promptPath) : "";
    const kbPathCoze = pathMod.join(expertDir, "prompts", "kb.md");
    const kbInline = fs.existsSync(kbPathCoze) ? readUtf8NormalizedLf(kbPathCoze) : "";
    prompt = prompt.replace(
      /\{\{kbMd\}\}/g,
      kbInline.trim() ? kbInline : "（未配置 prompts/kb.md）"
    );
    return prompt;
  }

  // Coze：nodes 数组第 1、2 项必须是开始(100001)、结束(900001)；中间节点按执行链顺序排在后面
  const middleNodes: Record<string, unknown>[] = [];
  let layoutIndex = 2;

  for (const item of chain) {
    if (item.kind === "start" || item.kind === "end") continue;

    const key = chainLogicalKey(item);
    const cozeId = idMap.get(key)!;

    if (item.kind === "text") {
      middleNodes.push(emitTextNode(expertDir, item.spec, cozeId, layoutIndex++, config));
      tracker.consumeOutputs(item.spec.logicalId, ["output"]);
      continue;
    }

    if (item.kind === "condition") {
      middleNodes.push(emitConditionNode(item.spec, cozeId, idMap, layoutIndex++, config));
      continue;
    }

    if (item.kind === "plugin") {
      const wp = item.plugin;
      if (!wp.enabled) throw new Error("coze export: plugin chain item with disabled winit plugin config");
      const pluginKey = winitPluginLogicalKey(wp);

      if (wp.pluginBatch?.enabled) {
        const pb = wp.pluginBatch;
        const af = pb.actionsFrom;
        const actionsRefNode = idMap.get(af.logicalId);
        if (!actionsRefNode) {
          throw new Error(
            `coze export: pluginBatch.actionsFrom 节点 "${af.logicalId}" 未分配到 Coze id`
          );
        }
        const path = af.path?.trim() || "actions";
        middleNodes.push(
          buildWinitOpenapiBatchPluginNode(cozeId, startCozeId, positionFor(pluginKey, layoutIndex++, config), {
            actionsRef: { ref_node: actionsRefNode, path },
            batchSize: pb.batchSize ?? 100,
            concurrentSize: pb.concurrentSize ?? 10,
            title: pluginKey,
          })
        );
        continue;
      }

      const dataSrc = resolveWinitPluginRequestDataSource(workflow, wp);
      const dataRefNode = idMap.get(dataSrc.logicalId);
      if (!dataRefNode) {
        throw new Error(
          `coze export: winitOpenapiPlugin requestData 来源节点 "${dataSrc.logicalId}" 未分配到 Coze id`
        );
      }

      const pluginOpts: BuildWinitOpenapiPluginNodeOptions = {
        dataRef: { ref_node: dataRefNode, path: dataSrc.path },
        title: pluginKey,
      };
      if (wp.requestActionFrom?.logicalId?.trim()) {
        const actionSrc = resolveWinitPluginRequestActionSource(wp);
        const actionRefNode = idMap.get(actionSrc.logicalId);
        if (!actionRefNode) {
          throw new Error(
            `coze export: winitOpenapiPlugin requestActionFrom 节点 "${actionSrc.logicalId}" 未分配到 Coze id`
          );
        }
        pluginOpts.actionRef = { ref_node: actionRefNode, path: actionSrc.path };
      } else {
        pluginOpts.actionLiteral = wp.openapiAction?.trim() || DEFAULT_WINIT_OPENAPI_ACTION_INVENTORY_LIST;
      }

      middleNodes.push(
        buildWinitOpenapiPluginNode(cozeId, startCozeId, positionFor(pluginKey, layoutIndex++, config), pluginOpts)
      );
      continue;
    }

    const n = item.node;
    if (n.type === "llm") {
      middleNodes.push(emitLlmNode(n, cozeId, tracker, readLlmSystemPrompt(n), layoutIndex++, config));
    } else {
      middleNodes.push(
        emitCodeNode(expertDir, n, manifest, cozeId, tracker, layoutIndex++, config, batchActionOutputKeys)
      );
    }
  }

  const nodes: Record<string, unknown>[] = [
    emitStart(manifest, startCozeId, 0, config),
    emitEnd(endMap, idMap, endCozeId, 1, config),
    ...middleNodes,
  ];

  const edges = buildEdges(chain, idMap, {
    workflow,
    branching: config.branching ?? null,
    winitOpenapiPlugins: winitPlugins,
    branchOnlyNodeIds: config.branchOnlyNodeIds,
  });

  const draftDoc = {
    schema_version: "1.0.0",
    name: config.packageMainName ?? normalizeCozeWorkflowName(manifest.id),
    id: config.workflowId,
    description: config.packageDescription ?? manifest.name ?? "",
    mode: "workflow",
    icon: config.icon ?? WORKFLOW_PACKAGE_ICON,
    nodes,
    edges,
  };

  const manifestDoc = {
    type: "Workflow",
    version: "1.0.0",
    main: {
      id: config.workflowId,
      name: config.packageMainName ?? normalizeCozeWorkflowName(manifest.id),
      desc: config.packageDescription ?? manifest.name ?? "",
      icon: config.icon ?? WORKFLOW_PACKAGE_ICON,
      version: "",
      flowMode: 0,
      commitId: "",
    },
    sub: [],
  };

  return { manifestDoc, draftDoc, workflowPackageIcon: config.icon ?? WORKFLOW_PACKAGE_ICON };
}

/**
 * COZE 线上导入对 YAML 形态敏感：`defaultStringType: BLOCK_LITERAL` 会把几乎所有标量写成 `|-` 多行，
 * 且空字符串会变成空块，与官方导出（PLAIN 短标量 + 多行才用 `|`）不一致，导致「格式错误」。
 * 使用 PLAIN：单行/空串为正常标量；含换行字符串自动序列化为 `|` 块（与 original 样本一致）。
 */
export function stringifyCozeYaml(doc: Record<string, unknown>): string {
  return YAML.stringify(doc, {
    indent: 4,
    lineWidth: 0,
    defaultStringType: "PLAIN",
    defaultKeyType: "PLAIN",
  });
}

/**
 * COZE 导入要求 MANIFEST 中 `main.id` 为**无引号**整数形态（与官方导出一致），
 * `yaml` 对超长数字字符串会输出 `id: "7621..."`，会导致导入失败。
 */
export function stringifyManifestYml(doc: Record<string, unknown>): string {
  const s = stringifyCozeYaml(doc);
  return s.replace(/^ {4}id: "(\d+)"$/m, "    id: $1");
}

/**
 * draft 根级 `id` 须为无引号整数（与 MANIFEST `main.id` 一致）；节点 `id` 仍为带引号字符串。
 * 仅替换行首无缩进的 `id: "数字"`。
 */
export function stringifyDraftWorkflowYml(doc: Record<string, unknown>): string {
  const s = stringifyCozeYaml(doc);
  return s.replace(/^id: "(\d+)"$/m, "id: $1");
}
