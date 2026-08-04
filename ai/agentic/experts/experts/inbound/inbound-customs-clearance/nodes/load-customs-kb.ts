/**
 * 节点：按 pathType 选择性拼接清关 KB 语料
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function filterByCountry(content: string, country: string): string {
  if (!content || !country) return content;
  const lines = content.split("\n");
  const hits = new Set<number>();
  const lowerCountry = country.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes(lowerCountry) || line.includes(`## ${lowerCountry}`)) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 6); j++) {
        hits.add(j);
      }
    }
  }

  if (hits.size === 0) return content;
  return Array.from(hits)
    .sort((a, b) => a - b)
    .map((i) => lines[i])
    .join("\n");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const pathType = str(params.pathType) || "progress";
  const country = str(params.country);
  const kbCustomsClearance = str(params.kbCustomsClearance);
  const kbBondedChannel = str(params.kbBondedChannel);
  const gapNote = str(params.gapNote);

  if (pathType === "dutiable") {
    return {
      kbContent: kbBondedChannel,
      kbScope: "bonded-channel",
      customsStagesGuide: "",
      delayReasonsGuide: "",
      dutiableChannelGuide: kbBondedChannel,
      tmsGapNotice: "",
    };
  }

  const customsFiltered = filterByCountry(kbCustomsClearance, country);
  const tmsSection = gapNote ? `\n\n---\n\n## TMS 数据说明\n\n${gapNote}` : "";
  const kbContent = `${customsFiltered}${tmsSection}`.trim();

  return {
    kbContent,
    kbScope: `customs-progress${country ? `:${country}` : ""}`,
    customsStagesGuide: customsFiltered,
    delayReasonsGuide: customsFiltered,
    dutiableChannelGuide: "",
    tmsGapNotice: gapNote,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-customs-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
