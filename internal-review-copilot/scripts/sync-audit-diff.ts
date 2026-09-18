/**
 * 把已审核通过的 OMS 终态补进 eval/ai-human-comparison.jsonl。
 *
 *   npx tsx internal-review-copilot/scripts/sync-audit-diff.ts
 *   npx tsx internal-review-copilot/scripts/sync-audit-diff.ts --force
 */

import {
  computeComparisonDiff,
  readComparisonRecords,
  shanghaiIso,
  upsertComparisonRecord,
  type HumanSnapshot,
} from "../lib/ai-human-comparison.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import {
  collectOmsAuditInfo,
  extractWiNos,
  fetchOmsOrderSnapshot,
  isWritableOmsStatus,
} from "../lib/oms-draft-write.ts";
import { loadEnvFiles } from "../lib/env.ts";

export interface SyncAuditDiffResult {
  updated: number;
  skipped: number;
  failed: number;
}

let lastRunMs = 0;
const MIN_INTERVAL_MS = 30 * 60 * 1000;

function attrByName(atom: Record<string, unknown>, names: string[]): string {
  for (const attr of asArray(atom.vaAtomAttrs).map(asRecord)) {
    const name = asText(attr.attributeName) || asText(attr.attributeKey);
    if (names.includes(name) || names.includes(asText(attr.attributeKey))) {
      return asText(attr.attributeValue);
    }
  }
  return "";
}

function auditorOf(header: Record<string, unknown>, atom: Record<string, unknown>): string {
  return (
    asText(header.auditUser) ||
    asText(header.auditor) ||
    asText(header.lastModifier) ||
    asText(header.updateBy) ||
    asText(atom.auditUser) ||
    asText(atom.lastModifier) ||
    ""
  );
}

export async function syncAuditDiff(options: {
  force?: boolean;
  log?: (line: string) => void;
} = {}): Promise<SyncAuditDiffResult> {
  const now = Date.now();
  if (!options.force && lastRunMs && now - lastRunMs < MIN_INTERVAL_MS) {
    options.log?.(`audit_diff_skip_interval last=${Math.round((now - lastRunMs) / 1000)}s`);
    return { updated: 0, skipped: 0, failed: 0 };
  }
  lastRunMs = now;
  const records = readComparisonRecords();
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const rec of records) {
    if (rec.human) {
      skipped += 1;
      continue;
    }
    try {
      const { atom, header } = await fetchOmsOrderSnapshot(rec.vascNo);
      const audited = Boolean(collectOmsAuditInfo(header, atom)) || !isWritableOmsStatus(header, atom);
      if (!audited) {
        skipped += 1;
        continue;
      }
      const sopText = asText(atom.sop);
      const requirementDesc = attrByName(atom, ["需求描述", "VAS_ATTR_REL_RD"]);
      const human: HumanSnapshot = {
        sceneCode: asText(atom.sceneOverviewCode) || asText(header.sceneOverviewCode),
        sceneName: asText(atom.sceneOverviewName) || asText(header.sceneOverviewName),
        sopText,
        requirementDesc,
        auditor: auditorOf(header, atom),
        auditTime: shanghaiIso(),
        wiNumbers: extractWiNos(
          `${attrByName(atom, ["上架入库单号", "VAS_ATTR_REL_NWEON"])} ${requirementDesc} ${sopText}`,
        ),
      };
      upsertComparisonRecord({
        ...rec,
        human,
        diff: computeComparisonDiff(rec.ai, human),
      });
      updated += 1;
      options.log?.(`audit_diff_updated ${rec.vascNo} auditor=${human.auditor || "-"}`);
    } catch (err) {
      failed += 1;
      options.log?.(`audit_diff_fail ${rec.vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }
  return { updated, skipped, failed };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const force = process.argv.includes("--force");
  const result = await syncAuditDiff({
    force,
    log: (line) => console.log(line),
  });
  console.log(`sync-audit-diff updated=${result.updated} skipped=${result.skipped} failed=${result.failed}`);
}

const isDirect = process.argv[1] && /sync-audit-diff\.ts/.test(process.argv[1].replaceAll("\\", "/"));
if (isDirect) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
