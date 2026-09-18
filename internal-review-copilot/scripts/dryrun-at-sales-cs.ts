/**
 * 本地干跑：真实待审核单 → 客户号上的销售/客服 → 异常沟通群花名册能否真 @。
 * 不建话题、不发飞书、不写 OMS。
 *
 *   npx tsx internal-review-copilot/scripts/dryrun-at-sales-cs.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { atPerson, type DemoPersonnel } from "../lib/feishu-card.ts";
import { copilotDir, loadEnvFiles } from "../lib/env.ts";
import { asArray, asRecord, asText, isAllowedServiceAtom } from "../lib/oms-adapter.ts";
import { createTomClient } from "../lib/oms-tom-client.ts";
import { resolvePersonnelFromDetail } from "../lib/personnel.ts";

const EXCEPTION_CHAT = "oc_6566160ccb2def51937469fe8144efdb";
const ROSTER_PATH = resolve(copilotDir(), "_runs/20260917_exception_group_roster/roster.json");

loadEnvFiles();

const outDir = resolve(copilotDir(), "_runs", "20260917_at_sales_cs_dryrun");
mkdirSync(outDir, { recursive: true });

interface RosterPerson {
  name: string;
  openId: string;
}

interface NameHit {
  query: string;
  matchedName: string;
  openId: string;
  how: string;
  ping: boolean;
}

function norm(name: string): string {
  return name.replace(/\s+/g, "").replace(/[.,]/g, "").toLowerCase();
}

function loadRoster(): RosterPerson[] {
  if (!existsSync(ROSTER_PATH)) throw new Error(`缺少花名册 ${ROSTER_PATH}`);
  const raw = JSON.parse(readFileSync(ROSTER_PATH, "utf8")) as { roster?: Array<{ name?: string; openId?: string }> };
  return (raw.roster || [])
    .map((item) => ({ name: String(item.name || "").trim(), openId: String(item.openId || "").trim() }))
    .filter((item) => item.name && item.openId.startsWith("ou_"));
}

function matchName(query: string, roster: RosterPerson[]): NameHit {
  const q = query.trim();
  if (!q) return { query: "", matchedName: "", openId: "", how: "empty", ping: false };
  const exact = roster.filter((item) => item.name === q);
  if (exact.length === 1) {
    return { query: q, matchedName: exact[0].name, openId: exact[0].openId, how: "exact", ping: true };
  }
  if (exact.length > 1) {
    return { query: q, matchedName: exact.map((item) => item.name).join("/"), openId: "", how: "ambiguous_exact", ping: false };
  }
  const folded = roster.filter((item) => norm(item.name) === norm(q));
  if (folded.length === 1) {
    return { query: q, matchedName: folded[0].name, openId: folded[0].openId, how: "norm", ping: true };
  }
  if (q.length >= 3) {
    const contains = roster.filter((item) => item.name.includes(q) || q.includes(item.name));
    if (contains.length === 1) {
      return { query: q, matchedName: contains[0].name, openId: contains[0].openId, how: "contains", ping: true };
    }
    if (contains.length > 1) {
      return {
        query: q,
        matchedName: contains.map((item) => item.name).join("/"),
        openId: "",
        how: "ambiguous_contains",
        ping: false,
      };
    }
  }
  return { query: q, matchedName: "", openId: "", how: "miss", ping: false };
}

function personFromHit(hit: NameHit, fallbackRole: string): { name: string; openId: string | null } {
  if (hit.ping) return { name: hit.matchedName, openId: hit.openId };
  if (hit.query) return { name: hit.query, openId: null };
  return { name: fallbackRole, openId: null };
}

function atPreview(person: { name: string; openId: string | null }, role: string): string {
  const tag = atPerson(person, role);
  return person.openId ? `${tag} 会响铃（${person.name}）` : `${tag} 只是文字，手机不响`;
}

function headerPeople(header: Record<string, unknown>): {
  sales: string;
  cs: string;
  customerCode: string;
  customerName: string;
} {
  const customer = asRecord(header.customer);
  const sale = asRecord(customer.sale);
  const cs = asRecord(customer.customerService);
  return {
    sales: asText(sale.name) || asText(sale.userName) || asText(header.salesmanName),
    cs: asText(cs.name) || asText(cs.userName) || asText(header.serviceUserName),
    customerCode: asText(customer.customerCode) || asText(header.customerCode),
    customerName: asText(customer.customerName) || asText(header.customerName),
  };
}

function pageRows(list: Record<string, unknown>): Array<Record<string, unknown>> {
  const info = asRecord(list.info);
  return asArray(info.content || info.data || info.rows || list.content).map(asRecord);
}

const roster = loadRoster();
const dwsPath = resolve(outDir, "dws-map.json");
const dwsMap = existsSync(dwsPath)
  ? (JSON.parse(readFileSync(dwsPath, "utf8")) as Record<string, { salesman?: string; cs?: string }>)
  : {};

const client = await createTomClient();
const byOrder = new Map<string, Record<string, unknown>>();
const pageSize = 50;
for (let page = 0; page < 8; page++) {
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { statusDesc: "待审核" },
    draw: "1",
    start: String(page * pageSize),
    length: String(pageSize),
  });
  const fetched = pageRows(asRecord(list));
  for (const row of fetched) {
    const orderNo = asText(row.orderNo);
    if (orderNo && asText(row.statusDesc).includes("待审核")) byOrder.set(orderNo, row);
  }
  console.log(`oms page=${page + 1} got=${fetched.length} pending=${byOrder.size}`);
  if (fetched.length < pageSize) break;
}

const rows = [];
for (const header of byOrder.values()) {
  const people = headerPeople(header);
  const dws = dwsMap[people.customerCode] || {};
  const salesName = people.sales || asText(dws.salesman);
  const csName = people.cs || asText(dws.cs);
  const salesHit = matchName(salesName, roster);
  const csHit = matchName(csName, roster);
  let serviceCodes = "";
  let copilotScope = false;
  try {
    const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
      where: { orderNo: asText(header.orderNo) },
      draw: "1",
      start: "0",
      length: "20",
    });
    const atoms = pageRows(asRecord(vas));
    serviceCodes = atoms
      .map((atom) => asText(atom.serviceCode) || asText(atom.serviceName))
      .filter(Boolean)
      .join(",");
    copilotScope = atoms.some((atom) => isAllowedServiceAtom(atom));
  } catch (err) {
    serviceCodes = `ERROR ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`;
  }
  const expected: DemoPersonnel = {
    ...resolvePersonnelFromDetail({ listHeader: header }),
    销售: personFromHit(salesHit, "销售"),
    客服: personFromHit(csHit, "客服"),
  };
  const current = resolvePersonnelFromDetail({ listHeader: header });
  rows.push({
    orderNo: asText(header.orderNo),
    statusDesc: asText(header.statusDesc),
    customerCode: people.customerCode,
    customerName: people.customerName,
    omsSales: people.sales,
    omsCs: people.cs,
    dwsSales: asText(dws.salesman),
    dwsCs: asText(dws.cs),
    salesHit,
    csHit,
    expectedPingSales: salesHit.ping,
    expectedPingCs: csHit.ping,
    copilotScope,
    serviceCodes,
    currentAt: `${atPreview(current["销售"], "销售")}；${atPreview(current["客服"] || { name: "客服", openId: null }, "客服")}`,
    expectedAt: `${atPreview(expected["销售"], "销售")}；${atPreview(expected["客服"] || { name: "客服", openId: null }, "客服")}`,
    bothPing: salesHit.ping && csHit.ping,
  });
  console.log(
    `${asText(header.orderNo)} ${people.customerCode} sales=${salesName || "-"}/${salesHit.ping ? "响" : "不响"} cs=${csName || "-"}/${csHit.ping ? "响" : "不响"} scope=${copilotScope ? "Y" : "N"}`,
  );
}

const pingBoth = rows.filter((row) => row.bothPing).length;
const pingSales = rows.filter((row) => row.expectedPingSales).length;
const pingCs = rows.filter((row) => row.expectedPingCs).length;
const missSales = rows.filter((row) => (row.dwsSales || row.omsSales) && !row.expectedPingSales).length;
const missCs = rows.filter((row) => (row.dwsCs || row.omsCs) && !row.expectedPingCs).length;
const inScope = rows.filter((row) => row.copilotScope);

writeFileSync(resolve(outDir, "dryrun-rows.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");

const md = [
  "# 待审核单 @销售/客服 本地干跑（未建话题）",
  "",
  `扫描时间：${new Date().toISOString()}`,
  "不发飞书、不写 OMS。",
  "",
  "名单来源：OMS 待审核单的客户编码 → DWS 销售/客服中文名 → 【增值】异常沟通花名册 open_id。",
  "OMS 列表上的 `customer.sale` / `customerService` 是空的，所以不能靠单据表头 @ 人。",
  "",
  "## 总判",
  "",
  `| 项 | 数量 |`,
  `|---|---|`,
  `| 当前待审核 | ${rows.length} |`,
  `| 其中属于 Copilot 会接的服务（入库/库内其他服务需求） | ${inScope.length} |`,
  `| 销售能在群里真 @（手机响） | ${pingSales} |`,
  `| 客服能在群里真 @（手机响） | ${pingCs} |`,
  `| 销售+客服都能真 @ | ${pingBoth} |`,
  `| 查出了销售但群里没这个人 | ${missSales} |`,
  `| 查出了客服但群里没这个人 | ${missCs} |`,
  "",
  "**现在代码还没接这条链路。** 真发到群里仍会 @ 金萤（销售写死），客服是文字 `@客服`，不会响。",
  "下面「按客户匹配」是接上之后的预期。",
  "",
  "追问/补附件卡会 @ 销售+客服；SOP 绿卡主要 @ 审核员（入库耿文文 / 库内何静），不靠客户号换销售客服。",
  "",
  "## 逐单预期",
  "",
  "| 单号 | 客户编码 | 销售 | 群里销售 | 客服 | 群里客服 | Copilot会接? | 现在会 @ | 接上后会 @ |",
  "|---|---|---|---|---|---|---|---|---|",
  ...rows.map((row) => {
    const salesCell = row.salesHit.ping ? `${row.salesHit.matchedName} ✓响` : row.dwsSales || row.omsSales || "空";
    const csCell = row.csHit.ping ? `${row.csHit.matchedName} ✓响` : row.dwsCs || row.omsCs || "空";
    const nowAt = "金萤✓响 / @客服不响";
    const expectAt = `${row.expectedPingSales ? row.salesHit.matchedName + "✓响" : (row.dwsSales || "无销售") + "不响"} / ${row.expectedPingCs ? row.csHit.matchedName + "✓响" : (row.dwsCs || "无客服") + "不响"}`;
    return `| ${row.orderNo} | ${row.customerCode} | ${row.dwsSales || "-"} | ${salesCell} | ${row.dwsCs || "-"} | ${csCell} | ${row.copilotScope ? "是" : "否 " + row.serviceCodes} | ${nowAt} | ${expectAt} |`;
  }),
  "",
  `目标群：【增值】异常沟通 \`${EXCEPTION_CHAT}\`（${roster.length} 人花名册）。`,
  "",
  "漏人：TikTok 两单的销售 **李璐** 不在这个群，接上后也只能写出 `@李璐`，手机不响。客服甘海燕在群里。",
  "",
].join("\n");

writeFileSync(resolve(outDir, "result.md"), md, "utf8");
console.log(`pending=${rows.length} pingSales=${pingSales} pingCs=${pingCs} both=${pingBoth} scope=${inScope.length} wrote ${outDir}`);
