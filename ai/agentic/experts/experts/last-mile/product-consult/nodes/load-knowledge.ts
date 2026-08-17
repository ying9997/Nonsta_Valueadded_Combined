/**
 * 节点：load-knowledge — 知识路由器
 * 接收 textNode 注入的 5 个 KB 字符串 + validate-input 的 kbScope，
 * 选择性拼接输出 kbContent（聚焦后的 KB），LLM 只收到相关内容。
 *
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 *
 * 【输入】`params` 字段：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | countryResolved | string | ISO2 国家码 |
 * | kbScope | string | 知识加载范围 |
 * | kbDeliveryUs | string | textNode: kb-delivery-us.md |
 * | kbDeliveryUk | string | textNode: kb-delivery-uk.md |
 * | kbDeliveryDe | string | textNode: kb-delivery-de.md |
 * | kbDeliveryAu | string | textNode: kb-delivery-au.md |
 * | kbDeliveryCa | string | textNode: kb-delivery-ca.md |
 *
 * 【输出】JSON 对象：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | kbContent | string | 聚焦后的 KB |
 * | countryResolved | string | 原样透传 |
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

interface KbFiles {
  kbDeliveryUs: string;
  kbDeliveryUk: string;
  kbDeliveryDe: string;
  kbDeliveryAu: string;
  kbDeliveryCa: string;
}

function getDeliveryByCountry(files: KbFiles, country: string): string {
  switch (country) {
    case "US": return files.kbDeliveryUs;
    case "UK": return files.kbDeliveryUk;
    case "DE": return files.kbDeliveryDe;
    case "AU": return files.kbDeliveryAu;
    case "CA": return files.kbDeliveryCa;
    default: return "";
  }
}

async function main({ params }: { params: Record<string, unknown> }) {
  const countryResolved = str(params.countryResolved);
  const kbScope = str(params.kbScope);

  const files: KbFiles = {
    kbDeliveryUs: str(params.kbDeliveryUs),
    kbDeliveryUk: str(params.kbDeliveryUk),
    kbDeliveryDe: str(params.kbDeliveryDe),
    kbDeliveryAu: str(params.kbDeliveryAu),
    kbDeliveryCa: str(params.kbDeliveryCa),
  };

  let kbContent = "";

  if (kbScope === "index") {
    kbContent = "请指定目的国（US/UK/DE/AU/CA）以获取产品推荐。";
  } else if (kbScope.startsWith("delivery-")) {
    const country = kbScope.replace("delivery-", "").toUpperCase();
    kbContent = getDeliveryByCountry(files, country);
  }

  return {
    kbContent,
    countryResolved,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-knowledge")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => { console.error(e); process.exit(1); });
}
