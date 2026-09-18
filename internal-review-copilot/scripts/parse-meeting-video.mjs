/**
 * Upload a local meeting video to Volcengine Ark Files API,
 * then analyze it with doubao-seed-2-0-lite via Responses API.
 *
 * Usage:
 *   $env:ARK_API_KEY="..."
 *   node scripts/parse-meeting-video.mjs --mode smoke
 *   node scripts/parse-meeting-video.mjs --mode full
 *   node scripts/parse-meeting-video.mjs --mode full --file-id file-xxxx
 *
 * Never print or write the API key.
 */
import fs from "node:fs";
import path from "node:path";
import { openAsBlob } from "node:fs";

const BASE = "https://ark.cn-beijing.volces.com/api/v3";
const MODEL = "doubao-seed-2-0-lite-260428";
const DEFAULT_VIDEO = "C:\\Users\\ying.jin\\Downloads\\金萤的视频会议.mp4";
const DEFAULT_OUT =
  "D:\\DA\\Nonsta_Valueadded_Combined\\internal-review-copilot\\_runs\\20260918_jinying_meeting_skill_decomp";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  return fallback;
}
function flag(name) {
  return process.argv.includes(name);
}

const MODE = arg("--mode", "smoke");
const VIDEO = arg("--video", DEFAULT_VIDEO);
const OUT_DIR = arg("--out", DEFAULT_OUT);
const FILE_ID_RESUME = arg("--file-id", "");
const FPS_OVERRIDE = arg("--fps", "");
const API_KEY = process.env.ARK_API_KEY || "";

if (!API_KEY) {
  console.error("Missing ARK_API_KEY env");
  process.exit(1);
}
if (!fs.existsSync(VIDEO)) {
  console.error("Video not found:", VIDEO);
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(path.join(OUT_DIR, "run.log"), line + "\n", "utf8");
}

function readMp4DurationSec(filePath) {
  const buf = fs.readFileSync(filePath);
  const needle = Buffer.from("mvhd");
  const idx = buf.indexOf(needle);
  if (idx < 0) return null;
  const version = buf[idx + 4];
  try {
    if (version === 1) {
      const timescale = buf.readUInt32BE(idx + 24);
      const duration = Number(buf.readBigUInt64BE(idx + 28));
      return timescale ? duration / timescale : null;
    }
    const timescale = buf.readUInt32BE(idx + 16);
    const duration = buf.readUInt32BE(idx + 20);
    return timescale ? duration / timescale : null;
  } catch {
    return null;
  }
}

function pickFps(durationSec) {
  if (FPS_OVERRIDE) {
    const n = Number(FPS_OVERRIDE);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (!durationSec) return 0.5;
  if (durationSec <= 15 * 60) return 1;
  if (durationSec <= 40 * 60) return 0.5;
  return 0.2;
}

async function arkFetch(url, init, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 4000) };
    }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${url}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

async function uploadVideo(fps) {
  log(`upload start bytes=${fs.statSync(VIDEO).size} fps=${fps} model=${MODEL}`);
  const fd = new FormData();
  fd.append("purpose", "user_data");
  fd.append("file", await openAsBlob(VIDEO), path.basename(VIDEO));
  fd.append("preprocess_configs[video][fps]", String(fps));
  fd.append("preprocess_configs[video][model]", MODEL);
  const json = await arkFetch(
    `${BASE}/files`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: fd,
    },
    8 * 60 * 1000,
  );
  fs.writeFileSync(path.join(OUT_DIR, "upload.json"), JSON.stringify(json, null, 2), "utf8");
  log(`upload ok id=${json.id} status=${json.status}`);
  return json;
}

async function waitActive(fileId) {
  const started = Date.now();
  while (Date.now() - started < 20 * 60 * 1000) {
    const json = await arkFetch(
      `${BASE}/files/${fileId}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } },
      60 * 1000,
    );
    fs.writeFileSync(path.join(OUT_DIR, "file-status.json"), JSON.stringify(json, null, 2), "utf8");
    log(`file status=${json.status}`);
    if (json.status === "active" || json.status === "processed" || json.status === "ready") {
      return json;
    }
    if (json.status === "error" || json.status === "failed" || json.status === "expired") {
      throw new Error(`file ${fileId} ended as ${json.status}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`file ${fileId} still not active after 20min`);
}

function extractOutputText(resp) {
  if (!resp) return "";
  if (typeof resp.output_text === "string" && resp.output_text.trim()) return stripThinking(resp.output_text);
  const parts = [];
  const walk = (node) => {
    if (!node) return;
    if (typeof node === "string") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === "object") {
      if (node.type && String(node.type).includes("reasoning")) return;
      if (typeof node.text === "string") parts.push(node.text);
      if (typeof node.content === "string") parts.push(node.content);
      for (const v of Object.values(node)) walk(v);
    }
  };
  walk(resp.output);
  walk(resp.choices);
  return stripThinking(parts.join("\n").trim());
}

