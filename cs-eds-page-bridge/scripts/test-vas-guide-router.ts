/**
 * vas-guide-router：强制唤起 → greeting；普通问句 → guide；DOM → page_tool。
 *   cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
 *   npx tsx ../cs-eds-page-bridge/scripts/test-vas-guide-router.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const nodeFile = path.join(root, "nodes", "vas-guide-router.ts");

type Out = {
  route: string;
  event_no: string;
  user_input: string;
  greeting_text: string;
  vas_session: string;
  should_send: boolean;
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
  const forced = run({ user_input: "我的异常单EB0126092143应该提交哪个增值产品" });
  assert(forced.route === "greeting", `forced route=${forced.route}`);
  assert(forced.event_no === "EB0126092143", `forced event_no=${forced.event_no}`);
  assert(forced.should_send === false, "greeting 不应发插件");
  assert(forced.greeting_text.includes("EB0126092143"), "开场应带异常单号");
  assert(forced.greeting_text.includes("请用您自己的话描述一下"), "开场话术不对");

  const qmark = run({ user_input: "我的异常单EB0126092143应该提交哪个增值产品？" });
  assert(qmark.route === "greeting", `qmark route=${qmark.route}`);
  assert(qmark.event_no === "EB0126092143", `qmark event_no=${qmark.event_no}`);

  const link = run({ user_input: "链路测试" });
  assert(link.route === "greeting", `link route=${link.route}`);
  assert(link.event_no === "", `link event_no=${link.event_no}`);
  assert(link.should_send === false, "链路测试 V1 走开场，不读页");

  const guide = run({ user_input: "帮我辨识后换标上架到新入库单WI50259337" });
  assert(guide.route === "guide", `guide route=${guide.route}`);
  assert(guide.event_no === "", `guide event_no=${guide.event_no}`);
  assert(guide.should_send === false, "guide 不应发插件");

  const hello = run({ user_input: "你好" });
  assert(hello.route === "query", `hello route=${hello.route}`);
  assert(hello.vas_session === "0", "打招呼应关掉增值会话");

  const freight = run({ user_input: "帮我查一下运费" });
  assert(freight.route === "query", `freight route=${freight.route}`);

  const screenshot = run({ user_input: "我要把这个包裹上架到入库单 WI88930505" });
  assert(screenshot.route === "guide", `screenshot route=${screenshot.route}`);
  assert(screenshot.vas_session === "1", "增值问句应打开会话");

  const follow = run({ user_input: "商品条码异常（需客户处理）", _vas_guide_active: "1" });
  assert(follow.route === "guide", `follow route=${follow.route}`);

  const lookupInSession = run({ user_input: "你可以查信息", _vas_guide_active: "1" });
  assert(lookupInSession.route === "guide", "会话中的短句仍走指引");

  const lookupNoSession = run({ user_input: "你可以查信息" });
  assert(lookupNoSession.route === "query", "无会话的「查信息」走 Query");

  const bye = run({ user_input: "退出", _vas_guide_active: "1" });
  assert(bye.route === "query", `bye route=${bye.route}`);
  assert(bye.vas_session === "0", "退出应关掉增值会话");

  const fixture = JSON.parse(
    fs.readFileSync(path.join(root, "fixtures", "turn-dehydrated-dom-list.json"), "utf8"),
  );
  const listed = run({ user_input: JSON.stringify(fixture) });
  assert(listed.route === "page_tool", `dom route=${listed.route}`);
  assert(listed.event_no === "", `dom event_no=${listed.event_no}`);
  assert(listed.should_send === true, "读页回传应出卡");
  assert(listed.function_name === "renderA2UI", `list function_name=${listed.function_name}`);
  assert(listed.arguments.includes("读页清单"), "应出清单卡标题");
  assert(!listed.arguments.includes("operatePage"), "清单卡先不点页");

  const nested = run({ dehydrated_dom: JSON.stringify(fixture.dehydrated_dom) });
  assert(nested.route === "page_tool", "dehydrated_dom 字段也应出清单");
  assert(nested.arguments.includes("#0  原单上架"), `编号行不对: ${nested.arguments.slice(0, 400)}`);

  const oldAsk = run({ user_input: "我的异常单EB0126092112345678怎么处理" });
  assert(oldAsk.route === "guide", "旧「怎么处理」句走 guide，不再当触发");

  console.log("PASS vas-guide-router");
  console.log("  强制唤起 / 链路测试 -> greeting");
  console.log("  增值问句 / 会话短句 -> guide");
  console.log("  你好 / 运费 / 退出 -> query");
  console.log("  DOM 回传 -> page_tool 清单卡");
}

main();
