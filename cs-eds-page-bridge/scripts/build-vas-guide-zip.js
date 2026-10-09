/**
 * 把 9189 试验画布打成 VAS 指引版 zip（覆盖导入，不新建）。
 *   node scripts/build-vas-guide-zip.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const srcZip = path.resolve(root, "..", "Chatflow-cs_Bot_Client_v2p_link-draft-9189.zip");
const srcDir = path.join(root, "coze-import", "_vas_guide_src");
const folderName = "Chatflow-cs_Bot_Client_v2p_link-draft-9189";
const yamlName = "cs_Bot_Client_v2p_link-draft.yaml";
const yamlPath = path.join(srcDir, folderName, "workflow", yamlName);
const manifestPath = path.join(srcDir, folderName, "MANIFEST.yml");
const zipPath = path.join(root, "coze-import", "cs_Bot_Client_v2p_link_vas.zip");
const importRoot = path.join(root, "coze-import", "_vas_guide_import_layout");

function yamlLiteral(text, indent) {
  const pad = " ".repeat(indent);
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\s+$/, "")
    .split("\n")
    .map((line) => (line.length ? pad + line : ""))
    .join("\n");
}

function readText(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
}

function systemPromptBody() {
  const raw = readText("prompts/vas-guide-system.md");
  const idx = raw.indexOf("## Section 1:");
  return (idx >= 0 ? raw.slice(idx) : raw).trim() + "\n";
}

function textNode(id, title, x, y, body) {
  return `    - id: "${id}"
      type: text
      title: ${title}
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-StrConcat-v2.jpg
      description: "VAS 指引知识库，注入 LLM 系统提示"
      position:
        x: ${x}
        y: ${y}
      parameters:
        concatParams:
            - name: concatResult
              input:
                type: string
                value: |-
${yamlLiteral(body, 20)}
            - name: arrayItemConcatChar
              input:
                type: string
                value: ""
        method: concat
        node_outputs:
            output:
                type: string
                required: true
                value: null
`;
}

if (!fs.existsSync(srcZip)) throw new Error("找不到 9189 原包: " + srcZip);
fs.rmSync(srcDir, { recursive: true, force: true });
fs.mkdirSync(srcDir, { recursive: true });
execSync(`tar -xf "${srcZip}" -C "${srcDir}"`, { stdio: "inherit" });
if (!fs.existsSync(yamlPath)) throw new Error("解压后没有 yaml: " + yamlPath);

let yaml = fs.readFileSync(yamlPath, "utf8").replace(/\r\n/g, "\n");
if (!yaml.includes('id: 7687981752618582066')) throw new Error("不是 v2p_link 画布");
if (!yaml.includes('workflowId: "7681286672969678888"')) throw new Error("Query 子流程 id 变了，停");
if (!yaml.includes('id: "220001"') || !yaml.includes('id: "220002"')) {
  throw new Error("找不到 page_link_probe / if_should_send");
}

const routerJs = readText("nodes/vas-guide-router.coze.js").trimEnd() + "\n";
const formatJs = readText("nodes/vas-output-format.coze.js").trimEnd() + "\n";
const sceneKb = readText("prompts/vas-guide-kb-scenes.md");
const flowKb = readText("prompts/vas-guide-kb-flow-context.md");
const rulesKb = readText("prompts/vas-guide-kb-rules.md");
const sysPrompt = systemPromptBody();

const routerNode = `    - id: "220001"
      type: code
      title: vas_guide_router
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Code-v2.jpg
      description: "触发句→greeting；增值问句→guide；其它→Query；DOM→page_tool"
      version: v2
      position:
        x: 6124.0302076578955
        y: 1126.453315490075
      parameters:
        code: |
${yamlLiteral(routerJs, 12)}
        language: 5
        node_inputs:
            - name: user_input
              input:
                value:
                    path: USER_INPUT
                    ref_node: "100001"
            - name: dehydrated_dom
              input:
                value:
                    path: USER_INPUT
                    ref_node: "100001"
            - name: _conversation_id
              input:
                type: string
                value:
                    path: _conversation_id
                    source: global_variable_user
            - name: _user_id
              input:
                type: string
                value:
                    path: _user_id
                    source: global_variable_user
            - name: _username
              input:
                type: string
                value:
                    path: _username
                    source: global_variable_user
            - name: _customer_code
              input:
                type: string
                value:
                    path: _customer_code
                    source: global_variable_user
            - name: _vas_guide_active
              input:
                type: string
                value:
                    path: _vas_guide_active
                    source: global_variable_user
        node_outputs:
            arguments:
                type: string
                value: null
            conversation_id:
                type: string
                value: null
            customer_code:
                type: string
                value: null
            event_no:
                type: string
                value: null
            function_name:
                type: string
                value: null
            greeting_text:
                type: string
                value: null
            route:
                type: string
                value: null
            should_send:
                type: boolean
                value: null
            sidecar_intact:
                type: boolean
                value: null
            skip_reason:
                type: string
                value: null
            turn_kind:
                type: string
                value: null
            user_id:
                type: string
                value: null
            user_input:
                type: string
                value: null
            username:
                type: string
                value: null
            vas_session:
                type: string
                value: null
        settingOnError:
            processType: 1
            retryTimes: 0
            switch: false
            timeoutMs: 60000
`;

const switchNode = `    - id: "220002"
      type: condition
      title: route_switch
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Condition-v2.jpg
      description: "greeting开场 / guide LLM / page_tool插件 / 否则Query"
      position:
        x: 6234.916878785376
        y: 758.5364367046986
      parameters:
        branches:
            - condition:
                conditions:
                    - left:
                        input:
                            value:
                                path: route
                                ref_node: "220001"
                      operator: 7
                      right:
                        input:
                            type: string
                            value: greeting
                logic: 2
            - condition:
                conditions:
                    - left:
                        input:
                            value:
                                path: route
                                ref_node: "220001"
                      operator: 7
                      right:
                        input:
                            type: string
                            value: guide
                logic: 2
            - condition:
                conditions:
                    - left:
                        input:
                            value:
                                path: route
                                ref_node: "220001"
                      operator: 7
                      right:
                        input:
                            type: string
                            value: page_tool
                logic: 2
`;

const extraNodes = `    - id: "230050"
      type: assign_variable
      title: assign_vas_session
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/Variable.jpg
      description: "记住是否在增值指引会话中，供下一轮路由"
      position:
        x: 6180
        y: 940
      parameters:
        node_inputs:
            - name: _vas_guide_active
              input:
                type: string
                value:
                    path: vas_session
                    ref_node: "220001"
        node_outputs:
            isSuccess:
                type: boolean
                value: null
        variableTypeMap:
            _vas_guide_active: global_variable_user
${textNode("230001", "scene_kb", 6720, 1650, sceneKb)}${textNode("230002", "flow_context_kb", 6980, 1650, flowKb)}${textNode("230003", "inference_rules_kb", 7240, 1650, rulesKb)}    - id: "230010"
      type: llm
      title: vas_guide_llm
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-LLM-v2.jpg
      description: "VAS 指引：识别场景、追问、生成需求描述。JSON Mode"
      version: "3"
      position:
        x: 7500
        y: 1650
      parameters:
        fcParamVar:
            knowledgeFCParam: {}
        llmParam:
            - name: generationDiversity
              input:
                type: string
                value: balance
            - name: apiMode
              input:
                type: integer
                value: "0"
            - name: frequencyPenalty
              input:
                type: float
                value: "0"
            - name: maxTokens
              input:
                type: integer
                value: "4096"
            - name: spCurrentTime
              input:
                type: boolean
                value: false
            - name: spAntiLeak
              input:
                type: boolean
                value: false
            - name: thinkingType
              input:
                type: string
                value: disabled
            - name: responseFormat
              input:
                type: integer
                value: "2"
            - name: modelName
              input:
                type: string
                value: 豆包·2.0·pro
            - name: modelType
              input:
                type: integer
                value: "1772700462"
            - name: parameters
              input:
                type: object
                properties:
                    max_completion_tokens:
                        type: integer
                        value: "0"
                    reasoning_effort:
                        type: string
                        value: minimal
                value: null
            - name: prompt
              input:
                type: string
                value: '{{user_input}}'
            - name: enableChatHistory
              input:
                type: boolean
                value: true
            - name: chatHistoryRound
              input:
                type: integer
                value: "10"
            - name: systemPrompt
              input:
                type: string
                value: |-
${yamlLiteral(sysPrompt, 20)}
            - name: stableSystemPrompt
              input:
                type: string
                value: ""
            - name: canContinue
              input:
                type: boolean
                value: false
            - name: loopPromptVersion
              input:
                type: string
                value: ""
            - name: loopPromptName
              input:
                type: string
                value: ""
            - name: loopPromptId
              input:
                type: string
                value: ""
        node_inputs:
            - name: user_input
              input:
                type: string
                value:
                    path: user_input
                    ref_node: "220001"
            - name: event_no
              input:
                type: string
                value:
                    path: event_no
                    ref_node: "220001"
            - name: scene_kb
              input:
                type: string
                value:
                    path: output
                    ref_node: "230001"
            - name: flow_context_kb
              input:
                type: string
                value:
                    path: output
                    ref_node: "230002"
            - name: inference_rules_kb
              input:
                type: string
                value:
                    path: output
                    ref_node: "230003"
        node_outputs:
            output:
                type: string
                value: null
            reasoning_content:
                type: string
                value: null
        settingOnError:
            processType: 1
            retryTimes: 0
            switch: false
            timeoutMs: 180000
    - id: "230020"
      type: code
      title: vas_output_format
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Code-v2.jpg
      description: "解析指引 JSON，抽出客户可见回复。V1 不调工具"
      version: v2
      position:
        x: 7760
        y: 1650
      parameters:
        code: |
${yamlLiteral(formatJs, 12)}
        language: 5
        node_inputs:
            - name: llm_output
              input:
                type: string
                value:
                    path: output
                    ref_node: "230010"
        node_outputs:
            arguments:
                type: string
                value: null
            customer_reply:
                type: string
                value: null
            function_name:
                type: string
                value: null
            should_send_tool:
                type: boolean
                value: null
        settingOnError:
            processType: 1
            retryTimes: 0
            switch: false
            timeoutMs: 60000
    - id: "230030"
      type: output
      title: 输出_greeting
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Output-v2.jpg
      description: "节点从“消息”更名为“输出”，支持中间过程的消息输出，支持流式和非流式两种方式"
      position:
        x: 6720
        y: 400
      parameters:
        callTransferVoice: true
        chatHistoryWriting: historyWrite
        content:
            type: string
            value:
                content: '{{greeting_text}}'
                type: literal
        node_inputs:
            - name: greeting_text
              input:
                type: string
                value:
                    path: greeting_text
                    ref_node: "220001"
        streamingOutput: true
    - id: "230040"
      type: output
      title: 输出_guide
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Output-v2.jpg
      description: "节点从“消息”更名为“输出”，支持中间过程的消息输出，支持流式和非流式两种方式"
      position:
        x: 8020
        y: 1650
      parameters:
        callTransferVoice: true
        chatHistoryWriting: historyWrite
        content:
            type: string
            value:
                content: '{{customer_reply}}'
                type: literal
        node_inputs:
            - name: customer_reply
              input:
                type: string
                value:
                    path: customer_reply
                    ref_node: "230020"
        streamingOutput: true
`;

const i220001 = yaml.indexOf('    - id: "220001"');
const i220002 = yaml.indexOf('    - id: "220002"');
const i171037 = yaml.indexOf('    - id: "171037"');
if (i220001 < 0 || i220002 < 0 || i171037 < 0 || !(i220001 < i220002 && i220002 < i171037)) {
  throw new Error("节点顺序不是 220001 → 220002 → 171037");
}
yaml = yaml.slice(0, i220001) + routerNode + switchNode + yaml.slice(i171037);

if (!yaml.includes("\nedges:\n")) throw new Error("找不到 edges");
yaml = yaml.replace("\nedges:\n", `\n${extraNodes}edges:\n`);

yaml = yaml.replace(
  `    - source_node: "220001"
      target_node: "220002"`,
  `    - source_node: "220001"
      target_node: "230050"
    - source_node: "230050"
      target_node: "220002"`,
);

const oldTrue = `    - source_node: "220002"
      target_node: "171037"
      source_port: "true"`;
const oldFalse = `    - source_node: "220002"
      target_node: "196023"
      source_port: "false"`;
if (!yaml.includes(oldTrue) || !yaml.includes(oldFalse)) {
  throw new Error("选择器原来的真/假线对不上，停");
}

yaml = yaml.replace(
  oldTrue,
  `    - source_node: "220002"
      target_node: "230030"
      source_port: "true"
    - source_node: "220002"
      target_node: "230001"
      source_port: true_1
    - source_node: "220002"
      target_node: "171037"
      source_port: true_2`,
);
yaml = yaml.replace(
  oldFalse,
  `    - source_node: "220002"
      target_node: "196023"
      source_port: "false"
    - source_node: "230001"
      target_node: "230002"
    - source_node: "230002"
      target_node: "230003"
    - source_node: "230003"
      target_node: "230010"
    - source_node: "230010"
      target_node: "230020"
    - source_node: "230020"
      target_node: "230040"
    - source_node: "230040"
      target_node: "900001"
    - source_node: "230030"
      target_node: "900001"`,
);

if (yaml.includes("page_link_probe")) throw new Error("还留着 page_link_probe 标题");
if (!yaml.includes("vas_guide_router")) throw new Error("router 没打进去");
if (!yaml.includes("vas_guide_llm")) throw new Error("LLM 没打进去");
if (!yaml.includes("输出_greeting") || !yaml.includes("输出_guide")) throw new Error("输出节点没打进去");
if (!yaml.includes("route_switch")) throw new Error("选择器没改名");
if (!yaml.includes("assign_vas_session")) throw new Error("会话变量赋值没打进去");
if (!yaml.includes('source_node: "230050"')) throw new Error("router 没有接到 assign");
if ((yaml.match(/workflowId: "7681286672969678888"/g) || []).length !== 1) {
  throw new Error("Query 子流程引用异常");
}
if (!yaml.includes('source_node: "188998"\n      target_node: "900001"')) {
  throw new Error("绑用户结束线丢了");
}
if (!yaml.includes("terminatePlan: returnVariables")) {
  throw new Error("结束节点结构变了");
}

yaml = yaml.replace(
  /Query前选择器：链路测试跳过Query。不要覆盖 v2p_1 \/ v2p_3。/,
  "VAS指引+Query：触发句开场，增值问句进指引，其它走线上Query。覆盖本画布，不要覆盖现网v2p。",
);

fs.writeFileSync(yamlPath, yaml, "utf8");

let manifest = fs.readFileSync(manifestPath, "utf8");
manifest = manifest.replace(
  /Query前选择器：链路测试跳过Query。不要覆盖 v2p_1 \/ v2p_3。/,
  "VAS指引+Query：触发句开场，增值问句进指引，其它走线上Query。覆盖本画布，不要覆盖现网v2p。",
);
fs.writeFileSync(manifestPath, manifest, "utf8");

const importInner = path.join(importRoot, "workflow");
const importWf = path.join(importInner, "workflow");
fs.rmSync(importRoot, { recursive: true, force: true });
fs.mkdirSync(importWf, { recursive: true });
fs.copyFileSync(manifestPath, path.join(importInner, "MANIFEST.yml"));
fs.copyFileSync(yamlPath, path.join(importWf, yamlName));

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
const zipPs1 = path.join(root, "coze-import", "_zip-vas-guide.ps1");
const zipEsc = zipPath.replace(/'/g, "''");
const manEsc = path.join(importInner, "MANIFEST.yml").replace(/'/g, "''");
const yamlEsc = path.join(importWf, yamlName).replace(/'/g, "''");
fs.writeFileSync(
  zipPs1,
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
execSync(`powershell -NoProfile -File "${zipPs1}"`, { stdio: "inherit" });
fs.unlinkSync(zipPs1);

const st = fs.statSync(zipPath);
console.log("zip", zipPath);
console.log("bytes", st.size);
console.log("yaml", yamlPath);
