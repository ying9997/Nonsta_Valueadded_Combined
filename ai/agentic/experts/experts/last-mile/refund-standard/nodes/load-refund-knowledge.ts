/**
 * 节点：load-refund-knowledge — 组装赔付条款知识 Markdown（指定产品分片 + 组合表按国过滤）
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 * 知识版本与维护说明见 prompts/expert.md。
 *
 * 【输入】`params` 字段（workflow 由上游合并上下文；country 类字段可来自初始入参）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | countryResolved | string | 优先：若已由 validate-input 写入，则直接参与分片判定 |
 * | country | string | 备选：顶层目的国 |
 * | destinationCountry | string | 备选：与 country 等价语义 |
 * | destinationRegion | string | 备选：区域字段承载的国家码 |
 * | enrichedContext | Record<string, unknown> | 可含 destinationCountry / country / countryCode 等，用于补解析 |
 *
 * 【输出】JSON 对象：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | refundLexicon | string | Markdown：术语、易混淆、policyBranch 路由说明等 |
 * | clauseMatrix | string | Markdown：WINIT SLA 摘要 + 指定产品指针 + **C 段组合表**（按国过滤或全表） |
 * | designatedCountryShard | string | Markdown：《指定产品》该国分片，或 index/unsupported 提示 + 共性 |
 * | calculationGuide | string | Markdown：analysis 结构与理算边界 |
 * | countryResolved | string | 与分片逻辑一致的国家码；index 模式下为空字符串 "" |
 * | countryShardMode | "hit" \| "index" \| "unsupported" | hit=内置分片国；index=未识别国走索引；unsupported=识别到国但无内置分片 |
 */

function normalizeCountryCode(s: string): string | undefined {
  const u = s.trim().toUpperCase();
  if (u === "GB" || u === "UNITED KINGDOM" || u === "GREAT BRITAIN") return "UK";
  if (u === "USA" || u === "UNITED STATES") return "US";
  if (u === "DEU" || u === "GERMANY") return "DE";
  if (u === "CAN" || u === "CANADA") return "CA";
  if (u === "BEL" || u === "BELGIUM") return "BE";
  if (u === "DC" || u === "*") return "DC";
  if (/^[A-Z]{2}$/.test(u)) return u;
  return undefined;
}

