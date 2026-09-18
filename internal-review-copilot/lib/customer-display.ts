/** OMS 权限脱敏会把客户名打成一串星号。群卡片不要把星号当客户名发出去。 */

export function isMaskedCustomerName(name: string | undefined): boolean {
  const t = String(name || "").trim();
  if (!t) return true;
  if (/^[\s*＊]+$/.test(t)) return true;
  if (t.includes("脱敏")) return true;
  return false;
}

export function visibleCustomerName(name: string | undefined): string {
  const t = String(name || "").trim();
  return isMaskedCustomerName(t) ? "" : t;
}

export function formatCustomerLabel(code: string | undefined, name: string | undefined): string {
  const parts = [String(code || "").trim(), visibleCustomerName(name)].filter(Boolean);
  return parts.length ? parts.join(" / ") : "未填写";
}

export function textHasMaskedCustomer(text: string): boolean {
  return /[\*＊]{3,}/.test(text) || text.includes("脱敏");
}

export function unmaskStarsInText(text: string, realName: string): string {
  const name = visibleCustomerName(realName);
  if (!name) return text;
  return text.replace(/[\*＊]{3,}/g, name);
}

export function unmaskStarsInJson<T>(value: T, realName: string): T {
  const name = visibleCustomerName(realName);
  if (!name) return value;
  return JSON.parse(unmaskStarsInText(JSON.stringify(value), name)) as T;
}
