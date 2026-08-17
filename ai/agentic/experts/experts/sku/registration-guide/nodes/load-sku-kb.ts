/**
 * 节点：load-sku-kb — 按 intentType 选择 KB 切片
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pickParts(
  intentType: string,
  bags: Record<string, string>
): { parts: string[]; scope: string } {
  switch (intentType) {
    case "expedite":
    case "audit_status":
      return { parts: [bags.kbExpedite, bags.kbRegister], scope: "expedite" };
    case "carriability":
      return { parts: [bags.kbCarriability, bags.kbRegister], scope: "carriability" };
    case "resubmit":
      return { parts: [bags.kbAuditResubmit, bags.kbRegister], scope: "resubmit" };
    case "direct_shipment":
      return { parts: [bags.kbDirectShipment], scope: "direct_shipment" };
    case "attribute_change":
      return { parts: [bags.kbAttributeChange], scope: "attribute_change" };
    case "unban":
      return { parts: [bags.kbUnban, bags.kbInboundBlocked], scope: "unban" };
    case "blocked_inbound":
      return { parts: [bags.kbInboundBlocked, bags.kbRegister], scope: "blocked_inbound" };
    case "register":
    case "modify":
    case "inactive":
      return { parts: [bags.kbRegister, bags.kbAuditResubmit], scope: "register" };
    default:
      return {
        parts: [
          bags.kbExpedite,
          bags.kbCarriability,
          bags.kbRegister,
          bags.kbAuditResubmit,
          bags.kbDirectShipment,
          bags.kbAttributeChange,
          bags.kbInboundBlocked,
          bags.kbUnban,
        ],
        scope: "full",
      };
  }
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const intentType = str(params.intentType) || "general";
  const normalizedTopic = str(params.normalizedTopic);
  const needInfoHint = str(params.needInfoHint);

  const bags = {
    kbExpedite: str(params.kbExpedite),
    kbCarriability: str(params.kbCarriability),
    kbRegister: str(params.kbRegister),
    kbAuditResubmit: str(params.kbAuditResubmit),
    kbDirectShipment: str(params.kbDirectShipment),
    kbAttributeChange: str(params.kbAttributeChange),
    kbInboundBlocked: str(params.kbInboundBlocked),
    kbUnban: str(params.kbUnban),
  };

  if (!validationOk) {
    return {
      kbContent: "",
      kbScope: "invalid",
      intentType,
      normalizedTopic,
    };
  }

  const { parts, scope } = pickParts(intentType, bags);
  let kbContent = parts.filter(Boolean).join("\n\n---\n\n");
  if (needInfoHint) {
    kbContent = `【缺参提示】needInfoHint=${needInfoHint}\n\n` + kbContent;
  }

  return {
    kbContent,
    kbScope: scope,
    intentType,
    normalizedTopic,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-sku-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
