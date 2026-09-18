/**
 * OSF8 销毁询价本机只读 E2E：2 张待审核单。
 * 不写 OMS、不发飞书、不点审核通过、不改现网 pipeline。
 *
 *   npx tsx internal-review-copilot/_runs/20260918_osf8_e2e/run.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CASES = [
  { vasc: "VASC000000374748", wo: "WO12271270323", why: "美国仓 + 客户选了普货专业销毁" },
  { vasc: "VASC000000373308", wo: "WO12269930088", why: "英国仓 + 客户选了普货专业销毁" },
];

const PRODUCTS = [
  { code: "OSF832009109", name: "库存弃置", rank: 1 },
  { code: "OSF831009110", name: "仓内销毁", rank: 2 },
  { code: "OSF831009111", name: "普货专业销毁", rank: 3 },
  { code: "OSF831009112", name: "危废专业销毁", rank: 4 },
  { code: "OSF831009113", name: "TS合规专业销毁", rank: 5 },
] as const;

const INQUIRY_SOP =
  "1、仓库报价；\n2、客户若同意报价，仓库开始作业，打包完成后联系销毁公司出库；\n3、销毁完成后，将销毁公司提供的销毁证明上传。";

const METAL_RE = /铝|钢|铁|铜|金属|合金|锌/;
const LIQUID_RE = /液体|油类|润滑油/;
const ELEC_RE = /电子元器件|电路板|芯片/;
const HAZ_RE = /化工产品|危废|纯电|食品/;

type Merch = { merchandise_code: string; merchandise_serno: string; name_cn: string; is_battery: string; qty: number };
type WoFact = {
  vasc: string;
  winit_product_code: string;
  winit_product_name: string;
  dispatch_wh_code: string;
  country_code: string;
  country_name: string;
  need_offline_vas: string;
  merchandise: Merch[];
};

function attrMap(atom: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of asArray(atom.vaAtomAttrs).map(asRecord)) {
    const key = asText(row.attributeKey) || asText(row.attributeName);
    const value = asText(row.attributeValue) || asText(row.pulldownValue);
    if (key) out[key] = value;
  }
  return out;
}

function scanGoods(lines: Merch[]) {
  const names = lines.map((x) => x.name_cn).join("；");
  const battery = lines.some((x) => String(x.is_battery).toUpperCase() === "Y");
  return {
    names,
    battery,
    metalHint: METAL_RE.test(names),
    liquidHint: LIQUID_RE.test(names),
    elecHint: ELEC_RE.test(names),
    hazHint: HAZ_RE.test(names) || battery,
    skuCount: new Set(lines.map((x) => x.merchandise_code)).size,
  };
}

function judge(wo: WoFact) {
  const goods = scanGoods(wo.merchandise);
  const us = wo.country_code === "US" || wo.country_name === "美国";
  const rows = PRODUCTS.map((p) => {
    if (p.code === "OSF832009109") {
      return { ...p, ok: true, reason: "录像：弃置出库一般可选；客户是否愿意交处置权需人问，不在本闸拦掉。" };
    }
    if (p.code === "OSF831009110") {
      if (!us) return { ...p, ok: false, reason: `${wo.country_name}站不支持仓内销毁（仅美国普货）。` };
      if (goods.battery) return { ...p, ok: false, reason: "出库商品含带电，仓内销毁不行。" };
      if (goods.metalHint) return { ...p, ok: false, reason: "商品名出现金属线索（如铝），仓内销毁不含金属。" };
      if (goods.liquidHint) return { ...p, ok: false, reason: "商品名出现液体线索，仓内销毁不含液体。" };
      if (goods.elecHint) return { ...p, ok: false, reason: "商品名出现电子元器件线索，仓内销毁不行。" };
      return {
        ...p,
        ok: false,
        reason: "商品主数据未接，无法确认是普货且无金属/液体/电子元器件。收口：仓内不标「能走」。",
      };
    }
    if (p.code === "OSF831009111") {
      if (goods.hazHint) return { ...p, ok: false, reason: "带电或名称像危废/食品/纯电，不能走普货专业销毁。" };
      return { ...p, ok: true, reason: "出库商品表未见带电；化工/食品/纯电主数据未查到相反证据。暂标能走。" };
    }
    if (p.code === "OSF831009112") {
      if (goods.hazHint) return { ...p, ok: true, reason: "出现带电或危废线索，危废专业销毁可走。" };
      return { ...p, ok: false, reason: "未见危废/带电/纯电/食品/化工特性（仅出库商品表）。" };
    }
    return { ...p, ok: false, reason: "TS 备案库未接，不能标能走。" };
  });
  const selected = rows.find((r) => r.code === wo.winit_product_code) || {
    code: wo.winit_product_code,
    name: wo.winit_product_name,
    rank: 99,
    ok: false,
    reason: "客户已选产品不在本次五条目录。",
  };
  const cheaper = rows.filter((r) => r.ok && r.rank < (selected.rank || 99));
  return { goods, rows, selected, cheaper, notify: cheaper.length > 0 };
}

function brief(args: {
  vasc: string;
  status: string;
  atomSop: string;
  attrs: Record<string, string>;
  wo: WoFact;
  judged: ReturnType<typeof judge>;
}): string {
  const { wo, judged } = args;
  const skuLines = wo.merchandise
    .slice(0, 12)
    .map((m) => `  - ${m.merchandise_code} / ${m.merchandise_serno} / ${m.name_cn} / 带电=${m.is_battery} / 数量=${m.qty}`)
    .join("\n");
  const more = wo.merchandise.length > 12 ? `\n  - …共 ${wo.merchandise.length} 行` : "";
  const able = judged.rows.map((r) => `- ${r.name}（${r.code}）：${r.ok ? "能走" : "不能"}。${r.reason}`).join("\n");
  const cheaperTxt = judged.cheaper.length
    ? judged.cheaper.map((r) => `${r.name}（${r.code}，占位更便宜）`).join("、")
    : "无";
  const notify = judged.notify
    ? `要问销售客服：客户现在选的是「${judged.selected.name}」，本单还能走更便宜的 ${cheaperTxt}，要不要问客户改。价格为占位排序，未读价卡。`
    : "不通知。允许集合里没有比客户已选更便宜的项。";
  const sop = args.atomSop.trim() || INQUIRY_SOP;
  return `【审核参考摘要】（系统根据出库单/商品拼装，供审核核对，不等于已审核通过）

一、系统事实
- 增值询价单：专业销毁非标询价（OSF8V1848） ${args.vasc}，状态 ${args.status}
- 出库单：${CASES.find((c) => c.vasc === args.vasc)?.wo}
- 仓库 / 国家：${wo.dispatch_wh_code} / ${wo.country_name}
- 客户已选出库产品：${wo.winit_product_code} ${wo.winit_product_name}
- 增值属性「销毁方式」：${args.attrs["销毁方式"] || "（空）"}（不是细类，不要当客户已选）
- 出库 need_offline_vas：${wo.need_offline_vas}
- 商品主数据 / TS 备案：未查（本轮只读出库商品表）
- 商品（${judged.goods.skuCount} 个编码）：
${skuLines}${more}

二、本单能走哪些出库产品（价格占位：弃置 < 仓内 < 普货专业 < 危废 < TS）
${able}

三、和客户已选对比
- 已选是否在允许集合内：${judged.selected.ok ? "是" : "否或未列入允许"}
- 更便宜且允许：${cheaperTxt}
- ${notify}

【仓库询价步骤】（产品模板，保留）
${sop}
`;
}

async function pullVas(client: Awaited<ReturnType<typeof createTomClient>>, orderNo: string) {
  await client.setOrderReferer(orderNo);
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "5",
  });
  const header =
    asArray(asRecord(list.info).content || asRecord(list.info).data)
      .map(asRecord)
      .find((item) => asText(item.orderNo) === orderNo) || {};
  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  const atoms = asArray(asRecord(vas.info).content).map(asRecord);
  const atom = atoms.find((a) => asText(a.serviceCode) === "OSF8V1848") || atoms[0] || {};
  const biz = asRecord(header.businessOrder);
  const wh = asRecord(header.warehouse);
  const customer = asRecord(header.customer);
  return {
    orderNo,
    status: asText(header.statusDesc),
    serviceCode: asText(atom.serviceCode),
    serviceName: asText(atom.serviceName),
    wo: asText(biz.businessNo),
    warehouse: asText(wh.warehouseCode) || asText(header.warehouseCode),
    country: asText(wh.countryName) || asText(header.countryName),
    customerCode: asText(customer.customerCode) || asText(header.customerCode),
    sop: asText(atom.sop),
    attrs: attrMap(atom),
  };
}

async function main() {
  loadEnvFiles();
  mkdirSync(HERE, { recursive: true });
  mkdirSync(resolve(HERE, "briefs"), { recursive: true });
  const woAll = JSON.parse(readFileSync(resolve(HERE, "wo-facts.json"), "utf8")) as {
    orders: Record<string, WoFact>;
  };
  const client = await createTomClient();
  const results = [];
  for (const c of CASES) {
    const vas = await pullVas(client, c.vasc);
    const wo = woAll.orders[c.wo];
    if (!wo) throw new Error(`missing wo facts ${c.wo}`);
    const judged = judge(wo);
    const text = brief({ vasc: c.vasc, status: vas.status, atomSop: vas.sop, attrs: vas.attrs, wo, judged });
    writeFileSync(resolve(HERE, "briefs", `${c.vasc}.md`), text, "utf8");
    const row = {
      why: c.why,
      vas,
      wo: {
        order: c.wo,
        product: `${wo.winit_product_code} ${wo.winit_product_name}`,
        warehouse: `${wo.dispatch_wh_code} ${wo.country_name}`,
        skuCount: judged.goods.skuCount,
      },
      eligible: judged.rows.filter((r) => r.ok).map((r) => r.name),
      notEligible: judged.rows.filter((r) => !r.ok).map((r) => `${r.name}：${r.reason}`),
      cheaper: judged.cheaper.map((r) => r.name),
      notifyIfCheaper: judged.notify,
      wroteOms: false,
      sentFeishu: false,
    };
    results.push(row);
    console.log(c.vasc, vas.status, wo.winit_product_name, "notify=", judged.notify);
  }
  writeFileSync(resolve(HERE, "e2e-json.json"), JSON.stringify(results, null, 2), "utf8");
  const md = `# OSF8 两单只读 E2E

未写 OMS、未发飞书、未点审核通过、未改现网 pipeline。

挑单：一张美国、一张英国，客户都选了「普货专业销毁」，用来对照「仓内能不能走」和「有没有更便宜才通知」。

| 增值单 | 出库单 | 仓 | 客户已选 | 能走 | 更便宜允许项 | 发卡？ |
|---|---|---|---|---|---|---|
${results
  .map(
    (r) =>
      `| ${r.vas.orderNo} | ${r.wo.order} | ${r.wo.warehouse} | ${r.wo.product} | ${r.eligible.join("、") || "无"} | ${r.cheaper.join("、") || "无"} | ${r.notifyIfCheaper ? "是（本轮未发）" : "否"} |`,
  )
  .join("\n")}

## 怎么跑的

1. OMS \`pageQuery\` + \`getVasList\` 读增值单（原子、SOP、销毁方式属性、状态）。
2. DWS 出库表读 \`winit_product_*\` 和商品行（\`wo-facts.json\`）。
3. 规则列出五条出库产品能走/不能；占位价格比客户已选。
4. 生成 SOP 摘要到 \`briefs/\`。

## 验收要点

- 英国单仓内必须是「不能」。
- 美国单本例商品名含「铝」，仓内必须是「不能」。
- 两单客户已选都是普货专业销毁；若库存弃置能走，占位更便宜 → 摘要写「要问销售客服」，本轮卡片未发。
- 增值属性「物理销毁」不得写成客户已选细类。
`;
  writeFileSync(resolve(HERE, "result.md"), md, "utf8");
  console.log("wrote", resolve(HERE, "result.md"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
