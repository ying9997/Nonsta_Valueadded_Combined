/**
 * 审计批处理插件上游 list 是否含 action/data properties。
 * 用法: npm run check:coze-batch-actions
 */

import * as pathMod from "path";
import { auditAllExpertsBatchActionsSchema } from "./coze-export/batch-actions-audit";
import { findRepoRoot } from "./coze-export/bundle-coze-node-code";

const repoRoot = findRepoRoot(__dirname);
const expertsRoot = pathMod.join(repoRoot, "experts");

function main() {
  const issues = auditAllExpertsBatchActionsSchema(expertsRoot);
  const byExpert = new Map<string, typeof issues>();
  for (const i of issues) {
    const list = byExpert.get(i.expertId) ?? [];
    list.push(i);
    byExpert.set(i.expertId, list);
  }

  console.log(
    `批处理 action/data schema 审计：${issues.length} 个问题，${byExpert.size} 个专家受影响\n`
  );

  if (issues.length === 0) {
    console.log("未发现问题。");
    return;
  }

  for (const [expertId, list] of [...byExpert.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`## ${expertId} (${list[0]!.rel})`);
    for (const i of list) {
      const tag = i.nonStandard ? "非标准字段名" : "schema 缺失";
      console.log(`  - [${tag}] 插件 ${i.plugin} ← ${i.srcNode}.${i.pathKey}: ${i.problem}`);
    }
    console.log("");
  }

  process.exit(1);
}

main();
