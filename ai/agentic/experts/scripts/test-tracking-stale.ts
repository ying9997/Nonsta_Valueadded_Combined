/**
 * 本地验证 tracking-stale：validate -> LLM -> format
 *
 * - 默认 LLM 使用 stub（快速、确定性）
 * - 真实 LLM：传 --openai 且配置 OPENAI_API_KEY
 *
 * npm run test:tracking-stale
 * npm run test:tracking-stale -- --openai
 */

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { findExpertDir, runExpert, runExpertUntil } from "./run-expert";

const projectRoot = path.resolve(__dirname, "..");
const fixturesPath = path.join(__dirname, "fixtures", "tracking-stale-params.json");

interface FixtureCase {
  id: string;
  description: string;
  params: Record<string, unknown>;
  llmResult?: {
    branch?: string;
    analysis?: string;
    missingFacts?: string[];
    suggestedNextExperts?: string[];
  };
  expect?: {
    valid?: boolean;
    staleFactsSource?: string;
    staleFactsCalcStatus?: string;
    staleFactsIsOver10Days?: boolean;
    staleFactsIsDelivered?: boolean;
    staleFactsIsPlatformWaybill?: boolean;
    scanStateSummary?: string;
    scanStateCount?: number;
    branch?: string;
    missingFactsIncludes?: string[];
    suggestedNextExpertsIncludes?: string[];
    analysisIncludes?: string[];
    analysisExcludes?: string[];
  };
}

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
        missingFacts: c.llmResult?.missingFacts ?? [],
      },
      analysis: c.llmResult?.analysis ?? "[test-tracking-stale] 对抗性 LLM stub 输出。",
    },
  });
}

function assertCase(c: FixtureCase, ctx: Record<string, unknown>): void {
  const exp = c.expect;
  if (!exp) return;

  if ("valid" in exp) {
    const actual = ctx.valid === true;
    if (actual !== exp.valid) {
      throw new Error(`[${c.id}] expect valid=${exp.valid}, got ${String(ctx.valid)}`);
    }
  }

  const ec = ctx.enrichedContext;
  if (!ec || typeof ec !== "object" || Array.isArray(ec)) {
    throw new Error(`[${c.id}] enrichedContext should be object`);
  }
  const analysisClock = (ec as Record<string, unknown>).analysisClock;
  if (!analysisClock || typeof analysisClock !== "object") {
    throw new Error(`[${c.id}] missing enrichedContext.analysisClock`);
  }

  const staleFacts = (ec as Record<string, unknown>).staleFacts;
  if (!staleFacts || typeof staleFacts !== "object" || Array.isArray(staleFacts)) {
    throw new Error(`[${c.id}] missing enrichedContext.staleFacts`);
  }
  const sf = staleFacts as Record<string, unknown>;

  if ("staleFactsSource" in exp && exp.staleFactsSource !== undefined) {
    if (String(sf.source ?? "") !== exp.staleFactsSource) {
      throw new Error(
        `[${c.id}] expect staleFacts.source=${exp.staleFactsSource}, got ${String(sf.source ?? "")}`
      );
    }
  }
  if ("staleFactsCalcStatus" in exp && exp.staleFactsCalcStatus !== undefined) {
    if (String(sf.calcStatus ?? "") !== exp.staleFactsCalcStatus) {
      throw new Error(
        `[${c.id}] expect staleFacts.calcStatus=${exp.staleFactsCalcStatus}, got ${String(sf.calcStatus ?? "")}`
      );
    }
  }
  if ("staleFactsIsOver10Days" in exp && exp.staleFactsIsOver10Days !== undefined) {
    if (Boolean(sf.isOver10Days) !== exp.staleFactsIsOver10Days) {
      throw new Error(
        `[${c.id}] expect staleFacts.isOver10Days=${String(exp.staleFactsIsOver10Days)}, got ${String(sf.isOver10Days)}`
      );
    }
  }
  if ("staleFactsIsDelivered" in exp && exp.staleFactsIsDelivered !== undefined) {
    if (Boolean(sf.isDelivered) !== exp.staleFactsIsDelivered) {
      throw new Error(
        `[${c.id}] expect staleFacts.isDelivered=${String(exp.staleFactsIsDelivered)}, got ${String(sf.isDelivered)}`
      );
    }
  }
  if ("staleFactsIsPlatformWaybill" in exp && exp.staleFactsIsPlatformWaybill !== undefined) {
    if (Boolean(sf.isPlatformWaybill) !== exp.staleFactsIsPlatformWaybill) {
      throw new Error(
        `[${c.id}] expect staleFacts.isPlatformWaybill=${String(exp.staleFactsIsPlatformWaybill)}, got ${String(sf.isPlatformWaybill)}`
      );
    }
  }
  const ecFlat = ctx.enrichedContext as Record<string, unknown>;
  if ("staleFactsIsPlatformWaybill" in exp && exp.staleFactsIsPlatformWaybill === true) {
    if (ecFlat.isPlatformWaybill !== true) {
      throw new Error(`[${c.id}] expect enrichedContext.isPlatformWaybill=true after validate`);
    }
  }
  if (exp.scanStateSummary !== undefined && String(sf.scanStateSummary ?? "") !== exp.scanStateSummary) {
    throw new Error(`[${c.id}] expect scanStateSummary=${exp.scanStateSummary}, got ${String(sf.scanStateSummary)}`);
  }
  if (exp.scanStateCount !== undefined) {
    const count = Array.isArray(sf.scanStates) ? sf.scanStates.length : -1;
    if (count !== exp.scanStateCount) throw new Error(`[${c.id}] expect scanStates=${exp.scanStateCount}, got ${count}`);
  }
}

