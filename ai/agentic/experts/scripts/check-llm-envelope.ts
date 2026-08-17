/**
 * unwrapLlmEnvelope 单元校验（扁平 / 包裹 / 字符串 / 双层）
 * npm run check:llm-envelope
 */

import { unwrapLlmEnvelope } from "../shared/unwrap-llm-envelope";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

function main(): void {
  const flat = unwrapLlmEnvelope({
    structured: { branch: "carrier_has_scan" },
    analysis: "flat ok",
  });
  assert(flat.analysis === "flat ok", "flat analysis");
  assert((flat.structured as { branch?: string }).branch === "carrier_has_scan", "flat structured");

  const wrapped = unwrapLlmEnvelope({
    analysisResult: {
      structured: { branch: "need_info" },
      analysis: "wrapped ok",
    },
  });
  assert(wrapped.analysis === "wrapped ok", "wrapped analysis");

  const double = unwrapLlmEnvelope({
    analysisResult: {
      analysisResult: {
        structured: { branch: "need_human" },
        analysis: "double ok",
      },
    },
  });
  assert(double.analysis === "double ok", "double wrap");

  const fromString = unwrapLlmEnvelope(
    '{"analysisResult":{"structured":{"branch":"x"},"analysis":"str ok"}}'
  );
  assert(fromString.analysis === "str ok", "string json");

  const classify = unwrapLlmEnvelope(
    {
      classificationResult: {
        structured: { outputPath: "classified" },
        analysis: "cls",
      },
    },
    "classificationResult"
  );
  assert(classify.analysis === "cls", "classificationResult key");

  console.log("check:llm-envelope OK");
}

main();
