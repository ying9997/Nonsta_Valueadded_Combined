/** 将面单接口逐单响应规范化为稳定业务结果。 */

type LabelResult = "success" | "no_label" | "not_found" | "not_supported" | "forbidden" | "service_error";

function shippingLabelResultParse(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const value = raw.trim();
  if (!value) return "";
  try {
    const once = JSON.parse(value) as unknown;
    if (typeof once === "string") {
      try {
        return JSON.parse(once) as unknown;
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    return raw;
  }
}

function shippingLabelBusinessCode(raw: unknown): string {
  const value = String(raw ?? "-1").trim() || "-1";
  if (/^\d{10}$/.test(value)) {
    return value.padStart(11, "0");
  }
  return value;
}

function shippingLabelResponse(raw: unknown): { code: string; msg: string; data: unknown } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { code: "-1", msg: "", data: "" };
  }
  let object = raw as Record<string, unknown>;
  if (object.output && typeof object.output === "object" && !Array.isArray(object.output)) {
    object = object.output as Record<string, unknown>;
  }
  if (object.code == null && object.data != null) {
    const nested = shippingLabelResultParse(object.data);
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const nestedObject = nested as Record<string, unknown>;
      if (nestedObject.code != null) object = nestedObject;
    }
  }
  return {
    code: shippingLabelBusinessCode(object.code),
    msg: String(object.msg ?? object.message ?? "").trim(),
    data: object.data ?? "",
  };
}

function shippingLabelClassify(code: string, msg: string): LabelResult {
  const compact = code.trim();
  if (compact === "02020249100" || /订单不存在|未找到.*订单/.test(msg)) return "not_found";
  if (
    compact === "02020249908" ||
    compact === "02020249909" ||
    /不支持查询|尚未出库|超过可查询时限/.test(msg)
  ) return "not_supported";
  if (compact === "03010250007" || /无权限|身份校验|订单归属/.test(msg)) return "forbidden";
  return "service_error";
}

function shippingLabelSafeMessage(result: LabelResult, rawMessage: string, businessCode: string): string {
  if (result === "not_found") {
    return "当前账号下未找到对应的出库订单，请核对订单标识和订单归属。";
  }
  if (
    result === "not_supported" &&
    (businessCode === "02020249908" || /尚未出库/.test(rawMessage))
  ) {
    return "订单尚未完成出库，因此暂时无法获取尾程面单。请待订单完成出库后再自助查询。";
  }
  if (
    result === "not_supported" &&
    (businessCode === "02020249909" || /超过可查询时限/.test(rawMessage))
  ) {
    return "尾程面单已支持自助查询，但该订单已超过可查询时限（出库后 30 天内可查）。";
  }
  if (result === "not_supported") {
    return "接口返回该订单当前不支持查询，但未提供更具体的业务原因。";
  }
  if (result === "forbidden") {
    return "账号权限或订单归属校验未通过，因此无法查询该订单。请确认使用该订单所属账号登录。";
  }
  if (result === "no_label") return "查询已完成，但当前没有返回可下载的尾程面单文件。";
  if (result === "success") return rawMessage || "操作成功";
  if (businessCode === "-1") {
    return "面单查询未返回有效结果，暂时无法确认具体原因。请稍后重新查询。";
  }
  return "本次查询未返回可确认的业务原因，暂时无法获取尾程面单。";
}

function shippingLabelGroups(raw: unknown): Array<{ trackingNo: string; labelUrls: string[] }> {
  const parsed = shippingLabelResultParse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const object = parsed as Record<string, unknown>;
  if (object.data != null && object.maskedLabelUrlList == null) return shippingLabelGroups(object.data);
  const list = Array.isArray(object.maskedLabelUrlList) ? object.maskedLabelUrlList : [];
  const groups: Array<{ trackingNo: string; labelUrls: string[] }> = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const trackingNo = String(record.trackingNo ?? "").trim();
    const labelUrls = Array.isArray(record.labelUrls)
      ? (record.labelUrls as unknown[])
          .map((value) => String(value).trim())
          .filter((value) => /^https?:\/\//i.test(value))
      : [];
    if (labelUrls.length > 0) groups.push({ trackingNo, labelUrls: [...new Set(labelUrls)] });
  }
  return groups;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const resolution = params.resolution && typeof params.resolution === "object"
    ? params.resolution as Record<string, unknown>
    : {};
  const unresolvedIdentifiers = Array.isArray(resolution.unresolvedIdentifiers)
    ? resolution.unresolvedIdentifiers
    : [];
  const actionPlans = Array.isArray(params.actionPlans)
    ? params.actionPlans as Array<Record<string, unknown>>
    : [];
  const outputList = Array.isArray(params.labelPluginOutputList)
    ? params.labelPluginOutputList as unknown[]
    : [];

  const orderResults = actionPlans.map((plan, index) => {
    const response = shippingLabelResponse(outputList[index]);
    let result: LabelResult;
    let labels: Array<{ trackingNo: string; labelUrls: string[] }> = [];
    if (response.code === "0") {
      labels = shippingLabelGroups(response.data);
      result = labels.length > 0 ? "success" : "no_label";
    } else {
      result = shippingLabelClassify(response.code, response.msg);
    }
    return {
      orderNo: String(plan.orderNo ?? "").trim(),
      matchedFrom: Array.isArray(plan.matchedFrom) ? plan.matchedFrom : [],
      result,
      businessCode: response.code,
      message: shippingLabelSafeMessage(result, response.msg, response.code),
      labels,
    };
  });

  return { orderResults, unresolvedIdentifiers };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-label-results")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}
