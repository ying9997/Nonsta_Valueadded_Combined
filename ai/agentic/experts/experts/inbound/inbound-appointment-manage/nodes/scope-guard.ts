/**
 * 节点：PSC / 链路 scope 守卫 — 标准头程等转介
 * FaaS 单文件闭环，无外部 import。
 */

const STANDARD_HEADWAY = /^OW01011/i;
const DIRECT_PSC = /^OW010(21|22|31|32)/i;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function firstOrder(rawOrderData: unknown): Record<string, unknown> | null {
  if (rawOrderData == null || typeof rawOrderData !== "object") return null;
  const list = (rawOrderData as { list?: unknown[] }).list;
  if (!Array.isArray(list) || list.length === 0) return null;
  const row = list[0];
  return row != null && typeof row === "object" ? (row as Record<string, unknown>) : null;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const routePath = str(params.routePath);
  const row = firstOrder(params.rawOrderData);
  const psc = str(row?.winitProductCode ?? row?.productCode);
  const orderNo = str(row?.orderNo ?? row?.inboundOrderNum);

  let guard: Record<string, unknown>;

  if (routePath === "kb_only" || !psc) {
    guard = {
      scopeAction: "answer",
      scopeNote: "",
      winitProductCode: psc,
      isStandardHeadway: false,
      referExpertId: "",
      orderNo,
    };
  } else if (STANDARD_HEADWAY.test(psc)) {
    guard = {
      scopeAction: "refer_process_guide",
      scopeNote: "标准头程（OW01011）通常由 Winit 安排送仓，客户无需提交预约单",
      winitProductCode: psc,
      isStandardHeadway: true,
      referExpertId: "inbound/inbound-process-guide",
      orderNo,
    };
  } else if (!DIRECT_PSC.test(psc)) {
    guard = {
      scopeAction: "refer_process_guide",
      scopeNote: `当前 PSC（${psc}）非直发预约链路，建议确认产品选型与送仓规则`,
      winitProductCode: psc,
      isStandardHeadway: false,
      referExpertId: "inbound/inbound-process-guide",
      orderNo,
    };
  } else {
    guard = {
      scopeAction: "answer",
      scopeNote: "",
      winitProductCode: psc,
      isStandardHeadway: false,
      referExpertId: "",
      orderNo,
    };
  }

  return { scopeGuard: guard, ...guard };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("scope-guard")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
