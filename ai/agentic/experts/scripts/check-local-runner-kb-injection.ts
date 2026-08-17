import * as path from "path";
import { runExpert } from "./run-expert";

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const expertDir = path.join(
    repoRoot,
    "experts",
    "value-add",
    "value-add-product-recommendation"
  );

  const result = await runExpert({
    expertDir,
    initialParams: {
      query: "包裹条码异常 B01E1615，原入库单还可以继续操作，我想用原单上架，应该选哪个增值服务？",
      customerIntent: "推荐原单上架 VASC",
      exceptionCode: "B01E1615",
      exceptionName: "包裹条码批量异常（需客户处理）",
      exceptionObject: "包裹",
      customerActionIntent: "USE_ORIGIN_INBOUND_ORDER",
      orderStatusHint: "原入库单可继续操作",
    },
    llmHandler: async () => ({
      analysisResult: {
        structured: {},
        analysis: "local kb injection check",
      },
    }),
  });

  const candidates = Array.isArray(result.candidateSeed) ? result.candidateSeed : [];
  const hasOriginShelveCandidate = candidates.some((candidate) => {
    return (
      candidate &&
      typeof candidate === "object" &&
      "vascCode" in candidate &&
      candidate.vascCode === "VASC202407031503503"
    );
  });

  if (!hasOriginShelveCandidate) {
    throw new Error(
      `local runner did not inject kbMappingTable into verify-with-mapping; candidateSeed=${JSON.stringify(candidates)}`
    );
  }

  console.log("Local runner KB injection OK");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
