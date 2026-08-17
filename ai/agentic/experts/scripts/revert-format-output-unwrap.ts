/**
 * 撤销 format-output.ts 中的 unwrapLlmEnvelope import 与调用（unwrap 上移到 run-expert）。
 * 用法: npx ts-node -P scripts/tsconfig.json scripts/revert-format-output-unwrap.ts [--dry-run]
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

function revertFile(filePath: string): boolean {
  let src = fs.readFileSync(filePath, "utf-8");
  if (!src.includes("unwrapLlmEnvelope")) return false;

  // Remove import line
  src = src.replace(/^import \{ unwrapLlmEnvelope \} from ["'][^"']+["'];\r?\n\r?\n?/m, "");

  // Pattern: coerceAnalysisResult unwrap block → const o = raw as <Type>
  src = src.replace(
    /\r?\n  const payload = unwrapLlmEnvelope\(raw(?:, envelopeKey)?\);\r?\n  const o = \{ structured: payload\.structured, analysis: payload\.analysis \};\r?\n/g,
    (match, _offset, full) => {
      // Find preceding function to guess type - look for interface used in coerceAnalysisResult
      const before = full.slice(0, full.indexOf(match));
      const typeMatch = before.match(/function coerceAnalysisResult[\s\S]*?const o = raw as (\w+)/);
      if (typeMatch) return `\n  const o = raw as ${typeMatch[1]};\n`;
      return "\n  const o = raw as Record<string, unknown>;\n";
    }
  );

  // Simpler: if still has unwrap in coerceAnalysisResult, replace payload pattern with generic o
  if (src.includes("const payload = unwrapLlmEnvelope(raw)")) {
    src = src.replace(
      /\r?\n  const payload = unwrapLlmEnvelope\(raw\);\r?\n  const o = \{ structured: payload\.structured, analysis: payload\.analysis \};\r?\n/g,
      "\n  const o = raw as { structured?: Record<string, unknown>; analysis?: string };\n"
    );
  }

  // value-add: unwrap with envelopeKey in coerceAnalysisResult
  src = src.replace(
    /function coerceAnalysisResult\(raw: unknown, envelopeKey = "analysisResult"\):/g,
    "function coerceAnalysisResult(raw: unknown):"
  );
  src = src.replace(
    /return coerceAnalysisResult\(JSON\.parse\(raw\), envelopeKey\);/g,
    "return coerceAnalysisResult(JSON.parse(raw));"
  );
  src = src.replace(
    /\r?\n  const payload = unwrapLlmEnvelope\(raw, envelopeKey\);\r?\n  return \{\r?\n    structured: asRecord\(payload\.structured\),\r?\n    analysis: asText\(payload\.analysis\),\r?\n  \};\r?\n/g,
    `
  const obj = asRecord(raw);
  return {
    structured: asRecord(obj.structured),
    analysis: asText(obj.analysis),
  };
`
  );

  // value-add: payload + obj pattern (service-config, order-status, product-recommendation)
  src = src.replace(
    /\r?\n  const payload = unwrapLlmEnvelope\(raw\);\r?\n  const obj = \{ structured: payload\.structured, analysis: payload\.analysis \};\r?\n/g,
    "\n  const obj = asRecord(raw);\n"
  );

  // params.analysisResult → AnalysisResult
  src = src.replace(
    /\r?\n  const payload = unwrapLlmEnvelope\(params\.analysisResult\);\r?\n  const analysisResult: AnalysisResult = \{\r?\n    structured: payload\.structured,\r?\n    analysis: payload\.analysis,\r?\n  \};\r?\n/g,
    "\n  const analysisResult = (params.analysisResult ?? {}) as AnalysisResult;\n"
  );

  // outbound with typed structured
  src = src.replace(
    /\r?\n  const payload = unwrapLlmEnvelope\(params\.analysisResult\);\r?\n  const analysisResult: AnalysisResult = \{\r?\n    structured: payload\.structured as AnalysisResult\["structured"\],\r?\n    analysis: payload\.analysis,\r?\n  \};\r?\n/g,
    "\n  const analysisResult = (params.analysisResult ?? {}) as AnalysisResult;\n"
  );

  // delivery-status
  src = src.replace(
    /\r?\n    const payload = unwrapLlmEnvelope\(params\.analysisResult\);\r?\n    const raw = \{\r?\n      structured: payload\.structured as DeliveryStatusFormatResult\["structured"\],\r?\n      analysis: payload\.analysis,\r?\n    \} as DeliveryStatusFormatResult;\r?\n/g,
    "\n    const raw = (params.analysisResult ?? {}) as DeliveryStatusFormatResult;\n"
  );

  // arithmetic-formula template
  src = src.replace(
    /\r?\n  const llmPayload = unwrapLlmEnvelope\(params\.analysisResult\);\r?\n  const llm: AnalysisResult = \{\r?\n    structured: llmPayload\.structured,\r?\n    analysis: llmPayload\.analysis,\r?\n  \};\r?\n/g,
    "\n  const llm = (params.analysisResult ?? {}) as AnalysisResult;\n"
  );

  // product-info: let structured = payload.structured as ProductInfoStructuredOut
  src = src.replace(
    /\r?\n  const payload = unwrapLlmEnvelope\(raw\);\r?\n  let structured = payload\.structured as ProductInfoStructuredOut;\r?\n  let analysis = payload\.analysis;\r?\n/g,
    "\n  const o = raw as ProductInfoAnalysisResult;\n  let structured = o.structured ?? {};\n  let analysis = typeof o.analysis === \"string\" ? o.analysis : \"\";\n"
  );

  // product-consult / refund-standard: custom payload usage
  src = src.replace(
    /\r?\n  const payload = unwrapLlmEnvelope\(raw\);\r?\n  const structured = payload\.structured;\r?\n  const analysis = payload\.analysis;\r?\n/g,
    "\n  const o = raw as { structured?: Record<string, unknown>; analysis?: string };\n  const structured = o.structured ?? {};\n  const analysis = typeof o.analysis === \"string\" ? o.analysis : \"\";\n"
  );

  // clarificationResult envelopeKey arg
  src = src.replace(
    /coerceAnalysisResult\(params\.clarificationResult, "clarificationResult"\)/g,
    "coerceAnalysisResult(params.clarificationResult)"
  );

  if (src.includes("unwrapLlmEnvelope")) {
    console.warn("still has unwrap:", path.relative(ROOT, filePath));
    return false;
  }

  if (!dryRun) fs.writeFileSync(filePath, src, "utf-8");
  return true;
}

function main(): void {
  const files = findFormatOutputFiles();
  let n = 0;
  for (const f of files) {
    if (revertFile(f)) {
      n++;
      console.log(dryRun ? "[dry-run] would revert:" : "reverted:", path.relative(ROOT, f));
    }
  }
  console.log(`done: ${n} format-output file(s)`);
}

main();
