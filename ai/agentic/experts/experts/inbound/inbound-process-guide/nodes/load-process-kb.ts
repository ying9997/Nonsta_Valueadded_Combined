/**
 * 节点：load-process-kb — 按 intentType 选择性拼接 KB 语料
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function filterByKeywords(content: string, keywords: string[]): string {
  if (!content || keywords.length === 0) return content;
  const lines = content.split("\n");
  const hits = new Set<number>();
  const lowerKeywords = keywords.map((k) => k.toLowerCase()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (lowerKeywords.some((k) => line.includes(k))) {
      const isHeading = /^#{1,3}\s/.test(lines[i]);
      const before = isHeading ? 0 : 3;
      const after = isHeading ? 12 : 6;
      for (let j = Math.max(0, i - before); j <= Math.min(lines.length - 1, i + after); j++) {
        hits.add(j);
      }
    }
  }

  if (hits.size === 0) return content;
  const sorted = Array.from(hits).sort((a, b) => a - b);
  const minLines = Math.min(40, lines.length);
  if (sorted.length < minLines && lines.length > minLines * 2) {
    return content;
  }
  return sorted.map((i) => lines[i]).join("\n");
}

function pickKbParts(
  intentType: string,
  kbProcess: string,
  kbFees: string,
  kbRestrictions: string
): { parts: string[]; scope: string } {
  switch (intentType) {
    case "fee":
      return { parts: [kbFees, kbProcess], scope: "fee+process" };
    case "prohibition":
      return { parts: [kbRestrictions], scope: "restrictions" };
    case "rule":
      return { parts: [kbRestrictions, kbProcess], scope: "rules+process" };
    case "psc_select":
      return { parts: [kbProcess, kbRestrictions], scope: "psc+rules" };
    case "process":
      return { parts: [kbProcess], scope: "process" };
    default:
      return { parts: [kbProcess, kbFees, kbRestrictions], scope: "full" };
  }
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const intentType = str(params.intentType) || "general";
  const normalizedTopic = str(params.normalizedTopic);
  const country = str(params.country);
  const productLine = str(params.productLine) || str(params.pscCode);
  const subTopic = str(params.subTopic);

  const kbProcess = str(params.kbProcess);
  const kbFees = str(params.kbFees);
  const kbRestrictions = str(params.kbRestrictions);

  if (!validationOk) {
    return {
      kbContent: "",
      kbScope: "invalid",
      intentType,
      normalizedTopic,
    };
  }

  const { parts, scope } = pickKbParts(intentType, kbProcess, kbFees, kbRestrictions);
  const keywords = [normalizedTopic, subTopic, country, productLine]
    .join(" ")
    .split(/[\s,，、/]+/)
    .filter((w) => w.length >= 2);

  const filteredParts = parts.filter(Boolean).map((p) => filterByKeywords(p, keywords));
  const kbContent = filteredParts.join("\n\n---\n\n");

  return {
    kbContent: kbContent || parts.filter(Boolean).join("\n\n---\n\n"),
    kbScope: `${scope}${country ? `:${country}` : ""}${productLine ? `:psc-${productLine}` : ""}`,
    intentType,
    normalizedTopic,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-process-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