function assertFinalCase(c: FixtureCase, ctx: Record<string, unknown>): void {
  const exp = c.expect;
  if (!exp?.branch) return;
  const structured =
    ctx.structured && typeof ctx.structured === "object" && !Array.isArray(ctx.structured)
      ? (ctx.structured as Record<string, unknown>)
      : undefined;
  if (!structured) throw new Error(`[${c.id}] missing final structured output`);
  if (structured.branch !== exp.branch) {
    throw new Error(`[${c.id}] expect branch=${exp.branch}, got ${String(structured.branch)}`);
  }
  if (exp.scanStateCount !== undefined) {
    const count = Array.isArray(structured.scanStates) ? structured.scanStates.length : -1;
    if (count !== exp.scanStateCount) throw new Error(`[${c.id}] final structured.scanStates expected ${exp.scanStateCount}, got ${count}`);
  }
  const missingFacts = Array.isArray(structured.missingFacts) ? structured.missingFacts.map(String) : [];
  for (const fact of exp.missingFactsIncludes ?? []) {
    if (!missingFacts.includes(fact)) throw new Error(`[${c.id}] missingFacts should include ${fact}`);
  }
  const next = Array.isArray(structured.suggestedNextExperts)
    ? structured.suggestedNextExperts.map(String)
    : [];
  for (const expert of exp.suggestedNextExpertsIncludes ?? []) {
    if (!next.includes(expert)) throw new Error(`[${c.id}] suggestedNextExperts should include ${expert}`);
  }
  const analysis = String(ctx.analysis ?? "");
  for (const text of exp.analysisIncludes ?? []) {
    if (!analysis.includes(text)) throw new Error(`[${c.id}] analysis should include ${text}`);
  }
  for (const text of exp.analysisExcludes ?? []) {
    if (analysis.includes(text)) throw new Error(`[${c.id}] analysis should exclude ${text}`);
  }
}

function runNodeScript(scriptPath: string, params: Record<string, unknown>): Record<string, unknown> {
  const tsNodeBin = require.resolve("ts-node/dist/bin.js");
  const stdout = execFileSync(
    process.execPath,
    [tsNodeBin, "-P", path.join(projectRoot, "scripts", "tsconfig.json"), scriptPath, JSON.stringify(params)],
    { cwd: projectRoot, encoding: "utf8" }
  );
  return JSON.parse(stdout) as Record<string, unknown>;
}

function assertOutboundEffectiveProductPrecedence(): void {
  const outboundDir = path.join(projectRoot, "experts", "outbound", "outbound-order-status");
  const pruned = runNodeScript(path.join(outboundDir, "nodes", "prune-outbound-json.ts"), {
    rawOrderData: {
      list: [
        {
          outboundOrderNum: "WO-SYNTHETIC-PRECEDENCE",
          winitProductCode: "PARENT-PRODUCT",
          winitProductName: "Parent Product",
          orderWinitProductCode: "ACTUAL-VARIANT",
          orderWinitProductName: "Winit Fulfillment-7日达(2-7 Business Days)-Zonal-US",
          packageList: [],
        },
      ],
    },
  });
  const prunedData = pruned.prunedOrderData as { list?: Array<Record<string, unknown>> };
  const row = prunedData.list?.[0];
  if (row?.effectiveProductCode !== "ACTUAL-VARIANT") {
    throw new Error(`outbound product precedence failed: ${String(row?.effectiveProductCode)}`);
  }
  const formatted = runNodeScript(path.join(outboundDir, "nodes", "format-output.ts"), {
    analysisResult: { structured: {}, analysis: "synthetic" },
    carrierFacts: [],
    prunedOrderData: prunedData,
    inputContext: {},
  });
  const ec = formatted.enrichedContext as { orderFacts?: Array<Record<string, unknown>> };
  if (ec.orderFacts?.[0]?.effectiveProductCode !== "ACTUAL-VARIANT") {
    throw new Error("outbound format-output did not propagate the actual product variant");
  }
  console.log("outbound product precedence: ACTUAL-VARIANT (pass)");
}

