import type { JsonSchemaLike, JsonSchemaProperty, ManifestJson, WorkflowJsonNode } from "./types";

/** 专家调用边界固定顶层键；不得出现在 manifest.inputSchema.properties（业务子 schema）中 */
export const EXPERT_INVOKE_RESERVED_PROPERTY_KEYS = new Set([
  "query",
  "customerIntent",
  "inputContext",
  "inputs",
  "customerCode",
  "customerName",
  "username",
  "language",
  "data",
]);

/** Coze 节点变量名：仅字母、数字、下划线，且必须以字母或下划线开头。 */
export const COZE_VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** 递归收集会被导出为 Coze 变量的非法 JSON Schema properties 路径。 */
export function collectInvalidCozeSchemaPropertyPaths(
  properties: Record<string, unknown>,
  prefix = "properties"
): string[] {
  const invalid: string[] = [];
  for (const [name, raw] of Object.entries(properties)) {
    const current = `${prefix}.${name}`;
    if (!COZE_VARIABLE_NAME_RE.test(name)) invalid.push(current);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const prop = raw as {
      properties?: Record<string, unknown>;
      items?: { properties?: Record<string, unknown> };
    };
    if (prop.properties) invalid.push(...collectInvalidCozeSchemaPropertyPaths(prop.properties, `${current}.properties`));
    if (prop.items?.properties) {
      invalid.push(...collectInvalidCozeSchemaPropertyPaths(prop.items.properties, `${current}.items.properties`));
    }
  }
  return invalid;
}

/**
 * 仓库级固定：Coze start 与调用 JSON 的顶层字段（不含业务 `inputs`，业务由 manifest.inputSchema 描述）。
 * `customerCode` 等四字段为全体专家默认顶层（design-spec.md §6），可为空串。
 */
export const FRAMEWORK_START_INPUT_SCHEMA: JsonSchemaLike = {
  type: "object",
  required: [],
  properties: {
    query: {
      type: "string",
      description: "上游 Agent 委托本专家需要完成的具体任务说明",
      default: "",
    },
    customerIntent: {
      type: "string",
      description: "当前正在为客户解决的业务问题或诉求摘要",
      default: "",
    },
    inputContext: {
      type: "object",
      description:
        "链式上下文：跨专家编排时由调用方在 JSON 中传入；单专家可省略。常见键（不在 Coze 展开子类型，避免 previousOutput 多态与平台校验冲突）：" +
        "sourceExpertId 上一环节专家 id；chainId 调用链；previousOutput 为上一专家 result（JSON 对象）或整段序列化字符串。见 design-spec.md §5。",
      additionalProperties: true,
    },
    customerCode: {
      type: "string",
      description: "客户编码（租户/账号上下文；审计、日志及可选万邑通调用；可为空）",
      default: "",
    },
    customerName: {
      type: "string",
      description: "客户名称（租户展示上下文；可为空）",
      default: "",
    },
    username: {
      type: "string",
      description: "操作者用户名（审计上下文；可为空）",
      default: "",
    },
    language: {
      type: "string",
      description: "语言/区域偏好（如 zh_CN；可为空）",
      default: "",
    },
  },
};

function assertNoReservedBusinessKeys(properties: Record<string, JsonSchemaProperty>): void {
  for (const k of Object.keys(properties)) {
    if (EXPERT_INVOKE_RESERVED_PROPERTY_KEYS.has(k)) {
      throw new Error(
        `manifest.inputSchema.properties 不得使用保留键 "${k}"（框架固定顶层：query、customerIntent、inputContext、inputs、customerCode、customerName、username、language、data）`
      );
    }
  }
  const invalid = collectInvalidCozeSchemaPropertyPaths(properties as Record<string, unknown>, "inputSchema.properties");
  if (invalid.length > 0) {
    throw new Error(
      `Coze 字段名只能包含字母、数字或下划线，并且以字母或下划线开头：${invalid.join(", ")}`
    );
  }
}

/** Coze 批处理插件默认上游输出键；另可经 coze.config pluginBatch.actionsFrom.path 扩展 */
const WINIT_OPENAPI_BATCH_ACTION_ARRAY_KEYS = new Set(["actions", "trackingActions"]);

const WINIT_OPENAPI_BATCH_ACTION_ITEM_SCHEMA: JsonSchemaProperty = {
  type: "object",
  properties: {
    action: { type: "string" },
    data: { type: "string" },
  },
};

