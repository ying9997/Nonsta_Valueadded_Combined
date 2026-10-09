/**
 * 用原包 Chatflow-cs_Bot_Client_v2p_1-draft-8069.zip，
 * 在 Query 前面加选择器：链路测试/读页回传跳过 Query，普通客服仍进 Query。
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const originalZip = path.resolve(root, "..", "Chatflow-cs_Bot_Client_v2p_1-draft-8069.zip");
const codePath = path.join(root, "nodes", "page-link-probe.coze.js");
const outDir = path.join(root, "coze-import", "_bot_client_link_src");
const folderName = "Chatflow-cs_Bot_Client_v2p_1-draft-8069";
const zipPath = path.join(root, "coze-import", "cs_Bot_Client_v2p_link.zip");
const NEW_ID = "7688300330330330330";
const NEW_NAME = "cs_Bot_Client_v2p_link";

if (!fs.existsSync(originalZip)) {
  throw new Error("找不到原 Bot Client 导出包: " + originalZip);
}

let code = fs.readFileSync(codePath, "utf8").replace(/\r\n/g, "\n").trimEnd() + "\n";
const indentedCode = code
  .split("\n")
  .map((line) => (line.length ? "            " + line : line))
  .join("\n");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const extractPs1 = path.join(root, "coze-import", "_extract-bot-client-link.ps1");
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

const yamlPath = path.join(outDir, folderName, "workflow", "cs_Bot_Client_v2p_1-draft.yaml");
if (!fs.existsSync(yamlPath)) throw new Error("解压后没有 yaml: " + yamlPath);

let yaml = fs.readFileSync(yamlPath, "utf8").replace(/\r\n/g, "\n");
if (yaml.includes("page_link_probe") || yaml.includes('id: "220001"')) {
  throw new Error("yaml 已经打过 Query 前旁路，不要重复跑");
}

yaml = yaml.replace(/^name: cs_Bot_Client_v2p_1$/m, "name: " + NEW_NAME);
yaml = yaml.replace(/^id: 7685663589169381391$/m, "id: " + NEW_ID);
yaml = yaml.replace(
  'description: "万邑联客服上下文管理\\n-----------\\nv2p更改了输出节点，不在工作流结束时候输出"',
  'description: "Query前选择器：链路测试跳过Query出读页/清单卡。不要覆盖 v2p_1 / v2p_3。"',
);

const newNodes = `    - id: "220001"
      type: code
      title: page_link_probe
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Code-v2.jpg
      description: 链路测试→pageRead；读页回传→清单卡。should_send 为假则进 Query
      version: v2
      position:
        x: 5680
        y: 770
      parameters:
        code: |-
${indentedCode}
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
    - id: "220002"
      type: condition
      title: if_should_send
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Condition-v2.jpg
      description: 真=跳过 Query 发页面指令；否则进 Query
      position:
        x: 5880
        y: 770
      parameters:
        branches:
            - condition:
                conditions:
                    - left:
                        input:
                            value:
                                path: should_send
                                ref_node: "220001"
                      operator: 1
                      right:
                        input:
                            type: boolean
                            value: true
                logic: 2
    - id: "220003"
      type: plugin
      title: tool_call_send_page
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Plugin-v2.jpg
      description: 函数调用（页面 pageRead / renderA2UI）
      position:
        x: 5880
        y: 520
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
                    ref_node: "220001"
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
                    ref_node: "220001"
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
`;

if (!yaml.includes("\nedges:\n")) throw new Error("找不到 edges");
yaml = yaml.replace("\nedges:\n", `\n${newNodes}edges:\n`);

const incoming = (yaml.match(/target_node: "196023"/g) || []).length;
if (incoming !== 3) throw new Error("进 Query 的线不是 3 根，实际 " + incoming);
yaml = yaml.replace(/target_node: "196023"/g, 'target_node: "220001"');

if (!yaml.includes('source_node: "196023"\n      target_node: "900001"')) {
  throw new Error("Query → 结束 不在了，不能改");
}

yaml = yaml.replace(
  `    - source_node: "196023"
      target_node: "900001"
`,
  `    - source_node: "196023"
      target_node: "900001"
    - source_node: "220001"
      target_node: "220002"
    - source_node: "220002"
      target_node: "220003"
      source_port: "true"
    - source_node: "220002"
      target_node: "196023"
      source_port: "false"
    - source_node: "220003"
      target_node: "900001"
`,
);

if ((yaml.match(/target_node: "196023"/g) || []).length !== 1) {
  throw new Error("改完后进 Query 应只剩选择器否则这一根");
}
if (yaml.includes('source_node: "137744"\n      target_node: "196023"')) {
  throw new Error("137744 还直连 Query");
}
if (!yaml.includes("链路测试") || !yaml.includes("page_link_probe")) {
  throw new Error("代码节点没打进去");
}

fs.writeFileSync(yamlPath, yaml, "utf8");

const manifestPath = path.join(outDir, folderName, "MANIFEST.yml");
let manifest = fs.readFileSync(manifestPath, "utf8");
manifest = manifest.replace("id: 7685663589169381391", "id: " + NEW_ID);
manifest = manifest.replace("name: cs_Bot_Client_v2p_1", "name: " + NEW_NAME);
manifest = manifest.replace(
  "v2p更改了输出节点，不在工作流结束时候输出",
  "Query前选择器：链路测试跳过Query。不要覆盖 v2p_1 / v2p_3。",
);
fs.writeFileSync(manifestPath, manifest, "utf8");

const importRoot = path.join(root, "coze-import", "_bot_client_link_import_layout");
const importInner = path.join(importRoot, "workflow");
const importWf = path.join(importInner, "workflow");
fs.rmSync(importRoot, { recursive: true, force: true });
fs.mkdirSync(importWf, { recursive: true });
const importYamlName = "cs_Bot_Client_v2p_link-draft.yaml";
fs.copyFileSync(manifestPath, path.join(importInner, "MANIFEST.yml"));
fs.copyFileSync(yamlPath, path.join(importWf, importYamlName));

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
const zipPs1 = path.join(root, "coze-import", "_zip-bot-client-link.ps1");
const zipEsc = zipPath.replace(/'/g, "''");
const manEsc = path.join(importInner, "MANIFEST.yml").replace(/'/g, "''");
const yamlEsc = path.join(importWf, importYamlName).replace(/'/g, "''");
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
Add-UnixEntry '${yamlEsc}' 'workflow/workflow/${importYamlName}'
$zip.Dispose()
$fs.Dispose()
`.trim(),
  "utf8",
);
execSync(`powershell -NoProfile -File "${zipPs1}"`, { stdio: "inherit" });
fs.unlinkSync(zipPs1);

console.log("zip", zipPath);
console.log("yaml", yamlPath);
