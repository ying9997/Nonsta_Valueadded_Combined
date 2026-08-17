/**
 * 节点：validate-intent — 归一 intentType / topic；抽取 profile 快照
 */

type IntentType =
  | "expedite"
  | "carriability"
  | "register"
  | "audit_status"
  | "resubmit"
  | "modify"
  | "inactive"
  | "blocked_inbound"
  | "direct_shipment"
  | "attribute_change"
  | "unban"
  | "general";

const ALLOWED = new Set<string>([
  "expedite",
  "carriability",
  "register",
  "audit_status",
  "resubmit",
  "modify",
  "inactive",
  "blocked_inbound",
  "direct_shipment",
  "attribute_change",
  "unban",
  "general",
]);

const INTENT_PATTERNS: Array<{ type: IntentType; patterns: RegExp[] }> = [
  { type: "expedite", patterns: [/加急|审核要多久|应维护完成|SLA|审核进度/i] },
  { type: "register", patterns: [/注册时.{0,8}商品链接|商品注册.{0,8}链接.*(?:填|提供)/i] },
  { type: "modify", patterns: [/已注册商品.{0,12}商品链接.{0,8}(?:查|查询|找|查看)/i] },
  { type: "carriability", patterns: [/能否发|能不能发|能否入|能不能入|禁限运|商品链接|新品/i] },
  { type: "resubmit", patterns: [/退回|重提|怎么改|修改重提/i] },
  { type: "direct_shipment", patterns: [/限直发|直发限制|头程类型|不能下头程/i] },
  { type: "attribute_change", patterns: [/解除|取消勾选|带电|液体|磁性|粉末|刀片|DG属性/i] },
  { type: "unban", patterns: [/解禁|取消禁止|怎么解禁/i] },
  { type: "blocked_inbound", patterns: [/商品不存在|未发布|禁止入库|无法下入库/i] },
  { type: "register", patterns: [/怎么注册|如何注册|批量注册|新增商品|商品注册/i] },
  { type: "modify", patterns: [/修改商品|编辑商品/i] },
  { type: "inactive", patterns: [/失效|作废商品/i] },
  { type: "audit_status", patterns: [/审核状态|维护任务/i] },
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function detectIntent(text: string): IntentType {
  for (const { type, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return type;
  }
  return "general";
}

function isAmbiguousGeneral(texts: string[]): boolean {
  const normalized = texts
    .map((text) => text.replace(/[\s，。！？、,.!?：:；;（）()【】\[\]]/g, ""))
    .filter(Boolean);
  return (
    normalized.length > 0 &&
    normalized.every((text) => /^(?:商品|SKU)?(?:注册|维护)(?:问题|咨询)?$/i.test(text))
  );
}

type UnverifiedOperationReason =
  | "batch_modify_existing"
  | "transport_material_dispute"
  | "audit_withdrawal_or_deletion"
  | "";

function getUnverifiedOperationReason(text: string): UnverifiedOperationReason {
  const batchModifyExisting =
    /批量(?:修改|编辑|更新|调整)(?:已注册|现有|已有)?(?:商品|SKU|商品信息|尺寸|重量|属性)|(?:修改|编辑|更新|调整)(?:多个|一批|批量)(?:已注册|现有|已有)?(?:商品|SKU)/i.test(
      text
    );
  const transportMaterialDispute =
    /陆运|海运|铁路|空运|运输方式/i.test(text) &&
    /电池|带电/i.test(text) &&
    /资料|证明|报告|MSDS|UN\s*38[.．]?3/i.test(text) &&
    /退回|驳回|争议|冲突|但|实际|却|还要|仍要/i.test(text);
  const auditState = /审核中|正在审核|审核期间|已提交.{0,4}审核|提交审核后/i.test(text);
  const changesProductAttribute =
    /(?:撤回|撤销|删除|删掉|取消|作废).{0,8}(?:带电|液体|磁性|粉末|刀片|DG|商品属性|特殊属性|属性|勾选)/i.test(
      text
    );
  const withdrawsOrDeletesSubmittedItem =
    /撤回|撤销|删除|删掉|作废/i.test(text) ||
    /取消.{0,8}(?:申请|审核|提交记录|商品申请|注册申请|审核单|维护任务)|(?:申请|审核|提交记录|商品申请|注册申请|审核单|维护任务).{0,8}取消/i.test(
      text
    );
  const auditWithdrawal = auditState && !changesProductAttribute && withdrawsOrDeletesSubmittedItem;
  if (batchModifyExisting) return "batch_modify_existing";
  if (transportMaterialDispute) return "transport_material_dispute";
  if (auditWithdrawal) return "audit_withdrawal_or_deletion";
  return "";
}

function isAmbiguousProductLinkLookup(text: string): boolean {
  if (/已注册|注册时|注册中|商品详情|商品信息|维护的链接|某个\s*SKU/i.test(text)) {
    return false;
  }
  return /(?:商品|产品|销售)?链接.{0,8}(?:哪里|在哪|怎么|如何).{0,4}(?:查|查询|找|获取)|(?:哪里|在哪|怎么|如何).{0,4}(?:查|查询|找|获取).{0,8}(?:商品|产品|销售)?链接/i.test(
    text
  );
}

function isUnderSpecifiedCertificateQuestion(
  text: string,
  importCountryCode: string
): boolean {
  const asksCertificateRequirement =
    /证书|MSDS|UN\s*38[.．]?3|电池资料|检测报告/i.test(text) &&
    /是否|要不要|需不需要|需要|必填|必须|要求/i.test(text);
  if (!asksCertificateRequirement) return false;

  const hasProductAttribute = /带电|电池|液体|磁性|粉末|刀片|危险品|敏感品|普通商品|普货/i.test(text);
  const hasCountry =
    importCountryCode.length > 0 ||
    /美国|英国|德国|法国|意大利|西班牙|加拿大|澳大利亚|日本|欧盟|荷兰|波兰|捷克|墨西哥|巴西/i.test(
      text
    );
  return !hasProductAttribute || !hasCountry;
}

function extractProfileSnapshot(inputContext: Record<string, unknown>): Record<string, unknown> {
  const previousOutput = asRecord(inputContext.previousOutput);
  const structured = asRecord(previousOutput.structured);
  if (Array.isArray(structured.skus) && structured.skus.length > 0) {
    return { skus: structured.skus, missingFacts: structured.missingFacts ?? [] };
  }
  const enriched = asRecord(inputContext.enrichedContext);
  const profile = asRecord(enriched["sku/profile"]);
  if (Array.isArray(profile.skus) && profile.skus.length > 0) {
    return { skus: profile.skus, missingFacts: profile.missingFacts ?? [] };
  }
  return {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const topic = str(params.topic);
  const rawIntent = str(params.intentType).toLowerCase();
  const skuCode = str(params.skuCode);
  const importCountryCode = str(params.importCountryCode).toUpperCase();
  const productLink = str(params.productLink);
  const query = str(params.query);
  const customerIntent = str(params.customerIntent) || query;
  const inputContext = asRecord(params.inputContext);
  const profileSnapshot = extractProfileSnapshot(inputContext);
  const intentText = `${topic} ${customerIntent} ${query}`.trim();

  let intentType: IntentType = "general";
  if (rawIntent && ALLOWED.has(rawIntent)) {
    intentType = rawIntent as IntentType;
  } else {
    intentType = detectIntent(intentText);
  }

  const hasTopicOrIntent = topic.length > 0 || (rawIntent.length > 0 && ALLOWED.has(rawIntent));
  const normalizedTopic = topic || customerIntent || intentType;
  const needHumanReason = getUnverifiedOperationReason(intentText);

  let needInfoHint = "";
  if (!hasTopicOrIntent && !customerIntent && !query) {
    needInfoHint = "missing_topic_or_intent";
  } else if (needHumanReason) {
    needInfoHint = "need_human_unverified_operation";
  } else if (isAmbiguousProductLinkLookup(intentText)) {
    needInfoHint = "ambiguous_product_link_lookup";
  } else if (isUnderSpecifiedCertificateQuestion(intentText, importCountryCode)) {
    needInfoHint = "missing_compliance_context";
  } else if (isAmbiguousGeneral([topic, customerIntent, query])) {
    needInfoHint = "ambiguous_general";
  } else if (intentType === "carriability" && !productLink && !skuCode && !/链接|图片|禁限运/.test(`${topic} ${customerIntent}`)) {
    needInfoHint = "prefer_product_link_or_sku";
  } else if (
    (intentType === "direct_shipment" || intentType === "unban") &&
    !skuCode
  ) {
    needInfoHint = "prefer_sku_code";
  }

  const validationOk = hasTopicOrIntent || customerIntent.length > 0 || query.length > 0;
  const skipAudit = !skuCode;

  return {
    validationOk,
    intentType,
    normalizedTopic,
    skuCode,
    importCountryCode,
    productLink,
    customerIntent,
    needInfoHint: validationOk ? needInfoHint : "missing_topic_or_intent",
    needHumanReason: validationOk ? needHumanReason : "",
    skipAudit,
    profileSnapshot,
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-intent")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
