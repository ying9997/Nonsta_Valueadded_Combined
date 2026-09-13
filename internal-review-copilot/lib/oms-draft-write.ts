import { envText } from "./env.ts";
import { asArray, asRecord, asText } from "./oms-adapter.ts";
import { assertNotReviewApi, createTomClient, type TomClient } from "./oms-tom-client.ts";
import { findScenarioCard } from "./scenario-cards.ts";
import { extractSopSections, sectionOf } from "./sop-sections.ts";

export interface DraftWriteInput {
  orderNo: string;
  sceneOverviewCode: string;
  /** 只放操作步骤（warehouseSop），不要传带【需求背景】的全文。 */
  sop: string;
  warehouseAction?: {
    code: string;
    qty: number;
    chargeCode: string;
    priceListId: number;
    revenueMode: string;
    name?: string;
    chargeName?: string;
    chargeId?: string | number;
  };
  /** AI 总结的需求描述，追加到 OMS 需求描述字段。 */
  aiRequirementDescription?: string;
  /** AI 总结的需求背景，追加到 OMS 需求背景（BEOR）字段。 */
  aiRequirementBackground?: string;
  /** 兼容旧调用：当作需求描述总结。推荐改用 aiRequirementDescription。 */
  aiSummary?: string;
  mutateRequirementAttrs?: boolean;
  dryRun?: boolean;
}

export interface DraftWriteResult {
  success: boolean;
  dryRun: boolean;
  written: string[];
  skipped: string[];
  readBack?: Record<string, string>;
  error?: string;
}

