/**
 * 本地把前端三条链路跑通：pageRead 下发、A2UI 原样转发、DOM 回传不误发。
 * 运行：
 *   cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
 *   npx tsx ..\cs-eds-page-bridge\scripts\test-page-intent-emit.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const nodeFile = path.join(root, "nodes", "page-intent-emit.ts");
const fixtureDir = path.join(root, "fixtures");

type EmitOut = {
  should_send: boolean;
  function_name: string;
  arguments: string;
  skip_reason: string;
  sidecar_intact: boolean;
  turn_kind: string;
};

function run(params: Record<string, unknown>): EmitOut {
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
  return JSON.parse(line) as EmitOut;
}

function loadFixture(name: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8")) as Record<string, unknown>;
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const pageRead = run({ sidecar: loadFixture("sidecar-page-read.json") });
  assert(pageRead.should_send === true, "pageRead 应下发");
  assert(pageRead.function_name === "pageRead", `pageRead function_name=${pageRead.function_name}`);
  assert(pageRead.arguments.includes("eds_value_add_form_need_facts"), "pageRead arguments 被改了");
  assert(pageRead.sidecar_intact === true, "pageRead 应原样");

  const a2uiFixture = loadFixture("sidecar-render-a2ui.json");
  const a2ui = run({ sidecar: a2uiFixture });
  assert(a2ui.should_send === true, "renderA2UI 应下发");
  assert(a2ui.function_name === "renderA2UI", `renderA2UI function_name=${a2ui.function_name}`);
  const outArgs = JSON.parse(a2ui.arguments) as { commands: unknown[] };
  const inArgs = (a2uiFixture.arguments as { commands: unknown[] }).commands;
  assert(JSON.stringify(outArgs.commands) === JSON.stringify(inArgs), "A2UI commands 被改写或吞掉");
  const blob = a2ui.arguments;
  assert(blob.includes("ai-chatbot-builtin"), "缺少 catalogId");
  assert(blob.includes("\"readPage\""), "卡片 action 必须是 catalog 的 readPage");
  assert(blob.includes("\"operatePage\""), "卡片必须带 operatePage");
  assert(!blob.includes("executeJavascript"), "禁止 JS");
  assert(!blob.includes("vas_form_action"), "不得回退旧 schema");

  const bad = run({ sidecar: loadFixture("sidecar-bad-catalog.json") });
  assert(bad.should_send === false, "非法 catalog 不应发给前端");
  assert(bad.skip_reason.includes("catalogId"), `skip_reason=${bad.skip_reason}`);

  const jsPayload = {
    commands: [
      {
        version: "v0.9",
        createSurface: { surfaceId: "x", catalogId: "ai-chatbot-builtin" },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "x",
          components: [
            { id: "root", component: "Card", children: ["btn"] },
            {
              id: "btn",
              component: "Button",
              text: "跑脚本",
              action: {
                event: {
                  name: "operatePage",
                  context: { method: "executeJavascript", args: ["alert(1)"] },
                },
              },
            },
          ],
        },
      },
    ],
  };
  const blocked = run({ sidecar: jsPayload });
  assert(blocked.should_send === false, "executeJavascript 必须拦截");

  const domTurn = loadFixture("turn-dehydrated-dom.json");
  const afterRead = run({
    sidecar: {},
    dehydrated_dom: JSON.stringify(domTurn.dehydrated_dom),
  });
  assert(afterRead.should_send === false, "DOM 回传轮不应再发 pageRead");
  assert(afterRead.turn_kind === "page_read_result", `turn_kind=${afterRead.turn_kind}`);

  const stringPass = run({
    sidecar: {
      function_name: "renderA2UI",
      arguments: JSON.stringify((a2uiFixture as { arguments: unknown }).arguments),
    },
  });
  assert(stringPass.sidecar_intact === true, "arguments 字符串应原样转发");
  assert(stringPass.arguments === JSON.stringify((a2uiFixture as { arguments: unknown }).arguments), "字符串 arguments 被重序列化");

  const fromChat = run({ user_input: JSON.stringify(loadFixture("sidecar-page-read.json")) });
  assert(fromChat.should_send === true, "聊天里贴读页 JSON 应下发");
  assert(fromChat.function_name === "pageRead", `USER_INPUT fallback function_name=${fromChat.function_name}`);

  const normalChat = run({ user_input: "你好，帮我看一下增值单" });
  assert(normalChat.should_send === false, "普通问答不应发插件");
  assert(normalChat.function_name === "", `普通问答 function_name=${normalChat.function_name}`);

  const keywordCard = run({ user_input: "出卡测试" });
  assert(keywordCard.should_send === true, "出卡测试 应下发");
  assert(keywordCard.function_name === "renderA2UI", `出卡测试 function_name=${keywordCard.function_name}`);
  assert(keywordCard.arguments.includes("ai-chatbot-builtin"), "出卡测试 commands 不完整");

  const keywordRead = run({ user_input: "读页测试" });
  assert(keywordRead.should_send === true, "读页测试 应下发");
  assert(keywordRead.function_name === "pageRead", `读页测试 function_name=${keywordRead.function_name}`);

  const clickConfirm = run({
    user_input: "我现在需要执行点击页面第 0 个元素的操作，请确认这个操作是否可以进行？",
  });
  assert(clickConfirm.should_send === false, "确认点击的人话不应当插件");

  const selectFixture = loadFixture("sidecar-select-option.json");
  const selectCard = run({ sidecar: selectFixture });
  assert(selectCard.should_send === true, "selectOption 出卡应下发");
  assert(selectCard.function_name === "renderA2UI", `selectOption function_name=${selectCard.function_name}`);
  assert(selectCard.arguments.includes("selectOption"), "selectOption 被吞掉");
  assert(selectCard.arguments.includes("库内-更换新商品条码"), "原子可见文本应保留");
  assert(selectCard.arguments.includes("\"actions\""), "一组选中应走 catalog actions 批量");

  const markerType = run({
    sidecar: {
      type: "renderA2UI",
      payload: { commands: (selectFixture.arguments as { commands: unknown[] }).commands },
    },
  });
  assert(markerType.should_send === true, "type+payload 标识形状应能转发");
  assert(markerType.arguments.includes("selectOption"), "type+payload 应带上 selectOption");

  console.log("PASS cs-eds-page-bridge frontend tool loop");
  console.log("  pageRead        -> tool_call_send.function_name=pageRead");
  console.log("  renderA2UI      -> commands 与 catalog 示例一致");
  console.log("  selectOption    -> catalog 批量选中可下发");
  console.log("  type+payload    -> Query 出口标识形状可转发");
  console.log("  bad catalog     -> 拒绝下发");
  console.log("  executeJavascript 拦截");
  console.log("  workflow/run DOM -> 不误发 pageRead");
  console.log("  聊天贴 JSON     -> USER_INPUT 可当 sidecar");
  console.log("  普通问答         -> 不发插件");
  console.log("  出卡测试/读页测试 -> 预览短句触发");
}

main();
