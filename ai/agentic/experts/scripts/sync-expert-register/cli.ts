/**
 * 飞书多维表专家登记同步。
 *
 * 多版本按 (expert_id, ver) 落表；release_id 从 experts_recaller/nodes/release-id.ts 读取（须非空）。
 *
 * 单专家过滤（勿用 `--only` / `-- --flag`，npm 会吞掉；任选其一）：
 *   npm run sync:expert-register -- tracking-stale
 *   npm run sync:expert-register --expert-id=tracking-stale
 *   SYNC_EXPERT_REGISTER_EXPERT_ID=tracking-stale npm run sync:expert-register
 */
import * as fs from "fs";
import * as path from "path";
import { requireFeishuEnv } from "./env";
import {
  feishuBatchCreateRecords,
  feishuBatchUpdateRecords,
  feishuFindRecordIdByExpertIdAndVer,
  feishuListTableFields,
  getTenantToken,
} from "./feishu-api";
import { feishuFieldNameForExpertId, feishuFieldNameForReleaseId, feishuFieldNameForVer } from "./field-map";
import { assertValidVerDay, localCalendarDayYyyymmdd, normalizeExpertVer } from "./normalize-ver";
import { buildBitableFields } from "./record-builder";
import { scanExperts } from "./scan-experts";

function rawCliArgs(): string[] {
  const scriptIdx = process.argv.findIndex((s) => /[\\/]cli\.(ts|js)$/.test(s));
  if (scriptIdx >= 0) return process.argv.slice(scriptIdx + 1);
  return process.argv.slice(2);
}

function npmConfigString(key: string): string | undefined {
  const envKey = `npm_config_${key.replace(/-/g, "_")}`;
  const v = (process.env[envKey] ?? "").trim();
  return v || undefined;
}

function expertIdFromEnv(): string | undefined {
  const fromExpertId = (process.env.SYNC_EXPERT_REGISTER_EXPERT_ID ?? "").trim();
  if (fromExpertId) return fromExpertId;
  const fromNpm = npmConfigString("expert-id");
  if (fromNpm) return fromNpm;
  const legacyOnly = (process.env.SYNC_EXPERT_REGISTER_ONLY ?? "").trim();
  return legacyOnly || undefined;
}

function isCliFlag(token: string): boolean {
  return token.startsWith("-");
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  listFields: boolean;
  only?: string;
  fallbackVer?: string;
  verDateRaw?: string;
} {
  let dryRun = process.env.SYNC_EXPERT_REGISTER_DRY_RUN === "1" || npmConfigString("dry-run") === "true";
  let listFields = process.env.SYNC_EXPERT_REGISTER_LIST_FIELDS === "1";
  let only = expertIdFromEnv();
  let fallbackVer =
    (process.env.SYNC_EXPERT_REGISTER_VER ?? "").trim() || npmConfigString("ver") || undefined;
  let verDateRaw =
    (process.env.SYNC_EXPERT_REGISTER_VER_DATE ?? "").trim() || npmConfigString("ver-date") || undefined;
  let usedDeprecatedOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--dry-run") dryRun = true;
    else if (a === "--list-fields") listFields = true;
    else if ((a === "--expert-id" || a === "--only") && argv[i + 1]) {
      if (a === "--only") usedDeprecatedOnly = true;
      only = argv[++i]!.trim();
    } else if (a === "--ver" && argv[i + 1]) {
      fallbackVer = argv[++i]!.trim();
    } else if (a === "--ver-date" && argv[i + 1]) {
      verDateRaw = argv[++i]!.trim();
    } else if (!isCliFlag(a) && !only) {
      // npm run sync:expert-register -- tracking-stale（positional，不会被 npm 吃掉）
      only = a.trim();
    }
  }

  if (usedDeprecatedOnly) {
    console.warn(
      "提示: --only 与 npm 内置参数冲突，经 npm run 调用时会被吞掉；请改用 --expert-id、positional（npm run ... -- <expert-id>）或 SYNC_EXPERT_REGISTER_EXPERT_ID。"
    );
  }

  return { dryRun, listFields, only, fallbackVer, verDateRaw };
}

function repoRootFromCli(): string {
  return path.resolve(__dirname, "../..");
}

