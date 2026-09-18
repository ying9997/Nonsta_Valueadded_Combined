import { envText } from "./env.ts";
import { asArray, asRecord, asText } from "./oms-adapter.ts";
import { appendAiWriteSnapshot } from "./ai-human-comparison.ts";
import { assertNotReviewApi, createTomClient, type TomClient } from "./oms-tom-client.ts";
import { findScenarioCard } from "./scenario-cards.ts";
import { extractSopSections, sectionOf } from "./sop-sections.ts";
import { extractWiNos, normalizeWiNos, pickPutawayWiNos, shouldReplaceNweon } from "./wi-numbers.ts";

export { extractWiNos, normalizeWiNos, pickPutawayWiNos, shouldReplaceNweon };

export type WarehouseActionFee = {
  code: string;
  qty: number;
  chargeCode: string;
  priceListId: number;
  revenueMode: string;
  name?: string;
  chargeName?: string;
  chargeId?: string | number;
  dimension?: string;
  calUnit?: string;
};

/** OMS 规定没仓库作业不能保存 SOP。随便选两个常用动作即可，不按场景精算。 */
export const DEFAULT_UNBLOCK_WAREHOUSE_ACTIONS: WarehouseActionFee[] = [
  {
    code: "DZ000031",
    name: "贴商品标签",
    qty: 1,
    chargeCode: "1047255",
    chargeName: "增值-商品标签粘贴/更改/清除",
    priceListId: 26261,
    revenueMode: "PRICE_LIST_CALC",
    dimension: "ORDER",
    calUnit: "VAS_ATTR_REL_VOIC",
  },
  {
    code: "DZ000025",
    name: "贴包裹标签",
    qty: 1,
    chargeCode: "3000313",
    chargeName: "增值-包裹标签粘贴/更改/清除",
    priceListId: 26262,
    revenueMode: "PRICE_LIST_CALC",
    dimension: "ORDER",
    calUnit: "VAS_ATTR_REL_VPC",
  },
];

export interface DraftWriteInput {
  orderNo: string;
  /** Empty = do not pick OMS 场景概述; still write SOP. */
  sceneOverviewCode?: string;
  /** 只放操作步骤（warehouseSop），不要传带【需求背景】的全文。 */
  sop: string;
  warehouseAction?: WarehouseActionFee;
  /** 优先于 warehouseAction。不传则用 DEFAULT_UNBLOCK_WAREHOUSE_ACTIONS。 */
  warehouseActions?: WarehouseActionFee[];
  /** AI 总结的需求描述，追加到 OMS 需求描述字段。 */
  aiRequirementDescription?: string;
  /** AI 总结的需求背景，追加到 OMS 需求背景（BEOR）字段。 */
  aiRequirementBackground?: string;
  /** 兼容旧调用：当作需求描述总结。推荐改用 aiRequirementDescription。 */
  aiSummary?: string;
  /** LLM 提取的 WI；优先于正则。 */
  extractedWiNumbers?: string[];
  /** 真写入成功后写入 AI vs 人工对照表。 */
  comparisonMeta?: {
    sceneKey: string;
    sceneName: string;
    missingAttachments?: string[];
    degraded?: boolean;
    confidence?: string;
  };
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
  /** True when SOP was (or would be) written without selecting an OMS scene overview. */
  missingOmsScene?: boolean;
}

/** 只有待审核才能写草稿。订单状态在 pageQuery 表头，不在 getVasList 原子上。 */
export const WRITABLE_OMS_STATUS_DESCS = ["待审核"];
export const WRITABLE_OMS_STATUS_CODES = ["WA"];

export function omsOrderStatusLabel(header: Record<string, unknown>, atom?: Record<string, unknown>): string {
  return (
    asText(header.statusDesc) ||
    asText(atom?.statusDesc) ||
    asText(atom?.orderStatus) ||
    asText(header.status) ||
    asText(atom?.status) ||
    asText(atom?.atom_status) ||
    ""
  );
}

/**
 * 审核信息：getVasList atom 上没有 auditRemark/auditInfo。
 * 已审核通过的单在 pageQuery 表头：isAuditThrough=Y；待审核单该字段为空串。
 * vasc.isAudit 是产品「是否要审核」开关，待审核单也是 Y，不能当已审标志。
 */
