/**
 * 节点：为 `queryOutboundOrderList` 组装插件批处理动作
 *
 * 规则：
 * - WO 主单号：仅 1 个动作（outboundOrderNum）
 * - 非 WO（模糊单号）：2 个动作（trackingNo 优先 + sellerOrderNo 兜底）
 */

const PLUGIN_BATCH_MAX_ACTIONS_DEFAULT = 100;

function getPluginBatchMaxActions(): number {
  if (typeof process !== "undefined" && process.env?.COZE_WINIT_PLUGIN_BATCH_MAX) {
    const n = Number(process.env.COZE_WINIT_PLUGIN_BATCH_MAX);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return PLUGIN_BATCH_MAX_ACTIONS_DEFAULT;
}

/** WO + 数字；末尾连续字母为子单后缀 */
function normalizeWoMainOrderNum(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const m = /^WO(\d+)[A-Za-z]*$/i.exec(s);
  if (m) return `WO${m[1]}`;
  return s;
}

function isWoOutboundToken(raw: string): boolean {
  return /^WO\d+/i.test(raw.trim());
}

function uniqueTokens(rawNos: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of rawNos) {
    const c = isWoOutboundToken(o) ? normalizeWoMainOrderNum(o) : o.trim();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

function defaultListDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function getListDateRange(): { start: string; end: string } {
  if (typeof process !== "undefined" && process.env) {
    const s = process.env.COZE_WINIT_LIST_DATE_START;
    const e = process.env.COZE_WINIT_LIST_DATE_END;
    if (s && e) return { start: s, end: e };
  }
  return defaultListDateRange();
}

function getListPageSize(): number {
  const n = Number(typeof process !== "undefined" ? process.env?.COZE_WINIT_LIST_PAGE_SIZE : undefined);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 50;
}

type ActionPlan = {
  inputToken: string;
  queryBy: "outboundOrderNum" | "trackingNo" | "sellerOrderNo";
};

function buildListDataByField(
  queryBy: ActionPlan["queryBy"],
  token: string,
  common: { dateOrderedStartDate: string; dateOrderedEndDate: string; pageSize: number; pageNum: number }
): Record<string, string> {
  const data: Record<string, string> = {
    dateOrderedStartDate: common.dateOrderedStartDate,
    dateOrderedEndDate: common.dateOrderedEndDate,
    pageSize: String(common.pageSize),
    pageNum: String(common.pageNum),
  };
  if (queryBy === "outboundOrderNum") data.outboundOrderNum = normalizeWoMainOrderNum(token);
  if (queryBy === "trackingNo") data.trackingNo = token.trim();
  if (queryBy === "sellerOrderNo") data.sellerOrderNo = token.trim();
  return data;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawNos = ((params.outboundOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const outboundOrderNos = uniqueTokens(rawNos);
  const maxActions = getPluginBatchMaxActions();
  const range = getListDateRange();
  const pageSize = getListPageSize();

  const actionPlans: ActionPlan[] = [];
  for (const token of outboundOrderNos) {
    if (isWoOutboundToken(token)) {
      actionPlans.push({ inputToken: token, queryBy: "outboundOrderNum" });
    } else {
      // 模糊单号：trackingNo 优先，sellerOrderNo 兜底
      actionPlans.push({ inputToken: token, queryBy: "trackingNo" });
      actionPlans.push({ inputToken: token, queryBy: "sellerOrderNo" });
    }
  }
  const forPlugin = actionPlans.slice(0, maxActions);

  const common = {
    dateOrderedStartDate: range.start,
    dateOrderedEndDate: range.end,
    pageSize,
    pageNum: 1,
  };

  const actions = forPlugin.map((p) => ({
    action: "queryOutboundOrderList",
    data: JSON.stringify(buildListDataByField(p.queryBy, p.inputToken, common)),
  }));

  return {
    actions,
    actionPlans: forPlugin,
    winitPluginBatchActionsCount: actions.length,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-outbound-primary-winit")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
