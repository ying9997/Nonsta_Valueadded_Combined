import { asRecord, asText } from "./oms-adapter.ts";
import type { CaseRecord } from "./types.ts";

export const MAX_SOP_EDITS = 3;

export function messageTimeMs(createTime: string): number {
  const raw = asText(createTime);
  if (!raw) return 0;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Latest human reply after the "SOP 需修改" click. Empty → wait for next poll. */
export function pickLatestEditAfter(
  replies: Array<{ text: string; at?: string }>,
  afterIso: string,
  skipTexts: string[] = [],
): string {
  const after = messageTimeMs(afterIso);
  if (!after) return "";
  const skip = new Set(skipTexts.map((item) => asText(item)).filter(Boolean));
  // 点按钮和发回复可能同一秒，放宽 60 秒以免漏掉审核员意见
  const later = replies.filter((item) => {
    const t = messageTimeMs(item.at || "");
    return asText(item.text) && t >= after - 60_000;
  });
  for (let i = later.length - 1; i >= 0; i--) {
    const text = asText(later[i].text);
    if (!text || skip.has(text)) continue;
    return text;
  }
  return "";
}

export function stripNotesIfRequested(sop: string, instruction: string): string {
  if (!/去掉.{0,8}注意事项|删除.{0,8}注意事项|不要.{0,8}注意事项/.test(asText(instruction))) {
    return sop;
  }
  return asText(sop.replace(/\n*【注意事项】[\s\S]*$/u, ""));
}

export function sceneKeyForSopEdit(rec: CaseRecord): string {
  return asText(rec.confirmedScene) || asText(asRecord(rec.matchResult).sceneKey);
}

export function isEchoOfSop(text: string, sop: string): boolean {
  const a = asText(text).replace(/\s+/g, "");
  const b = asText(sop).replace(/\s+/g, "");
  if (!a || !b) return false;
  if (a === b || b.includes(a) || (a.length > 80 && a.includes(b))) return true;
  const ops = b.split("【操作要求】")[1]?.split("【")[0] || "";
  return Boolean(ops && a === ops.replace(/\s+/g, ""));
}

export function sopEditCountOf(rec: CaseRecord | undefined): number {
  const n = rec?.sopEditCount;
  return typeof n === "number" && n > 0 ? n : 0;
}

/** Best-effort sopText while LLM is still streaming JSON. */
export function previewSopStream(raw: string): string {
  const hit = raw.match(/"sopText"\s*:\s*"((?:\\.|[^"\\])*)"?/);
  if (!hit) return "";
  return hit[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\t/g, "\t");
}
