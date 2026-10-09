function asText(value: unknown): string {
  return String(value ?? "").trim();
}

const WO_RE = /WO\d{8,}/gi;
const WO_OK = /^WO\d{8,}$/;

/** 文本里出现过的全部出库单 WO。 */
export function extractWoNos(text: string): string[] {
  const matches = asText(text).match(WO_RE) || [];
  return [...new Set(matches.map((item) => item.toUpperCase()))];
}

export function normalizeWoNos(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((item) => String(item || "").trim().toUpperCase())
        .filter((item) => WO_OK.test(item)),
    ),
  ];
}

export function isWoNo(value: string): boolean {
  return WO_OK.test(String(value || "").trim().toUpperCase());
}
