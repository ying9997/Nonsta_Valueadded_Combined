/**
 * 本地专家工程与 COZE 导出配置的类型定义
 */

export interface JsonSchemaLike {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchemaProperty>;
  additionalProperties?: boolean;
}

export interface JsonSchemaProperty {
  type?: string;
  description?: string;
  default?: unknown;
  properties?: Record<string, JsonSchemaProperty>;
  /** object 类型时与 JSON Schema 一致：必填子属性名 */
  required?: string[];
  items?: JsonSchemaProperty;
  additionalProperties?: boolean;
}

/**
 * 节点级 Coze 端口类型（与 manifest 共用 JSON Schema 子集），供导出 `node_inputs` / `node_outputs` 精准 `type`。
 * 未声明时回退 `outputSchema`、manifest 或导出报错；见 `COZE-WORKFLOW.md` §5。
 */
export interface CozeNodeIoSpec {
  inputs?: Record<string, JsonSchemaProperty>;
  outputs?: Record<string, JsonSchemaProperty>;
}

export interface WorkflowJsonNode {
  id: string;
  type?: string;
  file?: string;
  /** LLM 节点使用的 Prompt 文件路径；缺省为 prompts/main.md */
  promptFile?: string;
  inputs: string[];
  outputs: string[];
  /** 可选：覆盖/补充该节点在 Coze 画布上的入出参类型 */
  cozeIo?: CozeNodeIoSpec;
  /**
   * 可选：节点出参的 JSON Schema 子集（`properties` 的键与 `outputs` 对齐）。
   * 与 `cozeIo.outputs` 可并存；同一键优先使用 `cozeIo.outputs`。
   * 未覆盖的键可继续由 `manifest` 的 input/output schema 或内置特例补全，否则导出报错。
   */
  outputSchema?: JsonSchemaLike;
}

export interface WorkflowJson {
  nodes: WorkflowJsonNode[];
}

export interface ManifestJson {
  id: string;
  name: string;
  description?: string;
  version?: string;
  inputSchema?: JsonSchemaLike;
  outputSchema?: JsonSchemaLike;
  /**
   * 将框架顶层 start 字段标为必填（如 delivered-not-received 须传 inputContext）。
   * 键须为 FRAMEWORK_START_INPUT_SCHEMA.properties 中已有项。
   */
  x_framework_input_required?: string[];
  /**
   * 为 true 时：在 inputContext 已列入 x_framework_input_required 的前提下，
   * 将 start 节点中 inputContext.previousOutput 标为必填并补充说明（链式上游 result.analysis）。
   */
  x_framework_require_previous_output?: boolean;
}

/** 单条输入连线：从某逻辑节点取 path，在 COZE 侧可选用 aliasAs 作为 node_inputs 的 name */
export interface InputBindingSpec {
  ref: string;
  path: string;
  aliasAs?: string;
}

export interface TextNodeSpec {
  logicalId: string;
  title?: string;
  /** 插在 workflow.json 中该 id 的节点之后（画布链路上紧接其后） */
  insertAfter: string;
  sourceFile: string;
}

export interface EndOutputMapping {
  ref: string;
  path: string;
}

/** 条件分支：与 Coze「选择器」一致，边需带 `source_port`（如 true / true_1 / false） */
export interface BranchRouteSpec {
  /** Coze 出口名：字符串 `"true"`、`"true_1"`、`"false"` 等 */
  port: string;
  /** workflow.json 中的目标节点 id */
  target: string;
  /**
   * 有则写入 `parameters.branches[].condition`；无则表示「否则」分支（通常 `port` 为 `false`），不占一条 branches 条目。
   * `operator` 缺省为 7（与样本一致：左为 ref 路径，右为 string 常量）。
   */
  whenEquals?: { path: string; value: string; operator?: number };
}

export interface BranchingSpec {
  /** 在该 workflow 节点之后插入选择器 */
  after: string;
  /** 选择器在画布上的逻辑 id，可写入 `nodeIds` 固定 Coze 数字 id */
  logicalId: string;
  title?: string;
  /** 条件左侧 `ref_node` 来源，默认与 `after` 相同 */
  refNode?: string;
  routes: BranchRouteSpec[];
  /**
   * 分支专用节点的额外出边（不在 workflow.json 线性 tail 内时必填）。
   * 例：false → stub-llm-placeholder → resolve-analysis-result
   */
  joins?: Array<{ from: string; to: string }>;
}