/** 从 coze.config 收集需 enrich action/data 的批处理上游输出键 */
export function collectBatchActionOutputKeys(config?: {
  winitOpenapiPlugins?: Array<{
    pluginBatch?: { enabled?: boolean; actionsFrom?: { path?: string } };
  }>;
  winitOpenapiPlugin?: {
    pluginBatch?: { enabled?: boolean; actionsFrom?: { path?: string } };
  };
}): Set<string> {
  const keys = new Set(WINIT_OPENAPI_BATCH_ACTION_ARRAY_KEYS);
  const plugins =
    config?.winitOpenapiPlugins && config.winitOpenapiPlugins.length > 0
      ? config.winitOpenapiPlugins
      : config?.winitOpenapiPlugin
        ? [config.winitOpenapiPlugin]
        : [];
  for (const p of plugins) {
    if (p?.pluginBatch?.enabled) {
      keys.add(p.pluginBatch.actionsFrom?.path?.trim() || "actions");
    }
  }
  return keys;
}

function enrichWinitBatchActionOutputProp(
  key: string,
  prop: JsonSchemaProperty,
  batchActionOutputKeys?: Set<string>
): JsonSchemaProperty {
  const keys = batchActionOutputKeys ?? WINIT_OPENAPI_BATCH_ACTION_ARRAY_KEYS;
  if (!keys.has(key) || prop.type !== "array") return prop;
  const items = prop.items;
  if (!items || items.type !== "object") return prop;
  if (items.properties?.action && items.properties?.data) return prop;
  return {
    ...prop,
    items: {
      ...items,
      type: "object",
      properties: {
        ...WINIT_OPENAPI_BATCH_ACTION_ITEM_SCHEMA.properties,
        ...(items.properties ?? {}),
      },
    },
  };
}

/**
 * 代码节点 `node_outputs`：优先 `node.cozeIo.outputs`，再 `node.outputSchema.properties`，再 manifest 的 input/output schema；无匹配则报错（不再按字段名启发式推断）。
 */
export function codeNodeOutputsForNode(
  node: WorkflowJsonNode,
  manifest: ManifestJson,
  batchActionOutputKeys?: Set<string>
): Record<string, unknown> {
  const outputKeys = node.outputs;
  const inputProps = manifest.inputSchema?.properties ?? {};
  const outputProps = manifest.outputSchema?.properties ?? {};
  const o: Record<string, unknown> = {};

  for (const key of outputKeys) {
    const fromCozeIo = node.cozeIo?.outputs?.[key];
    if (fromCozeIo) {
      o[key] = cozePropertyToNodeOutput(
        enrichWinitBatchActionOutputProp(key, fromCozeIo, batchActionOutputKeys)
      );
      continue;
    }
    const fromNodeOutputSchema = node.outputSchema?.properties?.[key];
    if (fromNodeOutputSchema) {
      o[key] = cozePropertyToNodeOutput(
        enrichWinitBatchActionOutputProp(key, fromNodeOutputSchema, batchActionOutputKeys)
      );
      continue;
    }
    if (key === "outputContext") {
      o[key] = {
        type: "object",
        properties: {
          chainId: { type: "string", value: null },
          expertId: { type: "string", value: null },
          resultSummary: { type: "string", value: null },
        },
        value: null,
      };
      continue;
    }
    const fromInput = inputProps[key];
    if (fromInput) {
      o[key] = cozePropertyToNodeOutput(fromInput);
      continue;
    }
    const fromOut = outputProps[key];
    if (fromOut) {
      o[key] = cozePropertyToNodeOutput(fromOut);
      continue;
    }
    if (key === "result") {
      const props = manifest.outputSchema?.properties;
      if (props && Object.keys(props).length > 0) {
        o[key] = cozePropertyToNodeOutput({ type: "object", properties: props });
      } else {
        o[key] = { type: "object", value: null };
      }
      continue;
    }
    throw new Error(
      `coze export: 代码节点 "${node.id}" 的 node_outputs 键 "${key}" 无类型：请在 workflow.json 中补充 cozeIo.outputs 或 outputSchema.properties，或保证 manifest.inputSchema / outputSchema 含该键。`
    );
  }
  return o;
}

/**
 * @deprecated 请使用 `codeNodeOutputsForNode`；可传入 `node` 上的 `cozeIo` / `outputSchema` 片段以便解析。
 */
