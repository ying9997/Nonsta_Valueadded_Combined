import { loadScenarioCards } from "./scenario-cards.ts";
import type { MatchResult, SceneCandidate } from "./types.ts";

export type SceneReplyMethod = "number" | "keyword" | "unrecognized" | "transfer" | "ambiguous";

export interface SceneReplyResult {
  matched: boolean;
  sceneKey: string;
  sceneName: string;
  raw: string;
  method: SceneReplyMethod;
  askAgain?: string;
}

const DIGIT_EMOJI: Record<string, string> = {
  "0⃣": "0",
  "1⃣": "1",
  "2⃣": "2",
  "3⃣": "3",
  "4⃣": "4",
  "5⃣": "5",
  "6⃣": "6",
  "7⃣": "7",
  "8⃣": "8",
  "9⃣": "9",
};

const TRANSFER_RE = /人工|都不是|不确定/;

function displaySceneName(sceneName: string): string {
  return sceneName.replace(/^[§\d.]+\s*/, "").trim();
}

function normalizeReply(raw: string): string {
  let text = (raw || "").trim();
  for (const [emoji, digit] of Object.entries(DIGIT_EMOJI)) {
    text = text.replaceAll(emoji, digit);
  }
  return text.replace(/^["""']+|["""']+$/g, "").trim();
}

export function collectSceneCandidates(matchResult?: MatchResult | null): SceneCandidate[] {
  const cards = loadScenarioCards();
  const byKey = new Map(cards.map((card) => [card.sceneKey, card]));
  const seen = new Set<string>();
  const ordered: Array<{ sceneKey: string; sceneName: string; score: number }> = [];

  const push = (sceneKey: string, sceneName: string, score: number) => {
    const key = sceneKey.trim();
    if (!key || seen.has(key)) return;
    const card = byKey.get(key);
    const name = displaySceneName(sceneName || card?.sceneName || key);
    if (!card && !sceneName) return;
    seen.add(key);
    ordered.push({ sceneKey: key, sceneName: name, score });
  };

  const topK = [...(matchResult?.topK || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
  for (const item of topK) {
    if (item?.sceneKey) push(item.sceneKey, item.sceneName, item.score || 0);
  }

  const llm = matchResult?.llmClassification;
  if (llm?.matchedScene && byKey.has(llm.matchedScene)) {
    push(llm.matchedScene, byKey.get(llm.matchedScene)?.sceneName || "", 0);
  }
  for (const alt of llm?.alternativeScenes || []) {
    const key = String(alt || "").trim();
    if (!key) continue;
    if (byKey.has(key)) push(key, byKey.get(key)?.sceneName || key, 0);
    else {
      const hit = cards.find((card) => card.sceneName.includes(key) || displaySceneName(card.sceneName).includes(key));
      if (hit) push(hit.sceneKey, hit.sceneName, 0);
    }
  }

  return ordered.map((item, i) => ({
    index: i + 1,
    sceneKey: item.sceneKey,
    sceneName: item.sceneName,
  }));
}

export function unrecognizedHint(candidateList?: SceneCandidate[]): string {
  if (candidateList?.length) {
    const max = candidateList[candidateList.length - 1].index;
    return `未识别，请回复编号（1${max > 1 ? `-${max}` : ""} / 0）或场景名称关键词。`;
  }
  return "未识别，请回复场景名称关键词（如「拍照暂存」），或回复「人工」。";
}

function keywordsForCard(sceneKey: string, sceneName: string, strong: string[]): string[] {
  const keys = [
    displaySceneName(sceneName),
    ...strong.slice(0, 3),
  ]
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  return [...new Set(keys)].sort((a, b) => b.length - a.length);
}

export function parseSceneReply(
  replyText: string,
  candidateList?: SceneCandidate[],
): SceneReplyResult {
  const raw = replyText || "";
  const text = normalizeReply(raw);
  const askAgain = unrecognizedHint(candidateList);

  if (!text) {
    return { matched: false, sceneKey: "", sceneName: "", raw, method: "unrecognized", askAgain };
  }

  if (TRANSFER_RE.test(text) || /^0$/.test(text)) {
    return { matched: false, sceneKey: "", sceneName: "人工处理", raw, method: "transfer" };
  }

  if (/^\d+$/.test(text)) {
    const index = Number(text);
    if (!candidateList?.length) {
      return { matched: false, sceneKey: "", sceneName: "", raw, method: "unrecognized", askAgain };
    }
    const hit = candidateList.find((item) => item.index === index);
    if (!hit) {
      return { matched: false, sceneKey: "", sceneName: "", raw, method: "unrecognized", askAgain };
    }
    return {
      matched: true,
      sceneKey: hit.sceneKey,
      sceneName: hit.sceneName,
      raw,
      method: "number",
    };
  }

  const hits: Array<{ sceneKey: string; sceneName: string; keyword: string }> = [];
  for (const card of loadScenarioCards()) {
    const kws = keywordsForCard(card.sceneKey, card.sceneName, card.positiveSignals.strong || []);
    const matchedKw = kws.find((kw) => text.includes(kw));
    if (matchedKw) hits.push({ sceneKey: card.sceneKey, sceneName: displaySceneName(card.sceneName), keyword: matchedKw });
  }
  const uniqueKeys = [...new Set(hits.map((item) => item.sceneKey))];
  if (uniqueKeys.length === 1) {
    const hit = hits.find((item) => item.sceneKey === uniqueKeys[0]);
    return {
      matched: true,
      sceneKey: uniqueKeys[0],
      sceneName: hit?.sceneName || "",
      raw,
      method: "keyword",
    };
  }
  if (uniqueKeys.length > 1) {
    return {
      matched: false,
      sceneKey: "",
      sceneName: "",
      raw,
      method: "ambiguous",
      askAgain: `匹配到多个场景（${hits.map((item) => item.sceneName).join("、")}），请明确回复一个场景名称或编号。`,
    };
  }

  return { matched: false, sceneKey: "", sceneName: "", raw, method: "unrecognized", askAgain };
}

export function buildTransferNoticeBody(args: {
  vascNo: string;
  customer?: string;
  warehouse?: string;
  summary?: string;
  matchResult?: MatchResult | null;
  mentionName?: string;
}): { title: string; body: string; candidates: SceneCandidate[]; situation: "A" | "B" } {
  const candidates = collectSceneCandidates(args.matchResult);
  const mention = args.mentionName || "审核员";
  const summary = (args.summary || "").trim();
  const header = [
    `🔄 增值单 ${args.vascNo} AI 预审结果`,
    "",
    args.customer ? `客户：${args.customer}` : "",
    args.warehouse ? `仓库：${args.warehouse}` : "",
    summary,
  ]
    .filter(Boolean)
    .join("\n");

  if (candidates.length) {
    const lines = candidates.map((item, i) => {
      const mark = `${item.index}⃣`;
      const recommend = i === 0 ? "（AI 推荐）" : "";
      return `${mark} ${item.sceneName}${recommend}`;
    });
    const body = [
      header,
      "",
      "AI 识别到可能的场景但不够确定，请确认：",
      ...lines,
      "0⃣ 以上都不是，需要完全人工处理",
      "",
      `@${mention} 请在话题内直接回复数字（如「1」或「0」）。`,
      "处理方式：暂时",
    ].join("\n");
    return {
      title: `增值单 ${args.vascNo} 转人工`,
      body,
      candidates,
      situation: "A",
    };
  }

  const body = [
    header,
    "",
    "AI 未能识别到匹配的场景。",
    "如果您知道本单属于哪个场景，请回复场景名称关键词（如「拍照暂存」或「补贴包裹标签」）。",
    "如果需要完全人工处理，回复「人工」。",
    "",
    `@${mention} 请在话题内回复。`,
    "处理方式：暂时",
  ].join("\n");
  return {
    title: `增值单 ${args.vascNo} 转人工`,
    body,
    candidates,
    situation: "B",
  };
}