/** 指定产品 · 各国分片（运营侧同步摘录，维护见 prompts/expert.md） */
const DESIGNATED_SHARDS: Record<string, string> = {
  DC: [
    "## 指定产品 · DC",
    "| 产品 | 赔偿 | 逆向 | 说明 |",
    "| ALL | 不支持理赔 | - | - |",
    "",
  ].join("\n"),

  BE: [
    "## 指定产品 · BE（比利时）",
    "| 产品 | 赔偿上限 | 逆向 | 丢失(未妥投) | 破损 | 妥投未收到 | 调查 |",
    "| UPS - Standard Single | 100EUR | 不支持 | 全部:A-scan后60天内；部分:A-scan后14天内 | 妥投后14天内(含当天) | 不支持 | 30 |",
    "| DPD - France Delivery / DPD - Domestic 24h | 均不支持理赔 | - | - | - | - | - |",
    "",
  ].join("\n"),

  DE: [
    "## 指定产品 · DE（德国）",
    "| 产品 | 赔偿上限 | 逆向 | 丢失 | 破损 | 妥投未收到 | 调查 | 备注 |",
    "| DE Post Untracked/Warenpost、DHL Warenpost Intl Eco/Premium | 不支持 | - | - | - | - | - |",
    "| DHL - Domestic Paket | 500EUR | 仅丢失 | A-scan后11-90天 | 妥投后7天内(含当天) | 不支持 | 56 | 破损常需买家向当地DHL报案 |",
    "| DHL - Domestic Paket-Return | 500EUR | 仅丢失 | A-scan后11-90天 | - | - | 56 |",
    "| DHL - International Paket | 500EUR | 仅丢失 | A-scan后16-90天 | 妥投后7天内 | 不支持 | 56 |",
    "| DHL Express Domestic/Worldwide | 本地500EUR；国际26USD/KG | 仅丢失 | A-scan后30天内 | A-scan后30天内 | 不支持 | 16 |",
    "| DPD Domestic Normal | 货值>25EUR可赔，最高520EUR | 仅丢失 | A-scan后7-30天 | 妥投后7天内 | 不支持 | 45 |",
    "| DPD International Parcel | 同上520EUR | 仅丢失 | A-scan后10-30天 | 妥投后7天内 | 不支持 | - |",
    "| UPS Domestic Standard/Multiple | 510EUR | 不支持 | 部分3-14天；全部Ascan后60天 | 妥投后14天内 | 不支持 | 30 |",
    "| UPS International Standard/Multiple | 510EUR | 不支持 | 部分7-14天；全部60天 | 妥投后14天内 | 不支持 | - |",
    "| DHL Freight 系列 | 按投保/未投保2500EUR/单等 | 不支持 | Ascan后120天 | 妥投后7天内 | Ascan后120天 | 30-60自然日 |",
    "| DB SCHENKER Standard | 按投保/未投保3500EUR/单( RO 上限1500EUR) | 不支持 | Ascan后120天 | 妥投后7天内 | Ascan后120天 | 30-60自然日 |",
    "**货值证明(国际德国)**：商业发票须含收发货人、VAT、币种等，否则易拒赔（详见本表备注与合同）。",
    "",
  ].join("\n"),

  UK: [
    "## 指定产品 · UK",
    "| 产品 | 赔偿上限 | 逆向 | 丢失 | 破损 | 妥投未收到 | 调查 | 备注 |",
    "| Royal Mail Untracked 系列 | 不支持 | - | - | - | - | - |",
    "| Royal Mail Tracked 24/48 Parcel | ≤46GBP(>500GBP货值不接) | 仅丢失 | A-scan后7-35天 | 同窗 | 同窗 | 56 |",
    "| Royal Mail Tracked Return 48 | ≤46GBP | 仅丢失 | A-scan后23-80天 | - | - | 56 |",
    "| XDP 1Man/2Man Multiple | ≤5GBP/KG | 仅丢失 | A-scan后8-30天 | 妥投7天内 | 不支持 | 30 | 破损需签收前验货 |",
    "| DPD Parcel / International | ≤100GBP | 仅丢失 | A-scan后5-14天 | 同窗 | 不支持 | 30 |",
    "| Fedex Economy Single/Multiple | 3.4EUR/KG，单笔≤10000EUR | 仅丢失 | Ascan后20-60天 | 妥投后21天内 | 不支持 | 30 |",
    "| DHL Domestic Next Day | ≤75GBP | 不支持 | A-scan后3-12天 | 妥投后10天内 | 不支持 | 30 |",
    "| EVRi UK Standard 24/48 | ≤20GBP | 不支持 | 下单当日起14-28天 | 不支持 | 同左 | 28 | 部分品类不支持；妥投未收可能需DOR文件 |",
    "| EVRi Light&Large Return | ≤20GBP | 不支持 | 14-28天 | - | - | 28 |",
    "",
  ].join("\n"),

  US: [
    "## 指定产品 · US",
    "| 产品 | 赔偿上限 | 逆向 | 丢失 | 破损 | 妥投未收到 | 调查 | 备注 |",
    "| UPS 3Day Select/Ground/Next Day Air Saver/Ground Hundredweight | 100USD | 仅丢失 | A-scan后7-60天 | 妥投后60天内 | D-scan后60天内 | 30 | UPS MY CHOICE/亚马逊D-scan4周/破损照片要求 |",
    "| UPS Ground Return | 100USD | 仅丢失 | 7-60天 | 妥投后60天内 | D-scan后60天内 | 30 |",
    "| UPS Surepost | 100USD | 不支持 | 移交邮局前7-60天；移交后不支持 | - | - | 30 | MY CHOICE免责 |",
    "| FedEx Ground/2Day/Overnight/Multiple | 100USD | 仅丢失 | 7-55天 | 妥投后55天内 | 同左 | 30 |",
    "| Fedex Ground Return | 100USD | 仅丢失 | 7-60天 | - | - | 30 |",
    "| FedEx Ground Economy(SmartPost) | 不支持 | - | - | - | - | - |",
    "| USPS 部分 Return/International | 不支持 | - | - | - | - | - |",
    "| USPS Ground Advantage/Priority 等 | 100USD | 仅丢失 | A-scan后15-55天 | 同左 | 不支持 | 56 | 破损需买家赴邮局报备 |",
    "| Ontrac Ground | 100USD | 仅丢失 | A-scan后7-15天 | 同左 | 不支持 | 50 | 外箱无损可能不受理破损 |",
    "| Amazon Logistics | 100USD | 仅丢失 | A-scan后15-55天 | A-scan后55天内 | 不支持 | 30 | 破损照片与PDF合并要求 |",
    "",
  ].join("\n"),

  CA: [
    "## 指定产品 · CA（加拿大）",
    "| 产品 | 赔偿上限 | 逆向 | 丢失 | 破损 | 妥投未收到 | 调查 | 备注 |",
    "| UPS Standard/Multiple | 100CAD/票 | 仅丢失 | A-scan后60天内且停更15工作日+ | 60天内 | D-scan后30天内 | 30 | 内件破损外箱完好可能不受理 |",
    "| UPS Standard Return | 100CAD/票 | 仅丢失 | 同上 | - | D-scan后30天 | 30 |",
    "| Canada Post Expedited | 100CAD/票 | 不支持 | 60天内且停更30天+ | 60天内 | 不支持 | 30 |",
    "| UNI Domestic | 20CAD/票 | 不支持 | 60天内停更10工作日+ | 60天内 | 不支持 | 30 |",
    "| Purolator Ground | 100CAD/票 | 仅丢失 | 60天内停更10工作日+ | 60天内 | 不支持 | 30 |",
    "| PDN Express | 40CAD/票 | 仅丢失 | 60天内停更21天+ | 60天内 | 不支持 | 30 |",
    "",
  ].join("\n"),
};

