/**
 * 节点：清关资料场景 TMS 查询前置（有 WI/TO 才查待上传状态）
 */

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const inboundOrderNo = str(params.inboundOrderNo).toUpperCase();
  const transportOrderNo = str(params.transportOrderNo).toUpperCase();
  const hasLookup = Boolean(inboundOrderNo || transportOrderNo);
  const skipTms = !validationOk || !hasLookup;

  return {
    skipApi: skipTms,
    skipTms,
    wiOrderNos: inboundOrderNo ? [inboundOrderNo] : [],
    customerRefNos: [],
    transportOrderNo,
    lookupMeta: { hasLookup, skipTms },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("prepare-tms-doc-lookup")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
