import type {
  BranchingSpec,
  ChainItem,
  CozeExportConfig,
  TextNodeSpec,
  WinitOpenapiPluginConfig,
  WorkflowJson,
  WorkflowJsonNode,
} from "./types";

/** Coze 画布节点 id 映射用的逻辑键（须与 `nodeIds` / `positions` 一致） */
export function winitPluginLogicalKey(p: WinitOpenapiPluginConfig): string {
  return p.logicalId?.trim() || "winit_openapi_plugin";
}

/**
 * 在线性 workflow 节点序列中，于每个 `insertBefore` 目标之前按配置顺序插入对应插件逻辑 id。
 */
export function injectWinitPluginsIntoLinearOrder(
  workflowNodeIds: string[],
  plugins: WinitOpenapiPluginConfig[]
): string[] {
  const active = plugins.filter((p) => p.enabled);
  const byBefore = new Map<string, WinitOpenapiPluginConfig[]>();
  for (const p of active) {
    const arr = byBefore.get(p.insertBefore) ?? [];
    arr.push(p);
    byBefore.set(p.insertBefore, arr);
  }
  const out: string[] = [];
  for (const wid of workflowNodeIds) {
    const group = byBefore.get(wid);
    if (group) {
      for (const pl of group) {
        out.push(winitPluginLogicalKey(pl));
      }
    }
    out.push(wid);
  }
  return out;
}

export function buildChain(
  workflow: WorkflowJson,
  textNodes: TextNodeSpec[],
  branching?: BranchingSpec | null,
  winitOpenapiPlugins?: WinitOpenapiPluginConfig[]
): ChainItem[] {
  const active = (winitOpenapiPlugins ?? []).filter((p) => p.enabled);
  const byInsert = new Map<string, WinitOpenapiPluginConfig[]>();
  for (const p of active) {
    const list = byInsert.get(p.insertBefore) ?? [];
    list.push(p);
    byInsert.set(p.insertBefore, list);
  }

  const items: ChainItem[] = [{ kind: "start" }];
  for (const node of workflow.nodes) {
    const plugs = byInsert.get(node.id);
    if (plugs) {
      for (const pl of plugs) {
        items.push({ kind: "plugin", plugin: pl });
      }
    }
    items.push({ kind: "workflow", node });
    if (branching && branching.after === node.id) {
      items.push({ kind: "condition", spec: branching });
    }
    for (const t of textNodes) {
      if (t.insertAfter === node.id) {
        items.push({ kind: "text", spec: t });
      }
    }
  }
  items.push({ kind: "end" });
  return items;
}

export function chainLogicalKey(item: ChainItem): string {
  if (item.kind === "start") return "__start__";
  if (item.kind === "end") return "__end__";
  if (item.kind === "workflow") return item.node.id;
  if (item.kind === "condition") return item.spec.logicalId;
  if (item.kind === "plugin") return winitPluginLogicalKey(item.plugin);
  return item.spec.logicalId;
}

export function assignCozeNodeIds(
  chain: ChainItem[],
  config: CozeExportConfig
): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();

  const take = (logical: string, preferred?: string): string => {
    if (
      preferred &&
      !used.has(preferred) &&
      preferred !== "100001" &&
      preferred !== "900001"
    ) {
      used.add(preferred);
      map.set(logical, preferred);
      return preferred;
    }
    let n = 163000;
    while (used.has(String(n))) n++;
    const id = String(n);
    used.add(id);
    map.set(logical, id);
    return id;
  };

  const cfg = config.nodeIds ?? {};

  // Coze 要求开始 / 结束节点 id 固定为 100001、900001（与官方导出一致，不接受配置覆盖）
  map.set("__start__", "100001");
  used.add("100001");
  map.set("__end__", "900001");
  used.add("900001");

  for (const item of chain) {
    const key = chainLogicalKey(item);
    if (key === "__start__" || key === "__end__") continue;
    take(key, cfg[key]);
  }

  return map;
}

export type CozeEdge = {
  source_node: string;
  target_node: string;
  source_port?: string;
};

function buildSequentialEdges(chain: ChainItem[], idMap: Map<string, string>): CozeEdge[] {
  const edges: CozeEdge[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const a = chainLogicalKey(chain[i]!);
    const b = chainLogicalKey(chain[i + 1]!);
    edges.push({
      source_node: idMap.get(a)!,
      target_node: idMap.get(b)!,
    });
  }
  return edges;
}

/**
 * 在 `after` 后插入选择器：拆掉原 `after → after+1` 直连，改为 `after → condition`、各 `source_port → target`，再保留 `after+1` 起的线性边。
 */