const DESIGNATED_COMMON = [
  "### 《指定产品》共性（其它说明摘要）",
  "1. 供应商显示已妥投一般不接丢失（表内特别说明除外）。",
  "2. 代客索赔须时效内最后工作日12:00前提交；丢失常需买家未收货证明。",
  "3. 调查时间为参考；不承诺金额与时效；超3个月无结果视为失败。",
  "4. 结果邮件通知后不再二次申诉；款到后3工作日内退卖家。",
  "5. Amazon仓可能不配合；高货值建议追踪守护；不支持超时妥投代客索赔。",
  "更完整的其它说明以本专家维护版《指定产品》与合同/价卡为准；对客话术勿提内部文档名。",
  "",
].join("\n");

const DESIGNATED_INDEX = [
  "## 指定产品 · 国家分片索引（未解析到国家）",
  "当前请求未带可被识别的 ISO2 国家（请在 `country` / `destinationCountry` 或 `enrichedContext.destinationCountry` 提供，如 US、DE、UK）。",
  "本节点已内置 **指定产品** 分片：**DC, BE, DE, UK, US, CA**；其它国家当前无内置分片，请在 analysis 中说明信息不足并建议 `suggestedNextStep: escalate_human` 或请客户通过客服/商务核对价卡与条款，**勿**提及内部表或文档名。",
  "匹配规则不变：**国家 + 产品名称** 必须与价卡/订单逐字一致。",
  "",
].join("\n");

const WINIT_SLA_SECTION = [
  "## A. 《WINIT 赔付标准》winit_ops_sla（摘要）",
  "诚意金：Winit 额外商业诚意金 = 丢失商品进口申报价 * 5%。大量场景单件不超过 100USD（或表内该国币种）；箱产品单包裹上限以表为准。",
  "申报价不实：高于电商平台售价 40% 以上时，可按售价 40% 封顶（见表注意事项）。",
  "- 头程/库内/上架后/尾程无上网/错发等：以本段摘要及合同/订单约定为准。",
  "- 尾程超时无上网：带 Tracking；11-45 日；未退回可含货值+诚意金+退运费等（以本段与价卡为准）。",
  "",
].join("\n");

