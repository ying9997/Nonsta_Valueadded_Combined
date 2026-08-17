/**
 * 在发货/出库时效或包裹实际尺寸重量意图下，为每个匹配子单构造
 * `wh.outbound.getPackageDetail` 动作。
 * 跟踪号输入精确匹配 packageList；主单/卖家单输入覆盖该订单全部子单。
 */

const DETAIL_BATCH_MAX_ACTIONS = 100;

type OrderRow = Record<string, unknown>;

type TimingActionPlan = {
  inputTokens: string[];
  outboundOrderNum: string;
  shippingNo: string;
  trackingNos: string[];
};

function timingText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeMainOrderNo(value: unknown): string {
  const text = timingText(value);
  const match = /^WO(\d+)[A-Za-z]*$/i.exec(text);
  return match ? `WO${match[1]}` : text;
}

function isTimingIntent(query: unknown, customerIntent: unknown): boolean {
  const text = `${timingText(query)} ${timingText(customerIntent)}`.toLowerCase();
  if (!text.trim()) return false;
  return (
    /(什么时候|何时|多久|预计|预估|应|承诺|截止|超时|延误|还没|尚未|未).{0,12}(发货|出库)/i.test(text) ||
    /(发货|出库).{0,12}(时间|日期|什么时候|何时|多久|预计|预估|应|承诺|截止|超时|延误)/i.test(text) ||
    /(when|expected|estimated|overdue|delay|deadline).{0,24}(ship|dispatch|outbound)/i.test(text) ||
    /(ship|dispatch|outbound).{0,24}(time|date|when|expected|estimated|overdue|delay|deadline)/i.test(text)
  );
}

function isMeasurementIntent(query: unknown, customerIntent: unknown): boolean {
  const text = `${timingText(query)} ${timingText(customerIntent)}`.toLowerCase();
  if (!text.trim()) return false;
  const measurement = /(尺寸|长宽高|长[×x*]?宽[×x*]?高|重量|体积|称重|测量|实重|材积|dimension|size|length|width|height|weight|volume)/i;
  const packageContext = /(实际|实测|打包后|出库后|包裹|货物|箱|票|运单|物流|actual|measured|parcel|package|shipment)/i;
  return measurement.test(text) && packageContext.test(text);
}

function orderList(raw: unknown): OrderRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const list = (raw as Record<string, unknown>).list;
  return Array.isArray(list)
    ? list.filter((item): item is OrderRow => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function stringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(timingText).filter(Boolean);
}

function packageTrackingNos(pkg: OrderRow): string[] {
  const values = [
    ...stringList(pkg.trackingNos),
    timingText(pkg.trackingNo),
    timingText(pkg.trackingNum),
  ].filter(Boolean);
  return Array.from(new Set(values));
}

function requestedTokens(raw: unknown): string[] {
  return Array.isArray(raw) ? Array.from(new Set(raw.map(timingText).filter(Boolean))) : [];
}

async function main({ params }: { params: Record<string, unknown> }) {
  const timingIntentMatched = isTimingIntent(params.query, params.customerIntent);
  const measurementIntentMatched = isMeasurementIntent(params.query, params.customerIntent);
  const detailIntentMatched = timingIntentMatched || measurementIntentMatched;
  if (!detailIntentMatched) {
    return {
      actions: [],
      actionPlans: [],
      timingDetailActionsCount: 0,
      detailActionsCount: 0,
      timingIntentMatched: false,
      measurementIntentMatched: false,
      detailIntentMatched: false,
      requiresNarrowing: false,
      candidateActionsCount: 0,
    };
  }

  const tokens = requestedTokens(params.outboundOrderNos);
  const tokenKeys = new Set(tokens.map((item) => item.toUpperCase()));
  const plans: TimingActionPlan[] = [];
  const seen = new Set<string>();

  for (const order of orderList(params.rawOrderData)) {
    const outboundOrderNum = normalizeMainOrderNo(
      order.outboundOrderNum ?? order.documentNo ?? order.orderNo
    );
    if (!/^WO\d+$/i.test(outboundOrderNum)) continue;
    const packages = Array.isArray(order.packageList)
      ? order.packageList.filter(
          (item): item is OrderRow => Boolean(item && typeof item === "object" && !Array.isArray(item))
        )
      : [];
    const mainOrSellerMatched = [
      outboundOrderNum,
      timingText(order.sellerOrderNo),
      timingText(order.customerOrderNo),
    ].some((value) => value && tokenKeys.has(value.toUpperCase()));
    const trackingMatchedPackages = packages.filter((pkg) =>
      packageTrackingNos(pkg).some((trackingNo) => tokenKeys.has(trackingNo.toUpperCase()))
    );
    const selected = trackingMatchedPackages.length > 0 && !mainOrSellerMatched
      ? trackingMatchedPackages
      : packages;

    for (const pkg of selected) {
      const shippingNo = timingText(pkg.packageNum ?? pkg.shippingNo ?? pkg.packageNo);
      if (!shippingNo) continue;
      const key = `${outboundOrderNum.toUpperCase()}|${shippingNo.toUpperCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      plans.push({
        inputTokens: tokens,
        outboundOrderNum,
        shippingNo,
        trackingNos: packageTrackingNos(pkg),
      });
    }
  }

  if (plans.length > DETAIL_BATCH_MAX_ACTIONS) {
    return {
      actions: [],
      actionPlans: [],
      timingDetailActionsCount: 0,
      detailActionsCount: 0,
      timingIntentMatched,
      measurementIntentMatched,
      detailIntentMatched: true,
      requiresNarrowing: true,
      candidateActionsCount: plans.length,
    };
  }

  const actions = plans.map((plan) => ({
    action: "wh.outbound.getPackageDetail",
    data: JSON.stringify({
      shippingNo: plan.shippingNo,
      orderNo: plan.outboundOrderNum,
      containerSerno: "",
    }),
  }));

  return {
    actions,
    actionPlans: plans,
    timingDetailActionsCount: actions.length,
    detailActionsCount: actions.length,
    timingIntentMatched,
    measurementIntentMatched,
    detailIntentMatched: true,
    requiresNarrowing: false,
    candidateActionsCount: plans.length,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-outbound-timing-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}
