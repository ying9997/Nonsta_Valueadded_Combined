/**
 * 节点：verify-with-mapping — 用异常到 VASC 映射表验证/补充候选。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extractVasc(line: string): { vascCode: string; vascName: string } {
  const code = line.match(/\bVASC[A-Z0-9_-]*\b/i)?.[0] || line.match(/\b[A-Z]{2,}\d{2,}[A-Z0-9_-]*\b/)?.[0] || "";
  const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
  const codeIndex = parts.findIndex((part) => part === code);
  return {
    vascCode: code,
    vascName:
      codeIndex >= 0 && parts[codeIndex + 1] && parts[codeIndex + 1] !== code
        ? parts[codeIndex + 1]
        : parts[parts.length - 1] && parts[parts.length - 1] !== code
          ? parts[parts.length - 1]
          : "",
  };
}

function isDeprecatedOrRedirectNote(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("deprecated") ||
    line.includes("已废弃") ||
    line.includes("废弃") ||
    line.includes("请使用") ||
    line.includes("替代")
  );
}

function parseTableCells(line: string): string[] {
  if (!line.includes("|")) return [];
  return line
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function mappingRowMatches(line: string, needles: string[]): boolean {
  if (isDeprecatedOrRedirectNote(line)) return false;
  const cells = parseTableCells(line);
  if (cells.length > 0) {
    if (isSeparatorRow(cells)) return false;
    const identityCells = cells.slice(0, Math.min(2, cells.length)).join(" ").toLowerCase();
    return needles.some((needle) => identityCells.includes(needle.toLowerCase()));
  }
  const lower = line.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

async function main({ params }: { params: Record<string, unknown> }) {
  const recommendationInput = asRecord(params.recommendationInput);
  const mappingKb = asText(params.kbMappingTable);
  const constraintsKb = [
    asText(params.kbVascConstraints),
    asText(params.kbForbiddenProducts)
      ? `\n\n---\n\n# v2 决策层：Forbidden Products\n\n${asText(params.kbForbiddenProducts)}`
      : "",
    asText(params.kbHRules)
      ? `\n\n---\n\n# v2 决策层：H Rules\n\n${asText(params.kbHRules)}`
      : "",
  ]
    .filter(Boolean)
    .join("");
  const exceptionCode = asText(recommendationInput.exceptionCode);
  const exceptionName = asText(recommendationInput.exceptionName);
  const needles = [exceptionCode, exceptionName].filter((item) => item.length > 0);
  const candidateSeed = mappingKb
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && mappingRowMatches(line, needles))
    .map((line) => {
      const vasc = extractVasc(line);
      return {
        ...vasc,
        active: true,
        source: "kb-mapping-table",
        reason: line.slice(0, 300),
      };
    })
    .filter((candidate) => candidate.vascCode || candidate.vascName);

  return {
    candidateSeed,
    mappingEvidence: {
      matched: candidateSeed.length > 0,
      source: "kb-mapping-table",
      missingEvidence: candidateSeed.length > 0 ? [] : ["exception_to_vasc_mapping"],
    },
    recommendationInput,
    intentGuideKb: asText(params.intentGuideKb),
    constraintsKb,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("verify-with-mapping")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "verify-with-mapping failed");
      process.exit(1);
    });
}