const COMBO_FULL_TABLE = [
  "## C. 《组合产品》carrier_winit_combo（按国家分片）",
  "总则：多数丢失须在有效 Ascan 后 11-45 天内提交代客索赔（以产品行为准）；货值以索赔提交页为准。",
  "| 国家 | 产品 | 赔偿 | 丢失 | 破损 | 妥投未收到 | 调查 |",
  "|------|------|------|------|------|------------|------|",
  "| US | Fulfillment-7日达 | ≤100USD | Ascan11-45天 | 不支持 | 区域承运人 SPEEDX/GOFO/YANWEN/UNIUNI 可查件妥投未收 | 30 |",
  "| US | Fulfillment-5日达 | ≤100USD | Ascan11-45天 | 不支持 | 按区域承运人规则 | 30 |",
  "| US | Fulfillment-3日达 | ≤100USD | Ascan7-18天 | 妥投后15天内 | - | 30 |",
  "| US | Fulfillment-2日达 | ≤100USD | Ascan11-45天 | 妥投后55天内 | 妥投后55天内 | 30 |",
  "| DE | Fulfillment-Economy | 不支持 | - | - | - | - |",
  "| DE | Fulfillment-Standard & Parcel-EU Shipping | 100EUR(YUN50) | A-scan16-30天 | 不支持 | 仅YUN查件后 | 56 |",
  "| UK | Fulfillment-Standard/Express | 20GBP | A-scan14-28天 | 妥投后10天内 | 不支持 | 56 |",
  "| AU | Fulfillment-Economy | - | - | - | - | - |",
  "| AU | Fulfillment-Std/Express | 100CNY | 出库60天内追踪守护 | 同左 | 不支持 | 10 |",
  "",
].join("\n");

function resolveCountry(params: Record<string, unknown>): {
  countryResolved: string;
  countryShardMode: "hit" | "index" | "unsupported";
} {
  const tryStr = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? normalizeCountryCode(v) : undefined;

  const preMerged = tryStr(params.countryResolved);
  if (preMerged) {
    const keys = Object.keys(DESIGNATED_SHARDS);
    if (keys.includes(preMerged)) {
      return { countryResolved: preMerged, countryShardMode: "hit" };
    }
    return { countryResolved: preMerged, countryShardMode: "unsupported" };
  }

  let c =
    tryStr(params.country) ??
    tryStr(params.destinationCountry) ??
    tryStr((params as Record<string, unknown>).destinationRegion);

  if (!c && params.enrichedContext && typeof params.enrichedContext === "object" && !Array.isArray(params.enrichedContext)) {
    const o = params.enrichedContext as Record<string, unknown>;
    c =
      tryStr(o.country) ??
      tryStr(o.destinationCountry) ??
      tryStr(o.destinationRegion) ??
      tryStr(o.countryCode);
  }

  if (!c) {
    return { countryResolved: "", countryShardMode: "index" };
  }
  const keys = Object.keys(DESIGNATED_SHARDS);
  if (keys.includes(c)) {
    return { countryResolved: c, countryShardMode: "hit" };
  }
  return { countryResolved: c, countryShardMode: "unsupported" };
}

function buildComboSection(countryResolved: string): string {
  if (!countryResolved || countryResolved === "DC") {
    return COMBO_FULL_TABLE;
  }
  const rows: string[] = [
    "## C. 《组合产品》carrier_winit_combo（仅 " + countryResolved + "）",
    "| 国家 | 产品 | 赔偿 | 丢失 | 破损 | 妥投未收到 | 调查 |",
    "|------|------|------|------|------|------------|------|",
  ];
  const lines = COMBO_FULL_TABLE.split("\n");
  const prefix = "| " + countryResolved + " |";
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      rows.push(line);
    }
  }
  if (rows.length <= 3) {
    rows.push("| （无该国组合产品行） | - | - | - | - | - | - |");
  }
  rows.push("");
  rows.push("其它国家组合产品行已省略；需要全表时勿传 country 以展示全表，或请人工核对价卡。");
  rows.push("");
  return rows.join("\n");
}

function buildDesignatedShard(
  mode: "hit" | "index" | "unsupported",
  countryResolved: string
): string {
  if (mode === "index") {
    return DESIGNATED_INDEX + DESIGNATED_COMMON;
  }
  if (mode === "unsupported") {
    return [
      "## 指定产品 · 国家 " + countryResolved,
      "本节点**未内置**该国《指定产品》分片；下列仅为共性规则。请在 analysis 中说明内置数据未覆盖该目的国，建议 `escalate_human` 或客服核对价卡，**勿**向客户提及内部文档。",
      "",
      DESIGNATED_COMMON,
    ].join("\n");
  }
  const body = DESIGNATED_SHARDS[countryResolved] ?? "";
  return body + DESIGNATED_COMMON;
}

