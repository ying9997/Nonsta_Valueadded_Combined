/**
 * 节点：load-supplier-tracking-knowledge — 组装注入 LLM 的 kbMd（与 prompts/kb.md 正文一致，须同步维护）
 * FaaS 单文件闭环，无外部 import。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输出】kbMd：解析侧重前缀 + SUPPLIER_TRACKING_KB_MARKDOWN；并透传 validate 产出供 llm 使用。
 */
const SUPPLIER_TRACKING_KB_MARKDOWN: string = "# 尾程承运商官网轨迹查询入口 — 内置知识库（KB）\n\n> **溯源**：飞书 SOP [（海外仓）尾程各供应商的物流查询网址](https://winitlink.feishu.cn/wiki/wikcnlRkIVeYTuFSCxLFfP1EJ6d)；仓库完整副本（含配图文件名）见 `docs/experts/last-mile/supplier-tracking/carrier-portals.md`。本文件为 LLM 注入版，**不配图片**以控制 token；分步截图请查阅上述路径。  \n> **阶段一**：仅输出 KB 中出现的 URL 与步骤；**禁止**臆造链接。客服电话类请以 **carrier-contact** 为准，本 KB 仅保留与「物流查询网址」直接相关的入口说明。\n\n---\n\n## 国家 / 承运商 / 物流网址\n\n| 国家 | 供应商/承运商 | 物流网址 |\n| --- | --- | --- |\n| 澳洲 | AU TOLL - IPEC Freight | [https://www.myteamge.com/](https://www.myteamge.com/) |\n|  | AU TOLL - Priority Parcel | [https://www.myteamge.com/](https://www.myteamge.com/) |\n|  | MCS | 转 fastway 网址 [https://www.aramex.com.au/tools/track/](https://www.aramex.com.au/tools/track/) |\n|  |  | 转 PFL 网址：[http://www.pflogistics.com.au/tracking](http://www.pflogistics.com.au/tracking) |\n|  | AU Post | [https://auspost.com.au/mypost/track/#/search](https://auspost.com.au/mypost/track/#/search) |\n|  | Direct Freight | [https://www.directfreight.com.au/](https://www.directfreight.com.au/) |\n|  | TNT | [https://www.tnt.com/express/en_au/site/home.html](https://www.tnt.com/express/en_au/site/home.html) |\n|  | AU Mix Shipping Economy（组合渠道） | AU CP：[https://www.couriersplease.com.au/](https://www.couriersplease.com.au/) |\n|  |  | 转 fastway 网址 [https://www.aramex.com.au/tools/track/](https://www.aramex.com.au/tools/track/) |\n|  | Allied Express | [https://www.alliedexpress.com.au/](https://www.alliedexpress.com.au/) |\n| 比利时 | BEMO B2C Europe | [https://www.trackyourparcel.eu/](https://www.trackyourparcel.eu/) |\n|  | BEMO DE Post | [https://www.deutschepost.de/sendung/simpleQuery.html?locale=en_GB](https://www.deutschepost.de/sendung/simpleQuery.html?locale=en_GB) |\n|  | DPD-France Delivery | [https://trace.dpd.fr/trace](https://trace.dpd.fr/trace) |\n|  | DPD - Domestic | [https://tracking.dpd.de/status/en_US/404](https://tracking.dpd.de/status/en_US/404) |\n|  | Colissimo FR Delivery | [https://wndirect.com/tracking.php?type=TR&ref=9L25782669757&submit=#](https://wndirect.com/tracking.php?type=TR&ref=9L25782669757&submit=#)（示例 query，请替换为实际单号） |\n|  | BEMO UPS | [https://www.ups.com/track?loc=en_BE&requester=ST/](https://www.ups.com/track?loc=en_BE&requester=ST/) |\n| 德国 | DE DHL Freight | [https://activetracing.dhl.com/DatPublic/datSelection.do](https://activetracing.dhl.com/DatPublic/datSelection.do) |\n|  | DE DHL | [https://www.dhl.com/global-en/home.html](https://www.dhl.com/global-en/home.html) |\n|  | DE DE Post | [https://www.postdirekt.de/plzserver/PlzSearchServlet](https://www.postdirekt.de/plzserver/PlzSearchServlet) |\n|  | GLS | [https://gls-group.com/GROUP/en/parcel-tracking](https://gls-group.com/GROUP/en/parcel-tracking) |\n|  | DE DB Schenker | [https://www.dbschenker.com/app/tracking-public/schenker-search?language_region=de-DE_DE](https://www.dbschenker.com/app/tracking-public/schenker-search?language_region=de-DE_DE) |\n|  | KUEHNE NAGEL - Road Delivery | [https://mykn.kuehne-nagel.com/public-tracking/](https://mykn.kuehne-nagel.com/public-tracking/) |\n|  | DE DPD | [https://tracking.dpd.de/status/en_US/404](https://tracking.dpd.de/status/en_US/404) |\n| 英国 | UK XDP | [https://www.xdp.co.uk/track.php?c=&code=](https://www.xdp.co.uk/track.php?c=&code=) |\n|  | UK Yodel | [https://www.yodel.co.uk/](https://www.yodel.co.uk/) |\n|  | Hermes (Evri) | [https://www.evri.com/track-a-parcel](https://www.evri.com/track-a-parcel) |\n|  | UK P2P | 无（表中无独立查询网址） |\n|  | UK Royal Mail | [https://www.royalmail.com/](https://www.royalmail.com/) |\n|  | UK DPD | [https://www.dpd.co.uk/](https://www.dpd.co.uk/) |\n|  | UK UPS | [https://www.ups.com/us/en/Home.page](https://www.ups.com/us/en/Home.page) |\n|  | UK DHL | [https://track.dhlparcel.co.uk/?con=](https://track.dhlparcel.co.uk/?con=) |\n|  | P4D（线下发货物流） | [https://app.p4d.co.uk/tracking](https://app.p4d.co.uk/tracking) |\n| 美国 | US DHL - Express Worldwide | [https://www.dhl.com/cn-zh/home.html?locale=true](https://www.dhl.com/cn-zh/home.html?locale=true) |\n|  | US DHL - Global Forwarding | [https://www.dhl.com/cn-zh/home.html?locale=true](https://www.dhl.com/cn-zh/home.html?locale=true) |\n|  | US DGM | [https://www.dhl.com/cn-zh/home.html?locale=true](https://www.dhl.com/cn-zh/home.html?locale=true) 、 [https://www.usps.com/](https://www.usps.com/) |\n|  | US UPS - Mail Innovations | [https://www.ups.com/us/en/Home.page](https://www.ups.com/us/en/Home.page) 、[https://www.usps.com/](https://www.usps.com/) |\n|  | US UPS | [https://www.ups.com/us/en/Home.page](https://www.ups.com/us/en/Home.page) |\n|  | US USPS | [https://www.usps.com/](https://www.usps.com/) |\n|  | US FEDEX | [https://www.fedex.com/en-us/home.html](https://www.fedex.com/en-us/home.html) |\n|  | Amazon Logistics - Shipping with Amazon | [https://track.amazon.com/](https://track.amazon.com/) |\n|  | SpeedX | [https://speedx.io/](https://speedx.io/) |\n|  | OnTrac - Ground | [https://www.ontrac.com/tracking/](https://www.ontrac.com/tracking/) |\n|  | US Western Post | [http://tracking.westernpost.group/](http://tracking.westernpost.group/) |\n|  | YANWEN | [https://www.yanwenexpress.com/](https://www.yanwenexpress.com/) |\n|  | DHLe | [https://webtrack.dhlglobalmail.com/home](https://webtrack.dhlglobalmail.com/home) |\n|  | GOFO | [https://gofoexpress.com/](https://gofoexpress.com/) |\n| 加拿大 | Uni- Domestic Delivery | [https://www.uniuni.com/tracking/](https://www.uniuni.com/tracking/) |\n|  | Canada Post - Expedited Parcels | [https://www.canadapost-postescanada.ca/track-reperage/en#/home](https://www.canadapost-postescanada.ca/track-reperage/en#/home) |\n|  | CA UPS | [https://www.ups.com/ca/en/Home.page](https://www.ups.com/ca/en/Home.page) |\n|  | GLS | [https://gls-group.com/IT/en/online-services/track-trace?match=E7220236150&type=NAT](https://gls-group.com/IT/en/online-services/track-trace?match=E7220236150&type=NAT)（示例 match，请替换为实际单号） |\n|  | IT POST | [https://www.poste.it/chiamaci.html](https://www.poste.it/chiamaci.html) |\n|  | Purolator Ground | [https://www.purolator.com/en#](https://www.purolator.com/en#) |\n|  | PDN - Express | [https://pdn.express/en/](https://pdn.express/en/) |\n\n> **维护提示**：Colissimo（wndirect）、部分 GLS 等链接若带示例单号或示例 query，对客须替换为实际跟踪号；UK P2P 无独立官网查询 URL，应如实说明并建议万邑通轨迹，若需发起包裹调查请转 **尾程查件**（`tracking-inquiry`）。\n\n---\n\n## 德国 DHL - International Paket — 目的国本地查询（文字步骤）\n\n1. DHL International Paket 可在 DHL 站点通过 **「shipment tracking in foreign countries」** 跳转至目的国本地查询页。  \n2. 轨迹中可能同时存在德国段单号与目的国邮政单号；需在目的国页面使用对应单号。  \n3. 示例（法国 La Poste）：`https://www.laposte.fr/outils/suivre-vos-envois?code=` + 实际单号（勿照抄历史示例单号）。  \n4. 详细点击路径见仓库 `docs/experts/last-mile/supplier-tracking/carrier-portals/` 配图。\n\n---\n\n## 德国 DHL - International — 目的国站点轨迹查询入口（摘录）\n\n- 示例形态：`https://clientesparcel.dhl.es/LiveTracking/ModifyMyShipment/` + 订单片段（以实际为准）；帮助中心入口见 [DHL Parcel ES Customer Service](https://www.dhlparcel.es/en/private-customers/customer-service.html)。  \n- **热线电话**不在本专家展开，请路由 **carrier-contact** 或内部 SOP。\n\n---\n\n## 美国 DHL - Express Worldwide\n\n- 轨迹查询主入口见上表 **US DHL - Express Worldwide** 链接。帮助中心路径见飞书 SOP 截图（仓库 `docs/experts/last-mile/supplier-tracking/carrier-portals/` 配图目录）。\n\n---\n\n## Shipping with Amazon（Amazon Logistics）— 多源对照\n\n- **官网（实时）**：https://track.amazon.com/  \n- **万邑通轨迹平台**（异步，约一日 4 次抓取，可能延迟）：https://track.winit.com.cn/tracking/index.php?s=/Index/result  \n- **17TRACK**：https://www.17track.net/zh-cn — 承运商选择 **「Amazon Shipping + Amazon MCF」**。\n\n---\n\n## 输出约束（给模型）\n\n- **仅可使用**上文已出现的 URL 与域名；组合渠道须按表中顺序说明（如 AU Mix：先 CP 再 Fastway）。  \n- **勿**编造未在 KB 出现的链接；**勿**向客户口述内部飞书文档名。  \n- UK P2P 为「无」时不得在 `trackingPortalUrls` 中虚构 URL。\n";

