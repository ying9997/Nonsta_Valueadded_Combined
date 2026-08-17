import type { ExpectBlock } from "./types";
import type { ExpertRunResult } from "./types";

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function checkTextRule(
  label: string,
  text: string,
  rule: { minLength?: number; includes?: string; regex?: string } | undefined
): string[] {
  const errs: string[] = [];
  if (!rule) return errs;
  if (rule.minLength !== undefined && text.length < rule.minLength) {
    errs.push(`${label}: 长度 ${text.length} < minLength ${rule.minLength}`);
  }
  if (rule.includes !== undefined && !text.includes(rule.includes)) {
    errs.push(`${label}: 未包含子串 ${JSON.stringify(rule.includes)}`);
  }
  if (rule.regex !== undefined) {
    try {
      const re = new RegExp(rule.regex);
      if (!re.test(text)) {
        errs.push(`${label}: 不匹配 regex ${rule.regex}`);
      }
    } catch (e) {
      errs.push(`${label}: 无效 regex ${JSON.stringify(rule.regex)}: ${String(e)}`);
    }
  }
  return errs;
}

/**
 * Returns list of assertion error messages (empty if all pass).
 */
export function assertExpect(result: ExpertRunResult, expect: ExpectBlock | undefined): string[] {
  if (!expect) return [];
  const errs: string[] = [];

  if (expect.outputContext?.expertId !== undefined) {
    if (result.outputContext.expertId !== expect.outputContext.expertId) {
      errs.push(
        `outputContext.expertId: 期望 ${JSON.stringify(expect.outputContext.expertId)}，实际 ${JSON.stringify(result.outputContext.expertId)}`
      );
    }
  }
  if (expect.outputContext?.chainId !== undefined) {
    if (result.outputContext.chainId !== expect.outputContext.chainId) {
      errs.push(
        `outputContext.chainId: 期望 ${JSON.stringify(expect.outputContext.chainId)}，实际 ${JSON.stringify(result.outputContext.chainId)}`
      );
    }
  }
  errs.push(
    ...checkTextRule("outputContext.resultSummary", result.outputContext.resultSummary, expect.outputContext?.resultSummary)
  );
  errs.push(...checkTextRule("analysis", result.analysis, expect.analysis));

  for (const key of expect.structuredKeys ?? []) {
    if (!(key in result.structured)) {
      errs.push(`structured: 缺少键 ${JSON.stringify(key)}`);
    }
  }

  for (const path of expect.structuredPaths ?? []) {
    const v = getPath(result.structured, path);
    if (v === undefined || v === null) {
      errs.push(`structured: 路径 ${JSON.stringify(path)} 须存在且非 null`);
    }
  }

  return errs;
}
