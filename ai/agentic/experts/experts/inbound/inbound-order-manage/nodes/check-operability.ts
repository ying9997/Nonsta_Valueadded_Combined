/**
 * 节点：check-operability — 基于状态码判断 modify/close/cancel 可操作性
 * FaaS 单文件闭环，无外部 import。
 */

type OrderIntent = "create" | "modify" | "close" | "cancel" | "general";

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

const CANCEL_RULES: Record<string, { operable: boolean; note: string }> = {
  OD: { operable: true, note: "草稿状态，客户可在万邑联平台自行取消" },
  TS: { operable: false, note: "在途状态，视物流安排可能可取消，建议联系客服确认" },
  PEWC: { operable: false, note: "已到仓验货中，通常不可在线取消，需联系仓库运营人工处理" },
  EWC: { operable: false, note: "验收完成，通常不可在线取消，需联系仓库运营人工处理" },
  SHD: { operable: false, note: "已上架完成，不可取消" },
};

const MODIFY_RULES: Record<string, { operable: boolean; note: string }> = {
  OD: { operable: true, note: "草稿状态，可修改箱单/SKU/数量等（直发海外验已下单状态可修改）" },
  TS: { operable: false, note: "在途状态，修改范围有限；目的仓修改需运营介入" },
  PEWC: { operable: false, note: "已到仓，修改截止；自验直发验货中仅可减少商品" },
  EWC: { operable: false, note: "验收完成，不可修改箱单" },
  SHD: { operable: false, note: "已上架，不可修改" },
};

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = str(params.intent) as OrderIntent;
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];
  const order = (list[0] ?? {}) as Record<string, unknown>;

  const currentStatus = str(order.status).toUpperCase() || "UNKNOWN";
  const orderNo = str(order.orderNo ?? order.inboundOrderNum ?? params.inboundOrderNo);
  const destWhCode = str(order.destWhCode);

  if (intent === "create" || intent === "general") {
    return {
      isOperable: true,
      blockReason: "",
      currentStatus: currentStatus || null,
      orderNo,
      destWhCode,
      operabilityNote: "create/general 意图无需状态校验",
    };
  }

  const rules = intent === "modify" ? MODIFY_RULES : CANCEL_RULES;
  const rule = rules[currentStatus] ?? {
    operable: false,
    note: `状态 ${currentStatus} 可操作性未知，建议联系客服确认`,
  };

  return {
    isOperable: rule.operable,
    blockReason: rule.operable ? "" : rule.note,
    currentStatus,
    orderNo,
    destWhCode,
    operabilityNote: rule.note,
    riskNotes: intent === "close" || intent === "cancel"
      ? ["已发出货物无法召回，关闭前请谨慎确认", rule.note]
      : [rule.note],
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("check-operability")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
