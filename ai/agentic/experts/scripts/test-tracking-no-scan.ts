/**
 * 本地验证 tracking-no-scan：validate → fetch-and-enrich → LLM → format-output
 *
 * - 默认 LLM 使用 stub（快速、确定性）；重点断言 fetch-and-enrich 与 format 链路。
 * - 真实 LLM：传 --openai 且配置 OPENAI_API_KEY。
 * - 真实 Winit：TRACKING_NO_SCAN_LIVE=1 且 TRACKING_NO_SCAN_IDS='["单号1"]'（PowerShell 注意转义）
 *
 * npm run test:tracking-no-scan
 * npm run test:tracking-no-scan -- --openai
 * $env:TRACKING_NO_SCAN_LIVE=1; $env:TRACKING_NO_SCAN_IDS='["YOUR_TRACKING"]'; npm run test:tracking-no-scan
 */

import * as fs from "fs";
import * as path from "path";
import { findExpertDir, runExpert } from "./run-expert";

const projectRoot = path.resolve(__dirname, "..");
const fixturesPath = path.join(__dirname, "fixtures", "tracking-no-scan-params.json");

interface FixtureCase {
  id: string;
  description: string;
  params: Record<string, unknown>;
  expect?: Record<string, unknown>;
  llmResult?: {
    branch?: string;
    analysis?: string;
    suggestedNextExperts?: string[];
    missingFacts?: string[];
  };
  liveEnv?: boolean;
}

/** 默认 stub；--openai 且已配置 OPENAI_API_KEY 时走真实模型 */
function useStub(): boolean {
  if (process.argv.includes("--openai")) {
    return !process.env.OPENAI_API_KEY?.trim();
  }
  return true;
}

function llmStub(c: FixtureCase): Promise<Record<string, unknown>> {
  return Promise.resolve({
    analysisResult: {
      structured: {
        branch: c.llmResult?.branch ?? "need_human",
        trackingIds: [] as string[],
        outboundOrderNos: [] as string[],
        suggestedNextExperts: c.llmResult?.suggestedNextExperts ?? [],
        missingFacts: c.llmResult?.missingFacts ?? ["test-stub-LLM"],
      },
      analysis: c.llmResult?.analysis ?? "[test-tracking-no-scan] LLM stub：仅验证流水线。",
    },
  });
}

function getEc(ctx: Record<string, unknown>): Record<string, unknown> | null {
  const ec = ctx.enrichedContext;
  if (ec && typeof ec === "object" && !Array.isArray(ec)) return ec as Record<string, unknown>;
  return null;
}

function getFetchMeta(ec: Record<string, unknown> | null): Record<string, unknown> | null {
  const fm = ec?.fetchMeta;
  if (fm && typeof fm === "object" && !Array.isArray(fm)) return fm as Record<string, unknown>;
  return null;
}

function assertCase(c: FixtureCase, ctx: Record<string, unknown>): void {
  const exp = c.expect;
  if (!exp) return;

  if ("valid" in exp) {
    const v = ctx.valid === true;
    if (v !== exp.valid) {
      throw new Error(`[${c.id}] expect valid=${exp.valid}, got ${ctx.valid}`);
    }
  }

  const ec = getEc(ctx);
  const fm = getFetchMeta(ec);
  const trajs = ec?.trajectories;

  if ("fetchSkipped" in exp) {
    const skipped = fm?.skippedTrajectoryFetch === true;
    if (skipped !== exp.fetchSkipped) {
      throw new Error(
        `[${c.id}] expect fetchSkipped=${exp.fetchSkipped}, got skippedTrajectoryFetch=${String(fm?.skippedTrajectoryFetch)}`
      );
    }
  }

  if ("trackingIdsRequested" in exp) {
    const n = Number(fm?.trackingIdsRequested ?? -1);
    if (n !== exp.trackingIdsRequested) {
      throw new Error(`[${c.id}] expect trackingIdsRequested=${exp.trackingIdsRequested}, got ${n}`);
    }
  }

  if ("trajectoriesLength" in exp) {
    const len = Array.isArray(trajs) ? trajs.length : -1;
    if (len !== exp.trajectoriesLength) {
      throw new Error(`[${c.id}] expect trajectories.length=${exp.trajectoriesLength}, got ${len}`);
    }
  }

  if ("carrierScanDetected" in exp) {
    if (ec?.carrierScanDetected !== exp.carrierScanDetected) {
      throw new Error(
        `[${c.id}] expect carrierScanDetected=${exp.carrierScanDetected}, got ${String(ec?.carrierScanDetected)}`
      );
    }
  }

  if ("scanStateSummary" in exp && ec?.scanStateSummary !== exp.scanStateSummary) {
    throw new Error(`[${c.id}] expect scanStateSummary=${String(exp.scanStateSummary)}, got ${String(ec?.scanStateSummary)}`);
  }
  if ("scanStateCount" in exp) {
    const count = Array.isArray(ec?.scanStates) ? ec.scanStates.length : -1;
    if (count !== exp.scanStateCount) throw new Error(`[${c.id}] expect scanStateCount=${String(exp.scanStateCount)}, got ${count}`);
  }

  const structured = ctx.structured && typeof ctx.structured === "object" && !Array.isArray(ctx.structured)
    ? ctx.structured as Record<string, unknown>
    : null;
  if ("branch" in exp) {
    if (!structured) throw new Error(`[${c.id}] missing top-level structured output`);
    if (structured.branch !== exp.branch) throw new Error(`[${c.id}] expect branch=${String(exp.branch)}, got ${String(structured.branch)}`);
  }
  if ("scanStateCount" in exp && structured) {
    const count = Array.isArray(structured.scanStates) ? structured.scanStates.length : -1;
    if (count !== exp.scanStateCount) throw new Error(`[${c.id}] final structured.scanStates expected ${String(exp.scanStateCount)}, got ${count}`);
  }
  const next = Array.isArray(structured?.suggestedNextExperts) ? structured.suggestedNextExperts.map(String) : [];
  for (const expert of Array.isArray(exp.suggestedNextExpertsIncludes) ? exp.suggestedNextExpertsIncludes.map(String) : []) {
    if (!next.includes(expert)) throw new Error(`[${c.id}] suggestedNextExperts should include ${expert}`);
  }
  const analysis = String(ctx.analysis ?? "");
  for (const text of Array.isArray(exp.analysisIncludes) ? exp.analysisIncludes.map(String) : []) {
    if (!analysis.includes(text)) throw new Error(`[${c.id}] analysis should include ${text}`);
  }
  for (const text of Array.isArray(exp.analysisExcludes) ? exp.analysisExcludes.map(String) : []) {
    if (analysis.includes(text)) throw new Error(`[${c.id}] analysis should exclude ${text}`);
  }
}

