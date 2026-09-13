/**
 * In-memory BM25 case retriever. Zero extra dependencies.
 * Case library lives in knowledge/case-library/ (not eval/).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { copilotDir } from "./env.ts";

export const RAG_MIN_SCORE = 1.0;
export const RAG_MAX_PROMPT_CHARS = 500;

/** Default off. Set RAG_ENABLED=1 to inject BM25 few-shot. */
export function isRagEnabled(): boolean {
  return (process.env.RAG_ENABLED || "0").trim() === "1";
}

export interface CaseEntry {
  caseId: string;
  sceneKey: string;
  sceneName: string;
  customerIntent: string;
  exceptionName: string;
  exceptionObject: string;
  keyAction: string;
  attachmentSummary: string;
  attachmentTemplateType: string;
  attachmentHints: string;
  sopSnippet: string;
  auditResult: string;
}

export interface RetrievedCase {
  entry: CaseEntry;
  score: number;
  rank: number;
}

export interface RetrieveOptions {
  topK?: number;
  category?: "inbound" | "instock";
  excludeCaseIds?: string[];
}

const K1 = 1.5;
const B = 0.75;

const STOP = new Set([
  "我们",
  "你们",
  "他们",
  "以及",
  "然后",
  "进行",
  "需要",
  "可以",
  "这个",
  "那个",
  "一个",
  "一下",
  "之后",
  "如果",
  "因为",
  "所以",
  "但是",
  "已经",
  "还是",
  "或者",
  "并且",
]);

let _cases: CaseEntry[] | null = null;
let _idf: Map<string, number> | null = null;

export function resetCaseRetrieverCache(): void {
  _cases = null;
  _idf = null;
}

export function tokenize(text: string): string[] {
  const cleaned = (text || "").replace(/[，。、；：""''""''（）()\[\]【】\-—]/g, " ");
  const tokens: string[] = [];
  for (const part of cleaned.split(/\s+/)) {
    if (!part) continue;
    const latin = part.match(/[A-Za-z0-9_]{2,}/g) || [];
    tokens.push(...latin);
    const cjkRuns = part.replace(/[^\u4e00-\u9fff]/g, " ").split(/\s+/).filter(Boolean);
    for (const run of cjkRuns) {
      if (run.length < 2) continue;
      if (run.length <= 8) tokens.push(run);
      for (let i = 0; i < run.length - 1; i++) tokens.push(run.slice(i, i + 2));
      for (let i = 0; i < run.length - 2; i++) tokens.push(run.slice(i, i + 3));
    }
  }
  return tokens.filter((t) => t.length >= 2 && !STOP.has(t));
}

function readJsonl(path: string): CaseEntry[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CaseEntry);
}

export function loadCases(): CaseEntry[] {
  if (_cases) return _cases;
  const dir = join(copilotDir(), "knowledge", "case-library");
  const inbound = readJsonl(join(dir, "inbound-cases.jsonl"));
  const instock = readJsonl(join(dir, "instock-cases.jsonl"));
  _cases = [...inbound, ...instock];
  return _cases;
}

function getIdf(): Map<string, number> {
  if (_idf) return _idf;
  const cases = loadCases();
  const N = Math.max(cases.length, 1);
  const df = new Map<string, number>();
  for (const c of cases) {
    const tokens = new Set(tokenize(c.customerIntent));
    for (const t of tokens) df.set(t, (df.get(t) || 0) + 1);
  }
  _idf = new Map();
  for (const [term, freq] of df) {
    _idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1));
  }
  return _idf;
}

export function retrieveSimilarCases(
  customerIntent: string,
  options?: RetrieveOptions,
): RetrievedCase[] {
  if (!isRagEnabled()) return [];
  const topK = options?.topK || 3;
  const exclude = new Set((options?.excludeCaseIds || []).filter(Boolean));
  const prefix = options?.category === "instock" ? "instock" : options?.category === "inbound" ? "inbound" : "";
  const cases = loadCases().filter((c) => {
    if (exclude.has(c.caseId)) return false;
    if (!prefix) return true;
    return c.sceneKey.startsWith(prefix);
  });
  if (!cases.length) return [];
  const queryTokens = tokenize(customerIntent);
  if (!queryTokens.length) return [];

  const idf = getIdf();
  const avgDl =
    cases.reduce((sum, c) => sum + tokenize(c.customerIntent).length, 0) / cases.length || 1;

  const scored = cases.map((entry) => {
    const docTokens = tokenize(entry.customerIntent);
    const dl = docTokens.length || 1;
    let score = 0;
    const tfMap = new Map<string, number>();
    for (const t of docTokens) tfMap.set(t, (tfMap.get(t) || 0) + 1);
    for (const term of queryTokens) {
      const termIdf = idf.get(term) || 0;
      const tf = tfMap.get(term) || 0;
      if (tf === 0 || termIdf === 0) continue;
      score += (termIdf * (tf * (K1 + 1))) / (tf + K1 * (1 - B + B * (dl / avgDl)));
    }
    return { entry, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

function clip(text: string, max: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}...`;
}

/** Few-shot block for LLM user message. Empty when no case scores >= RAG_MIN_SCORE. Capped at ~500 chars. */
export function formatFewShotBlock(retrieved: RetrievedCase[]): string {
  const usable = retrieved.filter((c) => c.score >= RAG_MIN_SCORE);
  if (!usable.length) return "";

  const pieces: string[] = [];
  for (let i = 0; i < usable.length; i++) {
    const c = usable[i];
    const lines = [
      `案例 ${i + 1}（相似度 ${c.score.toFixed(1)}）：`,
      `- 客户需求："${clip(c.entry.customerIntent, 150)}"`,
      c.entry.exceptionName
        ? `- 异常名称：${c.entry.exceptionName}（${c.entry.exceptionObject || "-"}）`
        : "",
      `- 附件情况：${c.entry.attachmentSummary || "无"}`,
      `- 最终场景：${c.entry.sceneName}`,
      `- 关键动作：${c.entry.keyAction || "（未提取）"}`,
      c.entry.sopSnippet ? `- SOP 摘要：${c.entry.sopSnippet}` : "",
    ].filter(Boolean);
    pieces.push(lines.join("\n"));
  }

  let body = pieces.join("\n\n");
  while (body.length > RAG_MAX_PROMPT_CHARS && pieces.length > 1) {
    pieces.pop();
    body = pieces.join("\n\n");
  }
  if (body.length > RAG_MAX_PROMPT_CHARS) body = `${body.slice(0, RAG_MAX_PROMPT_CHARS)}...`;

  return `## 相似历史案例（仅供参考，不是标准答案）\n\n${body}\n\n注意：以上案例仅供参考辨别方向，不要直接复制案例的场景判断。请根据当前需求的实际内容独立判断。`;
}

export function toMatchRetrieved(
  retrieved: RetrievedCase[],
): Array<{ caseId: string; sceneName: string; score: number; keyAction: string }> {
  return retrieved.map((c) => ({
    caseId: c.entry.caseId,
    sceneName: c.entry.sceneName,
    score: Number(c.score.toFixed(3)),
    keyAction: c.entry.keyAction || "",
  }));
}
