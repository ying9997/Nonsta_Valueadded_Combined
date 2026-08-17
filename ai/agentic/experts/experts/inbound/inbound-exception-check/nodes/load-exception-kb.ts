/**
 * 节点：load-exception-kb — 按异常类型过滤 KB 片段
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function filterByTypes(kb: string, types: string[]): string {
  if (!kb || types.length === 0) return kb;
  const lines = kb.split("\n");
  const hits = new Set<number>();
  const upperTypes = types.map((t) => t.toUpperCase());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (upperTypes.some((t) => line.includes(t))) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 3); j++) hits.add(j);
    }
  }
  if (hits.size === 0) return kb;
  return Array.from(hits)
    .sort((a, b) => a - b)
    .map((i) => lines[i])
    .join("\n");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const exceptionTypes = Array.isArray(params.exceptionTypes)
    ? (params.exceptionTypes as string[]).map((t) => String(t))
    : [];
  const exceptionTypeGuide = str(params.exceptionTypeGuide);
  const discrepancyThresholds = str(params.discrepancyThresholds);

  return {
    exceptionTypeGuideText: filterByTypes(exceptionTypeGuide, exceptionTypes) || exceptionTypeGuide,
    discrepancyThresholdsText: discrepancyThresholds,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-exception-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