/** Coze 批处理模式：`actions` 列表驱动 `cobra_winit_openapi_request`（见 e_sample_batch） */
export interface WinitOpenapiPluginBatchConfig {
  enabled: boolean;
  batchSize?: number;
  concurrentSize?: number;
  /** `{ action, data }[]` 来源，默认 path `actions` */
  actionsFrom: { logicalId: string; path?: string };
}

/** 在专家草稿中插入 cobra_winit_openapi_request 插件（须配 nodeIds + positions） */
export interface WinitOpenapiPluginConfig {
  enabled: boolean;
  /** workflow.json 中节点 id，插件画布上位于其上游 */
  insertBefore: string;
  /** 逻辑键，写入 nodeIds / positions；默认 winit_openapi_plugin */
  logicalId?: string;
  /** 合并到 fetch-sku-inventory 的 inputBindings（覆盖默认 skuUsableQty→插件 data） */
  fetchSkuBindings?: Record<string, InputBindingSpec>;
  /**
   * 批处理插件：`parameters.batch` + `outputList`；启用时忽略标量 openapiAction/requestDataFrom/requestActionFrom。
   */
  pluginBatch?: WinitOpenapiPluginBatchConfig;
  /**
   * 插件 `action` 入参常量（导出为字面量，不从上游节点拉线）。
   * 与 `requestActionFrom` 二选一：若配置了 `requestActionFrom`，则忽略本字段。
   * 缺省为 `queryProductInventoryList4Page`（与 fetch-sku-inventory / id/58 一致）。
   */
  openapiAction?: string;
  /**
   * 插件 `action` 从代码节点拉线（与 `data` 类似，Coze 插件入参支持动态 action）。
   * 指定 `logicalId` 与可选 `path`（默认 `winitOpenapiAction`）；配置后不再使用 `openapiAction` 字面量。
   */
  requestActionFrom?: { logicalId: string; path?: string };
  /**
   * 插件请求体 `data` 的来源（专家内嵌；不经开始节点）。
   * 缺省：`insertBefore` 在 workflow.json 中的**前一个**工作流节点，path 为 `winitRequestData`。
   */
  requestDataFrom?: { logicalId: string; path?: string };
}

export interface CozeExportConfig {
  workflowId: string;
  yamlBasename?: string;
  packageMainName?: string;
  packageDescription?: string;
  icon?: string;
  /** 固定 COZE 节点 id（缺省自动生成）。注意：`__start__` / `__end__` 始终为 100001 / 900001，配置中的覆盖无效 */
  nodeIds?: Record<string, string>;
  /** 在 `after` 节点后插入选择器；与 `textNodes` 不能同时启用 */
  branching?: BranchingSpec;
  textNodes?: TextNodeSpec[];
  /** logicalNodeId -> inputName -> binding */
  inputBindings?: Record<string, Record<string, InputBindingSpec>>;
  /** 结束节点对外字段名 -> 来源 */
  endOutputs?: Record<string, EndOutputMapping>;
  codeNode?: {
    language?: number;
    version?: string;
    settingOnError?: { processType: number; retryTimes: number; timeoutMs: number };
  };
  llmNode?: {
    version?: string;
    /** 模型预设：`doubao` | `deepseek`；缺省 `doubao` */
    model?: string;
    maxTokens?: number;
    settingOnError?: {
      processType: number;
      retryTimes: number;
      switch?: boolean;
      timeoutMs: number;
    };
  };
  positions?: Record<string, { x: number; y: number }>;
  /**
   * 单个万邑通插件（YAML 向后兼容）。加载后与 `winitOpenapiPlugins` 数组合并为 `winitOpenapiPlugins` 列表（见 config.ts）。
   */
  winitOpenapiPlugin?: WinitOpenapiPluginConfig;
  /** 归一化后的插件列表（可来自 YAML 的 `winitOpenapiPlugins` 或 legacy 单块） */
  winitOpenapiPlugins?: WinitOpenapiPluginConfig[];
  /** code 节点：无 inputBindings 且无 producer 时可从导出的 node_inputs 中省略的入参名 */
  omitCodeNodeInputs?: Record<string, string[]>;
  /** 仅 branching 触达、不参与 after 之后线性 tail 的 workflow 节点 id */
  branchOnlyNodeIds?: string[];
}

export type ChainItem =
  | { kind: "start" }
  | { kind: "end" }
  | { kind: "workflow"; node: WorkflowJsonNode }
  | { kind: "text"; spec: TextNodeSpec }
  | { kind: "condition"; spec: BranchingSpec }
  | { kind: "plugin"; plugin: WinitOpenapiPluginConfig };
