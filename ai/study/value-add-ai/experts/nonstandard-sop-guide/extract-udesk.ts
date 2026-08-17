/**
 * extract-udesk.ts — 从 Udesk 对话日志中提取：
 *   1. 客户首句（模拟 AI 输入）
 *   2. 客服追问模式（用于优化追问话术）
 *   3. 场景标签（ground truth）
 *
 * 输出：
 *   - extracted-customer-inputs.json（eval 测试集）
 *   - extracted-clarification-patterns.json（追问模式）
 *
 * 运行：npx tsx extract-udesk.ts
 */

import { readFileSync, writeFileSync } from "fs";
import * as path from "path";

// ─── CSV 解析 ──────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && content[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.length > 1) rows.push(current);
        current = [];
        if (ch === "\r") i++;
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1) rows.push(current);
  }

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (row[i] || "").trim();
    });
    return obj;
  });
}

// ─── 消息解析 ──────────────────────────────────────────────────

interface Message {
  sender: "customer" | "agent" | "system";
  name: string;
  time: string;
  content: string;
}

function parseMessages(raw: string): Message[] {
  const messages: Message[] = [];
  const lines = raw.split("\n");

  let currentMsg: Partial<Message> | null = null;

  for (const line of lines) {
    // 匹配发送人行: "客户 2026/03/02 18:25:18" 或 "CE-xxx 2026/03/02 18:25:14" 或 "系统 ..."
    const senderMatch = line.match(/^(客户|系统|CE-[^\s]+|[^\s]+)\s+(20\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s*$/);
    if (senderMatch) {
      if (currentMsg && currentMsg.content) {
        messages.push(currentMsg as Message);
      }
      const name = senderMatch[1];
      const sender = name === "客户" ? "customer" : name === "系统" ? "system" : "agent";
      currentMsg = { sender, name, time: senderMatch[2], content: "" };
      continue;
    }

    // 跳过系统分隔线
    if (line.match(/^----.*----$/) || line.match(/^-----以下是.*-----$/)) continue;
    if (line.match(/^系统发送满意度/) || line.match(/^客服.*发送满意度/) || line.match(/^客户评价为/)) continue;

    // 累积消息内容
    if (currentMsg) {
      const trimmed = line.trim();
      if (trimmed) {
        currentMsg.content = currentMsg.content ? `${currentMsg.content}\n${trimmed}` : trimmed;
      }
    }
  }

  if (currentMsg && currentMsg.content) {
    messages.push(currentMsg as Message);
  }

  return messages;
}

function getCustomerFirstIntent(messages: Message[]): string {
  // 找到客户第一条有实际内容的消息（排除"人工客服"、图片等）
  const customerMsgs = messages.filter(
    (m) =>
      m.sender === "customer" &&
      m.content &&
      !m.content.match(/^(人工客服|你好|您好|hello|hi)$/i) &&
      !m.content.match(/^【图片】/) &&
      !m.content.match(/^【文件】/) &&
      m.content.length > 5
  );

  if (customerMsgs.length === 0) return "";

  // 取前 1-3 条客户消息拼接（客户经常分多条说完一个意图）
  const firstFew = customerMsgs.slice(0, 3);
  return firstFew.map((m) => m.content.replace(/\t.*?：.*?\n------\n?/g, "").trim()).join(" ").slice(0, 500);
}

function extractClarificationPattern(messages: Message[]): {
  agentQuestions: string[];
  customerAnswers: string[];
  turns: { role: string; content: string }[];
} {
  const agentQuestions: string[] = [];
  const customerAnswers: string[] = [];
  const turns: { role: string; content: string }[] = [];

  // 只看前 20 条有效消息
  const effective = messages.filter((m) => m.sender !== "system" && m.content).slice(0, 20);

  for (let i = 0; i < effective.length; i++) {
    const msg = effective[i];
    const content = msg.content.replace(/\t.*?：.*?\n------\n?/g, "").trim();
    if (!content || content.match(/^【(图片|文件)】/)) continue;

    turns.push({ role: msg.sender === "customer" ? "customer" : "agent", content });

    // 检测客服追问模式（问号结尾或询问句式）
    if (msg.sender === "agent" && (content.includes("？") || content.includes("?") || content.match(/吗$|呢$|什么|哪个|是否|还需/))) {
      agentQuestions.push(content);
      // 找下一条客户回复
      if (i + 1 < effective.length && effective[i + 1].sender === "customer") {
        customerAnswers.push(effective[i + 1].content.replace(/\t.*?：.*?\n------\n?/g, "").trim());
      }
    }
  }

  return { agentQuestions, customerAnswers, turns };
}

// ─── 主逻辑 ────────────────────────────────────────────────────

function main() {
  const csvPath = "D:/DA/AI_EXPERT/_workflow/20260720_增值预配置和客户引导助手规划/module_异常单增值客户引导/data_udesk_log_database_增值.csv";
  console.log("读取 Udesk 对话日志...");
  const raw = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(raw);
  console.log(`总对话数: ${rows.length}`);

  // ─── 提取1：客户首句测试集（from 非标相关对话） ────────────────

  const nonstandard = rows.filter(
    (r) =>
      r.messages &&
      (r.messages.match(/非标.*(增值|特批)/) || r.messages.match(/(增值|特批).*非标/)) &&
      parseInt(r["对话客户消息数"] || "0") >= 3
  );
  console.log(`非标增值相关对话: ${nonstandard.length}`);

  interface CustomerInput {
    conversationId: string;
    customer: string;
    sceneClassification: string;
    customerFirstIntent: string;
    messageCount: number;
    date: string;
  }

  const customerInputs: CustomerInput[] = [];

  for (const row of nonstandard) {
    const messages = parseMessages(row.messages || "");
    const firstIntent = getCustomerFirstIntent(messages);
    if (!firstIntent || firstIntent.length < 10) continue;

    customerInputs.push({
      conversationId: row["对话ID"] || "",
      customer: row["客户"] || "",
      sceneClassification: row["场景分类"] || "",
      customerFirstIntent: firstIntent,
      messageCount: parseInt(row["对话客户消息数"] || "0"),
      date: row["对话开始时间"] || "",
    });
  }

  console.log(`提取到有效客户首句: ${customerInputs.length}`);

  // ─── 提取2：追问模式（from "怎么填需求描述"对话） ──────────────

  const guidanceConvs = rows.filter(
    (r) =>
      r.messages &&
      (r.messages.match(/需求描述.*(填|写)/) || r.messages.match(/(填|写).*需求描述/) || r.messages.match(/背景.*(填|写)/)) &&
      r.messages.match(/非标/) &&
      parseInt(r["对话客户消息数"] || "0") >= 4
  );
  console.log(`客服引导填写对话: ${guidanceConvs.length}`);

  interface ClarificationPattern {
    conversationId: string;
    customer: string;
    sceneClassification: string;
    customerFirstIntent: string;
    agentQuestions: string[];
    customerAnswers: string[];
    turnCount: number;
  }

  const clarificationPatterns: ClarificationPattern[] = [];

  for (const row of guidanceConvs) {
    const messages = parseMessages(row.messages || "");
    const firstIntent = getCustomerFirstIntent(messages);
    const pattern = extractClarificationPattern(messages);

    if (pattern.agentQuestions.length === 0) continue;

    clarificationPatterns.push({
      conversationId: row["对话ID"] || "",
      customer: row["客户"] || "",
      sceneClassification: row["场景分类"] || "",
      customerFirstIntent: firstIntent,
      agentQuestions: pattern.agentQuestions.slice(0, 10),
      customerAnswers: pattern.customerAnswers.slice(0, 10),
      turnCount: pattern.turns.length,
    });
  }

  console.log(`提取到追问模式: ${clarificationPatterns.length}`);

  // ─── 写入输出文件 ──────────────────────────────────────────────

  const outDir = path.resolve(__dirname);

  const inputsPath = path.join(outDir, "extracted-customer-inputs.json");
  writeFileSync(inputsPath, JSON.stringify(customerInputs, null, 2), "utf-8");
  console.log(`\n输出: ${inputsPath} (${customerInputs.length} 条)`);

  const patternsPath = path.join(outDir, "extracted-clarification-patterns.json");
  writeFileSync(patternsPath, JSON.stringify(clarificationPatterns, null, 2), "utf-8");
  console.log(`输出: ${patternsPath} (${clarificationPatterns.length} 条)`);

  // ─── 打印统计摘要 ──────────────────────────────────────────────

  console.log("\n" + "=".repeat(50));
  console.log("  提取结果摘要");
  console.log("=".repeat(50));

  // 客户首句场景分布
  const sceneCount = new Map<string, number>();
  for (const item of customerInputs) {
    const scene = item.sceneClassification || "(未分类)";
    sceneCount.set(scene, (sceneCount.get(scene) || 0) + 1);
  }
  console.log("\n客户首句 - 场景分布 (top 10):");
  [...sceneCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([scene, count]) => {
      console.log(`  ${count.toString().padStart(4)} | ${scene}`);
    });

  // 追问模式中客服高频追问句式
  const allQuestions = clarificationPatterns.flatMap((p) => p.agentQuestions);
  const questionTypes = new Map<string, number>();
  for (const q of allQuestions) {
    if (q.includes("异常单") || q.includes("单号")) questionTypes.set("确认单号", (questionTypes.get("确认单号") || 0) + 1);
    else if (q.includes("SKU") || q.includes("sku") || q.includes("商品")) questionTypes.set("确认商品/SKU", (questionTypes.get("确认商品/SKU") || 0) + 1);
    else if (q.includes("怎么") || q.includes("如何") || q.includes("什么")) questionTypes.set("确认操作方式", (questionTypes.get("确认操作方式") || 0) + 1);
    else if (q.includes("仓库") || q.includes("处理")) questionTypes.set("确认仓库操作", (questionTypes.get("确认仓库操作") || 0) + 1);
    else if (q.includes("数量") || q.includes("几")) questionTypes.set("确认数量", (questionTypes.get("确认数量") || 0) + 1);
    else questionTypes.set("其他", (questionTypes.get("其他") || 0) + 1);
  }
  console.log("\n追问模式 - 客服高频追问类型:");
  [...questionTypes.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${count.toString().padStart(4)} | ${type}`);
    });

  // 样例展示
  console.log("\n─── 样例：客户首句 (前 5 条) ───");
  customerInputs.slice(0, 5).forEach((item, i) => {
    console.log(`  ${i + 1}. [${item.sceneClassification || "未分类"}]`);
    console.log(`     "${item.customerFirstIntent.slice(0, 100)}${item.customerFirstIntent.length > 100 ? "..." : ""}"`);
  });

  console.log("\n─── 样例：追问模式 (前 3 条) ───");
  clarificationPatterns.slice(0, 3).forEach((item, i) => {
    console.log(`  ${i + 1}. 客户: "${item.customerFirstIntent.slice(0, 60)}..."`);
    console.log(`     客服追问: ${item.agentQuestions.slice(0, 3).map((q) => `"${q.slice(0, 40)}"`).join(" → ")}`);
  });
}

main();
