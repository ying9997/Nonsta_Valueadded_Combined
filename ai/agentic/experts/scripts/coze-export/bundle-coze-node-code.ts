import * as fs from "fs";
import * as pathMod from "path";
import ts from "typescript";

/** 代码节点唯一允许的 import 来源目录（相对仓库根） */
export const COZE_NODE_IMPORT_ALLOW_PREFIX = "shared/";

const IMPORT_FROM_RE = /\bfrom\s+["']([^"']+)["']\s*;?/;

export function findRepoRoot(startDir: string): string {
  let dir = pathMod.resolve(startDir);
  for (;;) {
    const pkg = pathMod.join(dir, "package.json");
    const shared = pathMod.join(dir, "shared");
    if (fs.existsSync(pkg) && fs.existsSync(shared) && fs.statSync(shared).isDirectory()) {
      return dir;
    }
    const parent = pathMod.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`无法定位仓库根（自 ${startDir} 向上未找到 package.json + shared/）`);
}

function normalizeLf(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/** 去掉 import 语句（含多行 import） */
export function stripImportStatements(source: string): string {
  const lines = normalizeLf(source).split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^\s*import\s/.test(line)) {
      while (i < lines.length && !IMPORT_FROM_RE.test(lines[i]!)) i++;
      i++;
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join("\n");
}

/** 将 ES module 声明改为 Coze 脚本形态（去掉 export） */
export function stripExportSyntax(source: string): string {
  let s = source;
  s = s.replace(/^export\s+type\s+/gm, "type ");
  s = s.replace(/^export\s+interface\s+/gm, "interface ");
  s = s.replace(/^export\s+async\s+function\s+/gm, "async function ");
  s = s.replace(/^export\s+function\s+/gm, "function ");
  s = s.replace(/^export\s+(const|let|var)\s+/gm, "$1 ");
  s = s.replace(/^export\s+class\s+/gm, "class ");
  s = s.replace(/^export\s+default\s+/gm, "");
  s = s.replace(/^export\s+\{[\s\S]*?\};?\s*\n/gm, "");
  return s;
}

function parseImportSpecifiers(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    "coze-node-imports.ts",
    normalizeLf(source),
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );
  const specs: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const clause = statement.importClause;
    if (clause?.isTypeOnly) continue;

    const hasRuntimeBinding =
      clause == null ||
      clause.name != null ||
      (clause.namedBindings != null &&
        (ts.isNamespaceImport(clause.namedBindings) ||
          clause.namedBindings.elements.some((element) => !element.isTypeOnly)));
    if (hasRuntimeBinding) specs.push(statement.moduleSpecifier.text);
  }

  return specs;
}

type TypeImportRequest = {
  spec: string;
  names: Array<{ imported: string; local: string }>;
};

function parseTypeImportRequests(source: string): TypeImportRequest[] {
  const sourceFile = ts.createSourceFile(
    "coze-node-type-imports.ts",
    normalizeLf(source),
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );
  const requests: TypeImportRequest[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const clause = statement.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    const names = clause.namedBindings.elements
      .filter((element) => clause.isTypeOnly || element.isTypeOnly)
      .map((element) => ({
        imported: element.propertyName?.text ?? element.name.text,
        local: element.name.text,
      }));
    if (names.length > 0) requests.push({ spec: statement.moduleSpecifier.text, names });
  }
  return requests;
}

function typeDeclarationsForCoze(
  absPath: string,
  requested: Array<{ imported: string; local: string }>
): string {
  const source = normalizeLf(fs.readFileSync(absPath, "utf-8"));
  const sourceFile = ts.createSourceFile(absPath, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
  const declarations = new Map<string, ts.TypeAliasDeclaration | ts.InterfaceDeclaration>();
  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      declarations.set(statement.name.text, statement);
    }
  }

  const needed = new Set(requested.map((item) => item.imported));
  const queue = [...needed];
  while (queue.length > 0) {
    const name = queue.shift()!;
    const declaration = declarations.get(name);
    if (!declaration) throw new Error(`coze export: type-only import ${name} not found in ${absPath}`);
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && declarations.has(node.text) && !needed.has(node.text)) {
        needed.add(node.text);
        queue.push(node.text);
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(declaration, visit);
  }

  const bodies = sourceFile.statements
    .filter(
      (statement): statement is ts.TypeAliasDeclaration | ts.InterfaceDeclaration =>
        (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
        needed.has(statement.name.text)
    )
    .map((statement) => stripExportSyntax(statement.getText(sourceFile)));
  for (const item of requested) {
    if (item.local !== item.imported) bodies.push(`type ${item.local} = ${item.imported};`);
  }
  return bodies.join("\n\n");
}