function stripThinking(text) {
  if (!text) return "";
  const idx = text.search(/^# /m);
  if (idx > 80) return text.slice(idx).trim();
  return text.trim();
}

const SMOKE_PROMPT = `这是一场中文业务会议录像。请用中文简短回答（不超过400字）：
1. 会议大概多长、几个人在说话、画面是摄像头还是屏幕分享/PPT？
2. 会议主题一句话。
3. 按时间顺序列出 5-10 个主要话题（带大概分钟数）。
4. 有没有在讲「把专家经验拆成可复用技能/SOP/模块」？如果有，用原文关键词点一下。
不要编造听不清的内容；听不清就写「听不清」。`;

const FULL_PROMPT = `你在解析一场中文业务专家会议录像（含画面+声音）。目标不是写一篇会议纪要，而是：把「非结构化专家经验」拆成「原子化、可复用的 Skill 模块」。

请同时看画面（PPT/屏幕/白板/系统界面）和听语音。听不清就标【听不清】，不要编。时间戳尽量给 mm:ss。

请严格按下面结构输出 Markdown（不要包代码围栏）：

# 会议速写
- 时长估计 / 参会人（能辨认的名字或角色） / 画面形态
- 一句话主题
- 他们真正想解决的问题（用他们的话）

# 时间线
表格：时间 | 说话人/角色 | 画面在做什么 | 这段在沉淀什么经验（事实/规则/例外/流程/工具）

# 专家经验原矿（先别封装）
把会上出现的经验按类型摘出来，每条尽量带原话或接近原话：
- 事实（系统里长什么样、字段叫什么）
- 判断规则（如果…就…）
- 例外/坑（什么情况下规则失效）
- 流程步骤（先做什么后做什么）
- 工具/系统动作（点哪个按钮、查哪张表、找谁确认）
- 质量标准（怎样算做对）

# 原子 Skill 候选
对每一条「一个人能独立做完、有明确输入输出」的能力，输出一张卡片：

### skill-id（kebab-case 英文）
- 中文名：
- 一句话何时启用（同时写 WHAT + WHEN）：
- 原子性检验：拿掉前后文是否仍能单独跑？是/否。若否，应拆或应并到哪个 skill
- 输入：必须有什么
- 输出：成功长什么样；失败长什么样
- 步骤：3-8 步，可执行，不要散文
- 硬规则 / 例外：
- 依赖的其它 skill（只列真正会被调用的）
- 复用场景：还能用在哪些业务，不只这场会
- 证据时间戳：

至少拆 8 个候选。宁可拆细，不要做成「全能专家」。把「整场专家人格」和「一次完整业务办理」标成复合工作流，不要标成原子 skill。

# 复合工作流（由原子 skill 编排）
列出 1-3 条：触发 → skill 调用顺序 → 停手条件。

# 会上自己提出的拆解方法
如果会议里已经在讲怎么拆经验/做技能/做 SOP，单独写他们的方法、分歧、未决问题。没有就写「会上未系统讲方法」。

# 推荐落地法（给产品经理）
用大白话给出一套可重复的拆解流水线（从录像 → 原矿 → 原子 skill → 复合编排 → 验收），并指出这场会还缺哪些才能写成可上线 SKILL.md。

# 不确定项
列出会上没拍板、互相打架、或证据不足的点。`;

const COPILOT_PROMPT = `你在解析一场中文业务专家会议录像（含画面+声音）。视频总时长约 50 分 24 秒，禁止在 30:00 就结束；21:00-50:24 必须单独写细，不要一句带过。

听不清标【听不清】，不要编。时间戳用 mm:ss。

【强制词表，禁止写错】
- 说话人：金萤（不是金贤）、何静
- 弃置出库（不是气质出库）
- 专业销毁非标询价 / 非标询价（不是飞标）
- 原子服务码：OSF8V1848
- 产品名：专业销毁非标询价服务
- 三类专业销毁：普货专业销毁、危废专业销毁、TS合规专业销毁
- 仓内销毁（美国站普货，可出万邑通销毁证明）
- 内部审核 Copilot：现网只审入库/库内「其他服务需求」，本场想把出库独立原子 OSF8V1848 接进去

目标不是普通纪要，而是两件事：
A. 把非结构化专家经验拆成原子 Skill
B. 专门抽出「客户已下专业销毁非标询价单时，专家怎么判断：审核可通过 / 必须改走更合适更便宜的服务 / 驳回补信息」

请严格按下面结构输出 Markdown（不要包代码围栏）：

# 会议速写
- 时长（必须接近 50 分钟）/ 参会人 / 画面形态
- 一句话主题
- 他们真正想解决的问题

# 时间线（必须覆盖到 50:00）
表格：时间 | 说话人 | 画面在做什么 | 沉淀的经验类型（事实/规则/例外/流程/工具） | 原话或接近原话

# Copilot 审核判定树（最重要）
用「如果…就…」写出专家审核一张 OSF8V1848 单时的分支。每个分支写清：
- 触发条件（站点/商品属性/客户已选销毁类型/是否已有出库单）
- 结论：pass_as_professional_destroy / switch_to_cheaper / reject_need_info / reject_infeasible
- 更合适服务候选（弃置出库 / 仓内销毁 / 普货专业销毁 / 危废 / TS合规 / 库内库存销毁 等，只写会上出现过的）
- 要查的系统字段/页面
- 证据时间戳
至少 8 条分支。没有证据的标【待确认】。

# 专家经验原矿
事实 / 判断规则 / 例外坑 / 流程步骤 / 系统动作 / 质量标准。每条尽量带原话。

# 原子 Skill 候选（面向 Copilot，不是面向客户前台）
每张卡片：
### skill-id
- 中文名
- WHEN+WHAT
- 原子性检验
- 输入 / 输出（成功/失败）
- 步骤
- 硬规则/例外
- 依赖
- 复用场景
- 证据时间戳
至少 8 个。把「整场专家人格」标成复合工作流，不要标成原子。

# 复合工作流
1. Copilot 审 OSF8V1848：触发 → skill 顺序 → 停手（绿卡可写SOP / 橙卡请销售改服务 / 红卡驳回）
2. 其它会上提到的工作流

# 接进 internal-review-copilot 的落点建议
对照现网：白名单只有 OW01V1602 / OSF6V1603 / OSF6V1841；T1 是场景专属规则闸。
说明：OSF8V1848 该做成独立原子闸（像 T1）还是新场景卡？第一刀最小范围是什么？不要写代码。

# 不确定项`;

async function analyze(fileId, prompt, tag, timeoutMs) {
  log(`analyze ${tag} start file=${fileId}`);
  const body = {
    model: MODEL,
    input: [
      {
        role: "user",
        content: [
          { type: "input_video", file_id: fileId },
          { type: "input_text", text: prompt },
        ],
      },
    ],
  };
  const json = await arkFetch(
    `${BASE}/responses`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  const rawPath = path.join(OUT_DIR, `${tag}-raw.json`);
  fs.writeFileSync(rawPath, JSON.stringify(json, null, 2), "utf8");
  const text = extractOutputText(json);
  fs.writeFileSync(path.join(OUT_DIR, `${tag}.md`), text || "(empty)", "utf8");
  log(`analyze ${tag} done chars=${text.length} status=${json.status || json.object || ""}`);
  return { json, text };
}

const duration = readMp4DurationSec(VIDEO);
const fps = pickFps(duration);
const meta = {
  video: VIDEO,
  bytes: fs.statSync(VIDEO).size,
  duration_sec: duration,
  fps,
  model: MODEL,
  mode: MODE,
  started_at: new Date().toISOString(),
};
fs.writeFileSync(path.join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
log(`meta duration_sec=${duration} fps=${fps} mode=${MODE}`);

let fileId = FILE_ID_RESUME;
if (!fileId) {
  const uploaded = await uploadVideo(fps);
  fileId = uploaded.id;
  if (!fileId) throw new Error("upload returned no id");
  await waitActive(fileId);
} else {
  log(`resume file-id=${fileId}`);
  await waitActive(fileId);
}
fs.writeFileSync(path.join(OUT_DIR, "file-id.txt"), fileId, "utf8");

if (MODE === "smoke" || MODE === "all") {
  await analyze(fileId, SMOKE_PROMPT, "smoke", 8 * 60 * 1000);
}
if (MODE === "full" || MODE === "all") {
  await analyze(fileId, FULL_PROMPT, "full", 20 * 60 * 1000);
}
if (MODE === "copilot") {
  await analyze(fileId, COPILOT_PROMPT, "copilot", 25 * 60 * 1000);
}

log("done");
