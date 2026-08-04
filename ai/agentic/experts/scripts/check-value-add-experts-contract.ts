import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import yaml from "yaml";
import { convertExpertDirToCoze } from "./coze-export/emit";

const repoRoot = path.resolve(__dirname, "..");
const expertRoot = path.join(repoRoot, "experts", "value-add");
const expectedExperts = new Set([
  "value-add-exception-diagnosis",
  "value-add-product-recommendation",
  "value-add-service-config",
  "value-add-order-status",
]);
const reservedInputFields = new Set([
  "query",
  "customerIntent",
  "inputContext",
  "inputs",
  "customerCode",
  "customerName",
  "username",
  "language",
  "data",
]);
const requiredWorkflowNodes: Record<string, string[]> = {
  "value-add-exception-diagnosis": [
    "validate-input",
    "normalize-exception-facts",
    "load-exception-entity",
    "llm-classify",
    "load-value-add-entry",
    "load-exception-mapping-summary",
    "decide-value-add-candidacy",
    "llm-clarify",
    "llm-analyze",
    "format-output",
  ],
  "value-add-product-recommendation": [
    "validate-input",
    "load-flow-context",
    "llm-classify",
    "llm-clarify",
    "load-intent-guide",
    "verify-with-mapping",
    "filter-by-constraints",
    "evidence-gate",
    "llm-recommend",
    "format-output",
  ],
  "value-add-service-config": [
    "validate-input",
    "resolve-vasc-context",
    "load-vasc-context",
    "load-service-orchestration",
    "load-field-evidence",
    "apply-atom-selectability-rules",
    "compose-conditional-config",
    "compose-committed-config",
    "llm-analyze",
    "format-output",
  ],
};

let failed = false;

function fail(message: string) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(repoRoot, filePath)} invalid JSON: ${error instanceof Error ? error.message : "parse error"}`);
    return null;
  }
}

function readYaml(filePath: string): Record<string, unknown> {
  try {
    return (yaml.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>) ?? {};
  } catch (error) {
    fail(`${path.relative(repoRoot, filePath)} invalid YAML: ${error instanceof Error ? error.message : "parse error"}`);
    return {};
  }
}

function asNodeArray(
  workflow: unknown
): Array<{ id?: string; type?: string; file?: string; promptFile?: string; inputs?: string[]; outputs?: string[] }> {
  if (!workflow || typeof workflow !== "object") return [];
  const nodes = (workflow as { nodes?: unknown }).nodes;
  return Array.isArray(nodes)
    ? (nodes as Array<{
        id?: string;
        type?: string;
        file?: string;
        promptFile?: string;
        inputs?: string[];
        outputs?: string[];
      }>)
    : [];
}

function checkCozeConfigRefs(
  expertId: string,
  dir: string,
  workflowNodes: Array<{ id?: string; file?: string; promptFile?: string }>
) {
  const configPath = path.join(dir, "coze.config.yml");
  if (!fs.existsSync(configPath)) return;

  const config = readYaml(configPath);
  const workflowIds = new Set(workflowNodes.map((node) => node.id).filter(Boolean));
  const virtualIds = new Set<string>();

  for (const textNode of (config.textNodes as Array<Record<string, unknown>> | undefined) ?? []) {
    const logicalId = String(textNode.logicalId || "");
    const sourceFile = String(textNode.sourceFile || "");
    if (logicalId) virtualIds.add(logicalId);
    if (!sourceFile) {
      fail(`${expertId} textNodes.${logicalId || "(missing logicalId)"} missing sourceFile`);
      continue;
    }
    const textPath = path.join(dir, sourceFile);
    if (!fs.existsSync(textPath)) {
      fail(`${expertId} textNodes.${logicalId || sourceFile} sourceFile not found: ${sourceFile}`);
    }
    const insertAfter = String(textNode.insertAfter || "");
    if (insertAfter && !workflowIds.has(insertAfter)) {
      fail(`${expertId} textNodes.${logicalId || sourceFile} insertAfter not found: ${insertAfter}`);
    }
  }

  for (const plugin of (config.winitOpenapiPlugins as Array<Record<string, unknown>> | undefined) ?? []) {
    const logicalId = String(plugin.logicalId || "");
    if (logicalId) virtualIds.add(logicalId);
    for (const key of ["insertBefore", "insertAfter"]) {
      const target = String(plugin[key] || "");
      if (target && !workflowIds.has(target)) {
        fail(`${expertId} winitOpenapiPlugins.${logicalId || "(missing logicalId)"}.${key} not found: ${target}`);
      }
    }
    const requestDataFrom = plugin.requestDataFrom as Record<string, unknown> | undefined;
    const requestSource = String(requestDataFrom?.logicalId || "");
    if (requestSource && !workflowIds.has(requestSource)) {
      fail(`${expertId} winitOpenapiPlugins.${logicalId || "(missing logicalId)"}.requestDataFrom.logicalId not found: ${requestSource}`);
    }
  }

  const validRefs = new Set([...workflowIds, ...virtualIds, "__start__"]);
  const inputBindings =
    (config.inputBindings as Record<string, Record<string, { ref?: string; path?: string }>> | undefined) ?? {};
  for (const [nodeId, bindings] of Object.entries(inputBindings)) {
    if (!workflowIds.has(nodeId)) {
      fail(`${expertId} inputBindings target node not found: ${nodeId}`);
    }
    for (const [inputName, binding] of Object.entries(bindings ?? {})) {
      const ref = String(binding.ref || "");
      if (!validRefs.has(ref)) {
        fail(`${expertId} inputBindings.${nodeId}.${inputName}.ref not found: ${ref || "(empty)"}`);
      }
      if (!binding.path) {
        fail(`${expertId} inputBindings.${nodeId}.${inputName}.path missing`);
      }
    }
  }

  const promptDir = path.join(dir, "prompts");
  if (fs.existsSync(promptDir)) {
    const referencedPromptFiles = new Set(["prompts/main.md"]);
    for (const node of workflowNodes) {
      const promptFile = String(node.promptFile || "").replace(/\\/g, "/");
      if (promptFile) referencedPromptFiles.add(promptFile);
    }
    for (const textNode of (config.textNodes as Array<Record<string, unknown>> | undefined) ?? []) {
      const sourceFile = String(textNode.sourceFile || "").replace(/\\/g, "/");
      if (sourceFile) referencedPromptFiles.add(sourceFile);
    }
    for (const entry of fs.readdirSync(promptDir)) {
      if (!entry.endsWith(".md")) continue;
      const rel = `prompts/${entry}`;
      if (!referencedPromptFiles.has(rel)) {
        fail(`${expertId} orphan prompt file not referenced by workflow.json promptFile or coze.config.yml: ${rel}`);
      }
    }
  }
}

function checkGeneratedCozeNodeOutputs(
  expertId: string,
  dir: string,
  workflowNodes: Array<{ id?: string; outputs?: string[] }>
) {
  let draftDoc: Record<string, unknown>;
  try {
    draftDoc = convertExpertDirToCoze(dir).draftDoc as Record<string, unknown>;
  } catch (error) {
    fail(`${expertId} Coze export generation failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return;
  }

  const generatedNodes = new Map<string, Record<string, unknown>>();
  for (const node of (draftDoc.nodes as Array<Record<string, unknown>> | undefined) ?? []) {
    generatedNodes.set(String(node.title || ""), node);
  }

  for (const node of workflowNodes) {
    if (!node.id) continue;
    const generated = generatedNodes.get(node.id);
    if (!generated) {
      fail(`${expertId} generated Coze draft missing node: ${node.id}`);
      continue;
    }
    const parameters = generated.parameters as Record<string, unknown> | undefined;
    const nodeOutputs = parameters?.node_outputs as Record<string, unknown> | undefined;
    for (const outputName of node.outputs ?? []) {
      if (!nodeOutputs || !(outputName in nodeOutputs)) {
        fail(`${expertId} generated Coze node ${node.id} missing node_outputs.${outputName}`);
      }
    }
  }
}

function extractLlmParamString(
  generatedNode: Record<string, unknown>,
  paramName: string
): string {
  const parameters = generatedNode.parameters as Record<string, unknown> | undefined;
  const llmParam = parameters?.llmParam as Array<Record<string, unknown>> | undefined;
  const entry = llmParam?.find((item) => item.name === paramName);
  const input = entry?.input as Record<string, unknown> | undefined;
  const value = input?.value;
  return typeof value === "string" ? value : "";
}

