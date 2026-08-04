/**
 * 节点：load-compliance-kb — 按 intentType 选择 KB 切片
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pickParts(
  intentType: string,
  bags: Record<string, string>
): { parts: string[]; scope: string } {
  switch (intentType) {
    case "carriability_deep":
      return {
        parts: [bags.kbCarriabilityDeep, bags.kbRestricted],
        scope: "carriability_deep",
      };
    case "restricted":
      return { parts: [bags.kbRestricted, bags.kbCertificates], scope: "restricted" };
    case "certificates":
      return { parts: [bags.kbCertificates, bags.kbUnbanDeep], scope: "certificates" };
    case "weee":
      return { parts: [bags.kbWeee, bags.kbCertificates], scope: "weee" };
    case "ecommerce":
      return { parts: [bags.kbEcommerce, bags.kbDeclaration], scope: "ecommerce" };
    case "brand":
      return { parts: [bags.kbBrand], scope: "brand" };
    case "unban_deep":
      return {
        parts: [bags.kbUnbanDeep, bags.kbCertificates, bags.kbRestricted],
        scope: "unban_deep",
      };
    case "declaration":
      return { parts: [bags.kbDeclaration, bags.kbEcommerce], scope: "declaration" };
    default:
      return {
        parts: [
          bags.kbCarriabilityDeep,
          bags.kbRestricted,
          bags.kbCertificates,
          bags.kbWeee,
          bags.kbEcommerce,
          bags.kbBrand,
          bags.kbUnbanDeep,
          bags.kbDeclaration,
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
    kbCarriabilityDeep: str(params.kbCarriabilityDeep),
    kbRestricted: str(params.kbRestricted),
    kbCertificates: str(params.kbCertificates),
    kbWeee: str(params.kbWeee),
    kbEcommerce: str(params.kbEcommerce),
    kbBrand: str(params.kbBrand),
    kbUnbanDeep: str(params.kbUnbanDeep),
    kbDeclaration: str(params.kbDeclaration),
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

if (typeof process !== "undefined" && process.argv[1]?.includes("load-compliance-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
