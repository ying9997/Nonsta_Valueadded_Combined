/**
 * 打两个可导入包：
 * - 工作流 page_link_probe.zip（试运行代码节点）
 * - 对话流 cs_Bot_Client_page_link_probe.zip（跳过 Query，直接读页/出清单卡）
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const codePath = path.join(root, "nodes", "page-link-probe.coze.js");
let code = fs.readFileSync(codePath, "utf8").replace(/\r\n/g, "\n").trimEnd() + "\n";

const indent = (text, n) =>
  text
    .split("\n")
    .map((line) => (line.length ? " ".repeat(n) + line : line))
    .join("\n");

const WF_ID = "7688100110110110110";
const CHAT_ID = "7688200220220220220";

const codeNodeInputs = `        node_inputs:
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
                    ref_node: "100001"`;

const codeNodeOutputs = `        node_outputs:
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
            timeoutMs: 60000`;

const workflowYaml = `schema_version: 1.0.0
name: page_link_probe
id: ${WF_ID}
description: 链路探测。口令「链路测试」出 pageRead；读页 JSON 回来出清单卡。不要覆盖 Bot Client。
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
            user_input:
                type: string
                value: null
                description: 本轮用户话。测第一轮填 链路测试
            dehydrated_dom:
                type: string
                value: null
                description: 前端读页回传 JSON。没有就空；也可整份贴在 user_input
    - id: "110001"
      type: code
      title: page_link_probe
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Code-v2.jpg
      description: 链路测试→pageRead；读页回传→清单卡
      version: v2
      position:
        x: 480
        y: 0
      parameters:
        code: |-
${indent(code, 12)}
        language: 5
${codeNodeInputs}
${codeNodeOutputs}
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

const chatflowYaml = `schema_version: 1.0.0
name: cs_Bot_Client_page_link_probe
id: ${CHAT_ID}
description: "测试对话流：跳过 Query/expert。链路测试→读页；读页回传→清单卡。不要覆盖 cs_Bot_Client_v2p_1。"
mode: chatflow
icon: plugin_icon/chatflow-icon.png
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
            _conversation_id:
                type: string
                value: null
            _user_id:
                type: string
                value: null
            _username:
                type: string
                value: null
            CONVERSATION_NAME:
                type: string
                value: null
                default_value: Default
                description: 本次请求绑定的会话
            USER_INPUT:
                type: string
                value: null
    - id: "110001"
      type: code
      title: page_link_probe
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Code-v2.jpg
      description: 链路测试→pageRead；读页回传→清单卡
      version: v2
      position:
        x: 420
        y: 0
      parameters:
        code: |-
${indent(code, 12)}
        language: 5
        node_inputs:
            - name: user_input
              input:
                type: string
                value:
                    path: USER_INPUT
                    ref_node: "100001"
            - name: dehydrated_dom
              input:
                type: string
                value:
                    path: USER_INPUT
                    ref_node: "100001"
${codeNodeOutputs}
    - id: "110002"
      type: condition
      title: if_should_send
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Condition-v2.jpg
      description: should_send 为真才发页面指令
      position:
        x: 840
        y: 0
      parameters:
        branches:
            - condition:
                conditions:
                    - left:
                        input:
                            value:
                                path: should_send
                                ref_node: "110001"
                      operator: 1
                      right:
                        input:
                            type: boolean
                            value: true
                logic: 2
    - id: "110003"
      type: plugin
      title: tool_call_send_page
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Plugin-v2.jpg
      description: 函数调用（页面 pageRead / renderA2UI）
      position:
        x: 1260
        y: -80
      parameters:
        apiParam:
            - name: apiID
              input:
                type: string
                value: "7473425348437475378"
            - name: apiName
              input:
                type: string
                value: "tool_call_send"
            - name: pluginID
              input:
                type: string
                value: "7473322438084935720"
            - name: pluginName
              input:
                type: string
                value: "cobra_agent_http"
            - name: pluginVersion
              input:
                type: string
                value: "0"
            - name: tips
              input:
                type: string
                value: ""
            - name: outDocLink
              input:
                type: string
                value: ""
        inputDefs:
            - description: 用户名
              input: {}
              name: username
              required: true
              type: string
            - description: 指令参数
              input: {}
              name: arguments
              required: true
              type: string
            - description: 会话ID
              input: {}
              name: conversation_id
              required: true
              type: string
            - description: 函数唯一标识/指令标识
              input: {}
              name: function_name
              required: true
              type: string
            - description: 用户id
              input: {}
              name: user_id
              required: true
              type: string
        node_inputs:
            - name: arguments
              input:
                type: string
                value:
                    path: arguments
                    ref_node: "110001"
            - name: conversation_id
              input:
                type: string
                value:
                    path: _conversation_id
                    source: global_variable_user
            - name: function_name
              input:
                type: string
                value:
                    path: function_name
                    ref_node: "110001"
            - name: user_id
              input:
                type: string
                value:
                    path: _user_id
                    source: global_variable_user
            - name: username
              input:
                type: string
                value:
                    path: _username
                    source: global_variable_user
        node_outputs:
            code:
                type: string
                required: true
                value: null
            data:
                type: string
                required: true
                value: null
            errorBody:
                type: object
                properties:
                    errorCode:
                        type: string
                        value: null
                    errorMessage:
                        type: string
                        value: null
                value: null
            isSuccess:
                type: boolean
                value: null
            msg:
                type: string
                required: true
                value: null
        settingOnError:
            dataOnErr: |-
                {
                    "code": "",
                    "data": "",
                    "msg": ""
                }
            processType: 2
            retryTimes: 0
            switch: true
            timeoutMs: 180000
    - id: "900001"
      type: end
      title: 结束
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-End-v2.jpg
      description: 工作流的最终节点，用于返回工作流运行后的结果信息
      position:
        x: 1680
        y: 0
      parameters:
        terminatePlan: returnVariables
edges:
    - source_node: "100001"
      target_node: "110001"
    - source_node: "110001"
      target_node: "110002"
    - source_node: "110002"
      target_node: "110003"
      source_port: "true"
    - source_node: "110002"
      target_node: "900001"
      source_port: "false"
    - source_node: "110003"
      target_node: "900001"
`;

function writeZip(kind, mainId, mainName, desc, flowMode, yamlName, yamlText, zipName) {
  const layout = path.join(root, "coze-import", `_page_link_${kind}_layout`);
  const inner = path.join(layout, "workflow");
  const innerWf = path.join(inner, "workflow");
  fs.rmSync(layout, { recursive: true, force: true });
  fs.mkdirSync(innerWf, { recursive: true });
  fs.writeFileSync(
    path.join(inner, "MANIFEST.yml"),
    `type: Workflow
version: 1.0.0
main:
    id: ${mainId}
    name: ${mainName}
    desc: ${JSON.stringify(desc)}
    icon: ${flowMode === 3 ? "plugin_icon/chatflow-icon.png" : "plugin_icon/workflow.png"}
    version: ""
    flowMode: ${flowMode}
    commitId: ""
sub: []
`,
    "utf8",
  );
  fs.writeFileSync(path.join(innerWf, yamlName), yamlText, "utf8");
  const zipPath = path.join(root, "coze-import", zipName);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  const zipEsc = zipPath.replace(/'/g, "''");
  const manEsc = path.join(inner, "MANIFEST.yml").replace(/'/g, "''");
  const yamlEsc = path.join(innerWf, yamlName).replace(/'/g, "''");
  const ps1 = path.join(root, "coze-import", `_zip-page-link-${kind}.ps1`);
  fs.writeFileSync(
    ps1,
    `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$dst = '${zipEsc}'
if (Test-Path $dst) { Remove-Item -Force $dst }
$fs = [IO.File]::Open($dst, [IO.FileMode]::Create)
$zip = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create)
function Add-UnixEntry([string]$src, [string]$name) {
  $entry = $zip.CreateEntry($name, [IO.Compression.CompressionLevel]::Optimal)
  $inStream = [IO.File]::OpenRead($src)
  $outStream = $entry.Open()
  $inStream.CopyTo($outStream)
  $outStream.Dispose()
  $inStream.Dispose()
}
Add-UnixEntry '${manEsc}' 'workflow/MANIFEST.yml'
Add-UnixEntry '${yamlEsc}' 'workflow/workflow/${yamlName}'
$zip.Dispose()
$fs.Dispose()
`.trim(),
    "utf8",
  );
  execSync(`powershell -NoProfile -File "${ps1}"`, { stdio: "inherit" });
  fs.unlinkSync(ps1);
  console.log("zip", zipPath);
}

writeZip(
  "wf",
  WF_ID,
  "page_link_probe",
  "链路探测工作流。不要覆盖 Bot Client。",
  0,
  "page_link_probe-draft.yaml",
  workflowYaml,
  "page_link_probe.zip",
);
writeZip(
  "chat",
  CHAT_ID,
  "cs_Bot_Client_page_link_probe",
  "测试对话流：跳过 Query。不要覆盖 cs_Bot_Client_v2p_1。",
  3,
  "cs_Bot_Client_page_link_probe-draft.yaml",
  chatflowYaml,
  "cs_Bot_Client_page_link_probe.zip",
);

const fixture = JSON.parse(
  fs.readFileSync(path.join(root, "fixtures", "turn-dehydrated-dom-list.json"), "utf8"),
);
fs.writeFileSync(
  path.join(root, "coze-import", "测试数据-链路测试.json"),
  JSON.stringify({ user_input: "链路测试", dehydrated_dom: "" }, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(root, "coze-import", "测试数据-读页清单.json"),
  JSON.stringify(
    { user_input: "", dehydrated_dom: JSON.stringify(fixture.dehydrated_dom) },
    null,
    2,
  ),
  "utf8",
);
console.log("test data written");
