/**
 *   npx tsx internal-review-copilot/scripts/test-sales-cs-lookup.ts
 */
import { matchRosterName } from "../lib/sales-cs-lookup.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const roster = [
  { name: "刘勇", openId: "ou_liu" },
  { name: "刘佳", openId: "ou_jia" },
  { name: "刘佳音", openId: "ou_jiayin" },
  { name: "李璐", openId: "" },
].map((item) => ({ name: item.name, openId: item.openId || "ou_x" }));

const liu = matchRosterName("刘勇", roster);
assert(liu.openId === "ou_liu" && liu.name === "刘勇", "exact 刘勇");

const jia = matchRosterName("刘佳", roster);
assert(jia.openId === "ou_jia", "刘佳 exact, not 刘佳音");

const miss = matchRosterName("李璐", [
  { name: "甘海燕", openId: "ou_gan" },
]);
assert(miss.name === "李璐" && miss.openId === null, "missing person keeps name, no ping");

const empty = matchRosterName("", roster);
assert(!empty.openId && !empty.name, "empty query");

console.log("test-sales-cs-lookup ok");

if (process.argv.includes("--live")) {
  const { lookupSalesCs } = await import("../lib/sales-cs-lookup.ts");
  const { loadEnvFiles } = await import("../lib/env.ts");
  loadEnvFiles();
  const found = await lookupSalesCs("19852339");
  if (found.销售.name !== "刘勇" || !found.销售.openId) {
    throw new Error(`live 19852339 expected 刘勇 with open_id, got ${JSON.stringify(found)}`);
  }
  if (found.客服.name !== "许怡引" || !found.客服.openId) {
    throw new Error(`live 19852339 expected 许怡引 with open_id, got ${JSON.stringify(found)}`);
  }
  console.log("live 19852339 ok", found.销售.openId, found.客服.openId);
}
