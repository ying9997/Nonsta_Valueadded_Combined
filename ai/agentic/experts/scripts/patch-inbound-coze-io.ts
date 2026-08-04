/**
 * 为 inbound 专家 workflow.json 节点补充 cozeIo.outputs（export:coze 必需）
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..", "experts");

const TYPE_MAP: Record<string, Record<string, unknown>> = {
  wiOrderNos: { type: "array", items: { type: "string" } },
  customerRefNos: { type: "array", items: { type: "string" } },
  inboundOrderNos: { type: "array", items: { type: "string" } },
  errorCode: { type: "string" },
  skipApi: { type: "boolean" },
  lookupMeta: { type: "object", additionalProperties: true },
  actions: { type: "array", items: { type: "object", additionalProperties: true } },
  actionPlans: { type: "array", items: { type: "object", additionalProperties: true } },
  winitPluginBatchActionsCount: { type: "integer" },
  actionName: { type: "string" },
  rawOrderData: { type: "object", additionalProperties: true },
  prunedOrderData: { type: "object", additionalProperties: true },
  _pruneMeta: { type: "object", additionalProperties: true },
  statusLexicon: { type: "string" },
  fieldGuide: { type: "string" },
  errorCodeKb: { type: "string" },
  validationOk: { type: "boolean" },
  valid: { type: "boolean" },
  error: { type: "string" },
  intent: { type: "string" },
  routePath: { type: "string" },
  pathType: { type: "string" },
  kbContent: { type: "string" },
  kbScope: { type: "string" },
  analysisResult: { type: "object", additionalProperties: true },
  result: { type: "object", additionalProperties: true },
  structured: { type: "object", additionalProperties: true },
  analysis: { type: "string" },
  outputContext: { type: "object", additionalProperties: true },
  tmsDataAvailable: { type: "boolean" },
  wmsDataAvailable: { type: "boolean" },
  umsDataAvailable: { type: "boolean" },
  umsAvailable: { type: "boolean" },
  dataSource: { type: "string" },
  discrepancyReport: { type: "object", additionalProperties: true },
  exceptionList: { type: "object", additionalProperties: true },
  mergedProducts: { type: "object", additionalProperties: true },
  arrivalFacts: { type: "object", additionalProperties: true },
  putawayProgress: { type: "object", additionalProperties: true },
  slaEvaluation: { type: "object", additionalProperties: true },
  tsFacts: { type: "object", additionalProperties: true },
  customsFacts: { type: "object", additionalProperties: true },
  overseasPhase: { type: "object", additionalProperties: true },
  operability: { type: "object", additionalProperties: true },
  quotaSnapshot: { type: "object", additionalProperties: true },
  warehouseLoadHint: { type: "string" },
  bookingList: { type: "object", additionalProperties: true },
  bitableGap: { type: "object", additionalProperties: true },
  country: { type: "string" },
  warehouseCode: { type: "string" },
  checkType: { type: "string" },
  inspectionMode: { type: "string" },
  subTopic: { type: "string" },
  inboundOrderNo: { type: "string" },
  importerCode: { type: "string" },
  bookingNo: { type: "string" },
  permissionType: { type: "string" },
  targetWarehouseCode: { type: "string" },
  urgencyReason: { type: "string" },
  vasType: { type: "string" },
  topic: { type: "string" },
  productLine: { type: "string" },
  filterCodes: { type: "array", items: { type: "string" } },
  customerIntent: { type: "string" },
  inputContext: { type: "object", additionalProperties: true },
  enrichedContext: { type: "object", additionalProperties: true },
  orderDetail: { type: "object", additionalProperties: true },
  winitRequestData: { type: "string" },
  needsExceptionFetch: { type: "boolean" },
  dutiableChannelQuery: { type: "boolean" },
};

function defaultType(key: string): Record<string, unknown> {
  if (TYPE_MAP[key]) return TYPE_MAP[key];
  if (key.startsWith("kb") || key.endsWith("Kb") || key.endsWith("MD") || key.endsWith("Md")) {
    return { type: "string" };
  }
  if (key.startsWith("is") || key.startsWith("has") || key.startsWith("can") || key.endsWith("Ok")) {
    return { type: "boolean" };
  }
  return { type: "object", additionalProperties: true };
}

function patchWorkflow(filePath: string): boolean {
  const wf = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    nodes: Array<{ id: string; type?: string; outputs: string[]; cozeIo?: { outputs?: Record<string, unknown> } }>;
  };
  let changed = false;
  for (const node of wf.nodes) {
    if (node.type === "llm") continue;
    if (!node.cozeIo) node.cozeIo = {};
    if (!node.cozeIo.outputs) node.cozeIo.outputs = {};
    for (const out of node.outputs) {
      if (!node.cozeIo.outputs[out]) {
        node.cozeIo.outputs[out] = defaultType(out);
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(wf, null, 2) + "\n", "utf-8");
  }
  return changed;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (!fs.statSync(p).isDirectory()) continue;
    const wf = path.join(p, "workflow.json");
    if (fs.existsSync(wf)) out.push(wf);
    else out.push(...walk(p));
  }
  return out;
}

const dirs = [
  path.join(ROOT, "inbound"),
  path.join(ROOT, "value-add"),
];

let total = 0;
for (const d of dirs) {
  for (const wf of walk(d)) {
    if (patchWorkflow(wf)) {
      console.log("patched", wf);
      total++;
    }
  }
}
console.log(`Done. Patched ${total} workflow files.`);
