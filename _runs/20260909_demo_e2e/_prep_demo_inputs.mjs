import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../..");
const src = resolve(projectRoot, "_runs/20260909_p3_eval/t14-golden-details.json");
const out = resolve(here, "demo-inputs.json");

const wanted = {
  VASC000000315774: {
    demoLabel: "L4-SOP生成",
    expectedOutputPath: "sop_generated",
    source: "demo_constructed",
    constructLabelFile: true,
  },
  VASC000000298617: {
    demoLabel: "L3-追问缺附件",
    expectedOutputPath: "needs_field_clarification",
    source: "demo_constructed",
    constructLabelFile: false,
    stripOperationGuide: true,
    demoSceneKey: "inbound_photo_hold",
    demoRequiredFieldKeys: ["VAS_ATTR_REL_AOOI"],
  },
  VASC000000326061: {
    demoLabel: "L2-转人工",
    expectedOutputPath: "transfer_human",
    source: "t14_golden",
    constructLabelFile: false,
  },
};

function flattenHeader(header) {
  if (!header || typeof header !== "object") return header;
  const wh = header.warehouse && typeof header.warehouse === "object" ? header.warehouse : {};
  const cust = header.customer && typeof header.customer === "object" ? header.customer : {};
  if (!header.warehouseCode) header.warehouseCode = wh.warehouseCode || "";
  if (!header.warehouseName) header.warehouseName = wh.warehouseName || "";
  if (!header.customerCode) header.customerCode = cust.customerCode || header.customerCode || "";
  if (!header.customerName) header.customerName = cust.customerName || header.customerName || "";
  return header;
}

const raw = JSON.parse(readFileSync(src, "utf8"));
const byNo = new Map(raw.map((item) => [item.orderNo, item]));
const details = [];
for (const [orderNo, meta] of Object.entries(wanted)) {
  const found = byNo.get(orderNo);
  if (!found) throw new Error(`missing ${orderNo}`);
  const item = structuredClone(found);
  item.demoLabel = meta.demoLabel;
  item.expectedOutputPath = meta.expectedOutputPath;
  item.source = meta.source;
  flattenHeader(item.listHeader || {});
  if (meta.demoSceneKey) item.demoSceneKey = meta.demoSceneKey;
  if (meta.demoRequiredFieldKeys) item.demoRequiredFieldKeys = meta.demoRequiredFieldKeys;
  const atoms = Array.isArray(item.atoms) ? item.atoms : [];
  const atom =
    atoms.find(
      (a) => a?.serviceCode === "OW01V1602" || String(a?.serviceName || "").includes("入库其他服务需求"),
    ) || atoms[0];
  if (meta.constructLabelFile) {
    if (!atom) throw new Error(`${orderNo} has no atom`);
    const files = Array.isArray(atom.vaAtomFiles) ? [...atom.vaAtomFiles] : [];
    if (!files.some((f) => f?.fileType === "VAS_ATTR_REL_LF")) {
      files.push({
        fileType: "VAS_ATTR_REL_LF",
        fileName: "demo_constructed_label_file.pdf",
        note: "demo_constructed: 原单标签文件 missing，构造为 uploaded 以便演示 L4",
      });
      atom.vaAtomFiles = files;
    }
    item._demoConstruction = {
      field: "标签文件",
      from: "missing",
      to: "uploaded",
      method: "append VAS_ATTR_REL_LF to vaAtomFiles",
    };
  }
  if (meta.stripOperationGuide) {
    if (!atom) throw new Error(`${orderNo} has no atom`);
    const files = Array.isArray(atom.vaAtomFiles) ? [...atom.vaAtomFiles] : [];
    atom.vaAtomFiles = files.filter((f) => f?.fileType !== "VAS_ATTR_REL_AOOI");
    item._demoConstruction = {
      field: "操作说明附件",
      from: "uploaded",
      to: "missing",
      method: "remove VAS_ATTR_REL_AOOI from vaAtomFiles; demoRequiredFieldKeys=VAS_ATTR_REL_AOOI（场景卡 requiredFieldKeys 为空，仅本 demo 进程内门禁）",
    };
  }
  details.push(item);
}

mkdirSync(here, { recursive: true });
writeFileSync(
  out,
  `${JSON.stringify(
    {
      sourceFile: src,
      note: "315774 构造标签文件 uploaded 以演示 L4；298617 去掉操作说明并加 demo 附件门禁以演示 L3；326061 保持金标原样。",
      details,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

for (const d of details) {
  const atoms = Array.isArray(d.atoms) ? d.atoms : [];
  const atom = atoms.find((a) => a?.serviceCode === "OW01V1602") || atoms[0] || {};
  const files = (atom.vaAtomFiles || []).map((f) => `${f.fileType}:${f.fileName}`);
  console.log(d.orderNo, d.demoLabel, d.source, "files=", files.join(" | "));
}
console.log("wrote", out);
