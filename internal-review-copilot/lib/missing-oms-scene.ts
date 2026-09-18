/**
 * 知识库场景对不上 OMS 场景概述码：SOP 仍写入，不选下拉，@ 金萤找业务确认。
 */
import { alertUserId } from "./canary.ts";
import { sendPersonalMessage } from "./feishu-bot.ts";
import { resolveSceneOverviewCode } from "./oms-draft-write.ts";
import { findScenarioCard, supportedCardsMissingOmsSceneCode } from "./scenario-cards.ts";

export function needsOmsSceneConfirm(args: {
  sceneKey?: string;
  decision?: string;
  outputPath?: string;
  riskFlags?: string[];
}): boolean {
  if (args.outputPath && args.outputPath !== "sop_generated") return false;
  if ((args.riskFlags || []).includes("unmatched_scene_sop")) return true;
  const key = String(args.sceneKey || "").trim();
  if (!key || key === "unsupported") return args.decision === "unsupported";
  return resolveSceneOverviewCode(key).missing;
}

export function missingOmsSceneAlertText(args: {
  vascNo: string;
  sceneKey?: string;
  sceneName?: string;
  customer?: string;
  warehouse?: string;
  ownerOpenId?: string;
}): string {
  const at = args.ownerOpenId ? `<at id=${args.ownerOpenId}></at> ` : "";
  const head = [args.vascNo, args.customer, args.warehouse].filter(Boolean).join(" | ");
  const key = args.sceneKey || "";
  const name =
    args.sceneName ||
    (key && key !== "unsupported" ? findScenarioCard(key)?.sceneName : "") ||
    (key === "unsupported" || !key ? "未匹配到知识库场景" : key);
  const catalog = supportedCardsMissingOmsSceneCode()
    .map((card) => `${card.sceneName}（${card.sceneKey}）`)
    .slice(0, 8)
    .join("、");
  return [
    `${at}${head}`,
    `知识库场景「${name}」${key ? `（${key}）` : ""}没有对应的 OMS 场景概述码。`,
    "SOP 已按「不选场景概述」写入 OMS（若本单仍待审核）。请找业务确认该场景该选哪个下拉项，确认后把码回填场景卡。",
    catalog ? `同类还没码的生效卡还有：${catalog}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function notifyOwnerMissingOmsScene(args: {
  vascNo: string;
  sceneKey?: string;
  sceneName?: string;
  customer?: string;
  warehouse?: string;
}): Promise<"sent" | "skipped" | "error"> {
  const openId = alertUserId();
  if (!openId) return "skipped";
  const text = missingOmsSceneAlertText({ ...args, ownerOpenId: openId });
  try {
    await sendPersonalMessage(openId, text);
    return "sent";
  } catch {
    return "error";
  }
}
