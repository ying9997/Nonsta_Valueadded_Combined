export function isExchangeEnabled(): boolean {
  const v = process.env.RELAY_EXCHANGE_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
