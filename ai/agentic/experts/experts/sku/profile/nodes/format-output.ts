/**
 * 节点：format-output — 组装 structured / analysis / enrichedContext.sku/profile
 */

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function summarizeSkus(skus: Record<string, unknown>[]): string {
  if (skus.length === 0) return "未获取到 SKU 档案。";
  const parts = skus.map((s) => {
    const code = asText(s.skuCode) || "?";
    const src = asText(s.dataSource) || "unknown";
    if (src === "missing") return `${code}：未找到档案（missing）`;
    const itemType = asText(s.itemType) || "件型未知";
    const flags = asRecord(s.specialFlags);
    const flagDefinitions: Array<[string, string]> = [
      ["isBattery", "带电"],
      ["isWithLiquid", "液体"],
      ["isWithPowder", "粉末"],
      ["isWithMagnetism", "磁性"],
      ["isFood", "食品"],
      ["isDangerous", "危险品"],
      ["isFragile", "易碎"],
    ];
    const attrs: string[] = [];
    let hasUnknownFlag = false;
    for (const [field, label] of flagDefinitions) {
      if (flags[field] === true) attrs.push(label);
      else if (flags[field] !== false) hasUnknownFlag = true;
    }
    const attrText = attrs.length
      ? `${attrs.join("/")}${hasUnknownFlag ? "（其余特殊属性未完整确认）" : ""}`
      : hasUnknownFlag
        ? "特殊属性未完整确认"
        : "无特殊属性标记";
    const mode = asText(asRecord(s.managementMode).supervisorMode) || asText(s.supervisorMode) || "管理模式未知";
    return `${code}：${itemType}，${attrText}，${mode}（${src}）`;
  });
  return parts.join("；") + "。禁限来源/直发原因等 Gap 字段见 missingFacts，未编造。";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationError = asText(params.validationError);
  const inputContext = asRecord(params.inputContext);
  const skus = (Array.isArray(params.skus) ? params.skus : []) as Record<string, unknown>[];
  const missingFacts = (Array.isArray(params.missingFacts) ? params.missingFacts : []).map(String);
  const fetchMeta = asRecord(params.fetchMeta);

  if (validationError === "skuCodes_required") {
    const structured = {
      skus: [],
      missingFacts: ["skuCodes_required"],
      fetchMeta: { requested: 0, found: 0, source: "none", strategy: "none" },
    };
    const analysis = "请提供至少一个商品编码 skuCodes（与注册侧 productCode 同义）。";
    return {
      structured,
      analysis,
      outputContext: {
        expertId: "sku/profile",
        resultSummary: analysis.slice(0, 200),
        chainId: asText(inputContext.chainId),
      },
      enrichedContext: {
        "sku/profile": structured,
      },
    };
  }

  const facts = [...missingFacts];
  if (validationError.startsWith("skuCodes_truncated")) {
    facts.push(validationError);
  }

  const structured = {
    skus,
    missingFacts: [...new Set(facts)],
    fetchMeta: {
      requested: fetchMeta.requested ?? skus.length,
      found: fetchMeta.found ?? skus.filter((s) => s.dataSource === "api").length,
      source: fetchMeta.source ?? "winit.mms.item.list",
      strategy: asText(fetchMeta.strategy) || "unknown",
    },
  };

  const analysis = summarizeSkus(skus);

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "sku/profile",
      resultSummary: analysis.slice(0, 200),
      chainId: asText(inputContext.chainId),
    },
    enrichedContext: {
      "sku/profile": {
        skus,
        missingFacts: structured.missingFacts,
        fetchMeta: structured.fetchMeta,
      },
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "format-output failed");
      process.exit(1);
    });
}