function pickHints(
  ec: unknown,
  country: string,
  lastMileProductName: string,
  carrierCode: string,
  region: string
): { lines: string[]; tags: string[] } {
  const lines: string[] = [];
  const tags: string[] = [];
  const r = (country + " " + region + " " + carrierCode + " " + lastMileProductName).toUpperCase();
  if (/\bUS\b|UNITED STATES|USA|CALIFORNIA|LAX|\bNY\b/.test(r)) tags.push("US");
  if (/\bAU\b|AUSTRALIA|SYDNEY|MELBOURNE/.test(r)) tags.push("AU");
  if (/\bDE\b|GERMANY|DEUTSCH/.test(r)) tags.push("DE");
  if (/\bUK\b|\bGB\b|UNITED KINGDOM|LONDON/.test(r)) tags.push("UK");
  if (/\bBE\b|BELGIUM/.test(r)) tags.push("BE");
  if (/\bCA\b|CANADA/.test(r)) tags.push("CA");
  if (ec && typeof ec === "object" && !Array.isArray(ec)) {
    const o = ec as Record<string, unknown>;
    const ch = o.carrierHints;
    if (ch && typeof ch === "object") {
      lines.push("- enrichedContext.carrierHints: " + JSON.stringify(ch).slice(0, 1200));
    }
    const tr = o.trajectories;
    if (Array.isArray(tr) && tr[0] && typeof tr[0] === "object") {
      const s = (tr[0] as { summary?: unknown }).summary;
      if (s && typeof s === "object") {
        lines.push("- trajectories[0].summary: " + JSON.stringify(s).slice(0, 800));
      }
    }
  }
  if (country) lines.push("- 入参 country: " + country);
  if (lastMileProductName) lines.push("- 入参 lastMileProductName: " + lastMileProductName);
  if (carrierCode) lines.push("- 入参 carrierCode: " + carrierCode);
  if (region) lines.push("- 入参 region: " + region);
  return { lines, tags };
}