function checkGeneratedCozeLlmPromptsIncludeInputs(
  expertId: string,
  dir: string,
  workflowNodes: Array<{ id?: string; type?: string; inputs?: string[] }>
) {
  let draftDoc: Record<string, unknown>;
  try {
    draftDoc = convertExpertDirToCoze(dir).draftDoc as Record<string, unknown>;
  } catch (error) {
    fail(`${expertId} Coze export generation failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return;
  }

  const generatedNodes = new Map<string, Record<string, unknown>>();
  for (const node of (draftDoc.nodes as Array<Record<string, unknown>> | undefined) ?? []) {
    generatedNodes.set(String(node.title || ""), node);
  }

  for (const node of workflowNodes) {
    if (node.type !== "llm" || !node.id) continue;
    const generated = generatedNodes.get(node.id);
    if (!generated) {
      fail(`${expertId} generated Coze draft missing LLM node: ${node.id}`);
      continue;
    }
    const promptText = `${extractLlmParamString(generated, "systemPrompt")}\n${extractLlmParamString(generated, "prompt")}`;
    for (const inputName of node.inputs ?? []) {
      if (!promptText.includes(`{{${inputName}}}`)) {
        fail(`${expertId} generated Coze LLM node ${node.id} prompt missing runtime input placeholder {{${inputName}}}`);
      }
    }
  }
}

function parseLlmDeclarationList(source: string, label: "inputs" | "outputs"): string[] {
  const match = source.match(new RegExp(`${label}:\\s*([^\\r\\n*]+)`));
  if (!match) return [];
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLlmDeclarationPrompt(source: string): string {
  return source.match(/Prompt：`([^`]+)`/)?.[1]?.trim() ?? "";
}

function sameList(a: string[] | undefined, b: string[]): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b);
}

function parsePromptInputList(source: string): string[] {
  const inputStart = source.match(/^## 输入\s*$/m);
  if (!inputStart || inputStart.index === undefined) return [];
  const rest = source.slice(inputStart.index + inputStart[0].length);
  const nextSection = rest.search(/^##\s+/m);
  const inputSection = nextSection >= 0 ? rest.slice(0, nextSection) : rest;
  return [...inputSection.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((match) => match[1]!.trim());
}

function checkLlmDeclarations(
  expertId: string,
  dir: string,
  workflowNodes: Array<{ id?: string; type?: string; promptFile?: string; inputs?: string[]; outputs?: string[] }>
) {
  for (const node of workflowNodes) {
    if (node.type !== "llm" || !node.id) continue;
    const declarationPath = path.join(dir, "nodes", `${node.id}.ts`);
    if (!fs.existsSync(declarationPath)) {
      fail(`${expertId} LLM node ${node.id} missing declaration file nodes/${node.id}.ts`);
      continue;
    }

    const source = fs.readFileSync(declarationPath, "utf8");
    const declaredPrompt = parseLlmDeclarationPrompt(source);
    const promptFile = node.promptFile || "prompts/main.md";
    if (declaredPrompt !== promptFile) {
      fail(`${expertId} LLM node ${node.id} declaration Prompt must equal workflow promptFile ${promptFile}`);
    }
    if (!fs.existsSync(path.join(dir, promptFile))) {
      fail(`${expertId} LLM node ${node.id} promptFile not found: ${promptFile}`);
    }
    const promptPath = path.join(dir, promptFile);
    if (fs.existsSync(promptPath)) {
      const promptSource = fs.readFileSync(promptPath, "utf8");
      const promptInputs = parsePromptInputList(promptSource);
      if (!sameList(node.inputs, promptInputs)) {
        fail(`${expertId} LLM node ${node.id} prompt ## 输入 fields must match workflow.json inputs in order`);
      }
    }

    const declaredInputs = parseLlmDeclarationList(source, "inputs");
    if (!sameList(node.inputs, declaredInputs)) {
      fail(`${expertId} LLM node ${node.id} declaration inputs must match workflow.json`);
    }
    const declaredOutputs = parseLlmDeclarationList(source, "outputs");
    if (!sameList(node.outputs, declaredOutputs)) {
      fail(`${expertId} LLM node ${node.id} declaration outputs must match workflow.json`);
    }
  }
}

function checkNodeFiles(expertId: string, dir: string, workflowNodes: Array<{ id?: string; file?: string }>) {
  const referencedFiles = new Set<string>();
  for (const node of workflowNodes) {
    if (!node.file) continue;
    const normalized = node.file.replace(/\\/g, "/");
    referencedFiles.add(normalized);
    const nodeFile = path.join(dir, node.file);
    if (!fs.existsSync(nodeFile)) {
      fail(`${expertId} workflow file not found: ${node.file}`);
      continue;
    }
    const source = fs.readFileSync(nodeFile, "utf8");
    if (!/\basync\s+function\s+main\s*\(/.test(source)) {
      fail(`${expertId} ${node.file} must define async function main`);
    }
    if (/\bexport\s+/.test(source)) {
      fail(`${expertId} ${node.file} must not use export in executable code node source`);
    }
  }

  const nodesDir = path.join(dir, "nodes");
  if (!fs.existsSync(nodesDir)) return;
  for (const entry of fs.readdirSync(nodesDir)) {
    if (!entry.endsWith(".ts")) continue;
    const rel = `nodes/${entry}`;
    if (entry.startsWith("llm-")) continue;
    if (!referencedFiles.has(rel)) {
      fail(`${expertId} orphan executable node file not referenced by workflow.json: ${rel}`);
    }
  }
}

function runNode(nodePath: string, params: Record<string, unknown>): Record<string, unknown> {
  const result = spawnSync(
    process.execPath,
    ["-r", "ts-node/register", nodePath, JSON.stringify(params)],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        TS_NODE_PROJECT: path.join(repoRoot, "scripts", "tsconfig.json"),
      },
    }
  );
  if (result.error || result.status !== 0) {
    const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
    const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";
    fail(`${nodePath} execution failed: ${result.error?.message || stderr || stdout || "unknown error"}`);
    return {};
  }
  try {
    return JSON.parse(result.stdout || "{}") as Record<string, unknown>;
  } catch (error) {
    fail(`${nodePath} returned invalid JSON: ${error instanceof Error ? error.message : "parse error"}`);
    return {};
  }
}

function checkValueAddOrderStatusBehavior() {
  const base = path.join("experts", "value-add", "value-add-order-status", "nodes");
  const workflow = readJson(path.join(repoRoot, "experts", "value-add", "value-add-order-status", "workflow.json")) as
    | { nodes?: Array<{ id?: string; inputs?: string[] }> }
    | null;
  const workflowNodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
  const fetchBasicInfoNode = workflowNodes.find((node) => node.id === "fetch-basic-info");
  const fetchVasListNode = workflowNodes.find((node) => node.id === "fetch-vas-list");
  if (!fetchBasicInfoNode?.inputs?.includes("basicInfoActionPlan")) {
    fail("value-add-order-status workflow fetch-basic-info must consume basicInfoActionPlan");
  }
  if (!fetchVasListNode?.inputs?.includes("vasListActionPlan")) {
    fail("value-add-order-status workflow fetch-vas-list must consume vasListActionPlan");
  }

  const validated = runNode(path.join(base, "validate-vas-order-input.ts"), {
    vasOrderNo: " V100 ",
    maxAtomRows: 999,
  });
  const orderStatusInput = validated.orderStatusInput as Record<string, unknown> | undefined;
  if (orderStatusInput?.maxAtomRows !== 200) {
    fail("value-add-order-status validate-vas-order-input must clamp maxAtomRows to 200");
  }

  const basicRequest = runNode(path.join(base, "build-basic-info-request.ts"), {
    orderStatusInput: { vasOrderNo: "" },
  });
  if (basicRequest.basicInfoRequestData !== "") {
    fail("value-add-order-status build-basic-info-request must emit empty request data when skipped");
  }
  const skippedBasicPlan = basicRequest.basicInfoActionPlan as Record<string, unknown> | undefined;
  const skippedBasicFetch = runNode(path.join(base, "fetch-basic-info.ts"), {
    orderStatusInput: { vasOrderNo: "" },
    basicInfoActionPlan: skippedBasicPlan,
  });
  const skippedBasicFacts = skippedBasicFetch.basicInfoFacts as Record<string, unknown> | undefined;
  if (skippedBasicFacts?.fetchStatus !== "skipped") {
    fail("value-add-order-status fetch-basic-info skip status must follow basicInfoActionPlan.skip");
  }

  const apiError = runNode(path.join(base, "fetch-basic-info.ts"), {
    orderStatusInput: { vasOrderNo: "V100" },
    basicInfoApiResult: JSON.stringify({ code: "500", msg: "internal error", data: {} }),
  });
  const apiErrorFacts = apiError.basicInfoFacts as Record<string, unknown> | undefined;
  if (apiErrorFacts?.fetchStatus !== "api_error") {
    fail("value-add-order-status fetch-basic-info must distinguish API errors from not_fetched");
  }

  const mappedBasicInfo = runNode(path.join(base, "fetch-basic-info.ts"), {
    orderStatusInput: { vasOrderNo: "VASC000000324282" },
    basicInfoApiResult: JSON.stringify({
      code: "0",
      data: {
        orderNo: "VASC000000324282",
        status: "PI",
        statusDesc: "处理中",
        orderDate: "2026-07-24 15:40:42",
        estimateCompleteTime: "2026-07-29 21:59:59",
        estimateCompleteTimeStr: "2026-07-29 23:59:59",
        actualCompleteTime: "",
        businessOrder: { businessNo: "IH000000106977", businessType: "INHOUSE" },
        warehouse: { warehouseCode: "EWD", warehouseName: "AU Warehouse" },
        vasc: { productCode: "VASC-PHOTO", productName: "Photo", sla: 2, slaUnitCode: "WORKING_DAY" },
        control: { vasObjectType: "MERCHANDISE" },
        customer: { customerCode: "must-not-leak" },
        createdby: "must-not-leak",
      },
    }),
  });
  const mappedBasicFacts = mappedBasicInfo.basicInfoFacts as Record<string, unknown> | undefined;
  const mappedBasicRaw = mappedBasicFacts?.raw as Record<string, unknown> | undefined;
  const mappedWarehouse = mappedBasicFacts?.warehouse as Record<string, unknown> | undefined;
  if (
    mappedBasicFacts?.estimateCompleteTime !== "2026-07-29 21:59:59" ||
    mappedBasicFacts?.estimateCompleteTimeLocal !== "2026-07-29 23:59:59" ||
    mappedBasicFacts?.businessNo !== "IH000000106977" ||
    mappedWarehouse?.warehouseCode !== "EWD"
  ) {
    fail("value-add-order-status fetch-basic-info must expose normalized time, business, and warehouse facts");
  }
  if (mappedBasicRaw && ("customer" in mappedBasicRaw || "createdby" in mappedBasicRaw)) {
    fail("value-add-order-status fetch-basic-info must not expose customer or internal operator fields");
  }

  const mappedResolvedBasicInfo = runNode(path.join(base, "fetch-resolved-basic-info.ts"), {
    orderStatusInput: { businessNo: "IH000000106977" },
    basicInfoFacts: { fetchStatus: "skipped" },
    vasListFacts: {},
    resolvedBasicInfoApiResult: JSON.stringify({
      code: "0",
      data: {
        orderNo: "VASC000000324282",
        estimateCompleteTimeStr: "2026-07-29 23:59:59",
        businessOrder: { businessNo: "IH000000106977" },
        vasc: { productCode: "VASC-PHOTO" },
      },
    }),
  });
  const mappedResolvedFacts = mappedResolvedBasicInfo.resolvedBasicInfoFacts as Record<string, unknown> | undefined;
  if (
    mappedResolvedFacts?.estimateCompleteTimeLocal !== "2026-07-29 23:59:59" ||
    mappedResolvedFacts?.businessNo !== "IH000000106977"
  ) {
    fail("value-add-order-status fetch-resolved-basic-info must preserve normalized time and business facts");
  }

  const emptyVasList = runNode(path.join(base, "fetch-vas-list.ts"), {
    orderStatusInput: { vasOrderNo: "V100" },
    basicInfoFacts: { orderNo: "V100" },
    vasListApiResult: JSON.stringify({ code: "0", data: { list: [] } }),
  });
  const emptyVasListFacts = emptyVasList.vasListFacts as Record<string, unknown> | undefined;
  if (emptyVasListFacts?.fetchStatus !== "ok") {
    fail("value-add-order-status fetch-vas-list must treat a valid empty list as ok");
  }

  const mappedVasList = runNode(path.join(base, "fetch-vas-list.ts"), {
    orderStatusInput: { vasOrderNo: "VASC000000324282" },
    basicInfoFacts: { orderNo: "VASC000000324282" },
    vasListApiResult: JSON.stringify({
      code: "0",
      data: {
        list: [
          {
            orderNo: "VASC000000324282",
            serviceCode: "OSF6V1570",
            serviceName: "Photo",
            status: "CO",
            statusDesc: "已处理",
            completeTime: "2026-07-28 13:18:52",
            orderCount: 6,
            handleCount: 6,
            partCompleteReason: "",
            returnReason: "",
            vaAtomAttrs: [
              { attributeName: "Method", attributeValue: "Shelf", attributeKeyOriginal: "DEAL_WITH_WAY" },
            ],
          },
        ],
      },
    }),
  });
  const mappedVasFacts = mappedVasList.vasListFacts as Record<string, unknown> | undefined;
  const mappedAtom = (mappedVasFacts?.atomProgress as Array<Record<string, unknown>> | undefined)?.[0];
  const mappedAttr = (mappedAtom?.vaAtomAttrs as Array<Record<string, unknown>> | undefined)?.[0];
  if (
    mappedAtom?.serviceCode !== "OSF6V1570" ||
    mappedAtom?.atomCode !== "OSF6V1570" ||
    mappedAtom?.completeTime !== "2026-07-28 13:18:52" ||
    mappedAtom?.orderCount !== 6 ||
    mappedAtom?.handleCount !== 6 ||
    mappedAttr?.name !== "Method" ||
    mappedAttr?.value !== "Shelf"
  ) {
    fail("value-add-order-status fetch-vas-list must map current service, quantity, time, and attribute fields");
  }

  const partial = runNode(path.join(base, "merge-status-data.ts"), {
    orderStatusInput: { outputPath: "query_by_vas_order_no", vasOrderNo: "V100" },
    basicInfoFacts: { fetchStatus: "ok", orderNo: "V100", optionalFetchFailures: [] },
    vasListFacts: { fetchStatus: "api_error", optionalFetchFailures: ["vasList_api_error"] },
    apiBoundaryKb: "",
  });
  const statusFacts = partial.statusFacts as Record<string, unknown> | undefined;
  if (statusFacts?.outputPath !== "status_found_partial") {
    fail("value-add-order-status merge-status-data must expose status_found_partial when P0 atom list fails");
  }

  const mergedTimeResult = runNode(path.join(base, "merge-status-data.ts"), {
    orderStatusInput: { outputPath: "query_by_vas_order_no", vasOrderNo: "VASC000000324282" },
    basicInfoFacts: {
      fetchStatus: "ok",
      orderNo: "VASC000000324282",
      status: "PI",
      statusDesc: "处理中",
      estimateCompleteTime: "2026-07-29 21:59:59",
      estimateCompleteTimeLocal: "2026-07-29 23:59:59",
      warehouse: { warehouseCode: "EWD" },
      vasc: { productCode: "VASC-PHOTO" },
      optionalFetchFailures: [],
    },
    vasListFacts: { fetchStatus: "ok", atomProgress: [], optionalFetchFailures: [] },
  });
  const mergedTimeFacts = mergedTimeResult.statusFacts as Record<string, unknown> | undefined;
  if (
    mergedTimeFacts?.estimateCompleteTimeLocal !== "2026-07-29 23:59:59" ||
    (mergedTimeFacts?.warehouse as Record<string, unknown> | undefined)?.warehouseCode !== "EWD"
  ) {
    fail("value-add-order-status merge-status-data must preserve normalized time and reusable business facts");
  }

  const businessNoOnly = runNode(path.join(base, "validate-vas-order-input.ts"), {
    businessNo: "WI49616707",
  });
  const businessNoInput = businessNoOnly.orderStatusInput as Record<string, unknown> | undefined;
  if (businessNoInput?.outputPath !== "query_by_business_no") {
    fail("value-add-order-status validate-vas-order-input must route businessNo-only input to query_by_business_no");
  }

  const preQuoteOnly = runNode(path.join(base, "validate-vas-order-input.ts"), {
    includePayment: true,
    includePrepayment: true,
  });
  const preQuoteInput = preQuoteOnly.orderStatusInput as Record<string, unknown> | undefined;
  if (preQuoteInput?.outputPath !== "pre_quote_not_supported") {
    fail("value-add-order-status validate-vas-order-input must distinguish pre-order quote requests from missing order id");
  }

  const businessVasRequest = runNode(path.join(base, "build-vas-list-request.ts"), {
    orderStatusInput: { outputPath: "query_by_business_no", businessNo: "WI49616707", includeAtoms: true },
    basicInfoFacts: { fetchStatus: "skipped" },
  });
  const businessVasActionPlan = businessVasRequest.vasListActionPlan as Record<string, unknown> | undefined;
  const businessVasData = businessVasActionPlan?.data as Record<string, unknown> | undefined;
  if (businessVasActionPlan?.skip !== false || businessVasData?.businessNo !== "WI49616707") {
    fail("value-add-order-status build-vas-list-request must query getVasList by businessNo when vasOrderNo is absent");
  }

  const skippedVasRequest = runNode(path.join(base, "build-vas-list-request.ts"), {
    orderStatusInput: { vasOrderNo: "V100", includeAtoms: false },
    basicInfoFacts: { orderNo: "V100" },
  });
  const skippedVasPlan = skippedVasRequest.vasListActionPlan as Record<string, unknown> | undefined;
  const skippedVasFetch = runNode(path.join(base, "fetch-vas-list.ts"), {
    orderStatusInput: { vasOrderNo: "V100", includeAtoms: true },
    basicInfoFacts: { orderNo: "V100" },
    vasListActionPlan: skippedVasPlan,
  });
  const skippedVasFacts = skippedVasFetch.vasListFacts as Record<string, unknown> | undefined;
  if (skippedVasFacts?.fetchStatus !== "skipped") {
    fail("value-add-order-status fetch-vas-list skip status must follow vasListActionPlan.skip");
  }

  const pageDataVasList = runNode(path.join(base, "fetch-vas-list.ts"), {
    orderStatusInput: { vasOrderNo: "V100" },
    basicInfoFacts: { orderNo: "V100" },
    vasListApiResult: JSON.stringify({ code: "0", data: { pageData: [{ orderNo: "V100", serviceCode: "ATOM1" }] } }),
  });
  const pageDataVasFacts = pageDataVasList.vasListFacts as Record<string, unknown> | undefined;
  if (pageDataVasFacts?.fetchStatus !== "ok") {
    fail("value-add-order-status fetch-vas-list must accept pageData list containers");
  }

  const p2Validated = runNode(path.join(base, "validate-vas-order-input.ts"), {
    vasOrderNo: "V100",
    includePayment: true,
    includePrepayment: true,
    includeGoods: true,
    parentGoodsId: 12345,
  });
  const p2Input = p2Validated.orderStatusInput as Record<string, unknown> | undefined;
  if (p2Input?.parentGoodsId !== 12345) {
    fail("value-add-order-status validate-vas-order-input must keep parentGoodsId for getSubGoods");
  }

  const paymentRequest = runNode(path.join(base, "build-payment-request.ts"), {
    orderStatusInput: { includePayment: true },
    statusFacts: { orderNo: "V100" },
  });
  const paymentPlan = paymentRequest.paymentActionPlan as Record<string, unknown> | undefined;
  const paymentData = paymentPlan?.data as Record<string, unknown> | undefined;
  if (paymentPlan?.skip !== false || paymentData?.orderNo !== "V100") {
    fail("value-add-order-status build-payment-request must call getPaymentList when includePayment is true");
  }

  const prepaymentRequest = runNode(path.join(base, "build-prepayment-request.ts"), {
    orderStatusInput: { includePrepayment: true },
    statusFacts: { orderNo: "V100" },
  });
  const prepaymentPlan = prepaymentRequest.prepaymentActionPlan as Record<string, unknown> | undefined;
  const prepaymentData = prepaymentPlan?.data as Record<string, unknown> | undefined;
  if (prepaymentPlan?.skip !== false || prepaymentData?.orderNo !== "V100") {
    fail("value-add-order-status build-prepayment-request must call getPrepaymentList when includePrepayment is true");
  }

  const goodsRequest = runNode(path.join(base, "build-sub-goods-request.ts"), {
    orderStatusInput: { includeGoods: true, parentGoodsId: 12345, maxAtomRows: 20 },
    statusFacts: { orderNo: "V100" },
  });
  const goodsPlan = goodsRequest.subGoodsActionPlan as Record<string, unknown> | undefined;
  const goodsData = goodsPlan?.data as Record<string, unknown> | undefined;
  if (goodsPlan?.skip !== false || goodsData?.orderNo !== "V100" || goodsData?.parentId !== 12345) {
    fail("value-add-order-status build-sub-goods-request must call getSubGoods with orderNo and parentId");
  }

  const missingGoodsRequest = runNode(path.join(base, "build-sub-goods-request.ts"), {
    orderStatusInput: { includeGoods: true, maxAtomRows: 20 },
    statusFacts: { orderNo: "V100" },
  });
  const missingGoodsPlan = missingGoodsRequest.subGoodsActionPlan as Record<string, unknown> | undefined;
  if (missingGoodsPlan?.skip !== true || missingGoodsPlan?.reason !== "missing_parentGoodsId") {
    fail("value-add-order-status build-sub-goods-request must skip with reason missing_parentGoodsId when parentGoodsId is absent");
  }

  const paymentFactsResult = runNode(path.join(base, "fetch-payment-list.ts"), {
    paymentApiResult: JSON.stringify({
      code: "0",
      data: { totalActualAmount: 12.34, atomFeeList: [{ serviceCode: "A1", serviceName: "Atom One", amount: 12.34 }] },
    }),
  });
  const paymentFacts = paymentFactsResult.paymentFacts as Record<string, unknown> | undefined;
  const paymentSummary = paymentFacts?.paymentSummary as Record<string, unknown> | undefined;
  const atomFeeList = paymentSummary?.atomFeeList as Array<Record<string, unknown>> | undefined;
  if (paymentFacts?.fetchStatus !== "ok" || paymentSummary?.totalActualAmount !== 12.34) {
    fail("value-add-order-status fetch-payment-list must expose paymentSummary from getPaymentList");
  }
  if (!Array.isArray(atomFeeList) || atomFeeList[0]?.atomCode !== "A1" || atomFeeList[0]?.atomName !== "Atom One") {
    fail("value-add-order-status fetch-payment-list must accept serviceCode/serviceName atom fee fields");
  }
  if (paymentSummary?.amountEvidenceType !== "actual_amount") {
    fail("value-add-order-status fetch-payment-list must label actual payment evidence when amount is returned");
  }

  const standardOnlyPaymentFactsResult = runNode(path.join(base, "fetch-payment-list.ts"), {
    paymentApiResult: JSON.stringify({
      code: "0",
      data: {
        totalStandardAmount: 12.34,
        currency: "USD",
        atomFeeList: [{ serviceCode: "A1", serviceName: "Atom One", standardAmount: 12.34, currency: "USD" }],
      },
    }),
  });
  const standardOnlyPaymentFacts = standardOnlyPaymentFactsResult.paymentFacts as Record<string, unknown> | undefined;
  const standardOnlyPaymentSummary = standardOnlyPaymentFacts?.paymentSummary as Record<string, unknown> | undefined;
  const standardOnlyAtomFees = standardOnlyPaymentSummary?.atomFeeList as Array<Record<string, unknown>> | undefined;
  if (
    standardOnlyPaymentSummary?.amountEvidenceType !== "standard_amount" ||
    !Array.isArray(standardOnlyAtomFees) ||
    standardOnlyAtomFees[0]?.amountType !== "standard_amount"
  ) {
    fail("value-add-order-status fetch-payment-list must label standard-only payment evidence");
  }

  const prepaymentFactsResult = runNode(path.join(base, "fetch-prepayment-list.ts"), {
    prepaymentApiResult: JSON.stringify({ code: "0", data: { list: [{ estimatedReceivableAmount: 10 }] } }),
  });
  const prepaymentFacts = prepaymentFactsResult.prepaymentFacts as Record<string, unknown> | undefined;
  const prepaymentSummary = prepaymentFacts?.prepaymentSummary as Record<string, unknown> | undefined;
  if (prepaymentFacts?.fetchStatus !== "ok" || prepaymentSummary?.recordCount !== 1) {
    fail("value-add-order-status fetch-prepayment-list must expose prepaymentSummary from getPrepaymentList");
  }

  const goodsFactsResult = runNode(path.join(base, "fetch-sub-goods.ts"), {
    subGoodsApiResult: JSON.stringify({ code: "0", data: { list: [{ goodsId: 1, skuCode: "SKU1" }] } }),
  });
  const goodsFacts = goodsFactsResult.goodsFacts as Record<string, unknown> | undefined;
  const goodsSummary = goodsFacts?.goodsSummary as Record<string, unknown> | undefined;
  if (goodsFacts?.fetchStatus !== "ok" || goodsSummary?.recordCount !== 1) {
    fail("value-add-order-status fetch-sub-goods must expose goodsSummary from getSubGoods");
  }

  const preQuoteOutput = runNode(path.join(base, "format-output.ts"), {
    statusFacts: {
      outputPath: "pre_quote_not_supported",
      validationMessage: "pre-order quote is not supported",
    },
  });
  if (!String(preQuoteOutput.analysis || "").includes("未下单前报价")) {
    fail("value-add-order-status format-output must explain that pre-order quote is unsupported");
  }

  const historyOutput = runNode(path.join(base, "format-output.ts"), {
    statusFacts: {
      outputPath: "status_found",
      atomProgress: [
        {
          atomCode: "OW01V1558",
          vaAtomAttrs: [{ name: "LABEL_TYPE", value: "THIRD_PARTY" }],
          vaAtomFiles: [{ name: "labels.xlsx", type: "LABEL_FILE" }],
        },
      ],
    },
    analysisResult: { analysis: "历史单已完成。" },
  });
  if (!String(historyOutput.analysis || "").includes("不能直接当作下一次下单的完整模板")) {
    fail("value-add-order-status format-output must add boundary note for historical vaAtomAttrs/vaAtomFiles");
  }

  const inProgressTimeOutput = runNode(path.join(base, "format-output.ts"), {
    statusFacts: {
      outputPath: "status_found",
      orderNo: "VASC000000324282",
      status: "PI",
      statusDesc: "处理中",
      estimateCompleteTime: "2026-07-29 21:59:59",
      estimateCompleteTimeLocal: "2026-07-29 23:59:59",
    },
    analysisResult: { analysis: "当前增值单正在处理。" },
  });
  const inProgressTimeStructured = inProgressTimeOutput.structured as Record<string, unknown> | undefined;
  if (
    inProgressTimeStructured?.estimateCompleteTimeLocal !== "2026-07-29 23:59:59" ||
    !String(inProgressTimeOutput.analysis || "").includes("2026-07-29 23:59:59") ||
    !String(inProgressTimeOutput.analysis || "").includes("不是 SLA 承诺")
  ) {
    fail("value-add-order-status format-output must deterministically expose local estimated completion time");
  }

  const completedAtomTimeOutput = runNode(path.join(base, "format-output.ts"), {
    statusFacts: {
      outputPath: "status_found",
      orderNo: "VASC000000324282",
      status: "PD",
      statusDesc: "已完成",
      actualCompleteTime: "",
      atomProgress: [
        {
          serviceCode: "OSF6V1570",
          serviceName: "Photo",
          status: "CO",
          completeTime: "2026-07-28 13:18:52",
        },
      ],
    },
    analysisResult: { analysis: "该增值单已完成。" },
  });
  const completedAtomTimeAnalysis = String(completedAtomTimeOutput.analysis || "");
  if (
    !completedAtomTimeAnalysis.includes("原子服务处理时间") ||
    !completedAtomTimeAnalysis.includes("2026-07-28 13:18:52") ||
    completedAtomTimeAnalysis.includes("实际完成时间为 2026-07-28 13:18:52")
  ) {
    fail("value-add-order-status format-output must not promote atom completion time to order actual completion time");
  }

  const completedConflictOutput = runNode(path.join(base, "format-output.ts"), {
    statusFacts: {
      outputPath: "status_found",
      status: "COMPLETED",
      statusDesc: "已完成",
    },
    analysisResult: { analysis: "已查到增值单，主状态为已完成。下一步无需客户动作，继续等待处理，等待即可，客户可继续等待，可继续等待。" },
  });
  if (String(completedConflictOutput.analysis || "").includes("继续等待") || String(completedConflictOutput.analysis || "").includes("等待即可")) {
    fail("value-add-order-status format-output must remove wait wording for completed orders");
  }

  const standardOnlyPaymentOutput = runNode(path.join(base, "format-output.ts"), {
    statusFacts: {
      outputPath: "status_found",
      orderNo: "VTEST30001",
      status: "COMPLETED",
      statusDesc: "已完成",
      paymentSummary: {
        totalStandardAmount: 12.34,
        totalActualAmount: "",
        amountEvidenceType: "standard_amount",
        atomFeeList: [{ atomCode: "A1", atomName: "Atom One", amount: 12.34, amountType: "standard_amount", currency: "USD" }],
      },
    },
    analysisResult: { analysis: "事后实际费用摘要显示，增值单实际费用如下：Atom One 12.34 USD。下一步动作是该增值单事后实际费用以标准金额为准。" },
  });
  const standardOnlyPaymentAnalysis = String(standardOnlyPaymentOutput.analysis || "");
  if (
    standardOnlyPaymentAnalysis.includes("实际费用如下") ||
    standardOnlyPaymentAnalysis.includes("事后实际费用") ||
    standardOnlyPaymentAnalysis.includes("继续等待") ||
    standardOnlyPaymentAnalysis.includes("可继续等待") ||
    !standardOnlyPaymentAnalysis.includes("标准费用")
  ) {
    fail("value-add-order-status format-output must not describe standard-only payment evidence as actual fee");
  }

  const businessNoApiFailedOutput = runNode(path.join(base, "format-output.ts"), {
    statusFacts: {
      outputPath: "api_failed",
      businessNo: "WI49616707",
      optionalFetchFailures: ["vasListApiResult_missing"],
    },
    analysisResult: { analysis: "未能定位到唯一增值单，下一步需要补充增值单号。" },
  });
  const businessNoApiFailedAnalysis = String(businessNoApiFailedOutput.analysis || "");
  if (!businessNoApiFailedAnalysis.includes("业务单号") || !businessNoApiFailedAnalysis.includes("稍后重试")) {
    fail("value-add-order-status format-output must align businessNo API failure analysis with retry/manual next action");
  }
}

function checkValueAddExceptionDiagnosisBehavior() {
  const base = path.join("experts", "value-add", "value-add-exception-diagnosis", "nodes");

  const queryOnlyValidation = runNode(path.join(base, "validate-input.ts"), {
    query: "包裹条码批量异常，要不要做增值？",
  });
  const queryOnlyValidationResult = queryOnlyValidation.validationResult as Record<string, unknown> | undefined;
  if (queryOnlyValidationResult?.ok !== true) {
    fail("value-add-exception-diagnosis validate-input must treat query text as usable exception description");
  }

  const normalizedClassification = runNode(path.join(base, "decide-value-add-candidacy.ts"), {
    validationResult: { ok: true },
    classificationResult: {
      structured: {
        normalizedException: {
          code: "B01E1615",
          name: "包裹条码批量异常（需客户处理）",
          source: "description_match",
        },
        exceptionCategory: "barcode_package",
        objectLevel: "package",
        blockedStage: "putaway",
        requiresCustomerAction: true,
      },
    },
    diagnosisInput: {},
    valueAddEntryKb: "",
    exceptionMappingSummaryKb: "| B01E1615 | 包裹条码批量异常（需客户处理） | candidate_relation_exists |",
  });
  const normalizedDecision = normalizedClassification.candidacyDecision as Record<string, unknown> | undefined;
  const normalizedHandoff = normalizedDecision?.handoffFacts as Record<string, unknown> | undefined;
  if (
    normalizedDecision?.outputPath !== "candidate" ||
    normalizedHandoff?.exceptionCode !== "B01E1615" ||
    normalizedHandoff?.exceptionName !== "包裹条码批量异常（需客户处理）" ||
    normalizedHandoff?.requiresCustomerAction !== true
  ) {
    fail("value-add-exception-diagnosis must preserve normalizedException code/name and customer-action flag in handoff facts");
  }

  const formattedDiagnosis = runNode(path.join(base, "format-output.ts"), {
    candidacyDecision: {
      outputPath: "candidate",
      isValueAddCandidate: true,
      missingEvidence: [],
      handoffFacts: {
        exceptionCode: "B01E1615",
        exceptionName: "包裹条码批量异常（需客户处理）",
        exceptionCategory: "barcode_package",
        objectLevel: "package",
        blockedStage: "putaway",
        requiresCustomerAction: true,
      },
    },
    diagnosisInput: {},
    analysisResult: { analysis: "" },
  });
  const formattedStructured = formattedDiagnosis.structured as Record<string, unknown> | undefined;
  if (
    formattedStructured?.exceptionName !== "包裹条码批量异常（需客户处理）" ||
    formattedStructured?.objectLevel !== "package" ||
    formattedStructured?.blockedStage !== "putaway" ||
    formattedStructured?.requiresCustomerAction !== true
  ) {
    fail("value-add-exception-diagnosis format-output must expose normalized exception facts at structured root");
  }

  const contradictoryAnalysis = runNode(path.join(base, "format-output.ts"), {
    candidacyDecision: {
      outputPath: "candidate",
      isValueAddCandidate: true,
      missingEvidence: [],
      handoffFacts: {
        exceptionCode: "B01E1615",
        exceptionName: "包裹条码批量异常（需客户处理）",
        exceptionCategory: "barcode_package",
        objectLevel: "package",
        blockedStage: "putaway",
        requiresCustomerAction: true,
      },
    },
    diagnosisInput: {},
    analysisResult: {
      analysis: "缺失的信息为 objectLevel 和 customerActionHint，属于 informational 缺失。",
    },
  });
  if (String(contradictoryAnalysis.analysis || "").includes("缺失的信息为 objectLevel")) {
    fail("value-add-exception-diagnosis format-output must not claim objectLevel is missing when structured has objectLevel");
  }

  const nonMatchingKb = runNode(path.join(base, "decide-value-add-candidacy.ts"), {
    validationResult: { ok: true },
    diagnosisInput: { exceptionCode: "B01E1615" },
    valueAddEntryKb: "",
    exceptionMappingSummaryKb: "B02E0001 | VASC001 | 其他异常处理",
  });
  const nonMatchingDecision = nonMatchingKb.candidacyDecision as Record<string, unknown> | undefined;
  if (nonMatchingDecision?.outputPath === "candidate") {
    fail("value-add-exception-diagnosis must not mark candidate only because mapping KB is non-empty");
  }

  const deprecatedMention = runNode(path.join(base, "decide-value-add-candidacy.ts"), {
    validationResult: { ok: true },
    diagnosisInput: { exceptionCode: "B01E1615" },
    valueAddEntryKb: "",
    exceptionMappingSummaryKb: "备注：B01E1615 已废弃，请使用 B02E0001 | VASC001",
  });
  const deprecatedDecision = deprecatedMention.candidacyDecision as Record<string, unknown> | undefined;
  if (deprecatedDecision?.outputPath === "candidate") {
    fail("value-add-exception-diagnosis must not mark deprecated-note mentions as candidate mapping evidence");
  }

  const quantityMismatch = runNode(path.join(base, "decide-value-add-candidacy.ts"), {
    validationResult: { ok: true },
    classificationResult: {
      structured: {
        exceptionCode: "B01E1517",
        exceptionCategory: "quantity_discrepancy",
      },
    },
    diagnosisInput: {
      exceptionCode: "B01E1517",
      evidenceSummary: { verified: false },
    },
    valueAddEntryKb: "",
    exceptionMappingSummaryKb: "| B01E1517 | qty | candidate_relation_exists_with_inactive |",
  });
  const quantityDecision = quantityMismatch.candidacyDecision as Record<string, unknown> | undefined;
  if (quantityDecision?.outputPath !== "needs_upstream_check") {
    fail("value-add-exception-diagnosis quantity discrepancy without verified facts must route to needs_upstream_check");
  }
}

function checkValueAddProductRecommendationBehavior() {
  const base = path.join("experts", "value-add", "value-add-product-recommendation", "nodes");

  const deprecatedMention = runNode(path.join(base, "verify-with-mapping.ts"), {
    recommendationInput: { exceptionCode: "B01E1615" },
    kbMappingTable: "备注：B01E1615 已废弃，请使用 B02E0001 | VASC001 | 其他异常处理",
  });
  const evidence = deprecatedMention.mappingEvidence as Record<string, unknown> | undefined;
  if (evidence?.matched !== false) {
    fail("value-add-product-recommendation verify-with-mapping must ignore deprecated-note mentions");
  }

  const validMapping = runNode(path.join(base, "verify-with-mapping.ts"), {
    recommendationInput: { exceptionCode: "B01E1615" },
    kbMappingTable: "| B01E1615 | package barcode | VASC001 | Original shelve | package |",
  });
  const seed = validMapping.candidateSeed as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(seed) || seed.length !== 1) {
    fail("value-add-product-recommendation verify-with-mapping must keep valid mapping table rows");
  }
  if (seed?.[0]?.vascName !== "Original shelve") {
    fail("value-add-product-recommendation verify-with-mapping must parse vascName from the VASC name column, not objectLevel");
  }

  const newOrderFiltered = runNode(path.join(base, "filter-by-constraints.ts"), {
    recommendationInput: { customerActionIntent: "USE_NEW_INBOUND_ORDER_CUSTOMER_CREATED" },
    candidateSeed: [
      { vascCode: "VASC202407031503503", vascName: "origin order", active: true, reason: "origin" },
      { vascCode: "VASC202407161056217", vascName: "new order", active: true, reason: "new order" },
    ],
  });
  const newOrderRecommendation = newOrderFiltered.filteredRecommendation as Record<string, unknown> | undefined;
  const newOrderPrimary = newOrderRecommendation?.primaryRecommendation as Record<string, unknown> | undefined;
  if (newOrderPrimary?.vascCode !== "VASC202407161056217") {
    fail("value-add-product-recommendation filter-by-constraints must choose new-order VASC for new-order intent");
  }

  const photoIntentFiltered = runNode(path.join(base, "filter-by-constraints.ts"), {
    recommendationInput: {
      customerActionIntent: "PHOTO_MEASURE",
      customerIntent: "推荐拍照或视频调查",
      query: "我需要仓库拍照/视频帮我确认异常包裹情况。",
    },
    candidateSeed: [],
  });
  const photoRecommendation = photoIntentFiltered.filteredRecommendation as Record<string, unknown> | undefined;
  const photoPrimary = photoRecommendation?.primaryRecommendation as Record<string, unknown> | undefined;
  if (photoRecommendation?.outputPath !== "recommendation_ready" || photoPrimary?.vascCode !== "VASC202411271721537") {
    fail("value-add-product-recommendation must seed photo/video VASC when PHOTO/VIDEO intent is explicit");
  }

  const statusQuestionFiltered = runNode(path.join(base, "filter-by-constraints.ts"), {
    recommendationInput: { customerActionIntent: "QUERY_SUBMITTED_VALUE_ADD_STATUS" },
    candidateSeed: [{ vascCode: "VASC202407031503503", vascName: "origin order", active: true }],
  });
  const statusRecommendation = statusQuestionFiltered.filteredRecommendation as Record<string, unknown> | undefined;
  if (statusRecommendation?.outputPath !== "handoff_to_order_status") {
    fail("value-add-product-recommendation status queries must hand off to value-add-order-status instead of recommending VASC");
  }

  const statusExceptionFiltered = runNode(path.join(base, "filter-by-constraints.ts"), {
    recommendationInput: {
      query: "Package barcode status exception, customer wants original inbound order shelve recommendation",
      customerActionIntent: "USE_ORIGIN_INBOUND_ORDER",
    },
    candidateSeed: [{ vascCode: "VASC202407031503503", vascName: "原单上架", active: true }],
  });
  const statusExceptionRecommendation = statusExceptionFiltered.filteredRecommendation as Record<string, unknown> | undefined;
  const statusExceptionPrimary = statusExceptionRecommendation?.primaryRecommendation as Record<string, unknown> | undefined;
  if (
    statusExceptionRecommendation?.outputPath === "handoff_to_order_status" ||
    statusExceptionPrimary?.vascCode !== "VASC202407031503503"
  ) {
    fail("value-add-product-recommendation must not treat generic status-exception wording as submitted value-add order status query");
  }

  const handoffOutput = runNode(path.join(base, "format-output.ts"), {
    filteredRecommendation: {
      outputPath: "handoff_to_order_status",
      handoffExpertId: "value-add-order-status",
      primaryRecommendation: null,
      recommendedVascCandidates: [],
    },
    analysisResult: { analysis: "" },
  });
  const handoffStructured = handoffOutput.structured as Record<string, unknown> | undefined;
  if (
    handoffStructured?.outputPath !== "handoff_to_order_status" ||
    handoffStructured?.handoffExpertId !== "value-add-order-status" ||
    !String(handoffOutput.analysis || "").includes("value-add-order-status")
  ) {
    fail("value-add-product-recommendation format-output must preserve order-status handoff in structured output and analysis");
  }

  const mismatchOutput = runNode(path.join(base, "format-output.ts"), {
    recommendationInput: { customerActionIntent: "USE_NEW_INBOUND_ORDER_CUSTOMER_CREATED" },
    filteredRecommendation: {
      outputPath: "recommendation_ready",
      primaryRecommendation: { vascCode: "VASC202407161056217", vascName: "新单上架（客户创建）" },
      recommendedVascCandidates: [{ vascCode: "VASC202407161056217", vascName: "新单上架（客户创建）" }],
    },
    analysisResult: { analysis: "建议使用 VASC202407031503503 原单上架。" },
  });
  if (
    !String(mismatchOutput.analysis || "").includes("VASC202407161056217") ||
    String(mismatchOutput.analysis || "").includes("VASC202407031503503")
  ) {
    fail("value-add-product-recommendation format-output must keep analysis aligned with structured primaryRecommendation");
  }

  const semanticMismatchOutput = runNode(path.join(base, "format-output.ts"), {
    recommendationInput: { customerActionIntent: "USE_NEW_INBOUND_ORDER_CUSTOMER_CREATED" },
    filteredRecommendation: {
      outputPath: "recommendation_ready",
      primaryRecommendation: { vascCode: "VASC202407161056217", vascName: "新单上架（客户创建）" },
      recommendedVascCandidates: [{ vascCode: "VASC202407161056217", vascName: "新单上架（客户创建）" }],
    },
    analysisResult: { analysis: "建议客户使用原单上架，并继续原入库单处理。" },
  });
  if (
    !String(semanticMismatchOutput.analysis || "").includes("VASC202407161056217") ||
    String(semanticMismatchOutput.analysis || "").includes("原单上架")
  ) {
    fail("value-add-product-recommendation format-output must remove semantic analysis conflicts with structured primaryRecommendation");
  }
}

function checkValueAddServiceConfigBehavior() {
  const base = path.join("experts", "value-add", "value-add-service-config", "nodes");
  const serviceWorkflow = readJson(path.join(repoRoot, "experts", "value-add", "value-add-service-config", "workflow.json")) as
    | { nodes?: Array<{ id?: string; inputs?: string[] }> }
    | null;
  const serviceWorkflowNodes = Array.isArray(serviceWorkflow?.nodes) ? serviceWorkflow.nodes : [];
  const applyNode = serviceWorkflowNodes.find((node) => node.id === "apply-atom-selectability-rules");
  if (!applyNode?.inputs?.includes("serviceOrchestrationKb")) {
    fail("value-add-service-config apply-atom-selectability-rules must consume serviceOrchestrationKb");
  }

  const noRuleEvidence = runNode(path.join(base, "apply-atom-selectability-rules.ts"), {
    serviceConfigInput: { vascCode: "VASC001", serviceIntent: "确认服务项" },
    serviceOrchestrationKb: "",
    kbAtomSelectability: "有配置说明但没有可解析的服务项规则",
    fieldEvidenceKb: "",
  });
  const configEvidence = noRuleEvidence.configEvidence as Record<string, unknown> | undefined;
  const pending = configEvidence?.pendingRuleEvidence as unknown[] | undefined;
  if (!Array.isArray(pending) || pending.length === 0) {
    fail("value-add-service-config apply-atom-selectability-rules must keep pending evidence when no rules are parsed");
  }

  const missingVascValidation = runNode(path.join(base, "validate-input.ts"), {
    serviceIntent: "确认服务项",
  });
  const rawServiceConfigInput = missingVascValidation.rawServiceConfigInput as Record<string, unknown> | undefined;
  const validationResult = missingVascValidation.validationResult as Record<string, unknown> | undefined;
  const resolvedMissing = runNode(path.join(base, "resolve-vasc-context.ts"), {
    rawServiceConfigInput,
    validationResult,
  });
  const serviceConfigInput = resolvedMissing.serviceConfigInput as Record<string, unknown> | undefined;
  if (serviceConfigInput?.outputPath !== "missing_vasc") {
    fail("value-add-service-config must preserve missing_vasc outputPath after resolve-vasc-context");
  }

  const appliedMissingVasc = runNode(path.join(base, "apply-atom-selectability-rules.ts"), {
    serviceConfigInput,
    serviceOrchestrationKb: "",
    kbAtomSelectability: "",
    fieldEvidenceKb: "",
  });
  const appliedMissingEvidence = appliedMissingVasc.configEvidence as Record<string, unknown> | undefined;
  if (appliedMissingEvidence?.outputPath !== "missing_vasc") {
    fail("value-add-service-config apply-atom-selectability-rules must preserve missing_vasc from serviceConfigInput");
  }

  const conditional = runNode(path.join(base, "compose-conditional-config.ts"), {
    configEvidence: { pendingRuleEvidence: [], outputPath: "missing_vasc" },
  });
  const conditionalEvidence = conditional.conditionalConfigEvidence as Record<string, unknown> | undefined;
  if (conditionalEvidence?.outputPath !== "missing_vasc") {
    fail("value-add-service-config compose-conditional-config must preserve missing_vasc");
  }

  const committed = runNode(path.join(base, "compose-committed-config.ts"), {
    conditionalConfigEvidence: { outputPath: "missing_vasc" },
  });
  const committedEvidence = committed.configEvidence as Record<string, unknown> | undefined;
  if (committedEvidence?.outputPath !== "missing_vasc") {
    fail("value-add-service-config compose-committed-config must preserve missing_vasc");
  }

  const orchestrationKb = fs.readFileSync(
    path.join(repoRoot, "experts", "value-add", "value-add-service-config", "prompts", "kb-service-orchestration.md"),
    "utf8"
  );
  const atomKb = fs.readFileSync(
    path.join(repoRoot, "experts", "value-add", "value-add-service-config", "prompts", "kb-atom-selectability.md"),
    "utf8"
  );
  const originConfig = runNode(path.join(base, "apply-atom-selectability-rules.ts"), {
    serviceConfigInput: {
      vascCode: "VASC202407031503503",
      vascName: "origin order",
      scenarioConditions: { objectLevel: "package_or_product" },
    },
    serviceOrchestrationKb: orchestrationKb,
    kbAtomSelectability: atomKb,
    fieldEvidenceKb: "",
  });
  const originEvidence = originConfig.configEvidence as Record<string, unknown> | undefined;
  const selectable = originEvidence?.selectableServiceItems as Array<Record<string, unknown>> | undefined;
  const selectableCodes = new Set((selectable ?? []).map((item) => String(item.serviceItemCode ?? item.atomCode ?? "")));
  for (const code of ["OW01V1561", "OW01V1559", "OW01V1558", "OW01V1572", "OW01V1825", "OW01V1573", "OW01V1560"]) {
    if (!selectableCodes.has(code)) {
      fail(`value-add-service-config must expose ${code} for VASC202407031503503`);
    }
  }

  const newOrderConfig = runNode(path.join(base, "apply-atom-selectability-rules.ts"), {
    serviceConfigInput: {
      vascCode: "VASC202407161056217",
      scenarioConditions: { objectLevel: "package_or_product" },
    },
    serviceOrchestrationKb: orchestrationKb,
    kbAtomSelectability: atomKb,
    fieldEvidenceKb: "",
  });
  const newOrderEvidence = newOrderConfig.configEvidence as Record<string, unknown> | undefined;
  const newOrderSelectable = newOrderEvidence?.selectableServiceItems as Array<Record<string, unknown>> | undefined;
  const newOrderCodes = new Set((newOrderSelectable ?? []).map((item) => String(item.serviceItemCode ?? item.atomCode ?? "")));
  for (const code of ["OW01V1561", "OW01V1560", "OW01V1558", "OW01V1559"]) {
    if (!newOrderCodes.has(code)) {
      fail(`value-add-service-config must preserve empty mutexGroup columns and expose ${code} for VASC202407161056217`);
    }
  }

  const inactiveConfig = runNode(path.join(base, "apply-atom-selectability-rules.ts"), {
    serviceConfigInput: {
      vascCode: "VASC202407031507376",
      scenarioConditions: { objectLevel: "product" },
    },
    serviceOrchestrationKb: orchestrationKb,
    kbAtomSelectability: atomKb,
    fieldEvidenceKb: "",
  });
  const inactiveEvidence = inactiveConfig.configEvidence as Record<string, unknown> | undefined;
  const inactiveSelectable = inactiveEvidence?.selectableServiceItems as Array<Record<string, unknown>> | undefined;
  const inactiveBlockedClaims = inactiveEvidence?.blockedClaims as string[] | undefined;
  if (
    inactiveEvidence?.outputPath !== "inactive_vasc" ||
    (Array.isArray(inactiveSelectable) && inactiveSelectable.length > 0) ||
    !Array.isArray(inactiveBlockedClaims) ||
    !inactiveBlockedClaims.some((claim) => claim.includes("inactive") || claim.includes("不承诺当前可下单"))
  ) {
    fail("value-add-service-config inactive VASC must be explicit and must not look like committed selectable config");
  }

  const dependencyConfig = runNode(path.join(base, "apply-atom-selectability-rules.ts"), {
    serviceConfigInput: {
      vascCode: "VASC202407031503503",
      scenarioConditions: { atomCode: "OW01V1561", selectedAtoms: ["OW01V1561"], objectLevel: "product" },
    },
    serviceOrchestrationKb: orchestrationKb,
    kbAtomSelectability: atomKb,
    fieldEvidenceKb: "",
  });
  const dependencyEvidence = dependencyConfig.configEvidence as Record<string, unknown> | undefined;
  const dependencyBlocked = dependencyEvidence?.blockedServiceItems as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(dependencyBlocked) || !dependencyBlocked.some((item) => item.atomCode === "OW01V1561")) {
    fail("value-add-service-config must explain OW01V1561 dependency when selected without OW01V1558/OW01V1559");
  }

  const disabledConfig = runNode(path.join(base, "apply-atom-selectability-rules.ts"), {
    serviceConfigInput: {
      vascCode: "VASC202407031503503",
      scenarioConditions: { atomCode: "OW01V1572", isEventVa: false, thirdPartyBarcodeMissing: true, objectLevel: "product" },
    },
    serviceOrchestrationKb: orchestrationKb,
    kbAtomSelectability: atomKb,
    fieldEvidenceKb: "",
  });
  const disabledEvidence = disabledConfig.configEvidence as Record<string, unknown> | undefined;
  const disabledBlocked = disabledEvidence?.blockedServiceItems as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(disabledBlocked) || !disabledBlocked.some((item) => item.atomCode === "OW01V1572")) {
    fail("value-add-service-config must explain OW01V1572 disabled conditions");
  }

  const jsonFenceOutput = runNode(path.join(base, "format-output.ts"), {
    configEvidence: {
      outputPath: "committed",
      vasc: { vascCode: "VASC202407031503503", vascName: "原单上架" },
    },
    analysisResult: {
      analysis: "```json\n{\"structured\":{\"outputPath\":\"committed\"},\"analysis\":\"选择 OW01V1561 时，需要同时选择 OW01V1558 或 OW01V1559。\"}\n```",
    },
  });
  if (
    String(jsonFenceOutput.analysis || "").includes("```json") ||
    !String(jsonFenceOutput.analysis || "").includes("OW01V1558")
  ) {
    fail("value-add-service-config format-output must parse JSON fenced LLM output instead of exposing it as analysis");
  }

  const malformedJsonFenceOutput = runNode(path.join(base, "format-output.ts"), {
    configEvidence: {
      outputPath: "committed",
      vasc: { vascCode: "VASC202407031503503", vascName: "原单上架" },
    },
    analysisResult: {
      analysis:
        "```json\n{\"structured\":{\"outputPath\":\"committed\",\"broken\":},\"analysis\":\"当前 VASC 为原单上架，选择 OW01V1561 时，需要同时选择 OW01V1558 或 OW01V1559。\"}\n```",
    },
  });
  if (
    String(malformedJsonFenceOutput.analysis || "").includes("```json") ||
    !String(malformedJsonFenceOutput.analysis || "").includes("OW01V1561")
  ) {
    fail("value-add-service-config format-output must extract analysis from malformed JSON fenced LLM output");
  }
}

