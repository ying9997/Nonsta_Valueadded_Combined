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
  isAllowedServiceAtom,
  uploadedFilesFromList,
} from "../lib/oms-adapter.ts";
import { main as validateInput } from "../../experts/value-add/nonstandard-sop-guide/nodes/validate-input.ts";
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
assert(builtEmpty!.input.auditFields?.hasRequirementDescription === true, "RD attr present even if short");

assert(
  isAllowedServiceAtom({ serviceCode: "OW01V1654", serviceName: "包裹串仓异常调拨【非标】" }),
  "OW01V1654 atom is allowed",
);
const crossWarehouseTransferDetail: JsonRecord = {
  orderNo: "VASC000000000004",
  listHeader: {
    orderNo: "VASC000000000004",
    businessType: "INBOUND",
    businessTypeDesc: "入库订单",
    businessOrder: { businessNo: "WI50000001" },
    vasc: { productCode: "VASC202411192246131", productName: "入库非标增值（特批）" },
  },
  atoms: [
    {
      serviceCode: "OW01V1654",
      serviceName: "包裹串仓异常调拨【非标】",
      vaAtomAttrs: [
        {
          attributeKey: "DEST_WH",
          attributeName: "目的仓库",
          attributeValue: "DEBR2",
          attributeValueOriginal: "DEBR2",
        },
        {
          attributeKey: "VAS_ATTR_REL_NWEON",
          attributeName: "上架入库单号",
          attributeValue: "WI50000001",
          attributeValueOriginal: "WI50000001",
        },
      ],
      vaAtomFiles: null,
    },
  ],
  events: [{ eventNo: "EB0126100800001", eventName: "包裹串仓" }],
};
const builtCrossWarehouseTransfer = buildAgentInput(crossWarehouseTransferDetail);
assert(builtCrossWarehouseTransfer, "buildAgentInput accepts OW01V1654");
assert(builtCrossWarehouseTransfer!.input.serviceAtom === "OW01V1654", "serviceAtom keeps OW01V1654");
assert(
  builtCrossWarehouseTransfer!.input.customerIntent.includes("目的仓库：DEBR2"),
  "OW01V1654 stitches dest warehouse",
);
assert(
  builtCrossWarehouseTransfer!.input.customerIntent.includes("EB0126100800001"),
  "OW01V1654 stitches event no",
);

assert(
  isAllowedServiceAtom({ serviceCode: "OSF6V1646", serviceName: "货权转移（换标模式）【非标】" }),
  "OSF6V1646 atom is allowed",
);
const ownershipTransferRelabelDetail: JsonRecord = {
  orderNo: "VASC000000448542",
  listHeader: {
    orderNo: "VASC000000448542",
    businessType: "INHOUSE",
    businessTypeDesc: "库内订单",
    businessOrder: { businessNo: "IH000000124041" },
    warehouse: { warehouseCode: "UKGF", warehouseName: "UKGF Warehouse" },
    vasc: { productCode: "VASC202411192250069", productName: "库内非标增值（特批）" },
  },
  atoms: [
    {
      serviceCode: "OSF6V1646",
      serviceName: "货权转移（换标模式）【非标】",
      vaAtomAttrs: [
        { attributeKeyOriginal: "VAS_ATTR_REL_VOIC", attributeName: "增值单品数量", attributeValueOriginal: "50" },
        { attributeKeyOriginal: "OONFRFTS", attributeName: "下架出库单号", attributeValueOriginal: "WO12329778184" },
        { attributeKeyOriginal: "VAS_ATTR_REL_NWEON", attributeName: "上架入库单号", attributeValueOriginal: "WI53210075" },
      ],
      vaAtomFiles: [
        { fileType: "BTBATSPASTC", fileName: "库存转移协议.pdf" },
        { fileType: "VAS_ATTR_REL_TCRBCAL", fileName: "库存转移.xlsx" },
        { fileType: "VAS_ATTR_REL_LF", fileName: "打印单品条码.pdf" },
      ],
    },
  ],
};
const builtOwnershipTransferRelabel = buildAgentInput(ownershipTransferRelabelDetail);
assert(builtOwnershipTransferRelabel, "buildAgentInput accepts OSF6V1646");
assert(builtOwnershipTransferRelabel!.input.serviceAtom === "OSF6V1646", "serviceAtom keeps OSF6V1646");
assert(
  builtOwnershipTransferRelabel!.input.customerIntent.includes("下架出库单号：WO12329778184"),
  "OSF6V1646 stitches outbound order",
);
assert(
  builtOwnershipTransferRelabel!.input.customerIntent.includes("上架入库单号：WI53210075"),
  "OSF6V1646 stitches inbound order",
);
assert(
  builtOwnershipTransferRelabel!.input.pageContext.attachmentStatus["商品和标签的对应关系"] === "uploaded",
  "OSF6V1646 keeps mapping attachment",
);
assert(
  builtOwnershipTransferRelabel!.input.pageContext.attachmentStatus["标签文件"] === "uploaded",
  "OSF6V1646 keeps label attachment",
);
const ownershipTransferRelabelValidate = await validateInput({
  params: builtOwnershipTransferRelabel!.input as unknown as Record<string, unknown>,
});
assert(
  (ownershipTransferRelabelValidate.validationResult as { ok?: boolean }).ok === true,
  `OSF6V1646 must pass validate-input, got ${JSON.stringify(ownershipTransferRelabelValidate.validationResult)}`,
);

