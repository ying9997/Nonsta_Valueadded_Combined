/**
 * 节点：按 intent / inspectionMode 选择性拼接海外验 KB
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pickModeKb(
  mode: string,
  kbWithCarton: string,
  kbWithoutCarton: string,
  kbForecast: string
): { content: string; scope: string } {
  switch (mode) {
    case "with_carton":
      return { content: kbWithCarton, scope: "with_carton" };
    case "without_carton":
      return { content: kbWithoutCarton, scope: "without_carton" };
    case "forecast":
      return { content: kbForecast, scope: "forecast" };
    default:
      return {
        content: [kbWithCarton, kbWithoutCarton, kbForecast].filter(Boolean).join("\n\n---\n\n"),
        scope: "all_modes",
      };
  }
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = str(params.intent) || "progress";
  const inspectionMode = str(params.inspectionMode) || "auto";
  const overseasInspectionPhase = str(params.overseasInspectionPhase);
  const gapNote = str(params.gapNote);

  const kbWithCarton = str(params.kbWithCarton);
  const kbWithoutCarton = str(params.kbWithoutCarton);
  const kbForecast = str(params.kbForecast);

  if (intent === "mode_faq") {
    const { content, scope } = pickModeKb("auto", kbWithCarton, kbWithoutCarton, kbForecast);
    return {
      kbContent: content,
      kbScope: `mode_faq:${scope}`,
      phaseGuide: content,
      modeDiffGuide: content,
    };
  }

  const { content, scope } = pickModeKb(inspectionMode, kbWithCarton, kbWithoutCarton, kbForecast);
  const phaseSection = overseasInspectionPhase
    ? `\n\n## 当前阶段参考\n\n阶段：${overseasInspectionPhase}`
    : "";
  const wmsSection = gapNote ? `\n\n## WMS 数据说明\n\n${gapNote}` : "";

  return {
    kbContent: `${content}${phaseSection}${wmsSection}`.trim(),
    kbScope: `progress:${scope}${overseasInspectionPhase ? `:${overseasInspectionPhase}` : ""}`,
    phaseGuide: content,
    modeDiffGuide: "",
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-overseas-inspection-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