export function collectOmsAuditInfo(
  header: Record<string, unknown>,
  atom: Record<string, unknown> = {},
): { field: string; value: string } | null {
  const through = asText(header.isAuditThrough) || asText(atom.isAuditThrough);
  if (through) return { field: "isAuditThrough", value: through };

  const named = ["auditInfo", "auditRemark", "auditResult", "auditOpinion", "审核意见", "审核信息", "审核结果"];
  for (const key of named) {
    const value = asText(atom[key]) || asText(header[key]);
    if (value) return { field: key, value };
  }

  for (const attr of asArray(atom.vaAtomAttrs).map(asRecord)) {
    const name = asText(attr.attributeName) || asText(attr.attributeKey);
    if (!/审核意见|审核结果|审核信息/.test(name)) continue;
    const value = asText(attr.attributeValue);
    if (value) return { field: name, value };
  }
  return null;
}

export function isWritableOmsStatus(header: Record<string, unknown>, atom?: Record<string, unknown>): boolean {
  const desc = `${asText(header.statusDesc)} ${asText(atom?.statusDesc)} ${asText(atom?.orderStatus)}`.trim();
  const code = `${asText(header.status)} ${asText(atom?.status)} ${asText(atom?.atom_status)}`.trim();
  if (WRITABLE_OMS_STATUS_DESCS.some((item) => desc.includes(item))) return true;
  if (WRITABLE_OMS_STATUS_CODES.some((item) => code === item || code.split(/\s+/).includes(item))) return true;
  const blob = `${desc} ${code}`.toLowerCase();
  return blob.includes("pending_audit") || blob.includes("wait_audit");
}

function sopLooksAlreadyWritten(existing: string, planned: string): boolean {
  if (!existing || existing.length <= 20) return false;
  if (existing.includes("【AI总结】")) return false;
  if (!planned) return true;
  const a = existing.replace(/\s+/g, "");
  const b = planned.replace(/\s+/g, "");
  if (!b) return true;
  if (a === b) return false;
  const probe = b.slice(0, Math.min(40, b.length));
  if (probe && a.includes(probe)) return false;
  const existingProbe = a.slice(0, Math.min(40, a.length));
  if (existingProbe && b.includes(existingProbe)) return false;
  return true;
}

export function assessOmsWriteGuard(args: {
  header: Record<string, unknown>;
  atom: Record<string, unknown>;
  plannedSop?: string;
}): { ok: true } | { ok: false; skipped: "status_not_writable" | "sop_already_filled" | "audit_info_filled"; error: string } {
  const label = omsOrderStatusLabel(args.header, args.atom) || "未知";
  if (!isWritableOmsStatus(args.header, args.atom)) {
    return {
      ok: false,
      skipped: "status_not_writable",
      error: `订单状态为「${label}」，非待审核状态，禁止写入。可能审核员已经手动审核通过。`,
    };
  }
  const audit = collectOmsAuditInfo(args.header, args.atom);
  if (audit) {
    return {
      ok: false,
      skipped: "audit_info_filled",
      error: `审核信息字段 ${audit.field} 已有内容（${audit.value}），禁止覆盖审核员操作。`,
    };
  }
  const existingSop = asText(args.atom.sop);
  const aiWrote =
    currentRequirementDescription(args.atom).includes("【AI总结】") ||
    currentRequirementBackground(args.atom).includes("【AI总结】");
  if (!aiWrote && sopLooksAlreadyWritten(existingSop, asText(args.plannedSop))) {
    return {
      ok: false,
      skipped: "sop_already_filled",
      error: "OMS 操作 SOP 字段已有内容（非 AI 生成），禁止覆盖审核员手动填写的 SOP。",
    };
  }
  return { ok: true };
}

export function isOmsWriteGuardReject(result: Pick<DraftWriteResult, "skipped">): boolean {
  return (
    result.skipped.includes("status_not_writable") ||
    result.skipped.includes("sop_already_filled") ||
    result.skipped.includes("audit_info_filled")
  );
}

