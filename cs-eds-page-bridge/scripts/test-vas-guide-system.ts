/**
 * VAS 指引 system prompt dry-run：调真实 LLM，核对 JSON 字段。
 *   cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
 *   npx tsx ../cs-eds-page-bridge/scripts/test-vas-guide-system.ts
 * Key 从 internal-review-copilot/.env 读，不写进本仓库。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../../internal-review-copilot/lib/env.ts";
import {
  callChat,
  fillTemplate,
  parseJsonishObject,
  resolveLlmConfig,
} from "../../internal-review-copilot/lib/llm-client.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const prompts = path.join(root, "prompts");

type LlmJson = {
  phase?: string;
  matched_scene?: string;
  route_category?: string;
  customer_message?: string;
  missing_info?: unknown;
};

type Case = {
  id: string;
  user: string;
  expectPhase: string;
  expectRoute?: string;
};

const EVENT_NO = "EB0126092143";

const CASES: Case[] = [
  {
    id: "清晰描述-辨识换标",
    user: "帮我把这批264箱货物辨识后换标上架到新入库单WI50259337，包裹和SKU的对应关系见附件",
    expectPhase: "generate",
    expectRoute: "nonstandard_special",
  },
  {
    id: "模糊描述",
    user: "帮我处理下这批货",
    expectPhase: "clarify",
  },
  {
    id: "拍照暂存",
    user: "先拍照看看什么情况",
    expectPhase: "clarify",
  },
  {
    id: "超出范围",
    user: "帮我查一下这个快递到哪了",
    expectPhase: "transfer_human",
    expectRoute: "transfer_human",
  },
  {
    id: "标准增值",
    user: "帮我做一下轻加工",
    expectPhase: "generate",
    expectRoute: "standard",
  },
];

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function loadPrompt(): string {
  const systemTpl = fs.readFileSync(path.join(prompts, "vas-guide-system.md"), "utf8");
  return fillTemplate(systemTpl, {
    scene_kb: fs.readFileSync(path.join(prompts, "vas-guide-kb-scenes.md"), "utf8"),
    flow_context_kb: fs.readFileSync(path.join(prompts, "vas-guide-kb-flow-context.md"), "utf8"),
    inference_rules_kb: fs.readFileSync(path.join(prompts, "vas-guide-kb-rules.md"), "utf8"),
    event_no: EVENT_NO,
    user_input: "",
  });
}

async function runCase(system: string, item: Case): Promise<LlmJson> {
  const raw = await callChat(
    resolveLlmConfig(),
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `当前异常单号 ${EVENT_NO}（开场已告知，不必再问）。客户本轮说：${item.user}`,
      },
    ],
    { jsonMode: true, temperature: 0.2, maxTokens: 1600 },
  );
  const parsed = parseJsonishObject(raw) as LlmJson;
  return parsed;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const system = loadPrompt();
  const failures: string[] = [];

  for (const item of CASES) {
    process.stdout.write(`RUN ${item.id} ... `);
    let parsed: LlmJson;
    try {
      parsed = await runCase(system, item);
    } catch (err) {
      const msg = `${item.id}: LLM 调用失败 ${err instanceof Error ? err.message : err}`;
      console.log("FAIL");
      failures.push(msg);
      continue;
    }
    const phase = String(parsed.phase || "");
    const route = String(parsed.route_category || "");
    const message = String(parsed.customer_message || "");
    const okPhase = phase === item.expectPhase;
    const okRoute = !item.expectRoute || route === item.expectRoute;
    const okMsg = message.trim().length > 0;
    if (okPhase && okRoute && okMsg) {
      console.log(`PASS phase=${phase} route=${route || "-"} scene=${parsed.matched_scene || ""}`);
    } else {
      console.log(`FAIL phase=${phase} route=${route} msg=${message.slice(0, 80)}`);
      failures.push(
        `${item.id}: expect phase=${item.expectPhase}` +
          (item.expectRoute ? ` route=${item.expectRoute}` : "") +
          ` got phase=${phase} route=${route}`,
      );
    }
  }

  if (failures.length) {
    console.error("FAIL vas-guide-system\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS vas-guide-system 5/5");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
