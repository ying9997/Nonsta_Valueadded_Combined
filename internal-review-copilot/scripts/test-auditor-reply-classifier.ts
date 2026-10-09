/**
 *   npx tsx internal-review-copilot/scripts/test-auditor-reply-classifier.ts
 */
import { classifyAuditorReply, isL1L25OutputPath } from "../lib/auditor-reply-classifier.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const scene = classifyAuditorReply("@增值咨询 这个场景不对，应该是包裹标签上架");
assert(scene.matched && scene.type === "scene_wrong" && scene.repairBucket === "A", "classify scene_wrong");

const missing = classifyAuditorReply("不需要补充对应关系@增值咨询");
assert(missing.matched && missing.type === "missing_rule_wrong" && missing.repairBucket === "B", "classify missing rule");

const facts = classifyAuditorReply("@增值咨询 可以查询客户提供的入库单的SKU以及数量，对应异常的包裹判断具体有几个包裹");
assert(facts.matched && facts.type === "missing_rule_wrong", "classify tool/context fact feedback");

const req = classifyAuditorReply("AI需求理解错了，不是客户这个意思");
assert(req.matched && req.type === "requirement_understanding_wrong" && req.repairBucket === "D", "classify requirement understanding");

const general = classifyAuditorReply("@增值咨询 这个问的问题也不太对");
assert(general.matched && general.type === "requirement_understanding_wrong", "classify question wording");

assert(isL1L25OutputPath("needs_requirement_clarification"), "L1 path");
assert(isL1L25OutputPath("needs_field_clarification"), "L2.5 path");
assert(!isL1L25OutputPath("sop_generated"), "L4 is not clarification path");

console.log("test-auditor-reply-classifier: ok");
