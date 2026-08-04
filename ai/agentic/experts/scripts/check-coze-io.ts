/**
 * 检查专家 workflow.json 中带 file 的代码节点：每个 outputs 键是否已在
 * `cozeIo.outputs` 或 `outputSchema.properties` 中声明类型（与导出 `codeNodeOutputsForNode` 对齐）。
 * 例外：`result`、`outputContext` 由 manifest 等解析，不要求在 cozeIo/outputSchema 中重复声明。
 *
 * 用法:
 *   npx ts-node -P scripts/tsconfig.json scripts/check-coze-io.ts <expertDir> [--strict]
 *
 * 默认：缺失时打印 warning，退出码 0。
 * --strict：任一缺失则退出码 1。
 * 环境变量 COZE_IO_STRICT=1 等价于 --strict。
 */

import * as fs from "fs";
import * as pathMod from "path";
import type { WorkflowJson } from "./coze-export/types";

function main() {
  const argv = process.argv.slice(2);
  const strict =
    argv.includes("--strict") || String(process.env.COZE_IO_STRICT ?? "").trim() === "1";
  const positional = argv.filter((a) => !a.startsWith("--"));
  const expertDir = pathMod.resolve(positional[0] ?? "");
  if (!expertDir) {
    console.error("用法: scripts/check-coze-io.ts <expertDir> [--strict]");
    process.exit(2);
  }

  const wfPath = pathMod.join(expertDir, "workflow.json");
  if (!fs.existsSync(wfPath)) {
    console.error(`未找到 ${wfPath}`);
    process.exit(2);
  }

  const workflow = JSON.parse(fs.readFileSync(wfPath, "utf-8")) as WorkflowJson;
  let missing = 0;

  /** 与 `manifest-io.codeNodeOutputsForNode` 一致：此二键由 manifest 等解析，不强制 cozeIo / outputSchema */
  const codeNodeOutputKeysDeclaredElsewhere = new Set<string>(["result", "outputContext"]);

  for (const node of workflow.nodes ?? []) {
    if (!node.file?.trim()) continue;
    const fromCozeIo = node.cozeIo?.outputs ?? {};
    const fromOutputSchema = node.outputSchema?.properties ?? {};
    for (const key of node.outputs ?? []) {
      if (codeNodeOutputKeysDeclaredElsewhere.has(key)) {
        continue;
      }
      if (fromCozeIo[key] === undefined && fromOutputSchema[key] === undefined) {
        missing++;
        const msg = `[coze-io] ${node.id}: outputs.${key} 未在 cozeIo.outputs 或 outputSchema.properties 中声明（须由 manifest 等解析，或导出将失败）`;
        if (strict) {
          console.error(msg);
        } else {
          console.warn(msg);
        }
      }
    }
  }

  if (strict && missing > 0) {
    process.exit(1);
  }
}

main();
