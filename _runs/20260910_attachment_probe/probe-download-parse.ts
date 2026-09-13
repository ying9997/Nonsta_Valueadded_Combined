/**
 * One-off probe: can TOM Cookie download OMS VAS attachments, and what fields
 * do typical Excel templates actually fill?
 *
 * Does not modify pipeline code.
 *
 *   npx tsx _runs/20260910_attachment_probe/probe-download-parse.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createTomClient, defaultTomCookiePath, type TomClient } from "../../internal-review-copilot/lib/oms-tom-client.ts";
import { asArray, asRecord, asText, ATTACHMENT_BY_FILE_TYPE } from "../../internal-review-copilot/lib/oms-adapter.ts";
import { loadEnvFiles, projectDir } from "../../internal-review-copilot/lib/env.ts";

const OMS = "https://cnomstom.winit.com.cn";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
const FMS_HOSTS = [
  "https://cnfmsstream.winit.com.cn",
  "https://usfmsstream.winit.com.cn",
  "https://eufmsstream.winit.com.cn",
];

const here = dirname(fileURLToPath(import.meta.url));
const OUT = here;
const DOWNLOADED = resolve(OUT, "downloaded");

type FileSlot = "操作说明附件" | "商品和标签的对应关系" | "包裹和标签的对应关系" | "标签文件";

interface Target {
  orderNo: string;
  wantType: string;
  slot: FileSlot;
  preferName?: RegExp;
  fallbackUrl?: string;
  fallbackName?: string;
}

interface DownloadedFile {
  orderNo: string;
  slot: FileSlot;
  fileType: string;
  fileName: string;
  sourceUrl: string;
  via: string;
  bytes: number;
  sniff: string;
  ok: boolean;
  error?: string;
  savedAs?: string;
  status?: number;
  finalUrlHost?: string;
}

interface ParsedSheet {
  orderNo: string;
  slot: FileSlot;
  fileName: string;
  savedAs: string;
  sheetName: string;
  sheetNames: string[];
  headers: string[];
  rowCount: number;
  preview: string[][];
  filledHeaders: string[];
  emptyHeaders: string[];
}

const TARGETS: Target[] = [
  {
    orderNo: "VASC000000360126",
    wantType: "VAS_ATTR_REL_AOOI",
    slot: "操作说明附件",
    preferName: /辨识|操作说明/,
    fallbackName: "上架前辨识需求提交模板+(1) (1).xlsx",
    fallbackUrl: "5f806252f8af41ab83f96ddd9d2e5504/2026/09/10/5348dd8c0ca4409a8d9fe167b0343e85.xlsx",
  },
  {
    orderNo: "VASC000000360663",
    wantType: "VAS_ATTR_REL_AOOI",
    slot: "操作说明附件",
    preferName: /辨识|操作说明/,
    fallbackName: "库内辨识需求提交模板 (2) (1).xlsx",
    fallbackUrl: "7118d44aa4e04f3585eccb68faa9009b/2026/09/11/2618fd23471040d199382eaf22db14fd.xlsx",
  },
  {
    orderNo: "VASC000000360423",
    wantType: "VAS_ATTR_REL_AOOI",
    slot: "操作说明附件",
    preferName: /辨识|操作说明/,
    fallbackName: "库内辨识需求提交模板.xlsx",
    fallbackUrl: "1c4c83b3478b4ff988048b015a451a71/2026/09/10/55a22309cfce403891d05d2409e9fcbd.xlsx",
  },
  {
    orderNo: "VASC000000355548",
    wantType: "VAS_ATTR_REL_TCRBCAL",
    slot: "商品和标签的对应关系",
    preferName: /商品和标签/,
    fallbackName: "【商品和标签对应关系】模板 (3).xlsx",
    fallbackUrl: "5b43a6125e2b496ea7ba4e25d9ccfe51/2026/09/07/0b6f48c040664bc6a1e86d0867eea68d.xlsx",
  },
  {
    orderNo: "VASC000000355680",
    wantType: "VAS_ATTR_REL_TCRBCAL",
    slot: "商品和标签的对应关系",
    fallbackName: "上传商品标签.xlsx",
    fallbackUrl: "fc727ef64b9646ddb95ae90ef9cb062a/2026/09/07/b52727eb70824d31a6f49d488d317606.xlsx",
  },
  {
    orderNo: "VASC000000290832",
    wantType: "VAS_ATTR_REL_TCRBCAL",
    slot: "商品和标签的对应关系",
    preferName: /商品和标签/,
    fallbackName: "【商品和标签对应关系】.xlsx",
    fallbackUrl: "51c49e1eedc44e048851048fcf507e27/2026/06/01/74350fcb57e247809157ad6dd1e097b3.xlsx",
  },
  {
    orderNo: "VASC000000362139",
    wantType: "TRPP",
    slot: "包裹和标签的对应关系",
    preferName: /包裹和标签/,
    fallbackName: "【包裹和标签的对应关系】模板.xlsx",
    fallbackUrl: "87cbda0dbe6c41cb886c089e9f823b02/2026/09/11/54edfebd3b2542f38ce64e5db7d9b625.xlsx",
  },
  {
    orderNo: "VASC000000362007",
    wantType: "TRPP",
    slot: "包裹和标签的对应关系",
    preferName: /包裹和标签/,
    fallbackName: "【包裹和标签的对应关系】模板.xlsx",
    fallbackUrl: "dd22413ba34749f8a057c94f3a76339f/2026/09/11/07b25b6ce1fc4f8bab9c1e70a1780d5f.xlsx",
  },
  {
    orderNo: "VASC000000360093",
    wantType: "TRPP",
    slot: "包裹和标签的对应关系",
    fallbackName: "异常单号EB0126081932331162对应的包裹条码.xlsx",
    fallbackUrl: "750a8e1655e24550a322b9624ce97de0/2026/09/10/16a8c0ff5f904cfabd0868aa6cc9a7ea.xlsx",
  },
  {
    orderNo: "VASC000000315774",
    wantType: "VAS_ATTR_REL_LF",
    slot: "标签文件",
    preferName: /\.pdf|\.pdf$/i,
    fallbackName: "Order (52).pdf",
    fallbackUrl: "2da4921a351948b6b6dcb090feb192fe/2026/07/14/cae35789d02740e4aedb6968cc92e56d.pdf",
  },
  {
    orderNo: "VASC000000311652",
    wantType: "VAS_ATTR_REL_LF",
    slot: "标签文件",
    preferName: /\.pdf/i,
    fallbackName: "Order (56).pdf",
    fallbackUrl: "66545a320f654b8f87f1b07765795570/2026/07/06/d578cd7fe0e343e580d555bdab876cd9.pdf",
  },
];

function cookieHeader(raw: unknown): string {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw).cookies)
      ? (asRecord(raw).cookies as unknown[])
      : [];
  return list
    .map(asRecord)
    .filter((c) => asText(c.name) && asText(c.value))
    .map((c) => `${asText(c.name)}=${asText(c.value)}`)
    .join("; ");
}

function loadCookie(): string {
  const path = defaultTomCookiePath();
  if (!existsSync(path)) throw new Error(`Cookie 不存在：${path}`);
  const header = cookieHeader(JSON.parse(readFileSync(path, "utf8")));
  if (!header) throw new Error(`Cookie 为空：${path}`);
  return header;
}

function sniff(buf: Buffer): string {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return "application/zip-or-xlsx";
  if (buf.length >= 8 && buf[0] === 0xd0 && buf[1] === 0xcf) return "application/vnd.ms-excel";
  const head = buf.subarray(0, Math.min(200, buf.length)).toString("utf8").toLowerCase();
  if (head.includes("<html") || head.trim().startsWith("{") || head.includes("unauthorized")) return "text/html-or-json";
  return "application/octet-stream";
}

function isReadable(buf: Buffer, kind: string): boolean {
  if (buf.length < 64) return false;
  if (kind === "text/html-or-json") return false;
  return (
    kind.startsWith("image/") ||
    kind === "application/pdf" ||
    kind === "application/zip-or-xlsx" ||
    kind === "application/vnd.ms-excel"
  );
}

function safeName(orderNo: string, slot: string, fileName: string): string {
  const short = orderNo.replace(/^VASC0+/, "VASC");
  const slotTag =
    slot === "操作说明附件"
      ? "操作说明"
      : slot === "商品和标签的对应关系"
        ? "商品标签对应"
        : slot === "包裹和标签的对应关系"
          ? "包裹标签对应"
          : "标签文件";
  const ext = (fileName.match(/\.[A-Za-z0-9]{2,5}$/) || [".bin"])[0];
  const raw = `${short}_${slotTag}_${fileName}`.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");
  return raw.length > 140 ? `${short}_${slotTag}${ext}` : raw;
}

function expandUrls(raw: string, warehouseCode = ""): string[] {
  const url = asText(raw);
  if (!url) return [];
  if (/^https?:\/\//i.test(url)) return [url];
  const path = url.replace(/^\/+/, "");
  const preferred = warehouseHost(warehouseCode);
  const hosts = preferred ? [preferred, ...FMS_HOSTS.filter((h) => h !== preferred)] : FMS_HOSTS;
  return hosts.map((h) => `${h}/${path}`);
}

function warehouseHost(code: string): string {
  const c = code.toUpperCase();
  if (c.startsWith("US") || c.startsWith("AU") || c.startsWith("UK")) return "https://usfmsstream.winit.com.cn";
  if (c.startsWith("DE") || c.startsWith("EU") || c.startsWith("EW") || c.startsWith("NL") || c.startsWith("FR") || c.startsWith("IT")) {
    return "https://eufmsstream.winit.com.cn";
  }
  if (c.startsWith("CN") || c.startsWith("HK")) return "https://cnfmsstream.winit.com.cn";
  return "";
}

function proxyUrl(fileUrl: string): string {
  return `${OMS}/VasOrder/fmsFileDownload/?url=${encodeURIComponent(fileUrl)}`;
}

async function binaryGet(
  url: string,
  cookie: string,
  useCookie: boolean,
): Promise<{ status: number; buf: Buffer; finalUrl: string }> {
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (useCookie) {
      headers.Cookie = cookie;
      headers.Referer = `${OMS}/VasOrder/index`;
    }
    const res = await fetch(url, { method: "GET", headers, redirect: "follow" });
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, buf, finalUrl: res.url };
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
  }
}

async function postForm(
  url: string,
  cookie: string,
  body: Record<string, string>,
): Promise<{ status: number; text: string }> {
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookie,
        Referer: `${OMS}/VasOrder/index`,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: new URLSearchParams(body).toString(),
      redirect: "follow",
    });
    return { status: res.status, text: await res.text() };
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
  }
}

function listFiles(atom: Record<string, unknown>): Array<Record<string, string>> {
  return asArray(atom.vaAtomFiles)
    .map(asRecord)
    .map((f) => ({
      fileType: asText(f.fileType) || asText(f.type),
      fileName: asText(f.fileName) || asText(f.name),
      url: asText(f.url) || asText(f.fileUrl) || asText(f.filePath) || asText(f.objectURI),
      type: asText(f.type),
      label: ATTACHMENT_BY_FILE_TYPE[asText(f.fileType) || asText(f.type)] || "",
    }))
    .filter((f) => f.fileName || f.url);
}

function pickFile(
  files: Array<Record<string, string>>,
  target: Target,
): Record<string, string> | null {
  const typed = files.filter((f) => f.fileType === target.wantType || f.type === target.wantType);
  const byName = target.preferName ? typed.filter((f) => target.preferName!.test(f.fileName)) : typed;
  const pool = byName.length ? byName : typed;
  const excelFirst = pool.find((f) => /\.xls/i.test(f.fileName) || /\.xls/i.test(f.url));
  if (excelFirst) return excelFirst;
  if (pool[0]) return pool[0];
  if (target.fallbackUrl) {
    return {
      fileType: target.wantType,
      fileName: target.fallbackName || target.fallbackUrl.split("/").pop() || "file.bin",
      url: target.fallbackUrl,
      type: target.wantType,
      label: target.slot,
    };
  }
  return null;
}

function htmlHits(html: string): Record<string, unknown> {
  const hrefs = [...html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]).slice(0, 40);
  const downloadHrefs = hrefs.filter((h) => /fms|download|upload|\.xlsx|\.pdf|\.jpg|\.jpeg|\.png/i.test(h));
  const dataFileUrl = [...html.matchAll(/data-file-url=["']([^"']+)["']/gi)].map((m) => m[1]);
  const dataDownload = [...html.matchAll(/data-download=["']([^"']+)["']/gi)].map((m) => m[1]);
  const fms = [...html.matchAll(/https?:\/\/[a-z]+fmsstream\.winit\.com\.cn\/[^"'\\\s<>]+/gi)].map((m) => m[0]);
  const proxy = [...html.matchAll(/\/[A-Za-z]+\/fmsFileDownload\/\?url=[^"'\\\s<>]+/gi)].map((m) => m[0]);
  const fmsHost = html.match(/fms\s*:\s*"([^"]+)"/)?.[1] || "";
  const uploadHost = html.match(/upload\s*:\s*"([^"]+)"/)?.[1] || "";
  return {
    hrefCount: hrefs.length,
    downloadHrefs: downloadHrefs.slice(0, 15),
    dataFileUrl: dataFileUrl.slice(0, 10),
    dataDownload: dataDownload.slice(0, 10),
    fmsstreamUrls: fms.slice(0, 10),
    fmsFileDownloadPaths: proxy.slice(0, 10),
    hasExecuteFile: html.includes("oms_va_execute_file") || html.includes("vaAtomFiles") || html.includes("vasAtomFile"),
    fmsHost,
    uploadHost,
    inboundBatchDownloadFile: html.includes("inboundBatchDownloadFile"),
  };
}

function summarizeApi(data: Record<string, unknown>): string {
  const info = data.info;
  if (info == null) return `status=${data.status} info=null ${asText(data.info)}`;
  if (Array.isArray(info)) return `array(${info.length})`;
  const rec = asRecord(info);
  const content = asArray(rec.content);
  if (content.length) {
    const first = asRecord(content[0]);
    const keys = Object.keys(first).slice(0, 12).join(",");
    return `content[${content.length}] keys=${keys}`;
  }
  return JSON.stringify(data).slice(0, 240);
}

function maskCell(value: unknown): string {
  const s = cellText(value);
  if (!s) return "";
  if (/^=DISPIMG/i.test(s)) return "(有示例图)";
  return s.length > 48 ? `${s.slice(0, 45)}…` : s;
}

function cellText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeSectionRow(row: unknown[]): boolean {
  const texts = (row || []).map(cellText).filter(Boolean);
  if (!texts.length) return true;
  const joined = texts.join(" ");
  if (texts.length <= 3 && /客户填写|仓库填写|填写说明|操作说明/.test(joined) && !/异常单号|商品辨识方法|原包裹条码/.test(joined)) {
    return true;
  }
  return false;
}

function looksLikeHeader(row: unknown[]): boolean {
  const texts = (row || []).map(cellText).filter(Boolean);
  if (texts.length < 2) return false;
  const joined = texts.join(" ");
  return /异常单号|入库单号|商品辨识方法|是否开箱|商品编码|商品条码|包裹条码|补贴|FNSKU|标签文件名|异常类型|异常场景/.test(joined);
}

function pickHeaderRow(rows: unknown[][]): { headers: string[]; dataStart: number } {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = (rows[i] || []) as unknown[];
    if (looksLikeSectionRow(row)) continue;
    if (looksLikeHeader(row)) {
      const headers = row.map(cellText);
      let last = headers.length - 1;
      while (last > 0 && !headers[last]) last--;
      return { headers: headers.slice(0, last + 1), dataStart: i + 1 };
    }
  }
  const first = (rows[0] || []) as unknown[];
  return { headers: first.map(cellText), dataStart: 1 };
}

async function loadXlsx(): Promise<typeof import("xlsx")> {
  const localMjs = resolve(OUT, "node_modules/xlsx/xlsx.mjs");
  const spec = existsSync(localMjs) ? pathToFileURL(localMjs).href : "xlsx";
  return import(spec);
}

async function probeApis(client: TomClient, orderNo: string): Promise<Array<{ api: string; ok: boolean; note: string }>> {
  const candidates: Array<{ api: string; params: Record<string, unknown> }> = [
    { api: "oms.VaOrderService_getVasList", params: { where: { orderNo }, draw: "1", start: "0", length: "20" } },
    { api: "oms.VaOrderService_getVaAtomFileList", params: { orderNo } },
    { api: "oms.VaOrderFileService_queryPage", params: { orderNo, where: { orderNo }, draw: "1", start: "0", length: "20" } },
    { api: "oms.VaOrderService_queryVaAtomFile", params: { orderNo } },
    { api: "oms.VaAtomFileService_queryPage", params: { where: { orderNo }, draw: "1", start: "0", length: "20" } },
  ];
  const rows: Array<{ api: string; ok: boolean; note: string }> = [];
  for (const c of candidates) {
    try {
      const data = await client.ajaxProcess(c.api, c.params);
      rows.push({ api: c.api, ok: true, note: summarizeApi(data) });
    } catch (err) {
      rows.push({ api: c.api, ok: false, note: err instanceof Error ? err.message.slice(0, 240) : String(err) });
    }
  }
  return rows;
}

async function downloadOne(target: Target, file: Record<string, string>, cookie: string, warehouseCode: string): Promise<DownloadedFile> {
  const urls = expandUrls(file.url, warehouseCode);
  const attempts: string[] = [];
  for (const full of urls) {
    const via = proxyUrl(full);
    try {
      const got = await binaryGet(via, cookie, true);
      const kind = sniff(got.buf);
      attempts.push(`${via} -> ${got.status}/${kind}/${got.buf.length}`);
      if (got.status === 200 && isReadable(got.buf, kind)) {
        const name = safeName(target.orderNo, target.slot, file.fileName);
        const dest = resolve(DOWNLOADED, name);
        writeFileSync(dest, got.buf);
        return {
          orderNo: target.orderNo,
          slot: target.slot,
          fileType: file.fileType || target.wantType,
          fileName: file.fileName,
          sourceUrl: file.url,
          via,
          bytes: got.buf.length,
          sniff: kind,
          ok: true,
          savedAs: dest,
          status: got.status,
          finalUrlHost: (() => {
            try {
              return new URL(got.finalUrl).host;
            } catch {
              return "";
            }
          })(),
        };
      }
    } catch (err) {
      attempts.push(`${via} ERR ${err instanceof Error ? err.message : err}`);
    }
  }
  return {
    orderNo: target.orderNo,
    slot: target.slot,
    fileType: file.fileType || target.wantType,
    fileName: file.fileName,
    sourceUrl: file.url,
    via: attempts.join(" | "),
    bytes: 0,
    sniff: "",
    ok: false,
    error: attempts.slice(0, 6).join("\n"),
  };
}

function mdTable(headers: string[], rows: string[][]): string {
  const line = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  return [line, sep, ...rows.map((r) => `| ${r.map((c) => String(c ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
}

async function main(): Promise<void> {
  loadEnvFiles();
  mkdirSync(DOWNLOADED, { recursive: true });
  const probeOrder = "VASC000000315774";
  console.log("creating TOM client…");
  const client = await createTomClient();
  const cookie = loadCookie();

  const htmlPaths = [
    `/VasOrder/detail/orderNo/${probeOrder}`,
    `/VasOrder/detail/isFill/Y/orderNo/${probeOrder}/isView/N`,
  ];
  const htmlResults: Array<{ path: string; status: string; hits: Record<string, unknown>; snippet?: string }> = [];
  for (const path of htmlPaths) {
    try {
      const html = await client.getPage(path);
      htmlResults.push({ path, status: `ok ${html.length} chars`, hits: htmlHits(html) });
    } catch (err) {
      htmlResults.push({ path, status: err instanceof Error ? err.message : String(err), hits: {} });
    }
  }

  await client.setOrderReferer(probeOrder);
  const apiRows = await probeApis(client, probeOrder);

  let sampleFiles: Array<Record<string, string>> = [];
  try {
    const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
      where: { orderNo: probeOrder },
      draw: "1",
      start: "0",
      length: "20",
    });
    const atom = asRecord(asArray(asRecord(vas.info).content)[0]);
    sampleFiles = listFiles(atom);
  } catch (err) {
    sampleFiles = [{ error: err instanceof Error ? err.message : String(err), fileType: "", fileName: "", url: "", type: "", label: "" }];
  }

  const linkMd = `# 附件链接探测

生成时间：${new Date().toISOString()}
探测单：\`${probeOrder}\`（已知有标签文件）
Cookie：TOM 共享认证 \`${defaultTomCookiePath()}\`（经 \`oms-tom-client.ts\` 自动续期）

> 仅供探测，不改 pipeline。

## 结论（先看这里）

- **能不能下载：能。** 裸 FMS 直链会 401；必须走 OMS 代理 \`/VasOrder/fmsFileDownload/?url=\` + TOM Cookie。
- **链接格式：** \`vaAtomFiles[].url\` 常见两种：完整 \`https://{us|eu|cn}fmsstream.winit.com.cn/{uuid}/YYYY/MM/DD/{file}\`，或无域名的 objectURI（\`{uuid}/YYYY/MM/DD/{file}\`）。
- **鉴权：** FMS 直链无 token 时 401，Cookie 也没用；代理会 302 到带 \`token=\` 的签名 URL（有时效）。

## HTML 中找到的附件元素

${htmlResults
  .map(
    (r) => `### GET \`${r.path}\`
- 状态：${r.status}
- 元素类型：详情页是 SPA/模板页，附件列表不写死 \`<a href>\`，由 \`vaAtomFiles\` JSON 渲染
- 链接格式线索：\`fmsHost=${asText((r.hits as { fmsHost?: string }).fmsHost)} uploadHost=${asText((r.hits as { uploadHost?: string }).uploadHost)}\`
- data-file-url：${JSON.stringify((r.hits as { dataFileUrl?: string[] }).dataFileUrl || [])}
- data-download：${JSON.stringify((r.hits as { dataDownload?: string[] }).dataDownload || [])}
- fmsstream 直链：${JSON.stringify((r.hits as { fmsstreamUrls?: string[] }).fmsstreamUrls || [])}
- fmsFileDownload 路径：${JSON.stringify((r.hits as { fmsFileDownloadPaths?: string[] }).fmsFileDownloadPaths || [])}
- inboundBatchDownloadFile：${String((r.hits as { inboundBatchDownloadFile?: boolean }).inboundBatchDownloadFile)}
- 附件相关 DOM 线索：${String((r.hits as { hasExecuteFile?: boolean }).hasExecuteFile)}
- download-like href：${JSON.stringify((r.hits as { downloadHrefs?: string[] }).downloadHrefs || [])}
`,
  )
  .join("\n")}

### getVasList 返回的 vaAtomFiles（${probeOrder}）

${sampleFiles.length ? mdTable(
    ["fileType", "fileName", "url"],
    sampleFiles.map((f) => [f.fileType || "-", f.fileName || "-", (f.url || "").slice(0, 120)]),
  ) : "无"}

## API 探测

${mdTable(
    ["API", "成功", "返回什么"],
    apiRows.map((r) => [r.api, r.ok ? "是" : "否", r.note.replace(/\|/g, " ")]),
  )}

## 文件存储位置

- 域名：\`{us|eu|cn}fmsstream.winit.com.cn\`（按仓区；中国 TOM 页 GlobalData.fms 常是 \`cnfmsstream\`，但美国仓附件实际在 \`usfmsstream\`）
- 鉴权方式：OMS Cookie → 代理签发 FMS token；裸链无签名不可下
- 仓库批量：页面另有 \`POST /VasOrder/inboundBatchDownloadFile\`（本探测未作为主路径）
`;
  writeFileSync(resolve(OUT, "download-link-probe.md"), linkMd, "utf8");
  console.log("wrote download-link-probe.md");

  const downloads: DownloadedFile[] = [];
  const atomCache = new Map<string, { files: Array<Record<string, string>>; warehouseCode: string }>();
  for (const target of TARGETS) {
    if (!atomCache.has(target.orderNo)) {
      try {
        await client.setOrderReferer(target.orderNo);
        const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
          where: { orderNo: target.orderNo },
          draw: "1",
          start: "0",
          length: "20",
        });
        const atom = asRecord(asArray(asRecord(vas.info).content)[0]);
        const headerWh = asText(asRecord(atom.warehouse).warehouseCode);
        atomCache.set(target.orderNo, { files: listFiles(atom), warehouseCode: headerWh });
      } catch (err) {
        console.warn(`getVasList ${target.orderNo} failed:`, err);
        atomCache.set(target.orderNo, { files: [], warehouseCode: "" });
      }
    }
    const cached = atomCache.get(target.orderNo)!;
    const file = pickFile(cached.files, target);
    if (!file) {
      downloads.push({
        orderNo: target.orderNo,
        slot: target.slot,
        fileType: target.wantType,
        fileName: target.fallbackName || "",
        sourceUrl: target.fallbackUrl || "",
        via: "",
        bytes: 0,
        sniff: "",
        ok: false,
        error: "订单上没有匹配附件，且无 fallback URL",
      });
      continue;
    }
    const destGuess = resolve(DOWNLOADED, safeName(target.orderNo, target.slot, file.fileName));
    if (existsSync(destGuess) && readFileSync(destGuess).length > 64) {
      const buf = readFileSync(destGuess);
      const kind = sniff(buf);
      if (isReadable(buf, kind)) {
        console.log(`reuse ${destGuess}`);
        downloads.push({
          orderNo: target.orderNo,
          slot: target.slot,
          fileType: file.fileType || target.wantType,
          fileName: file.fileName,
          sourceUrl: file.url,
          via: "local-cache",
          bytes: buf.length,
          sniff: kind,
          ok: true,
          savedAs: destGuess,
        });
        continue;
      }
    }
    console.log(`download ${target.orderNo} ${target.slot} ${file.fileName}`);
    downloads.push(await downloadOne(target, file, cookie, cached.warehouseCode));
  }

  const downloadMd = `# 附件下载结果

生成时间：${new Date().toISOString()}
说明：仅供探测。文件保存在 \`downloaded/\`，不进 git。

## 总览

- 尝试：${downloads.length}
- 成功：${downloads.filter((d) => d.ok).length}
- Excel 成功：${downloads.filter((d) => d.ok && (d.sniff.includes("xlsx") || d.sniff.includes("excel") || d.sniff.includes("zip"))).length}

## 明细

${mdTable(
    ["单号", "槽位", "文件名", "大小", "格式", "成功", "代理"],
    downloads.map((d) => [
      d.orderNo,
      d.slot,
      d.fileName || "-",
      String(d.bytes),
      d.sniff || "-",
      d.ok ? "是" : "否",
      d.ok ? (d.finalUrlHost || "fmsFileDownload") : (d.error || "-").slice(0, 80),
    ]),
  )}

## 检查项

- 完整下载（size>0 且不是 HTML 错误页）：${downloads.filter((d) => d.ok).length} 个
- 鉴权：裸 FMS 直链不可用；本表均走 \`VasOrder/fmsFileDownload\` + TOM Cookie
- 时效：代理 302 出来的 \`token=\` 有时效，探测当下有效
- 失败原因：见上表「代理」列

## 本地文件

${downloads
  .filter((d) => d.savedAs)
  .map((d) => `- \`${d.savedAs}\``)
  .join("\n") || "- （无）"}
`;
  writeFileSync(resolve(OUT, "download-results.md"), downloadMd, "utf8");
  console.log("wrote download-results.md");

  const excelOk = downloads.filter(
    (d) => d.ok && d.savedAs && (d.sniff.includes("xlsx") || d.sniff.includes("excel") || d.sniff.includes("zip")),
  );
  const parsed: ParsedSheet[] = [];
  if (excelOk.length) {
    const XLSX = await loadXlsx();
    for (const d of excelOk) {
      try {
        const wb = XLSX.read(readFileSync(d.savedAs!), { type: "buffer", cellDates: true });
        const names = wb.SheetNames.length ? wb.SheetNames : ["Sheet1"];
        for (const sheetName of names) {
          const ws = wb.Sheets[sheetName];
          if (!ws) continue;
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as unknown[][];
          const { headers, dataStart } = pickHeaderRow(rows);
          const dataRows = rows.slice(dataStart).filter((r) => (r || []).some((c) => cellText(c)));
          if (/^Sheet[23]$/i.test(sheetName) && dataRows.length === 0) continue;
          const filled: string[] = [];
          const empty: string[] = [];
          headers.forEach((h, i) => {
            if (!h) return;
            const any = dataRows.some((r) => cellText((r || [])[i]));
            (any ? filled : empty).push(h);
          });
          parsed.push({
            orderNo: d.orderNo,
            slot: d.slot,
            fileName: d.fileName,
            savedAs: d.savedAs!,
            sheetName,
            sheetNames: wb.SheetNames,
            headers,
            rowCount: dataRows.length,
            preview: dataRows.slice(0, 5).map((r) => headers.map((_, i) => maskCell((r || [])[i]))),
            filledHeaders: filled,
            emptyHeaders: empty,
          });
        }
      } catch (err) {
        parsed.push({
          orderNo: d.orderNo,
          slot: d.slot,
          fileName: d.fileName,
          savedAs: d.savedAs!,
          sheetName: "",
          sheetNames: [],
          headers: [],
          rowCount: 0,
          preview: [],
          filledHeaders: [],
          emptyHeaders: [err instanceof Error ? err.message : String(err)],
        });
      }
    }
  }

  const parsedMd = `# 附件解析结果

生成时间：${new Date().toISOString()}
标注：**仅供探测**。客户名 / SKU 可保留，数值已截断。

解析 ${parsed.length} 个 Excel（xlsx 包）。标签文件（PDF/图片）不解析内容。

${parsed
  .map((p) => {
    const previewTable =
      p.headers.filter(Boolean).length && p.preview.length
        ? mdTable(
            p.headers.map((h, i) => h || `列${i + 1}`),
            p.preview,
          )
        : "_无数据行_";
    return `## ${p.orderNo} · ${p.slot}${p.sheetName ? ` · ${p.sheetName}` : ""}

- 文件：\`${p.fileName}\`
- sheets：${p.sheetNames.join(", ") || "-"}
- 本表：${p.sheetName || "-"}
- 数据行数：${p.rowCount}
- 表头：${p.headers.filter(Boolean).join(" / ") || "（未识别）"}
- 实际有值：${p.filledHeaders.join("、") || "无"}
- 全空：${p.emptyHeaders.join("、") || "无"}

### 前 5 行（脱敏截断）

${previewTable}
`;
  })
  .join("\n")}

${parsed.length ? "" : "_没有解析到 Excel。_"}
`;
  writeFileSync(resolve(OUT, "parsed-fields.md"), parsedMd, "utf8");

  const bySlot = (slot: FileSlot) => {
    const items = parsed.filter((p) => p.slot === slot);
    const seen = new Set<string>();
    return items.filter((p) => {
      const key = `${p.orderNo}::${p.fileName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const unionHeaders = (items: ParsedSheet[]): string[] => {
    const set = new Set<string>();
    for (const p of items) for (const h of p.headers) if (h) set.add(h);
    return [...set];
  };

  function slotAnalysis(slot: FileSlot): string {
    const items = bySlot(slot);
    if (!items.length) return `### ${slot}\n\n本轮未解析到样本。\n`;
    const headers = unionHeaders(items);
    const interesting = headers.filter((h) =>
      /单号|异常|入库|SKU|标签|包裹|商品|数量|条码|开箱|辨识|方法|仓库|新单|原单|WI|EB/.test(h),
    );
    const use = interesting.length ? interesting : headers.slice(0, 12);
    const cols = ["字段", ...items.map((p) => p.orderNo.replace(/^VASC0+/, "")), "共性"];
    const rows = use.map((h) => {
      const vals = items.map((p) => {
        const idx = p.headers.indexOf(h);
        if (idx < 0) return "无此列";
        const sample = p.preview.map((r) => r[idx]).find((v) => asText(v));
        const filled = p.filledHeaders.includes(h);
        if (!filled) return "(空)";
        return sample || "有值";
      });
      const filledN = vals.filter((v) => v !== "无此列" && v !== "(空)").length;
      const presentN = vals.filter((v) => v !== "无此列").length;
      const common = presentN === 0 ? "样本都无此列" : `${Math.round((filledN / items.length) * 100)}% 有值`;
      return [h, ...vals, common];
    });
    return `### ${slot}（${items.length} 个样本）

${mdTable(cols, rows)}

样本文件：
${items.map((p) => `- ${p.orderNo} \`${p.fileName}\` 表头=${p.headers.filter(Boolean).slice(0, 12).join(" / ")}`).join("\n")}
`;
  }

  const aooi = bySlot("操作说明附件");
  const tcr = bySlot("商品和标签的对应关系");
  const trpp = bySlot("包裹和标签的对应关系");
  const useful: string[] = [];
  if (aooi.some((p) => p.headers.some((h) => /辨识/.test(h)))) useful.push("操作说明里的「辨识方法 / 是否开箱」是场景细分的关键字段");
  if (aooi.some((p) => p.headers.some((h) => /异常/.test(h)))) useful.push("操作说明里的异常单号可辅助绑定 EB");
  if (tcr.some((p) => p.headers.some((h) => /SKU|商品|条码/.test(h)))) useful.push("商品-标签对应表的 SKU/商品条码列可校验换标对象");
  if (trpp.some((p) => p.headers.some((h) => /包裹|箱序|条码/.test(h)))) useful.push("包裹-标签对应表的包裹条码/箱序列可识别「按箱换标」还是「按件换标」");
  if (!useful.length) {
    useful.push("先看附件槽位（AOOI/TCRBCAL/TRPP/LF）再看 Excel 表头：槽位比文件名更稳定");
    useful.push("辨识类操作说明模板（文件名含「辨识需求提交」）对场景识别最有用");
    useful.push("对应关系表只要有「原条码/新条码」或「SKU/包裹号」两列，就能辅助确认换标对象");
  }

  const analysis = `# 附件字段共性分析

生成时间：${new Date().toISOString()}
标注：**仅供探测**。样本来自真实 OMS 附件，已截断单元格。

## 下载是否成功

- 链接：能下。走 \`cnomstom.winit.com.cn/VasOrder/fmsFileDownload/?url=\` + TOM Cookie
- Excel：${excelOk.length} 个解析成功 / ${downloads.filter((d) => d.slot !== "标签文件").length} 个非标签目标
- 标签文件：${downloads.filter((d) => d.slot === "标签文件" && d.ok).length} 个二进制成功（PDF/图片，不解析内容）

${slotAnalysis("操作说明附件")}

${slotAnalysis("商品和标签的对应关系")}

${slotAnalysis("包裹和标签的对应关系")}

### 标签文件

- 本轮样本是 PDF（订单页「标签文件」槽），不是 Excel
- 暂不解析内容；对案例库只记「有/无标签文件」以及文件类型

## 对案例库的启发

- 哪些字段对场景识别最有用：
${useful.map((u) => `  - ${u}`).join("\n")}
- 操作说明里如果出现「辨识方法」，可直接细化 \`keyAction\`（开箱 vs 看外箱 vs 按 SN vs 称重）
- 对应关系表里的「异常类型 / 原单-新单」可辅助场景识别，但不能替代正文 BEOR/需求描述
- 标签文件通常是 PDF/图片，暂不解析内容
- 文件名不可靠：同一槽位既有官方「模板.xlsx」，也有客户自制「异常单号对应表.xlsx」
- 槽位 \`fileType\`（\`VAS_ATTR_REL_AOOI\` / \`VAS_ATTR_REL_TCRBCAL\` / \`TRPP\` / \`VAS_ATTR_REL_LF\`）比文件名稳定，案例库应优先用槽位
- **场景识别最有用的字段（本轮实测）**
  1. \`是否开箱辨识\` + \`商品辨识方法\`（操作说明模板）：直接区分开箱辨识 / 看外箱 SKU / 按颜色核对
  2. \`异常类型\` / \`异常场景\`（对应关系表）：如「包裹条码异常(需客户处理)」「包裹内出现订单外商品」
  3. \`原包裹条码\` vs \`补贴包裹条码\` + \`新入库单号\`：确认是换包裹标并改 WI
  4. \`商品编码/SKU\` + \`FNSKU\` / \`补贴商品条码\`：确认是换商品标而不是只换箱唛
- 操作说明官方模板第一行是「客户填写/仓库填写」分区，真正字段在第二行；解析时不要把分区行当表头
- 客户自制表（如「异常单号对应的包裹条码」）列名不标准，但几乎总会有 EB + 包裹号 + 新单 WI
`;
  writeFileSync(resolve(OUT, "cross-scene-analysis.md"), analysis, "utf8");

  const summary = {
    ok: true,
    out: OUT,
    downloads: downloads.map((d) => ({
      orderNo: d.orderNo,
      slot: d.slot,
      fileName: d.fileName,
      ok: d.ok,
      bytes: d.bytes,
      sniff: d.sniff,
    })),
    parsed: parsed.map((p) => ({ orderNo: p.orderNo, slot: p.slot, headers: p.headers.filter(Boolean), rowCount: p.rowCount })),
    excelOk: excelOk.length,
  };
  writeFileSync(resolve(OUT, "probe-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