function assertDeliveryTrajectoryDedup(): void {
  const node = path.join(projectRoot, "experts", "last-mile", "delivery-status", "nodes", "merge-enriched-context.ts");
  const duplicated = {
    trackingNo: "TRACK-DEDUP-001",
    nodes: [
      { status: "DIC", time: "2026-07-16 10:00:00", description: "发货完成" },
      { status: "DLI", time: "2026-07-16 10:00:00", description: "派送中" },
    ],
    summary: { nodeCount: 2, standardCarrier: "Carrier A" },
  };
  const out = runNodeScript(node, {
    trajectories: [duplicated, { ...duplicated }],
    outTrackingIds: ["TRACK-DEDUP-001"],
    outOutboundOrderNos: ["WO-DEDUP-001"],
  });
  const ec = out.enrichedContext as Record<string, unknown>;
  if (!Array.isArray(ec.trajectories) || ec.trajectories.length !== 1) throw new Error("delivery trajectories not deduplicated");
  if (!Array.isArray(ec.computedScanFacts) || ec.computedScanFacts.length !== 1) throw new Error("delivery scan facts not deduplicated");
  if (!Array.isArray(ec.carrierHints) || ec.carrierHints.length !== 1) throw new Error("delivery carrier hints not deduplicated");
  if (typeof ec.carrierLastScanAt !== "undefined") throw new Error("warehouse DIC/DLI must not become carrierLastScanAt");
  if (typeof ec.warehouseLastEventAt !== "string") throw new Error("warehouseLastEventAt should be derived");
  if (ec.lastTrackingAt !== ec.warehouseLastEventAt) throw new Error("legacy lastTrackingAt should match warehouse event when no carrier scan exists");
  const clock = ec.analysisClock as { utcIso?: string } | undefined;
  const expectedDays = Math.floor(
    (Date.parse(String(clock?.utcIso ?? "")) - Date.parse(String(ec.warehouseLastEventAt))) / 86400000
  );
  if (!Number.isFinite(expectedDays) || ec.noUpdateDays !== expectedDays) {
    throw new Error(`delivery noUpdateDays should follow runtime analysisClock, expected ${expectedDays}, got ${String(ec.noUpdateDays)}`);
  }
  console.log("delivery trajectory dedup and typed times: pass");
}

async function main(): Promise<void> {
  const stub = useStub();
  if (process.argv.includes("--openai") && !process.env.OPENAI_API_KEY?.trim()) {
    console.error("已指定 --openai 但未设置 OPENAI_API_KEY");
    process.exit(1);
  }

  const expertDir = findExpertDir(projectRoot, "tracking-stale");
  if (!expertDir) {
    console.error("未找到 manifest.id=tracking-stale 的专家目录");
    process.exit(1);
  }

  console.log(stub ? "模式: stub LLM" : "模式: OpenAI LLM");
  console.log("专家目录:", path.resolve(projectRoot, expertDir));
  assertOutboundEffectiveProductPrecedence();
  assertDeliveryTrajectoryDedup();

  const { cases } = JSON.parse(fs.readFileSync(fixturesPath, "utf-8")) as { cases: FixtureCase[] };
  let failed = 0;

  for (const c of cases) {
    console.log("\n==========", c.id, "==========");
    console.log(c.description);
    try {
      const expertPath = path.resolve(projectRoot, expertDir);
      const deriveCtx = await runExpertUntil(
        { expertDir: expertPath, initialParams: c.params },
        "derive-stale-facts"
      );
      const ctx = await runExpert({
        expertDir: expertPath,
        initialParams: c.params,
        llmHandler: stub ? () => llmStub(c) : undefined,
      });

      assertCase(c, deriveCtx);
      assertFinalCase(c, ctx);

      const structured = ctx.structured as { branch?: string } | undefined;
      console.log("valid:", ctx.valid, "| error:", (ctx.error as string) ?? "");
      console.log("result.branch:", structured?.branch ?? "(missing)");
      const preview = String(ctx.analysis ?? "").slice(0, 220);
      console.log("analysis preview:", preview + (preview.length >= 220 ? "..." : ""));
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
