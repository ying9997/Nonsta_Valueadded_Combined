/**
 * 节点：解析清关查询路径（进度查询 vs 包税渠道 FAQ）
 */

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeCountry(raw: unknown): string {
  const u = str(raw).toUpperCase().replace(/\s+/g, "");
  if (!u) return "";
  const aliases: Record<string, string> = {
    GB: "UK",
    USA: "US",
    UNITEDSTATES: "US",
    UNITEDKINGDOM: "UK",
    GERMANY: "DE",
    DEU: "DE",
    BELGIUM: "BE",
    BEL: "BE",
    英国: "UK",
    美国: "US",
    德国: "DE",
    比利时: "BE",
  };
  return aliases[u] ?? (/^[A-Z]{2}$/.test(u) ? u : "");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const dutiableChannelQuery = params.dutiableChannelQuery === true;
  const country = normalizeCountry(params.country);
  const containerNo = str(params.containerNo);
  const inboundOrderNos = ((params.inboundOrderNos as string[]) ?? [])
    .map((o) => String(o ?? "").trim())
    .filter(Boolean);

  if (dutiableChannelQuery) {
    return {
      pathType: "dutiable",
      skipApi: true,
      validationOk: true,
      dutiableChannelQuery: true,
      country,
      containerNo,
      inboundOrderNos,
    };
  }

  const validationOk = inboundOrderNos.length > 0 || containerNo.length > 0;
  return {
    pathType: validationOk ? "progress" : "invalid",
    skipApi: false,
    validationOk,
    error: validationOk ? "" : "请提供 inboundOrderNos 或 containerNo",
    dutiableChannelQuery: false,
    country,
    containerNo,
    inboundOrderNos,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-customs-query")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
