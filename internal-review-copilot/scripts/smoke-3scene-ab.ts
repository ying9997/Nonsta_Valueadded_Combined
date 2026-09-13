/**
 * Smoke: A/B mock inputs should reach check-completeness (L3 or L4).
 * Usage: npx tsx internal-review-copilot/scripts/smoke-3scene-ab.ts
 */
import { checkCompleteness } from "../lib/check-completeness.ts";
import { matchTemplate } from "../lib/match-template.ts";
import { runPipeline } from "../lib/run-pipeline.ts";
import type { ContextFacts, JsonRecord } from "../lib/types.ts";

function detail(params: {
  orderNo: string;
  sceneCode: string;
  sceneName: string;
  rd: string;
  beor: string;
  files: string[];
  wi?: string;
}): JsonRecord {
  return {
    orderNo: params.orderNo,
    listHeader: {
      orderNo: params.orderNo,
      vasc: { productCode: "VASC202411192246131", productName: "入库非标增值（特批）" },
      businessOrder: { businessNo: params.wi || "" },
    },
    atoms: [
      {
        serviceCode: "OW01V1602",
        serviceName: "入库其他服务需求",
        sceneOverviewCode: params.sceneCode,
        sceneOverviewName: params.sceneName,
        vaAtomAttrs: [
          {
            attributeKey: "BEOR",
            attributeName: "需求背景说明",
            attributeValue: params.beor,
            attributeValueOriginal: params.beor,
          },
          {
            attributeKey: "VAS_ATTR_REL_RD",
            attributeName: "需求描述",
            attributeValue: params.rd,
            attributeValueOriginal: params.rd,
          },
          ...(params.wi
            ? [
                {
                  attributeKey: "VAS_ATTR_REL_NWEON",
                  attributeName: "上架入库单号",
                  attributeValue: params.wi,
                  attributeValueOriginal: params.wi,
                },
              ]
            : []),
        ],
        vaAtomFiles: params.files.map((fileType) => ({ fileType, fileName: `${fileType}.pdf` })),
      },
    ],
    events: [],
    errors: [],
  };
}

async function main(): Promise<void> {
  const a = await runPipeline(
    detail({
      orderNo: "SMOKE_A_001",
      sceneCode: "20250407008",
      sceneName: "【入库】包裹类异常换商品标签上架",
      beor: "包裹类异常，包裹条码正常但商品条码异常",
      rd: "请换商品标签后上架到新入库单，并关闭异常单",
      files: ["VAS_ATTR_REL_LF"],
      wi: "WI99990001",
    }),
    { skipLlm: true },
  );

  const b = await runPipeline(
    detail({
      orderNo: "SMOKE_B_001",
      sceneCode: "20250522001",
      sceneName: "【入库】指定商品拍照暂存",
      beor: "客户要求指定商品拍照后暂存",
      rd: "请对指定商品拍照暂存，等客户确认后再处理，不要直接上架",
      files: [],
      wi: "WI99990002",
    }),
    { skipLlm: true },
  );

  console.log(
    JSON.stringify(
      {
        A: {
          outputPath: a?.outputPath,
          nodesHit: a?.nodesHit,
          failureGate: a?.failureGate,
          sceneKey: a?.matchResult?.sceneKey,
          supported: a?.matchResult?.supported,
          decision: a?.matchResult?.decision,
          complete: a?.completenessResult?.complete,
        },
        B: {
          outputPath: b?.outputPath,
          nodesHit: b?.nodesHit,
          failureGate: b?.failureGate,
          sceneKey: b?.matchResult?.sceneKey,
          supported: b?.matchResult?.supported,
          decision: b?.matchResult?.decision,
          complete: b?.completenessResult?.complete,
        },
      },
      null,
      2,
    ),
  );

  // Direct completeness unit check for empty requiredFieldKeys
  const ctx = {
    attachmentStatus: {
      操作说明附件: "missing",
      商品和标签的对应关系: "missing",
      包裹和标签的对应关系: "missing",
      "视频拍摄SOP（中文+英文）": "missing",
      标签文件: "missing",
    },
    allBusinessOrderNos: ["WI1"],
    providedFields: { VAS_ATTR_REL_NWEON: "WI1" },
  } as unknown as ContextFacts;
  const matchB = matchTemplate("指定商品拍照暂存等客户确认，不要上架", ctx);
  const compB = checkCompleteness(ctx, { ...matchB, supported: true, sceneKey: "inbound_photo_hold" });
  console.log("B completeness empty-required:", compB);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