function buildLiveCase(): FixtureCase | null {
  if (process.env.TRACKING_NO_SCAN_LIVE !== "1") return null;
  const raw = process.env.TRACKING_NO_SCAN_IDS?.trim();
  if (!raw) {
    console.warn("TRACKING_NO_SCAN_LIVE=1 但未设置 TRACKING_NO_SCAN_IDS，跳过 live 用例");
    return null;
  }
  let ids: string[];
  try {
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) throw new Error("not array");
    ids = p.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    console.warn("TRACKING_NO_SCAN_IDS 须为 JSON 数组字符串，跳过 live 用例");
    return null;
  }
  if (ids.length === 0) return null;
  return {
    id: "live_winit_fetch",
    description: `真实 Winit 拉轨迹: ${ids.join(", ")}`,
    params: {
      trackingIds: ids,
      customerIntent: "无上网查件（live）",
    },
    expect: {
      valid: true,
      fetchSkipped: false,
      trackingIdsRequested: ids.length,
    },
  };
}

async function main(): Promise<void> {
  const stub = useStub();
  if (process.argv.includes("--openai") && !process.env.OPENAI_API_KEY?.trim()) {
    console.error("已指定 --openai 但未设置 OPENAI_API_KEY");
    process.exit(1);
  }

  const expertDir = findExpertDir(projectRoot, "tracking-no-scan");
  if (!expertDir) {
    console.error("未找到 manifest.id=tracking-no-scan 的专家目录");
    process.exit(1);
  }

  console.log(stub ? "模式: stub LLM" : "模式: OpenAI LLM");
  console.log("专家目录:", path.resolve(projectRoot, expertDir));

  const { cases: fileCases } = JSON.parse(fs.readFileSync(fixturesPath, "utf-8")) as { cases: FixtureCase[] };
  const cases: FixtureCase[] = [];

  for (const c of fileCases) {
    if (c.liveEnv) {
      const live = buildLiveCase();
      if (live) cases.push(live);
      continue;
    }
    cases.push(c);
  }

  let failed = 0;

  for (const c of cases) {
    console.log("\n==========", c.id, "==========");
    console.log(c.description);

    try {
      const ctx = await runExpert({
        expertDir: path.resolve(projectRoot, expertDir),
        initialParams: c.params,
        llmHandler: stub ? () => llmStub(c) : undefined,
      });

      assertCase(c, ctx);

      const ec = getEc(ctx);
      const fm = getFetchMeta(ec);
      console.log("valid:", ctx.valid, "| error:", ctx.error ?? "");
      console.log(
        "fetchMeta:",
        JSON.stringify(
          {
            skippedTrajectoryFetch: fm?.skippedTrajectoryFetch,
            skipReason: fm?.skipReason,
            trackingIdsRequested: fm?.trackingIdsRequested,
            fetchError: fm?.fetchError,
          },
          null,
          0
        )
      );
      console.log("carrierScanDetected:", ec?.carrierScanDetected);
      console.log("trajectories count:", Array.isArray(ec?.trajectories) ? ec.trajectories.length : 0);

      const structured = ctx.structured as { branch?: string } | undefined;
      console.log("result.branch:", structured?.branch ?? "(missing)");
      const ap = String(ctx.analysis ?? "").slice(0, 280);
      console.log("analysis preview:", ap + (ap.length >= 280 ? "…" : ""));
    } catch (e) {
      failed++;
      console.error("失败:", e instanceof Error ? e.message : e);
    }
  }

  if (failed > 0) {
    console.error(`\n共 ${failed} 个用例失败`);
    process.exit(1);
  }
  console.log("\n全部用例通过。");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
