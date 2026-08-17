/**
 * 节点：eval-overall-temperature — 基于 MKS 额度的库容温度
 * FaaS 单文件闭环，无外部 import。
 */

type Temperature = "green" | "yellow" | "orange" | "red" | "unknown";

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pctRemaining(total: number | null, remaining: number | null): number | null {
  if (total == null || remaining == null || total <= 0) return null;
  return remaining / total;
}

function quotaTemperature(totalCbm: number | null, remainingCbm: number | null): Temperature {
  const cbmPct = pctRemaining(totalCbm, remainingCbm);
  if (cbmPct == null) return "unknown";
  if (cbmPct < 0.05) return "red";
  if (cbmPct < 0.2) return "orange";
  if (cbmPct < 0.5) return "yellow";
  return "green";
}

function adviceFor(temp: Temperature, checkType: string): string[] {
  if (checkType === "slots") {
    return [
      "仓级 Slots 可约时间不在本专家查询范围",
      "请在万邑联平台预约送仓页面查看可约时段，或咨询 inbound-appointment-manage 操作指引",
    ];
  }

  const base: Record<Temperature, string[]> = {
    green: ["客户额度充裕，可正常安排入库"],
    yellow: ["客户额度偏紧，建议尽快安排入库并提前规划"],
    orange: ["客户额度紧张，建议拆批入库或申请额度扩容"],
    red: ["客户额度接近上限，建议换仓或扩容后再发", "请联系客服获取最新额度信息"],
    unknown: ["实时额度数据不可用，建议登录万邑联账户中心查看或联系客服"],
  };
  const lines = [...base[temp]];
  if (checkType === "cbm") lines.unshift("聚焦 CBM 额度维度");
  if (checkType === "sku") lines.unshift("聚焦 SKU 额度维度");
  return lines;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const mergedCapacity = (params.mergedCapacity ?? {}) as Record<string, unknown>;
  const quotaSnapshot = (mergedCapacity.quotaSnapshot ?? {}) as Record<string, unknown>;
  const checkType = String(mergedCapacity.checkType ?? "overall");
  const cargoProfile = mergedCapacity.cargoProfile as Record<string, unknown> | null;

  const totalCbm = num(quotaSnapshot.totalCbm);
  const remainingCbm = num(quotaSnapshot.remainingCbm);
  const quotaTemp = quotaTemperature(totalCbm, remainingCbm);

  let overallTemperature: Temperature =
    checkType === "slots" ? "unknown" : quotaTemp;

  if (checkType !== "slots" && cargoProfile && overallTemperature !== "red") {
    const needCbm = num(cargoProfile.cbmVolume);
    const needSku = num(cargoProfile.skuCount);
    if (needCbm != null && remainingCbm != null && needCbm > remainingCbm) overallTemperature = "red";
    const remainingSku = num(quotaSnapshot.remainingSkuSlots);
    if (needSku != null && remainingSku != null && needSku > remainingSku) overallTemperature = "red";
  }

  if (checkType !== "slots" && quotaSnapshot.apiAvailable !== true) {
    overallTemperature = "unknown";
  }

  return {
    overallTemperature,
    capacityAdvice: adviceFor(overallTemperature, checkType),
    quotaTemperature: quotaTemp,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("eval-overall-temperature")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
