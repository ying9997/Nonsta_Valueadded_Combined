import { isMaskedCustomerName } from "./customer-display.ts";
import type { AgentInput, AttachmentStatus, JsonRecord } from "./types.ts";

export const ATTACHMENT_BY_FILE_TYPE: Record<string, string> = {
  VAS_ATTR_REL_AOOI: "操作说明附件",
  VAS_ATTR_REL_TCRBCAL: "商品和标签的对应关系",
  TRPP: "包裹和标签的对应关系",
  VSS: "视频拍摄SOP（中文+英文）",
  VAS_ATTR_REL_LF: "标签文件",
};

export const ATTACHMENT_WHITELIST = [
  "操作说明附件",
  "商品和标签的对应关系",
  "包裹和标签的对应关系",
  "视频拍摄SOP（中文+英文）",
  "标签文件",
] as const;

/** SKU / 产品编码：如 P-BFG-BL-ADAPTOR、A110RH11 */
const PRODUCT_CODE_IN_NAME = /[A-Za-z][A-Za-z0-9]*[-_][A-Za-z0-9][-_A-Za-z0-9]{2,}/;

export function inferAttachmentLabel(fileName: string, fileType = ""): string {
  const name = asText(fileName);
  const type = asText(fileType);
  if (/对应关系/.test(name)) {
    return /包裹/.test(name) ? "包裹和标签的对应关系" : "商品和标签的对应关系";
  }
  if (/辨识需求提交模板|操作说明|操作流程/.test(name)) return "操作说明附件";
  if (/操作视频|视频拍摄|\.mp4$/i.test(name)) return "视频拍摄SOP（中文+英文）";
  if (/标签/.test(name) || (/\.pdf$/i.test(name) && PRODUCT_CODE_IN_NAME.test(name))) return "标签文件";
  return ATTACHMENT_BY_FILE_TYPE[type] || "";
}

function fileRecords(raw: unknown): JsonRecord[] {
  return asArray(raw)
    .map(asRecord)
    .filter((file) => asText(file.fileName) || asText(file.fileType) || asText(file.url));
}

/** Prefer the current atom; if OMS put files on a sibling atom / header, still pick them up. */
export function collectVaAtomFiles(detail: JsonRecord, atom: JsonRecord): JsonRecord[] {
  const own = fileRecords(atom.vaAtomFiles);
  if (own.length) return own;
  const fromAtoms = asArray(detail.atoms).flatMap((item) => fileRecords(asRecord(item).vaAtomFiles));
  if (fromAtoms.length) return fromAtoms;
  return asArray(asRecord(detail.listHeader).vaAtoms).flatMap((item) => fileRecords(asRecord(item).vaAtomFiles));
}

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function customerNameFromHeader(header: JsonRecord): string {
  const customer = asRecord(header.customer);
  const nested = asText(customer.customerName);
  const flat = asText(header.customerName);
  if (!isMaskedCustomerName(nested)) return nested;
  if (!isMaskedCustomerName(flat)) return flat;
  return nested || flat;
}

export function attrMap(atom: JsonRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of asArray(atom.vaAtomAttrs).map(asRecord)) {
    const key = asText(attr.attributeKeyOriginal) || asText(attr.attributeKey) || asText(attr.attributeName);
    const name = asText(attr.attributeName);
    const value = asText(attr.attributeValueOriginal) || asText(attr.attributeValue) || asText(attr.attributeValueName);
    if (key && value) out[key] = value;
    if (name && value) out[name] = value;
  }
  return out;
}

export function attachmentStatusFromFiles(files: JsonRecord[]): Record<string, AttachmentStatus> {
  const status: Record<string, AttachmentStatus> = {
    操作说明附件: "missing",
    商品和标签的对应关系: "missing",
    包裹和标签的对应关系: "missing",
    "视频拍摄SOP（中文+英文）": "missing",
    标签文件: "missing",
  };
  for (const file of files) {
    const label = inferAttachmentLabel(asText(file.fileName), asText(file.fileType));
    if (label && label in status) status[label] = "uploaded";
  }
  return status;
}

export function attachmentStatus(atom: JsonRecord, detail: JsonRecord = {}): Record<string, AttachmentStatus> {
  return attachmentStatusFromFiles(collectVaAtomFiles(detail, atom));
}

export function uploadedFilesFromList(
  files: JsonRecord[],
): Array<{ fileType: string; fileName: string; label: string }> {
  return files
    .map((file) => {
      const fileName = asText(file.fileName);
      const fileType = asText(file.fileType);
      return {
        fileType,
        fileName,
        label: inferAttachmentLabel(fileName, fileType),
      };
    })
    .filter((file) => file.fileType || file.fileName);
}

export function uploadedFiles(
  atom: JsonRecord,
  detail: JsonRecord = {},
): Array<{ fileType: string; fileName: string; label: string }> {
  return uploadedFilesFromList(collectVaAtomFiles(detail, atom));
}

export function collectOrderNos(detail: JsonRecord, attrs: Record<string, string>): { ebs: string[]; wis: string[] } {
  const header = asRecord(detail.listHeader);
  const businessOrder = asRecord(header.businessOrder);
  const textParts = [
    attrs.VAS_ATTR_REL_RD,
    attrs.BEOR,
    attrs.NSVASTN,
    attrs.VAS_ATTR_REL_NWEON,
    asText(header.orderNo),
    asText(businessOrder.businessNo),
    JSON.stringify(detail.events || []),
    JSON.stringify(businessOrder.childBusinessOrders || []),
  ];
  const blob = textParts.filter(Boolean).join("\n").toUpperCase();
  return {
    ebs: [...new Set(blob.match(/EB\d{6,}/g) || [])],
    wis: [...new Set(blob.match(/WI\d{6,}/g) || [])],
  };
}

