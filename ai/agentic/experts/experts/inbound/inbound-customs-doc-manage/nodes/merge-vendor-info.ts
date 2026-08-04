/**
 * 节点：解析 getVendorInfo 响应，匹配 importerCode，输出 vendorFacts
 */

const GET_VENDOR_INFO_ACTION = "winit.ums.getVendorInfo";

const REGISTER_GAP_NOTE = `进口商注册为写操作，须通过万邑联 → 进口商管理自行提交；本专家不代客注册。
查询已配置的进出口商可使用 API 返回的 vendorCode 在入库单中选择。`;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

type VendorRow = {
  vendorCode: string;
  vendorName: string;
  isWinit: boolean;
  isWinitLabel: string;
};

function normalizeVendor(raw: unknown): VendorRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const vendorCode = str(o.vendorCode ?? o.importerCode);
  if (!vendorCode) return null;
  const isWinitLabel = str(o.isWinit).toUpperCase();
  return {
    vendorCode,
    vendorName: str(o.vendorName ?? o.importerName),
    isWinit: isWinitLabel === "Y" || isWinitLabel === "YES" || isWinitLabel === "TRUE",
    isWinitLabel: isWinitLabel || "N",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = str(params.intent);
  const importerCode = str(params.importerCode);
  const vendorCountryCode = str(params.vendorCountryCode);
  const skipUmsApi = params.skipUmsApi === true;

  if (skipUmsApi) {
    return {
      umsDataAvailable: false,
      vendorList: [],
      matchedVendor: null,
      vendorFacts: {
        umsDataAvailable: false,
        vendorList: [],
        matchedVendor: null,
        apiAction: GET_VENDOR_INFO_ACTION,
        registerGapNote: intent === "register_importer" ? REGISTER_GAP_NOTE : "",
      },
      gapNote: intent === "register_importer" ? REGISTER_GAP_NOTE : "",
      registerGapNote: REGISTER_GAP_NOTE,
    };
  }

  const rawVendorData = (params.rawVendorData ?? {}) as Record<string, unknown>;
  const rawList = Array.isArray(rawVendorData.list) ? rawVendorData.list : [];
  const allVendors = rawList.map(normalizeVendor).filter((v): v is VendorRow => v != null);

  const fetchMeta = (rawVendorData._fetchMeta ?? {}) as Record<string, unknown>;
  const apiCalled =
    fetchMeta.strategy === "plugin-batch" || fetchMeta.strategy === "local-proxy";

  let vendorList = allVendors;
  let matchedVendor: VendorRow | null = null;
  if (importerCode) {
    matchedVendor =
      allVendors.find(
        (v) => v.vendorCode === importerCode || v.vendorCode.toUpperCase() === importerCode.toUpperCase()
      ) ?? null;
    if (matchedVendor) vendorList = [matchedVendor];
  }

  const umsDataAvailable = apiCalled && allVendors.length >= 0;

  return {
    umsDataAvailable: umsDataAvailable && allVendors.length > 0,
    vendorList: vendorList.map((v) => ({
      vendorCode: v.vendorCode,
      vendorName: v.vendorName,
      isWinit: v.isWinit,
      isWinitLabel: v.isWinitLabel,
    })),
    matchedVendor: matchedVendor
      ? {
          vendorCode: matchedVendor.vendorCode,
          vendorName: matchedVendor.vendorName,
          isWinit: matchedVendor.isWinit,
        }
      : importerCode
        ? null
        : null,
    vendorFacts: {
      umsDataAvailable: umsDataAvailable && allVendors.length > 0,
      vendorList: allVendors,
      matchedVendor,
      importerCodeFilter: importerCode || undefined,
      vendorCountryCode,
      totalVendors: allVendors.length,
      apiAction: GET_VENDOR_INFO_ACTION,
      registerGapNote: intent === "register_importer" ? REGISTER_GAP_NOTE : "",
      importerNotFound: importerCode ? !matchedVendor && allVendors.length > 0 : false,
    },
    gapNote: intent === "register_importer" ? REGISTER_GAP_NOTE : "",
    registerGapNote: REGISTER_GAP_NOTE,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-vendor-info")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
