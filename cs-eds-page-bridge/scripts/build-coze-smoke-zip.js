const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const codePath = path.join(root, "nodes", "page-intent-emit.ts");
let code = fs.readFileSync(codePath, "utf8").replace(/\r\n/g, "\n");
const cut = code.indexOf('\nif (typeof process !== "undefined"');
if (cut >= 0) code = code.slice(0, cut).trimEnd() + "\n";

const indent = (text, n) =>
  text
    .split("\n")
    .map((line) => (line.length ? " ".repeat(n) + line : line))
    .join("\n");

const yaml = `schema_version: 1.0.0
name: page_intent_emit_smoke
id: 7621923795871957099
description: 阶段一只测 page_intent_emit 代码节点。不要覆盖 Bot Client。
mode: workflow
icon: plugin_icon/workflow.png
nodes:
    - id: "100001"
      type: start
      title: 开始
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Start-v2.jpg
      description: 工作流的起始节点，用于设定启动工作流需要的信息
      position:
        x: 0
        y: 0
      parameters:
        node_outputs:
            sidecar:
                type: string
                value: null
                description: 页面指令 JSON 字符串
            user_input:
                type: string
                value: null
            dehydrated_dom:
                type: string
                value: null
    - id: "110001"
      type: code
      title: page_intent_emit
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Code-v2.jpg
      description: 把 sidecar 转成 function_name 与 arguments
      version: v2
      position:
        x: 480
        y: 0
      parameters:
        code: |-
${indent(code, 12)}
        language: 5
        node_inputs:
            - name: sidecar
              input:
                type: string
                value:
                    path: sidecar
                    ref_node: "100001"
            - name: user_input
              input:
                type: string
                value:
                    path: user_input
                    ref_node: "100001"
            - name: dehydrated_dom
              input:
                type: string
                value:
                    path: dehydrated_dom
                    ref_node: "100001"
        node_outputs:
            should_send:
                type: boolean
                value: null
            function_name:
                type: string
                value: null
            arguments:
                type: string
                value: null
            skip_reason:
                type: string
                value: null
            sidecar_intact:
                type: boolean
                value: null
            turn_kind:
                type: string
                value: null
        settingOnError:
            processType: 1
            retryTimes: 0
            switch: false
            timeoutMs: 60000
    - id: "900001"
      type: end
      title: 结束
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-End-v2.jpg
      description: 工作流的最终节点，用于返回工作流运行后的结果信息
      position:
        x: 960
        y: 0
      parameters:
        terminatePlan: returnVariables
        node_inputs:
            - name: should_send
              input:
                type: boolean
                value:
                    path: should_send
                    ref_node: "110001"
            - name: function_name
              input:
                type: string
                value:
                    path: function_name
                    ref_node: "110001"
            - name: arguments
              input:
                type: string
                value:
                    path: arguments
                    ref_node: "110001"
            - name: skip_reason
              input:
                type: string
                value:
                    path: skip_reason
                    ref_node: "110001"
            - name: sidecar_intact
              input:
                type: boolean
                value:
                    path: sidecar_intact
                    ref_node: "110001"
            - name: turn_kind
              input:
                type: string
                value:
                    path: turn_kind
                    ref_node: "110001"
edges:
    - source_node: "100001"
      target_node: "110001"
    - source_node: "110001"
      target_node: "900001"
`;

const zipSrc = path.join(root, "coze-import", "_zip_src");
const inner = path.join(zipSrc, "workflow");
const innerWf = path.join(inner, "workflow");
fs.rmSync(zipSrc, { recursive: true, force: true });
fs.mkdirSync(innerWf, { recursive: true });
fs.writeFileSync(
  path.join(inner, "MANIFEST.yml"),
  `type: Workflow
version: 1.0.0
main:
    id: 7621923795871957099
    name: page_intent_emit_smoke
    desc: 阶段一只测 page_intent_emit 代码节点。不要覆盖 Bot Client。
    icon: plugin_icon/workflow.png
    version: ""
    flowMode: 0
    commitId: ""
sub: []
`,
  "utf8",
);
fs.writeFileSync(path.join(innerWf, "page_intent_emit_smoke-draft.yaml"), yaml, "utf8");

const zipPath = path.join(root, "coze-import", "page_intent_emit_smoke.zip");
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
const zipSrcEsc = zipSrc.replace(/'/g, "''");
const zipPathEsc = zipPath.replace(/'/g, "''");
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${zipSrcEsc}\\workflow' -DestinationPath '${zipPathEsc}'"`,
  { stdio: "inherit" },
);
const outCard = JSON.parse(
  fs.readFileSync(path.join(root, "fixtures", "coze-test-this-node.json"), "utf8"),
);
fs.writeFileSync(
  path.join(root, "coze-import", "测试数据-出卡.json"),
  JSON.stringify({ sidecar: JSON.stringify(outCard.sidecar) }, null, 2),
  "utf8",
);
const pageRead = JSON.parse(
  fs.readFileSync(path.join(root, "fixtures", "sidecar-page-read.json"), "utf8"),
);
fs.writeFileSync(
  path.join(root, "coze-import", "测试数据-读页.json"),
  JSON.stringify({ sidecar: JSON.stringify(pageRead) }, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(root, "coze-import", "测试数据-空.json"),
  JSON.stringify({ sidecar: "{}" }, null, 2),
  "utf8",
);
console.log("zip", zipPath);
