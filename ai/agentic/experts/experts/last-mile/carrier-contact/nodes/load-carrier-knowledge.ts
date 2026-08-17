/**
 * 节点：load-carrier-knowledge — 组装注入 LLM 的 kbMd（与 prompts/kb.md 正文一致，须同步维护）
 * FaaS 单文件闭环，无外部 import。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输出】kbMd：解析侧重前缀 + CARRIER_KB_MARKDOWN；并透传 validate 产出供 llm 使用。
 */
const CARRIER_KB_MARKDOWN: string = "# 承运商 / 自提点联系方式 — 内置知识库（KB）\n\n> **溯源（维护者）**：内部 SOP《（海外仓）各供应商的客服电话》；完整链接见 **design.md**。本文件为运营整理版，与 `nodes/load-carrier-knowledge.ts` 内嵌 `CARRIER_KB_MARKDOWN` **须保持同步**。对客回复**仅可使用**下文明示号码、邮箱与 URL；**禁止**向客户提供文档标注为「限 Winit 拨打 / 切勿给到客户」的内部号码；**禁止**在对客句中口述「内部文档名」或内部协作文档链接。\n\n---\n\n## 国际件 — 目的地供应商电话无法直接提供时\n\n- 目的地国家分散，无法保证表中已覆盖全部末端承运商。\n- 建议客户先在 **Google** 搜索该承运商官方客服电话。\n- 若仍无法获得：引导 **万邑联 → 索赔/查件 → 新增尾程查件**，异常类型按实际选择，**备注中写明需要目的地国家供应商联系电话**。\n- **时效说明**：工作日 **16:00 前**成功提交的申请，Winit 当天代为向尾程供应商发起咨询；超过 16:00 顺延至下一工作日。供应商反馈时间通常约 **5 个工作日**（以实际为准）。\n- **内部口径**：可尝试协助查询当地联系方式；查不到则仍建议走查件。\n\n---\n\n## US — 尾程派送方式与客服电话（节选）\n\n| 派送方式 / 渠道 | 联系方式 |\n|-----------------|----------|\n| US USPS | 001-800-275-8777 |\n| US UPS（含 UPS Mail Innovations Lightweight / Heavyweight） | 001-800-877-1497 或 001-800-742-5877 |\n| US FedEx | 001-800-463-3339 |\n| US DHL EXPRESS | 001-800-225-5345 |\n| US DHLe（DHL eCommerce 等） | +1 317-554-5191；亦可 [webtrack.dhlglobalmail.com](https://webtrack.dhlglobalmail.com/home) 联系客服 |\n| US Western Post | +1 (859) 809-2258 |\n| US GOFO | 1 (949) 688-6032 |\n| Winit Shipping - Big&Bulky | +1 (859) 809-2258 |\n| DGF（美西 LAX Hub） | 001-800-426-5962 或 +1 310-536-5400（接通后按 3 选 domestic air/ground 转 DHL Global Forwarding，再按 4 或 0 转人工） |\n| DGF（美东 CVG Hub） | 001-888-376-7432 |\n| DGF（美南 DFW Hub） | 001-469-586-3159 |\n| Amazon Logistics - Shipping with Amazon | 无公开电话；[track.amazon.com 联系页](https://track.amazon.com/contact-us?trackingId)（需 trackingId） |\n| Ontrac Ground | 无公开电话；短信发 **track my package** 至 **5878172380** |\n| SpeedX | 无公开电话；[SpeedX 支持中心](https://support.speedx.io/hc/en-us/articles/27523827848717-How-can-I-contact-SpeedX) |\n| yanwen（燕文） | 无电话；客诉邮箱 [service@yanwenexpress.com](mailto:service@yanwenexpress.com) |\n\n---\n\n## AU — 节选\n\n| 派送方式 / 渠道 | 联系方式 |\n|-----------------|----------|\n| AU POST（MCS 转 AU POST 等） | 澳洲本地 **13 POST (13 7678)**；境外 +61 3 8847 9045 |\n| Allied Express | **13 13 73** |\n| AU Toll Priority | **13 15 31** |\n| AU Toll IPEC | 1300 865 547 Option 5；境外 +61 1300 865 547 Option 5 |\n| AU Direct Freight | **1300 347 397** |\n| AU Mix Shipping Economy（AU CP） | **1300 361 000** |\n| TNT | **13 11 50** |\n| AU MCS 转 PFL | +61 2 8355 1956；网站 [pflogistics.com.au](http://www.pflogistics.com.au/) |\n| Fastway / Aramex（按站点） | 用 [Aramex 追踪](https://www.aramex.com.au/tools/track/) 查站点后，官网 **Contact us → Aramex depot** 按州查站点电话（内部 SOP 含站点示意与附件索引，勿对客户复述）。 |\n\n---\n\n## DE — 节选\n\n| 派送方式 / 渠道 | 联系方式 |\n|-----------------|----------|\n| DE DHL Packet | 0049 228 4333112（**注意**：文档中 **+49 228 76369697** 等为 **Winit 内部拨打限制号，禁止给终端客户**） |\n| DE Deutsche Post | 国内 0049 228 4333112；国际 0049 228 4333118 |\n| DE Europe Freight (DHL Freight) | 0049 421 52 38-112 |\n| DE UPS | 0049 01806 882663 |\n| DE DPD | +49 6021 150415 或 +49 (0)6021 / 150410 |\n| DE DB SCHENKER | [sims.dbschenker.com/support](https://sims.dbschenker.com/support) 选 phone、输入国家查当地电话 |\n| DE YunExpress 转 GOFO FR | +33 970709065 |\n| GLS（表中与 DE 相关条目） | 以内部最新维护表及德区派送合同为准；北美常用 1-800-322-5555 为 GLS 美国客服示例（以德区实际派送合同为准） |\n\n---\n\n## UK — 节选\n\n| 派送方式 / 渠道 | 联系方式 |\n|-----------------|----------|\n| UK DPD | 0044 121 275 0500 |\n| UK Royal Mail | 08457 950 950 或 03457 740 740 |\n| UK XDP | 01675 477165 |\n| UK Yodel | 0344 755 0117 |\n| EVRi（原 Hermes） | 0330 808 5456；可配合官方 App |\n| UK P2P | 01268 533114 |\n| UK Parcelforce | 03448 006205 或 0344 800 4466 |\n| UK UPS FREIGHT | 03457 877 877 |\n| UK DHL | 02476 937 770（服务时间以承运商公布为准） |\n\n---\n\n## BE — 节选\n\n| 派送方式 / 渠道 | 联系方式 |\n|-----------------|----------|\n| BE UPS | 078-250-877 |\n| BE Deutsche Post | 0228 4333112 |\n\n---\n\n## DE DHL 国际件 — 目的国末端（节选表）\n\n以下用于 **DHL International Paket** 等经德国仓出发、目的国为当地的场景；完整列以内部维护表为准（维护者按 design.md 同步）。\n\n| 国家 | 供应商 | 联系方式 |\n|------|--------|----------|\n| AT | Austrian Post | 0800 010 100 或 +43 0800 212 212 |\n| CZ | PPL | 420 954 292 102 |\n| FR | Laposte | 33 810 82 18 21 |\n| IT | DHL Italia | 199.199.345 |\n| IT | Poste Italiane | 199.113366 |\n| ES | Correos | 902 197 197 |\n| ES | DHL Espana | 902 12 24 24 或 902 12 30 30 |\n| UK | Royal Mail | 08448 00 44 66 |\n| NL | DHL Nederland | (31) 0900 2222 120 |\n\n西班牙 DHL 客户服务入口示例：[dhl.com/es-en 客户服务](https://www.dhl.com/es-en/home/customer-service.html)\n\n---\n\n## UPS International Standard Parcel\n\n末端为当地 UPS 时，可引导客户在 **UPS 官网** 按国家/服务查询当地客服（内部操作指引含截图路径，勿对客户复述文档来源）。\n\n---\n\n## DHL International Paket (DE 出发)\n\n可引导客户在 **DHL 官网** 切换至目的国站点查询当地热线（内部指引含多国跳转说明，勿对客户复述）。\n\n---\n\n## 输出约束（给模型）\n\n- 号码、邮箱、URL **须来自上文或 enrichedContext 中已出现的字段**；不得臆造区号或分机。\n- **不得**输出标注为内部/Winit 专用的电话号码给客户。\n- 无表内覆盖的渠道：诚实说明，并给 **国际件查件** 或 **官网自助** 路径，不承诺供应商回电时间。\n";

