/**
 * 节点：load-psc-kb — 从 kb-psc-products 语料提取 PSC 编码对照
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseCodeMap(kb: string): Record<string, { name: string; inspectionType: string; scene: string }> {
  const map: Record<string, { name: string; inspectionType: string; scene: string }> = {};
  const rowPattern = /\|\s*(OW01\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/g;
  let m: RegExpExecArray | null;
  while ((m = rowPattern.exec(kb)) !== null) {
    const code = m[1].trim().toUpperCase();
    map[code] = {
      name: m[2].trim(),
      inspectionType: m[3].trim(),
      scene: m[4].trim(),
    };
  }
  return map;
}

function filterKbByKeywords(kb: string, keywords: string[]): string {
  if (!kb || keywords.length === 0) return kb;
  const lines = kb.split("\n");
  const hits = new Set<number>();
  const lowerKeywords = keywords.map((k) => k.toLowerCase()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (lowerKeywords.some((k) => line.includes(k))) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 2); j++) hits.add(j);
    }
  }
  if (hits.size === 0) return kb;
  return Array.from(hits)
    .sort((a, b) => a - b)
    .map((i) => lines[i])
    .join("\n");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const kbPscProducts = str(params.kbPscProducts);
  const productLine = str(params.productLine);
  const country = str(params.country);
  const keywords = [productLine, country].filter(Boolean);
  const filteredKb = filterKbByKeywords(kbPscProducts, keywords);
  const pscCodeMap = parseCodeMap(kbPscProducts);

  return {
    pscCodeMap,
    kbScope: productLine ? `psc:${productLine}` : country ? `country:${country}` : "full",
    kbExcerpt: filteredKb.slice(0, 8000),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-psc-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
