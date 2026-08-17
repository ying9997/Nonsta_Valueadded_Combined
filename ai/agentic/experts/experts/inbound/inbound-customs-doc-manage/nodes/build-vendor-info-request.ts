/**
 * 节点：为 winit.ums.getVendorInfo 组装请求
 * 文档：https://developer.winit.com.cn/document/detail/id/33.html
 */

const GET_VENDOR_INFO_ACTION = "winit.ums.getVendorInfo";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 目的国 → API countryCode（进口商 IOR） */
function toVendorCountryCode(country: string): string {
  const u = country.toUpperCase();
  if (u === "EU") return "DE";
  if (u === "GB") return "UK";
  return u;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const intent = str(params.intent);
  const country = str(params.country);

  const skipUmsApi = !validationOk || !country || intent === "upload";

  if (skipUmsApi) {
    return {
      actions: [],
      umsActionName: GET_VENDOR_INFO_ACTION,
      skipUmsApi: true,
      vendorCountryCode: "",
      vendorType: "IOR",
    };
  }

  const countryCode = toVendorCountryCode(country);
  const data = { countryCode, vendorType: "IOR" };

  return {
    actions: [{ action: GET_VENDOR_INFO_ACTION, data: JSON.stringify(data) }],
    umsActionName: GET_VENDOR_INFO_ACTION,
    skipUmsApi: false,
    vendorCountryCode: countryCode,
    vendorType: "IOR",
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-vendor-info-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
