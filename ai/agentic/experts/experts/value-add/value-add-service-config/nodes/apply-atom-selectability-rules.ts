/**
 * 节点：apply-atom-selectability-rules — 输出已覆盖规则和待确认规则证据。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseRuleRows(kb: string): Array<Record<string, string>> {
  return kb
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*:?-{3,}/.test(line))
    .map((line) => line.split("|").map((part) => part.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 10 && cells[0] !== "ruleId")
    .map((cells) => ({
      ruleId: cells[0] || "",
      atomCode: cells[1] || "",
      atomName: cells[2] || "",
      ruleType: cells[3] || "",
      effectType: cells[4] || "",
      condition: cells[5] || "",
      result: cells[6] || "",
      messageOrCode: cells[7] || "",
      confidence: cells[8] || "",
      boundary: cells[9] || "",
    }));
}

function parseServiceRows(kb: string, vascCode: string): Array<Record<string, unknown>> {
  return kb
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*:?-{3,}/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((part) => part.trim().replace(/^`|`$/g, "")))
    .filter((cells) => cells.length >= 9 && cells[0] !== "vascCode" && cells[0] === vascCode)
    .map((cells) => ({
      vascCode: cells[0] || "",
      vascName: cells[1] || "",
      activeStatus: cells[2] || "",
      seq: Number(cells[3]) || 0,
      serviceItemCode: cells[4] || "",
      serviceItemName: cells[5] || "",
      atomCode: cells[4] || "",
      atomName: cells[5] || "",
      requiredInVasc: cells[6] || "",
      mutexGroup: cells[7] || "",
      attrSpecStatus: cells[8] || "",
    }))
    .sort((a, b) => Number(a.seq) - Number(b.seq));
}

function hasScenarioFacts(scenarioConditions: Record<string, unknown>): boolean {
  return Object.keys(scenarioConditions).some((key) => {
    const value = scenarioConditions[key];
    return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
  });
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
}

function selectedAtoms(scenarioConditions: Record<string, unknown>): Set<string> {
  return new Set(asStringArray(scenarioConditions.selectedAtoms));
}

function buildScenarioBlockedItems(
  serviceItems: Array<Record<string, unknown>>,
  scenarioConditions: Record<string, unknown>
): Array<Record<string, unknown>> {
  const selected = selectedAtoms(scenarioConditions);
  const atomCode = asText(scenarioConditions.atomCode);
  const blocked: Array<Record<string, unknown>> = [];
  const serviceByCode = new Map(serviceItems.map((item) => [asText(item.atomCode), item]));

  if ((atomCode === "OW01V1561" || selected.has("OW01V1561")) && !selected.has("OW01V1558") && !selected.has("OW01V1559")) {
    const item = serviceByCode.get("OW01V1561") ?? {};
    blocked.push({
      ...item,
      atomCode: "OW01V1561",
      atomName: asText(item.atomName) || "入库-更换商品包装",
      ruleType: "dependency",
      condition: "selected OW01V1561 without OW01V1558 or OW01V1559",
      reason: "选择更换商品包装时，需要同时选择商品级补贴原 SKU 条码 OW01V1558 或更换新 SKU 条码 OW01V1559。",
      boundary: "frontend提示和提交校验",
    });
  }

  const asksOw01v1572 = atomCode === "OW01V1572" || selected.has("OW01V1572");
  const isEventVa = scenarioConditions.isEventVa === true || scenarioConditions.isEventVa === "true";
  const thirdPartyBarcodeMissing =
    scenarioConditions.thirdPartyBarcodeMissing === true || scenarioConditions.thirdPartyBarcodeMissing === "true";
  if (asksOw01v1572 && (!isEventVa || thirdPartyBarcodeMissing)) {
    const item = serviceByCode.get("OW01V1572") ?? {};
    blocked.push({
      ...item,
      atomCode: "OW01V1572",
      atomName: asText(item.atomName) || "入库-第三方商品条码关联",
      ruleType: "disabled",
      condition: !isEventVa ? "not event value-add entry" : "third party barcode missing",
      reason: !isEventVa
        ? "第三方商品条码关联仅支持异常单入口下发，非异常单入口不可选。"
        : "异常单入口缺少第三方商品条码时，第三方商品条码关联不可选。",
      boundary: "confirmed",
    });
  }

  return blocked;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const serviceConfigInput = asRecord(params.serviceConfigInput);
  const vascCode = asText(serviceConfigInput.vascCode);
  const presetOutputPath = asText(serviceConfigInput.outputPath);
  const serviceIntent = asText(serviceConfigInput.serviceIntent);
  const scenarioConditions = asRecord(serviceConfigInput.scenarioConditions);
  const serviceOrchestrationKb = asText(params.serviceOrchestrationKb);
  const atomSelectabilityKb = asText(params.kbAtomSelectability);
  const fieldEvidenceKb = asText(params.fieldEvidenceKb);
  if (presetOutputPath === "escalated") {
    return {
      configEvidence: {
        outputPath: "escalated",
        vasc: { vascCode, vascName: asText(serviceConfigInput.vascName), activeStatus: "" },
        serviceIntent,
        selectableServiceItems: [],
        serviceItems: [],
        blockedServiceItems: [],
        mutexGroups: [],
        blockingReasons: ["已提交增值单状态查询不属于服务配置解释范围"],
        pendingRuleEvidence: [],
        fieldEvidenceStatus: "not_applicable",
        fieldEvidenceSummary: { status: "not_applicable", reason: "submitted_value_add_order_status_query" },
        blockedClaims: ["不查询或解释已提交增值单状态"],
        missingConfirmations: [],
        handoffExpertId: asText(serviceConfigInput.handoffExpertId) || "value-add-order-status",
        scenarioConditions,
      },
      serviceConfigInput,
    };
  }
  const ruleRows = parseRuleRows(atomSelectabilityKb);
  const serviceItems = parseServiceRows(serviceOrchestrationKb, vascCode);
  const activeStatus = asText(serviceItems[0]?.activeStatus);
  const isInactiveVasc = activeStatus.toLowerCase() === "inactive";
  const blockedServiceItems = buildScenarioBlockedItems(serviceItems, scenarioConditions);
  const mutexGroups = ruleRows
    .filter((row) => row.ruleType === "mutex")
    .map((row) => ({
      atomCode: row.atomCode,
      atomName: row.atomName,
      condition: row.condition,
      reason: row.messageOrCode || row.result,
    }));
  const hasParsedRules = ruleRows.length > 0;
  const needsScenarioEvidence =
    hasParsedRules && !hasScenarioFacts(scenarioConditions) && ruleRows.some((row) => row.condition !== "无条件隐藏");
  const pendingRuleEvidence =
    !hasParsedRules || needsScenarioEvidence
      ? [
          {
            field: !hasParsedRules ? "atomSelectability" : "scenarioConditions",
            reason: !hasParsedRules
              ? "当前离线规则未覆盖或依赖动态配置，不能给确定可选/禁选结论"
              : "已加载原子规则，但缺少场景条件，不能强判可选、禁选或互斥",
            source: !hasParsedRules ? "knowledge_gap" : "ask_customer_or_upstream",
          },
        ]
      : [];

  return {
    configEvidence: {
      outputPath:
        presetOutputPath === "missing_vasc"
          ? "missing_vasc"
          : presetOutputPath === "conditional"
            ? "conditional"
            : isInactiveVasc ? "inactive_vasc" : "",
      vasc: {
        vascCode,
        vascName: asText(serviceConfigInput.vascName) || asText(serviceItems[0]?.vascName),
        activeStatus,
      },
      serviceIntent,
      selectableServiceItems:
        isInactiveVasc
          ? []
          : serviceItems,
      serviceItems:
        isInactiveVasc
          ? []
          : serviceItems,
      blockedServiceItems,
      mutexGroups,
      blockingReasons: [],
      pendingRuleEvidence,
      fieldEvidenceStatus: "partial_field_evidence",
      fieldEvidenceSummary: { status: "partial_field_evidence" },
      blockedClaims: [
        "不承诺完整字段、附件、模板、枚举和页面可下单状态",
        ...(isInactiveVasc ? ["activeStatus=inactive，只作历史线索，不承诺当前可下单"] : []),
      ],
      missingConfirmations: serviceConfigInput.missingConfirmations ?? [],
      handoffExpertId: asText(serviceConfigInput.handoffExpertId),
      scenarioConditions,
      evidenceSources: {
        serviceOrchestration: serviceOrchestrationKb.length > 0 ? "loaded" : "missing",
        atomSelectability: atomSelectabilityKb.length > 0 ? "loaded" : "missing",
        fieldEvidence: fieldEvidenceKb.length > 0 ? "loaded" : "missing",
      },
    },
    serviceConfigInput,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("apply-atom-selectability-rules")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "apply-atom-selectability-rules failed");
      process.exit(1);
    });
}
