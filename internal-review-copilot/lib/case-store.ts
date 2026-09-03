import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CaseRecord, CaseStatus } from "./types.ts";

const TERMINAL: CaseStatus[] = ["written_back", "transferred", "sop_ready"];

export class CaseStore {
  readonly path: string;
  private records: Map<string, CaseRecord>;

  constructor(filePath: string) {
    this.path = resolve(filePath);
    this.records = new Map();
    this.load();
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    const raw = JSON.parse(readFileSync(this.path, "utf8")) as { cases?: CaseRecord[] } | CaseRecord[];
    const list = Array.isArray(raw) ? raw : raw.cases || [];
    for (const item of list) {
      if (item?.vascNo) this.records.set(item.vascNo, item);
    }
  }

  save(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const payload = {
      updatedAt: new Date().toISOString(),
      cases: [...this.records.values()].sort((a, b) => a.vascNo.localeCompare(b.vascNo)),
    };
    writeFileSync(this.path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  get(vascNo: string): CaseRecord | undefined {
    return this.records.get(vascNo);
  }

  list(): CaseRecord[] {
    return [...this.records.values()];
  }

  upsert(patch: Partial<CaseRecord> & { vascNo: string }): CaseRecord {
    const now = new Date().toISOString();
    const prev = this.records.get(patch.vascNo);
    const next: CaseRecord = {
      vascNo: patch.vascNo,
      status: patch.status || prev?.status || "pending",
      customer: patch.customer ?? prev?.customer ?? "",
      warehouse: patch.warehouse ?? prev?.warehouse ?? "",
      salesRep: patch.salesRep ?? prev?.salesRep ?? "",
      csRep: patch.csRep ?? prev?.csRep ?? "",
      omsAuditStatus: patch.omsAuditStatus ?? prev?.omsAuditStatus ?? "",
      aiOutputPath: patch.aiOutputPath ?? prev?.aiOutputPath ?? "",
      aiGeneratedText: patch.aiGeneratedText ?? prev?.aiGeneratedText ?? "",
      matchResult: patch.matchResult ?? prev?.matchResult ?? {},
      missingFields: patch.missingFields ?? prev?.missingFields ?? [],
      feishuThreadId: patch.feishuThreadId !== undefined ? patch.feishuThreadId : prev?.feishuThreadId ?? null,
      clarificationSentAt: patch.clarificationSentAt !== undefined ? patch.clarificationSentAt : prev?.clarificationSentAt ?? null,
      replyReceivedAt: patch.replyReceivedAt !== undefined ? patch.replyReceivedAt : prev?.replyReceivedAt ?? null,
      lastProcessedAt: patch.lastProcessedAt ?? now,
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      reminderSentAt: patch.reminderSentAt !== undefined ? patch.reminderSentAt : prev?.reminderSentAt ?? null,
      reviewRemark: patch.reviewRemark ?? prev?.reviewRemark,
      llmError: patch.llmError !== undefined ? patch.llmError : prev?.llmError,
      ruleOutputPath: patch.ruleOutputPath ?? prev?.ruleOutputPath,
      riskFlags: patch.riskFlags ?? prev?.riskFlags,
      processingMethod: "暂时",
    };
    this.records.set(next.vascNo, next);
    this.save();
    return next;
  }

  shouldSkipAssess(vascNo: string): boolean {
    const rec = this.records.get(vascNo);
    return Boolean(rec && rec.status !== "pending");
  }

  awaitingReply(): CaseRecord[] {
    return this.list().filter((item) => item.status === "awaiting_reply" || item.status === "clarification_sent");
  }

  replyReceived(): CaseRecord[] {
    return this.list().filter((item) => item.status === "reply_received");
  }

  isTerminal(status: CaseStatus): boolean {
    return TERMINAL.includes(status);
  }
}

export function defaultCaseStorePath(outDir?: string): string {
  if (outDir) return resolve(outDir, "case-store.json");
  return resolve(process.cwd(), "internal-review-copilot/data/case-store.json");
}