export const ALLOWED_SERVICE_CODES = new Set(["OW01V1602", "OSF6V1603", "OSF6V1841"]);

export function isAllowedServiceAtom(atom: JsonRecord): boolean {
  const code = asText(atom.serviceCode);
  const name = asText(atom.serviceName);
  if (ALLOWED_SERVICE_CODES.has(code)) return true;
  return name.includes("入库其他服务需求") || name.includes("库内其他服务需求");
}

export function pickAllowedAtom(detail: JsonRecord): JsonRecord | null {
  const atoms = asArray(detail.atoms).map(asRecord);
  return atoms.find((atom) => isAllowedServiceAtom(atom)) || null;
}

/** @deprecated use pickAllowedAtom — kept for demo builders */
export function pickOw01Atom(detail: JsonRecord): JsonRecord | null {
  return pickAllowedAtom(detail);
}

export function buildAgentInput(detail: JsonRecord): { input: AgentInput; atom: JsonRecord; attrs: Record<string, string> } | null {
  const atom = pickAllowedAtom(detail);
  if (!atom) return null;

  const attrs = attrMap(atom);
  const header = asRecord(detail.listHeader);
  const vasc = asRecord(header.vasc);
  const nos = collectOrderNos(detail, attrs);
  const requirementDescription = attrs.VAS_ATTR_REL_RD || attrs["需求描述"];
  const requirementBackground = attrs.BEOR || attrs["需求背景说明"];
  const customerIntent = [requirementBackground, requirementDescription].filter(Boolean).join("\n");
  const orderNo = asText(detail.orderNo) || asText(header.orderNo);
  const attachments = attachmentStatus(atom, detail);
  const files = uploadedFiles(atom, detail);
  const eventFromList = asArray(detail.events)
    .map(asRecord)
    .map((ev) => asText(ev.eventNo) || asText(ev.businessNo))
    .filter((no) => /^EB/i.test(no));
  const ebs = [...new Set([...nos.ebs, ...eventFromList])];
  const wis = nos.wis;

  const input: AgentInput = {
    mode: "internal_review_copilot",
    vascNo: orderNo,
    query: customerIntent || `待审核增值单 ${orderNo} ${asText(atom.serviceCode) || "OW01V1602"}`,
    customerIntent,
    serviceAtom: asText(atom.serviceCode) || "OW01V1602",
    sceneKey: asText(atom.sceneOverviewCode) === "20250407004" ? "inbound_label_identify" : "",
    sceneName: asText(atom.sceneOverviewName),
    sceneCode: asText(atom.sceneOverviewCode),
    recommendedVasc: {
      vascCode: asText(vasc.productCode) || "VASC202411192246131",
      vascName: asText(vasc.productName) || "入库非标增值（特批）",
    },
    pageContext: {
      entryScene: "INTERNAL_REVIEW",
      vaSource: asText(header.vaSource),
      businessType: asText(header.businessType),
      businessTypeDesc: asText(header.businessTypeDesc),
      warehouseCode: asText(header.warehouseCode),
      warehouseName: asText(header.warehouseName),
      customerCode: asText(header.customerCode) || asText(asRecord(header.customer).customerCode),
      customerName: customerNameFromHeader(header),
      eventNo: ebs[0] || "",
      businessOrderNo: wis[0] || "",
      attachmentStatus: attachments,
    },
    providedFields: {
      BEOR: requirementBackground,
      VAS_ATTR_REL_RD: requirementDescription,
      VAS_ATTR_REL_NWEON: attrs.VAS_ATTR_REL_NWEON || attrs["上架入库单号"],
      NSVASTN: attrs.NSVASTN || attrs["非标增值来源单号"],
    },
    omsFacts: {
      customerRequirementDescription: requirementDescription,
      requirementBackground,
      fieldValues: {
        VAS_ATTR_REL_NWEON: attrs.VAS_ATTR_REL_NWEON || attrs["上架入库单号"],
        NSVASTN: attrs.NSVASTN || attrs["非标增值来源单号"],
      },
      attachmentStatus: attachments,
      uploadedFiles: files,
    },
    responsiblePeople: {
      submittedBy: asText(header.createdby) || asText(header.submitter),
      customerService: [],
      sales: [],
      reviewers: [],
    },
    conversationEvidence: [],
    enrichedContext: {
      orderNo,
      customerCode: asText(header.customerCode) || asText(asRecord(header.customer).customerCode),
      customerName: customerNameFromHeader(header),
      warehouseCode: asText(header.warehouseCode),
      warehouseName: asText(header.warehouseName),
      eventNo: ebs[0] || "",
      businessOrderNo: wis[0] || "",
      allEventNos: ebs,
      allBusinessOrderNos: wis,
      vaSource: asText(header.vaSource),
      businessType: asText(header.businessType),
      businessTypeDesc: asText(header.businessTypeDesc),
      sceneName: asText(atom.sceneOverviewName),
      sceneCode: asText(atom.sceneOverviewCode),
    },
  };

  return { input, atom, attrs };
}