export function buildEdgesWithBranching(
  workflow: WorkflowJson,
  idMap: Map<string, string>,
  branching: BranchingSpec,
  winitPlugins: WinitOpenapiPluginConfig[],
  branchOnlyNodeIds: string[] = []
): CozeEdge[] {
  const nodeIds = workflow.nodes.map((n) => n.id);
  const after = branching.after;
  const afterIdx = nodeIds.indexOf(after);
  if (afterIdx < 0) throw new Error(`branching.after "${after}" not found in workflow.json nodes`);
  if (afterIdx >= nodeIds.length - 1) {
    throw new Error(
      `branching.after "${after}" cannot be the last workflow node: there must be at least one following node for the linear tail (or adjust workflow order).`
    );
  }
  const condKey = branching.logicalId;
  const startId = idMap.get("__start__")!;
  const endId = idMap.get("__end__")!;
  const edges: CozeEdge[] = [];

  const prefixLinear = injectWinitPluginsIntoLinearOrder(nodeIds.slice(0, afterIdx + 1), winitPlugins);

  if (prefixLinear.length > 0) {
    const firstCoze = idMap.get(prefixLinear[0]!);
    if (!firstCoze) throw new Error(`branching: missing coze id for workflow key "${prefixLinear[0]}"`);
    edges.push({ source_node: startId, target_node: firstCoze });
    for (let i = 0; i < prefixLinear.length - 1; i++) {
      const a = idMap.get(prefixLinear[i]!);
      const b = idMap.get(prefixLinear[i + 1]!);
      if (!a || !b) {
        throw new Error(
          `branching: missing coze id for prefix step "${prefixLinear[i]}" -> "${prefixLinear[i + 1]}"`
        );
      }
      edges.push({ source_node: a, target_node: b });
    }
  }

  edges.push({
    source_node: idMap.get(after)!,
    target_node: idMap.get(condKey)!,
  });

  for (const r of branching.routes) {
    const tid = idMap.get(r.target);
    if (!tid) throw new Error(`branching route target "${r.target}" has no coze id`);
    edges.push({
      source_node: idMap.get(condKey)!,
      target_node: tid,
      source_port: r.port,
    });
  }

  for (const join of branching.joins ?? []) {
    const fromId = idMap.get(join.from);
    const toId = idMap.get(join.to);
    if (!fromId || !toId) {
      throw new Error(`branching.joins: missing coze id for "${join.from}" -> "${join.to}"`);
    }
    edges.push({ source_node: fromId, target_node: toId });
  }

  const branchOnly = new Set([
    ...(branching.joins ?? []).map((j) => j.from),
    ...branchOnlyNodeIds,
  ]);
  const tailLinear = injectWinitPluginsIntoLinearOrder(
    nodeIds.slice(afterIdx + 1).filter((id) => !branchOnly.has(id)),
    winitPlugins
  );

  for (let i = 0; i < tailLinear.length - 1; i++) {
    const a = idMap.get(tailLinear[i]!);
    const b = idMap.get(tailLinear[i + 1]!);
    if (!a || !b) {
      throw new Error(
        `branching: missing coze id for tail step "${tailLinear[i]}" -> "${tailLinear[i + 1]}"`
      );
    }
    edges.push({ source_node: a, target_node: b });
  }

  if (tailLinear.length > 0) {
    edges.push({
      source_node: idMap.get(tailLinear[tailLinear.length - 1]!)!,
      target_node: endId,
    });
  }

  return edges;
}

export function buildEdges(
  chain: ChainItem[],
  idMap: Map<string, string>,
  opts?: {
    workflow?: WorkflowJson;
    branching?: BranchingSpec | null;
    winitOpenapiPlugins?: WinitOpenapiPluginConfig[];
    branchOnlyNodeIds?: string[];
  }
): CozeEdge[] {
  const branching = opts?.branching;
  const workflow = opts?.workflow;
  const plugins = opts?.winitOpenapiPlugins ?? [];
  if (branching && workflow) {
    return buildEdgesWithBranching(
      workflow,
      idMap,
      branching,
      plugins,
      opts?.branchOnlyNodeIds ?? []
    );
  }
  return buildSequentialEdges(chain, idMap);
}

export function lastWorkflowNode(workflow: WorkflowJson): WorkflowJsonNode {
  const n = workflow.nodes[workflow.nodes.length - 1];
  if (!n) throw new Error("workflow.json has no nodes");
  return n;
}
