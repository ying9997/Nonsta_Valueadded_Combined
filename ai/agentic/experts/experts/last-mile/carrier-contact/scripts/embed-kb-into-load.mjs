import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const kb = fs.readFileSync(path.join(root, "prompts", "kb.md"), "utf8");
const kbLiteral = JSON.stringify(kb);

const body = `/**
 * 节点：load-carrier-knowledge — 组装注入 LLM 的 kbMd（与 prompts/kb.md 正文一致，须同步维护）
 * FaaS 单文件闭环，无外部 import。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输出】kbMd：解析侧重前缀 + CARRIER_KB_MARKDOWN；并透传 validate 产出供 llm 使用。
 */
const CARRIER_KB_MARKDOWN: string = ${kbLiteral};

function pickHints(ec: unknown, carrierCode: string, region: string): { lines: string[]; tags: string[] } {
  const lines: string[] = [];
  const tags: string[] = [];
  const r = (region + " " + carrierCode).toUpperCase();
  if (/\\bUS\\b|UNITED STATES|USA|CALIFORNIA|LAX|\\bNY\\b/.test(r)) tags.push("US");
  if (/\\bAU\\b|AUSTRALIA|SYDNEY|MELBOURNE/.test(r)) tags.push("AU");
  if (/\\bDE\\b|GERMANY|DEUTSCH/.test(r)) tags.push("DE");
  if (/\\bUK\\b|\\bGB\\b|UNITED KINGDOM|LONDON/.test(r)) tags.push("UK");
  if (/\\bBE\\b|BELGIUM/.test(r)) tags.push("BE");
  if (ec && typeof ec === "object" && !Array.isArray(ec)) {
    const o = ec as Record<string, unknown>;
    const ch = o.carrierHints;
    if (ch && typeof ch === "object") {
      lines.push("- enrichedContext.carrierHints: " + JSON.stringify(ch).slice(0, 1200));
    }
    const tr = o.trajectories;
    if (Array.isArray(tr) && tr[0] && typeof tr[0] === "object") {
      const s = (tr[0] as { summary?: unknown }).summary;
      if (s && typeof s === "object") {
        lines.push("- trajectories[0].summary: " + JSON.stringify(s).slice(0, 800));
      }
    }
  }
  if (carrierCode) lines.push("- 入参 carrierCode: " + carrierCode);
  if (region) lines.push("- 入参 region: " + region);
  return { lines, tags };
}

function buildFocusBlock(carrierCode: string, region: string, ec: unknown): string {
  const { lines, tags } = pickHints(ec, carrierCode, region);
  return [
    "## 本次解析侧重（系统生成，非客户原文）",
    tags.length ? "- 关键词命中区域标签: " + tags.join(", ") : "- 未从 region/carrierCode 解析到国家标签（仍输出全量 KB 表供核对）",
    ...lines,
    "",
  ].join("\\n");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const query = String(params.query ?? "");
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const carrierCode = String(params.carrierCode ?? "").trim();
  const region = String(params.region ?? "").trim();
  const customerIntent = String(params.customerIntent ?? "").trim();
  const enrichedContext =
    params.enrichedContext && typeof params.enrichedContext === "object" && !Array.isArray(params.enrichedContext)
      ? params.enrichedContext
      : {};
  const inputContext =
    params.inputContext && typeof params.inputContext === "object" && !Array.isArray(params.inputContext)
      ? params.inputContext
      : {};
  const valid = params.valid === true;
  const error = String(params.error ?? "");

  const focus = buildFocusBlock(carrierCode, region, enrichedContext);
  const kbMd = focus + "\\n---\\n\\n" + CARRIER_KB_MARKDOWN;

  return {
    kbMd,
    valid,
    error,
    query,
    trackingIds,
    carrierCode,
    region,
    customerIntent,
    enrichedContext,
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-carrier-knowledge")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
`;

const outPath = path.join(root, "nodes", "load-carrier-knowledge.ts");
fs.writeFileSync(outPath, body);
console.log("Wrote", outPath, body.length);
