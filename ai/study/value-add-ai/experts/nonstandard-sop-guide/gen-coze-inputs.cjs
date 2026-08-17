const fs = require("fs");
const path = require("path");

const simple = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "test-10-cases-simple.json"), "utf8")
);

const out = [
  "# Coze Workflow 试运行输入（10 条）",
  "",
  "在 Coze staging workflow 调试面板粘贴 JSON 逐条测试。",
  "",
];

simple.forEach((c, i) => {
  const cozeInput = {
    _input: {
      customerCode: "EVAL_" + c.case_id,
      customerIntent: c.customer_input,
      customerName: "评测客户",
      inputContext: {},
      inputs: {
        customerIntent: c.customer_input,
        exceptionCode: "",
        exceptionName: "",
        recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
        serviceAtom: "库内其他服务需求",
        providedFields: {},
        enrichedContext: {},
      },
      language: "zh_CN",
      query: c.customer_input,
      username: "eval-test",
    },
  };

  out.push(`## Case ${i + 1} - ${c.scene}`);
  out.push("");
  out.push(`**单号** ${c.case_id}`);
  out.push("");
  out.push("```json");
  out.push(JSON.stringify(cozeInput, null, 2));
  out.push("```");
  out.push("");
  out.push(`**人工SOP（对比用）：**`);
  out.push("```");
  out.push(c.human_sop);
  out.push("```");
  out.push("");
  out.push("---");
  out.push("");
});

const outPath = path.resolve(__dirname, "test-10-cases-coze-input.md");
fs.writeFileSync(outPath, out.join("\n"), "utf8");
console.log("Done:", outPath);
