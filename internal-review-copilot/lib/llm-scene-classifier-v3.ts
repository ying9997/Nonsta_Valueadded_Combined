/**
 * Phase 2 v3: LLM scene classifier with autonomous tool calling.
 * Soft guidance only — no hard rules A/B/C/D.
 */

import {
  callChat,
  callChatWithTools,
  extractFirstJsonObject,
  LlmError,
  type LlmConfig,
  type ToolCallHistoryEntry,
  type ToolDefinition,
} from "./llm-client.ts";
import { lookupExceptions, formatExceptionDetails } from "./exception-lookup.ts";
import { findScenarioCard, loadScenarioCards, type ScenarioCard } from "./scenario-cards.ts";
import {
  allowedSceneKeys,
  buildSceneListPrompt,
  classifyScene as classifySceneV2,
  clipConclusionOneLiner,
  resolveCandidateCards,
  retrieveForPrompt,
  sceneNameOf,
  type ClassifySceneOptions,
  type LlmClassifyResult,
} from "./llm-scene-classifier.ts";
import type { ContextFacts } from "./types.ts";

export const SCENE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "lookup_exception_info",
      description:
        "查询异常单的详细信息。输入异常单号（EB 开头），返回异常名称和异常对象。用于判断异常类型是否匹配特定场景。",
      parameters: {
        type: "object",
        properties: {
          eb_nos: {
            type: "array",
            items: { type: "string" },
            description: "异常单号列表，如 ['EB0126070130941754', 'EB0126070130941397']",
          },
        },
        required: ["eb_nos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_inbound_order",
      description:
        "查询入库单信息。输入入库单号（WI 开头），返回包裹类型等信息。用于判断是否 100%A+ 包等特殊类型。",
      parameters: {
        type: "object",
        properties: {
          wi_nos: {
            type: "array",
            items: { type: "string" },
            description: "入库单号列表",
          },
        },
        required: ["wi_nos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_scene_definition",
      description:
        "获取某个入库场景的详细定义，包括核心特征、SOP 步骤、区分要点。当你不确定某个场景的具体含义时使用。",
      parameters: {
        type: "object",
        properties: {
          scene_key: {
            type: "string",
            description: "场景的 sceneKey，如 'inbound_package_barcode_batch_relabel'",
          },
        },
        required: ["scene_key"],
      },
    },
  },
];

function buildSystemPromptV3(cards: ScenarioCard[]): string {
  const list = buildSceneListPrompt(cards, cards.length <= 12 ? "full" : "compact");
  return `你是万邑通入库/库内增值审核场景分类器。

## 任务
根据客户需求描述和已知上下文，判断这条增值单属于哪个场景。

## 可选场景
${list}
unsupported — 不属于以上任何场景

## 你可以使用的工具
- lookup_exception_info：查异常单的异常名称和异常对象。当客户提到了异常单号时建议使用。
- lookup_inbound_order：查入库单的包裹类型。当需要判断是否 A+ 包等特殊类型时使用。
- get_scene_definition：查看某个场景的详细定义。当你不确定场景含义时使用。

## 判断建议（不是硬规则，你可以根据实际情况灵活判断）
- 审核员通常先看异常单的异常名称来缩小范围；提到 EB 号时优先调用 lookup_exception_info
- 多个异常单且异常名称本身含「包裹条码批量异常」时，优先 inbound_package_barcode_batch_relabel（若在候选中）
- 异常名称复杂/不常见（如「包裹内出现订单外商品」）时：不要选 batch_relabel；也不要因需求里出现「第三方」「关联」就选 third_party
- 若需求含「拍照」且「返回照片后再…/等客户确认」，优先 inbound_photo_hold（若在候选中）
- 「辨识」出现在多个场景中，需要结合操作对象（商品标签 vs 包裹标签）区分
- inbound_label_identify 是通用兜底，仅当它在候选中且其他场景都不明确匹配时可以选
- 最终只输出一个 JSON 对象；matchedScene 必须是 sceneKey（不要只写 OMS 中文名）

## 输出要求
完成推理后，输出严格 JSON（不要 markdown 包裹）：
{"matchedScene":"sceneKey","matchedSceneName":"OMS全名","confidence":"high/medium/low","reasoning":"你的判断过程（内部，卡片不展示）","conclusionOneLiner":"一句话说明为什么选这个场景（不超过30字，只写结论不写推理过程）","extractedActions":["动作1","动作2"],"alternativeScenes":["sceneKey"],"ambiguous":false}

conclusionOneLiner 示例：客户已关联第三方编码，按新单扫描上架；包裹条码批量异常，需辨识后补贴包裹标签；异常类型复杂，建议人工确认
`;
}

function attachmentStatusSummary(context: ContextFacts): string {
  const entries = Object.entries(context.attachmentStatus || {});
  if (!entries.length) return "（无附件状态）";
  return entries.map(([k, v]) => `${k}=${v}`).join("；");
}

function buildUserMessageV3(customerIntent: string, context: ContextFacts, fewShot = ""): string {
  const few = fewShot ? `\n${fewShot}\n` : "";
  return `## 客户需求描述
${customerIntent || "（空）"}

## 已知上下文
- 异常单号：${context.allEventNos?.join("、") || "未填写"}
- 入库单号：${context.allBusinessOrderNos?.join("、") || context.businessOrderNo || "未填写"}
- 仓库：${context.warehouseCode || "未填写"} / ${context.warehouseName || "未填写"}
- 服务原子：${context.serviceAtom || "未填写"}
- 附件状态：${attachmentStatusSummary(context)}
${few}
请自行决定是否调用工具，然后输出最终 JSON。`;
}

async function executeSceneTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    if (name === "lookup_exception_info") {
      const raw = args.eb_nos;
      const ebNos = Array.isArray(raw)
        ? raw.map(String)
        : typeof raw === "string"
          ? [raw]
          : [];
      const results = await lookupExceptions(ebNos);
      const found = results.filter((r) => r.exceptionName);
      let summary = "未查到异常名称";
      if (found.length) {
        const names = [...new Set(found.map((r) => r.exceptionName))];
        summary =
          found.length >= 2 && names.length === 1
            ? `共 ${found.length} 个异常单，异常名称相同：${names[0]}`
            : `共查到 ${found.length} 个异常单：${names.join("；")}`;
      }
      return JSON.stringify({ results, summary }, null, 0);
    }
    if (name === "lookup_inbound_order") {
      const raw = args.wi_nos;
      const wiNos = Array.isArray(raw) ? raw.map(String) : [];
      return JSON.stringify({
        results: [],
        requested: wiNos,
        note: "入库单详情暂不可用（pending-hypotheses H3；后续接 OMS API）",
      });
    }
    if (name === "get_scene_definition") {
      const sceneKey = String(args.scene_key || "").trim();
      const card = findScenarioCard(sceneKey);
      if (!card) {
        return JSON.stringify({
          error: true,
          message: `未找到 scene_key=${sceneKey}`,
          knownKeys: loadScenarioCards().map((c) => c.sceneKey),
        });
      }
      return JSON.stringify({
        sceneKey: card.sceneKey,
        sceneName: card.sceneName,
        status: card.status,
        omsSceneCode: card.omsSceneCode || null,
        positiveSignals: card.positiveSignals,
        boundaryRules: card.boundaryRules,
        sopTemplateHints: card.sopTemplateHints,
        notes: card.notes,
      });
    }
    return JSON.stringify({ error: true, message: `未知工具: ${name}` });
  } catch (err) {
    return JSON.stringify({
      error: true,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function degrade(reason: string): LlmClassifyResult {
  return {
    matchedScene: "unsupported",
    matchedSceneName: "不支持的场景",
    confidence: "low",
    reasoning: reason,
    extractedActions: [],
    alternativeScenes: [],
    ambiguous: true,
    failed: true,
  };
}

function normalizeConfidence(raw: unknown): "high" | "medium" | "low" {
  const s = String(raw || "").toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "low";
}

function sanitizeJsonish(text: string): string {
  return text
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function extractMatchedSceneKey(text: string, allowed: string[]): string | null {
  const allowedSet = new Set(allowed);
  const fromField = [...text.matchAll(/"matchedScene"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  for (let i = fromField.length - 1; i >= 0; i--) {
    const k = fromField[i];
    if (k === "unsupported" || allowedSet.has(k)) return k;
  }
  const all = [...text.matchAll(/(?:inbound|instock)_[a-z0-9_]+/g)].map((m) => m[0]);
  for (let i = all.length - 1; i >= 0; i--) {
    if (allowedSet.has(all[i])) return all[i];
  }
  return null;
}

function parseClassifyPayload(
  text: string,
  allowed: string[],
): LlmClassifyResult & { weakRecovery?: boolean } {
  const allowedSet = new Set(allowed);
  const jsonText = sanitizeJsonish(extractFirstJsonObject(text) || text);
  let obj: Record<string, unknown> | null = null;
  try {
    obj = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    const matchedScene = extractMatchedSceneKey(text, allowed);
    if (matchedScene) {
      const confHit = text.match(/"confidence"\s*:\s*"(high|medium|low)"/i);
      const ambHit = text.match(/"ambiguous"\s*:\s*(true|false)/i);
      const reasonHit = text.match(/"reasoning"\s*:\s*"([\s\S]*?)"\s*,\s*"/);
      const actionsHit = text.match(/"extractedActions"\s*:\s*(\[[^\]]*\])/);
      let extractedActions: string[] = [];
      try {
        if (actionsHit) extractedActions = JSON.parse(actionsHit[1]).map(String);
      } catch {
        extractedActions = [];
      }
      return {
        matchedScene,
        matchedSceneName: sceneNameOf(matchedScene),
        confidence: normalizeConfidence(confHit?.[1] || "medium"),
        reasoning: (reasonHit?.[1] || `宽松解析 matchedScene=${matchedScene}`).slice(0, 800),
        conclusionOneLiner: clipConclusionOneLiner(text.match(/"conclusionOneLiner"\s*:\s*"([^"]*)"/)?.[1]),
        extractedActions,
        alternativeScenes: [],
        ambiguous: ambHit ? ambHit[1] === "true" : false,
        weakRecovery: true,
      };
    }
    throw new Error(`JSON parse failed: ${jsonText.slice(0, 120)}`);
  }
  if (!obj) throw new Error("parseClassifyPayload: empty object");
  let matchedScene = String(obj.matchedScene || "").trim();
  if (matchedScene === "unsupported" || matchedScene === "") {
    return {
      matchedScene: "unsupported",
      matchedSceneName: String(obj.matchedSceneName || "不支持的场景"),
      confidence: normalizeConfidence(obj.confidence),
      reasoning: String(obj.reasoning || "LLM 判定 unsupported"),
      conclusionOneLiner: clipConclusionOneLiner(obj.conclusionOneLiner),
      extractedActions: Array.isArray(obj.extractedActions)
        ? obj.extractedActions.map(String)
        : [],
      alternativeScenes: Array.isArray(obj.alternativeScenes)
        ? obj.alternativeScenes.map(String)
        : [],
      ambiguous: Boolean(obj.ambiguous),
    };
  }
  if (!allowedSet.has(matchedScene)) {
    const byName = [...allowedSet]
      .map((key) => [key, sceneNameOf(key)] as const)
      .find(
        ([, name]) =>
          matchedScene.includes(name.slice(0, 12)) ||
          name.includes(matchedScene.slice(0, 12)),
      );
    if (byName) matchedScene = byName[0];
  }
  if (!allowedSet.has(matchedScene)) {
    return degrade(`matchedScene 不在候选列表: ${matchedScene}`);
  }
  return {
    matchedScene,
    matchedSceneName:
      String(obj.matchedSceneName || "").trim() || sceneNameOf(matchedScene),
    confidence: normalizeConfidence(obj.confidence),
    reasoning: String(obj.reasoning || ""),
    conclusionOneLiner: clipConclusionOneLiner(obj.conclusionOneLiner),
    extractedActions: Array.isArray(obj.extractedActions)
      ? obj.extractedActions.map(String)
      : [],
    alternativeScenes: Array.isArray(obj.alternativeScenes)
      ? obj.alternativeScenes.map(String).filter((k) => allowedSet.has(k))
      : [],
    ambiguous: Boolean(obj.ambiguous),
  };
}

export type LlmClassifyResultV3 = LlmClassifyResult & {
  toolCallHistory: ToolCallHistoryEntry[];
  totalToolRounds: number;
  degradedToV2?: boolean;
};

function buildFinalizeSystem(cards: ScenarioCard[]): string {
  const keys = cards.map((c) => `- ${c.sceneKey}${c.sceneKey === "inbound_label_identify" ? "（通用兜底）" : ""}`).join("\n");
  return `你是万邑通入库/库内增值审核场景分类器。根据需求与工具结果输出严格 JSON，不要调用工具，不要输出 markdown。

可选 matchedScene（只能选一个）：
${keys || "- （无候选）"}
- unsupported

判断建议：
- 多异常单且异常名称含「包裹条码批量异常」 → 优先 inbound_package_barcode_batch_relabel（若在候选中）
- 异常名含「包裹内出现订单外商品」等复杂类型 → 不要选 batch_relabel；有「拍照+返回照片后再处理」→ inbound_photo_hold；否则倾向 inbound_label_identify（若在候选中）；勿因「第三方」字样强行选 third_party
- 仅「补贴包裹」且单异常、异常名未查到时，不要默认 batch_relabel，优先 inbound_label_identify 或结合需求判断
- 证据充分时 confidence=high，ambiguous=false

只输出：
{"matchedScene":"...","matchedSceneName":"...","confidence":"high|medium|low","reasoning":"...","conclusionOneLiner":"不超过30字的结论","extractedActions":["..."],"alternativeScenes":[],"ambiguous":false}`;
}

function buildFinalizeUser(
  customerIntent: string,
  context: ContextFacts,
  toolCallHistory: ToolCallHistoryEntry[],
  draftContent: string,
  fewShot = "",
): string {
  const toolBlock =
    toolCallHistory.length === 0
      ? "（本轮未调用工具）"
      : toolCallHistory
          .map(
            (h) =>
              `- round ${h.round} ${h.toolName}(${JSON.stringify(h.arguments)}) → ${h.result.slice(0, 500)}`,
          )
          .join("\n");
  const few = fewShot ? `\n${fewShot}\n` : "";
  return `## 客户需求描述
${customerIntent || "（空）"}

## 已知上下文
- 异常单号：${context.allEventNos?.join("、") || "未填写"}
- 入库单号：${context.allBusinessOrderNos?.join("、") || context.businessOrderNo || "未填写"}
- 仓库：${context.warehouseCode || "未填写"} / ${context.warehouseName || "未填写"}
${few}
## 工具结果
${toolBlock}

## 草稿（仅参考）
${(draftContent || "（无）").slice(0, 1500)}

输出最终 JSON。`;
}

export async function classifySceneV3(
  customerIntent: string,
  contextFacts: ContextFacts,
  config: LlmConfig,
  options: ClassifySceneOptions = {},
): Promise<LlmClassifyResultV3> {
  const cards = resolveCandidateCards(options.candidateCards);
  const allowed = allowedSceneKeys(options.candidateCards);
  const finalizeSystem = buildFinalizeSystem(cards);
  const rag = retrieveForPrompt(customerIntent, options);
  const retrievedCases = rag.retrieved.map((c) => ({
    caseId: c.entry.caseId,
    sceneName: c.entry.sceneName,
    score: Number(c.score.toFixed(3)),
    keyAction: c.entry.keyAction || "",
  }));
  try {
    const { finalContent, toolCallHistory, totalRounds } = await callChatWithTools(
      config,
      [
        { role: "system", content: buildSystemPromptV3(cards) },
        { role: "user", content: buildUserMessageV3(customerIntent, contextFacts, rag.prompt) },
      ],
      SCENE_TOOLS,
      executeSceneTool,
      { maxTokens: 1200, temperature: 0.1, maxToolRounds: 3 },
    );

    const finalized = await callChat(
      config,
      [
        { role: "system", content: finalizeSystem },
        {
          role: "user",
          content: buildFinalizeUser(
            customerIntent,
            contextFacts,
            toolCallHistory,
            finalContent || "",
            rag.prompt,
          ),
        },
      ],
      { jsonMode: true, maxTokens: 900, temperature: 0.1 },
    );
    let parsed = parseClassifyPayload(finalized, allowed);
    if (parsed.weakRecovery) {
      const repaired = await callChat(
        config,
        [
          {
            role: "system",
            content: finalizeSystem,
          },
          {
            role: "user",
            content: `上一次输出无法解析。请重新输出严格 JSON。参考草稿：\n${finalized.slice(0, 2500)}\n工具摘要：\n${toolCallHistory
              .map((h) => `${h.toolName}:${h.result.slice(0, 200)}`)
              .join("\n")}`,
          },
        ],
        { jsonMode: true, maxTokens: 800, temperature: 0 },
      );
      parsed = parseClassifyPayload(repaired, allowed);
      // 弱回退不要把 ambiguous 永久钉死为 true，否则会全转人工
      if (parsed.weakRecovery && parsed.matchedScene !== "unsupported") {
        parsed = {
          ...parsed,
          ambiguous: false,
          confidence: parsed.confidence === "low" ? "medium" : parsed.confidence,
          reasoning: `${parsed.reasoning} [weak_recovery_cleared_ambiguous]`,
        };
      } else {
        parsed = {
          ...parsed,
          reasoning: `${parsed.reasoning} [v3_finalized_json]`,
        };
      }
      return {
        ...parsed,
        retrievedCases,
        toolCallHistory,
        totalToolRounds: totalRounds + 2,
      };
    }
    return {
      ...parsed,
      retrievedCases,
      toolCallHistory,
      totalToolRounds: totalRounds + 1,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("TOOL_CALLING_UNSUPPORTED") ||
      (err instanceof LlmError && /tool/i.test(msg))
    ) {
      const exceptionInfos = await lookupExceptions(contextFacts.allEventNos || []);
      const v2 = await classifySceneV2(
        customerIntent,
        contextFacts,
        exceptionInfos,
        config,
        options,
      );
      return {
        ...v2,
        retrievedCases: v2.retrievedCases || retrievedCases,
        reasoning: `[v3→v2 降级] ${msg}; ${v2.reasoning}`,
        toolCallHistory: [],
        totalToolRounds: 0,
        degradedToV2: true,
      };
    }
    return {
      ...degrade(`v3 LLM 调用失败，降级: ${msg}`),
      retrievedCases,
      toolCallHistory: [],
      totalToolRounds: 0,
    };
  }
}

/** Exported for tests / docs. */
export { formatExceptionDetails, executeSceneTool };
