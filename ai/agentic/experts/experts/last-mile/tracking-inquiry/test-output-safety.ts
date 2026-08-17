import { execFileSync } from "child_process";
import * as path from "path";

const root = path.resolve(__dirname, "../../..");
const tsNode = require.resolve("ts-node/dist/bin.js");
const tsconfig = path.join(root, "scripts", "tsconfig.json");

function runNode(file: string, params: Record<string, unknown>): Record<string, unknown> {
  const stdout = execFileSync(
    process.execPath,
    [tsNode, "-P", tsconfig, path.join(__dirname, file), JSON.stringify(params)],
    { encoding: "utf8" }
  );
  return JSON.parse(stdout) as Record<string, unknown>;
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const unsafeAnalysis =
  "暂未收到供应商反馈，我们会持续跟进核实，有结果后第一时间同步，请您耐心等待。";
const formatted = runNode("nodes/format-output.ts", {
  analysisResult: {
    structured: { nextAction: "我们会在获取结果后第一时间同步。" },
    analysis: unsafeAnalysis,
  },
  tailTraceFacts: {
    listStatus: "success",
    primarySerialNumber: "TA260730222",
    primaryCheckingStatus: "WCR",
    primaryCheckingType: "FR",
    sopBranch: "supplement_wcr",
    applicationTimeLocal: "2026-07-30 11:37:49",
    analysisTimeLocal: "2026-08-04 16:36:37",
    elapsedBizDays: 3,
    records: [
      {
        serialNumber: "TA260730222",
        orderNo: "WO12104288037",
        trackingNo: "LF974517817DE",
        checkingStatus: "WCR",
        checkingType: "FR",
        applicationTime: 1785382669000,
        acceptTime: 1785396753000,
        raw: {
          consigneePhone: "secret-phone",
          consigneeStreeOne: "secret-address",
          emails: "secret@example.com",
          accepterName: "internal-user",
          goodsName: "private-goods",
        },
      },
    ],
  },
  checkingTypeRecommendation: {
    recommendedCheckingType: "FR",
    recommendedCheckingTypeName: "退回原因",
    classificationConfidence: "high",
    classificationReason: "关联退货单事实明确标记派送失败退回，应查询退回或派送失败原因",
  },
  inputContext: { chainId: "test-return-chain-001" },
});

const structured = formatted.structured as Record<string, unknown>;
const records = structured.records as Array<Record<string, unknown>>;
assert(records.length === 1, "应保留最小必要查件记录");
assert(!("rawRecord" in records[0]!), "不得输出 rawRecord");
assert(!JSON.stringify(formatted).includes("secret-phone"), "不得泄露收件人联系方式");
assert(!JSON.stringify(formatted).includes("secret@example.com"), "不得泄露客户邮箱");
assert(String(formatted.analysis).includes("当前接口暂未返回可对客说明的具体退回原因"), "WCR 空结果应使用确定性安全话术");
assert(!String(formatted.analysis).includes("供应商反馈"), "不得推断供应商是否反馈");
assert(!String(formatted.analysis).includes("第一时间同步"), "不得承诺主动同步");
assert(!String(formatted.analysis).includes("持续跟进"), "不得承诺持续跟进");
assert(structured.nextAction === "请后续关注或查询该查件单的处理进度。", "nextAction 应改为主动查询指引");
assert((formatted.outputContext as Record<string, unknown>).chainId === "test-return-chain-001", "应保留 chainId");

const fetched = runNode("nodes/fetch-tail-trace-list.ts", {
  branch: "query",
  inquiryIds: ["TA260730222"],
  winitRequestData: "{}",
  winitOpenapiData: JSON.stringify({
    content: [
      {
        serialNumber: "TA260730222",
        orderNo: "WO12104288037",
        trackingNo: "LF974517817DE",
        checkingStatus: "WCR",
        checkingType: "FR",
        consigneePhone: "secret-phone",
        emails: "secret@example.com",
        accepterName: "internal-user",
      },
    ],
  }),
  analysisClock: { utcIso: "2026-08-04T08:36:37.000Z" },
});
assert(!JSON.stringify(fetched).includes("secret-phone"), "事实节点不得向 LLM 透传收件人联系方式");
assert(!JSON.stringify(fetched).includes("secret@example.com"), "事实节点不得向 LLM 透传客户邮箱");

process.stdout.write("tracking-inquiry output safety: OK\n");
