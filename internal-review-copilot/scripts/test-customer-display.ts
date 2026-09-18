/**
 * Smoke: group cards never print starred / 脱敏 customer names.
 *
 *   npx tsx internal-review-copilot/scripts/test-customer-display.ts
 */
import {
  formatCustomerLabel,
  isMaskedCustomerName,
  unmaskStarsInJson,
  visibleCustomerName,
} from "../lib/customer-display.ts";
import { applyCustomerName } from "../lib/oms-customer.ts";
import { customerNameFromHeader } from "../lib/oms-adapter.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(isMaskedCustomerName("***************"), "stars are masked");
assert(isMaskedCustomerName("＊＊＊"), "fullwidth stars are masked");
assert(isMaskedCustomerName("××科技有限公司（脱敏）"), "脱敏 marker is masked");
assert(!isMaskedCustomerName("××科技有限公司"), "generic xx name is not masked");
assert(!isMaskedCustomerName("RED NOW LIMITED"), "real name is visible");
assert(visibleCustomerName("***************") === "", "stars become empty");
assert(formatCustomerLabel("19104098", "***************") === "19104098", "label keeps code only");
assert(formatCustomerLabel("19104098", "RED NOW LIMITED") === "19104098 / RED NOW LIMITED", "label keeps real name");
assert(formatCustomerLabel("", "") === "未填写", "empty label");

const detail = {
  orderNo: "VASC000000342198",
  listHeader: { customerCode: "19104098", customerName: "***************", customer: { customerCode: "19104098", customerName: "***************" } },
};
assert(isMaskedCustomerName(customerNameFromHeader(detail.listHeader)), "header still masked before apply");
applyCustomerName(detail, "RED NOW LIMITED");
assert(customerNameFromHeader(detail.listHeader) === "RED NOW LIMITED", "apply writes real name");

const card = { header: { title: { content: "客户：19104098 / ***************" } } };
assert(unmaskStarsInJson(card, "RED NOW LIMITED").header.title.content.includes("RED NOW LIMITED"), "replay unmasks lastCard");
assert(!unmaskStarsInJson(card, "RED NOW LIMITED").header.title.content.includes("*"), "replay removes stars");

console.log("test-customer-display ok");
