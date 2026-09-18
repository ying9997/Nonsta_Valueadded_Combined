/**
 * Pull 【增值】异常沟通 last-month messages via chat list (not search),
 * keep those @何静 / @陈泽森, then match VASC numbers.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { copilotDir } from "../../lib/env.ts";

const OUT = resolve(copilotDir(), "_runs/20260918_osf8v1848_probe");
const CHAT = "oc_6566160ccb2def51937469fe8144efdb";
const HEJING = "ou_38892cd1daae40290c0a4994e614900a";
const CHENZESEN = "ou_19d12c8abad5e9b28026a7159c982329";
const START = "2026-08-18T00:00:00+08:00";
const END = "2026-09-18T23:59:59+08:00";

function runLark(args: string[], asIdentity: "user" | "bot") {
  const full = [...args, "--as", asIdentity, "--format", "json"];
  const proc = spawnSync("lark-cli", full, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    cwd: OUT,
    shell: true,
  });
  const stdout = proc.stdout || "";
  const stderr = proc.stderr || "";
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(stdout || "{}") as Record<string, unknown>;
  } catch {
    json = { raw: stdout.slice(0, 4000) };
  }
  const ok = proc.status === 0 && (json as { ok?: boolean }).ok !== false;
  return {
    ok,
    json,
    stderr: [
      `status=${proc.status}`,
      JSON.stringify((json as { error?: unknown }).error || "").slice(0, 800),
      stderr.slice(0, 800),
      ok ? "" : stdout.slice(0, 800),
    ].join("\n"),
  };
}

function messagesOf(json: Record<string, unknown>): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  const walk = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      if (node[0] && typeof node[0] === "object" && ("message_id" in (node[0] as object) || "msg_type" in (node[0] as object))) {
        found.push(...(node as Array<Record<string, unknown>>));
        return;
      }
      node.forEach(walk);
      return;
    }
    if (typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) walk(v);
    }
  };
  walk(json);
  return found;
}

function textOf(msg: Record<string, unknown>): string {
  const body = msg.body as Record<string, unknown> | undefined;
  const content = String(msg.content || body?.content || msg.text || "");
  if (content.startsWith("{")) {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return String(parsed.text || parsed.content || JSON.stringify(parsed));
    } catch {
      return content;
    }
  }
  return content;
}

function mentionsBlob(msg: Record<string, unknown>): string {
  return JSON.stringify({
    mentions: msg.mentions,
    at_list: msg.at_list,
    mentions2: (msg.body as Record<string, unknown> | undefined)?.mentions,
  });
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const args = [
    "im",
    "+chat-messages-list",
    "--chat-id",
    CHAT,
    "--start",
    START,
    "--end",
    END,
    "--order",
    "desc",
    "--page-all",
    "--page-limit",
    "80",
    "--page-size",
    "50",
    "--no-reactions",
  ];
  const runLog: Array<Record<string, unknown>> = [];
  let result = runLark(args, "user");
  runLog.push({
    job: "chat-list",
    as: "user",
    ok: result.ok,
    n: messagesOf(result.json).length,
    err: result.ok ? "" : result.stderr.slice(0, 900),
  });
  if (!result.ok) {
    const bot = runLark(args, "bot");
    runLog.push({
      job: "chat-list",
      as: "bot",
      ok: bot.ok,
      n: messagesOf(bot.json).length,
      err: bot.ok ? "" : bot.stderr.slice(0, 900),
    });
    result = bot;
  }
  writeFileSync(resolve(OUT, "im-raw-chat-list.json"), JSON.stringify(result.json, null, 2), "utf8");
  const allMsgs = messagesOf(result.json);
  console.log(`chat-list ok=${result.ok} n=${allMsgs.length}`);

  const atMsgs = [];
  const cases = new Map<string, { orderNo: string; hits: Array<Record<string, string>> }>();
  for (const msg of allMsgs) {
    const text = textOf(msg);
    const sender = String((msg.sender as Record<string, unknown> | undefined)?.name || msg.sender_name || "");
    const createTime = String(msg.create_time || msg.createTime || "");
    const mentions = mentionsBlob(msg);
    const atHejing = mentions.includes(HEJING) || text.includes("@何静") || sender.includes("何静");
    const atChen = mentions.includes(CHENZESEN) || text.includes("@陈泽森") || sender.includes("陈泽森");
    if (!atHejing && !atChen) continue;
    atMsgs.push({
      message_id: String(msg.message_id || ""),
      sender,
      createTime,
      atHejing,
      atChen,
      text: text.slice(0, 1500),
    });
    const nos = [...new Set((text.match(/VASC\d{12}/gi) || []).map((s) => s.toUpperCase()))];
    for (const orderNo of nos) {
      const row = cases.get(orderNo) || { orderNo, hits: [] };
      row.hits.push({
        message_id: String(msg.message_id || ""),
        sender,
        createTime,
        text: text.slice(0, 1200),
        at: [atHejing ? "何静" : "", atChen ? "陈泽森" : ""].filter(Boolean).join(","),
      });
      cases.set(orderNo, row);
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    chat: CHAT,
    range: { START, END },
    at: { 何静: HEJING, 陈泽森: CHENZESEN },
    runLog,
    listed: allMsgs.length,
    atFiltered: atMsgs.length,
    matchedOrders: [...cases.values()].sort((a, b) => b.hits.length - a.hits.length),
    atSample: atMsgs.slice(0, 30),
  };
  writeFileSync(resolve(OUT, "im-at-messages.json"), JSON.stringify(atMsgs, null, 2), "utf8");
  writeFileSync(resolve(OUT, "im-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify({ listed: allMsgs.length, atFiltered: atMsgs.length, matchedOrders: cases.size, runLog }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
