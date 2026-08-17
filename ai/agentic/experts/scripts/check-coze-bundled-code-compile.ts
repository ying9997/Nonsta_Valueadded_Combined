/** 编译 Coze 导出后的单文件代码，捕获 shared 内联造成的命名冲突。 */
import fs from "fs";
import path from "path";
import ts from "typescript";
import {
  bundleCozeNodeCodeForExport,
  findRepoRoot,
} from "./coze-export/bundle-coze-node-code";
import { discoverExpertDirs } from "./export-all-experts-coze";

type WorkflowNode = { id?: string; file?: string };

const repoRoot = findRepoRoot(__dirname);
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const expertDirs = requested.length > 0
  ? requested.map((dir) => path.resolve(dir))
  : discoverExpertDirs(path.join(repoRoot, "experts"));

const virtualSources = new Map<string, { code: string; label: string }>();
for (const expertDir of expertDirs) {
  const workflowPath = path.join(expertDir, "workflow.json");
  if (!fs.existsSync(workflowPath)) continue;
  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8")) as {
    nodes?: WorkflowNode[];
  };
  for (const node of workflow.nodes ?? []) {
    if (!node.file) continue;
    const nodePath = path.join(expertDir, node.file);
    const relativeExpert = path.relative(repoRoot, expertDir).replace(/\\/g, "/");
    const virtualPath = path.join(
      repoRoot,
      ".coze-compile",
      relativeExpert.replace(/[^a-zA-Z0-9._-]+/g, "_"),
      `${node.id ?? path.basename(node.file)}.ts`
    );
    virtualSources.set(path.normalize(virtualPath), {
      code: bundleCozeNodeCodeForExport(nodePath, repoRoot),
      label: `${relativeExpert}/${node.id ?? node.file}`,
    });
  }
}

const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleDetection: ts.ModuleDetectionKind.Force,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  types: ["node"],
};
const host = ts.createCompilerHost(options);
const defaultGetSourceFile = host.getSourceFile.bind(host);
const defaultFileExists = host.fileExists.bind(host);
const defaultReadFile = host.readFile.bind(host);

host.fileExists = (fileName) => virtualSources.has(path.normalize(fileName)) || defaultFileExists(fileName);
host.readFile = (fileName) => virtualSources.get(path.normalize(fileName))?.code ?? defaultReadFile(fileName);
host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
  const virtual = virtualSources.get(path.normalize(fileName));
  return virtual
    ? ts.createSourceFile(fileName, virtual.code, languageVersion, true)
    : defaultGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
};

const program = ts.createProgram([...virtualSources.keys()], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program).filter((diagnostic) => {
  return diagnostic.file ? virtualSources.has(path.normalize(diagnostic.file.fileName)) : true;
});

for (const diagnostic of diagnostics) {
  const source = diagnostic.file
    ? virtualSources.get(path.normalize(diagnostic.file.fileName))
    : undefined;
  const position = diagnostic.file && diagnostic.start != null
    ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
    : null;
  const location = position ? `:${position.line + 1}:${position.character + 1}` : "";
  console.error(
    `[coze-bundled-compile] ${source?.label ?? "compiler"}${location} TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`
  );
}

if (diagnostics.length > 0) process.exit(1);
console.log(`Coze bundled code compile OK: ${virtualSources.size} nodes`);
