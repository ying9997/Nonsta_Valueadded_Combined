/**
 * Re-run VASC000000366432 after attachment + topicSummary changes.
 * Does not write OMS.
 *
 *   npx tsx internal-review-copilot/scripts/verify-366432-attach-topic.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { demoTopicTitle } from "../lib/feishu-card.ts";
import { buildAgentInput } from "../lib/oms-adapter.ts";
import { runPipeline } from "../lib/run-pipeline.ts";
import type { JsonRecord } from "../lib/types.ts";

loadEnvFiles();
process.env.OMS_WRITE_ENABLED = "0";

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(here, "../../_runs/20260915_e2e_rerun/VASC000000366432.input.json");
const outDir = resolve(projectDir(), "_runs/20260915_attach_topic_summary");
mkdirSync(outDir, { recursive: true });

const detail = JSON.parse(readFileSync(inputPath, "utf8")) as JsonRecord;
const built = buildAgentInput(detail);
if (!built) throw new Error("buildAgentInput returned null");

const result = await runPipeline(detail, {
  skipLlm: true,
  sceneLlm: true,
  sceneLlmVersion: 2,
});
if (!result) throw new Error("runPipeline returned null");

/** Force a scene that requires 标签文件, so L2.5 attachment gate actually runs. */
const l25 = await runPipeline(detail, {
  skipLlm: true,
  sceneLlm: false,
  overrideScene: "inbound_label_identify",
});
if (!l25) throw new Error("L2.5 override pipeline returned null");

const report = {
  at: new Date().toISOString(),
  orderNo: result.orderNo,
  natural: {
    outputPath: result.outputPath,
    node: result.node,
    failureGate: result.failureGate,
    sceneKey: result.matchResult?.sceneKey || "",
    llmMatchedScene: result.matchResult?.llmClassification?.matchedScene || "",
    llmReasoning: result.matchResult?.llmClassification?.reasoning || "",
    topicSummary: result.matchResult?.llmClassification?.topicSummary || "",
    conclusionOneLiner: result.matchResult?.llmClassification?.conclusionOneLiner || "",
    topicTitle: demoTopicTitle(result),
  },
  l25Override: {
    sceneKey: l25.matchResult?.sceneKey || "",
    outputPath: l25.outputPath,
    node: l25.node,
    missingAttachments: l25.missingAttachments,
    missingFields: l25.missingFields,
    missing: l25.missing,
  },
  attachmentStatus: built.input.pageContext.attachmentStatus,
  uploadedFiles: built.input.omsFacts.uploadedFiles,
};

writeFileSync(resolve(outDir, "verify.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(
  resolve(outDir, "pipeline-slim.json"),
  `${JSON.stringify(
    {
      natural: {
        outputPath: result.outputPath,
        node: result.node,
        llmClassification: result.matchResult?.llmClassification,
        topicTitle: demoTopicTitle(result),
      },
      l25Override: {
        outputPath: l25.outputPath,
        node: l25.node,
        missingAttachments: l25.missingAttachments,
        attachmentStatus: l25.contextFacts?.attachmentStatus,
      },
      uploadedFiles: result.agentInput.omsFacts.uploadedFiles,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const uploaded = Object.entries(built.input.pageContext.attachmentStatus).filter(([, s]) => s === "uploaded");
if (!uploaded.length) {
  throw new Error("attachmentStatus has no uploaded labels");
}
if (!built.input.omsFacts.uploadedFiles.length) {
  throw new Error("uploadedFiles is empty");
}
if (l25.node !== "check-scene-completeness" && l25.outputPath !== "sop_generated" && l25.outputPath !== "needs_field_clarification") {
  throw new Error(`L2.5 did not run, node=${l25.node} path=${l25.outputPath}`);
}
if (l25.missingAttachments.length) {
  throw new Error(`L2.5 still missing attachments: ${l25.missingAttachments.join(", ")}`);
}

console.log(JSON.stringify(report, null, 2));
console.log(`wrote ${outDir}`);
