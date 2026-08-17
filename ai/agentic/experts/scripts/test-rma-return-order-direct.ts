import * as fs from "node:fs";
import * as https from "node:https";
import { callWinitOpenApi } from "../shared/winit-openapi-call";

interface TestCaseInput {
  caseId: string;
  returnGoodsOrderNo?: string;
  outboundOrderNo?: string;
  customerCode: string;
  customerName: string;
  username: string;
  startDate?: string;
  endDate?: string;
}

interface BatchInput {
  cases: TestCaseInput[];
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

function httpsFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = typeof init?.body === "string" ? init.body : "";
    const sourceHeaders = (init?.headers ?? {}) as Record<string, string | string[] | undefined>;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(sourceHeaders)) {
      if (value != null) headers[key] = Array.isArray(value) ? value.join(", ") : String(value);
    }

    const request = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: init?.method ?? "GET",
        headers,
        timeout: 120_000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks).toString("utf8"), {
              status: response.statusCode ?? 0,
              headers: response.headers as unknown as HeadersInit,
            })
          );
        });
      }
    );
    request.on("timeout", () => request.destroy(new Error("https request timeout")));
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function parseMaybeJson(value: unknown): unknown {
  let current = value;
  for (let depth = 0; depth < 4 && typeof current === "string"; depth += 1) {
    const text = current.trim();
    if (!text) return "";
    try {
      current = JSON.parse(text) as unknown;
    } catch {
      return current;
    }
  }
  return current;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractList(raw: unknown): Record<string, unknown>[] {
  const root = asRecord(parseMaybeJson(raw));
  if (!root) return [];
  const data = asRecord(parseMaybeJson(root.data)) ?? root;
  const list = data.list;
  return Array.isArray(list) ? list.map(asRecord).filter((row): row is Record<string, unknown> => row !== null) : [];
}

function pick(row: Record<string, unknown>, key: string): unknown {
  const value = row[key];
  return value === null || value === undefined || value === "" ? undefined : value;
}

function summarizeRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    returnGoodsOrderNo: pick(row, "returnGoodsOrderNo"),
    outboundOrderNo: pick(row, "outboundOrderNo"),
    returnType: pick(row, "returnType"),
    retrunReason: pick(row, "retrunReason"),
    status: pick(row, "status"),
    warehouseCode: pick(row, "warehouseCode"),
    createDate: pick(row, "createDate"),
    completeTime: pick(row, "completeTime"),
    qtyItemNum: pick(row, "qtyItemNum"),
    orderGoodsCount: Array.isArray(row.orderGoodsList) ? row.orderGoodsList.length : 0,
    shelveGoodsCount: Array.isArray(row.shelveGoodsList) ? row.shelveGoodsList.length : 0,
  };
}

function readBatchInput(): BatchInput {
  const text = fs.readFileSync(0, "utf8").trim();
  if (!text) throw new Error("请通过 stdin 传入 JSON：{\"cases\":[...]} ");
  const parsed = JSON.parse(text) as BatchInput;
  if (!Array.isArray(parsed.cases) || parsed.cases.length === 0) {
    throw new Error("cases 必须是非空数组");
  }
  return parsed;
}

async function runCase(
  testCase: TestCaseInput,
  credentials: { signToken: string; clientId: string }
): Promise<Record<string, unknown>> {
  if (!testCase.returnGoodsOrderNo && !testCase.outboundOrderNo) {
    throw new Error(`${testCase.caseId}: returnGoodsOrderNo/outboundOrderNo 至少提供一个`);
  }
  for (const key of ["customerCode", "customerName", "username"] as const) {
    if (!testCase[key]?.trim()) throw new Error(`${testCase.caseId}: 缺少 ${key}`);
  }

  const data = {
    returnGoodsOrderNo: testCase.returnGoodsOrderNo?.trim() ?? "",
    outboundOrderNo: testCase.outboundOrderNo?.trim() ?? "",
    OderStartDatetime: testCase.startDate?.trim() || "2026-01-01",
    OderEndDatetime: testCase.endDate?.trim() || new Date().toISOString().slice(0, 10),
    pageParams: { pageNo: 1, pageSize: 50 },
  };

  const result = await callWinitOpenApi(
    {
      action: "rma.returnGoodsOrder.queryReturnOderList",
      customerCode: testCase.customerCode.trim(),
      customerName: testCase.customerName.trim(),
      username: testCase.username.trim(),
      language: "zh_CN",
      data: JSON.stringify(data),
      signToken: credentials.signToken,
      clientId: credentials.clientId,
    },
    { fetchImpl: httpsFetch }
  );

  const parsedData = parseMaybeJson(result.data);
  const rows = extractList(parsedData);
  const matchedRows = rows.filter((row) => {
    if (testCase.returnGoodsOrderNo) {
      return String(row.returnGoodsOrderNo ?? "") === testCase.returnGoodsOrderNo;
    }
    return String(row.outboundOrderNo ?? "") === testCase.outboundOrderNo;
  });

  return {
    caseId: testCase.caseId,
    query: {
      returnGoodsOrderNo: testCase.returnGoodsOrderNo,
      outboundOrderNo: testCase.outboundOrderNo,
      startDate: data.OderStartDatetime,
      endDate: data.OderEndDatetime,
    },
    code: result.code,
    msg: result.msg,
    returnedCount: rows.length,
    exactMatchCount: matchedRows.length,
    records: matchedRows.map(summarizeRow),
    rawShape:
      parsedData !== null && typeof parsedData === "object"
        ? Array.isArray(parsedData)
          ? "array"
          : Object.keys(parsedData as Record<string, unknown>)
        : typeof parsedData,
  };
}

async function main(): Promise<void> {
  const batch = readBatchInput();
  const credentials = {
    signToken: requireEnv("WINIT_OPENAPI_SIGN_TOKEN"),
    clientId: requireEnv("WINIT_OPENAPI_CLIENT_ID"),
  };
  const results = [];
  for (const testCase of batch.cases) {
    results.push(await runCase(testCase, credentials));
  }
  console.log(JSON.stringify({ action: "rma.returnGoodsOrder.queryReturnOderList", results }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