const REFUND_LEXICON = [
  "# 赔付标准知识库（节选·与 expert.md 同步）",
  "",
  "**knowledgeVersion**: `1.3.0`",
  "**国家分片**: `designatedCountryShard` 仅含《指定产品》该国行（或索引/未收录提示）；`clauseMatrix` 内 **C 组合产品** 可按国过滤。",
  "",
  "## 术语速览（专业问答）",
  "A-scan: 承运商揽收/接收扫描，常作代客索赔窗口起点。D-scan: 妥投类扫描。",
  "WINIT标准索赔: 《WINIT赔付标准》下万邑通责任径；代客索赔: 向尾程商提起，结果以供应商为准，不承诺调查/金额。",
  "自然日 vs 工作日: 理赔条件多为自然日，调查时间多为工作日，勿混算。诚意金: 常见为单件进口申报价*5%，与货值条款分列陈述。",
  "",
  "## 易混淆（排雷）",
  "先分清责任主体再选表: 仓配/错发/万邑通定义尾程无上网 -> winit_ops_sla；出库后找承运商 -> carrier_*。",
  "Fulfillment组合名必须与「组合产品表」逐行命中；与普通指定产品行规则可能完全不同。",
  "已获供应商赔、表列除外、超时妥投代客不设索等与用户问题冲突时须主动说明。",
  "",
  "## 1. 免责",
  "最终以**合同、价卡、订单生效政策**及**本专家当前内置条款摘要**为准；内置摘要随版本更新，具体争议以法务/商务约定为准。调查时间、历史成功率不代表承诺。代客索赔进度由 **substitute-claim** 专家处理。",
  "输出须设置 structured.policyBranch: winit_ops_sla | carrier_designated | carrier_winit_combo | unknown。",
  "",
  "## 2. policyBranch 路由",
  "| 分支 | 何时用 |",
  "|------|--------|",
  "| winit_ops_sla | 头程/库内/上架后丢失、尾程超时无上网(WINIT标准索赔)、错发漏发、贴标、退货丢失、调拨、出库延迟、未加包装等仓配履约 |",
  "| carrier_designated | 出库后代客索赔，且为指定产品表中国家+产品（非 Winit Fulfillment 组合名片段） |",
  "| carrier_winit_combo | 产品属 Winit Fulfillment 系列 / Winit Parcel-EU Shipping 等组合产品表 |",
  "",
  "## 3. 维度（缺则 confidence 降低）",
  "country、lastMileProductName（与价卡一致）、incidentType、是否有 A-scan、是否妥投/D-scan、出库日、轨迹摘要、declaredValueKnown。",
  "",
  "规则 ID 前缀：WINIT-SLA-*、CARRIER-DES-*、CARRIER-COMBO-*。",
  "",
].join("\n");

const CALCULATION_GUIDE = [
  "## analysis 结构（专业输出）",
  "依次写: 结论(含 policyBranch) | 依据(表名/场景) | 时效(自然日或工作日+起算事件) | 除外互斥 | 举证与下一步 | 免责。",
  "纯概念题可 matchedRuleIds=[]，policyBranch=unknown，仅定义时节流 confidence 可 high。",
  "",
  "## 理算与边界",
  "1. carrier_designated：以 **designatedCountryShard** 为主；若 countryShardMode=index，须要求用户补国家。",
  "2. 先定 policyBranch，禁止跨表混用条款。",
  "3. 不得编造具体赔额；信息不足列出 missing。",
  "4. 免赔与注意事项以本注入条款摘要及合同/价卡为准；勿编造未给出的细则。",
  "5. analysis 收尾可提示以合同/价卡/订单约定为准；**禁止**在 analysis 中出现飞书、内部表、Wiki 或内部链接；suggestedNextStep: route_to_substitute_claim | need_order_details | escalate_human | none。",
].join("\n");

async function main({ params }: { params: Record<string, unknown> }) {
  const { countryResolved, countryShardMode } = resolveCountry(params);

  const designatedCountryShard = buildDesignatedShard(countryShardMode, countryResolved);
  const clauseMatrix =
    WINIT_SLA_SECTION +
    [
      "## B. 《指定产品》carrier_designated",
      "本国全部产品行见下方注入块 **designatedCountryShard**（国家分片）。",
      "",
    ].join("\n") +
    buildComboSection(countryResolved);

  const ret = {
    refundLexicon: REFUND_LEXICON,
    clauseMatrix,
    designatedCountryShard,
    calculationGuide: CALCULATION_GUIDE,
    countryResolved,
    countryShardMode,
  };
  return ret;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-refund-knowledge")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
