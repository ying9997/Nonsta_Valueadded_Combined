/** 为本地 Runner 与旧调用方生成兼容 result 别名。 */
async function main({ params }: { params: Record<string, unknown> }) {
  const structured =
    params.structured && typeof params.structured === "object" && !Array.isArray(params.structured)
      ? params.structured
      : {};
  const analysis = typeof params.analysis === "string" ? params.analysis : "";
  return { result: { structured, analysis } };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-result-alias")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((result) => process.stdout.write(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
