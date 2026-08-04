/**
 * 节点：load-barcode-kb — 按 intentType 选择 KB 切片
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pickParts(
  intentType: string,
  bags: Record<string, string>
): { parts: string[]; scope: string } {
  switch (intentType) {
    case "print":
      return { parts: [bags.kbPrint], scope: "print" };
    case "third_party_add":
      return { parts: [bags.kbThirdPartyAdd, bags.kbThirdPartyQuery], scope: "third_party_add" };
    case "third_party_delete":
      return {
        parts: [bags.kbThirdPartyDelete, bags.kbThirdPartyQuery],
        scope: "third_party_delete",
      };
    case "third_party_query":
      return { parts: [bags.kbThirdPartyQuery], scope: "third_party_query" };
    case "scan_fail":
      return {
        parts: [bags.kbScanFail, bags.kbThirdPartyAdd, bags.kbPrint],
        scope: "scan_fail",
      };
    default:
      return {
        parts: [
          bags.kbPrint,
          bags.kbThirdPartyAdd,
          bags.kbThirdPartyDelete,
          bags.kbThirdPartyQuery,
          bags.kbScanFail,
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
    kbPrint: str(params.kbPrint),
    kbThirdPartyAdd: str(params.kbThirdPartyAdd),
    kbThirdPartyDelete: str(params.kbThirdPartyDelete),
    kbThirdPartyQuery: str(params.kbThirdPartyQuery),
    kbScanFail: str(params.kbScanFail),
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

if (typeof process !== "undefined" && process.argv[1]?.includes("load-barcode-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
