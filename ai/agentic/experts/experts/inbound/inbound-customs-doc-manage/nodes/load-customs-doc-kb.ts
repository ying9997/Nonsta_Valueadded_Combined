/**
 * 节点：按 intent 分支加载清关资料/进口商 KB，并按 country 过滤
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function filterByCountry(content: string, country: string): string {
  if (!content || !country) return content;
  const lines = content.split("\n");
  const hits = new Set<number>();
  const targets = [country.toLowerCase(), "eu", "通用", "general"];
  if (country === "UK") targets.push("英国", "gb");
  if (country === "DE" || country === "BE" || country === "EU") {
    targets.push("欧盟", "比利时", "德国", "eu");
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (targets.some((t) => line.includes(t))) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 6); j++) {
        hits.add(j);
      }
    }
  }

  if (hits.size === 0) return content;
  return Array.from(hits)
    .sort((a, b) => a - b)
    .map((i) => lines[i])
    .join("\n");
}

function pickGuide(
  intent: string,
  kbUpload: string,
  kbRegister: string,
  kbQuery: string,
  kbGeneral: string
): { content: string; scope: string; uploadAction: string } {
  switch (intent) {
    case "upload":
      return {
        content: kbUpload,
        scope: "upload",
        uploadAction: "wh.inbound.order.uploadCustomsDeclareDocs",
      };
    case "register_importer":
      return { content: kbRegister, scope: "register_importer", uploadAction: "" };
    case "query_importer":
      return { content: kbQuery, scope: "query_importer", uploadAction: "" };
    default:
      return { content: kbGeneral || [kbUpload, kbRegister, kbQuery].join("\n\n---\n\n"), scope: "general", uploadAction: "" };
  }
}

function formatVendorSection(vendorFacts: Record<string, unknown>): string {
  const list = Array.isArray(vendorFacts.vendorList) ? vendorFacts.vendorList : [];
  if (list.length === 0) return "";
  const lines = list.slice(0, 30).map((v) => {
    const row = v as Record<string, unknown>;
    const code = String(row.vendorCode ?? "");
    const name = String(row.vendorName ?? "");
    const winit = String(row.isWinitLabel ?? row.isWinit ?? "");
    return `- ${code} | ${name} | isWinit=${winit}`;
  });
  const matched = vendorFacts.matchedVendor as Record<string, unknown> | null;
  const matchLine = matched
    ? `\n\n**匹配进口商**：${matched.vendorCode} — ${matched.vendorName}`
    : vendorFacts.importerNotFound
      ? `\n\n**未找到编码 ${vendorFacts.importerCodeFilter}** 于当前国家可用列表中`
      : "";
  return `\n\n## UMS 进出口商（getVendorInfo）\n\n共 ${vendorFacts.totalVendors ?? list.length} 条 IOR：\n${lines.join("\n")}${matchLine}`;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const intent = str(params.intent) || "general";
  const country = str(params.country);
  const inboundOrderNo = str(params.inboundOrderNo);
  const importerCode = str(params.importerCode);
  const registerGapNote = str(params.registerGapNote);
  const vendorFacts = (params.vendorFacts ?? {}) as Record<string, unknown>;
  const umsDataAvailable = params.umsDataAvailable === true;
  const tmsSummary = (params.tmsTransportSummary ?? {}) as Record<string, unknown>;
  const tmsPrimary = (tmsSummary.primary ?? null) as Record<string, unknown> | null;

  const kbUpload = str(params.kbUploadGuide);
  const kbRegister = str(params.kbImporterRegister);
  const kbQuery = str(params.kbImporterQuery);
  const kbGeneral = str(params.kbGeneral);

  if (!validationOk) {
    return {
      kbContent: "",
      kbScope: "invalid",
      countrySpecificGuide: "",
      uploadAction: "",
      umsGapNote: "",
      umsDataAvailable: false,
      vendorList: [],
    };
  }

  const { content, scope, uploadAction } = pickGuide(intent, kbUpload, kbRegister, kbQuery, kbGeneral);
  const countryFiltered = filterByCountry(content, country);
  const contextNote = inboundOrderNo ? `\n\n## 关联入库单\n\n${inboundOrderNo}（仅上下文，不触发写操作）` : "";

  const vendorSection =
    intent !== "upload" && umsDataAvailable ? formatVendorSection(vendorFacts) : "";
  const registerSection =
    intent === "register_importer" && registerGapNote
      ? `\n\n## 注册说明\n\n${registerGapNote}`
      : "";

  let tmsSection = "";
  if (tmsPrimary) {
    const waitFile = String(tmsPrimary.isWaitDataFile ?? "");
    const waitPkg = String(tmsPrimary.isWaitPackageList ?? "");
    tmsSection = `\n\n## TMS 运输单待办（queryPage）\n\n运输单：${String(tmsPrimary.transportOrderNo ?? "")}\n待上传报关资料：${waitFile || "未知"}\n待上传装箱单：${waitPkg || "未知"}\n进口报关规则：${String(tmsPrimary.importDeclarationRuleCode ?? "")}`;
  }

  const kbContent = `${countryFiltered}${contextNote}${vendorSection}${registerSection}${tmsSection}`.trim();
  const tmsDataAvailable = Number(tmsSummary.recordCount ?? 0) > 0;
  const vendorList = Array.isArray(vendorFacts.vendorList) ? vendorFacts.vendorList : [];

  return {
    kbContent,
    kbScope: `${scope}${country ? `:${country}` : ""}${umsDataAvailable ? ":ums" : ""}${tmsDataAvailable ? ":tms" : ""}`,
    countrySpecificGuide: countryFiltered,
    uploadAction,
    documentChecklist: [],
    operationSteps: [],
    umsGapNote: registerGapNote,
    umsDataAvailable,
    vendorList,
    matchedVendor: vendorFacts.matchedVendor ?? null,
    tmsDataAvailable,
    tmsTransportSummary: tmsSummary,
    apiAction: umsDataAvailable ? "winit.ums.getVendorInfo" : "",
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-customs-doc-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
