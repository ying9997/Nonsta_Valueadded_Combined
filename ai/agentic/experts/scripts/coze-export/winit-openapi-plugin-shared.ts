/**
 * 万邑通 OpenAPI Coze 插件节点（cobra_winit_openapi_request）共享定义，
 * 供独立代理包导出与专家草稿内嵌共用。
 */

export const WINIT_OPENAPI_PLUGIN_NODE_ID = "115282";

/**
 * 专家内嵌插件默认调用的万邑通 OpenAPI 方法名（与 fetch-sku-inventory 默认一致，id/58）。
 * 不作为调用边界顶层字段；导出为插件 node_inputs 常量。
 */
export const DEFAULT_WINIT_OPENAPI_ACTION_INVENTORY_LIST = "queryProductInventoryList4Page";

/** 插件 apiParam（平台侧 api / 插件元数据）；升级插件版本时改此常量或后续扩展配置文件 */
export const WINIT_OPENAPI_PLUGIN_API_PARAM = [
  { name: "apiID", input: { type: "string", value: "7618114590886379526" } },
  { name: "apiName", input: { type: "string", value: "cobra_winit_openapi_request" } },
  { name: "pluginID", input: { type: "string", value: "7473322438084935720" } },
  { name: "pluginName", input: { type: "string", value: "cobra_agent_http" } },
  { name: "pluginVersion", input: { type: "string", value: "0" } },
  { name: "tips", input: { type: "string", value: "" } },
  { name: "outDocLink", input: { type: "string", value: "" } },
] as const;

/**
 * 独立代理工作流开始节点：含 `action` 与 `data`，便于通用透传（与专家主工作流内嵌插件不同）。
 */
export const WINIT_OPENAPI_STANDALONE_START_NODE_OUTPUTS: Record<string, { type: string; value: null }> = {
  action: { type: "string", value: null },
  customerCode: { type: "string", value: null },
  customerName: { type: "string", value: null },
  data: { type: "string", value: null },
  language: { type: "string", value: null },
  username: { type: "string", value: null },
};

export type BuildWinitOpenapiBatchPluginNodeOptions = {
  /** `{ action, data }[]` 来源（代码节点） */
  actionsRef: { ref_node: string; path: string };
  batchSize: number;
  concurrentSize: number;
  /** Coze 画布节点 title；多插件并存时须唯一，默认 cobra_winit_openapi_request */
  title?: string;
};

/**
 * Coze 批处理模式万邑通插件（与 e_sample_batch 一致）：`batch` + `item.action`/`item.data` 自引用 + `outputList`。
 */
export function buildWinitOpenapiBatchPluginNode(
  pluginCozeId: string,
  startCozeId: string,
  position: { x: number; y: number },
  options: BuildWinitOpenapiBatchPluginNodeOptions
): Record<string, unknown> {
  const { actionsRef, batchSize, concurrentSize, title } = options;

  const nodeTitle = title?.trim() || "cobra_winit_openapi_request";

  const node_inputs: Record<string, unknown>[] = [
    {
      name: "action",
      input: {
        type: "string",
        value: { path: "item.action", ref_node: pluginCozeId },
      },
    },
    { name: "customerCode", input: { value: { path: "customerCode", ref_node: startCozeId } } },
    { name: "customerName", input: { value: { path: "customerName", ref_node: startCozeId } } },
    {
      name: "data",
      input: {
        type: "string",
        value: { path: "item.data", ref_node: pluginCozeId },
      },
    },
    { name: "username", input: { value: { path: "username", ref_node: startCozeId } } },
    { name: "language", input: { value: { path: "language", ref_node: startCozeId } } },
  ];

  return {
    id: pluginCozeId,
    type: "plugin",
    title: nodeTitle,
    icon: "https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Plugin-v2.jpg",
    description: "Winit openapi 透传请求",
    position,
    parameters: {
      apiParam: WINIT_OPENAPI_PLUGIN_API_PARAM.map((row) => ({
        ...row,
        input: { ...row.input },
      })),
      batch: {
        batchEnable: true,
        batchSize,
        concurrentSize,
        inputLists: [
          {
            name: "item",
            /** 与平台导出一致：`input` 仅含 `value` 拉线，不写 list/items 形态（否则画布无效） */
            input: {
              value: {
                path: actionsRef.path,
                ref_node: actionsRef.ref_node,
              },
            },
          },
        ],
      },
      node_inputs,
      node_outputs: {
        outputList: {
          type: "list",
          items: {
            type: "object",
            properties: {
              code: { type: "integer", required: true, value: null },
              data: { type: "string", required: true, value: null },
              msg: { type: "string", required: true, value: null },
            },
            value: null,
          },
          value: null,
        },
      },
      settingOnError: {
        processType: 1,
        retryTimes: 0,
        timeoutMs: 180000,
      },
    },
  };
}

