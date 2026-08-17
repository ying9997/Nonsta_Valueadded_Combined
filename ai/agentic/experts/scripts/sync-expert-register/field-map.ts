/**
 * 逻辑字段名 → 飞书多维表格 API `field_name`。
 * 若你表中的列名不同，只改右侧字符串；左侧逻辑名供 record-builder 使用。
 */
export const FIELD_MAP: Record<string, string> = {
  expert_id: "expert_id",
  /** 文本列：与 expert_id 组成登记主键，格式见 normalize-ver.ts */
  ver: "ver",
  /** 一次发布批次，与 get-expert-registry params.release_id 对齐 */
  release_id: "release_id",
  name: "name",
  detail: "detail",
  runtime: "runtime",
  local_repo_path: "local_repo_path",
  invoke_url: "invoke_url",
  // coze_workflow_id：本地 coze.config / 默认哈希非线上真实 ID，不同步到表；需线上 ID 时请人工填表
  /** 多行文本，完整 manifest JSON；飞书列 API 名为 manifest */
  manifest: "manifest",
  inputSchema: "inputSchema",
  outputSchema: "outputSchema",
  /** 多行文本：input/output schema 可读摘要 */
  io: "io",
};

export function feishuFieldNameForExpertId(): string {
  return FIELD_MAP.expert_id ?? "expert_id";
}

export function feishuFieldNameForVer(): string {
  return FIELD_MAP.ver ?? "ver";
}

export function feishuFieldNameForReleaseId(): string {
  return FIELD_MAP.release_id ?? "release_id";
}

const ALLOW_EMPTY_STRING = new Set(["expert_id", "invoke_url"]);

export function applyFieldMap(logical: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [logicalKey, feishuName] of Object.entries(FIELD_MAP)) {
    const name = feishuName.trim();
    if (!name) continue;
    if (!(logicalKey in logical)) continue;
    const v = logical[logicalKey];
    if (v === undefined) continue;
    if (v === "" && !ALLOW_EMPTY_STRING.has(logicalKey)) continue;
    out[name] = v;
  }
  return out;
}
