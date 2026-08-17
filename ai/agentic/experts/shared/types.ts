/**
 * 专家系统共享类型定义
 * 与 design-spec 中的上下文结构保持一致
 */

export interface InputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

export interface OutputContext {
  expertId: string;
  resultSummary: string;
  chainId?: string;
}

export interface ExpertManifest {
  id: string;
  /** 业务域（与 id 组成 enrichedContext 域索引键 `{domain}/{id}`），见 design-spec §8 */
  domain?: string;
  description: string;
  capabilities?: string[];
  version?: string;
  /**
   * 仅描述**业务**入参（`manifest.inputSchema.properties`）。
   * 完整调用 JSON 另有框架顶层：`query`、`customerIntent`、`inputContext` 与 `inputs`（对象，其字段与本 schema 一致）；见 design-spec §6。
   */
  inputSchema: object;
  outputSchema: object;
}
