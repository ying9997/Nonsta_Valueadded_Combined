/**
 * 节点：load-warehouse-kb — 按 queryType / warehouseCode / country / topic 过滤 KB 语料
 * FaaS 单文件闭环，无外部 import。kbWarehouse 由 coze.config.yml textNode 注入。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function extractSection(kb: string, heading: string): string {
  const pattern = new RegExp(`##\\s+${heading}[\\s\\S]*?(?=\\n##\\s+|$)`, "i");
  const m = kb.match(pattern);
  return m ? m[0].trim() : "";
}

function filterWarehouseSections(
  kb: string,
  warehouseCode: string,
  country: string,
  queryType: string,
  topic: string
): string {
  const parts: string[] = [];

  const index = extractSection(kb, "仓库编码索引");
  if (index) parts.push(index);

  if (topic === "capabilities" || topic === "type" || topic === "all") {
    const matrix = extractSection(kb, "各仓可接商品类型矩阵");
    if (matrix) parts.push(matrix);
    if (topic === "capabilities" || topic === "all") {
      const zones = kb.match(/### 库存属性与存放分区[\s\S]*?(?=\n---|\n##\s+|$)/);
      if (zones) parts.push(zones[0].trim());
    }
  }

  const rules = extractSection(kb, "通用送货与面单规范");
  if (rules && topic !== "capabilities") parts.push(rules);

  if (queryType === "exact" && warehouseCode) {
    const profilePattern = new RegExp(
      `###\\s+${warehouseCode}[\\s\\S]*?(?=\\n###\\s+|\\n##\\s+|$)`,
      "i"
    );
    const profile = kb.match(profilePattern);
    if (profile) parts.push(profile[0].trim());
  } else if (queryType === "country_search" && country) {
    const countryPattern = new RegExp(
      `##\\s+${country}\\s+区域仓库[\\s\\S]*?(?=\\n##\\s+|$)`,
      "i"
    );
    const block = kb.match(countryPattern);
    if (block) parts.push(block[0].trim());
  }

  if (parts.length === 0) return kb;
  return parts.join("\n\n---\n\n");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const queryType = str(params.queryType);
  const warehouseCode = str(params.warehouseCode);
  const country = str(params.country);
  const topic = str(params.topic) || "all";
  const kbWarehouse = str(params.kbWarehouse);

  if (!validationOk || !kbWarehouse) {
    return {
      kbChunks: kbWarehouse || "",
      kbScope: "empty",
      warehouseCode,
      country,
      topic,
    };
  }

  const filtered = filterWarehouseSections(kbWarehouse, warehouseCode, country, queryType, topic);
  const kbScope =
    queryType === "exact"
      ? `warehouse:${warehouseCode}`
      : queryType === "country_search"
        ? `country:${country}`
        : "full";

  return {
    kbChunks: filtered,
    kbScope,
    warehouseCode,
    country,
    topic,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-warehouse-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
