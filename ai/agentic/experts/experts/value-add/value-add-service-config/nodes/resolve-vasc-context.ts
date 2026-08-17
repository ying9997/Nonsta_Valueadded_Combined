/**
 * 节点：resolve-vasc-context — 输出统一 VASC 与服务意图上下文。
 * FaaS 单文件闭环，无外部 import。
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationResult = asRecord(params.validationResult);
  const rawServiceConfigInput = asRecord(params.rawServiceConfigInput);
  const validationOutputPath = asText(validationResult.outputPath);
  const outputPath = validationOutputPath || (validationResult.ok === false ? "missing_vasc" : "");
  return {
    serviceConfigInput: {
      ...rawServiceConfigInput,
      ...(outputPath ? { outputPath } : {}),
      missingConfirmations: validationResult.missingConfirmations ?? rawServiceConfigInput.missingConfirmations ?? [],
      handoffExpertId: validationResult.handoffExpertId ?? rawServiceConfigInput.handoffExpertId ?? "",
    },
    validationResult,
    inputContext: asRecord(params.inputContext),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-vasc-context")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "resolve-vasc-context failed");
      process.exit(1);
    });
}
