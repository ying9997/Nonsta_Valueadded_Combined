/**
 * 修复 revert 后 format-output 的类型断言。
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");

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

function fixFile(filePath: string): boolean {
  let src = fs.readFileSync(filePath, "utf-8");
  const orig = src;

  const named = src.match(/interface (\w+AnalysisResult)/);
  if (src.includes("const o = raw as Record<string, unknown>")) {
    const typeName = named?.[1] ?? (src.includes("interface AnalysisResult") ? "AnalysisResult" : null);
    if (typeName) {
      src = src.replace(
        "const o = raw as Record<string, unknown>;",
        `const o = raw as ${typeName};`
      );
    }
  }

  src = src.replace(
    /structured: o\.structured \?\? \{\},/g,
    "structured: o.structured ?? ({} as Record<string, unknown>),"
  );

  if (src !== orig) {
    fs.writeFileSync(filePath, src, "utf-8");
    return true;
  }
  return false;
}

for (const f of findFormatOutputFiles()) {
  if (fixFile(f)) console.log("fixed:", path.relative(ROOT, f));
}
