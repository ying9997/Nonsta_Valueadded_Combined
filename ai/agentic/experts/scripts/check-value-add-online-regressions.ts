/**
 * Regression checks for value-add online-test issues found on 2026-06-30.
 *
 * These checks execute local FaaS node files with synthetic, non-customer data.
 */
import { execFileSync } from "child_process";
import path from "path";

const repoRoot = path.resolve(__dirname, "..");
const tsNodeBin = require.resolve("ts-node/dist/bin.js");

let failed = false;

function fail(message: string): never {
  failed = true;
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function runNode<T = Record<string, unknown>>(relativeFile: string, params: Record<string, unknown>): T {
  const stdout = execFileSync(
    process.execPath,
    [tsNodeBin, "-P", path.join(repoRoot, "scripts", "tsconfig.json"), path.join(repoRoot, relativeFile), JSON.stringify(params)],
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return JSON.parse(stdout) as T;
}

function checkInboundMissingOrderClarifies() {
  const result = runNode("experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts", {
    rawOrderData: { list: [] },
    rawExceptionData: { list: [], total: 0 },
    exceptionDescription: "我想查入库异常",
    queryAllExceptions: false,
    inboundOrderNos: [],
  });

  assert(result.needsClarification === true, "IEC-009 should require clarification when inbound order is missing");
  assert(
    asArray(result.clarificationFields).includes("inboundOrderNo"),
    "IEC-009 should ask for inboundOrderNo"
  );
  assert(result.discrepancyReport === null, "IEC-009 should not create a zero discrepancy report");
  assert(result.needsHumanReview === false, "IEC-009 should not imply human review facts without an order");

  const formatted = runNode("experts/inbound/inbound-exception-check/nodes/format-output.ts", {
    analysisResult: {
      structured: {
        suggestedNextExpert: "value-add/value-add-exception-diagnosis",
        valueAddHandoff: {},
      },
      analysis: "文本不能单独宣布进入 value-add 推荐链。",
    },
    valueAddHandoff: {},
    inputContext: { chainId: "IEC-handoff-guard" },
  });
  const formattedStructured = asRecord(formatted.structured);
  assert(
    formattedStructured.suggestedNextExpert === "",
    "Inbound formatter should clear suggestedNextExpert when valueAddHandoff is empty"
  );
}

function checkInboundUnresolvedOrderDoesNotBecomeZeroReport() {
  const result = runNode("experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts", {
    rawOrderData: { list: [], total: 0 },
    rawExceptionData: { list: [], total: 0 },
    exceptionDescription: "订单延迟",
    queryAllExceptions: true,
    inboundOrderNos: ["WI123456"],
  });

  assert(
    result.needsClarification === true,
    "Inbound unresolved order should require clarification even when queryAllExceptions=true"
  );
  assert(
    asArray(result.clarificationFields).includes("inboundOrderNo"),
    "Inbound unresolved order should ask customer to confirm inboundOrderNo"
  );
  assert(result.discrepancyReport === null, "Inbound unresolved order should not create a zero discrepancy report");

  const formatted = runNode("experts/inbound/inbound-exception-check/nodes/format-output.ts", {
    analysisResult: {
      structured: {
        needsClarification: false,
        clarificationFields: [],
        discrepancyReport: {
          orderNo: "",
          forecastQty: 0,
          receivedQty: 0,
          putawayQty: 0,
          discrepancy: 0,
          discrepancyRate: 0,
          isAbnormal: false,
        },
      },
      analysis: "模型不应把缺失事实改写为 0 差异。",
    },
    discrepancyReport: null,
    needsClarification: true,
    clarificationFields: ["inboundOrderNo"],
    valueAddHandoff: {},
    inputContext: { chainId: "IEC-unresolved-order" },
  });
  const formattedStructured = asRecord(formatted.structured);
  assert(formattedStructured.discrepancyReport === null, "Inbound formatter should preserve null discrepancyReport");
  assert(formattedStructured.needsClarification === true, "Inbound formatter should preserve clarification decision");
  assert(
    asArray(formattedStructured.clarificationFields).includes("inboundOrderNo"),
    "Inbound formatter should preserve clarificationFields"
  );
}

function checkInboundHeadLegGapDoesNotBecomePutawayDiscrepancy() {
  const result = runNode("experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts", {
    rawOrderData: {
      list: [
        {
          orderNo: "WI50279254",
          status: "TS",
          winitProductCode: "OW01011006815",
          winitProductName: "海运散货-以星-B价",
          destinationWarehouseName: "USWC Warehouse",
          containerNo: "JXLU4700424",
          logisticsPlanName: "CNYTN-US-04-Jun-26",
          merchandiseList: [
            {
              merchandiseCode: "SKU-A",
              quantity: 43,
              inspectionQty: 43,
              actualQuantity: 0,
              standardPartsNum: 1,
            },
          ],
        },
      ],
    },
    rawExceptionData: { list: [], total: 0 },
    exceptionDescription: "异常名称",
    queryAllExceptions: false,
    inboundOrderNos: ["WI50279254"],
  });

  assert(result.coverageGap === true, "IEC head-leg order should expose coverageGap");
  assert(result.orderPhaseHint === "first_leg_or_customs", "IEC head-leg order should expose first-leg phase hint");
  assert(result.isPutawayComparable === false, "IEC head-leg order should not compare putaway quantity yet");
  assert(result.needsHumanReview === true, "IEC head-leg coverage gap should require human verification");
  assert(
    String(result.humanReviewReason ?? "").includes("头程") &&
      !String(result.humanReviewReason ?? "").includes("差异率 100.0%"),
    "IEC head-leg coverage gap should not be explained as a 100% putaway discrepancy"
  );
  assert(
    asRecord(result.discrepancyReport).discrepancyRate !== 1,
    "IEC head-leg order should not report a 100% putaway discrepancy"
  );

  const keywordResult = runNode("experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts", {
    rawOrderData: {
      list: [
        {
          orderNo: "WI50279254",
          status: "OD",
          winitProductCode: "OW01011006815",
          merchandiseList: [
            {
              merchandiseCode: "SKU-A",
              quantity: 43,
              inspectionQty: 43,
              actualQuantity: 0,
              standardPartsNum: 1,
            },
          ],
        },
      ],
    },
    rawExceptionData: { list: [], total: 0 },
    exceptionDescription: "送仓进口海关查验-实物查验",
    queryAllExceptions: false,
    inboundOrderNos: ["WI50279254"],
  });
  assert(keywordResult.coverageGap === true, "IEC customs keywords should trigger coverageGap");

  const formatted = runNode("experts/inbound/inbound-exception-check/nodes/format-output.ts", {
    analysisResult: {
      structured: {
        coverageGap: false,
        isPutawayComparable: true,
      },
      analysis: "模型不应覆盖确定性的头程覆盖缺口判断。",
    },
    coverageGap: true,
    coverageGapReason: "当前对客入库异常接口未返回头程/清关异常明细，需人工通过内部系统核实。",
    orderPhaseHint: "first_leg_or_customs",
    isPutawayComparable: false,
    humanReviewReason: "当前订单仍处于头程/清关相关阶段，需人工核实。",
    inputContext: { chainId: "IEC-head-leg-gap" },
  });
  const formattedStructured = asRecord(formatted.structured);
  assert(formattedStructured.coverageGap === true, "Inbound formatter should preserve coverageGap");
  assert(
    formattedStructured.isPutawayComparable === false,
    "Inbound formatter should preserve isPutawayComparable"
  );
}

function checkInboundPackageDiscrepancyWithEmptyExceptionLookup() {
  const result = runNode("experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts", {
    rawOrderData: {
      list: [
        {
          orderNo: "WI-PACKAGE-GAP",
          status: "EWC",
          orderMerchandiseQty: 810,
          actualOrderMerchandiseQty: 810,
          orderPackageQty: 27,
          actualOrderPackageQty: 20,
        },
      ],
    },
    rawExceptionData: {
      list: [],
      total: 0,
      _fetchMeta: { strategy: "plugin-batch", status: "success_empty", resolvedCount: 0 },
    },
    query: "这票为什么有7箱显示异常",
    customerIntent: "核实包裹数量差异",
    inboundOrderNos: ["WI-PACKAGE-GAP"],
  });

  const report = asRecord(result.discrepancyReport);
  assert(report.packageDiscrepancy === 7, "IEC package gap should expose a 7-package discrepancy");
  assert(report.hasPackageDiscrepancy === true, "IEC package gap should be marked as a package discrepancy");
  assert(result.needsHumanReview === true, "IEC package gap at EWC should require human verification");
  assert(result.exceptionLookupStatus === "success_empty", "IEC should preserve successful empty lookup status");
  assert(
    String(result.humanReviewReason ?? "").includes("预报 27 箱、实收 20 箱") &&
      !String(result.humanReviewReason ?? "").includes("待上架"),
    "IEC should state the package facts without inventing a putaway status"
  );

  const inProgress = runNode("experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts", {
    rawOrderData: {
      list: [
        {
          orderNo: "WI-PACKAGE-IN-PROGRESS",
          status: "TS",
          orderMerchandiseQty: 810,
          actualOrderMerchandiseQty: 810,
          orderPackageQty: 27,
          actualOrderPackageQty: 20,
        },
      ],
    },
    rawExceptionData: {
      list: [],
      total: 0,
      _fetchMeta: { strategy: "plugin-batch", status: "success_empty", resolvedCount: 0 },
    },
    query: "查询当前入库进度",
    inboundOrderNos: ["WI-PACKAGE-IN-PROGRESS"],
  });
  assert(
    inProgress.needsHumanReview === false,
    "IEC should not treat an in-progress package count as a final discrepancy without package concern"
  );

  const formatted = runNode("experts/inbound/inbound-exception-check/nodes/format-output.ts", {
    analysisResult: {
      structured: {
        needsHumanReview: false,
        exceptionLookupStatus: "success_with_records",
      },
      analysis: "模型不应覆盖代码层判断。",
    },
    discrepancyReport: result.discrepancyReport,
    needsHumanReview: true,
    humanReviewReason: result.humanReviewReason,
    exceptionLookupStatus: "success_empty",
    exceptionLookupMessage: "异常单接口调用成功，但未返回异常明细。",
    valueAddHandoff: {},
    inputContext: { chainId: "IEC-package-gap" },
  });
  const formattedStructured = asRecord(formatted.structured);
  assert(formattedStructured.needsHumanReview === true, "IEC formatter should preserve deterministic review decision");
  assert(
    formattedStructured.exceptionLookupStatus === "success_empty",
    "IEC formatter should preserve deterministic lookup status"
  );

  const unknownReceivedPackages = runNode(
    "experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts",
    {
      rawOrderData: {
        list: [
          {
            orderNo: "WI51049591",
            status: "EWC",
            orderMerchandiseQty: 810,
            actualOrderMerchandiseQty: 810,
            orderPackageQty: 27,
          },
        ],
      },
      rawExceptionData: {
        list: [],
        total: 0,
        _fetchMeta: { strategy: "plugin-batch", status: "success_empty", resolvedCount: 0 },
      },
      query: "查询 WI51049591 当前异常情况",
      inboundOrderNos: ["WI51049591"],
    }
  );
  const unknownReport = asRecord(unknownReceivedPackages.discrepancyReport);
  assert(unknownReport.hasReceivedPackageFact === false, "IEC should mark missing received package facts");
  assert(unknownReport.receivedPackageQty === null, "IEC must not coerce missing received packages to zero");
  assert(unknownReport.packageDiscrepancy === null, "IEC must not derive a package gap from missing facts");
  assert(unknownReport.packageDiscrepancyRate === null, "IEC must not derive a package rate from missing facts");
  assert(
    unknownReport.hasPackageDiscrepancy === false,
    "IEC should not assert a package discrepancy when the received package fact is missing"
  );

  const followUp = runNode("experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts", {
    rawOrderData: {
      list: [
        {
          orderNo: "WI51049591",
          status: "EWC",
          orderMerchandiseQty: 810,
          actualOrderMerchandiseQty: 810,
          orderPackageQty: 27,
        },
      ],
    },
    rawExceptionData: {
      list: [],
      total: 0,
      _fetchMeta: { strategy: "plugin-batch", status: "success_empty", resolvedCount: 0 },
    },
    query: "后来补了异常增值单 VASC000000294237，帮我看处理进度",
    inboundOrderNos: ["WI51049591"],
    inputContext: {
      previousOutput: {
        structured: {
          orderNo: "WI51049591",
          totalExceptions: 7,
          exceptionTypes: ["QTY_DIFF"],
        },
        analysis: "上一轮查询到 7 个异常记录。",
      },
    },
  });
  const continuity = asRecord(followUp.contextContinuity);
  const followUpHandoff = asRecord(followUp.valueAddHandoff);
  assert(
    followUp.suggestedNextExpert === "value-add/value-add-order-status",
    "IEC submitted VAS follow-up should route to value-add-order-status"
  );
  assert(followUp.followUpVasOrderNo === "VASC000000294237", "IEC should extract the submitted VAS order no");
  assert(followUp.needsFollowUp === true, "IEC submitted VAS context should require a follow-up query");
  assert(
    continuity.currentLookupDoesNotOverridePrevious === true,
    "IEC current empty snapshot must not override previous exception context"
  );
  assert(
    followUpHandoff.vasOrderNo === "VASC000000294237" && followUpHandoff.businessNo === "WI51049591",
    "IEC should preserve both VAS and inbound order identifiers in the status handoff"
  );

  const formattedFollowUp = runNode("experts/inbound/inbound-exception-check/nodes/format-output.ts", {
    analysisResult: {
      structured: {
        suggestedNextExpert: "",
        valueAddHandoff: {},
        needsFollowUp: false,
      },
      analysis: "当前接口为空。",
    },
    discrepancyReport: followUp.discrepancyReport,
    suggestedNextExpert: followUp.suggestedNextExpert,
    valueAddHandoff: followUp.valueAddHandoff,
    contextContinuity: followUp.contextContinuity,
    followUpVasOrderNo: followUp.followUpVasOrderNo,
    needsFollowUp: followUp.needsFollowUp,
    followUpReason: followUp.followUpReason,
  });
  const formattedFollowUpStructured = asRecord(formattedFollowUp.structured);
  assert(
    formattedFollowUpStructured.suggestedNextExpert === "value-add/value-add-order-status" &&
      asRecord(formattedFollowUpStructured.valueAddHandoff).vasOrderNo === "VASC000000294237",
    "IEC formatter must preserve the deterministic submitted VAS handoff over LLM output"
  );
}

function checkInboundExceptionLookupClassification() {
  const baseParams = {
    exceptionActionPlans: [{ orderNo: "WI-LOOKUP" }],
  };
  const successEmpty = runNode("experts/inbound/inbound-exception-check/nodes/fetch-exception-list.ts", {
    ...baseParams,
    winitExceptionPluginOutputList: [{ code: 0, data: "", msg: "ok" }],
  });
  assert(
    asRecord(asRecord(successEmpty.rawExceptionData)._fetchMeta).status === "success_empty",
    "IEC empty plugin data should be classified as success_empty"
  );

  const apiError = runNode("experts/inbound/inbound-exception-check/nodes/fetch-exception-list.ts", {
    ...baseParams,
    winitExceptionPluginOutputList: [{ code: 500, data: "", msg: "request failed" }],
  });
  assert(
    asRecord(asRecord(apiError.rawExceptionData)._fetchMeta).status === "api_error",
    "IEC non-zero plugin code should be classified as api_error"
  );

  const parseError = runNode("experts/inbound/inbound-exception-check/nodes/fetch-exception-list.ts", {
    ...baseParams,
    winitExceptionPluginOutputList: [{ code: 0, data: JSON.stringify({ unexpected: true }), msg: "ok" }],
  });
  assert(
    asRecord(asRecord(parseError.rawExceptionData)._fetchMeta).status === "parse_error",
    "IEC unknown non-empty response should be classified as parse_error"
  );

  const withRecords = runNode("experts/inbound/inbound-exception-check/nodes/fetch-exception-list.ts", {
    ...baseParams,
    winitExceptionPluginOutputList: [
      {
        code: 0,
        data: JSON.stringify([
          {
            exceptionName: "LABEL_MISSING",
            exceptionDesc: "label missing",
            exceptionDetailList: [{ packageSerno: "PKG-1" }],
          },
        ]),
        msg: "ok",
      },
    ],
  });
  const recordData = asRecord(withRecords.rawExceptionData);
  assert(asArray(recordData.list).length === 1, "IEC should retain recognized exception records");
  assert(
    asRecord(recordData._fetchMeta).status === "success_with_records",
    "IEC recognized records should be classified as success_with_records"
  );
}

function checkProductRecommendationIntentPriority() {
  const result = runNode("experts/value-add/value-add-product-recommendation/nodes/filter-by-constraints.ts", {
    recommendationInput: {
      query: "商品条码异常，客户要新建入库单上架，推荐哪个 VASC？",
      customerActionIntent: "客户希望新建入库单后上架",
    },
    candidateSeed: [
      {
        vascCode: "VASC202407031503503",
        vascName: "原单上架",
        active: true,
        reason: "商品条码异常映射",
      },
      {
        vascCode: "VASC202407161056217",
        vascName: "新单上架（客户创建）",
        active: true,
        reason: "商品条码异常映射",
      },
    ],
  });
  const filtered = asRecord(result.filteredRecommendation);
  const primary = asRecord(filtered.primaryRecommendation);

  assert(primary.vascCode === "VASC202407161056217", "VPR-002 should prioritize new-order shelving intent");
  assert(filtered.outputPath === "recommendation_ready", "VPR-002 should remain recommendation_ready");
}

function checkProductRecommendationAmbiguousIntentClarifies() {
  const result = runNode("experts/value-add/value-add-product-recommendation/nodes/filter-by-constraints.ts", {
    recommendationInput: {
      query: "这个包裹条码异常怎么处理？",
      customerActionIntent: "异常明确但意图缺失",
    },
    candidateSeed: [
      {
        vascCode: "VASC202407031503503",
        vascName: "原单上架",
        active: true,
        reason: "包裹条码状态异常映射",
      },
      {
        vascCode: "VASC202407161056217",
        vascName: "新单上架（客户创建）",
        active: true,
        reason: "包裹条码状态异常映射",
      },
    ],
  });
  const filtered = asRecord(result.filteredRecommendation);

  assert(filtered.outputPath === "needs_confirmation", "VPR-004 should clarify ambiguous customer action");
  assert(filtered.primaryRecommendation === null, "VPR-004 should not provide a primary recommendation");
  assert(
    asArray(filtered.missingConfirmations).some((item) => asRecord(item).field === "customerActionIntent"),
    "VPR-004 should require customerActionIntent confirmation"
  );
}

function checkServiceConfigFlatHandoffAndConflict() {
  const flat = runNode("experts/value-add/value-add-service-config/nodes/validate-input.ts", {
    handoffToServiceConfig: {
      vascCode: "VASC202407031503503",
      vascName: "原单上架",
      customerActionNormalized: "原单上架",
    },
  });
  const flatInput = asRecord(flat.rawServiceConfigInput);
  assert(flatInput.vascCode === "VASC202407031503503", "VSC-003 should consume flat handoffToServiceConfig.vascCode");

  const conflict = runNode("experts/value-add/value-add-service-config/nodes/validate-input.ts", {
    vascCode: "VASC202407161056217",
    vascName: "新单上架",
    handoffToServiceConfig: {
      vascCode: "VASC202407031503503",
      vascName: "原单上架",
      customerActionNormalized: "原单上架",
    },
  });
  const conflictInput = asRecord(conflict.rawServiceConfigInput);
  const validation = asRecord(conflict.validationResult);
  assert(conflictInput.vascCode === "VASC202407031503503", "VSC-008 should prefer handoff over direct vascCode");
  assert(validation.outputPath === "conditional", "VSC-008 should mark direct/handoff conflict as conditional");
  assert(
    asArray(validation.missingConfirmations).some((item) => asRecord(item).field === "vascConflict"),
    "VSC-008 should expose conflict confirmation"
  );
}

function checkServiceConfigStatusBoundary() {
  const result = runNode("experts/value-add/value-add-service-config/nodes/validate-input.ts", {
    query: "我有一张已提交的增值单 VASC000000294237，想查现在处理到哪一步了。",
    serviceIntent: "查询已提交增值单状态",
    scenarioConditions: { vasOrderNo: "VASC000000294237" },
  });
  const validation = asRecord(result.validationResult);

  assert(validation.outputPath === "escalated", "VSC-010 should escalate submitted value-add order status queries");
  assert(validation.handoffExpertId === "value-add-order-status", "VSC-010 should hand off to order-status expert");

  const formatted = runNode("experts/value-add/value-add-service-config/nodes/format-output.ts", {
    configEvidence: {
      outputPath: "conditional",
      vasc: { vascCode: "VASC202407031503503", vascName: "原单上架", activeStatus: "active" },
      selectableServiceItems: [{ serviceItemCode: "OW01V1560", serviceItemName: "入库-补贴包裹条码" }],
      missingConfirmations: [{ field: "fieldEvidence", reason: "字段证据不足" }],
      fieldEvidenceStatus: "partial_field_evidence",
      fieldEvidenceSummary: { status: "partial_field_evidence" },
      blockedClaims: ["不承诺完整字段、附件、模板、枚举和页面可下单状态"],
    },
    inputContext: { chainId: "VSC-format" },
  });
  const structured = asRecord(formatted.structured);
  assert(asArray(structured.serviceItems).length === 1, "VSC format should expose serviceItems alias");
  assert(asArray(structured.missingConfirmations).length === 1, "VSC format should expose missingConfirmations");
  assert(
    asRecord(structured.fieldEvidenceSummary).status === "partial_field_evidence",
    "VSC format should expose fieldEvidenceSummary"
  );
}

function checkExceptionDiagnosisHandoffPriorityAndNaturalLanguage() {
  const conflict = runNode("experts/value-add/value-add-exception-diagnosis/nodes/normalize-exception-facts.ts", {
    rawExceptionInput: {
      exceptionCode: "B02E0001",
      exceptionName: "直接入参异常",
      valueAddHandoff: {
        exceptionCode: "B01E1615",
        exceptionName: "包裹条码批量异常（需客户处理）",
        objectLevel: "package",
        customerActionHint: "继续上架",
        evidenceSummary: { source: "inbound-exception-check", verified: true },
      },
    },
    validationResult: { ok: true },
  });
  const diagnosisInput = asRecord(conflict.diagnosisInput);
  assert(diagnosisInput.exceptionCode === "B01E1615", "VED-006 should prefer verified valueAddHandoff facts");
  assert(asArray(diagnosisInput.conflictWarnings).includes("exceptionCode"), "VED-006 should record direct/handoff conflict");

  const natural = runNode("experts/value-add/value-add-exception-diagnosis/nodes/normalize-exception-facts.ts", {
    rawExceptionInput: {
      query: "包裹条码贴错了，客户希望继续上架，这是不是增值处理？",
      customerDescription: "包裹条码贴错了，客户希望继续上架处理",
      valueAddHandoff: {},
    },
    validationResult: { ok: true },
  });
  const naturalInput = asRecord(natural.diagnosisInput);
  assert(naturalInput.exceptionCode === "B01E1615", "VED-008 should normalize package barcode natural language");
  assert(naturalInput.exceptionCategory === "barcode_package", "VED-008 should mark package barcode category");

  const formatted = runNode("experts/value-add/value-add-exception-diagnosis/nodes/format-output.ts", {
    diagnosisInput: naturalInput,
    candidacyDecision: {
      outputPath: "candidate",
      isValueAddCandidate: true,
      missingEvidence: [],
      handoffFacts: naturalInput,
    },
    inputContext: { chainId: "VED-format" },
  });
  const structured = asRecord(formatted.structured);
  assert(
    asRecord(structured.normalizedException).code === "B01E1615",
    "VED format should expose normalizedException"
  );
}

function checkOrderStatusOutputCompatibility() {
  const result = runNode("experts/value-add/value-add-order-status/nodes/format-output.ts", {
    statusFacts: {
      outputPath: "status_found",
      orderNo: "VASC000000294237",
      status: "PD",
      statusDesc: "已完成",
      atomProgress: [],
      missingEvidence: ["parentGoodsId"],
    },
    analysisResult: {
      analysis: "已查询到增值单VASC000000294237的主状态为已完成。当前无异常需要您操作，可正常等待后续流程。",
    },
    inputContext: { chainId: "VAOS-009" },
  });
  const structured = asRecord(result.structured);
  const analysis = String(result.analysis ?? "");

  assert(structured.vasOrderNo === "VASC000000294237", "VAOS-001 should expose vasOrderNo");
  assert(!analysis.includes("等待"), "VAOS-009 completed status should not tell customer to wait");
  assert(structured.nextAction === "无需继续等待或额外操作。", "VAOS-009 should use completed nextAction");
}

const checks: Array<[string, () => void]> = [
  ["IEC-009 missing order clarifies", checkInboundMissingOrderClarifies],
  ["IEC unresolved order avoids zero report", checkInboundUnresolvedOrderDoesNotBecomeZeroReport],
  ["IEC head-leg coverage gap avoids putaway discrepancy", checkInboundHeadLegGapDoesNotBecomePutawayDiscrepancy],
  ["IEC package discrepancy with empty lookup", checkInboundPackageDiscrepancyWithEmptyExceptionLookup],
  ["IEC exception lookup classification", checkInboundExceptionLookupClassification],
  ["VPR-002 new-order intent priority", checkProductRecommendationIntentPriority],
  ["VPR-004 ambiguous intent clarifies", checkProductRecommendationAmbiguousIntentClarifies],
  ["VSC handoff flat fields and conflict", checkServiceConfigFlatHandoffAndConflict],
  ["VSC-010 status boundary", checkServiceConfigStatusBoundary],
  ["VED conflict and natural language normalization", checkExceptionDiagnosisHandoffPriorityAndNaturalLanguage],
  ["VAOS output compatibility and completed wording", checkOrderStatusOutputCompatibility],
];

for (const [name, check] of checks) {
  try {
    check();
    console.log(`OK   ${name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
console.log("Value-add online regression checks OK");