/** 与 Coze 节点 release-id.ts 同源：仅解析 const release_id = '...' */
function readReleaseIdFromProject(repoRoot: string): string {
  const p = path.join(repoRoot, "experts_recaller", "nodes", "release-id.ts");
  let raw: string;
  try {
    raw = fs.readFileSync(p, "utf-8");
  } catch {
    throw new Error(`无法读取发布批次配置: ${p}`);
  }
  const m = /const\s+release_id\s*=\s*['"]([^'"]*)['"]\s*;/.exec(raw);
  if (!m) {
    throw new Error(`${p} 中未找到 const release_id = '...' 或 const release_id = "..."`);
  }
  const id = m[1]!.trim();
  if (!id) {
    throw new Error(`${p} 中 release_id 为空字符串，请填写发布批次 id`);
  }
  return id;
}

function resolveVerDay(verDateRaw: string | undefined): string {
  const trimmed = verDateRaw?.trim();
  if (trimmed) return assertValidVerDay(trimmed);
  return localCalendarDayYyyymmdd();
}

async function main(): Promise<void> {
  const { dryRun, listFields, only, fallbackVer, verDateRaw } = parseArgs(rawCliArgs());
  const repoRoot = repoRootFromCli();
  const entries = scanExperts(repoRoot);
  const filtered = only ? entries.filter((e) => e.manifest.id === only) : entries;
  if (only && filtered.length === 0) {
    console.error(`未找到 expert_id=${only} 的专家目录`);
    process.exitCode = 1;
    return;
  }

  if (listFields) {
    const env = requireFeishuEnv();
    const token = await getTenantToken(env);
    const fields = await feishuListTableFields(token, env.appToken, env.tableId);
    console.log(JSON.stringify(fields, null, 2));
    return;
  }

  const releaseId = readReleaseIdFromProject(repoRoot);

  const verDay = resolveVerDay(verDateRaw);

  if (dryRun) {
    let dryOk = 0;
    let drySkip = 0;
    for (const e of filtered) {
      const manifestVer = typeof e.manifest.version === "string" ? e.manifest.version : undefined;
      let normalized: string;
      try {
        normalized = normalizeExpertVer(manifestVer, verDay, fallbackVer);
      } catch (err) {
        drySkip++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`--- ${e.manifest.id} ---\n跳过: ${msg}`);
        continue;
      }
      dryOk++;
      const fields = buildBitableFields(e, normalized, releaseId);
      console.log(`--- ${e.manifest.id} ---`);
      console.log(`ver: ${JSON.stringify(manifestVer ?? fallbackVer ?? "")} -> ${JSON.stringify(normalized)}`);
      console.log(`release_id: ${JSON.stringify(releaseId)}`);
      console.log(JSON.stringify(fields, null, 2));
    }
    console.log(
      `\n展示 ${dryOk} 条，跳过 ${drySkip} 条（未调用飞书写接口）；ver-date=${verDay}；扫描共 ${filtered.length} 条`
    );
    if (drySkip > 0) process.exitCode = 1;
    return;
  }

  const env = requireFeishuEnv();
  const token = await getTenantToken(env);
  const idField = feishuFieldNameForExpertId();
  const verField = feishuFieldNameForVer();
  const releaseField = feishuFieldNameForReleaseId();
  const errors: string[] = [];

  for (const e of filtered) {
    const id = e.manifest.id;
    const manifestVer = typeof e.manifest.version === "string" ? e.manifest.version : undefined;
    let normalized: string;
    try {
      normalized = normalizeExpertVer(manifestVer, verDay, fallbackVer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${id}: ${msg}`);
      console.error(`失败 ${id}: ${msg}`);
      continue;
    }
    const fields = buildBitableFields(e, normalized, releaseId);
    try {
      const recordId = await feishuFindRecordIdByExpertIdAndVer(
        token,
        env.appToken,
        env.tableId,
        id,
        idField,
        normalized,
        verField,
        releaseId,
        releaseField
      );
      if (recordId) {
        await feishuBatchUpdateRecords(token, env.appToken, env.tableId, [
          { record_id: recordId, fields },
        ]);
        console.log(`更新: ${id} ver=${normalized} release_id=${releaseId}`);
      } else {
        await feishuBatchCreateRecords(token, env.appToken, env.tableId, [{ fields }]);
        console.log(`新建: ${id} ver=${normalized} release_id=${releaseId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${id}: ${msg}`);
      console.error(`失败 ${id}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n完成，${errors.length} 条失败`);
    process.exitCode = 1;
  } else {
    console.log(`\n完成，共 ${filtered.length} 条`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