function buildFocusBlock(
  country: string,
  lastMileProductName: string,
  carrierCode: string,
  region: string,
  ec: unknown
): string {
  const { lines, tags } = pickHints(ec, country, lastMileProductName, carrierCode, region);
  return [
    "## 本次解析侧重（系统生成，非客户原文）",
    tags.length ? "- 关键词命中区域标签: " + tags.join(", ") : "- 未从 country/region/carrierCode 解析到国家标签（仍输出全量 KB 表供核对）",
    ...lines,
    "",
  ].join("\n");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const query = String(params.query ?? "");
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const country = String(params.country ?? "").trim();
  const lastMileProductName = String(params.lastMileProductName ?? "").trim();
  const carrierCode = String(params.carrierCode ?? "").trim();
  const region = String(params.region ?? "").trim();
  const customerIntent = String(params.customerIntent ?? "").trim();
  const enrichedContext =
    params.enrichedContext && typeof params.enrichedContext === "object" && !Array.isArray(params.enrichedContext)
      ? params.enrichedContext
      : {};
  const inputContext =
    params.inputContext && typeof params.inputContext === "object" && !Array.isArray(params.inputContext)
      ? params.inputContext
      : {};
  const valid = params.valid === true;
  const error = String(params.error ?? "");

  const focus = buildFocusBlock(country, lastMileProductName, carrierCode, region, enrichedContext);
  const kbMd = focus + "\n---\n\n" + SUPPLIER_TRACKING_KB_MARKDOWN;

  return {
    kbMd,
    valid,
    error,
    query,
    trackingIds,
    country,
    lastMileProductName,
    carrierCode,
    region,
    customerIntent,
    enrichedContext,
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-supplier-tracking-knowledge")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
