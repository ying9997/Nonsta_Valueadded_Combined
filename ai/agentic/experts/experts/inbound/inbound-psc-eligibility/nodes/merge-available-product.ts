/**
 * 节点：merge-get-winit-products — 解析 getWinitProducts 响应、过滤、计算权限标记
 * API 仅返回可下单产品（无 enabled 字段）；未出现在结果中的 filterCode 视为未开通。
 * FaaS 单文件闭环，无 external import。
 */

type PscRow = {
  productCode: string;
  productName: string;
  description: string;
  enabled: boolean;
  productType: string;
  inspectionType: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function inferProductType(code: string): string {
  if (code.startsWith("OW0101")) return "OW0101";
  if (code.startsWith("OW0102") || code.startsWith("OW0104")) return "OW0102";
  if (code.startsWith("OW0103")) return "OW0103";
  return "";
}

function inferInspectionType(code: string): string {
  if (code.startsWith("OW01021")) return "self_inspection_winit_carrier";
  if (code.startsWith("OW01022")) return "self_inspection_direct";
  if (code.startsWith("OW0102")) return "self_inspection";
  if (code.startsWith("OW01031")) return "overseas_inspection_winit_carrier";
  if (code.startsWith("OW01032")) return "overseas_inspection_direct";
  if (code.startsWith("OW0103") || code.startsWith("OW0104")) return "overseas_inspection";
  if (code.startsWith("OW0101")) return "standard_first_leg";
  return "other";
}

function matchesCodeFilter(productCode: string, filterCode: string): boolean {
  const fc = filterCode.toUpperCase();
  const pc = productCode.toUpperCase();
  return pc === fc || pc.startsWith(fc);
}

function matchesProductLine(row: PscRow, productLine: string): boolean {
  if (!productLine) return true;
  const pl = productLine.toLowerCase();
  if (pl.includes("自验") || pl === "si" || pl === "qsi") {
    return row.productCode.startsWith("OW0102");
  }
  if (pl.includes("海外验")) {
    return row.productCode.startsWith("OW0103") || row.productCode.startsWith("OW0104");
  }
  if (pl.includes("头程") || pl.includes("标准")) {
    return row.productCode.startsWith("OW0101");
  }
  if (/^OW01/.test(productLine.toUpperCase())) {
    return matchesCodeFilter(row.productCode, productLine.toUpperCase());
  }
  return true;
}

function normalizeRow(raw: unknown): PscRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const productCode = str(o.productCode ?? o.pscCode ?? o.code).toUpperCase();
  if (!productCode) return null;

  return {
    productCode,
    productName: str(o.productName ?? o.name),
    description: str(o.description),
    enabled: true,
    productType: str(o.productType) || inferProductType(productCode),
    inspectionType: str(o.inspectionType) || inferInspectionType(productCode),
  };
}

function dedupeRows(rows: PscRow[]): PscRow[] {
  const seen = new Set<string>();
  const out: PscRow[] = [];
  for (const row of rows) {
    if (seen.has(row.productCode)) continue;
    seen.add(row.productCode);
    out.push(row);
  }
  return out;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const filterCodes = ((params.filterCodes as string[]) ?? []).map((c) => c.toUpperCase());
  const productLine = str(params.productLine);
  const warehouseCode = str(params.warehouseCode).toUpperCase();
  const country = str(params.country);

  if (params.skipApi === true) {
    return {
      pscList: [],
      pscFacts: {
        enabledProducts: [],
        disabledProducts: [],
        hasSelfInspection: false,
        hasOverseasInspection: false,
        hasStandardFirstLeg: false,
        apiAvailable: false,
        queryWarehouseCode: warehouseCode,
        queryCountry: country,
        apiAction: "winit.wh.pms.getWinitProducts",
      },
      apiAvailable: false,
    };
  }

  const rawPscData = (params.rawPscData ?? {}) as Record<string, unknown>;
  const rawList = Array.isArray(rawPscData.list) ? rawPscData.list : [];
  const allRows = dedupeRows(
    rawList.map(normalizeRow).filter((row): row is PscRow => row != null)
  );

  const fetchMeta = (rawPscData._fetchMeta ?? {}) as Record<string, unknown>;
  const hadSuccessfulFetch =
    allRows.length > 0 ||
    fetchMeta.strategy === "plugin-batch" ||
    fetchMeta.strategy === "local-proxy";

  let filtered = allRows.filter((r) => matchesProductLine(r, productLine));
  if (filterCodes.length > 0) {
    filtered = filtered.filter((r) => filterCodes.some((fc) => matchesCodeFilter(r.productCode, fc)));
  }

  const enabledProducts = filtered.map((r) => ({
    productCode: r.productCode,
    productName: r.productName,
    description: r.description,
    productType: r.productType,
    inspectionType: r.inspectionType,
  }));

  const disabledProducts: Array<{
    productCode: string;
    productName: string;
    inspectionType: string;
  }> = [];

  if (filterCodes.length > 0 && hadSuccessfulFetch) {
    for (const fc of filterCodes) {
      const hasMatch = allRows.some((r) => matchesCodeFilter(r.productCode, fc));
      if (!hasMatch) {
        disabledProducts.push({
          productCode: fc,
          productName: "",
          inspectionType: inferInspectionType(fc),
        });
      }
    }
  }

  const hasSelfInspection = allRows.some((r) => r.productCode.startsWith("OW0102"));
  const hasOverseasInspection = allRows.some(
    (r) => r.productCode.startsWith("OW0103") || r.productCode.startsWith("OW0104")
  );
  const hasStandardFirstLeg = allRows.some((r) => r.productCode.startsWith("OW0101"));

  return {
    pscList: filtered,
    pscFacts: {
      enabledProducts,
      disabledProducts,
      hasSelfInspection,
      hasOverseasInspection,
      hasStandardFirstLeg,
      apiAvailable: hadSuccessfulFetch,
      queryWarehouseCode: warehouseCode,
      queryCountry: country,
      totalFromApi: allRows.length,
      apiAction: "winit.wh.pms.getWinitProducts",
    },
    apiAvailable: hadSuccessfulFetch,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-available-product")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