export function codeNodeOutputsForKeys(
  outputKeys: string[],
  manifest: ManifestJson,
  node?: Pick<WorkflowJsonNode, "id" | "cozeIo" | "outputSchema">,
  batchActionOutputKeys?: Set<string>
): Record<string, unknown> {
  return codeNodeOutputsForNode(
    {
      id: node?.id ?? "_",
      inputs: [],
      outputs: outputKeys,
      cozeIo: node?.cozeIo,
      outputSchema: node?.outputSchema,
    },
    manifest,
    batchActionOutputKeys
  );
}

/**
 * Coze 工作流 node_outputs / list.items 支持的 type 枚举（与官方导出样本一致）。
 * 见 tmp/Workflow-sample-draft-953/workflow/sample-draft.yaml
 */
const COZE_SCALAR_TYPES = new Set([
  "string",
  "integer",
  "float",
  "boolean",
  "time",
  "object",
  "list",
  "code",
  "file",
  "image",
  "svg",
  "txt",
  "excel",
]);

function mapJsonSchemaTypeToCoze(t: string | undefined): string {
  if (t === "integer") return "integer";
  if (t === "number") return "float";
  if (t === "boolean") return "boolean";
  if (t === "string") return "string";
  if (t === "array") return "list";
  if (t === "object") return "object";
  return "string";
}

/** list 的 items 节点：与样本中 items 块结构一致 */
function cozeListItemsShape(item: JsonSchemaProperty | undefined): Record<string, unknown> {
  if (!item || !item.type) {
    return { type: "object", value: null };
  }
  if (item.type === "object") {
    const o: Record<string, unknown> = { type: "object", value: null };
    if (item.properties && Object.keys(item.properties).length > 0) {
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(item.properties)) {
        props[k] = cozePropertyToNodeOutput(v);
      }
      o.properties = props;
    }
    return o;
  }
  if (item.type === "array") {
    return cozeListShapeFromProp(item);
  }
  const ct = mapJsonSchemaTypeToCoze(item.type);
  if (!COZE_SCALAR_TYPES.has(ct) && ct !== "list") {
    return { type: "string", value: null };
  }
  return { type: ct, value: null };
}

function cozeListShapeFromProp(prop: JsonSchemaProperty): Record<string, unknown> {
  const items = cozeListItemsShape(prop.items);
  const out: Record<string, unknown> = {
    type: "list",
    items,
    value: null,
  };
  if (prop.description) out.description = prop.description;
  return out;
}

function cozeObjectShapeFromProp(prop: JsonSchemaProperty): Record<string, unknown> {
  const out: Record<string, unknown> = {
    type: "object",
    value: null,
  };
  if (prop.description) out.description = prop.description;
  if (prop.properties && Object.keys(prop.properties).length > 0) {
    const props: Record<string, unknown> = {};
    const reqSet = new Set(Array.isArray(prop.required) ? prop.required : []);
    for (const [k, v] of Object.entries(prop.properties)) {
      const shape = cozePropertyToNodeOutput(v);
      if (reqSet.has(k)) (shape as Record<string, unknown>).required = true;
      props[k] = shape;
    }
    out.properties = props;
  }
  return out;
}

/**
 * 代码/LLM 节点 node_inputs 连线用类型块：仅 type（+ list items），**不含** properties。
 * Coze 若展开 properties 会为子字段生成独立入参，要求上游 node_outputs 显式声明同名键。
 */
export function cozeInputWireShape(prop?: JsonSchemaProperty): Record<string, unknown> {
  if (!prop?.type) {
    return { type: "object" };
  }
  const ct = mapJsonSchemaTypeToCoze(prop.type);
  if (prop.type === "array") {
    const items = cozeListItemsShape(prop.items);
    return { type: "list", items };
  }
  const out: Record<string, unknown> = {
    type: COZE_SCALAR_TYPES.has(ct) || ct === "list" ? ct : "object",
  };
  if (prop.description) out.description = prop.description;
  return out;
}

/**
 * 将 JSON Schema 属性转为 Coze start 节点 node_outputs 中单项（递归；list 必含 items）。
 */
export function cozePropertyToNodeOutput(prop: JsonSchemaProperty): Record<string, unknown> {
  const t = prop.type;
  if (!t) {
    const out: Record<string, unknown> = { type: "string", value: null };
    if (prop.description) out.description = prop.description;
    return out;
  }
  if (t === "array") {
    return cozeListShapeFromProp(prop);
  }
  if (t === "object") {
    return cozeObjectShapeFromProp(prop);
  }
  const ct = mapJsonSchemaTypeToCoze(t);
  const out: Record<string, unknown> = {
    type: COZE_SCALAR_TYPES.has(ct) ? ct : "string",
    value: null,
  };
  if (prop.description) out.description = prop.description;
  return out;
}

