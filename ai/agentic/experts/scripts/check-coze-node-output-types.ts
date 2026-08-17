/**
 * 使用 TypeScript Compiler API 推断各代码节点 main() 函数返回值的实际类型，
 * 并与 workflow.json 中 cozeIo.outputs 的类型声明对比，报告所有不匹配项。
 *
 * 检测范围：object / array / string / boolean / integer（number）互相混用
 *
 * 用法：
 *   npx ts-node -P scripts/tsconfig.json scripts/check-coze-node-output-types.ts
 *   npm run check:coze-node-output-types
 */
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

// ─── Coze type mapping ───────────────────────────────────────────────────────

/**
 * 将 TypeScript 类型转换为对应的 Coze 类型标识。
 * 返回 null 表示无法确定（不报告）。
 */
function tsTypeToCozeType(
  type: ts.Type,
  checker: ts.TypeChecker
): "string" | "boolean" | "integer" | "float" | "array" | "object" | null {
  // 去掉 null / undefined（nullable）
  const nonNull = type.getNonNullableType();
  const flags = nonNull.flags;

  if (flags & ts.TypeFlags.StringLike) return "string";
  if (flags & ts.TypeFlags.BooleanLike) return "boolean";
  if (flags & ts.TypeFlags.NumberLike) {
    // 判断是整数还是浮点 — Coze 都接受 integer
    return "integer";
  }

  // 数组 T[] 或 Array<T>
  if (checker.isArrayType(nonNull)) return "array";
  if (checker.isTupleType(nonNull)) return "array";

  // 联合类型：递归推断各分支，如果所有非 null/undefined 分支类型一致则返回
  if (nonNull.isUnion()) {
    const parts = (nonNull as ts.UnionType).types
      .filter((t) => !(t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)))
      .map((t) => tsTypeToCozeType(t, checker))
      .filter((t): t is NonNullable<typeof t> => t !== null);
    const uniq = [...new Set(parts)];
    if (uniq.length === 1) return uniq[0]!;
    // string | boolean 等混合联合 → 不确定，skip
    return null;
  }

  // 字面量类型
  if (flags & ts.TypeFlags.StringLiteral) return "string";
  if (flags & ts.TypeFlags.BooleanLiteral) return "boolean";
  if (flags & ts.TypeFlags.NumberLiteral) return "integer";

  // object / Record<K,V> / interface / class
  if (
    flags & ts.TypeFlags.Object ||
    flags & ts.TypeFlags.Intersection
  ) {
    return "object";
  }

  return null;
}

// ─── Per-file analysis ───────────────────────────────────────────────────────

interface ReturnPropTypes {
  [key: string]: string; // Coze type string
}

/**
 * 编译单个 FaaS 节点 TS 文件，提取 main() 所有 return 语句的联合类型。
 * 返回 { key → cozeType } 映射；无法推断的 key 不包含在内。
 */
function inferNodeReturnTypes(srcFile: string): ReturnPropTypes {
  const options: ts.CompilerOptions = {
    strict: false,
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    lib: ["lib.es2020.d.ts"],
    // 允许缺少类型定义
    skipLibCheck: true,
    noImplicitAny: false,
  };

  const program = ts.createProgram([srcFile], options);
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(srcFile);
  if (!sf) return {};

  // 找 main 函数（支持 async function main / const main = async...）
  let mainFn: ts.FunctionLikeDeclaration | null = null;
  ts.forEachChild(sf, (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "main"
    ) {
      mainFn = node;
    } else if (
      ts.isVariableStatement(node)
    ) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === "main" &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          mainFn = decl.initializer as ts.FunctionLikeDeclaration;
        }
      }
    }
  });

  if (!mainFn) return {};

  // 获取 main 函数的返回类型（TypeScript 推断）
  const mainType = checker.getTypeAtLocation(mainFn);
  const callSigs = mainType.getCallSignatures();
  if (callSigs.length === 0) return {};

  const sig = callSigs[0]!;
  let retType = checker.getReturnTypeOfSignature(sig);

  // 解包 Promise<T>
  if (retType.symbol?.name === "Promise") {
    const args = (retType as ts.TypeReference).typeArguments;
    if (args && args.length > 0) retType = args[0]!;
  }

  // 提取所有属性
  const result: ReturnPropTypes = {};
  for (const prop of checker.getPropertiesOfType(retType)) {
    const propType = checker.getTypeOfSymbolAtLocation(prop, sf);
    const cozeType = tsTypeToCozeType(propType, checker);
    if (cozeType !== null) {
      result[prop.name] = cozeType;
    }
  }
  return result;
}

// ─── Audit logic ─────────────────────────────────────────────────────────────

export interface NodeOutputTypeIssue {
  expert: string;
  rel: string;
  node: string;
  key: string;
  declared: string;
  inferred: string;
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

/**
 * 将 Coze node_outputs 类型名归一化为检测使用的 key。
 * workflow.json 中用的是 JSON Schema type 名称（array / object / string / boolean / integer）。
 */
function normalizeCozeType(t: string | undefined): string {
  if (!t) return "unknown";
  if (t === "list") return "array"; // Coze draft YAML 用 list，workflow.json 用 array
  return t;
}

export function auditAllExpertsNodeOutputTypes(expertsRoot: string): NodeOutputTypeIssue[] {
  const issues: NodeOutputTypeIssue[] = [];

  for (const expertDir of findExpertDirs(expertsRoot)) {
    const wfPath = path.join(expertDir, "workflow.json");
    if (!fs.existsSync(wfPath)) continue;
    const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));
    const rel = path.relative(expertsRoot, expertDir).replace(/\\/g, "/");

    for (const node of wf.nodes ?? []) {
      if (!node.file) continue;
      const srcPath = path.join(expertDir, node.file);
      if (!fs.existsSync(srcPath)) continue;

      const cozeOutputs: Record<string, { type?: string }> = node.cozeIo?.outputs ?? {};
      if (Object.keys(cozeOutputs).length === 0) continue;

      let inferred: ReturnPropTypes;
      try {
        inferred = inferNodeReturnTypes(srcPath);
      } catch {
        continue; // 编译失败则跳过
      }

      for (const [key, schema] of Object.entries(cozeOutputs)) {
        const declared = normalizeCozeType(schema.type);
        const inf = inferred[key];
        if (!inf) continue; // 推断不出来，跳过

        if (declared !== inf) {
          issues.push({
            expert: expertDir,
            rel,
            node: node.id,
            key,
            declared,
            inferred: inf,
            hint: `声明 ${declared}，推断 ${inf}`,
          });
        }
      }
    }
  }

  return issues;
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

if (require.main === module) {
  const EXPERTS_ROOT = path.join(process.cwd(), "experts");
  const issues = auditAllExpertsNodeOutputTypes(EXPERTS_ROOT);

  if (issues.length === 0) {
    console.log("✅ 未发现 cozeIo.outputs 类型错误（TypeScript 推断一致）");
    process.exit(0);
  }

  console.log(`❌ 发现 ${issues.length} 处 cozeIo.outputs 类型错误：\n`);

  const byExpert = new Map<string, NodeOutputTypeIssue[]>();
  for (const i of issues) {
    const list = byExpert.get(i.rel) ?? [];
    list.push(i);
    byExpert.set(i.rel, list);
  }

  for (const [rel, list] of [...byExpert.entries()].sort()) {
    console.log(`  [${rel}]`);
    for (const i of list) {
      console.log(`    node: ${i.node}, key: ${i.key}  →  ${i.hint}`);
    }
    console.log();
  }

  process.exit(1);
}
