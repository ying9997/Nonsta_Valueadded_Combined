/**
 * 节点：validate-intent — 归一 intentType / topic；透传条码相关入参
 */

type IntentType =
  | "print"
  | "third_party_add"
  | "third_party_delete"
  | "third_party_query"
  | "scan_fail"
  | "general";

type IntentSource = "explicit" | "detected" | "fallback";

const ALLOWED = new Set<string>([
  "print",
  "third_party_add",
  "third_party_delete",
  "third_party_query",
  "scan_fail",
  "general",
]);

const INTENT_PATTERNS: Array<{ type: IntentType; patterns: RegExp[] }> = [
  {
    type: "third_party_delete",
    patterns: [/删除三方|删掉三方|解除绑定|解绑.*码|删除.*条码|删除.*FNSKU|删.*第三方/i],
  },
  {
    type: "scan_fail",
    patterns: [/扫不上|扫不到|扫不了|扫描不了|无法扫描|无法识别|扫码失败|扫描失败|仓库.*扫|扫码异常/i],
  },
  {
    type: "third_party_query",
    patterns: [/查询三方|查看三方|查.*第三方.*码|单品条码.*状态|有没有绑|是否已绑/i],
  },
  {
    type: "third_party_add",
    patterns: [
      /(?:绑定|绑码|新增|添加|补绑|补充|维护|录入).*(?:第三方|三方|FNSKU|条码|识别码)/i,
      /(?:第三方|三方|FNSKU|条码|识别码).*(?:绑定|绑码|新增|添加|补|补绑|维护|录入)/i,
      /(?:怎么|如何|需要|我要|要)\s*(?:绑定|绑|新增|添加|补|补绑|维护|录入)/i,
    ],
  },
  {
    type: "print",
    patterns: [/打印.*条码|打印.*标签|打标|条码标签|怎么打印|重贴标签|重新贴标签|换标|重打标签/i],
  },
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

function normalizeSupervisorMode(raw: string): string {
  const u = raw.toUpperCase();
  if (u === "SI" || u === "SKU") return u;
  if (/单品/.test(raw)) return "SI";
  if (/商品化|商品管理/.test(raw)) return "SKU";
  return u;
}

function detectUnsupportedBoundary(text: string): string {
  const mentionsSCode = /S\s*码/i.test(text);
  const mentionsSku = /SKU|商品编码/i.test(text);
  const compactText = text.replace(/\s+/g, "");
  const sCodeIndex = compactText.search(/S码/i);
  const skuIndex = compactText.search(/SKU|商品编码/i);
  const hasLookupSemantics = /反查|查到|查下|查询|查|找到|哪个|哪一个|什么|确认|对应/i.test(
    compactText
  );
  const explicitlyUsesSCodeAsKey = /(?:通过|使用|用|拿|凭|仅凭|只凭|根据|从|由|按).*S码/i.test(
    compactText
  );
  const asksAbstractRelationship =
    /S码(?:和|与)(?:SKU|商品编码)|(?:SKU|商品编码)(?:和|与)S码/i.test(
      compactText
    );
  const sCodePrecedesSku = sCodeIndex >= 0 && skuIndex >= 0 && sCodeIndex < skuIndex;
  if (
    mentionsSCode &&
    mentionsSku &&
    hasLookupSemantics &&
    !asksAbstractRelationship &&
    (sCodePrecedesSku || explicitlyUsesSCodeAsKey)
  ) {
    return "unsupported_s_code_reverse_lookup";
  }
  const mentionsThirdPartyCode = /(?:第三方|三方).*码/i.test(text);
  const mentionsMultiplicity =
    /多个|多条|多少(?:个)?|几个|一对多|任意数量|(?:两|二|[2-9]\d*)个/i.test(text);
  const mentionsBindingOrRelation = /绑|绑定|添加|新增|设置|维护|有|对应|关联|支持/i.test(text);
  const hasQueryOrViewAction = /查询|查看/i.test(text);
  const hasMultiplicityContext = mentionsThirdPartyCode || /一对多/i.test(text);
  if (
    hasMultiplicityContext &&
    mentionsMultiplicity &&
    mentionsBindingOrRelation &&
    !hasQueryOrViewAction
  ) {
    return "unsupported_single_sku_multiple_third_party_codes";
  }
  const mentionsProductNameChange =
    /(?:修改|更改|变更|重新改|改).*(?:商品名称|商品名)|(?:商品名称|商品名).*(?:修改|更改|变更|重新改|改)|改名/i.test(
      text
    );
  const asksBarcodeValueImpact =
    /(?:条码|码值).*(?:会不会|是否|会|变|变化|改变|影响|一样|相同|不一样|不同)/i.test(
      text
    );
  const asksRelabelDecision =
    /(?:是否|是否需要|需不需要|要不要|还要不要|还要|还需).*(?:贴标|重贴|重新贴|重打|重新打印|再打印|补打|换标)|(?:需要|要).*(?:贴标|重贴|重新贴|重打|重新打印|再打印|补打|换标).*(?:吗|么|\?|？)\s*[。！!]*$/i.test(
      text
    );
  if (mentionsProductNameChange && (asksBarcodeValueImpact || asksRelabelDecision)) {
    return "unsupported_product_name_barcode_change";
  }
  const mentionsRmCode = /(?:^|[^A-Za-z0-9])RM(?=$|[^A-Za-z])/i.test(text);
  const asksRmMeaning = /是什么|什么意思|含义|代表|定义|哪种码|什么码/i.test(text);
  if (mentionsRmCode && asksRmMeaning) {
    return "unsupported_rm_prefix";
  }
  return "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const topic = str(params.topic);
  const rawIntent = str(params.intentType).toLowerCase();
  const skuCode = str(params.skuCode) || str(params.productCode);
  const skuCodeThird = str(params.skuCodeThird);
  const supervisorMode = normalizeSupervisorMode(str(params.supervisorMode));
  const query = str(params.query);
  const customerIntent = str(params.customerIntent) || query;
  const inputContext = asRecord(params.inputContext);
  const unsupportedBoundary = detectUnsupportedBoundary(`${topic} ${customerIntent} ${query}`);

  let intentType: IntentType = "general";
  let intentSource: IntentSource = "fallback";
  if (rawIntent && ALLOWED.has(rawIntent)) {
    intentType = rawIntent as IntentType;
    intentSource = "explicit";
  } else {
    intentType = detectIntent(`${topic} ${customerIntent} ${query}`);
    intentSource = intentType === "general" ? "fallback" : "detected";
  }

  const hasTopicOrIntent = topic.length > 0 || (rawIntent.length > 0 && ALLOWED.has(rawIntent));
  const normalizedTopic = topic || customerIntent || intentType;

  let needInfoHint = "";
  if (unsupportedBoundary) {
    needInfoHint = unsupportedBoundary;
  } else if (!hasTopicOrIntent && !customerIntent && !query) {
    needInfoHint = "missing_topic_or_intent";
  } else if (
    (intentType === "third_party_add" || intentType === "third_party_delete") &&
    !skuCode
  ) {
    needInfoHint = "prefer_sku_code";
  } else if (intentType === "third_party_add" && skuCode && !skuCodeThird) {
    needInfoHint = "prefer_sku_code_third";
  } else if (intentType === "scan_fail" && !skuCode) {
    needInfoHint = "prefer_sku_code";
  }

  const validationOk = hasTopicOrIntent || customerIntent.length > 0 || query.length > 0;

  return {
    validationOk,
    intentType,
    intentSource,
    normalizedTopic,
    skuCode,
    skuCodeThird,
    supervisorMode,
    customerIntent,
    needInfoHint: validationOk ? needInfoHint : "missing_topic_or_intent",
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
