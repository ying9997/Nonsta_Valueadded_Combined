/**
 * 节点：load-product-knowledge — 过滤路由器
 * 接收 textNode 注入的 15 个 KB 字符串 + validate-input 的 kbScope，
 * 选择性拼接输出 kbContent（聚焦后的 KB），LLM 只收到相关内容。
 *
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 *
 * 【输入】`params` 字段：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | countryResolved | string | ISO2 国家码 |
 * | productLine | string | psc / wf / pallet / "" |
 * | kbScope | string | 知识加载范围 |
 * | directMatch | boolean | 是否精确匹配到产品 |
 * | matchedProductNames | string[] | 匹配到的产品名 |
 * | kbPscIndex | string | textNode: kb-psc.md |
 * | kbWfIndex | string | textNode: kb-wf.md |
 * | kbPalletIndex | string | textNode: kb-pallet.md |
 * | kbPscUs | string | textNode: kb-psc-us.md |
 * | kbPscUk | string | textNode: kb-psc-uk.md |
 * | kbPscDe | string | textNode: kb-psc-de.md |
 * | kbPscAu | string | textNode: kb-psc-au.md |
 * | kbPscCa | string | textNode: kb-psc-ca.md |
 * | kbWfUs | string | textNode: kb-wf-us.md |
 * | kbWfUk | string | textNode: kb-wf-uk.md |
 * | kbWfDe | string | textNode: kb-wf-de.md |
 * | kbWfAu | string | textNode: kb-wf-au.md |
 * | kbPalletUs | string | textNode: kb-pallet-us.md |
 * | kbPalletDe | string | textNode: kb-pallet-de.md |
 *
 * 【输出】JSON 对象：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | kbContent | string | 聚焦后的 KB（索引 + 相关国家详情） |
 * | kbScope | string | 原样透传 |
 * | countryResolved | string | 原样透传 |
 * | productLine | string | 原样透传 |
 */

// ─── 产品名 → 国家+产品线映射（用于 direct 匹配时确定加载哪些国家文件） ──

interface ProductLocation {
  country: string;
  line: string;
}

const PRODUCT_LOCATION_MAP: Record<string, ProductLocation> = {
  "FedEx Freight Economy": { country: "US", line: "pallet" },
  "DB SCHENKER Standard Delivery": { country: "DE", line: "pallet" },
  "Winit Fulfillment-7日达": { country: "US", line: "wf" },
  "Winit Fulfillment-5日达": { country: "US", line: "wf" },
  "Winit Fulfillment-3日达": { country: "US", line: "wf" },
  "Winit Fulfillment-2日达": { country: "US", line: "wf" },
  "Shipping with Amazon": { country: "US", line: "wf" },
  "Winit Fulfillment-Standard": { country: "UK", line: "wf" }, // UK 和 DE 都有 Standard，按匹配顺序取第一个
  "Winit Fulfillment-Express": { country: "UK", line: "wf" },
  "DHL Next Day": { country: "UK", line: "wf" },
  "Winit Fulfillment-Economy": { country: "DE", line: "wf" },
  "DHL Express-Worldwide": { country: "DE", line: "wf" },
  "DHL Paket": { country: "DE", line: "wf" },
  "AuPost International NZ Delivery": { country: "AU", line: "wf" },
  "USPS Ground Advantage": { country: "US", line: "psc" },
  "USPS Priority Mail": { country: "US", line: "psc" },
  "UPS SurePost": { country: "US", line: "psc" },
  "UPS Ground": { country: "US", line: "psc" },
  "UPS 3 Day Select": { country: "US", line: "psc" },
  "UPS Next Day Air": { country: "US", line: "psc" },
  "OnTrac Ground": { country: "US", line: "psc" },
  "FedEx Ground": { country: "US", line: "psc" },
  "FedEx 2Day": { country: "US", line: "psc" },
  "FedEx Standard Overnight": { country: "US", line: "psc" },
  "UPS Hundredweight": { country: "US", line: "psc" },
  "Royal Mail Untracked 24": { country: "UK", line: "psc" },
  "Royal Mail Untracked 48": { country: "UK", line: "psc" },
  "Royal Mail Tracked 24": { country: "UK", line: "psc" },
  "Royal Mail Tracked 48": { country: "UK", line: "psc" },
  "DHL Domestic Next Day": { country: "UK", line: "psc" },
  "EVRi Standard 24": { country: "UK", line: "psc" },
  "EVRi Standard 48": { country: "UK", line: "psc" },
  "XDP 1 Man": { country: "UK", line: "psc" },
  "XDP 2 Man": { country: "UK", line: "psc" },
  "DPD Parcel": { country: "UK", line: "psc" },
  "FedEx Economy": { country: "UK", line: "psc" },
  "DE Post Untracked Letter": { country: "DE", line: "psc" },
  "DHL Kleinpaket": { country: "DE", line: "psc" },
  "DE Post Warenpost": { country: "DE", line: "psc" },
  "DHL Domestic Paket": { country: "DE", line: "psc" },
  "DHL Express Domestic": { country: "DE", line: "psc" },
  "DPD Domestic": { country: "DE", line: "psc" },
  "UPS Standard Single": { country: "DE", line: "psc" },
  "UPS Standard Multiple": { country: "DE", line: "psc" },
  "Winit Parcel-EU": { country: "DE", line: "psc" },
  "AU Post Large Letter": { country: "AU", line: "psc" },
  "AUPOST Parcel Post eParcel": { country: "AU", line: "psc" },
  "AU Post Express Post Parcel": { country: "AU", line: "psc" },
  "MCS Economy": { country: "AU", line: "psc" },
  "PFL Courier": { country: "AU", line: "psc" },
  "Aramex Courier": { country: "AU", line: "psc" },
  "AU Mix Economy": { country: "AU", line: "psc" },
  "TOLL Priority": { country: "AU", line: "psc" },
  "TOLL IPEC": { country: "AU", line: "psc" },
  "Direct Freight": { country: "AU", line: "psc" },
  "Allied Express": { country: "AU", line: "psc" },
  "UNI Domestic": { country: "CA", line: "psc" },
  "Canada Post Expedited": { country: "CA", line: "psc" },
  "Purolator Ground": { country: "CA", line: "psc" },
};

