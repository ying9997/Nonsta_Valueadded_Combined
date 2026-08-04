/**
 * 本地验收：预约送仓专家 — 真实 Coze 万邑通代理（无 Mock 插件数据）。
 *
 * 运行：
 *   npm run smoke:inbound-appointment-manage -- --kb-only
 *   npm run smoke:inbound-appointment-manage -- --inboundOrderNos '["WI..."]'
 *   npm run smoke:inbound-appointment-manage -- --fixture scripts/fixtures/inbound-appointment-manage.local.json
 *
 * API 链凭证来自 .env（COZE_WINIT_*）；测试单号通过 CLI 或 local fixture 传入，不写 .env。
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { findExpertDir, runExpert } from "./run-expert";

const DEFAULT_FIXTURE = path.join(__dirname, "fixtures/inbound-appointment-manage.local.json");

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`缺少环境变量 ${name}（见 .env.example）`);
  return v;
}

function cozeEnvReady(): boolean {
  const token = (process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "").trim();
  const wf = (
    process.env.COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID ?? process.env.COZE_WINIT_WORKFLOW_ID ?? ""
  ).trim();
  const cc = (process.env.COZE_WINIT_CUSTOMER_CODE ?? "").trim();
  const cn = (process.env.COZE_WINIT_CUSTOMER_NAME ?? "").trim();
  const user = (process.env.COZE_WINIT_USERNAME ?? "").trim();
  return Boolean(token && wf && cc && cn && user);
}

function getArg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1 || i + 1 >= argv.length) return undefined;
  return argv[i + 1];
}

function parseOrderNosFromJson(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return parsed.map((x) => String(x).trim()).filter(Boolean);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const nos = (parsed as { inboundOrderNos?: unknown }).inboundOrderNos;
    if (Array.isArray(nos)) {
      return nos.map((x) => String(x).trim()).filter(Boolean);
    }
  }
  const single = String(parsed).trim();
  return single ? [single] : [];
}

function resolveOrderNos(argv: string[]): string[] {
  const fixturePath = getArg(argv, "--fixture");
  if (fixturePath) {
    const abs = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    if (!fs.existsSync(abs)) {
      throw new Error(`Fixture 不存在: ${abs}（可复制 inbound-appointment-manage.fixture.example.json）`);
    }
    return parseOrderNosFromJson(fs.readFileSync(abs, "utf-8"));
  }

  const inline = getArg(argv, "--inboundOrderNos");
  if (inline) {
    return parseOrderNosFromJson(inline);
  }

  if (fs.existsSync(DEFAULT_FIXTURE)) {
    return parseOrderNosFromJson(fs.readFileSync(DEFAULT_FIXTURE, "utf-8"));
  }

  return [];
}

function readPrompt(expertDir: string, name: string): string {
  return fs.readFileSync(path.join(expertDir, "prompts", name), "utf-8");
}

function kbBundle(expertDir: string): Record<string, string> {
  return {
    kbBookingSop: readPrompt(expertDir, "booking-sop.md"),
    kbBookingRules: readPrompt(expertDir, "booking-rules.md"),
    kbPenaltyRules: readPrompt(expertDir, "penalty-rules.md"),
    kbSplitShipment: readPrompt(expertDir, "split-shipment.md"),
    kbPremiumBooking: readPrompt(expertDir, "premium-booking.md"),
    kbBookingApiRef: readPrompt(expertDir, "booking-api-reference.md"),
    kbPodDownloadGuide: readPrompt(expertDir, "pod-download-guide.md"),
  };
}

async function runCase(
  expertDir: string,
  label: string,
  initialParams: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const resolved = path.resolve(path.join(__dirname, ".."), expertDir);
  console.error(`\n=== ${label} ===`);
  return runExpert({ expertDir: resolved, initialParams });
}

function assertApiChain(ctx: Record<string, unknown>, label: string): void {
  if (ctx.skipApi === true) {
    throw new Error(`${label}: 预期走 api_chain，但 skipApi=true`);
  }
  const raw = ctx.rawOrderData as { _fetchMeta?: { strategy?: string }; list?: unknown[] } | undefined;
  const strategy = raw?._fetchMeta?.strategy ?? "missing";
  if (strategy === "skipped") {
    throw new Error(`${label}: getOrderDetail 未执行（strategy=skipped）。请检查 COZE_* 环境变量`);
  }
  const orderCount = raw?.list?.length ?? 0;
  console.error(`  rawOrderData.strategy=${strategy} orders=${orderCount}`);
  if (orderCount < 1) {
    throw new Error(
      `${label}: getOrderDetail 返回 0 条 — 请更换 --inboundOrderNos / fixture 中的 WI 为当前账号可查单号`
    );
  }

  const summary = ctx.bookingSummary as Record<string, unknown> | undefined;
  const dq = summary?.dataQuality;
  console.error(`  bookingSummary.dataQuality=${dq} count=${summary?.recordCount}`);
  if (dq === "missing") {
    const row = (raw!.list![0] ?? {}) as Record<string, unknown>;
    const hint = [row.bookingNo, row.inboundBookingStatus, row.winitProductCode].filter(Boolean).join(", ");
    throw new Error(
      `${label}: booking.list 与表头均无预约数据。订单字段快照: ${hint || "(无 booking 相关字段)"}`
    );
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const projectRoot = path.resolve(__dirname, "..");
  const expertDir = findExpertDir(projectRoot, "inbound-appointment-manage");
  if (!expertDir) {
    console.error("Expert inbound-appointment-manage not found");
    process.exit(1);
  }
  const kb = kbBundle(path.resolve(projectRoot, expertDir));
  const orderNos = resolveOrderNos(argv);

  const c1 = await runCase(expertDir, "create_guide LCL (KB)", {
    intent: "create_guide",
    deliveryWayHint: "LCL",
    query: "LCL 散货怎么预约送仓",
    customerIntent: "第一次预约散货",
    ...kb,
  });
  if (c1.routePath !== "kb_only" || c1.skipApi !== true) {
    throw new Error(`create_guide 路由异常: ${JSON.stringify({ routePath: c1.routePath, skipApi: c1.skipApi })}`);
  }
  const kb1 = String(c1.kbContent ?? "");
  if (!kb1.includes("散货") && !kb1.includes("LCL")) {
    throw new Error("create_guide: kbContent 未命中 LCL 章节");
  }

  const c2 = await runCase(expertDir, "split_shipment (KB)", {
    intent: "split_shipment",
    query: "分批到仓邮件怎么处理",
    ...kb,
  });
  if (!String(c2.kbContent ?? "").includes("3 个自然日")) {
    throw new Error("split_shipment: KB 片段缺失");
  }

  const c2b = await runCase(expertDir, "pod_guide (KB)", {
    intent: "pod_guide",
    query: "怎么下载预约单的 POD 签收证明",
    customerIntent: "货已到仓需要 PDF",
    ...kb,
  });
  if (c2b.routePath !== "kb_only" || c2b.skipApi !== true) {
    throw new Error(`pod_guide 无单号应走 kb_only: ${JSON.stringify({ routePath: c2b.routePath, skipApi: c2b.skipApi })}`);
  }
  const kbPod = String(c2b.kbContent ?? "");
  if (!kbPod.includes("POD") || !kbPod.includes("万邑联")) {
    throw new Error("pod_guide: kbContent 未命中 POD 下载指引");
  }

  const kbOnly = argv.includes("--kb-only");
  if (kbOnly) {
    console.log(
      JSON.stringify({ ok: true, mode: "kb-only", kbCases: ["create_guide", "split_shipment", "pod_guide"] }, null, 2)
    );
    return;
  }

  if (!cozeEnvReady()) {
    throw new Error(
      "API 用例需要 COZE_API_TOKEN、COZE_WINIT_*_WORKFLOW_ID、COZE_WINIT_CUSTOMER_CODE/NAME/USERNAME（见 .env.example）"
    );
  }
  if (orderNos.length === 0) {
    throw new Error(
      "API 用例需传入 WI：--inboundOrderNos '[\"WI...\"]' 或 --fixture <path>，或创建 scripts/fixtures/inbound-appointment-manage.local.json。仅测 KB 请加 --kb-only"
    );
  }

  requireEnv("COZE_WINIT_CUSTOMER_CODE");
  console.error(`使用 WI 单号: ${orderNos.join(", ")}`);

  const c3 = await runCase(expertDir, "query (真实 API)", {
    intent: "query",
    inboundOrderNos: orderNos,
    query: "查询预约单状态",
    customerIntent: "smoke query",
    ...kb,
  });
  assertApiChain(c3, "query");
  const summary3 = c3.bookingSummary as Record<string, unknown> | undefined;
  const sg3 = c3.scopeGuard as Record<string, unknown> | undefined;
  if (!sg3?.winitProductCode) {
    throw new Error(`query: scopeGuard 缺少 winitProductCode — ${JSON.stringify(sg3)}`);
  }
  console.error(`  scopeGuard PSC=${sg3.winitProductCode} action=${sg3.scopeAction}`);

  const c4 = await runCase(expertDir, "penalty (真实 API)", {
    intent: "penalty",
    inboundOrderNos: orderNos,
    query: "是否有预约违规费",
    customerIntent: "smoke penalty",
    ...kb,
  });
  assertApiChain(c4, "penalty");
  const summary4 = c4.bookingSummary as Record<string, unknown> | undefined;
  console.error(
    `  penalty hasPenaltyFeeField=${summary4?.hasPenaltyFeeField} total=${summary4?.totalPenaltyFee}`
  );

  if (!c3.structured && !c3.analysis) {
    throw new Error("query: format-output 无 structured/analysis");
  }

  console.log("\nsmoke-inbound-appointment-manage: ALL OK (真实 API)");
  console.log(
    JSON.stringify(
      {
        kb: { create_guide: c1.kbScope, split_shipment: c2.kbScope },
        query: {
          dataQuality: summary3?.dataQuality,
          recordCount: summary3?.recordCount,
          scopeAction: sg3?.scopeAction,
          winitProductCode: sg3?.winitProductCode,
        },
        penalty: {
          dataQuality: summary4?.dataQuality,
          hasPenaltyFeeField: summary4?.hasPenaltyFeeField,
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