export function isOmsWriteEnabled(): boolean {
  const v = envText("OMS_WRITE_ENABLED").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function omsWriteAllowlist(): string[] {
  return envText("OMS_WRITE_ALLOWLIST")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isOrderOnWriteAllowlist(orderNo: string): boolean {
  const allow = omsWriteAllowlist();
  if (allow.includes("*")) return true;
  return Boolean(orderNo) && allow.includes(orderNo);
}

export function sceneCodeFromKey(sceneKey: string): string {
  if (!sceneKey) throw new Error("缺少 sceneKey，无法映射 OMS 场景码");
  const card = findScenarioCard(sceneKey);
  const code = asText(card?.omsSceneCode);
  if (!code) throw new Error(`场景 ${sceneKey} 没有 omsSceneCode`);
  return code;
}

function willReallyWrite(input: DraftWriteInput): { dryRun: boolean; error?: string } {
  const wantWrite = input.dryRun === false;
  if (!wantWrite) return { dryRun: true };
  if (!isOmsWriteEnabled()) return { dryRun: true };
  if (!isOrderOnWriteAllowlist(input.orderNo)) {
    return { dryRun: true, error: `${input.orderNo} 不在 OMS_WRITE_ALLOWLIST，拒绝真写` };
  }
  return { dryRun: false };
}

function isRequirementDescriptionAttr(attr: Record<string, unknown>): boolean {
  const key = asText(attr.attributeKeyOriginal) || asText(attr.attributeKey);
  const name = asText(attr.attributeName);
  return key === "VAS_ATTR_REL_RD" || key === "需求描述" || name === "需求描述";
}

function currentRequirementDescription(atom: Record<string, unknown>): string {
  const hit = asArray(atom.vaAtomAttrs).map(asRecord).find(isRequirementDescriptionAttr);
  return hit ? asText(hit.attributeValue) : "";
}

function isRequirementBackgroundAttr(attr: Record<string, unknown>): boolean {
  const key = asText(attr.attributeKeyOriginal) || asText(attr.attributeKey);
  const name = asText(attr.attributeName);
  return key === "BEOR" || key === "需求背景说明" || name === "需求背景说明";
}

function currentRequirementBackground(atom: Record<string, unknown>): string {
  const hit = asArray(atom.vaAtomAttrs).map(asRecord).find(isRequirementBackgroundAttr);
  return hit ? asText(hit.attributeValue) : "";
}

function isNweonAttr(attr: Record<string, unknown>): boolean {
  const key = asText(attr.attributeKeyOriginal) || asText(attr.attributeKey);
  const name = asText(attr.attributeName);
  return key === "VAS_ATTR_REL_NWEON" || key === "上架入库单号" || name === "上架入库单号";
}

export function extractWiNos(text: string): string[] {
  const matches = asText(text).match(/WI\d{8,}/gi) || [];
  return [...new Set(matches.map((item) => item.toUpperCase()))];
}

function currentNweon(atom: Record<string, unknown>): string {
  const hit = asArray(atom.vaAtomAttrs).map(asRecord).find(isNweonAttr);
  return hit ? asText(hit.attributeValue) : "";
}

/** If caller still passes full SOP, keep only the operation-step section. */
function sopStepsOnly(sop: string): string {
  const text = asText(sop);
  if (!/【需求背景】|【需求描述】/.test(text)) return text;
  return sectionOf(text, "操作要求") || sectionOf(text, "操作步骤") || sectionOf(text, "仓库SOP") || text;
}

/** Strip a previously appended AI summary so re-writes do not stack. */
export function stripAiSummary(original: string): string {
  const idx = original.indexOf("【AI总结】");
  if (idx < 0) return original;
  return original.slice(0, idx).replace(/\s+$/g, "");
}

export function appendAiSummary(original: string, summary: string): string {
  const text = asText(summary);
  if (!text) return original;
  const base = stripAiSummary(original);
  if (!base) return `【AI总结】${text}`;
  return `${base}\n\n【AI总结】${text}`;
}

/** Prefer 【需求背景】 paragraph; else LLM scene reasoning. Empty → do not append. */
export function extractAiSummary(rec: { aiGeneratedText?: string; matchResult?: unknown } | null | undefined): string {
  const fromSop = extractSopSections(rec || {}).requirementBackground;
  if (fromSop) return fromSop;
  const llm = asRecord(asRecord(rec?.matchResult).llmClassification);
  return asText(llm.reasoning);
}

export function extractAiRequirementDescription(rec: {
  aiGeneratedText?: string;
  llmSop?: unknown;
  customerRequirementDescription?: string;
} | null | undefined): string {
  return extractSopSections(rec || {}).requirementDescription;
}

export function extractAiRequirementBackground(rec: {
  aiGeneratedText?: string;
  llmSop?: unknown;
} | null | undefined): string {
  return extractSopSections(rec || {}).requirementBackground;
}

function atomAttrs(
  atom: Record<string, unknown>,
  orderNo: string,
  requirementDescription?: string,
  requirementBackground?: string,
  nweonValue?: string,
): unknown[] {
  return asArray(atom.vaAtomAttrs).map((raw) => {
    const a = asRecord(raw);
    let value = a.attributeValue;
    if (requirementDescription !== undefined && isRequirementDescriptionAttr(a)) value = requirementDescription;
    else if (requirementBackground !== undefined && isRequirementBackgroundAttr(a)) value = requirementBackground;
    else if (nweonValue && isNweonAttr(a) && !asText(a.attributeValue)) value = nweonValue;
    return {
      id: a.id,
      attributeKey: a.attributeKey,
      attributeName: a.attributeName,
      attributeValue: value,
      inputNode: a.inputNode,
      serviceCode: a.serviceCode || atom.serviceCode,
      orderNo,
    };
  });
}

async function loadAtom(client: TomClient, orderNo: string): Promise<Record<string, unknown>> {
  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  const content = asArray(asRecord(vas.info).content).map(asRecord);
  const atom = content.find((item) => asText(item.orderNo) === orderNo) || content[0];
  if (!atom || !atom.id) throw new Error(`getVasList 未返回 ${orderNo} 的 atom`);
  return atom;
}

async function writeWarehouseAction(
  client: TomClient,
  atom: Record<string, unknown>,
  input: DraftWriteInput,
  dryRun: boolean,
): Promise<{ written: string[]; skipped: string[]; payload: Record<string, unknown> }> {
  const wa = input.warehouseAction;
  if (!wa) {
    return { written: [], skipped: ["createdVaActionFeeDetail"], payload: {} };
  }
  const where = {
    orderNo: input.orderNo,
    serviceCode: atom.serviceCode,
    serviceName: atom.serviceName,
    warehouseActionCode: wa.code,
    warehouseActionName: wa.name || wa.code,
    qty: wa.qty,
    chargeCode: wa.chargeCode,
    chargeName: wa.chargeName || "",
    chargeId: wa.chargeId,
    serviceSequence: atom.serviceSequence || "1",
    revenueMode: wa.revenueMode,
    priceListId: wa.priceListId,
    isExcludeRevenue: false,
  };
  const cal = await client.ajaxProcess("oms.VaOrderFeeCalService_calOrderActionFee", { where });
  const detail = asArray(asRecord(cal.info).actionFeeDetails).map(asRecord)[0] || {};
  const feeVo = {
    orderNo: input.orderNo,
    serviceCode: atom.serviceCode,
    serviceName: atom.serviceName,
    warehouseActionCode: wa.code,
    warehouseActionName: wa.name || wa.code,
    chargeCode: wa.chargeCode,
    chargeName: wa.chargeName || asText(detail.chargeName),
    chargeId: wa.chargeId || detail.chargeId,
    qty: wa.qty,
    unitTimeConsumption: detail.unitTimeConsumption,
    timeUnit: detail.timeUnit,
    totalTimeConsumption: detail.totalTimeConsumption,
    unitCost: detail.unitCost,
    currencyType: detail.currencyType,
    totalCost: detail.totalCost,
    totalIncome: detail.totalIncome,
    revenueMode: wa.revenueMode,
    billingUnit: detail.billingUnit,
    priceListId: wa.priceListId || detail.priceListId,
    vaAtomFeeDetailVos: detail.vaAtomFeeDetailVos,
    vaOrderCostVoList: detail.vaOrderCostVoList,
    serviceSequence: atom.serviceSequence || "1",
  };
  if (dryRun) {
    return { written: [], skipped: ["createdVaActionFeeDetail"], payload: { vaActionFeeDetailVo: feeVo } };
  }
  await client.ajaxSave("oms.VaOrderService_createdVaActionFeeDetail", { vaActionFeeDetailVo: feeVo });
  return { written: ["createdVaActionFeeDetail"], skipped: [], payload: { vaActionFeeDetailVo: feeVo } };
}

export async function writeDraft(input: DraftWriteInput): Promise<DraftWriteResult> {
  const written: string[] = [];
  const skipped: string[] = ["vaOrderReview"];
  try {
    assertNotReviewApi("oms.VaOrderService_updateAtomDetails");
    const gate = willReallyWrite(input);
    if (gate.error) {
      return { success: false, dryRun: true, written, skipped, error: gate.error };
    }
    const dryRun = gate.dryRun;
    const client = await createTomClient();
    await client.setOrderReferer(input.orderNo);
    const atom = await loadAtom(client, input.orderNo);
    const sop = sopStepsOnly(input.sop);
    const currentRd = currentRequirementDescription(atom);
    const currentBg = currentRequirementBackground(atom);
    const aiRd = asText(input.aiRequirementDescription) || asText(input.aiSummary);
    const aiBg = asText(input.aiRequirementBackground);
    const nextRd = aiRd
      ? appendAiSummary(currentRd, aiRd)
      : aiBg && currentRd.includes("【AI总结】")
        ? stripAiSummary(currentRd)
        : currentRd;
    const nextBg = aiBg ? appendAiSummary(currentBg, aiBg) : currentBg;
    const willAppendRd = nextRd !== currentRd;
    const willAppendBg = Boolean(aiBg) && nextBg !== currentBg;
    const currentWi = currentNweon(atom);
    const wiNos = extractWiNos(
      [sop, aiRd, aiBg, currentRd, currentBg, currentWi].join(" "),
    );
    const plannedNweon = currentWi ? currentWi : wiNos.join(",");
    const willFillNweon = Boolean(!currentWi && wiNos.length);

    if (input.mutateRequirementAttrs && !aiRd && !aiBg) {
      skipped.push("mutateRequirementAttrs_requested_but_ignored_without_aiSummary");
    }
    const fee = await writeWarehouseAction(client, atom, input, dryRun);
    written.push(...fee.written);
    skipped.push(...fee.skipped);

    const updatePayload = {
      orderNo: input.orderNo,
      atomId: atom.id,
      sop,
      sceneOverviewCode: input.sceneOverviewCode,
      serviceCode: atom.serviceCode,
      vaAtomAttrs: atomAttrs(
        atom,
        input.orderNo,
        willAppendRd ? nextRd : undefined,
        willAppendBg ? nextBg : undefined,
        willFillNweon ? plannedNweon : undefined,
      ),
      vaAtomFiles: atom.vaAtomFiles || [],
    };

    if (dryRun) {
      skipped.push("updateAtomDetails");
      if (!willAppendRd) skipped.push("requirementDescription");
      if (!willAppendBg) skipped.push("requirementBackground");
      if (!willFillNweon) skipped.push("nweon");
      return {
        success: true,
        dryRun: true,
        written,
        skipped,
        readBack: {
          sop: asText(atom.sop),
          sceneOverviewCode: asText(atom.sceneOverviewCode),
          requirementDescription: currentRd,
          requirementBackground: currentBg,
          nweon: currentWi,
          plannedSop: sop.slice(0, 200),
          plannedScene: input.sceneOverviewCode,
          plannedRequirementDescription: willAppendRd ? nextRd : currentRd,
          plannedRequirementBackground: willAppendBg ? nextBg : currentBg,
          plannedNweon,
          note: "dry-run：已加载 Cookie/CSRF 并构造请求体，未 POST 写入",
        },
      };
    }

    await client.ajaxSave("oms.VaOrderService_updateAtomDetails", updatePayload);
    written.push("sceneOverviewCode", "sop");
    if (willAppendRd) written.push("requirementDescription");
    else skipped.push("requirementDescription");
    if (willAppendBg) written.push("requirementBackground");
    else skipped.push("requirementBackground");
    if (willFillNweon) written.push("nweon");
    else skipped.push("nweon");

    const again = await loadAtom(client, input.orderNo);
    const readBackRd = currentRequirementDescription(again);
    const readBackBg = currentRequirementBackground(again);
    const readBackNweon = currentNweon(again);
    const readBack = {
      sop: asText(again.sop),
      sceneOverviewCode: asText(again.sceneOverviewCode),
      sceneOverviewName: asText(again.sceneOverviewName),
      requirementDescription: readBackRd,
      requirementBackground: readBackBg,
      nweon: readBackNweon,
    };
    const sopOk = readBack.sop.includes(sop.slice(0, 40)) || readBack.sop === sop;
    if (!sopOk) {
      return {
        success: false,
        dryRun: false,
        written,
        skipped,
        readBack,
        error: "回读 SOP 与写入内容不一致",
      };
    }
    if (/【需求背景】/.test(readBack.sop)) {
      return {
        success: false,
        dryRun: false,
        written,
        skipped,
        readBack,
        error: "回读操作SOP仍含【需求背景】，应只写操作步骤",
      };
    }
    if (willAppendRd) {
      const originalKept = stripAiSummary(currentRd);
      const rdOk =
        readBackRd.includes("【AI总结】") &&
        (!originalKept || readBackRd.startsWith(originalKept)) &&
        readBackRd.includes(aiRd.slice(0, Math.min(40, aiRd.length)));
      if (!rdOk) {
        return {
          success: false,
          dryRun: false,
          written,
          skipped,
          readBack,
          error: "回读需求描述未保留原文或缺少【AI总结】",
        };
      }
    }
    if (willAppendBg) {
      const originalKept = stripAiSummary(currentBg);
      const bgOk =
        readBackBg.includes("【AI总结】") &&
        (!originalKept || readBackBg.startsWith(originalKept)) &&
        readBackBg.includes(aiBg.slice(0, Math.min(40, aiBg.length)));
      if (!bgOk) {
        return {
          success: false,
          dryRun: false,
          written,
          skipped,
          readBack,
          error: "回读需求背景未保留原文或缺少【AI总结】",
        };
      }
    }
    if (willFillNweon) {
      const nweonOk = wiNos.every((wi) => readBackNweon.includes(wi));
      if (!nweonOk) {
        return {
          success: false,
          dryRun: false,
          written,
          skipped,
          readBack,
          error: "回读上架入库单号未写入提取到的 WI",
        };
      }
    }
    return { success: true, dryRun: false, written, skipped, readBack };
  } catch (err) {
    return {
      success: false,
      dryRun: willReallyWrite(input).dryRun,
      written,
      skipped,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
