/** 校验并返回 YYYYMMDD（用于 ver 后缀） */
export function assertValidVerDay(day: string): string {
  const s = day.trim();
  if (!/^\d{8}$/.test(s)) {
    throw new Error(`ver-date 须为 8 位 YYYYMMDD，收到: ${day}`);
  }
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    throw new Error(`ver-date 不是有效日历日: ${s}`);
  }
  return s;
}

/** 本机本地日历日 YYYYMMDD */
export function localCalendarDayYyyymmdd(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** 去掉末尾 _YYYYMMDD（若存在） */
function stripTrailingDateSuffix(s: string): string {
  const m = s.match(/^(.+)_(\d{8})$/);
  if (m && m[1] && m[2]) {
    return m[1];
  }
  return s;
}

/** 得到语义版本段：去日期后缀、去首字符 V/v、仅保留安全字符 */
function extractSemanticVersion(raw: string): string {
  let s = stripTrailingDateSuffix(raw.trim());
  if (/^[vV]/.test(s) && s.length > 1) {
    s = s.slice(1);
  }
  return s.replace(/[^a-zA-Z0-9._-]/g, "");
}

/**
 * 将 manifest / CLI 的版本号规范为 `V{语义}_{YYYYMMDD}`。
 * @param raw 优先 manifest.version
 * @param day 已通过 assertValidVerDay
 * @param fallback 无 manifest.version 时的兜底（CLI / 环境变量）
 */
export function normalizeExpertVer(raw: string | undefined, day: string, fallback?: string): string {
  const d = assertValidVerDay(day);
  const source = (raw?.trim() || fallback?.trim() || "").trim();
  if (!source) {
    throw new Error("缺少 version：请在 manifest.json 设置 version，或传入 --ver / SYNC_EXPERT_REGISTER_VER");
  }
  const sem = extractSemanticVersion(source);
  if (!sem) {
    throw new Error(`无效的 version（语义段为空）: raw=${JSON.stringify(raw)} fallback=${JSON.stringify(fallback)}`);
  }
  return `V${sem}_${d}`;
}
