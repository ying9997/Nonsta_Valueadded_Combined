/**
 * Smoke test for match-template v0.2 + scenario cards.
 * Does not score accuracy. Does not treat pending review orders as gold.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { matchTemplate } from "../lib/match-template.ts";
import { findScenarioCard } from "../lib/scenario-cards.ts";
import type { ContextFacts, MatchDecision } from "../lib/types.ts";

interface SmokeCase {
  id: string;
  input_message: string;
  expected_decision: MatchDecision | MatchDecision[];
  expected_topk_contains: string[];
  must_not?: string[];
  businessType?: string;
  businessTypeDesc?: string;
  notes?: string;
}

function emptyContext(): ContextFacts {
  return {
    orderNo: "SMOKE",
    customerCode: "",
    customerName: "",
    warehouseCode: "",
    warehouseName: "",
    eventNo: "",
    businessOrderNo: "",
    allEventNos: [],
    allBusinessOrderNos: [],
    vaSource: "",
    businessType: "",
    businessTypeDesc: "",
    sceneKey: "",
    sceneName: "",
    sceneCode: "",
    serviceAtom: "OW01V1602",
    attachmentStatus: {},
    providedFields: {},
    boundKeys: [],
  };
}

function asList(value: MatchDecision | MatchDecision[]): MatchDecision[] {
  return Array.isArray(value) ? value : [value];
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const casesPath = resolve(here, "../eval/match-template-v0.2-smoke-cases.json");
  const raw = JSON.parse(readFileSync(casesPath, "utf8")) as { cases: SmokeCase[] };
  const context = emptyContext();
  let failed = 0;

  for (const item of raw.cases) {
    const caseContext = {
      ...context,
      businessType: item.businessType || "",
      businessTypeDesc: item.businessTypeDesc || "",
    };
    const result = matchTemplate(item.input_message, caseContext);
    const topKeys = result.topK.map((candidate) => candidate.sceneKey);
    const expectedDecisions = asList(item.expected_decision);
    const decisionOk = expectedDecisions.includes(result.decision);
    const topkOk = item.expected_topk_contains.every((key) => topKeys.includes(key));
    const mustNotOk = (item.must_not || []).every((key) => !topKeys.includes(key));
    const winner = result.topK[0];
    const winnerCard = winner ? findScenarioCard(winner.sceneKey) : undefined;
    const attachmentPending =
      !winnerCard ||
      winnerCard.requiredAttachmentPolicy.status === "pending_business_confirmation" ||
      winnerCard.requiredAttachmentPolicy.status === "simulated_pending_business_confirmation";
    const abNotAutoRun =
      !winner ||
      winner.sceneKey === "inbound_label_identify" ||
      result.supported === false;
    const pass = decisionOk && topkOk && mustNotOk;

    if (!pass) failed += 1;
    console.log(
      JSON.stringify(
        {
          id: item.id,
          expected_decision: item.expected_decision,
          actual_decision: result.decision,
          expected_topk_contains: item.expected_topk_contains,
          actual_topK: result.topK.map((candidate) => ({
            sceneKey: candidate.sceneKey,
            score: candidate.score,
            confidence: candidate.confidence,
          })),
          supported: result.supported,
          reason: result.reason,
          attachmentPending,
          abNotAutoRun,
          pass,
        },
        null,
        2,
      ),
    );
  }

  console.log(`summary failed=${failed} total=${raw.cases.length}`);

  const inboundOrderContext: ContextFacts = {
    ...emptyContext(),
    businessType: "INBOUND",
    businessTypeDesc: "入库订单",
  };
  const inboundVsInstock = matchTemplate(
    "A+包裹更换标签上架，库内换标后重新上架到原库位",
    inboundOrderContext,
  );
  const instockInTop = inboundVsInstock.topK.some((candidate) => candidate.sceneKey.startsWith("instock_"));
  const orderTypePass = !instockInTop;
  console.log(
    JSON.stringify(
      {
        id: "smoke-inbound-order-type-blocks-instock",
        businessTypeDesc: "入库订单",
        actual_topK: inboundVsInstock.topK.map((candidate) => ({
          sceneKey: candidate.sceneKey,
          score: candidate.score,
        })),
        pass: orderTypePass,
        note: "入库订单不得出现库内卡",
      },
      null,
      2,
    ),
  );
  if (!orderTypePass) failed += 1;

  console.log(`summary-with-order-type failed=${failed} total=${raw.cases.length + 1}`);
  if (failed) process.exit(1);
}

main();