// ─── 国家文件选取辅助 ───────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

interface KbFiles {
  kbPscUs: string;
  kbPscUk: string;
  kbPscDe: string;
  kbPscAu: string;
  kbPscCa: string;
  kbWfUs: string;
  kbWfUk: string;
  kbWfDe: string;
  kbWfAu: string;
  kbPalletUs: string;
  kbPalletDe: string;
}

function getPscByCountry(files: KbFiles, country: string): string {
  switch (country) {
    case "US": return files.kbPscUs;
    case "UK": return files.kbPscUk;
    case "DE": return files.kbPscDe;
    case "AU": return files.kbPscAu;
    case "CA": return files.kbPscCa;
    default: return "";
  }
}

function getWfByCountry(files: KbFiles, country: string): string {
  switch (country) {
    case "US": return files.kbWfUs;
    case "UK": return files.kbWfUk;
    case "DE": return files.kbWfDe;
    case "AU": return files.kbWfAu;
    default: return "";
  }
}

function getPalletByCountry(files: KbFiles, country: string): string {
  switch (country) {
    case "US": return files.kbPalletUs;
    case "DE": return files.kbPalletDe;
    default: return "";
  }
}

function getLineByCountry(files: KbFiles, line: string, country: string): string {
  switch (line) {
    case "psc": return getPscByCountry(files, country);
    case "wf": return getWfByCountry(files, country);
    case "pallet": return getPalletByCountry(files, country);
    default: return "";
  }
}

// ─── 主入口 ─────────────────────────────────────────────────────────

async function main({ params }: { params: Record<string, unknown> }) {
  const countryResolved = str(params.countryResolved);
  const productLine = str(params.productLine);
  const kbScope = str(params.kbScope);
  const directMatch = params.directMatch === true;
  const matchedProductNames = Array.isArray(params.matchedProductNames) ? params.matchedProductNames as string[] : [];

  // 索引文件（始终包含）
  const kbPscIndex = str(params.kbPscIndex);
  const kbWfIndex = str(params.kbWfIndex);
  const kbPalletIndex = str(params.kbPalletIndex);

  // 国家详情文件
  const files: KbFiles = {
    kbPscUs: str(params.kbPscUs),
    kbPscUk: str(params.kbPscUk),
    kbPscDe: str(params.kbPscDe),
    kbPscAu: str(params.kbPscAu),
    kbPscCa: str(params.kbPscCa),
    kbWfUs: str(params.kbWfUs),
    kbWfUk: str(params.kbWfUk),
    kbWfDe: str(params.kbWfDe),
    kbWfAu: str(params.kbWfAu),
    kbPalletUs: str(params.kbPalletUs),
    kbPalletDe: str(params.kbPalletDe),
  };

  // 拼接索引层
  const indexParts: string[] = [];
  if (kbPscIndex) indexParts.push(kbPscIndex);
  if (kbWfIndex) indexParts.push(kbWfIndex);
  if (kbPalletIndex) indexParts.push(kbPalletIndex);

  // 根据 kbScope 追加国家详情
  const detailParts: string[] = [];

  if (kbScope === "direct") {
    // 根据匹配到的产品，收集需要加载的 {line}-{country} 组合
    const needed = new Set<string>();
    for (const name of matchedProductNames) {
      const loc = PRODUCT_LOCATION_MAP[name];
      if (loc) needed.add(`${loc.line}-${loc.country}`);
    }
    for (const key of needed) {
      const [line, country] = key.split("-");
      const content = getLineByCountry(files, line, country);
      if (content) detailParts.push(content);
    }
  } else if (kbScope === "index") {
    // 仅索引，不追加
  } else {
    // 解析 scope 格式：{line}-{country} | all-{country} | {line}-all
    const parts = kbScope.split("-");
    if (parts.length === 2) {
      const [left, right] = parts;
      const isLine = left === "psc" || left === "wf" || left === "pallet";
      if (isLine && right === "all") {
        // {line}-all：加载该产品线所有国家
        if (left === "psc") {
          detailParts.push(files.kbPscUs, files.kbPscUk, files.kbPscDe, files.kbPscAu, files.kbPscCa);
        } else if (left === "wf") {
          detailParts.push(files.kbWfUs, files.kbWfUk, files.kbWfDe, files.kbWfAu);
        } else if (left === "pallet") {
          detailParts.push(files.kbPalletUs, files.kbPalletDe);
        }
      } else if (left === "all") {
        // all-{country}：加载该国家所有产品线
        const country = right;
        const psc = getPscByCountry(files, country);
        const wf = getWfByCountry(files, country);
        const pallet = getPalletByCountry(files, country);
        if (psc) detailParts.push(psc);
        if (wf) detailParts.push(wf);
        if (pallet) detailParts.push(pallet);
      } else if (isLine) {
        // {line}-{country}
        const content = getLineByCountry(files, left, right);
        if (content) detailParts.push(content);
      }
    }
  }

  // 拼接最终输出
  const allParts = [...indexParts, ...detailParts.filter(Boolean)];
  const kbContent = allParts.join("\n\n---\n\n");

  return {
    kbContent,
    kbScope,
    countryResolved,
    productLine,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-product-knowledge")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => { console.error(e); process.exit(1); });
}