const actualExperts = fs.existsSync(expertRoot)
  ? fs
      .readdirSync(expertRoot)
      .filter((entry) => fs.statSync(path.join(expertRoot, entry)).isDirectory())
      .filter((entry) => fs.existsSync(path.join(expertRoot, entry, "manifest.json")))
  : [];

for (const expertId of actualExperts) {
  if (!expectedExperts.has(expertId)) {
    fail(`unexpected value-add expert directory: ${expertId}`);
  }
  const dir = path.join(expertRoot, expertId);

  for (const required of [
    "manifest.json",
    "design.md",
    "workflow.json",
    "nodes",
    "prompts",
    "coze.config.yml",
  ]) {
    if (!fs.existsSync(path.join(dir, required))) {
      fail(`${expertId} missing ${required}`);
    }
  }

  const manifestPath = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestPath)) continue;

  const manifest = readJson(manifestPath) as Record<string, any> | null;
  if (!manifest) continue;
  if (manifest.id !== expertId) {
    fail(`${expertId} manifest.id must equal directory name`);
  }
  if (manifest.domain !== "value-add") {
    fail(`${expertId} manifest.domain must be value-add`);
  }
  if (!String(manifest.description || "").includes("Use when")) {
    fail(`${expertId} description must include Use when`);
  }

  const inputProps = Object.keys(manifest.inputSchema?.properties || {});
  for (const key of inputProps) {
    if (reservedInputFields.has(key)) {
      fail(`${expertId} inputSchema contains reserved field ${key}`);
    }
  }

  const outputProps = Object.keys(manifest.outputSchema?.properties || {});
  for (const key of ["structured", "analysis"]) {
    if (!outputProps.includes(key)) {
      fail(`${expertId} outputSchema missing ${key}`);
    }
  }
  if (outputProps.includes("outputContext")) {
    fail(`${expertId} outputSchema must not contain outputContext`);
  }
  if (!inputProps.includes("enrichedContext")) {
    fail(`${expertId} inputSchema missing enrichedContext`);
  }

  const workflowPath = path.join(dir, "workflow.json");
  if (!fs.existsSync(workflowPath)) continue;

  const workflow = readJson(workflowPath);
  const nodes = asNodeArray(workflow);
  const ids = new Set(nodes.map((node) => node.id));
  if (!ids.has("format-output")) {
    fail(`${expertId} workflow missing format-output`);
  }
  for (const requiredNodeId of requiredWorkflowNodes[expertId] ?? []) {
    if (!ids.has(requiredNodeId)) {
      fail(`${expertId} workflow missing design node: ${requiredNodeId}`);
    }
  }

  if (expertId === "value-add-product-recommendation") {
    const configPath = path.join(dir, "coze.config.yml");
    const workflowText = fs.readFileSync(workflowPath, "utf8");
    const configText = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
    if (/kbProductRecommendation|kb-product-recommendation/i.test(workflowText + "\n" + configText)) {
      fail(`${expertId} must not reference deprecated kb-product-recommendation slice`);
    }
  }

  checkNodeFiles(expertId, dir, nodes);
  checkLlmDeclarations(expertId, dir, nodes);
  checkCozeConfigRefs(expertId, dir, nodes);
  checkGeneratedCozeNodeOutputs(expertId, dir, nodes);
  checkGeneratedCozeLlmPromptsIncludeInputs(expertId, dir, nodes);
}

for (const expertId of expectedExperts) {
  if (!actualExperts.includes(expertId)) {
    fail(`missing expected value-add expert directory: ${expertId}`);
  }
}

checkValueAddOrderStatusBehavior();
checkValueAddExceptionDiagnosisBehavior();
checkValueAddProductRecommendationBehavior();
checkValueAddServiceConfigBehavior();

if (failed) process.exit(1);
console.log("Value-add expert contracts OK");