function resolveAllowedImport(repoRoot: string, nodeFile: string, spec: string): string {
  if (spec.startsWith("shared/") || spec.startsWith("./") || spec.startsWith("../")) {
    const abs = pathMod.resolve(pathMod.dirname(nodeFile), spec);
    const rel = pathMod.relative(repoRoot, abs).replace(/\\/g, "/");
    if (!rel.startsWith(`${COZE_NODE_IMPORT_ALLOW_PREFIX}`) || rel.includes("..")) {
      throw new Error(
        `coze export: 代码节点 ${pathMod.relative(repoRoot, nodeFile)} 的 import "${spec}" 不在允许目录 ${COZE_NODE_IMPORT_ALLOW_PREFIX} 下`
      );
    }
    const tsPath = abs.endsWith(".ts") ? abs : `${abs}.ts`;
    if (!fs.existsSync(tsPath)) {
      throw new Error(`coze export: 找不到 shared 模块 ${spec}（解析为 ${tsPath}）`);
    }
    return tsPath;
  }
  throw new Error(
    `coze export: 代码节点 ${pathMod.relative(repoRoot, nodeFile)} 禁止 import "${spec}"（Coze 不支持 npm/裸模块；仅允许仓库 shared/）`
  );
}

function moduleBodyForCoze(absPath: string, repoRoot: string, visiting: Set<string>, order: string[]): void {
  const norm = pathMod.normalize(absPath);
  if (visiting.has(norm)) {
    throw new Error(`coze export: shared 模块循环依赖 ${pathMod.relative(repoRoot, norm)}`);
  }
  if (order.includes(norm)) return;

  visiting.add(norm);
  const raw = normalizeLf(fs.readFileSync(norm, "utf-8"));
  for (const spec of parseImportSpecifiers(raw)) {
    const dep = resolveAllowedImport(repoRoot, norm, spec);
    moduleBodyForCoze(dep, repoRoot, visiting, order);
  }
  visiting.delete(norm);
  order.push(norm);
}

function relSharedLabel(repoRoot: string, absPath: string): string {
  return pathMod.relative(repoRoot, absPath).replace(/\\/g, "/");
}

/**
 * shared 模块会与节点源码拼成一个 TS 文件。给模块私有函数加稳定前缀，
 * 避免不同 shared 模块或节点本身使用相同 helper 名时触发 TS2393。
 */
function renamePrivateSharedFunctions(source: string, label: string): string {
  const fileName = `${label.replace(/[^a-zA-Z0-9._-]+/g, "_")}.ts`;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2020, true);
  const declarations = sourceFile.statements.filter(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      Boolean(statement.name) &&
      !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
  if (declarations.length === 0) return source;

  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => ({ target: ts.ScriptTarget.ES2020 }),
    getCurrentDirectory: () => "",
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [fileName],
    getScriptSnapshot: (name) =>
      name === fileName ? ts.ScriptSnapshot.fromString(source) : undefined,
    getScriptVersion: () => "1",
    fileExists: (name) => name === fileName || ts.sys.fileExists(name),
    readFile: (name) => (name === fileName ? source : ts.sys.readFile(name)),
  };
  const service = ts.createLanguageService(host);
  const prefix = `__coze_${label.replace(/[^a-zA-Z0-9_$]+/g, "_")}`;
  const edits: Array<{ start: number; length: number; replacement: string }> = [];
  for (const declaration of declarations) {
    const name = declaration.name!;
    const locations = service.findRenameLocations(fileName, name.getStart(sourceFile), false, false, true) ?? [];
    for (const location of locations) {
      if (location.fileName !== fileName) continue;
      edits.push({
        start: location.textSpan.start,
        length: location.textSpan.length,
        replacement: `${prefix}_${name.text}`,
      });
    }
  }
  service.dispose();

  let renamed = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    renamed = `${renamed.slice(0, edit.start)}${edit.replacement}${renamed.slice(edit.start + edit.length)}`;
  }
  return renamed;
}

