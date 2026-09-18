/**
 * OMS adapter: vaAtomFiles → attachmentStatus / uploadedFiles.
 *
 *   npx tsx internal-review-copilot/scripts/test-oms-adapter.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachmentStatusFromFiles,
  buildAgentInput,
  inferAttachmentLabel,
  uploadedFilesFromList,
} from "../lib/oms-adapter.ts";
import type { JsonRecord } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const files366432: JsonRecord[] = [
  { fileName: "上架前辨识需求提交模板.xlsx" },
  { fileName: "取出适配器配件操作流程.docx" },
  { fileName: "取出适配器配件操作视频.mp4" },
  { fileName: "P-BFG-BL-ADAPTOR.pdf" },
];

assert(inferAttachmentLabel("上架前辨识需求提交模板.xlsx") === "操作说明附件", "模板→操作说明");
assert(inferAttachmentLabel("取出适配器配件操作流程.docx") === "操作说明附件", "操作流程→操作说明");
assert(inferAttachmentLabel("取出适配器配件操作视频.mp4") === "视频拍摄SOP（中文+英文）", "操作视频→视频");
assert(inferAttachmentLabel("P-BFG-BL-ADAPTOR.pdf") === "标签文件", "产品码.pdf→标签");
assert(inferAttachmentLabel("商品和标签的对应关系.xlsx") === "商品和标签的对应关系", "对应关系→商品");
assert(inferAttachmentLabel("包裹和标签的对应关系.xlsx") === "包裹和标签的对应关系", "对应关系→包裹");
assert(inferAttachmentLabel("unknown.bin", "VAS_ATTR_REL_LF") === "标签文件", "fileType fallback");

const status = attachmentStatusFromFiles(files366432);
assert(status["操作说明附件"] === "uploaded", "操作说明 uploaded");
assert(status["标签文件"] === "uploaded", "标签 uploaded");
assert(status["视频拍摄SOP（中文+英文）"] === "uploaded", "视频 uploaded");
assert(status["商品和标签的对应关系"] === "missing", "对应关系 still missing");

const listed = uploadedFilesFromList(files366432);
assert(listed.length === 4, "uploadedFiles has 4 names");
assert(listed.map((f) => f.fileName).join("|").includes("P-BFG-BL-ADAPTOR.pdf"), "names kept");

const siblingDetail: JsonRecord = {
  orderNo: "VASC000000000001",
  listHeader: {
    orderNo: "VASC000000000001",
    vaAtoms: [{ serviceCode: "OW01V1602", vaAtomFiles: null }],
  },
  atoms: [
    {
      serviceCode: "OW01V1602",
      serviceName: "入库其他服务需求",
      vaAtomAttrs: [{ attributeKeyOriginal: "VAS_ATTR_REL_RD", attributeValueOriginal: "取出配件后贴标上架" }],
      vaAtomFiles: files366432,
    },
  ],
};
const builtSibling = buildAgentInput(siblingDetail);
assert(builtSibling, "buildAgentInput ok");
assert(builtSibling!.input.pageContext.attachmentStatus["标签文件"] === "uploaded", "pageContext.attachmentStatus not empty");
assert(builtSibling!.input.omsFacts.uploadedFiles.length === 4, "omsFacts.uploadedFiles filled");

const headerOnly: JsonRecord = {
  orderNo: "VASC000000000002",
  listHeader: {
    orderNo: "VASC000000000002",
    vaAtoms: [
      {
        serviceCode: "OW01V1602",
        serviceName: "入库其他服务需求",
        vaAtomFiles: null,
      },
    ],
  },
  atoms: [
    {
      serviceCode: "OW01V1602",
      serviceName: "入库其他服务需求",
      vaAtomAttrs: [{ attributeKeyOriginal: "VAS_ATTR_REL_RD", attributeValueOriginal: "取出配件" }],
      vaAtomFiles: null,
    },
  ],
};
const builtEmpty = buildAgentInput(headerOnly);
assert(builtEmpty, "empty files still builds");
assert(builtEmpty!.input.pageContext.attachmentStatus["标签文件"] === "missing", "no files → missing not null");
assert(builtEmpty!.input.omsFacts.uploadedFiles.length === 0, "no files → empty list");

const here = dirname(fileURLToPath(import.meta.url));
const livePath = resolve(here, "../../_runs/20260915_e2e_rerun/VASC000000366432.input.json");
if (existsSync(livePath)) {
  const detail = JSON.parse(readFileSync(livePath, "utf8")) as JsonRecord;
  const built = buildAgentInput(detail);
  assert(built, "366432 buildAgentInput");
  const st = built!.input.pageContext.attachmentStatus;
  const files = built!.input.omsFacts.uploadedFiles;
  assert(st && typeof st === "object", "366432 attachmentStatus is object");
  assert(st["操作说明附件"] === "uploaded", "366432 操作说明 uploaded");
  assert(st["标签文件"] === "uploaded", "366432 标签 uploaded");
  assert(st["视频拍摄SOP（中文+英文）"] === "uploaded", "366432 视频 uploaded");
  assert(files.length >= 4, "366432 uploadedFiles has names");
  assert(files.some((f) => /P-BFG-BL-ADAPTOR/i.test(f.fileName)), "366432 pdf name present");
  console.log("366432 live fixture ok", st, files.map((f) => f.fileName));
}

console.log("test-oms-adapter ok");
