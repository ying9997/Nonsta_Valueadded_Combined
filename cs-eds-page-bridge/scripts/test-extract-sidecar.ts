/**
 * 本地验证 Query 出口拆包：人话洗净、sidecar 能交给封口节点。
 * 运行：
 *   cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
 *   npx tsx ..\cs-eds-page-bridge\scripts\test-extract-sidecar.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const extractFile = path.join(root, "nodes", "extract-sidecar.ts");
const emitFile = path.join(root, "nodes", "page-intent-emit.ts");
const fixtureDir = path.join(root, "fixtures");
const cwd = path.resolve(root, "..", "internal-review-copilot");

type ExtractOut = {
  sidecar: string;
  reply_clean: string;
  has_sidecar: boolean;
};

type EmitOut = {
  should_send: boolean;
  function_name: string;
  arguments: string;
};

function runNode(file: string, params: Record<string, unknown>): Record<string, unknown> {
  const result = spawnSync("npx", ["tsx", file, "--stdin"], {
    encoding: "utf8",
    cwd,
    input: JSON.stringify(params),
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `exit ${result.status}`).slice(0, 2000));
  }
  const line = result.stdout.trim().split(/\r?\n/).filter(Boolean).pop() || "";
  return JSON.parse(line) as Record<string, unknown>;
}

function extract(params: Record<string, unknown>): ExtractOut {
  return runNode(extractFile, params) as ExtractOut;
}

function emit(params: Record<string, unknown>): EmitOut {
  return runNode(emitFile, params) as EmitOut;
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const markerText = fs.readFileSync(path.join(root, "marker", "test-marker-recommend.txt"), "utf8");
  const fromReply = extract({ reply_to_user: markerText });
  assert(fromReply.has_sidecar === true, "标识在 reply 里应拆出");
  assert(!fromReply.reply_clean.includes("SIDECAR"), "人话里不得残留标记");
  assert(fromReply.reply_clean.includes("库内轻加工"), "人话应保留推荐文字");
  const envelope = JSON.parse(fromReply.sidecar) as { function_name: string; arguments: string };
  assert(envelope.function_name === "renderA2UI", `function_name=${envelope.function_name}`);
  assert(envelope.arguments.includes("selectOption"), "出口应转成 catalog selectOption");
  assert(!envelope.arguments.includes("clickElement"), "推荐卡不要再用 clickElement");

  const forwarded = emit({ sidecar: fromReply.sidecar });
  assert(forwarded.should_send === true, "拆出的 sidecar 应能发给前端");
  assert(forwarded.function_name === "renderA2UI", `emit function_name=${forwarded.function_name}`);
  assert(forwarded.arguments.includes("selectOption"), "封口节点应原样带上 selectOption");

  const fromHandoff = extract({
    reply_to_user: "建议选择库内轻加工-更换商品条码。",
    handoff_log_markdown: markerText,
  });
  assert(fromHandoff.has_sidecar === true, "标识只在 handoff 里也应拆出");
  assert(fromHandoff.reply_clean === "建议选择库内轻加工-更换商品条码。", "reply 没有标记时不要改人话");

  const empty = extract({ reply_to_user: "你好，帮我看一下增值单" });
  assert(empty.has_sidecar === false, "普通问答不应拆出 sidecar");
  assert(empty.sidecar === "", "普通问答 sidecar 必须是空字符串");
  assert(empty.reply_clean.includes("增值单"), "普通问答人话原样留下");

  const broken = extract({
    reply_to_user: "人话\n\n<!--SIDECAR_BEGIN-->{not json}<!--SIDECAR_END-->",
  });
  assert(broken.has_sidecar === false, "坏 JSON 不得当 sidecar");
  assert(broken.reply_clean === "人话", "坏 JSON 也要从人话里裁掉，避免卖家页露包");

  const selectFixture = JSON.parse(
    fs.readFileSync(path.join(fixtureDir, "sidecar-select-option.json"), "utf8"),
  ) as { arguments: { commands: unknown[] } };
  const selectEmit = emit({ sidecar: selectFixture });
  assert(selectEmit.should_send === true, "selectOption 样例应下发");
  assert(selectEmit.arguments.includes("selectOption"), "selectOption 被吞掉");
  assert(selectEmit.arguments.includes("库内-更换新商品条码"), "原子可见文本应保留");

  console.log("PASS extract-sidecar + selectOption");
  console.log("  reply 带标识 → 人话洗净、sidecar 可转发");
  console.log("  仅 handoff 有标识 → 仍能拆");
  console.log("  普通问答 → sidecar 空");
  console.log("  坏 JSON → 不转发、人话仍裁掉标记");
  console.log("  catalog selectOption 样例可过封口节点");
}

main();
