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

  const rephoto416175 = matchTemplate(
    "EB0526092333330471异常单里的货物，需要拣选其中一个单品，打开外包装拍里面的实物图片，拍完后复原包装",
    {
      ...emptyContext(),
      orderNo: "VASC000000416175",
      customerCode: "11103701",
      customerName: "香港順信達科技有限公司",
      warehouseCode: "DEBR2",
      warehouseName: "DEBR2 Warehouse",
      eventNo: "EB0526092333330471",
      allEventNos: ["EB0526092333330471"],
      businessType: "INHOUSE",
      businessTypeDesc: "库内订单",
      serviceAtom: "OSF6V1603",
    },
  );
  const rephoto416175Pass =
    rephoto416175.decision === "supported" &&
    rephoto416175.sceneKey === "instock_exception_rephoto";
  console.log(
    JSON.stringify(
      {
        id: "regression-vasc416175-instock-exception-rephoto",
        actual_decision: rephoto416175.decision,
        actual_sceneKey: rephoto416175.sceneKey,
        actual_topK: rephoto416175.topK.map((candidate) => ({
          sceneKey: candidate.sceneKey,
          score: candidate.score,
        })),
        pass: rephoto416175Pass,
        note: "VASC000000416175 是 L2 场景识别回归：异常单货物打开外包装拍实物图片后复原包装，应命中【库内】异常重新拍照，不能落到商品组合 L2.5 必填项。",
      },
      null,
      2,
    ),
  );
  if (!rephoto416175Pass) failed += 1;

  const crossWarehouseTransfer = matchTemplate(
    "包裹串仓异常调拨：EB0126100800001 发错仓库，需从 DE 仓调拨到 DEBR2 目的仓库，并按 WI50000001 上架。",
    {
      ...inboundOrderContext,
      eventNo: "EB0126100800001",
      businessOrderNo: "WI50000001",
      allEventNos: ["EB0126100800001"],
      allBusinessOrderNos: ["WI50000001"],
      serviceAtom: "OW01V1654",
    },
  );
  const crossWarehouseTransferPass =
    crossWarehouseTransfer.decision === "supported" &&
    crossWarehouseTransfer.sceneKey === "inbound_parcel_cross_warehouse_transfer";
  console.log(
    JSON.stringify(
      {
        id: "smoke-ow01v1654-cross-warehouse-transfer",
        serviceAtom: "OW01V1654",
        actual_decision: crossWarehouseTransfer.decision,
        actual_sceneKey: crossWarehouseTransfer.sceneKey,
        actual_topK: crossWarehouseTransfer.topK.map((candidate) => ({
          sceneKey: candidate.sceneKey,
          score: candidate.score,
        })),
        pass: crossWarehouseTransferPass,
        note: "OW01V1654 串仓文本应命中已有包裹串仓异常调拨卡",
      },
      null,
      2,
    ),
  );
  if (!crossWarehouseTransferPass) failed += 1;

  const ownershipTransferRelabel = matchTemplate(
    "货权转移（换标模式）：增值单品数量 50，下架出库单号 WO12329778184，上架入库单号 WI53210075，附件含库存转移协议、库存转移表、打印单品条码。",
    {
      ...emptyContext(),
      businessType: "INHOUSE",
      businessTypeDesc: "库内订单",
      businessOrderNo: "IH000000124041",
      warehouseCode: "UKGF",
      serviceAtom: "OSF6V1646",
    },
  );
  const ownershipTransferRelabelPass =
    ownershipTransferRelabel.decision === "supported" &&
    ownershipTransferRelabel.sceneKey === "instock_ownership_transfer_relabel";
  console.log(
    JSON.stringify(
      {
        id: "smoke-osf6v1646-ownership-transfer-relabel",
        serviceAtom: "OSF6V1646",
        actual_decision: ownershipTransferRelabel.decision,
        actual_sceneKey: ownershipTransferRelabel.sceneKey,
        actual_topK: ownershipTransferRelabel.topK.map((candidate) => ({
          sceneKey: candidate.sceneKey,
          score: candidate.score,
        })),
        pass: ownershipTransferRelabelPass,
        note: "OSF6V1646 货权转移换标文本应命中已有库内货权转移（换标模式）卡",
      },
      null,
      2,
    ),
  );
  if (!ownershipTransferRelabelPass) failed += 1;

  console.log(`summary-with-order-type failed=${failed} total=${raw.cases.length + 4}`);
  if (failed) process.exit(1);
}

main();
