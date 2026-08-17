/**
 * 节点：filter-by-constraints — 过滤不可作为可下单推荐的 VASC 候选。
 * FaaS 单文件闭环，无外部 import。
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asCandidateArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function candidateKey(candidate: Record<string, unknown>): string {
  return asText(candidate.vascCode) || asText(candidate.vascName);
}

function normalizeScopedCandidate(candidate: Record<string, unknown>): Record<string, unknown> {
  return {
    ...candidate,
    active: candidate.active ?? true,
    source: candidate.source || "systemScopedVascList",
    reason: candidate.reason || "中间层 listAllVasc 注入的系统圈定候选",
  };
}

function scopedCandidatesFromContext(recommendationInput: Record<string, unknown>): Record<string, unknown>[] {
  const enrichedContext = asRecord(recommendationInput.enrichedContext);
  const direct = asCandidateArray(enrichedContext.systemScopedVascList);
  if (direct.length > 0) return direct.map(normalizeScopedCandidate);

  const nestedSources = [
    asRecord(enrichedContext.valueAddProductRecommendation),
    asRecord(enrichedContext.recommendationContext),
    asRecord(enrichedContext.vascRecommendation),
  ];
  for (const source of nestedSources) {
    const scoped = asCandidateArray(source.systemScopedVascList);
    if (scoped.length > 0) return scoped.map(normalizeScopedCandidate);
  }
  return [];
}

function isInactive(candidate: Record<string, unknown>): boolean {
  const status = String(candidate.status ?? candidate.activeStatus ?? "").toLowerCase();
  return candidate.active === false || status === "inactive" || status === "disabled";
}

function forbiddenCodesFromContext(recommendationInput: Record<string, unknown>): Set<string> {
  const enrichedContext = asRecord(recommendationInput.enrichedContext);
  const codes = new Set<string>(["VASC202407031507376"]);
  const forbiddenProducts = [
    ...asCandidateArray(enrichedContext.forbiddenProducts),
    ...asCandidateArray(asRecord(enrichedContext.valueAddProductRecommendation).forbiddenProducts),
  ];
  for (const product of forbiddenProducts) {
    const code = asText(product.vascCode).toUpperCase();
    if (code) codes.add(code);
  }
  return codes;
}

function isForbidden(candidate: Record<string, unknown>, forbiddenCodes: Set<string>): boolean {
  const code = asText(candidate.vascCode).toUpperCase();
  if (code && forbiddenCodes.has(code)) return true;
  return asText(candidate.vascName) === "入库商品拍照";
}

function normalizedIntent(recommendationInput: Record<string, unknown>): string {
  return [
    recommendationInput.customerActionIntent,
    recommendationInput.customerActionNormalized,
    recommendationInput.customerIntent,
    recommendationInput.query,
  ]
    .map(asText)
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function isSubmittedOrderStatusQuery(intent: string): boolean {
  const compact = intent.replace(/[\s_-]+/g, "");
  return (
    compact.includes("QUERYSUBMITTEDVALUEADDSTATUS") ||
    compact.includes("VALUEADDORDERSTATUS") ||
    compact.includes("VASORDERSTATUS") ||
    compact.includes("VAORDERSTATUS") ||
    intent === "ORDER_STATUS" ||
    intent.includes("增值单状态") ||
    (intent.includes("已提交") && intent.includes("增值单")) ||
    ((intent.includes("处理到哪") || intent.includes("没处理完")) && intent.includes("增值单")) ||
    (/VALUE[-_\s]*ADD/.test(intent) && /ORDER/.test(intent) && /STATUS/.test(intent))
  );
}

function candidateText(candidate: Record<string, unknown>): string {
  return [
    candidate.vascCode,
    candidate.vascName,
    candidate.reason,
    candidate.source,
  ]
    .map(asText)
    .join(" ")
    .toUpperCase();
}

function wantsNewInboundOrder(intent: string): boolean {
  return (
    intent.includes("USE_NEW_INBOUND_ORDER") ||
    intent.includes("新单上架") ||
    intent.includes("新建入库单") ||
    intent.includes("新入库单") ||
    intent.includes("重新下一单") ||
    intent.includes("创建新单")
  );
}

function wantsOriginInboundOrder(intent: string): boolean {
  return (
    intent.includes("USE_ORIGIN_INBOUND_ORDER") ||
    intent.includes("原单上架") ||
    intent.includes("原入库单") ||
    intent.includes("继续使用原单") ||
    intent.includes("关联原单")
  );
}

function isAmbiguousActionIntent(intent: string): boolean {
  if (wantsNewInboundOrder(intent) || wantsOriginInboundOrder(intent)) return false;
  return (
    intent.includes("意图缺失") ||
    intent.includes("处理方式") ||
    intent.includes("怎么处理") ||
    intent.includes("如何处理") ||
    intent.includes("处理方向") ||
    intent.includes("异常明确但")
  );
}

function hasBothShelvingDirections(candidates: Record<string, unknown>[]): boolean {
  const labels = candidates.map(candidateText);
  const hasOrigin = labels.some((text) => text.includes("VASC202407031503503") || text.includes("原单"));
  const hasNew = labels.some((text) => text.includes("VASC202407161056217") || text.includes("新单"));
  return hasOrigin && hasNew;
}

function scoreCandidate(candidate: Record<string, unknown>, intent: string): number {
  const text = candidateText(candidate);
  let score = 0;
  if (wantsNewInboundOrder(intent)) {
    if (text.includes("VASC202407161056217") || text.includes("新单") || text.includes("NEW")) score += 100;
    if (text.includes("原单")) score -= 20;
  }
  if (wantsOriginInboundOrder(intent)) {
    if (text.includes("VASC202407031503503") || text.includes("原单") || text.includes("ORIGIN")) score += 100;
    if (text.includes("新单")) score -= 20;
  }
  if (intent.includes("DESTROY")) {
    if (text.includes("VASC202409121753076") || text.includes("DESTROY") || text.includes("销毁")) score += 100;
    if (text.includes("REPACK") || text.includes("包装加固") || text.includes("重新包装")) score -= 30;
  }
  if (intent.includes("PHOTO") || intent.includes("MEASURE") || intent.includes("VIDEO") || intent.includes("拍照") || intent.includes("视频")) {
    if (text.includes("VASC202411271721537") || text.includes("拍照") || text.includes("视频") || text.includes("PHOTO")) score += 100;
  }
  return score;
}

function intentSeedCandidates(intent: string): Record<string, unknown>[] {
  if (intent.includes("PHOTO") || intent.includes("MEASURE") || intent.includes("VIDEO") || intent.includes("拍照") || intent.includes("视频")) {
    return [
      {
        vascCode: "VASC202411271721537",
        vascName: "入库非标拍照或提供视频",
        active: true,
        source: "intent_seed",
        reason: "客户明确提出拍照、视频或调查诉求，按意图补充拍照/视频方向候选。",
      },
    ];
  }
  return [];
}

function seedCandidatesWithinScope(
  seededCandidates: Record<string, unknown>[],
  scopedCandidates: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (scopedCandidates.length === 0) return seededCandidates;
  const scopedKeys = new Set(scopedCandidates.map(candidateKey).filter(Boolean));
  const scopedNames = new Set(scopedCandidates.map((candidate) => asText(candidate.vascName)).filter(Boolean));
  return seededCandidates.filter((candidate) => {
    const key = candidateKey(candidate);
    const name = asText(candidate.vascName);
    return (key && scopedKeys.has(key)) || (name && scopedNames.has(name));
  });
}

function mergeCandidates(candidates: Record<string, unknown>[], seededCandidates: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const candidate of [...candidates, ...seededCandidates]) {
    const key = asText(candidate.vascCode) || `${asText(candidate.vascName)}:${asText(candidate.source)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(candidate);
  }
  return merged;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const recommendationInput = asRecord(params.recommendationInput);
  const intent = normalizedIntent(recommendationInput);
  const scopedCandidates = scopedCandidatesFromContext(recommendationInput);
  const sourceCandidates = scopedCandidates.length > 0 ? scopedCandidates : asCandidateArray(params.candidateSeed);
  const candidates = mergeCandidates(sourceCandidates, seedCandidatesWithinScope(intentSeedCandidates(intent), scopedCandidates));
  const forbiddenCodes = forbiddenCodesFromContext(recommendationInput);
  if (isSubmittedOrderStatusQuery(intent)) {
    return {
      filteredRecommendation: {
        recommendedVascCandidates: [],
        primaryRecommendation: null,
        notRecommendedOptions: [],
        missingConfirmations: [],
        outputPath: "handoff_to_order_status",
        handoffExpertId: "value-add-order-status",
      },
      recommendationInput,
    };
  }

  const recommendedVascCandidates = candidates
    .filter((candidate) => !isInactive(candidate) && !isForbidden(candidate, forbiddenCodes))
    .map((candidate, index) => ({ candidate, index, score: scoreCandidate(candidate, intent) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.candidate);
  const notRecommendedOptions = candidates
    .filter((candidate) => isInactive(candidate) || isForbidden(candidate, forbiddenCodes))
    .map((candidate) => ({
      ...candidate,
      reason: isForbidden(candidate, forbiddenCodes)
        ? "产品级 forbidden，全局禁推，不能作为可下单推荐"
        : candidate.reason || "VASC 未启用，不能作为可下单推荐",
    }));
  const requiresActionConfirmation =
    isAmbiguousActionIntent(intent) && hasBothShelvingDirections(recommendedVascCandidates);
  const missingConfirmations = requiresActionConfirmation
    ? [
        {
          field: "customerActionIntent",
          reason: "包裹/商品条码异常存在原单上架与新单上架等多个处理方向，需要客户先确认处理方式",
          source: "ask_customer",
          blockingMissing: true,
        },
      ]
    : recommendedVascCandidates.length > 0
      ? []
      : [
          {
            field: "customerActionIntent",
            reason: "缺少足够事实，无法给出首选 VASC",
            source: "ask_customer",
            blockingMissing: true,
          },
        ];

  return {
    filteredRecommendation: {
      recommendedVascCandidates,
      primaryRecommendation: requiresActionConfirmation ? null : (recommendedVascCandidates[0] ?? null),
      notRecommendedOptions,
      outputPath: recommendedVascCandidates.length > 0 && !requiresActionConfirmation ? "recommendation_ready" : "needs_confirmation",
      missingConfirmations,
    },
    recommendationInput,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("filter-by-constraints")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
