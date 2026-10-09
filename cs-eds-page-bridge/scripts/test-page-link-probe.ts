/**
 * 链路探测节点：强制唤起异常单问句 / 链路测试 → pageRead；DOM 回传 → 清单卡。
 *   cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
 *   npx tsx ..\cs-eds-page-bridge\scripts\test-page-link-probe.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const nodeFile = path.join(root, "nodes", "page-link-probe.ts");

type Out = {
  should_send: boolean;
  function_name: string;
  arguments: string;
  skip_reason: string;
  turn_kind: string;
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
  const link = run({ user_input: "链路测试" });
  assert(link.should_send === true, "链路测试应下发");
  assert(link.function_name === "pageRead", `function_name=${link.function_name}`);
  assert(link.arguments.includes("link_probe_need_interactive_list"), "pageRead reason 不对");
  assert(!link.arguments.includes("operatePage"), "第一轮不该点页");

  const sameWire = run({ user_input: "链路测试", dehydrated_dom: "链路测试" });
  assert(sameWire.function_name === "pageRead", "USER_INPUT 和 dehydrated_dom 同字时仍应读页");

  const fixture = JSON.parse(
    fs.readFileSync(path.join(root, "fixtures", "turn-dehydrated-dom-list.json"), "utf8"),
  );
  const listed = run({
    user_input: JSON.stringify(fixture),
  });
  assert(listed.should_send === true, "读页回传应出卡");
  assert(listed.function_name === "renderA2UI", `list function_name=${listed.function_name}`);
  assert(listed.arguments.includes("读页清单"), "应出清单卡标题");
  assert(listed.arguments.includes("原单上架"), "清单应列出原单上架");
  assert(listed.arguments.includes("入库其他服务需求"), "清单应列出入库其他服务需求");
  assert(listed.arguments.includes("interactiveElements"), "应标出字段名");
  assert(!listed.arguments.includes("operatePage"), "清单卡先不点页");
  assert(!listed.arguments.includes("selectOption"), "清单卡不要带选中动作");

  const nested = run({ dehydrated_dom: JSON.stringify(fixture.dehydrated_dom) });
  assert(nested.function_name === "renderA2UI", "dehydrated_dom 字段也应出清单");
  assert(nested.arguments.includes("#0  原单上架"), `编号行不对: ${nested.arguments.slice(0, 400)}`);

  const hello = run({ user_input: "你好" });
  assert(hello.should_send === false, "普通问答不应发插件");

  const forced = run({ user_input: "我的异常单EB0126092143应该提交哪个增值产品？" });
  assert(forced.should_send === true, "强制唤起问句应下发");
  assert(forced.function_name === "pageRead", `forced function_name=${forced.function_name}`);
  assert(forced.arguments.includes("EB0126092143"), "应抽出异常单号");
  assert(forced.arguments.includes("forced_exception_ask"), "reason 应对强制唤起");

  const spaced = run({ user_input: "我的异常单 EB0126092143 应该提交哪个增值产品" });
  assert(spaced.should_send === true, "带空格也应命中");
  assert(spaced.arguments.includes("EB0126092143"), "带空格也应抽出单号");

  const noEb = run({ user_input: "我的异常单应该提交哪个增值产品？" });
  assert(noEb.should_send === false, "没有单号不要抢 expert");

  const oldAsk = run({ user_input: "我的异常单EB0126092112345678怎么处理" });
  assert(oldAsk.should_send === false, "旧「怎么处理」句不再调工具");

  const otherAsk = run({ user_input: "这个异常单EB0126092143应该提交哪个增值产品" });
  assert(otherAsk.should_send === false, "不是强制唤起那句，走 expert");

  const altIndex = run({
    user_input: JSON.stringify({
      interactiveElements: [{ dom_id: "el-9", name: "原单上架" }],
      browserState: true,
    }),
  });
  assert(altIndex.arguments.includes("#el-9  原单上架"), "应能读到 dom_id 别名");

  console.log("PASS page-link-probe");
  console.log("  强制唤起 / 链路测试 -> pageRead");
  console.log("  DOM 回传 -> 读页清单卡（无 operatePage）");
  console.log("  普通问答 -> 不发，进 Query");
}

main();
