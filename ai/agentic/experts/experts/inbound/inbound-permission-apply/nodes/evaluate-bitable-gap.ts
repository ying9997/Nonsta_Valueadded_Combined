/**
 * 节点：evaluate-bitable-gap — 飞书 Bitable 自动代提当前为 Gap
 * FaaS 单文件闭环，无外部 import。
 */

async function main({ params }: { params: Record<string, unknown> }) {
  const alreadyEnabled = params.alreadyEnabled === true;
  const intent = String(params.intent ?? "apply");

  return {
    dataSource: "kb_only",
    bitableAvailable: false,
    canAutoSubmit: false,
    submitStatus: alreadyEnabled ? "already_enabled" : "api_not_available",
    submitReason: alreadyEnabled
      ? "permission_already_enabled"
      : "bitable_api_gap_current_sprint_kb_only",
    missingFields: [] as string[],
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("evaluate-bitable-gap")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
