/**
 * 为所有 format-output.ts 的 coerceAnalysisResult 接入 unwrapLlmEnvelope。
 * 用法: npx ts-node -P scripts/tsconfig.json scripts/patch-format-output-unwrap.ts [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function findFormatOutputFiles(): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (name === "format-output.ts") out.push(p);
    }
  }
  walk(path.join(ROOT, "experts"));
  return out;
}

function relativeSharedImport(fromFile: string): string {
  const fromDir = path.dirname(fromFile);
  const rel = path.relative(fromDir, path.join(ROOT, "shared", "unwrap-llm-envelope")).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : "./" + rel;
}

function patchFile(filePath: string): boolean {
  let src = fs.readFileSync(filePath, "utf-8");
  if (src.includes("unwrapLlmEnvelope")) return false;

  const importLine = `import { unwrapLlmEnvelope } from "${relativeSharedImport(filePath)}";\n`;

  if (/^import /m.test(src)) {
    src = src.replace(/^import /m, importLine + "import ");
  } else {
    src = importLine + "\n" + src;
  }

  // 在 coerceAnalysisResult 内、处理完 string 分支后，将 `const o = raw as` 替换为 unwrap
  const marker = /\r?\n  const o = raw as [^\r\n]+;\r?\n/;
  if (!marker.test(src)) {
    console.warn("skip (no const o = raw pattern):", path.relative(ROOT, filePath));
    return false;
  }

  src = src.replace(
    marker,
    `
  const payload = unwrapLlmEnvelope(raw);
  const o = { structured: payload.structured, analysis: payload.analysis };
`
  );

  // value-add 风格：const obj = asRecord(raw);
  if (!src.includes("unwrapLlmEnvelope(raw)") && /const obj = asRecord\(raw\)/.test(src)) {
    src = src.replace(
      /const obj = asRecord\(raw\);\s*\n\s*return \{\s*\n\s*structured: asRecord\(obj\.structured\)/,
      `const payload = unwrapLlmEnvelope(raw, "analysisResult");
  const obj = { structured: payload.structured, analysis: payload.analysis };
  return {
    structured: asRecord(obj.structured)`
    );
  }

  // 直接读取 params.analysisResult
  if (!src.includes("unwrapLlmEnvelope(params.analysisResult)")) {
    src = src.replace(
      /const raw = \(params\.analysisResult \?\? \{\}\) as/g,
      "const raw = (() => { const p = unwrapLlmEnvelope(params.analysisResult); return { structured: p.structured, analysis: p.analysis } as"
    );
    src = src.replace(
      /const analysisResult = \(params\.analysisResult \?\? \{\}\) as AnalysisResult;/g,
      `const _arPayload = unwrapLlmEnvelope(params.analysisResult);
  const analysisResult = { structured: _arPayload.structured, analysis: _arPayload.analysis } as AnalysisResult;`
    );
  }

  // 复杂文件：tracking-no-scan 等使用 const o = raw as 后还有 st = o.structured
  // 已覆盖

  if (!dryRun) fs.writeFileSync(filePath, src, "utf-8");
  return true;
}

function main(): void {
  const files = findFormatOutputFiles();
  let n = 0;
  for (const f of files) {
    if (patchFile(f)) {
      n++;
      console.log(dryRun ? "[dry-run] would patch:" : "patched:", path.relative(ROOT, f));
    }
  }
  console.log(`done: ${n} format-output file(s)`);
}

main();
