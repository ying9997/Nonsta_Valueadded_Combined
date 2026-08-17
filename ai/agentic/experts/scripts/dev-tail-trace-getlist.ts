/**
 * 本地直连 cobra：按出库单号查询 TailTrace.getList（网关 tail.claim.ai.v1.gateway）。
 *
 * 用法（需 .env 中 WINIT_OPENAPI_SIGN_TOKEN、WINIT_OPENAPI_CLIENT_ID）：
 *   npx ts-node -P scripts/tsconfig.json -r dotenv/config scripts/dev-tail-trace-getlist.ts <orderNo> <customerCode> <username> [customerName]
 *
 * 示例：
 *   npx ts-node -P scripts/tsconfig.json -r dotenv/config scripts/dev-tail-trace-getlist.ts WO11339226543 18146417 "1144249040@qq.com"
 */

import * as https from "node:https";
import { callWinitOpenApi } from "../shared/winit-openapi-call";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`缺少环境变量 ${name}（请在 .env 中配置，参考 .env.example）`);
  }
  return v;
}

function httpsFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = typeof init?.body === "string" ? init.body : "";
    const headers = (init?.headers ?? {}) as Record<string, string | string[] | undefined>;
    const flatHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (v == null) continue;
      flatHeaders[k] = Array.isArray(v) ? v.join(", ") : String(v);
    }

    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        method: init?.method ?? "GET",
        headers: flatHeaders,
        timeout: 120_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve(
            new Response(text, {
              status: res.statusCode ?? 0,
              headers: res.headers as unknown as HeadersInit,
            })
          );
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("https request timeout"));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function buildTailTraceGetListPayload(orderNo: string): string {
  const inner = {
    pageVo: { page: 1, pageSize: 20 },
    order: [{ name: "applicationTime", dir: "desc" }],
    serialNumber: "",
    orderNo,
    trackingNo: "",
    shippingNo: "",
    checkingStatus: "",
    applicationTimeStart: "",
    applicationTimeEnd: "",
    endTimeStart: "",
    endTimeEnd: "",
    outWhTimeStart: "",
    outWhTimeEnd: "",
  };
  const payload = {
    service: "TailTrace.getList",
    data: inner,
    sort: "asc",
    sortColumn: "",
  };
  return JSON.stringify(payload);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const orderNo = argv[0];
  const customerCode = argv[1];
  const username = argv[2];
  const customerName = argv[3] ?? "1";

  if (!orderNo || !customerCode || !username) {
    console.error(
      "用法: ts-node ... dev-tail-trace-getlist.ts <orderNo> <customerCode> <username> [customerName]"
    );
    process.exit(1);
  }

  const signToken = requireEnv("WINIT_OPENAPI_SIGN_TOKEN");
  const clientId = requireEnv("WINIT_OPENAPI_CLIENT_ID");

  const data = buildTailTraceGetListPayload(orderNo.trim());

  const input = {
    action: "tail.claim.ai.v1.gateway",
    customerCode: customerCode.trim(),
    customerName: customerName.trim(),
    data,
    username: username.trim(),
    language: "",
    signToken,
    clientId,
  };

  console.error(`TailTrace.getList 请求 orderNo=${orderNo} customerCode=${customerCode}`);
  const result = await callWinitOpenApi(input, { fetchImpl: httpsFetch });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
