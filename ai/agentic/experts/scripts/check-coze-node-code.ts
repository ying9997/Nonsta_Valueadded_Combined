/**
 * 检查专家 workflow.json 代码节点：import 是否仅来自 shared/，且导出内联后无 import/export 残留。
 *
 * 用法:
 *   npx ts-node -P scripts/tsconfig.json scripts/check-coze-node-code.ts [expertDir...] [--strict]
 *
 * 无 positional 参数时扫描 experts/ 下全部可导出专家。
 * npm run check:coze-node-code
 */

import * as pathMod from "path";
import {
  checkCozeNodeCodeImports,
  findRepoRoot,
} from "./coze-export/bundle-coze-node-code";
import { discoverExpertDirs } from "./export-all-experts-coze";

function main() {
  const argv = process.argv.slice(2);
  const strict = argv.includes("--strict") || String(process.env.COZE_NODE_CODE_STRICT ?? "").trim() === "1";
  const positional = argv.filter((a) => !a.startsWith("--"));
  const repoRoot = findRepoRoot(__dirname);

  const expertDirs =
    positional.length > 0
      ? positional.map((p) => pathMod.resolve(p))
      : discoverExpertDirs(pathMod.join(repoRoot, "experts"));

  let errors = 0;
  for (const dir of expertDirs) {
    const rel = pathMod.relative(repoRoot, dir).replace(/\\/g, "/");
    const errs = checkCozeNodeCodeImports(dir, repoRoot);
    for (const e of errs) {
      errors++;
      const msg = `[coze-node-code] ${rel}: ${e}`;
      if (strict) console.error(msg);
      else console.warn(msg);
    }
  }

  if (strict && errors > 0) process.exit(1);
}

main();
