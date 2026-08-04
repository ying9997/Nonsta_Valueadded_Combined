/**
 * 节点：load-order-kb — 按 intent 选择性拼接 KB SOP
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type OrderIntent = "create" | "modify" | "close" | "cancel" | "general";

function pickKbParts(
  intent: OrderIntent,
  kbCreate: string,
  kbModify: string,
  kbClose: string
): { parts: string[]; scope: string } {
  switch (intent) {
    case "create":
      return { parts: [kbCreate], scope: "create" };
    case "modify":
      return { parts: [kbModify, kbCreate], scope: "modify" };
    case "close":
    case "cancel":
      return { parts: [kbClose, kbModify], scope: "close-cancel" };
    default:
      return { parts: [kbCreate, kbModify, kbClose], scope: "full" };
  }
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const intent = (str(params.intent) || "general") as OrderIntent;
  const kbCreate = str(params.kbOrderCreate);
  const kbModify = str(params.kbOrderModify);
  const kbClose = str(params.kbOrderClose);
  const enabledProducts = Array.isArray(params.enabledProducts)
    ? (params.enabledProducts as unknown[]).map(String)
    : [];
  const targetWarehouseCode = str(params.targetWarehouseCode);
  const targetPsc = str(params.targetPsc);

  if (!validationOk) {
    return {
      kbContent: "",
      kbScope: "invalid",
      intent,
      pscContext: "",
    };
  }

  const { parts, scope } = pickKbParts(intent, kbCreate, kbModify, kbClose);
  const kbContent = parts.filter(Boolean).join("\n\n---\n\n");

  let pscContext = "";
  if (enabledProducts.length > 0) {
    pscContext = `上游 PSC 快照 enabledProducts: ${enabledProducts.join(", ")}`;
  } else if (targetPsc) {
    pscContext = `客户指定 targetPsc: ${targetPsc}`;
  } else {
    pscContext = "无 PSC 快照，输出通用选型指引";
  }

  if (targetWarehouseCode) {
    pscContext += `；目的仓: ${targetWarehouseCode}`;
  }

  return {
    kbContent,
    kbScope: scope,
    intent,
    pscContext,
    enabledProducts,
    targetWarehouseCode,
    targetPsc,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-order-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
