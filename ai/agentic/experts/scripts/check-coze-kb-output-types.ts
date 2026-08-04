/**
 * 检查所有 workflow.json 中代码节点的 cozeIo.outputs 类型声明是否与源码实际返回值一致：
 *
 * 规则 1（object 但实为 string）：
 *   - key 对应变量是字符串常量（template literal / 单引号字符串）
 *   - key 直接返回字符串字面量
 *
 * 规则 2（object 但实为 array）：
 *   - return 语句中 key: [] 或 key: someArr（someArr.filter / .slice / .map / .push 等）
 *   - 或声明 const/let arr: ...[] = [] 然后 return { key: arr }
 *
 * 可作为独立 CLI 脚本或从 audit-coze-export-issues.ts 引入。
 */
import * as fs from "fs";
import * as path from "path";

export interface KbOutputTypeIssue {
  expert: string;
  rel: string;
  node: string;
  key: string;
  hint: string;
}

function findExpertDirs(dir: string): string[] {
  const out: string[] = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const p = path.join(dir, d.name);
    if (fs.existsSync(path.join(p, "manifest.json"))) out.push(p);
    else out.push(...findExpertDirs(p));
  }
  return out;
}

/** 检测 object 声明但实为 string 的情形 */
function checkObjectDeclaredAsString(
  key: string,
  src: string
): string | null {
  // 变量引用：key: SOME_VAR，且 SOME_VAR 是字符串常量
  const returnValMatch = src.match(new RegExp(`\\b${key}\\s*:\\s*([A-Za-z_][A-Za-z0-9_]*)`));
  if (returnValMatch) {
    const varName = returnValMatch[1];
    const isStringConst =
      new RegExp(`const\\s+${varName}\\s*=\\s*[\`'"]`).test(src) ||
      new RegExp(`let\\s+${varName}\\s*=\\s*[\`'"]`).test(src);
    if (isStringConst) {
      return `变量 ${varName} 是字符串常量，但 cozeIo.outputs.${key}.type 声明为 object`;
    }
  }
  // 直接字符串字面量：key: `...` 或 key: '...'
  if (new RegExp(`\\b${key}\\s*:\\s*[\`'"]`).test(src)) {
    return `key 直接返回字符串字面量，但 cozeIo.outputs.${key}.type 声明为 object`;
  }
  return null;
}

/** 检测 object 声明但实为 array 的情形 */
function checkObjectDeclaredAsArray(
  key: string,
  src: string
): string | null {
  // 直接返回空数组：key: []
  if (new RegExp(`\\b${key}\\s*:\\s*\\[`).test(src)) {
    return `key 直接返回数组字面量 []，但 cozeIo.outputs.${key}.type 声明为 object`;
  }
  // 引用变量，且该变量被声明或赋值为数组类型
  const returnValMatch = src.match(new RegExp(`\\b${key}\\s*:\\s*([A-Za-z_][A-Za-z0-9_]*)`));
  if (returnValMatch) {
    const varName = returnValMatch[1];

    // 如果 return 表达式中变量后跟了 .join/.toString 等转字符串方法，实际是 string，跳过
    const returnExprMatch = src.match(new RegExp(`\\b${key}\\s*:\\s*([^,}\\n]+)`));
    const returnExpr = returnExprMatch ? returnExprMatch[1] : "";
    if (/\.join\s*\(|\.toString\s*\(|String\s*\(/.test(returnExpr)) {
      return null;
    }

    // const/let varName: SomeType[] 或 = []
    const isArrayDecl =
      new RegExp(`(?:const|let)\\s+${varName}\\s*:\\s*(?:[A-Za-z<>,\\s]+\\[\\]|Array<)`).test(src) ||
      new RegExp(`(?:const|let)\\s+${varName}\\s*=\\s*\\[`).test(src);
    // varName 来源于 .filter / .slice / .map 等数组方法
    const isArrayExpr =
      new RegExp(`\\b${varName}\\s*=\\s*[\\w.]+\\s*\\.(?:filter|slice|map|concat|flat|flatMap)\\s*\\(`).test(src) ||
      // 只检测 varName.push( 形式（不含其他变量的 push）
      new RegExp(`\\b${varName}\\s*\\.(?:push|unshift)\\s*\\(`).test(src);

    if (isArrayDecl || isArrayExpr) {
      return `变量 ${varName} 是数组，但 cozeIo.outputs.${key}.type 声明为 object`;
    }
  }
  return null;
}

export function auditAllExpertsKbOutputTypes(expertsRoot: string): KbOutputTypeIssue[] {
  const issues: KbOutputTypeIssue[] = [];

  for (const expertDir of findExpertDirs(expertsRoot)) {
    const wfPath = path.join(expertDir, "workflow.json");
    if (!fs.existsSync(wfPath)) continue;
    const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));

    for (const node of wf.nodes ?? []) {
      if (!node.file) continue;
      const srcPath = path.join(expertDir, node.file);
      if (!fs.existsSync(srcPath)) continue;
      const src = fs.readFileSync(srcPath, "utf-8");

      for (const [key, schema] of Object.entries<{ type?: string }>(node.cozeIo?.outputs ?? {})) {
        if (schema.type !== "object") continue;

        const stringHint = checkObjectDeclaredAsString(key, src);
        if (stringHint) {
          issues.push({
            expert: expertDir,
            rel: path.relative(expertsRoot, expertDir).replace(/\\/g, "/"),
            node: node.id,
            key,
            hint: stringHint,
          });
          continue;
        }

        const arrayHint = checkObjectDeclaredAsArray(key, src);
        if (arrayHint) {
          issues.push({
            expert: expertDir,
            rel: path.relative(expertsRoot, expertDir).replace(/\\/g, "/"),
            node: node.id,
            key,
            hint: arrayHint,
          });
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.rel}|${i.node}|${i.key}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

if (require.main === module) {
  const EXPERTS_ROOT = path.join(process.cwd(), "experts");
  const issues = auditAllExpertsKbOutputTypes(EXPERTS_ROOT);

  if (issues.length === 0) {
    console.log("✅ 未发现 cozeIo.outputs 类型错误（声明 object 但实为 string 或 array）");
    process.exit(0);
  } else {
    console.log(`❌ 发现 ${issues.length} 处 cozeIo.outputs 类型错误：\n`);
    for (const issue of issues) {
      console.log(`  [${issue.rel}] node: ${issue.node}, key: ${issue.key}`);
      console.log(`    → ${issue.hint}\n`);
    }
    process.exit(1);
  }
}
