/**
 * parseSceneReply + overrideScene smoke.
 *
 *   npx tsx internal-review-copilot/scripts/test-parse-scene-reply.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { collectSceneCandidates, parseSceneReply } from "../lib/parse-scene-reply.ts";
import { runPipeline } from "../lib/run-pipeline.ts";
import { loadScenarioCards } from "../lib/scenario-cards.ts";
import { projectDir } from "../lib/env.ts";
import type { MatchResult } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  const cards = loadScenarioCards();
  assert(cards.length === 5, `expected 5 scenario cards, got ${cards.length}`);

  const candidates = [
    { index: 1, sceneKey: "inbound_package_barcode_batch_relabel", sceneName: "批量异常补贴包裹标签" },
    { index: 2, sceneKey: "inbound_label_identify", sceneName: "尺重/标签辨识后换标上架" },
  ];

  const transfer0 = parseSceneReply("0", candidates);
  assert(transfer0.method === "transfer" && !transfer0.matched, `0 → transfer, got ${transfer0.method}`);

  const transferHuman = parseSceneReply("转人工处理", candidates);
  assert(transferHuman.method === "transfer", `人工 → transfer, got ${transferHuman.method}`);

  const num1 = parseSceneReply("1", candidates);
  assert(num1.matched && num1.sceneKey === "inbound_package_barcode_batch_relabel", `1 → scene1, got ${num1.sceneKey}`);

  const num4 = parseSceneReply("4", candidates);
  assert(num4.method === "unrecognized", `4 out of range → unrecognized, got ${num4.method}`);
  assert((num4.askAgain || "").includes("1-2"), `askAgain should mention 1-2, got ${num4.askAgain}`);

  const garbage = parseSceneReply("asdf乱码", candidates);
  assert(garbage.method === "unrecognized", `garbage → unrecognized, got ${garbage.method}`);

  const photo = parseSceneReply("这单是拍照暂存", []);
  assert(photo.matched && photo.sceneKey === "inbound_photo_hold", `拍照暂存 → photo_hold, got ${photo.sceneKey}`);

  const f001 = parseSceneReply("尺重", []);
  assert(f001.matched && f001.sceneKey === "inbound_label_identify", `尺重 → f001, got ${f001.sceneKey}`);

  const emptyMatch: MatchResult = {
    matched: false,
    supported: false,
    category: "C",
    sceneKey: "",
    scenarioId: "",
    scenarioName: "",
    confidence: "low",
    reason: "unsupported",
    score: 0,
    candidateTemplate: "",
    decision: "unsupported",
    confidenceScore: 0,
    candidates: [],
    topK: [],
  };
  assert(collectSceneCandidates(emptyMatch).length === 0, "unsupported with no topK → situation B");

  const inputPath = resolve(projectDir(), "_runs/20260909_demo_e2e/demo-inputs.json");
  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const detail = details.find((item) => asText(item.orderNo) === "VASC000000326061");
  assert(detail, "demo-inputs 缺少 VASC000000326061");

  const overridden = await runPipeline(detail!, {
    skipLlm: true,
    sceneLlm: false,
    overrideScene: "inbound_label_identify",
  });
  assert(overridden, "override pipeline returned null");
  assert(overridden!.matchResult?.reason === "override_by_auditor", `reason=${overridden!.matchResult?.reason}`);
  assert(overridden!.matchResult?.sceneKey === "inbound_label_identify", `scene=${overridden!.matchResult?.sceneKey}`);
  assert(
    overridden!.outputPath === "sop_generated" || overridden!.outputPath === "needs_field_clarification",
    `override outputPath=${overridden!.outputPath}`,
  );
  assert(!overridden!.nodesHit.includes("match-template"), `override should skip match-template, nodes=${overridden!.nodesHit.join(",")}`);

  const outDir = resolve(projectDir(), "_runs/20260909_demo_e2e/scene-confirm-test");
  mkdirSync(outDir, { recursive: true });
  const report = {
    cards: cards.map((card) => card.sceneKey),
    parse: { transfer0, transferHuman, num1, num4, garbage, photo, f001 },
    override: {
      outputPath: overridden!.outputPath,
      missing: overridden!.missing,
      sceneKey: overridden!.matchResult?.sceneKey,
      nodesHit: overridden!.nodesHit,
    },
  };
  writeFileSync(resolve(outDir, "parse-scene-reply.test.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`ok override → ${overridden!.outputPath} missing=[${overridden!.missing.join(",") || "-"}]`);
  console.log(`wrote ${resolve(outDir, "parse-scene-reply.test.json")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
