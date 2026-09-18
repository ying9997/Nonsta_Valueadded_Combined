import { asText } from "./oms-adapter.ts";

const WI_RE = /WI\d{8,}/gi;
const WI_OK = /^WI\d{8,}$/;

function capture(text: string, re: RegExp): string[] {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const out: string[] = [];
  for (const match of asText(text).matchAll(new RegExp(re.source, flags))) {
    const hit = String(match[1] || "").toUpperCase();
    if (WI_OK.test(hit)) out.push(hit);
  }
  return [...new Set(out)];
}

/** 文本里出现过的全部 WI，不去重语义。 */
export function extractWiNos(text: string): string[] {
  const matches = asText(text).match(WI_RE) || [];
  return [...new Set(matches.map((item) => item.toUpperCase()))];
}

export function normalizeWiNos(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((item) => String(item || "").trim().toUpperCase())
        .filter((item) => WI_OK.test(item)),
    ),
  ];
}

/**
 * OMS「上架入库单号」只能填一张：仓库扫描上架的目标单。
 * 原文里的原入库单不要填进去；有原单 + 新单时只取新单。
 */
export function pickPutawayWiNos(text: string, llmWi?: unknown): string[] {
  const blob = asText(text);
  const all = extractWiNos(blob);
  const llm = normalizeWiNos(llmWi);
  const original = capture(blob, /原(?:入库)?单(?:号)?\s*[:：]?\s*(WI\d{8,})/i);
  const newer = capture(blob, /(?:新入库单|下了(?:一个)?新单|新单)\s*[:：]?\s*(WI\d{8,})/i);
  const origSet = new Set(original);
  const newOnly = newer.filter((wi) => !origSet.has(wi));

  if (newOnly.length) return [newOnly[0]];

  if (/上架至新|上架到新|使用新入库单/.test(blob)) {
    const rest = all.filter((wi) => !origSet.has(wi));
    if (rest.length) return [rest[0]];
  }

  if (/上架到原单|按原(?:入库)?单.{0,24}上架|上架到原(?:入库)?单|上架至原/.test(blob)) {
    if (original.length) return [original[0]];
    if (all.length === 1) return all;
    if (llm.length === 1) return llm;
  }

  if (llm.length === 1) return llm;
  if (llm.length > 1) {
    const rest = llm.filter((wi) => !origSet.has(wi));
    if (rest.length === 1) return rest;
  }

  if (all.length <= 1) return all;
  const rest = all.filter((wi) => !origSet.has(wi));
  if (origSet.size && rest.length) return [rest[0]];
  return [all[all.length - 1]];
}

/** 已填多个 WI 时改成单一上架目标；已填一张且相同则不动。 */
export function shouldReplaceNweon(current: string, planned: string[]): boolean {
  if (!planned.length) return false;
  const cur = extractWiNos(current);
  if (!cur.length) return true;
  if (cur.length === 1 && planned.length === 1 && cur[0] === planned[0]) return false;
  if (cur.length > 1) return true;
  return false;
}
