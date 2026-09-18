/**
 * JSON-ish parse: valid payloads with Chinese curly quotes must not be rewritten.
 *
 *   npx tsx internal-review-copilot/scripts/test-jsonish.ts
 */
import { parseJsonishObject, sanitizeJsonish } from "../lib/llm-client.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const sceneName = "【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架";
const sopJson = JSON.stringify(
  {
    sopText: "x",
    requirementBackground: "y",
    requirementDescription: "客户被登记为“商品有条码但无法扫描”",
    warehouseSop: "w",
    scenarioName: sceneName,
    fieldsUsed: ["a"],
  },
  null,
  2,
);

try {
  JSON.parse(sanitizeJsonish(sopJson));
  throw new Error("sanitize-first should still break inner curly quotes");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  assert(/Expected ',' or '}' after property value/.test(msg), `unexpected sanitize error: ${msg}`);
}

const parsed = parseJsonishObject(sopJson) as { scenarioName?: string; requirementDescription?: string };
assert(parsed.scenarioName === sceneName, "scene name curly quotes must survive");
assert(
  parsed.requirementDescription?.includes("“商品有条码但无法扫描”") === true,
  "description curly quotes must survive",
);

const trailing = parseJsonishObject('{"sopText":"ok","scenarioName":"x",}');
assert((trailing as { sopText?: string }).sopText === "ok", "trailing comma fallback");

const curlyDelims = parseJsonishObject("{ “sopText”: “ok”, “scenarioName”: “简单场景” }");
assert((curlyDelims as { sopText?: string }).sopText === "ok", "curly delimiters fallback");

const brokenAscii = `{
  "sopText": "x",
  "requirementBackground": "y",
  "requirementDescription": "z",
  "warehouseSop": "w",
  "scenarioName": "【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架",
  "fieldsUsed": ["a"]
}`;
try {
  JSON.parse(brokenAscii);
  throw new Error("unescaped ASCII scene quotes should be invalid JSON");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  assert(/Expected ',' or '}' after property value/.test(msg), `unexpected raw error: ${msg}`);
}
const repaired = parseJsonishObject(brokenAscii) as { scenarioName?: string };
assert(
  repaired.scenarioName === "【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架",
  "unescaped ASCII scene quotes must be repaired",
);

console.log("test-jsonish ok");
