/**
 * 节点：extract-warehouse-profile — 从 kbChunks 结构化提取仓库资料
 * FaaS 单文件闭环，无外部 import。
 */

interface WarehouseCapabilities {
  pureElectric: boolean | null;
  dg: boolean | null;
  chemical: boolean | null;
  specialChemical: boolean | null;
  food: boolean | null;
}

interface WarehouseProfile {
  warehouseCode: string;
  warehouseName: string;
  country: string;
  address: string;
  addressExpress: string;
  contactPerson: string;
  contactPhone: string;
  businessHours: string;
  cutoffTime: string;
  warehouseType: string;
  warehousePosition: string;
  operationMode: string;
  supportedProducts: string;
  capabilities: WarehouseCapabilities;
  specialNotes: string[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseField(block: string, label: string): string {
  const pattern = new RegExp(`[-*]\\s*\\*\\*${label}\\*\\*[:：]\\s*(.+)$`, "im");
  const m = block.match(pattern);
  return m ? m[1].trim() : "";
}

function parseNotes(block: string): string[] {
  const notes: string[] = [];
  const section = block.match(/\*\*特殊说明\*\*[\s\S]*?(?=\n\*\*|\n###|\n##|$)/i);
  if (!section) return notes;
  const lines = section[0].split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (m) notes.push(m[1].trim());
  }
  return notes;
}

function extractProfileBlock(kb: string, code: string): string | null {
  const pattern = new RegExp(`###\\s+${code}[\\s\\S]*?(?=\\n###\\s+|\\n##\\s+|$)`, "i");
  const m = kb.match(pattern);
  return m ? m[0] : null;
}

function listCountryWarehouses(kb: string, country: string): WarehouseProfile[] {
  const countryPattern = new RegExp(
    `##\\s+${country}\\s+区域仓库([\\s\\S]*?)(?=\\n##\\s+|$)`,
    "i"
  );
  const block = kb.match(countryPattern);
  if (!block) return [];

  const profiles: WarehouseProfile[] = [];
  const sections = block[0].split(/\n###\s+/).slice(1);
  for (const sec of sections) {
    const codeLine = sec.match(/^([A-Z0-9]+)/i);
    if (!codeLine) continue;
    const code = codeLine[1].toUpperCase();
    profiles.push(buildProfile(sec, code, country));
  }
  return profiles;
}

function parseCapabilities(text: string): WarehouseCapabilities {
  const products = text;
  const has = (kw: string) =>
    products.includes(kw) && !new RegExp(`不支持[^\\n]*${kw}|${kw}[^\\n]*不支持`).test(products);

  return {
    pureElectric: has("纯电") ? true : products.includes("不支持纯电") ? false : null,
    dg: has("DG") ? true : products.includes("不支持 DG") || products.includes("不支持DG") ? false : null,
    chemical: has("普通化工") || has("化工") ? true : null,
    specialChemical: has("特殊化工") ? true : products.includes("不支持特殊化工") ? false : null,
    food: has("食品") ? true : products.includes("不支持食品") ? false : null,
  };
}

function buildProfile(block: string, code: string, country: string): WarehouseProfile {
  const supportedProducts = parseField(block, "可接商品");
  return {
    warehouseCode: code,
    warehouseName: parseField(block, "仓库名称") || code,
    country: parseField(block, "国家") || country,
    address: parseField(block, "地址"),
    addressExpress: parseField(block, "地址（快递）"),
    contactPerson: parseField(block, "联系人"),
    contactPhone: parseField(block, "联系电话"),
    businessHours: parseField(block, "营业时间"),
    cutoffTime: parseField(block, "截单时间"),
    warehouseType: parseField(block, "仓型"),
    warehousePosition: parseField(block, "仓库定位"),
    operationMode: parseField(block, "作业模式"),
    supportedProducts,
    capabilities: parseCapabilities(supportedProducts || block),
    specialNotes: parseNotes(block),
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const kbChunks = str(params.kbChunks);
  const warehouseCode = str(params.warehouseCode);
  const country = str(params.country);
  const queryType = str(params.queryType);

  let warehouseProfile: WarehouseProfile | Record<string, unknown> = {
    warehouseCode: "",
    warehouseName: "",
    country: "",
    address: "",
    addressExpress: "",
    contactPerson: "",
    contactPhone: "",
    businessHours: "",
    cutoffTime: "",
    warehouseType: "",
    warehousePosition: "",
    operationMode: "",
    supportedProducts: "",
    capabilities: {
      pureElectric: null,
      dg: null,
      chemical: null,
      specialChemical: null,
      food: null,
    },
    specialNotes: [] as string[],
  };
  let matched = false;

  if (queryType === "exact" && warehouseCode) {
    const block = extractProfileBlock(kbChunks, warehouseCode);
    if (block) {
      warehouseProfile = buildProfile(block, warehouseCode, country);
      matched = true;
    }
  } else if (queryType === "country_search" && country) {
    const list = listCountryWarehouses(kbChunks, country);
    if (list.length > 0) {
      warehouseProfile = {
        country,
        warehouseCount: list.length,
        warehouses: list,
      };
      matched = true;
    }
  }

  return {
    warehouseProfile,
    matched,
    queryType,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("extract-warehouse-profile")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
