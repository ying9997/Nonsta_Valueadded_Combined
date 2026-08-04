/**
 * 节点：load-booking-kb — 按 intent / 送仓方式拼接预约 KB
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function hasLookupHint(text: string): boolean {
  return /\bWI\d+/i.test(text) || /预约单|booking/i.test(text);
}

function extractSections(kb: string, sectionTitles: string[]): string {
  if (!kb.trim()) return "";
  const blocks = kb.split(/\n(?=## )/);
  const picked: string[] = [];
  for (const block of blocks) {
    const titleLine = block.split("\n")[0] ?? "";
    const title = titleLine.replace(/^##\s*/, "").trim();
    if (sectionTitles.some((t) => title.includes(t) || t.includes(title))) {
      picked.push(block.trim());
    }
  }
  return picked.length > 0 ? picked.join("\n\n") : kb;
}

function sopForDeliveryWay(kbSop: string, hint: string): string {
  const key = hint.toUpperCase();
  if (key === "EXPRESS" || key === "COURIER" || key.includes("快递")) {
    return extractSections(kbSop, ["Express", "快递", "通用说明"]);
  }
  if (key === "FCL" || key.includes("整柜")) {
    return extractSections(kbSop, ["FCL", "整柜", "通用说明", "合并预约"]);
  }
  if (key === "LCL" || key.includes("散货")) {
    return extractSections(kbSop, ["LCL", "散货", "通用说明", "合并预约"]);
  }
  return kbSop;
}

function pickKbParts(
  intent: string,
  deliveryWayHint: string,
  kbBookingSop: string,
  kbBookingRules: string,
  kbPenaltyRules: string,
  kbSplitShipment: string,
  kbPremiumBooking: string,
  kbBookingApiRef: string,
  kbPodDownloadGuide: string,
  queryText: string
): { parts: string[]; scope: string } {
  const wantsPremium = /增值|付费预约|premium/i.test(queryText);

  switch (intent) {
    case "create_guide": {
      const sop = sopForDeliveryWay(kbBookingSop, deliveryWayHint);
      const apiHint = extractSections(kbBookingApiRef, ["API 链路", "核心业务规则", "FCL 必填"]);
      const parts = [sop];
      if (apiHint) parts.push(apiHint);
      return {
        parts,
        scope: deliveryWayHint ? `create_guide:${deliveryWayHint}` : "create_guide",
      };
    }
    case "modify_guide":
      return {
        parts: [extractSections(kbBookingRules, ["修改", "变更"]), extractSections(kbBookingSop, ["通用说明"])],
        scope: "modify_guide",
      };
    case "cancel_guide":
      return {
        parts: [
          extractSections(kbBookingRules, ["取消", "免费取消"]),
          extractSections(kbPenaltyRules, ["已预约未到仓", "超时取消"]),
        ],
        scope: "cancel_guide",
      };
    case "split_shipment":
      return {
        parts: [kbSplitShipment, extractSections(kbBookingSop, ["合并预约", "通用说明"])],
        scope: "split_shipment",
      };
    case "penalty": {
      const parts = [kbPenaltyRules];
      if (wantsPremium) parts.push(kbPremiumBooking);
      parts.push(extractSections(kbBookingSop, ["Express", "快递", "仓内上架"]));
      return { parts, scope: wantsPremium ? "penalty:premium" : "penalty" };
    }
    case "query":
      return {
        parts: [
          extractSections(kbBookingApiRef, ["预约状态码", "API 链路"]),
          extractSections(kbBookingRules, ["预约状态", "提前预约", "修改"]),
          extractSections(kbBookingSop, ["通用说明"]),
        ],
        scope: "query",
      };
    case "pod_guide":
      return {
        parts: [
          kbPodDownloadGuide,
          extractSections(kbBookingApiRef, ["Step 6", "B.6", "预约状态码"]),
          extractSections(kbBookingRules, ["预约状态"]),
        ],
        scope: hasLookupHint(queryText) ? "pod_guide:with_lookup" : "pod_guide",
      };
    default:
      return { parts: [kbBookingSop, kbBookingRules], scope: "full" };
  }
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = str(params.intent) || "create_guide";
  const deliveryWayHint = str(params.deliveryWayHint);
  const warehouseCode = str(params.warehouseCode);
  const routePath = str(params.routePath);
  const query = str(params.query);

  const { parts, scope } = pickKbParts(
    intent,
    deliveryWayHint,
    str(params.kbBookingSop),
    str(params.kbBookingRules),
    str(params.kbPenaltyRules),
    str(params.kbSplitShipment),
    str(params.kbPremiumBooking),
    str(params.kbBookingApiRef),
    str(params.kbPodDownloadGuide),
    query
  );

  const kbParts = parts.filter(Boolean);
  if (warehouseCode) {
    kbParts.push(`## 仓库上下文\n查询/指引涉及仓库：${warehouseCode}`);
  }

  return {
    kbContent: kbParts.join("\n\n---\n\n"),
    kbScope: `${scope}:${routePath || "default"}`,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-booking-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