function pickHints(ec: unknown, carrierCode: string, region: string): { lines: string[]; tags: string[] } {
  const lines: string[] = [];
  const tags: string[] = [];
  const r = (region + " " + carrierCode).toUpperCase();
  if (/\bUS\b|UNITED STATES|USA|CALIFORNIA|LAX|\bNY\b/.test(r)) tags.push("US");
  if (/\bAU\b|AUSTRALIA|SYDNEY|MELBOURNE/.test(r)) tags.push("AU");
  if (/\bDE\b|GERMANY|DEUTSCH/.test(r)) tags.push("DE");
  if (/\bUK\b|\bGB\b|UNITED KINGDOM|LONDON/.test(r)) tags.push("UK");
  if (/\bBE\b|BELGIUM/.test(r)) tags.push("BE");
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
  if (carrierCode) lines.push("- 入参 carrierCode: " + carrierCode);
  if (region) lines.push("- 入参 region: " + region);
  return { lines, tags };
}

function buildFocusBlock(carrierCode: string, region: string, ec: unknown): string {
  const { lines, tags } = pickHints(ec, carrierCode, region);
  return [
    "## 本次解析侧重（系统生成，非客户原文）",
    tags.length ? "- 关键词命中区域标签: " + tags.join(", ") : "- 未从 region/carrierCode 解析到国家标签（仍输出全量 KB 表供核对）",
    ...lines,
    "",
  ].join("\n");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const query = String(params.query ?? "");
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
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

  const focus = buildFocusBlock(carrierCode, region, enrichedContext);
  const kbMd = focus + "\n---\n\n" + CARRIER_KB_MARKDOWN;

  return {
    kbMd,
    valid,
    error,
    query,
    trackingIds,
    carrierCode,
    region,
    customerIntent,
    enrichedContext,
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-carrier-knowledge")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