const dedicatedNoRd: JsonRecord = {
  orderNo: "VASC000000391074",
  listHeader: {
    orderNo: "VASC000000391074",
    businessType: "INHOUSE",
    vasc: { productCode: "VASC202411192250069", productName: "库内非标增值（特批）" },
  },
  atoms: [
    {
      serviceCode: "OW01V1602",
      serviceName: "入库其他服务需求",
      vaAtomAttrs: [
        { attributeKey: "DEST_WH", attributeName: "目的仓库", attributeValue: "DEBR2", attributeValueOriginal: "DEBR2" },
      ],
    },
  ],
  events: [{ eventNo: "EB0126092000001", eventName: "串仓" }],
};
const builtDedicated = buildAgentInput(dedicatedNoRd);
assert(builtDedicated, "dedicated build");
assert(builtDedicated!.input.auditFields?.hasRequirementDescription === false, "no RD attr → field missing");
assert(builtDedicated!.input.auditFields?.hasRequirementBackground === false, "no BEOR attr");
assert(builtDedicated!.input.customerIntent.includes("目的仓库：DEBR2"), "stitch dest warehouse");
assert(builtDedicated!.input.customerIntent.includes("EB0126092000001"), "stitch exception no");
assert(builtDedicated!.input.customerIntent.includes("串仓"), "stitch exception name");
assert(builtDedicated!.input.providedFields["目的仓库"] === "DEBR2", "providedFields keeps lattice");

const emptyRdWithDest: JsonRecord = {
  orderNo: "VASC000000000003",
  listHeader: { orderNo: "VASC000000000003", vasc: { productCode: "VASC202411192246131" } },
  atoms: [
    {
      serviceCode: "OW01V1602",
      serviceName: "入库其他服务需求",
      vaAtomAttrs: [
        { attributeKey: "VAS_ATTR_REL_RD", attributeName: "需求描述", attributeValue: "", attributeValueOriginal: "" },
        { attributeKey: "DEST_WH", attributeName: "目的仓库", attributeValue: "DEBR2", attributeValueOriginal: "DEBR2" },
      ],
    },
  ],
  events: [{ eventNo: "EB0126092000002", eventName: "串仓" }],
};
const builtEmptyRd = buildAgentInput(emptyRdWithDest);
assert(builtEmptyRd!.input.auditFields?.hasRequirementDescription === true, "empty RD still counts as field present");
assert(!builtEmptyRd!.input.customerIntent.includes("目的仓库"), "do not stitch when RD field exists");
assert(builtEmptyRd!.input.customerIntent === "", "empty RD+BEOR → empty intent");

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