function assertNoModuleSyntax(source: string, label: string): void {
  if (/^\s*import\s/m.test(source)) {
    throw new Error(`coze export: ${label} 仍含 import，无法写入 Coze 代码节点`);
  }
  if (/^\s*export\s/m.test(source)) {
    throw new Error(`coze export: ${label} 仍含 export，无法写入 Coze 代码节点`);
  }
}

/**
 * 将节点 TS 转为 Coze 可执行脚本：内联 `shared/` 依赖并移除 import/export。
 */
export function bundleCozeNodeCodeForExport(nodeFileAbs: string, repoRoot: string): string {
  const abs = pathMod.resolve(nodeFileAbs);
  if (!fs.existsSync(abs)) throw new Error(`coze export: 节点文件不存在 ${abs}`);

  const raw = normalizeLf(fs.readFileSync(abs, "utf-8"));
  const importSpecs = parseImportSpecifiers(raw);
  const typeImportRequests = parseTypeImportRequests(raw);

  if (importSpecs.length === 0 && typeImportRequests.length === 0) {
    const body = stripExportSyntax(stripImportStatements(raw)).trimEnd();
    assertNoModuleSyntax(body, pathMod.relative(repoRoot, abs));
    return body;
  }

  const moduleOrder: string[] = [];
  for (const spec of importSpecs) {
    const dep = resolveAllowedImport(repoRoot, abs, spec);
    moduleBodyForCoze(dep, repoRoot, new Set(), moduleOrder);
  }

  const runtimeModules = new Set(moduleOrder.map((mod) => pathMod.normalize(mod)));
  const typeRequestsByModule = new Map<string, Array<{ imported: string; local: string }>>();
  for (const request of typeImportRequests) {
    const dep = resolveAllowedImport(repoRoot, abs, request.spec);
    const normalized = pathMod.normalize(dep);
    if (runtimeModules.has(normalized)) continue;
    const names = typeRequestsByModule.get(normalized) ?? [];
    names.push(...request.names);
    typeRequestsByModule.set(normalized, names);
  }

  const inlinedParts: string[] = [];
  for (const [mod, names] of typeRequestsByModule) {
    const label = relSharedLabel(repoRoot, mod);
    inlinedParts.push(`/* coze-inline-types: ${label} */`, typeDeclarationsForCoze(mod, names));
  }
  for (const mod of moduleOrder) {
    const label = relSharedLabel(repoRoot, mod);
    const source = renamePrivateSharedFunctions(fs.readFileSync(mod, "utf-8"), label);
    const body = stripExportSyntax(stripImportStatements(source)).trim();
    inlinedParts.push(`/* coze-inline: ${label} */`, body);
  }

  const mainBody = stripExportSyntax(stripImportStatements(raw)).trim();
  const bundled = [...inlinedParts, "", "/* coze-inline: node */", mainBody].join("\n").trimEnd();
  assertNoModuleSyntax(bundled, pathMod.relative(repoRoot, abs));
  return bundled;
}

export function checkCozeNodeCodeImports(expertDir: string, repoRoot: string): string[] {
  const wfPath = pathMod.join(expertDir, "workflow.json");
  if (!fs.existsSync(wfPath)) return [];

  const workflow = JSON.parse(fs.readFileSync(wfPath, "utf-8")) as {
    nodes?: Array<{ id?: string; file?: string }>;
  };
  const errs: string[] = [];

  for (const node of workflow.nodes ?? []) {
    if (!node.file?.trim()) continue;
    const abs = pathMod.join(expertDir, node.file);
    if (!fs.existsSync(abs)) {
      errs.push(`${node.id}: 节点文件不存在 ${node.file}`);
      continue;
    }
    try {
      bundleCozeNodeCodeForExport(abs, repoRoot);
    } catch (e) {
      errs.push(`${node.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return errs;
}
