/**
 * 生成万邑通 OpenAPI 透传 Coze 工作流包（开始 → cobra_winit_openapi_request → 结束）。
 *
 * 用法:
 *   npx ts-node -P scripts/tsconfig.json scripts/export-winit-openapi-proxy-cli.ts [--out <dir>] [--workflow-id <id>] [--no-zip]
 */

import * as pathMod from "path";
import {
  defaultWinitOpenapiProxyEmitOptions,
  writeWinitOpenapiProxyCozePackage,
  WINIT_OPENAPI_PROXY_DEFAULT_WORKFLOW_ID,
} from "./coze-export/winit-openapi-proxy-emit";
import { zipCozeWorkflowPackage } from "./coze-export/zip-workflow";

const repoRoot = pathMod.resolve(__dirname, "..");
const cozeZipOutputDir = pathMod.join(repoRoot, "experts_coze_output");

function parseArgs(argv: string[]): {
  outRoot: string;
  workflowId: string | null;
  noZip: boolean;
} {
  const rest = argv.slice(2);
  let outRoot = pathMod.join(repoRoot, "tmp", "coze_winit_openapi_proxy");
  let workflowId: string | null = null;
  let noZip = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === "--out") {
      outRoot = pathMod.resolve(rest[++i] ?? "");
      continue;
    }
    if (a === "--workflow-id") {
      workflowId = rest[++i] ?? "";
      continue;
    }
    if (a === "--no-zip") {
      noZip = true;
      continue;
    }
    if (a.startsWith("--")) {
      throw new Error(`未知参数: ${a}`);
    }
  }
  return { outRoot, workflowId, noZip };
}

const { outRoot, workflowId, noZip } = parseArgs(process.argv);

const opts = defaultWinitOpenapiProxyEmitOptions({
  workflowId: workflowId?.trim() || WINIT_OPENAPI_PROXY_DEFAULT_WORKFLOW_ID,
});

writeWinitOpenapiProxyCozePackage(outRoot, opts);

const workflowRoot = pathMod.join(outRoot, "workflow");
console.log(`Wrote ${pathMod.join(workflowRoot, "MANIFEST.yml")}`);
console.log(`Wrote ${pathMod.join(workflowRoot, "workflow", opts.yamlBasename)}`);

if (!noZip) {
  const zipPath = pathMod.join(cozeZipOutputDir, "winit_openapi_call.zip");
  zipCozeWorkflowPackage(workflowRoot, zipPath);
  console.log(`Wrote zip ${zipPath}`);
}
