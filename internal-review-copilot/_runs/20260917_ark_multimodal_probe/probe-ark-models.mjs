/**
 * 探测火山方舟：本密钥能调哪些模型、文本/看图是否通。
 * 密钥只从环境变量 ARK_API_KEY 读，不写进仓库。
 *
 *   $env:ARK_API_KEY="ark-..."
 *   node probe-ark-models.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const KEY = (process.env.ARK_API_KEY || "").trim();
const BASE = "https://ark.cn-beijing.volces.com/api/v3";
const SAMPLE_IMAGE = "https://ark-project.tos-cn-beijing.ivolces.com/images/view.jpeg";

if (!KEY) {
  console.error("missing ARK_API_KEY");
  process.exit(2);
}

const MODEL_CANDIDATES = [
  "doubao-seed-2-0-lite",
  "doubao-seed-2-0-lite-260215",
  "doubao-seed-2-0-lite-260428",
  "doubao-seed-2-0-pro",
  "doubao-seed-2-0-pro-260215",
  "doubao-seed-2-0-mini",
  "doubao-seed-2-0-mini-260215",
  "doubao-seed-1-6-250615",
  "doubao-seed-1-6-vision-250815",
  "doubao-1-5-vision-pro-32k-250115",
  "doubao-seed-1-6-flash-250828",
];

async function ark(path, { method = "GET", body } = {}) {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 800) };
  }
  return { status: res.status, ms: Date.now() - started, json };
}

function errMsg(json) {
  return json?.error?.message || json?.message || json?.error?.code || "";
}

async function listModels() {
  const tries = ["/models", "/endpoints?page_number=1&page_size=50"];
  const out = [];
  for (const path of tries) {
    const r = await ark(path);
    out.push({
      path,
      status: r.status,
      ms: r.ms,
      error: errMsg(r.json),
      ids: Array.isArray(r.json?.data)
        ? r.json.data.map((item) => item.id || item.model || item.name).filter(Boolean)
        : Array.isArray(r.json?.items)
          ? r.json.items.map((item) => item.id || item.endpoint_id || item.name).filter(Boolean)
          : [],
      keys: r.json && typeof r.json === "object" ? Object.keys(r.json).slice(0, 12) : [],
    });
  }
  return out;
}

async function chatText(model) {
  return ark("/chat/completions", {
    method: "POST",
    body: {
      model,
      messages: [{ role: "user", content: "只回复两个字：可用" }],
      max_tokens: 32,
      temperature: 0,
    },
  });
}

async function chatVision(model) {
  return ark("/chat/completions", {
    method: "POST",
    body: {
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "用一句话描述这张图里有什么。不要编造。" },
            { type: "image_url", image_url: { url: SAMPLE_IMAGE } },
          ],
        },
      ],
      max_tokens: 120,
      temperature: 0,
    },
  });
}

function summarizeChat(r) {
  const choice = r.json?.choices?.[0]?.message?.content;
  return {
    status: r.status,
    ms: r.ms,
    ok: r.status === 200 && Boolean(choice),
    error: errMsg(r.json),
    content: typeof choice === "string" ? choice.slice(0, 240) : "",
    usage: r.json?.usage || null,
  };
}

const report = {
  at: new Date().toISOString(),
  base: BASE,
  sampleImage: SAMPLE_IMAGE,
  list: await listModels(),
  text: [],
  vision: [],
};

for (const model of MODEL_CANDIDATES) {
  const text = summarizeChat(await chatText(model));
  report.text.push({ model, ...text });
  console.log(`text ${model} status=${text.status} ok=${text.ok} err=${text.error || "-"}`);
  await new Promise((r) => setTimeout(r, 400));
}

const visionModels = report.text.filter((row) => row.ok).map((row) => row.model);
for (const model of visionModels.length ? visionModels : MODEL_CANDIDATES.slice(0, 4)) {
  const vision = summarizeChat(await chatVision(model));
  report.vision.push({ model, ...vision });
  console.log(`vision ${model} status=${vision.status} ok=${vision.ok} err=${vision.error || "-"}`);
  await new Promise((r) => setTimeout(r, 600));
}

writeFileSync(resolve(here, "probe-raw.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`wrote ${resolve(here, "probe-raw.json")}`);
console.log(
  `text_ok=${report.text.filter((r) => r.ok).map((r) => r.model).join(",") || "(none)"} vision_ok=${report.vision.filter((r) => r.ok).map((r) => r.model).join(",") || "(none)"}`,
);
