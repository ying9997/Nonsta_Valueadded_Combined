/**
 * 节点：resolve-query-scope
 * 解析用户时间表达与查询限制。时间按 Asia/Shanghai 的本地字符串处理，不当作 UTC。
 */

interface HumanServiceTimeWindow {
  kind: "explicit" | "recent";
  start: string;
  end: string;
  source: string;
}

interface HumanServiceQueryScope {
  queryStatus: "ok" | "rejected_too_old" | "rejected_today_unavailable";
  rejectReason: string;
  timeWindow: HumanServiceTimeWindow;
  serverDateHints: string[];
  keywords: string[];
  usedMessageTimeFilter: boolean;
  recentLatestOnly: boolean;
  recentKeywordSearch: boolean;
  sortDirection: "desc" | "asc";
}

function stringParam(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function dateFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
}

function addDays(ymd: string, days: number): string {
  const d = dateFromYmd(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return ymdFromDate(d);
}

function addMonths(ymd: string, months: number): string {
  const source = dateFromYmd(ymd);
  const targetMonth = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  targetMonth.setUTCDate(Math.min(source.getUTCDate(), lastDay));
  return ymdFromDate(targetMonth);
}

function startOfWeek(ymd: string): string {
  const d = dateFromYmd(ymd);
  const day = d.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return addDays(ymd, -daysSinceMonday);
}

function startOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function endOfMonth(ymd: string): string {
  return addDays(addMonths(startOfMonth(ymd), 1), -1);
}

function chineseNumber(token: string): number {
  if (/^\d+$/.test(token)) return Number(token);
  const digits: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  if (token === "十") return 10;
  const ten = token.indexOf("十");
  if (ten >= 0) {
    const tens = ten === 0 ? 1 : digits[token[ten - 1]!] ?? 0;
    const ones = ten === token.length - 1 ? 0 : digits[token[ten + 1]!] ?? 0;
    return tens * 10 + ones;
  }
  return digits[token] ?? 0;
}

function relativePeriodOffset(text: string, unitPattern: string, currentPattern: RegExp): number | null {
  if (currentPattern.test(text)) return 0;
  const repeatedUp = new RegExp(`(上+)(?:个)?(?:${unitPattern})`).exec(text);
  if (repeatedUp) return repeatedUp[1]!.length;
  const numbered = new RegExp(`([0-9一二两三四五六七八九十]+)(?:个)?(?:${unitPattern})前`).exec(text);
  if (numbered) {
    const n = chineseNumber(numbered[1]!);
    return n > 0 ? n : null;
  }
  return null;
}

function resolveRelativeCalendarPeriod(text: string, base: string): HumanServiceTimeWindow | null {
  const weekOffset = relativePeriodOffset(text, "周|星期", /(?:本|这)(?:个)?(?:周|星期)/);
  if (weekOffset !== null) {
    const start = addDays(startOfWeek(base), -7 * weekOffset);
    return {
      kind: "explicit",
      start: `${start} 00:00:00`,
      end: `${addDays(start, 6)} 23:59:59`,
      source: "relative_calendar_week",
    };
  }

  const monthOffset = relativePeriodOffset(text, "月", /(?:本|这)(?:个)?月/);
  if (monthOffset !== null) {
    const start = addMonths(startOfMonth(base), -monthOffset);
    return {
      kind: "explicit",
      start: `${start} 00:00:00`,
      end: `${endOfMonth(start)} 23:59:59`,
      source: "relative_calendar_month",
    };
  }
  return null;
}

function capAtYesterday(window: HumanServiceTimeWindow, base: string): HumanServiceTimeWindow {
  const yesterday = addDays(base, -1);
  if (window.end.slice(0, 10) <= yesterday) return window;
  return {
    ...window,
    end: `${yesterday} 23:59:59`,
  };
}

function isBeforeYmd(a: string, b: string): boolean {
  return Boolean(a && b && a < b);
}

function normalizeDateToken(s: string): string {
  const m = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (!m) return "";
  return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
}

function normalizeDateTime(s: string, endOfDay: boolean): string {
  const date = normalizeDateToken(s);
  if (!date) return "";
  const tm = /(?:\d{4}[-/]\d{1,2}[-/]\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/.exec(s);
  if (!tm) return `${date} ${endOfDay ? "23:59:59" : "00:00:00"}`;
  return `${date} ${pad2(Number(tm[1]))}:${pad2(Number(tm[2]))}:${pad2(Number(tm[3] ?? 0))}`;
}

function baseYmd(params: Record<string, unknown>): string {
  const explicit = normalizeDateToken(stringParam(params, "nowIso"));
  if (explicit) return explicit;
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return ymdFromDate(utc8);
}

function buildHints(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  let cur = addDays(startDate, -1);
  const last = addDays(endDate, 1);
  let reachedLast = false;
  for (let i = 0; i < 40; i++) {
    out.push(cur);
    if (cur === last) {
      reachedLast = true;
      break;
    }
    cur = addDays(cur, 1);
  }
  return reachedLast ? out : [];
}

function collectKeywords(params: Record<string, unknown>, text: string): string[] {
  const raw = params.keywords;
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const s = String(item ?? "").trim();
      if (s && !out.includes(s)) out.push(s);
    }
  }
  const quoted = text.match(/[“"']([^“"']{2,30})[”"']/g) ?? [];
  for (const q of quoted) {
    const s = q.replace(/[“”"']/g, "").trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 10);
}

function resolveWindow(params: Record<string, unknown>): HumanServiceTimeWindow {
  const text = [
    stringParam(params, "timeRangeText"),
    stringParam(params, "query"),
    stringParam(params, "customerIntent"),
  ].filter(Boolean).join(" ");
  const explicitStart = normalizeDateTime(stringParam(params, "timeStart"), false);
  const explicitEnd = normalizeDateTime(stringParam(params, "timeEnd"), true);
  if (explicitStart || explicitEnd) {
    const base = baseYmd(params);
    return capAtYesterday({
      kind: "explicit",
      start: explicitStart || `${base} 00:00:00`,
      end: explicitEnd || `${base} 23:59:59`,
      source: "inputs.timeStart/timeEnd",
    }, base);
  }

  const base = baseYmd(params);
  const explicitDate = normalizeDateToken(text);
  let day = "";
  let source = "";
  if (explicitDate) {
    day = explicitDate;
    source = "explicit_date";
  } else if (/前天/.test(text)) {
    day = addDays(base, -2);
    source = "relative_day";
  } else if (/昨天|昨日/.test(text)) {
    day = addDays(base, -1);
    source = "relative_day";
  } else if (/今天|今日/.test(text)) {
    day = base;
    source = "relative_day";
  }

  if (day) {
    const morning = /上午|早上|早晨/.test(text);
    const afternoon = /下午|午后/.test(text);
    const evening = /晚上|夜里|夜间/.test(text);
    let start = `${day} 00:00:00`;
    let end = `${day} 23:59:59`;
    if (morning) {
      start = `${day} 00:00:00`;
      end = `${day} 11:59:59`;
    } else if (afternoon) {
      start = `${day} 12:00:00`;
      end = `${day} 17:59:59`;
    } else if (evening) {
      start = `${day} 18:00:00`;
      end = `${day} 23:59:59`;
    }
    return capAtYesterday({ kind: "explicit", start, end, source }, base);
  }

  const relativeCalendarPeriod = resolveRelativeCalendarPeriod(text, base);
  if (relativeCalendarPeriod) return capAtYesterday(relativeCalendarPeriod, base);

  return {
    kind: "recent",
    start: `${addDays(base, -30)} 00:00:00`,
    end: `${addDays(base, -1)} 23:59:59`,
    source: /之前|上次|以前|历史|曾经/.test(text) ? "vague_recent" : "default_recent_30d",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const timeWindow = resolveWindow(params);
  const startDate = timeWindow.start.slice(0, 10);
  const endDate = timeWindow.end.slice(0, 10);
  const base = baseYmd(params);
  const oldestAllowedDate = addMonths(base, -6);
  const todayUnavailable = isBeforeYmd(endDate, startDate);
  const rejectedTooOld =
    !todayUnavailable &&
    timeWindow.kind === "explicit" &&
    (isBeforeYmd(startDate, oldestAllowedDate) || isBeforeYmd(endDate, oldestAllowedDate));
  const queryStatus: HumanServiceQueryScope["queryStatus"] = todayUnavailable
    ? "rejected_today_unavailable"
    : rejectedTooOld
      ? "rejected_too_old"
      : "ok";
  const serverDateHints =
    queryStatus === "ok" && startDate && endDate ? buildHints(startDate, endDate) : [];
  const text = `${stringParam(params, "query")} ${stringParam(params, "customerIntent")}`;
  const keywords = collectKeywords(params, text);
  const queryScope: HumanServiceQueryScope = {
    queryStatus,
    rejectReason: todayUnavailable
      ? "today_records_available_tomorrow"
      : rejectedTooOld
        ? "older_than_six_months"
        : "",
    timeWindow,
    serverDateHints,
    keywords,
    usedMessageTimeFilter: true,
    recentLatestOnly: false,
    recentKeywordSearch: timeWindow.kind === "recent" && keywords.length > 0,
    sortDirection: "desc",
  };
  return {
    queryScope,
    timeWindow,
    serverDateHints,
    keywords: queryScope.keywords,
    usedMessageTimeFilter: true,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-query-scope")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
