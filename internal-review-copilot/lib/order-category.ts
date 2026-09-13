/** Map OMS 订单类型 to scenario-card category. */

export type SceneCategory = "inbound" | "instock" | "outbound";

export function resolveOrderCategory(input: {
  businessTypeDesc?: string;
  businessType?: string;
  vaSource?: string;
}): SceneCategory | "" {
  const desc = String(input.businessTypeDesc || "").trim();
  if (/库内/.test(desc)) return "instock";
  if (/出库/.test(desc)) return "outbound";
  if (/入库/.test(desc)) return "inbound";

  const code = String(input.businessType || input.vaSource || "")
    .trim()
    .toUpperCase();
  if (code === "INHOUSE" || code === "INSTOCK") return "instock";
  if (code === "OUTBOUND") return "outbound";
  if (code === "INBOUND") return "inbound";
  return "";
}
