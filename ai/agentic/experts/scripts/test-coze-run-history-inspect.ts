import * as assert from "assert";
import {
  extractValueAddExpertIds,
  parseCozeDebugUrl,
  parseCozeWorkflowUrl,
  summarizeRunHistoryResponse,
} from "./coze-run-history-inspect-lib";

const parsed = parseCozeWorkflowUrl(
  "https://www.coze.cn/work_flow?space_id=7417755373999767571&workflow_id=7656801894035914792&node_id=142330&version=Bot_7498200020837040179_Publish_7657189010989940771&execute_id=7657391087573139507&sub_execute_id=832903749"
);

assert.deepStrictEqual(parsed, {
  apiWorkflowId: "7498200020837040179",
  pageWorkflowId: "7656801894035914792",
  publishId: "7657189010989940771",
  executeId: "7657391087573139507",
  nodeId: "142330",
  subExecuteId: "832903749",
});

assert.deepStrictEqual(
  parseCozeDebugUrl(
    "https://www.coze.cn/work_flow?execute_id=7657391087573139507&space_id=7417755373999767571&workflow_id=7498200020837040179&execute_mode=2"
  ),
  {
    executeId: "7657391087573139507",
    workflowId: "7498200020837040179",
    spaceId: "7417755373999767571",
  }
);

assert.deepStrictEqual(
  extractValueAddExpertIds({
    handoff_log_json: JSON.stringify({
      sessionHandoff_summary: [
        { expertId: "inbound-order-status" },
        { expertId: "value-add-exception-diagnosis" },
        { expertId: "value-add-product-recommendation" },
      ],
    }),
    finalText: "handoff to value-add-service-config if a VASC is selected",
  }),
  [
    "value-add-exception-diagnosis",
    "value-add-product-recommendation",
    "value-add-service-config",
  ]
);

const summary = summarizeRunHistoryResponse(
  {
    code: 0,
    data: [
      {
        execute_id: "7657391087573139507",
        execute_status: "Success",
        create_time: 1782875300,
        update_time: 1782875353,
        output: JSON.stringify({
          outputContext: { expertId: "value-add-order-status" },
        }),
        usage: { token_count: 100 },
        debug_url: "https://www.coze.cn/work_flow?execute_id=7657391087573139507",
      },
    ],
  },
  parsed
);

assert.strictEqual(summary.apiCode, 0);
assert.strictEqual(summary.records.length, 1);
assert.deepStrictEqual(summary.debugUrls, ["https://www.coze.cn/work_flow?execute_id=7657391087573139507"]);
assert.deepStrictEqual(summary.calledValueAddExpertIds, ["value-add-order-status"]);
assert.strictEqual(summary.records[0]?.executeStatus, "Success");
assert.strictEqual(summary.records[0]?.debugUrlPresent, true);
assert.strictEqual(summary.records[0]?.debugUrl, "https://www.coze.cn/work_flow?execute_id=7657391087573139507");

console.log("coze-run-history-inspect tests passed");