/**
 * manifest.inputSchema -> COZE start 节点 parameters.node_outputs
 */
export function manifestInputSchemaToNodeOutputs(
  inputSchema: JsonSchemaLike | undefined
): Record<string, unknown> {
  const props = inputSchema?.properties ?? {};
  const required = new Set(inputSchema?.required ?? []);
  const node_outputs: Record<string, unknown> = {};

  for (const [name, prop] of Object.entries(props)) {
    const shape = cozePropertyToNodeOutput(prop);
    if (required.has(name)) (shape as Record<string, unknown>).required = true;
    node_outputs[name] = shape;
  }

  return node_outputs;
}

function applyFrameworkRequiredKeys(nodeOutputs: Record<string, unknown>, manifest: ManifestJson): void {
  const raw = manifest.x_framework_input_required;
  if (!Array.isArray(raw)) return;
  for (const key of raw) {
    if (typeof key !== "string" || !key.trim()) continue;
    const slot = nodeOutputs[key];
    if (!slot || typeof slot !== "object") continue;
    (slot as Record<string, unknown>).required = true;
  }

  if (
    manifest.x_framework_require_previous_output === true &&
    Array.isArray(raw) &&
    raw.includes("inputContext") &&
    nodeOutputs.inputContext &&
    typeof nodeOutputs.inputContext === "object"
  ) {
    const ic = nodeOutputs.inputContext as Record<string, unknown>;
    const hint =
      "对本专家为必填时：inputContext 须含 previousOutput，且为上游专家（如 delivery-status）的 result 等价物，并含非空字符串 analysis（轨迹/状态解读）。";
    const d = ic.description;
    ic.description = typeof d === "string" && d.trim() ? `${d} ${hint}` : hint;
  }
}

/**
 * 专家 Coze start 节点：框架顶层（含客户/账号四字段）+ `inputs`（内含 manifest 业务 properties）。
 */
export function expertStartNodeOutputs(manifest: ManifestJson): Record<string, unknown> {
  const inputSchema = manifest.inputSchema;
  const businessProps = inputSchema?.properties ?? {};
  assertNoReservedBusinessKeys(businessProps);

  const framework = manifestInputSchemaToNodeOutputs(FRAMEWORK_START_INPUT_SCHEMA) as Record<string, unknown>;
  const {
    customerCode: _cc,
    customerName: _cn,
    username: _un,
    language: _lg,
    ...frameworkCore
  } = framework;

  const required = new Set(inputSchema?.required ?? []);
  const innerProps: Record<string, unknown> = {};
  for (const [name, prop] of Object.entries(businessProps)) {
    const shape = cozePropertyToNodeOutput(prop);
    if (required.has(name)) (shape as Record<string, unknown>).required = true;
    innerProps[name] = shape;
  }

  const inputsShape: Record<string, unknown> = {
    type: "object",
    value: null,
    description: "本专家业务入参（与 manifest.inputSchema 一致）；上游拼装 LLM 通常只需填充此对象。",
  };
  if (Object.keys(innerProps).length > 0) {
    inputsShape.properties = innerProps;
  }

  const out: Record<string, unknown> = {
    ...frameworkCore,
    inputs: inputsShape,
    customerCode: framework.customerCode,
    customerName: framework.customerName,
    username: framework.username,
    language: framework.language,
  };
  applyFrameworkRequiredKeys(out, manifest);
  return out;
}

/** 与 call-expert.ts / design-spec §7 一致：结束节点固定四字段，均从 format-output 根级拉线 */
export const STANDARD_EXPERT_END_OUTPUTS = [
  "structured",
  "analysis",
  "outputContext",
  "enrichedContext",
] as const;

/**
 * 结束节点默认映射：四字段扁平 path，ref 为 workflow 末节点（通常为 format-output）
 */
export function defaultEndOutputsFromManifest(
  _manifest: ManifestJson,
  lastNodeLogicalId: string
): Record<string, { ref: string; path: string }> {
  const ref = lastNodeLogicalId;
  return {
    structured: { ref, path: "structured" },
    analysis: { ref, path: "analysis" },
    outputContext: { ref, path: "outputContext" },
    enrichedContext: { ref, path: "enrichedContext" },
  };
}
