import * as https from "node:https";
import { callWinitOpenApi } from "../shared/winit-openapi-call";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`缺少环境变量 ${name}（请在 .env 中配置，参考 .env.example）`);
  }
  return v;
}

/** Node 全局 fetch 在本机对 cobra 易触发 ~10s 连接超时，测试改用 https 长超时 */
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

async function main(): Promise<void> {
  const signToken = requireEnv("WINIT_OPENAPI_SIGN_TOKEN");
  const clientId = requireEnv("WINIT_OPENAPI_CLIENT_ID");

  const input = {
    action: "tail.claim.ai.v1.gateway",
    customerCode: "19304963",
    customerName: "1",
    data: '{"data":{"pageVo":{"page":"1","pageSize":"20"}},"service":"TailTrace.getList","sort":"asc","sortColumn":""}',
    username: "winit-api-havn@basic3pl.com",
    language: "",
    signToken,
    clientId,
  };

  const result = await callWinitOpenApi(input, { fetchImpl: httpsFetch });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
