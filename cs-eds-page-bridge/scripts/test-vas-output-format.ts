/**
 * vas-output-format：解析 LLM JSON，phase=generate 时附加需求描述。
 *   cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
 *   npx tsx ../cs-eds-page-bridge/scripts/test-vas-output-format.ts
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const nodeFile = path.join(root, "nodes", "vas-output-format.ts");

type Out = {
  customer_reply: string;
  should_send_tool: boolean;
  function_name: string;
  arguments: string;
};

function run(params: Record<string, unknown>): Out {
  const result = spawnSync("npx", ["tsx", nodeFile, "--stdin"], {
    encoding: "utf8",
    cwd: path.resolve(root, "..", "internal-review-copilot"),
    input: JSON.stringify(params),
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `exit ${result.status}`).slice(0, 2000));
  }
  const line = result.stdout.trim().split(/\r?\n/).filter(Boolean).pop() || "";
  return JSON.parse(line) as Out;
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const empty = run({ llm_output: "" });
  assert(empty.customer_reply.includes("人工客服"), `empty reply=${empty.customer_reply}`);
  assert(empty.should_send_tool === false, "V1 不应发工具");

  const garbage = run({ llm_output: "not-json" });
  assert(garbage.customer_reply.includes("人工客服"), "坏 JSON 应降级");

  const clarify = run({
    llm_output: JSON.stringify({
      phase: "clarify",
      matched_scene: "inbound_photo_hold",
      matched_scene_name: "指定商品拍照暂存",
      missing_info: ["拍照内容要求"],
      clarification_message: "请问需要拍哪几个面？",
      requirement_description: "",
      requirement_background: "",
      route_category: "nonstandard_special",
      customer_message: "请问需要拍哪几个面？一次拍几件？",
    }),
  });
  assert(clarify.customer_reply === "请问需要拍哪几个面？一次拍几件？", "clarify 不应附加需求块");
  assert(!clarify.customer_reply.includes("【需求描述】"), "clarify 不要需求描述标题");
  assert(clarify.should_send_tool === false, "clarify 不发工具");

  const generate = run({
    llm_output: JSON.stringify({
      phase: "generate",
      matched_scene: "inbound_label_identify",
      matched_scene_name: "尺重/标签辨识后换标上架",
      missing_info: [],
      clarification_message: "",
      requirement_description: "异常单EB0126092143共264箱，辨识后换标上架到WI50259337。",
      requirement_background: "包裹条码与商品条码不对应，无法走标准上架。",
      route_category: "nonstandard_special",
      customer_message: "信息已齐，请确认下面两段后复制到表单。",
    }),
  });
  assert(generate.customer_reply.includes("信息已齐"), "应保留客户原文");
  assert(generate.customer_reply.includes("【需求描述】"), "generate 应附加需求描述");
  assert(generate.customer_reply.includes("WI50259337"), "应带上需求描述正文");
  assert(generate.customer_reply.includes("【需求背景说明】"), "应附加背景说明");
  assert(generate.customer_reply.includes("复制到表单提交"), "应有复制提示");
  assert(generate.should_send_tool === false, "V1 should_send_tool 必须是 false");
  assert(generate.function_name === "", "V1 function_name 应为空");

  const fenced = run({
    llm_output:
      '```json\n{"phase":"clarify","matched_scene":"","matched_scene_name":"","missing_info":[],"clarification_message":"x","requirement_description":"","requirement_background":"","route_category":"transfer_human","customer_message":"请先完成当前流程，或输入退出。"}\n```',
  });
  assert(fenced.customer_reply.includes("输入退出"), `fenced reply=${fenced.customer_reply}`);

  const nested = run({
    llm_output: {
      phase: "clarify",
      customer_message: "还差新入库单号。",
    },
  });
  assert(nested.customer_reply === "还差新入库单号。", "应能解析对象形态的 llm_output");

  console.log("PASS vas-output-format");
  console.log("  坏 JSON -> 转人工降级");
  console.log("  clarify -> 原文");
  console.log("  generate -> 附加需求描述（V1 不发工具）");
}

main();
