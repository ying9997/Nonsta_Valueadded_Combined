/**
 * 生成「仅含开始 → cobra_winit_openapi_request 插件 → 结束」的 Coze 工作流包，
 * 供本地代码经 POST /v1/workflow/run 调用万邑通 OpenAPI（与 arithmetic-formula 等专家一致）。
 *
 * 画布形态参考：docs/coze-reference/winit_openapi_call-draft.yaml
 */

import * as fs from "fs";
import * as pathMod from "path";
import { stringifyDraftWorkflowYml, stringifyManifestYml } from "./emit";
import { normalizeCozeWorkflowName, normalizeYamlBasename } from "./config";
import { WORKFLOW_PACKAGE_ICON } from "./icons";
import {
  buildWinitOpenapiPluginNode,
  WINIT_OPENAPI_PLUGIN_NODE_ID,
  WINIT_OPENAPI_STANDALONE_START_NODE_OUTPUTS,
} from "./winit-openapi-plugin-shared";

/** 重新导出：CLI 与文档引用 */
export { WINIT_OPENAPI_PLUGIN_API_PARAM, WINIT_OPENAPI_PLUGIN_NODE_ID } from "./winit-openapi-plugin-shared";

/** 与参考导出一致；若与线上一致请通过 CLI --workflow-id 覆盖 */
export const WINIT_OPENAPI_PROXY_DEFAULT_WORKFLOW_ID = "7623329033350168611";

export interface WinitOpenapiProxyEmitOptions {
  /** Coze 工作流 / MANIFEST main.id，与 draft 根级 id 一致 */
  workflowId: string;
  /** draft 内 `name` 与包名（仅 `_`） */
  packageMainName: string;
  /** MANIFEST / draft 描述 */
  packageDescription: string;
  /** draft 文件名，如 winit_openapi_call-draft.yaml */
  yamlBasename: string;
  /** 插件节点 Coze id（字符串） */
  pluginNodeId: string;
  icon?: string;
}

export function defaultWinitOpenapiProxyEmitOptions(
  overrides: Partial<WinitOpenapiProxyEmitOptions> = {}
): WinitOpenapiProxyEmitOptions {
  const packageMainName = normalizeCozeWorkflowName(overrides.packageMainName ?? "winit_openapi_call");
  const yamlBasename = normalizeYamlBasename(overrides.yamlBasename ?? `${packageMainName}-draft.yaml`);
  return {
    workflowId: overrides.workflowId ?? WINIT_OPENAPI_PROXY_DEFAULT_WORKFLOW_ID,
    packageMainName,
    packageDescription: overrides.packageDescription ?? "Winit openapi 透传（cobra_winit_openapi_request）",
    yamlBasename,
    pluginNodeId: overrides.pluginNodeId ?? WINIT_OPENAPI_PLUGIN_NODE_ID,
    icon: overrides.icon ?? WORKFLOW_PACKAGE_ICON,
  };
}

function startNode(): Record<string, unknown> {
  return {
    id: "100001",
    type: "start",
    title: "开始",
    icon: "https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Start-v2.jpg",
    description: "工作流的起始节点，用于设定启动工作流需要的信息",
    position: { x: 17, y: 2.4994999999999976 },
    parameters: {
      node_outputs: { ...WINIT_OPENAPI_STANDALONE_START_NODE_OUTPUTS },
    },
  };
}

function endNode(pluginId: string): Record<string, unknown> {
  return {
    id: "900001",
    type: "end",
    title: "结束",
    icon: "https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-End-v2.jpg",
    description: "工作流的最终节点，用于返回工作流运行后的结果信息",
    position: { x: 893, y: -10.500500000000002 },
    parameters: {
      node_inputs: [
        {
          name: "code",
          input: { type: "string", value: { path: "code", ref_node: pluginId } },
        },
        {
          name: "data",
          input: { type: "string", value: { path: "data", ref_node: pluginId } },
        },
        {
          name: "msg",
          input: { type: "string", value: { path: "msg", ref_node: pluginId } },
        },
      ],
      terminatePlan: "returnVariables",
    },
  };
}

/**
 * 生成 MANIFEST + draft 文档对象（再经 stringifyManifestYml / stringifyDraftWorkflowYml 写出）。
 */
export function buildWinitOpenapiProxyCozeDocs(opts: WinitOpenapiProxyEmitOptions): {
  manifestDoc: Record<string, unknown>;
  draftDoc: Record<string, unknown>;
} {
  const pid = opts.pluginNodeId;
  const pluginBody = buildWinitOpenapiPluginNode(pid, "100001", {
    x: 459,
    y: -10.500500000000002,
  });
  const draftDoc: Record<string, unknown> = {
    schema_version: "1.0.0",
    name: opts.packageMainName,
    id: opts.workflowId,
    description: opts.packageDescription,
    mode: "workflow",
    icon: opts.icon ?? WORKFLOW_PACKAGE_ICON,
    nodes: [startNode(), endNode(pid), pluginBody],
    edges: [
      { source_node: "100001", target_node: pid },
      { source_node: pid, target_node: "900001" },
    ],
  };

  const manifestDoc: Record<string, unknown> = {
    type: "Workflow",
    version: "1.0.0",
    main: {
      id: opts.workflowId,
      name: opts.packageMainName,
      desc: opts.packageDescription,
      icon: opts.icon ?? WORKFLOW_PACKAGE_ICON,
      version: "",
      flowMode: 0,
      commitId: "",
    },
    sub: [],
  };

  return { manifestDoc, draftDoc };
}

/** 写出 MANIFEST.yml 与 workflow/<yamlBasename> 到 `outRoot/workflow/` */
export function writeWinitOpenapiProxyCozePackage(outRoot: string, opts: WinitOpenapiProxyEmitOptions): void {
  const { manifestDoc, draftDoc } = buildWinitOpenapiProxyCozeDocs(opts);
  const workflowRoot = pathMod.join(outRoot, "workflow");
  const inner = pathMod.join(workflowRoot, "workflow");
  fs.mkdirSync(inner, { recursive: true });
  fs.writeFileSync(pathMod.join(workflowRoot, "MANIFEST.yml"), stringifyManifestYml(manifestDoc), "utf-8");
  fs.writeFileSync(
    pathMod.join(inner, opts.yamlBasename),
    stringifyDraftWorkflowYml(draftDoc),
    "utf-8"
  );
}
