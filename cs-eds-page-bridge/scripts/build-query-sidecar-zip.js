/**
 * 从 Query F_1 导出做一份带 sidecar 出口的导入包。
 * 保持 F_1 原 id/名称，导入时覆盖副本 F_1（不要覆盖现网 F）。
 * stage_* 赋值改成写死 start/verifying/thinking/answering，避免导入后引用丢失发不了。
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const srcYaml = path.join(
  root,
  "_runs/20260917_marker_test/_unzip/query/Chatflow-cs_Default_Query_v4_staging_F_1-draft-605/workflow/cs_Default_Query_v4_staging_F_1-draft.yaml",
);
const srcManifest = path.join(
  root,
  "_runs/20260917_marker_test/_unzip/query/Chatflow-cs_Default_Query_v4_staging_F_1-draft-605/MANIFEST.yml",
);
const codePath = path.join(root, "nodes", "extract-sidecar.ts");
const outZip = path.join(root, "coze-import", "cs_Default_Query_v4_staging_F_1_sidecar.zip");
const layoutRoot = path.join(root, "coze-import", "_query_sidecar_import_layout");
const layoutInner = path.join(layoutRoot, "workflow");
const layoutWf = path.join(layoutInner, "workflow");
const yamlName = "cs_Default_Query_v4_staging_F_1-draft.yaml";
const extractId = "880001";

if (!fs.existsSync(srcYaml)) throw new Error("找不到 F_1 yaml: " + srcYaml);

let code = fs.readFileSync(codePath, "utf8").replace(/\r\n/g, "\n");
const cut = code.indexOf('\nif (typeof process !== "undefined"');
if (cut >= 0) code = code.slice(0, cut).trimEnd() + "\n";
const indentedCode = code
  .split("\n")
  .map((line) => (line.length ? "            " + line : line))
  .join("\n");

let yaml = fs.readFileSync(srcYaml, "utf8").replace(/\r\n/g, "\n");
const stageAssignRe =
  /            - name: _answer_stage\n              input:\n                value:\n                    path: enum_stages\.(\w+)\n                    ref_node: "167324"/g;
yaml = yaml.replace(
  stageAssignRe,
  `            - name: _answer_stage
              input:
                type: string
                value: "$1"`,
);
yaml = yaml.replace(
  /            - name: arguments\n              input:\n                value:\n                    path: enum_stages\.(\w+)\n                    ref_node: "167324"/g,
  `            - name: arguments
              input:
                type: string
                value: "$1"`,
);
if (yaml.includes("path: enum_stages.") && yaml.includes('name: _answer_stage')) {
  const leftover = yaml.match(/name: _answer_stage[\s\S]{0,120}enum_stages/);
  if (leftover) throw new Error("还有 _answer_stage 在引用 enum_stages: " + leftover[0]);
}

const extractNode = `    - id: "${extractId}"
      type: code
      title: extract_sidecar
      icon: https://lf3-static.bytednsdoc.com/obj/eden-cn/dvsmryvd_avi_dvsm/ljhwZthlaukjlkulzlp/icon/icon-Code-v2.jpg
      description: 从专家草稿拆出 sidecar，人话洗净后交给 A1。不要接到输出节点。
      version: v2
      position:
        x: 9100
        y: 354
      parameters:
        code: |-
${indentedCode}
        language: 5
        node_inputs:
            - name: reply_to_user
              input:
                type: string
                value:
                    path: reply_to_user
                    ref_node: "195168"
            - name: handoff_log_markdown
              input:
                type: string
                value:
                    path: handoff_log_markdown
                    ref_node: "195168"
        node_outputs:
            sidecar:
                type: string
                value: null
            reply_clean:
                type: string
                value: null
            has_sidecar:
                type: boolean
                value: null
        settingOnError:
            processType: 1
            retryTimes: 0
            switch: false
            timeoutMs: 60000
`;

if (yaml.includes(`id: "${extractId}"`)) throw new Error("extract 节点已存在");
if (!yaml.includes("\nedges:\n")) throw new Error("找不到 edges");
yaml = yaml.replace("\nedges:\n", `\n${extractNode}edges:\n`);

yaml = yaml.replace(
  `      parameters:
        terminatePlan: returnVariables
    - id: "109356"`,
  `      parameters:
        terminatePlan: returnVariables
        node_inputs:
            - name: sidecar
              input:
                type: string
                value:
                    path: sidecar
                    ref_node: "${extractId}"
    - id: "109356"`,
);

yaml = yaml.replace(
  `            - name: summary
              input:
                type: string
                value:
                    path: reply_to_user
                    ref_node: "195168"`,
  `            - name: summary
              input:
                type: string
                value:
                    path: reply_clean
                    ref_node: "${extractId}"`,
);

yaml = yaml.replace(
  `    - source_node: "195168"
      target_node: "167993"`,
  `    - source_node: "195168"
      target_node: "${extractId}"
    - source_node: "${extractId}"
      target_node: "167993"`,
);

if (
  !yaml.includes(
    `            - name: summary\n              input:\n                type: string\n                value:\n                    path: reply_clean\n                    ref_node: "${extractId}"`,
  )
) {
  throw new Error("A1 summary 没有改成 extract_sidecar.reply_clean");
}
if (yaml.includes('source_node: "195168"\n      target_node: "167993"')) {
  throw new Error("D → stage_answering 还在，没插进 extract");
}
if (!yaml.includes("title: extract_sidecar")) throw new Error("extract 节点没写进去");
if (!yaml.includes(`ref_node: "${extractId}"`)) throw new Error("结束节点没接到 sidecar");

let manifest = fs.readFileSync(srcManifest, "utf8").replace(/\r\n/g, "\n");
manifest = manifest.replace(
  "v4支持在过程中通过qa-gen的配置召回专家智能体，为solution提供上文，同时在中间过程输出思考和查询过程",
  "sidecar出口：extract_sidecar。stage_* 写死 thinking/verifying。只覆盖 F_1，不要覆盖现网 Query。",
);

fs.rmSync(layoutRoot, { recursive: true, force: true });
fs.mkdirSync(layoutWf, { recursive: true });
fs.writeFileSync(path.join(layoutInner, "MANIFEST.yml"), manifest, "utf8");
fs.writeFileSync(path.join(layoutWf, yamlName), yaml, "utf8");

if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
const zipPs1 = path.join(root, "coze-import", "_zip-query-sidecar.ps1");
const zipEsc = outZip.replace(/'/g, "''");
const manEsc = path.join(layoutInner, "MANIFEST.yml").replace(/'/g, "''");
const yamlEsc = path.join(layoutWf, yamlName).replace(/'/g, "''");
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

const zipSize = fs.statSync(outZip).size;
if (!yaml.includes('value: "thinking"') || !yaml.includes('value: "verifying"')) {
  throw new Error("stage_thinking / stage_verifying 没有写成字面量");
}
console.log("zip", outZip);
console.log("bytes", zipSize);
console.log("overwrite", "cs_Default_Query_v4_staging_F_1 / 7686361673971695625");
console.log("extract_sidecar", extractId);
