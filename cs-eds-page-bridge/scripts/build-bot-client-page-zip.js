/**
 * 在 cs_Bot_Client_v2p_1 导出包上，只改 Query → 结束 这一条线：
 * Query → page_intent_emit → if_should_send →（真）tool_call_send_page → 结束
 * 新增数据 → 结束 不动。
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const originalZip = path.resolve(
  root,
  "..",
  "Chatflow-cs_Bot_Client_v2p_1-draft-8069.zip",
);
const codePath = path.join(root, "nodes", "page-intent-emit.ts");
const outDir = path.join(root, "coze-import", "_bot_client_src");
const folderName = "Chatflow-cs_Bot_Client_v2p_1-draft-8069";
const zipPath = path.join(root, "coze-import", "cs_Bot_Client_v2p_1-page-bridge.zip");

if (!fs.existsSync(originalZip)) {
  throw new Error("找不到原 Bot Client 导出包: " + originalZip);
}

let code = fs.readFileSync(codePath, "utf8").replace(/\r\n/g, "\n");
const cut = code.indexOf('\nif (typeof process !== "undefined"');
if (cut >= 0) code = code.slice(0, cut).trimEnd() + "\n";
const indentedCode = code
  .split("\n")
  .map((line) => (line.length ? "            " + line : line))
  .join("\n");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const extractPs1 = path.join(root, "coze-import", "_extract-bot-client.ps1");
fs.writeFileSync(
  extractPs1,
  [
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    `[IO.Compression.ZipFile]::ExtractToDirectory('${originalZip.replace(/'/g, "''")}', '${outDir.replace(/'/g, "''")}')`,
  ].join("\n"),
  "utf8",
);
execSync(`powershell -NoProfile -File "${extractPs1}"`, { stdio: "inherit" });
fs.unlinkSync(extractPs1);

const yamlPath = path.join(
  outDir,
  folderName,
  "workflow",
  "cs_Bot_Client_v2p_1-draft.yaml",
);
if (!fs.existsSync(yamlPath)) {
  throw new Error("解压后没有 yaml: " + yamlPath);
}

let yaml = fs.readFileSync(yamlPath, "utf8").replace(/\r\n/g, "\n");

const sidecarField = `            sidecar:
                type: string
                value: null
                description: 页面指令 JSON 字符串，可空；试运行可把出卡/读页 JSON 放这里
`;
if (!yaml.includes("\n            sidecar:\n")) {
  yaml = yaml.replace(
    `            USER_INPUT:
                type: string
                value: null
`,
    `            USER_INPUT:
                type: string
                value: null
${sidecarField}`,
  );
}

yaml = yaml.replace(
      `      position:
        x: 6748.898065096925
        y: 839.2285141907943
      parameters:
        terminatePlan: returnVariables`,
  `      position:
        x: 8040
        y: 770
      parameters:
        terminatePlan: returnVariables`,
);

const newNodes = `    - id: "210001"
      type: code
      title: page_intent_emit
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Code-v2.jpg
      description: 把 sidecar 转成 function_name 与 arguments，供 tool_call_send 使用
      version: v2
      position:
        x: 6600
        y: 770
      parameters:
        code: |-
${indentedCode}
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
                    path: USER_INPUT
                    ref_node: "100001"
            - name: dehydrated_dom
              input:
                type: string
                value:
                    path: USER_INPUT
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
    - id: "210002"
      type: condition
      title: if_should_send
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Condition-v2.jpg
      description: should_send 为真才发页面指令；普通问答走否则直接结束
      position:
        x: 7080
        y: 770
      parameters:
        branches:
            - condition:
                conditions:
                    - left:
                        input:
                            value:
                                path: should_send
                                ref_node: "210001"
                      operator: 1
                      right:
                        input:
                            type: boolean
                            value: true
                logic: 2
    - id: "210003"
      type: plugin
      title: tool_call_send_page
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Plugin-v2.jpg
      description: 函数调用（页面 pageRead / renderA2UI）
      position:
        x: 7560
        y: 620
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
                    ref_node: "210001"
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
                    ref_node: "210001"
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
                description: 0表示请求成功 1表示请求失败
            data:
                type: string
                required: true
                value: null
                description: 当出现错误时候，返回错误码对应的说明信息，请求正常，则返回业务数据json对象，具体看接口的返回参数定义
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
                description: '当出现错误时候，会返回错误码，正常不返回 '
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
`;

if (!yaml.includes('id: "210001"')) {
  yaml = yaml.replace("\nedges:\n", `\n${newNodes}edges:\n`);
}

yaml = yaml.replace(
  `    - source_node: "196023"
      target_node: "900001"
`,
  `    - source_node: "196023"
      target_node: "210001"
    - source_node: "210001"
      target_node: "210002"
    - source_node: "210002"
      target_node: "210003"
      source_port: "true"
    - source_node: "210002"
      target_node: "900001"
      source_port: "false"
    - source_node: "210003"
      target_node: "900001"
`,
);

if (yaml.includes('source_node: "196023"\n      target_node: "900001"')) {
  throw new Error("Query → 结束 还在，替换失败");
}
if (!yaml.includes("tool_call_send_page")) {
  throw new Error("插件节点没写进去");
}

fs.writeFileSync(yamlPath, yaml, "utf8");

const manifestPath = path.join(outDir, folderName, "MANIFEST.yml");
let manifest = fs.readFileSync(manifestPath, "utf8");
if (!manifest.includes("page_intent_emit")) {
  manifest = manifest.replace(
    "v2p更改了输出节点，不在工作流结束时候输出",
    "v2p更改了输出节点，不在工作流结束时候输出\n        page: Query后接 page_intent_emit + tool_call_send",
  );
  fs.writeFileSync(manifestPath, manifest, "utf8");
}

const importRoot = path.join(root, "coze-import", "_bot_client_import_layout");
const importInner = path.join(importRoot, "workflow");
const importWf = path.join(importInner, "workflow");
fs.rmSync(importRoot, { recursive: true, force: true });
fs.mkdirSync(importWf, { recursive: true });
fs.copyFileSync(manifestPath, path.join(importInner, "MANIFEST.yml"));
fs.copyFileSync(yamlPath, path.join(importWf, "cs_Bot_Client_v2p_1-draft.yaml"));

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
const zipPs1 = path.join(root, "coze-import", "_zip-bot-client.ps1");
const zipEsc = zipPath.replace(/'/g, "''");
const manEsc = path.join(importInner, "MANIFEST.yml").replace(/'/g, "''");
const yamlEsc = path.join(importWf, "cs_Bot_Client_v2p_1-draft.yaml").replace(/'/g, "''");
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
Add-UnixEntry '${yamlEsc}' 'workflow/workflow/cs_Bot_Client_v2p_1-draft.yaml'
$zip.Dispose()
$fs.Dispose()
`.trim(),
  "utf8",
);
execSync(`powershell -NoProfile -File "${zipPs1}"`, { stdio: "inherit" });
fs.unlinkSync(zipPs1);

console.log("zip", zipPath);
console.log("yaml", yamlPath);
