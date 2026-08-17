/** 与线上编排读表约定一致：仅从环境变量读取，勿在仓库中提交密钥。 */

export interface FeishuBitableEnv {
  appId: string;
  appSecret: string;
  appToken: string;
  tableId: string;
}

export function requireFeishuEnv(): FeishuBitableEnv {
  const appId = (process.env.FEISHU_APP_ID ?? "").trim();
  const appSecret = (process.env.FEISHU_APP_SECRET ?? "").trim();
  const appToken = (process.env.FEISHU_BITABLE_APP_TOKEN ?? "").trim();
  const tableId = (process.env.FEISHU_BITABLE_TABLE_ID ?? "").trim();
  if (!appId || !appSecret || !appToken || !tableId) {
    throw new Error(
      "缺少飞书配置：请设置 FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_BITABLE_APP_TOKEN、FEISHU_BITABLE_TABLE_ID"
    );
  }
  return { appId, appSecret, appToken, tableId };
}