export type BuildWinitOpenapiPluginNodeOptions = {
  /**
   * 若设置非空字符串：插件 `action` 入参为该常量（不写 ref_node）。
   * 若同时传入 `actionRef`，以 `actionLiteral` 为准。
   * 若均未设置：从 `startCozeId` 的 `action` 路径拉线（独立代理包）。
   */
  actionLiteral?: string | null;
  /**
   * 专家内嵌：插件 `action` 从该代码节点拉线（与字面量二选一，优先字面量）。
   */
  actionRef?: { ref_node: string; path: string };
  /**
   * 专家内嵌：插件 `data` 从该节点拉线。未设置时与独立代理一致：从 `startCozeId` 的 `data` 拉线。
   */
  dataRef?: { ref_node: string; path: string };
  /** Coze 画布节点 title；多插件并存时须唯一 */
  title?: string;
};

/**
 * 专家草稿内嵌或独立包中的万邑通 OpenAPI 插件节点。
 */
export function buildWinitOpenapiPluginNode(
  pluginCozeId: string,
  startCozeId: string,
  position: { x: number; y: number },
  options?: BuildWinitOpenapiPluginNodeOptions
): Record<string, unknown> {
  const actionLiteral = options?.actionLiteral?.trim();
  const actionRef = options?.actionRef;
  const actionInput =
    actionLiteral && actionLiteral.length > 0
      ? { name: "action", input: { type: "string", value: actionLiteral } }
      : actionRef
        ? { name: "action", input: { value: { path: actionRef.path, ref_node: actionRef.ref_node } } }
        : { name: "action", input: { value: { path: "action", ref_node: startCozeId } } };

  const dataRef = options?.dataRef;
  const nodeTitle = options?.title?.trim() || "cobra_winit_openapi_request";
  const dataInput = dataRef
    ? { name: "data", input: { value: { path: dataRef.path, ref_node: dataRef.ref_node } } }
    : { name: "data", input: { value: { path: "data", ref_node: startCozeId } } };

  const node_inputs: Record<string, unknown>[] = [
    actionInput,
    { name: "customerCode", input: { value: { path: "customerCode", ref_node: startCozeId } } },
    { name: "customerName", input: { value: { path: "customerName", ref_node: startCozeId } } },
    dataInput,
    { name: "username", input: { value: { path: "username", ref_node: startCozeId } } },
    { name: "language", input: { value: { path: "language", ref_node: startCozeId } } },
  ];

  return {
    id: pluginCozeId,
    type: "plugin",
    title: nodeTitle,
    icon: "https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Plugin-v2.jpg",
    description: "Winit openapi 透传请求",
    position,
    parameters: {
      apiParam: WINIT_OPENAPI_PLUGIN_API_PARAM.map((row) => ({
        ...row,
        input: { ...row.input },
      })),
      node_inputs,
      node_outputs: {
        code: { type: "integer", required: true, value: null },
        data: { type: "string", required: true, value: null },
        msg: { type: "string", required: true, value: null },
      },
      settingOnError: {
        processType: 1,
        retryTimes: 0,
        timeoutMs: 180000,
      },
    },
  };
}
