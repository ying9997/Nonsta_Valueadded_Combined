/**
 * T1 【入库】包裹条码批量异常辨识后补贴包裹标签上架：
 * 按入库单商品码去后缀后数 SKU。
 * - 1 个 SKU：直接生成，不再要对应关系
 * - 客户写一个 SKU、入库单去后缀后仍是多个：打回销售客服核对
 * - 多个 SKU：必须有辨识方法 / 对应关系
 * 查不到商品码时跳过，不阻断。
 */
import { envNumber } from "./env.ts";
import { asText } from "./oms-adapter.ts";
import type { RequirementInfoField } from "./scenario-cards.ts";
import {
  extractWiPair,
  queryInboundMerchandiseFromDws,
  type InboundMerchandiseLine,
} from "./sku-consistency-check.ts";
import type { AgentInput, ContextFacts, MatchResult, T1SkuClaim, T1SkuRelabelResult, T1SkuVerdict } from "./types.ts";
import { pickPutawayWiNos, extractWiNos } from "./wi-numbers.ts";

export const T1_SKU_RELABEL_SCENE = "inbound_package_barcode_batch_relabel";
const TIMEOUT_MS_DEFAULT = 25_000;
const MAPPING_FIELD = /对应关系|辨识方法|辨识依据/;

export interface T1SkuRelabelDeps {
  queryMerchandiseByWi?: (wi: string) => Promise<InboundMerchandiseLine[]>;
  timeoutMs?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} 超时 ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function uniqUpper(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function requirementText(input: AgentInput): string {
  return [
    input.customerIntent,
    input.omsFacts?.customerRequirementDescription,
    input.omsFacts?.requirementBackground,
    input.providedFields?.VAS_ATTR_REL_RD,
    input.providedFields?.BEOR,
  ]
    .map((item) => asText(item))
    .filter(Boolean)
    .join("\n");
}

/** 商品码去后缀：M010000000013991941-10 / -10X → M010000000013991941 */
export function normalizeMerchandiseCode(raw: string): string {
  let s = asText(raw).trim().toUpperCase();
  if (!s) return "";
  s = s.replace(/\*\d+$/, "");
  s = s.replace(/-\d+[A-Z]{0,4}$/i, "");
  return s;
}

export function detectSkuClaim(text: string): T1SkuClaim {
  const t = asText(text).toLowerCase().replace(/\s+/g, "");
  if (!t) return "unspecified";
  const multi = /多个sku|多款sku|多款不同|不同sku|混sku|各sku|sku对应/.test(t);
  const single = /同一个sku|同一sku|只有1个sku|只有一个sku|仅1个sku|仅一个sku|1个sku|一个sku|单sku|随机贴/.test(t);
  if (multi) return "multi";
  if (single) return "single";
  return "unspecified";
}

export function merchandiseCodesFromLines(lines: InboundMerchandiseLine[]): string[] {
  return uniqUpper(lines.map((line) => line.merchandiseSerno || line.merchandiseCode).filter(Boolean));
}

export function distinctSkuStems(codes: string[]): string[] {
  return uniqUpper(codes.map((code) => normalizeMerchandiseCode(code)).filter(Boolean));
}

export function pickT1TargetWis(input: AgentInput, contextFacts?: ContextFacts): string[] {
  const nweon = extractWiNos(
    asText(input.providedFields?.VAS_ATTR_REL_NWEON || input.omsFacts?.fieldValues?.VAS_ATTR_REL_NWEON),
  );
  if (nweon.length) return nweon;
  const blob = [requirementText(input), ...(contextFacts?.allBusinessOrderNos || [])].join("\n");
  const putaway = pickPutawayWiNos(blob);
  if (putaway.length) return putaway;
  const pair = extractWiPair(input, contextFacts);
  if (pair.newWi) return [pair.newWi];
  return pair.allWis;
}

export function shouldCheckT1SkuRelabel(matchResult?: MatchResult, input?: AgentInput): boolean {
  const key = asText(matchResult?.sceneKey || input?.sceneKey);
  return key === T1_SKU_RELABEL_SCENE;
}

export function t1RequiredInfoMode(result: T1SkuRelabelResult | undefined): "single" | "multi" | undefined {
  if (!result?.triggered) return undefined;
  if (result.verdict === "single_ok") return "single";
  if (result.verdict === "multi_need_mapping") return "multi";
  return undefined;
}

export function applyT1RequiredInfo(
  required: RequirementInfoField[],
  optional: RequirementInfoField[],
  mode: "single" | "multi" | undefined,
): RequirementInfoField[] {
  if (!mode) return required;
  if (mode === "single") {
    return required.filter((item) => !MAPPING_FIELD.test(item.field));
  }
  const out = [...required];
  const have = new Set(out.map((item) => item.field));
  for (const item of optional) {
    if (!/辨识依据|辨识方法/.test(item.field)) continue;
    if (have.has(item.field)) continue;
    out.push({ ...item, required: true });
    have.add(item.field);
  }
  return out;
}

function emptyResult(over: Partial<T1SkuRelabelResult> = {}): T1SkuRelabelResult {
  return {
    triggered: false,
    targetWis: [],
    merchandiseCodes: [],
    stems: [],
    claim: "unspecified",
    verdict: "skip",
    bouncePrompt: "",
    ...over,
  };
}

function bouncePrompt(wis: string[], stems: string[], codes: string[]): string {
  const wiText = wis.join("、") || "未识别";
  const stemText = stems.join("、");
  const codeText = codes.join("、");
  return (
    `客户需求写的是只有一个/同一个 SKU，但入库单（${wiText}）按商品码去后缀后仍有多个 SKU：${stemText}` +
    `（原商品码：${codeText}）。请销售/客服核对是否填错，打回客户重新提交。`
  );
}

export function decideT1SkuRelabel(args: {
  claim: T1SkuClaim;
  codes: string[];
  wis: string[];
}): T1SkuRelabelResult {
  const stems = distinctSkuStems(args.codes);
  if (!args.codes.length || !stems.length) {
    return emptyResult({
      triggered: true,
      targetWis: args.wis,
      merchandiseCodes: args.codes,
      stems,
      claim: args.claim,
      verdict: "skip",
      error: "查不到入库单商品码",
    });
  }
  if (stems.length === 1) {
    return {
      triggered: true,
      targetWis: args.wis,
      merchandiseCodes: args.codes,
      stems,
      claim: args.claim,
      verdict: "single_ok",
      bouncePrompt: "",
    };
  }
  if (args.claim === "single") {
    return {
      triggered: true,
      targetWis: args.wis,
      merchandiseCodes: args.codes,
      stems,
      claim: args.claim,
      verdict: "single_mismatch_bounce",
      bouncePrompt: bouncePrompt(args.wis, stems, args.codes),
    };
  }
  return {
    triggered: true,
    targetWis: args.wis,
    merchandiseCodes: args.codes,
    stems,
    claim: args.claim,
    verdict: "multi_need_mapping",
    bouncePrompt: "",
  };
}

export function formatT1SkuPrompt(result?: T1SkuRelabelResult): string {
  if (!result?.triggered || result.verdict === "skip") return "";
  const wi = result.targetWis.join("、") || "未识别";
  const stems = result.stems.join("、");
  const codes = result.merchandiseCodes.join("、");
  if (result.verdict === "single_ok") {
    return [
      "## T1 商品码校验（单 SKU）",
      `入库单 ${wi} 商品码去后缀后为同一个 SKU：${stems}（原商品码：${codes}）。`,
      "按单 SKU 补贴包裹标签，可随机贴；不要再追问 SKU 与入库单对应关系。",
    ].join("\n");
  }
  if (result.verdict === "multi_need_mapping") {
    return [
      "## T1 商品码校验（多 SKU）",
      `入库单 ${wi} 去后缀后有多个 SKU：${stems}（原商品码：${codes}）。`,
      "必须按客户提供的辨识方法 / SKU 与入库单对应关系贴标，不要随机贴。",
    ].join("\n");
  }
  if (result.verdict === "single_mismatch_bounce") {
    return `## T1 商品码校验（打回）\n${result.bouncePrompt}`;
  }
  return "";
}

export async function checkT1SkuRelabel(args: {
  input: AgentInput;
  matchResult?: MatchResult;
  contextFacts?: ContextFacts;
  deps?: T1SkuRelabelDeps;
}): Promise<T1SkuRelabelResult> {
  const { input, matchResult, contextFacts, deps = {} } = args;
  if (!shouldCheckT1SkuRelabel(matchResult, input)) {
    return emptyResult();
  }
  const wis = pickT1TargetWis(input, contextFacts);
  const claim = detectSkuClaim(requirementText(input));
  if (!wis.length) {
    return emptyResult({
      triggered: true,
      claim,
      verdict: "skip",
      error: "未识别上架入库单 WI",
    });
  }
  const timeoutMs = deps.timeoutMs ?? envNumber("SKU_CHECK_TIMEOUT_MS", TIMEOUT_MS_DEFAULT);
  const query = deps.queryMerchandiseByWi || ((wi: string) => queryInboundMerchandiseFromDws(wi, timeoutMs));
  try {
    return await withTimeout(
      (async () => {
        const lines: InboundMerchandiseLine[] = [];
        for (const wi of wis) {
          lines.push(...(await query(wi)));
        }
        const codes = merchandiseCodesFromLines(lines);
        return decideT1SkuRelabel({ claim, codes, wis });
      })(),
      timeoutMs,
      "t1-sku-relabel-check",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`t1-sku-relabel skipped ${input.vascNo}: ${msg}`);
    return emptyResult({
      triggered: true,
      targetWis: wis,
      claim,
      verdict: "skip",
      error: msg,
    });
  }
}

export async function checkT1SkuRelabelSafe(args: {
  input: AgentInput;
  matchResult?: MatchResult;
  contextFacts?: ContextFacts;
  deps?: T1SkuRelabelDeps;
}): Promise<T1SkuRelabelResult> {
  try {
    return await checkT1SkuRelabel(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`t1-sku-relabel safe ${args.input.vascNo}: ${msg}`);
    return emptyResult({ triggered: true, verdict: "skip", error: msg });
  }
}
