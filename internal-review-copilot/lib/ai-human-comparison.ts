/**
 * AI vs 人工终态对照：writeDraft 成功后追加 AI 快照；
 * sync-audit-diff 在审核通过后补 human + diff。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { copilotDir } from "./env.ts";

export interface AiSnapshot {
  sceneKey: string;
  sceneName: string;
  sceneCode?: string;
  sopText: string;
  requirementDesc: string;
  requirementBackground: string;
  wiNumbers: string[];
  missingAttachments: string[];
  degraded: boolean;
  confidence: string;
}

export interface HumanSnapshot {
  sceneCode: string;
  sceneName: string;
  sopText: string;
  requirementDesc: string;
  auditor: string;
  auditTime: string;
  wiNumbers?: string[];
}

export type SopEditType = "none" | "added_step" | "deleted_step" | "wording" | "rewritten";

export interface ComparisonDiff {
  sceneMatch: boolean;
  sopEdited: boolean;
  sopEditType: SopEditType;
  requirementEdited: boolean;
  wiNumbersEdited: boolean;
}

export interface ComparisonRecord {
  vascNo: string;
  aiWriteTime: string;
  ai: AiSnapshot;
  human?: HumanSnapshot;
  diff?: ComparisonDiff;
}

export function comparisonFilePath(): string {
  return resolve(copilotDir(), "eval/ai-human-comparison.jsonl");
}

export function shanghaiIso(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+08:00`;
}

function parseLine(line: string): ComparisonRecord | null {
  const text = line.trim();
  if (!text) return null;
  try {
    const rec = JSON.parse(text) as ComparisonRecord;
    if (!rec?.vascNo) return null;
    return rec;
  } catch {
    return null;
  }
}

export function readComparisonRecords(path = comparisonFilePath()): ComparisonRecord[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map(parseLine)
    .filter((item): item is ComparisonRecord => Boolean(item));
}

export function writeComparisonRecords(records: ComparisonRecord[], path = comparisonFilePath()): void {
  mkdirSync(dirname(path), { recursive: true });
  const body = records.map((item) => JSON.stringify(item)).join("\n");
  writeFileSync(path, body ? `${body}\n` : "", "utf8");
}

export function upsertComparisonRecord(next: ComparisonRecord, path = comparisonFilePath()): void {
  const records = readComparisonRecords(path);
  const idx = records.findIndex((item) => item.vascNo === next.vascNo);
  if (idx >= 0) records[idx] = { ...records[idx], ...next, ai: next.ai || records[idx].ai };
  else records.push(next);
  writeComparisonRecords(records, path);
}

export function appendAiWriteSnapshot(args: {
  vascNo: string;
  ai: AiSnapshot;
  path?: string;
}): void {
  const path = args.path || comparisonFilePath();
  const existing = readComparisonRecords(path).find((item) => item.vascNo === args.vascNo);
  upsertComparisonRecord(
    {
      vascNo: args.vascNo,
      aiWriteTime: existing?.aiWriteTime || shanghaiIso(),
      ai: args.ai,
      human: existing?.human,
      diff: existing?.diff,
    },
    path,
  );
}

function normalizeText(text: string): string {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function stepCount(sop: string): number {
  const lines = String(sop || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+[.、]/.test(line) || /^[-*]/.test(line));
  return lines.length;
}

export function classifySopEdit(aiSop: string, humanSop: string): SopEditType {
  const a = normalizeText(aiSop);
  const b = normalizeText(humanSop);
  if (a === b) return "none";
  const aiSteps = stepCount(aiSop);
  const humanSteps = stepCount(humanSop);
  if (humanSteps > aiSteps) return "added_step";
  if (humanSteps > 0 && humanSteps < aiSteps) return "deleted_step";
  if (a.length > 40 && b.length > 40) {
    const shorter = Math.min(a.length, b.length);
    const longer = Math.max(a.length, b.length);
    if (shorter / longer < 0.5) return "rewritten";
  }
  return "wording";
}

export function computeComparisonDiff(ai: AiSnapshot, human: HumanSnapshot): ComparisonDiff {
  const aiCode = String(ai.sceneCode || "").trim();
  const humanCode = String(human.sceneCode || "").trim();
  const sceneMatch = Boolean(aiCode && humanCode && aiCode === humanCode);
  const sopEditType = classifySopEdit(ai.sopText, human.sopText);
  const aiWi = [...(ai.wiNumbers || [])].map((item) => item.toUpperCase()).sort().join(",");
  const humanWi = [...(human.wiNumbers || [])].map((item) => item.toUpperCase()).sort().join(",");
  return {
    sceneMatch,
    sopEdited: sopEditType !== "none",
    sopEditType,
    requirementEdited: normalizeText(ai.requirementDesc) !== normalizeText(human.requirementDesc),
    wiNumbersEdited: Boolean(humanWi) && aiWi !== humanWi,
  };
}
