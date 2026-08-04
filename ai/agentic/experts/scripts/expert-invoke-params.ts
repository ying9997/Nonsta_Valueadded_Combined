const FRAMEWORK_TOP_KEYS = [
  "query",
  "customerIntent",
  "inputContext",
  "customerCode",
  "customerName",
  "username",
  "language",
] as const;

/**
 * 将专家调用边界（顶层框架字段 + `inputs` 业务对象）
 * 归并为工作流节点使用的扁平 `params`（与 Coze 各节点入参名一致）。
 * 兼容旧版全扁平 JSON（业务字段在顶层且无 `inputs`）。
 *
 * **`data`**（万邑通请求体）若在 JSON 顶层出现，会并入 `params`（向后兼容旧脚本；专家主流程应由内置节点拼装，见 design-spec §6）。
 * **`action`** 不应由调用方从顶层传入，由代码节点默认值或 Coze 插件字面量决定。
 */
export function normalizeExpertInvokeParams(initialParams: Record<string, unknown>): Record<string, unknown> {
  const inputsRaw = initialParams.inputs;
  const fromInputs =
    inputsRaw !== undefined &&
    inputsRaw !== null &&
    typeof inputsRaw === "object" &&
    !Array.isArray(inputsRaw)
      ? { ...(inputsRaw as Record<string, unknown>) }
      : {};

  const frameworkPick: Record<string, unknown> = {};
  for (const k of FRAMEWORK_TOP_KEYS) {
    if (Object.prototype.hasOwnProperty.call(initialParams, k)) {
      frameworkPick[k] = initialParams[k];
    }
  }

  const merged: Record<string, unknown> = { ...fromInputs, ...frameworkPick };

  for (const [k, v] of Object.entries(initialParams)) {
    if (k === "inputs") continue;
    if ((FRAMEWORK_TOP_KEYS as readonly string[]).includes(k)) continue;
    if (!Object.prototype.hasOwnProperty.call(merged, k)) {
      merged[k] = v;
    }
  }

  return merged;
}