/** OMS 操作 SOP 已有人工内容：禁止覆盖，也不要在业务群建话题/@审核员。 */
export function isHumanSopAlreadyFilled(result: {
  skipped?: string[];
  error?: string;
}): boolean {
  if ((result.skipped || []).includes("sop_already_filled")) return true;
  const err = result.error || "";
  return err.includes("非 AI 生成") || err.includes("禁止覆盖审核员手动填写");
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

/** Map sceneKey → OMS dropdown code. Empty code means leave 场景概述 unselected. */
export function resolveSceneOverviewCode(sceneKey: string): { code: string; missing: boolean } {
  const key = asText(sceneKey);
  if (!key || key === "unsupported") return { code: "", missing: true };
  const card = findScenarioCard(key);
  const code = asText(card?.omsSceneCode);
  return { code, missing: !code };
}

export function sceneCodeFromKey(sceneKey: string): string {
  const { code, missing } = resolveSceneOverviewCode(sceneKey);
  if (!missing && code) return code;
  if (!asText(sceneKey) || sceneKey === "unsupported") throw new Error("缺少 sceneKey，无法映射 OMS 场景码");
  throw new Error(`场景 ${sceneKey} 没有 omsSceneCode`);
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


export async function fetchOmsOrderSnapshot(orderNo: string): Promise<{
  atom: Record<string, unknown>;
  header: Record<string, unknown>;
}> {
  const client = await createTomClient();
  await client.setOrderReferer(orderNo);
  const atom = await loadAtom(client, orderNo);
  const header = await loadOrderHeader(client, orderNo);
  return { atom, header };
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
    else if (nweonValue && isNweonAttr(a)) value = nweonValue;
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

async function loadOrderHeader(client: TomClient, orderNo: string): Promise<Record<string, unknown>> {
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "5",
  });
  const rows = asArray(asRecord(list.info).content || asRecord(list.info).data).map(asRecord);
  return rows.find((item) => asText(item.orderNo) === orderNo) || rows[0] || {};
}

function existingWarehouseActionCodes(atom: Record<string, unknown>): Set<string> {
  const fees = asArray(atom.vaActionFeeDetailVos || atom.vaAtomFeeDetailVos).map(asRecord);
  return new Set(fees.map((item) => asText(item.warehouseActionCode)).filter(Boolean));
}

function resolveWarehouseActions(input: DraftWriteInput): WarehouseActionFee[] {
  if (input.warehouseActions?.length) return input.warehouseActions;
  if (input.warehouseAction) return [input.warehouseAction];
  return DEFAULT_UNBLOCK_WAREHOUSE_ACTIONS;
}

async function writeOneWarehouseAction(
  client: TomClient,
  atom: Record<string, unknown>,
  orderNo: string,
  wa: WarehouseActionFee,
  dryRun: boolean,
): Promise<Record<string, unknown>> {
  const where = {
    orderNo,
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
    ...(wa.dimension ? { dimension: wa.dimension } : {}),
    ...(wa.calUnit ? { calUnit: wa.calUnit } : {}),
  };
  const cal = await client.ajaxProcess("oms.VaOrderFeeCalService_calOrderActionFee", { where });
  const detail = asArray(asRecord(cal.info).actionFeeDetails).map(asRecord)[0] || {};
  const feeVo = {
    orderNo,
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
  if (!dryRun) {
    try {
      await client.ajaxSave("oms.VaOrderService_createdVaActionFeeDetail", { vaActionFeeDetailVo: feeVo });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/02040901587|已经存在|不支持新增重复/.test(msg)) {
        return { ...feeVo, _duplicate: true };
      }
      throw err;
    }
  }
  return feeVo;
}

async function writeWarehouseAction(
  client: TomClient,
  atom: Record<string, unknown>,
  input: DraftWriteInput,
  dryRun: boolean,
): Promise<{ written: string[]; skipped: string[]; payload: Record<string, unknown> }> {
  const actions = resolveWarehouseActions(input);
  const existing = existingWarehouseActionCodes(atom);
  const pending = actions.filter((wa) => !existing.has(wa.code));
  if (!pending.length) {
    return { written: [], skipped: ["createdVaActionFeeDetail"], payload: {} };
  }
  const payloads: Record<string, unknown>[] = [];
  let wrote = false;
  let skippedDup = false;
  for (const wa of pending) {
    const feeVo = await writeOneWarehouseAction(client, atom, input.orderNo, wa, dryRun);
    payloads.push(feeVo);
    if (feeVo._duplicate) skippedDup = true;
    else wrote = true;
  }
  if (dryRun) {
    return { written: [], skipped: ["createdVaActionFeeDetail"], payload: { vaActionFeeDetailVos: payloads } };
  }
  return {
    written: wrote ? ["createdVaActionFeeDetail"] : [],
    skipped: skippedDup && !wrote ? ["createdVaActionFeeDetail"] : [],
    payload: { vaActionFeeDetailVos: payloads },
  };
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
    const header = await loadOrderHeader(client, input.orderNo);
    const sop = sopStepsOnly(input.sop);
    const guard = assessOmsWriteGuard({ header, atom, plannedSop: sop });
    if (!guard.ok) {
      skipped.push(guard.skipped);
      return {
        success: false,
        dryRun,
        written: [],
        skipped,
        readBack: {
          sop: asText(atom.sop),
          orderStatus: omsOrderStatusLabel(header, atom) || "未知",
          statusCode: asText(header.status) || asText(atom.status),
          isAuditThrough: asText(header.isAuditThrough) || asText(atom.isAuditThrough),
        },
        error: guard.error,
      };
    }
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
    const wiNos = pickPutawayWiNos(
      [sop, aiRd, aiBg, currentRd, currentBg].join("\n"),
      input.extractedWiNumbers,
    );
    const willFillNweon = shouldReplaceNweon(currentWi, wiNos);
    const plannedNweon = willFillNweon ? wiNos.join(",") : currentWi;

    if (input.mutateRequirementAttrs && !aiRd && !aiBg) {
      skipped.push("mutateRequirementAttrs_requested_but_ignored_without_aiSummary");
    }
    const fee = await writeWarehouseAction(client, atom, input, dryRun);
    written.push(...fee.written);
    skipped.push(...fee.skipped);

    const plannedSceneCode = asText(input.sceneOverviewCode);
    const missingOmsScene = !plannedSceneCode;
    const sceneOverviewCode = plannedSceneCode || asText(atom.sceneOverviewCode) || "";
    if (missingOmsScene) skipped.push("sceneOverviewCode");

    const updatePayload = {
      orderNo: input.orderNo,
      atomId: atom.id,
      sop,
      sceneOverviewCode,
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
        missingOmsScene,
        readBack: {
          sop: asText(atom.sop),
          sceneOverviewCode: asText(atom.sceneOverviewCode),
          requirementDescription: currentRd,
          requirementBackground: currentBg,
          nweon: currentWi,
          plannedSop: sop.slice(0, 200),
          plannedScene: sceneOverviewCode,
          plannedRequirementDescription: willAppendRd ? nextRd : currentRd,
          plannedRequirementBackground: willAppendBg ? nextBg : currentBg,
          plannedNweon,
          note: "dry-run：已加载 Cookie/CSRF 并构造请求体，未 POST 写入",
        },
      };
    }

    await client.ajaxSave("oms.VaOrderService_updateAtomDetails", updatePayload);
    if (plannedSceneCode) written.push("sceneOverviewCode");
    written.push("sop");
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
    if (input.comparisonMeta) {
      try {
        appendAiWriteSnapshot({
          vascNo: input.orderNo,
          ai: {
            sceneKey: input.comparisonMeta.sceneKey,
            sceneName: input.comparisonMeta.sceneName,
            sceneCode: input.sceneOverviewCode,
            sopText: sop,
            requirementDesc: aiRd,
            requirementBackground: aiBg,
            wiNumbers: wiNos,
            missingAttachments: input.comparisonMeta.missingAttachments || [],
            degraded: Boolean(input.comparisonMeta.degraded),
            confidence: input.comparisonMeta.confidence || "",
          },
        });
      } catch (err) {
        console.warn(
          `ai-human-comparison append failed ${input.orderNo}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return { success: true, dryRun: false, written, skipped, readBack, missingOmsScene };
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
