/**
 * Build a local reply-closure table for reply_received / reassess_missing_detail samples.
 *
 * Local annotated run:
 *   npx tsx internal-review-copilot/scripts/analyze-reply-closure.ts --out _runs/20261009_reply_closure
 *
 * Optional read-only OMS enrichment scaffold:
 *   npx tsx internal-review-copilot/scripts/analyze-reply-closure.ts --live-oms --out _runs/20261009_reply_closure_live
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { buildAgentInput } from "../lib/oms-adapter.ts";
import { copilotDir, loadEnvFiles } from "../lib/env.ts";
import {
  classifyReplyClosure,
  orderFromOms,
  parseOmsTimeMs,
  traceFromOms,
  type ReplyClosureCaseInput,
  type ReplyClosureEntry,
  type ReplyClosureOrder,
  type ReplyClosureTrace,
} from "../lib/reply-closure.ts";
import { createTomClient, type TomClient } from "../lib/oms-tom-client.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function resolveOutDir(): string {
  const raw = arg("out", "_runs/20261009_reply_closure");
  return isAbsolute(raw) ? raw : resolve(copilotDir(), raw);
}

function fixtureOrder(patch: Partial<ReplyClosureOrder> & { orderNo: string }): ReplyClosureOrder {
  return {
    orderNo: patch.orderNo,
    customerCode: patch.customerCode || "",
    statusDesc: patch.statusDesc || "",
    isAuditThrough: patch.isAuditThrough || "",
    createdAtMs: patch.createdAtMs || 0,
    eventNos: patch.eventNos || [],
    sceneName: patch.sceneName || "",
    sceneKey: patch.sceneKey,
    missingFields: patch.missingFields || [],
  };
}

function fixtureTrace(patch: Partial<ReplyClosureTrace>): ReplyClosureTrace {
  return {
    createdAtMs: patch.createdAtMs || 0,
    eventCode: patch.eventCode || "",
    eventContent: patch.eventContent || "",
    supplementDesc: patch.supplementDesc || "",
  };
}

function annotatedCases(): ReplyClosureCaseInput[] {
  const followUp421590 = fixtureOrder({
    orderNo: "VASC000000421590",
    customerCode: "19993406",
    statusDesc: "待客户确认",
    isAuditThrough: "Y",
    createdAtMs: parseOmsTimeMs("2026-09-30 18:04:28"),
    sceneName: "【库内】商品拆箱加/减配件",
  });
  return [
    {
      original: fixtureOrder({ orderNo: "VASC000000391044", statusDesc: "已取消" }),
      aiSceneName: "",
      aiMissingItems: [],
      enterOptimizationLoop: false,
      goldCaseRole: "excluded",
      note: "用户确认最终取消，不计入 badcase。",
    },
    {
      original: fixtureOrder({ orderNo: "VASC000000403008", statusDesc: "已取消" }),
      aiSceneName: "",
      aiMissingItems: [],
      enterOptimizationLoop: false,
      goldCaseRole: "excluded",
      note: "用户确认最终取消，不计入 badcase。",
    },
    {
      original: fixtureOrder({ orderNo: "VASC000000411852", statusDesc: "待客户确认", isAuditThrough: "Y" }),
      aiSceneName: "【库内】拍摄照片/视频",
      aiMissingItems: ["水印/时间戳要求"],
      humanFinalSceneName: "【库内】指定库位开箱拍照",
      humanMissingItems: [],
      auditorReply: "无时间戳的要求",
      bucketOverride: "rule_nuance",
      enterOptimizationLoop: true,
      goldCaseRole: "regression",
      nextTaskNo: "P0-011",
      nextTaskReason: "作为 requiredInfoFields/requiredAttachments 的时间戳规则 nuance 保护样本；只能收窄规则，不能把时间戳粗暴扩大为所有照片/视频场景必填。",
      note: "场景层级偏差；同时说明该类不能泛化要求时间戳。",
    },
    {
      original: fixtureOrder({
        orderNo: "VASC000000415983",
        customerCode: "19993406",
        statusDesc: "已取消",
        createdAtMs: parseOmsTimeMs("2026-09-30 16:30:00"),
      }),
      aiSceneName: "【库内】商品拆箱加/减配件",
      aiMissingItems: ["处理数量未说明"],
      trace: fixtureTrace({
        createdAtMs: parseOmsTimeMs("2026-09-30 16:59:04"),
        eventCode: "审核不通过",
        eventContent: "需求描述不清晰，请线下与客服沟通",
        supplementDesc: "您好，库内更换SKU需要提供上下架单据，麻烦提供后重新提交，谢谢。",
      }),
      candidateOrders: [followUp421590],
      humanMissingItems: ["上下架单据"],
      bucketOverride: "required_rule_gap",
      enterOptimizationLoop: true,
      goldCaseRole: "regression",
      nextTaskNo: "P0-011",
      nextTaskReason: "场景识别正确，但 AI 问处理数量，人工真实退回要求上下架单据；应修场景卡必填口径。",
      note:
        "原单无异常单，按同客户 + 审核不通过时间之后最近通过单关联到 VASC000000421590；场景对，必填规则错。",
    },
    {
      original: fixtureOrder({ orderNo: "VASC000000416175", statusDesc: "待客户确认", isAuditThrough: "Y" }),
      aiSceneName: "【库内】商品组合",
      aiMissingItems: ["商品组合必填信息"],
      humanFinalSceneName: "【库内】异常重新拍照",
      humanMissingItems: [],
      bucketOverride: "l2_scene_recognition",
      enterOptimizationLoop: true,
      goldCaseRole: "regression",
      nextTaskNo: "P1-001",
      nextTaskReason: "AI 初判 L2 场景与人工终态场景不一致，应进入 L2 场景识别回归集。",
      note: "第一层场景识别错；第二层商品组合必填规则仍需另修。",
    },
    {
      original: fixtureOrder({ orderNo: "VASC000000420921", statusDesc: "待客户确认", isAuditThrough: "Y" }),
      aiSceneName: "【入库】包裹条码批量异常（需客户处理）辨识后补贴包裹标签上架",
      aiMissingItems: ["处理数量或范围未说明"],
      humanFinalSceneName: "【入库】尺重/标签辨识后换标上架",
      humanMissingItems: ["上架入库单号"],
      auditorReply: "客户提供的新的单据可以判断数量",
      bucketOverride: "context_fact_gap",
      enterOptimizationLoop: true,
      goldCaseRole: "regression",
      nextTaskNo: "P0-010",
      nextTaskReason: "AI 不应直接追问处理数量；应通过上架入库单号 WI53076935 映射 11 位 SYSTEM_ORDER_NO=WI530769351 后调用 queryPackageInfos 注入数量 facts。",
      note:
        "规则应先要求/读取上架入库单号；业务展示号 WI53076935 对应系统订单号 WI530769351，再通过 oms.SystemOrderService_queryPackageInfos 补商品数/单品数/包裹数。",
    },
    {
      original: fixtureOrder({ orderNo: "VASC000000420954", statusDesc: "待客户确认", isAuditThrough: "Y" }),
      aiSceneName: "【入库】包裹类异常换商品标签上架",
      aiMissingItems: [],
      humanFinalSceneName: "【入库】尺重/标签辨识后换标上架",
      humanMissingItems: [],
      notActionable: true,
      enterOptimizationLoop: false,
      goldCaseRole: "non_actionable",
      nextTaskReason: "有回复但不是有效修正，不得进入优化闭环。",
      note: "有回复但不是修正规则的有效反馈；报告保留但不作为缺失项优化 badcase。",
    },
  ];
}

function rowsFromInfo(info: unknown): Record<string, unknown>[] {
  if (Array.isArray(info)) return info.map(asRecord);
  const rec = asRecord(info);
  return asArray(rec.content || rec.data || rec.rows).map(asRecord);
}

function extractWiNos(text: string): string[] {
  return [...new Set((text.toUpperCase().match(/WI\d{6,}/g) || []).map((item) => item.trim()))];
}

async function loadOrder(client: TomClient, orderNo: string): Promise<{
  header: Record<string, unknown>;
  atoms: Record<string, unknown>[];
  events: Record<string, unknown>[];
  traces: ReplyClosureTrace[];
  prepayment: Record<string, unknown>[];
}> {
  await client.setOrderReferer(orderNo);
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "5",
  });
  const header = rowsFromInfo(asRecord(list).info).find((item) => asText(item.orderNo) === orderNo) || {};
  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  const atoms = rowsFromInfo(asRecord(vas).info);
  const atom = atoms.find((item) => asText(item.orderNo) === orderNo) || atoms[0] || {};
  const eventsRaw = await client.ajaxProcess("oms.VaOrderService_getEventOrder4VaAtom", {
    where: {
      orderNo,
      serviceCode: asText(atom.serviceCode),
      serviceSequence: asText(atom.serviceSequence) || "1",
    },
    draw: "1",
    start: "0",
    length: "100",
  });
  const events = rowsFromInfo(asRecord(eventsRaw).info);
  const traceRaw = await client.ajaxProcess("oms.VaOrderService_getTraceList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "100",
  });
  const traces = rowsFromInfo(asRecord(traceRaw).info).map(traceFromOms);
  const prepaymentRaw = await client.ajaxProcess("oms.VaOrderService_getPrepaymentList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "100",
  });
  const prepayment = rowsFromInfo(asRecord(prepaymentRaw).info);
  return { header, atoms, events, traces, prepayment };
}

async function queryPackageInfos(client: TomClient, systemOrderNo: string): Promise<Record<string, unknown>> {
  const res = await client.ajaxProcess("oms.SystemOrderService_queryPackageInfos", {
    where: { systemOrderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  const info = asRecord(res).info;
  return {
    systemOrderNo,
    rows: rowsFromInfo(info),
    info,
  };
}

async function liveEnrichment(entries: ReplyClosureEntry[], outDir: string): Promise<void> {
  loadEnvFiles();
  const client = await createTomClient();
  const live: Record<string, unknown>[] = [];
  for (const entry of entries) {
    const data = await loadOrder(client, entry.vascNo);
    const order = orderFromOms(data.header, data.atoms, data.events);
    const atom = data.atoms[0] || {};
    const detail = { orderNo: entry.vascNo, listHeader: data.header, atoms: data.atoms, events: data.events };
    const built = buildAgentInput(detail);
    const linked = entry.linkedOrderNo ? await loadOrder(client, entry.linkedOrderNo) : null;
    const linkedAtom = linked?.atoms[0] || {};
    const wiNos = extractWiNos(
      [
        entry.evidence.note,
        JSON.stringify(data.header),
        JSON.stringify(data.atoms),
        JSON.stringify(data.prepayment),
        linked ? JSON.stringify(linked.header) : "",
        linked ? JSON.stringify(linked.atoms) : "",
        linked ? JSON.stringify(linked.prepayment) : "",
      ].join("\n"),
    );
    const packageInfoResults: Record<string, unknown>[] = [];
    for (const wi of wiNos.slice(0, 5)) {
      try {
        packageInfoResults.push(await queryPackageInfos(client, wi));
      } catch (err) {
        packageInfoResults.push({
          systemOrderNo: wi,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    live.push({
      orderNo: entry.vascNo,
      order,
      trace: data.traces,
      prepaymentCount: data.prepayment.length,
      prepaymentSopSnippets: data.prepayment.map((item) => asText(item.sop)).filter(Boolean).slice(0, 3),
      sceneOverviewName: asText(atom.sceneOverviewName),
      serviceCode: asText(atom.serviceCode),
      buildAgentInput: Boolean(built),
      knownFactLines: built?.input.omsFacts.knownFactLines || [],
      linkedOrderNo: entry.linkedOrderNo || "",
      linked: linked
        ? {
            order: orderFromOms(linked.header, linked.atoms, linked.events),
            sceneOverviewName: asText(linkedAtom.sceneOverviewName),
            serviceCode: asText(linkedAtom.serviceCode),
            prepaymentSopSnippets: linked.prepayment.map((item) => asText(item.sop)).filter(Boolean).slice(0, 3),
          }
        : null,
      queryPackageInfos: packageInfoResults,
    });
  }
  writeFileSync(resolve(outDir, "live-oms-readonly.json"), `${JSON.stringify(live, null, 2)}\n`, "utf8");
}

function renderReport(entries: ReplyClosureEntry[]): string {
  const count = (bucket: string) => entries.filter((entry) => entry.bucket === bucket).length;
  const goldCases = entries.filter((entry) => entry.goldCaseRole === "regression");
  const excludedCases = entries.filter((entry) => entry.goldCaseRole === "excluded");
  const optimizingCases = entries.filter((entry) => entry.enterOptimizationLoop);
  const lines = [
    "# P0-014 reply 后 badcase 闭环优化体系报告",
    "",
    `生成时间：${new Date().toISOString()}`,
    "",
    "## 结论",
    "",
    `- 7 个样本中，取消排除 ${count("excluded_cancelled")} 单，facts/context 缺口 ${count("context_fact_gap")} 单，必填规则 gap ${count("required_rule_gap")} 单，L2 场景识别 ${count("l2_scene_recognition")} 单，规则 nuance ${count("rule_nuance")} 单，非优化闭环 ${count("not_actionable")} 单。`,
    `- 进入优化闭环 ${optimizingCases.length} 单：${optimizingCases.map((entry) => entry.vascNo).join("、")}；排除/非优化样本 ${entries.length - optimizingCases.length} 单。`,
    "- `reassess_missing_detail` 的业务断点不是 SOP 生成能力，而是原单已取消/已流转后，重评仍依赖待审核详情列表；需要把 reply 后重跑结果和 OMS 终态事实单独留存为闭环表。",
    "- `VASC000000415983` 是最关键样本：AI 场景与后续通过单一致，但 AI 问“处理数量”，人工真实退回要求是“上下架单据”。",
    "- `VASC000000420921` 说明数量事实应由上架入库单号继续查 `oms.SystemOrderService_queryPackageInfos`；接口入参必须用 11 位 `SYSTEM_ORDER_NO=WI530769351`，不能用 10 位 `WINIT_ORDER_NO=WI53076935`。",
    "- `VASC000000411852` 是时间戳/水印规则 nuance：可以作为规则回归保护，不能把时间戳粗暴扩大成所有照片/视频场景必填。",
    "",
    "## 为什么只验证一个接口不够",
    "",
    "`queryPackageInfos` 只能证明 `420921` 这一类 facts/context 缺口有子修复入口；它不能覆盖 `415983` 的场景卡必填口径、`416175` 的 L2 场景识别、`411852` 的规则 nuance，也不能证明 `420954` 这种无效回复应被排除。真正闭环必须先在 `reply_received` 后落独立表，保留 AI 初判、人工回复、审核轨迹、终态场景和关联新单，再按桶转给不同原子任务。",
    "",
    "## 闭环表字段",
    "",
    "| 字段 | 说明 |",
    "| --- | --- |",
    "| `vascNo` | 原始增值单号 |",
    "| `aiSceneName` / `aiMissingItems` | AI 初判场景与缺失项 |",
    "| `evidence.auditorReply` / `evidence.traceSupplementDesc` | 人工回复与审核轨迹退回说明 |",
    "| `humanSceneName` / `humanMissingItems` | 人工终态场景与人工侧缺失项 |",
    "| `linkedOrderNo` / `linkStrategy` | 关联新单与关联策略 |",
    "| `bucket` | 差异桶：facts/context、必填规则、L2 场景识别、规则 nuance、多轮上下文、排除等 |",
    "| `enterOptimizationLoop` | 是否进入优化闭环 |",
    "| `goldCaseRole` | 固定回归/排除/非优化角色 |",
    "| `nextTaskNo` / `nextTaskReason` | 后续原子修复任务编号与转出理由 |",
    "",
    "## reply 后闭环表",
    "",
    "| VASC | 桶 | 入优化闭环 | gold 角色 | 后续任务 | 关联策略 | 关联通过单 | AI 场景 | 人工终态场景 | AI-only 缺失 | 人工-only 缺失 | 备注 |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const entry of entries) {
    lines.push(
      `|${[
        entry.vascNo,
        entry.bucket,
        entry.enterOptimizationLoop ? "Y" : "N",
        entry.goldCaseRole,
        entry.nextTaskNo || "-",
        entry.linkStrategy,
        entry.linkedOrderNo || "-",
        entry.aiSceneName || "-",
        entry.humanSceneName || "-",
        entry.missingItemDiff.aiOnly.join("；") || "-",
        entry.missingItemDiff.humanOnly.join("；") || "-",
        entry.evidence.note || "-",
      ].map((cell) => ` ${String(cell).replaceAll("\n", " ")} `).join("|")}|`,
    );
  }
  lines.push(
    "",
    "## A/B 效果验收矩阵",
    "",
    "这张表不是闭环归因表，而是修复效果表的验收口径。A 是当前坏例表现；B 是对应原子修复落地后必须观察到的效果。`P0-014` 只建立矩阵和 gold set，不在本会话直接把所有 B 修掉；每个原子修复会话必须用同一组 gold cases 回填 B 结果。",
    "",
    "| VASC | A：当前坏例表现 | 对应修复 | B：修复后应观察到的效果 | B 通过判定 |",
    "| --- | --- | --- | --- | --- |",
    "| VASC000000391044 | 原单取消；不应当作为优化样本 | 排除保护 | 仍保持 `excluded_cancelled`，不进入优化闭环 | 回归集确认 `enterOptimizationLoop=false` |",
    "| VASC000000403008 | 原单取消；不应当作为优化样本 | 排除保护 | 仍保持 `excluded_cancelled`，不进入优化闭环 | 回归集确认 `enterOptimizationLoop=false` |",
    "| VASC000000415983 | AI 问“处理数量”，但人工真实退回要求“上下架单据”；场景本身正确 | P0-011 | 不再把“处理数量”作为主要追问；该场景应按上下架单据口径判断 | P0-011 回归中该单映射到 `required_rule_gap`，卡片/完整性结果体现上下架单据要求 |",
    "| VASC000000420921 | AI 问“处理数量或范围”，但审核员指出新单据可判断数量 | P0-010 | 通过 `SYSTEM_ORDER_NO=WI530769351` 注入包裹数/单品数/商品数 facts，不再追问处理数量/范围 | P0-010 回归中 `knownFactLines` 含 `增值包裹数量：241`、`增值单品数量：241`、`增值商品数量：11`，L2.5 不再判数量缺失 |",
    "| VASC000000416175 | AI 初判 `【库内】商品组合`，人工终态为 `【库内】异常重新拍照` | P1-001 | L2 场景识别命中异常重新拍照，不再进入商品组合必填项链路 | P1-001 回归中 `sceneKey=instock_exception_rephoto` 或等价场景，且不再以商品组合字段追问 |",
    "| VASC000000411852 | AI 追问“水印/时间戳要求”，审核员回复“无时间戳的要求” | P0-011 nuance | 该类样本不应被统一要求水印/时间戳；只能收窄适用条件 | P0-011 nuance 回归确认 `水印/时间戳要求` 不被粗暴设为所有照片/视频场景必填 |",
    "| VASC000000420954 | 有回复但不是有效修正 | 排除保护 | 仍保持 `not_actionable`，不进入优化闭环，不转原子修复任务 | 回归集确认 `enterOptimizationLoop=false` 且 `nextTaskNo` 为空 |",
    "",
    "## 固定 gold cases 回归集",
    "",
    `- 排除样本：${excludedCases.map((entry) => entry.vascNo).join("、")}。判定标准：保留在报告和测试中，但不进入优化闭环。`,
    `- 回归样本：${goldCases.map((entry) => `${entry.vascNo} -> ${entry.bucket} -> ${entry.nextTaskNo}`).join("；")}。后续 workflow 改动必须跑，防止“修一个坏两个”。`,
    "- 非优化闭环样本：`VASC000000420954`。有回复但不是有效修正，不进入优化闭环。",
    "",
    "## 后续原子修复任务映射",
    "",
    "| VASC | 转出任务 | 原因 |",
    "| --- | --- | --- |",
  );
  for (const entry of entries) {
    lines.push(`| ${entry.vascNo} | ${entry.nextTaskNo || "排除/不转出"} | ${entry.nextTaskReason || entry.evidence.note || "-"} |`);
  }
  lines.push(
    "",
    "## 后续实现建议",
    "",
    "1. `reply_received` 重跑不要只依赖当前待审核拉单结果；原单已取消/待客户确认时仍应用 `getTraceList/getVasList/getPrepaymentList` 读事实，并把重跑输出落入独立闭环表。",
    "2. 闭环表字段至少保留：原 VASC、reply 文本、AI 场景/缺失项、审核轨迹退回说明、关联终态单、人工终态场景、SOP/单据事实、修复桶、是否入优化闭环、后续任务编号。",
    "3. 关联顺序：有异常单先按异常单找后续增值单；无异常单则按同客户 + 审核轨迹时间之后最近通过增值单。",
    "4. 原子任务保持分离：420921 -> P0-010；415983 -> P0-011；416175 -> P1-001；411852 -> P0-011 的时间戳规则 nuance 保护；420954 排除。",
    "",
    "## 边界",
    "",
    "- 本报告只做本机闭环分析，不部署 40，不写 OMS/TOM。",
    "- 当前默认使用人工标注事实生成；`--live-oms` 可额外输出只读 OMS 事实文件，用于人工复核接口返回。",
  );
  return `${lines.join("\n")}\n`;
}

function renderAbValidationReport(): string {
  const lines = [
    "# A/B 修复效果验收矩阵",
    "",
    "A/B 口径：A 是 `P0-014` 闭环表记录的当前坏例表现；B 是原子修复完成后必须用同一批 gold cases 重新跑出的效果。`P0-014` 本身不把所有问题一次性修完，所以这里先固化验收矩阵，后续 `P0-010`、`P0-011`、`P1-001` 分别回填实际 B 结果。",
    "",
    "| VASC | A：当前坏例表现 | 修复任务 | B：修复后有效的标准 | 状态 |",
    "| --- | --- | --- | --- | --- |",
    "| VASC000000391044 | 取消单，不应作为优化 badcase | 排除保护 | 保持排除，不进优化闭环 | P0-014 已覆盖 |",
    "| VASC000000403008 | 取消单，不应作为优化 badcase | 排除保护 | 保持排除，不进优化闭环 | P0-014 已覆盖 |",
    "| VASC000000415983 | AI 问处理数量；人工要求上下架单据 | P0-011 | 不再问处理数量；按上下架单据口径判断 | 待 P0-011 回填 B 结果 |",
    "| VASC000000420921 | AI 问处理数量/范围；新单据可判断数量 | P0-010 | 数量 facts 注入后不再判数量缺失 | 待 P0-010 回填 B 结果 |",
    "| VASC000000416175 | L2 场景从商品组合误判到异常重新拍照 | P1-001 | 命中异常重新拍照，不进入商品组合必填链路 | 待 P1-001 回填 B 结果 |",
    "| VASC000000411852 | AI 追问时间戳；审核员说无时间戳要求 | P0-011 nuance | 时间戳不被粗暴扩大为所有照片/视频场景必填 | 待 P0-011 nuance 回填 B 结果 |",
    "| VASC000000420954 | 有回复但不是有效修正 | 排除保护 | 保持 `not_actionable`，不转修复任务 | P0-014 已覆盖 |",
    "",
    "## 回填要求",
    "",
    "- 每个原子修复会话都要重新跑相关 gold case，并把 B 结果写回对应任务记录。",
    "- B 结果不能只看接口是否可通，还要看最终 L2/L2.5 判断或场景识别是否改变到预期。",
    "- 如果一个 B 修复导致其他 gold case 退化，应视为回归失败。",
  ];
  return `${lines.join("\n")}\n`;
}

function renderBucketReport(entries: ReplyClosureEntry[]): string {
  const byBucket = new Map<string, ReplyClosureEntry[]>();
  for (const entry of entries) {
    const rows = byBucket.get(entry.bucket) || [];
    rows.push(entry);
    byBucket.set(entry.bucket, rows);
  }
  const lines = ["# badcase 分桶报告", "", "| 桶 | 样本 | 后续动作 |", "| --- | --- | --- |"];
  for (const [bucket, rows] of byBucket) {
    lines.push(
      `| ${bucket} | ${rows.map((entry) => entry.vascNo).join("、")} | ${rows
        .map((entry) => `${entry.vascNo}:${entry.nextTaskNo || "排除/不转出"}`)
        .join("；")} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function goldCases(entries: ReplyClosureEntry[]): Record<string, unknown> {
  return {
    excluded: entries
      .filter((entry) => entry.goldCaseRole === "excluded")
      .map((entry) => ({ vascNo: entry.vascNo, bucket: entry.bucket, enterOptimizationLoop: entry.enterOptimizationLoop })),
    regression: entries
      .filter((entry) => entry.goldCaseRole === "regression")
      .map((entry) => ({
        vascNo: entry.vascNo,
        bucket: entry.bucket,
        nextTaskNo: entry.nextTaskNo,
        guard: entry.nextTaskReason,
      })),
    nonActionable: entries
      .filter((entry) => entry.goldCaseRole === "non_actionable")
      .map((entry) => ({ vascNo: entry.vascNo, bucket: entry.bucket, enterOptimizationLoop: entry.enterOptimizationLoop })),
  };
}

async function main(): Promise<void> {
  const outDir = resolveOutDir();
  mkdirSync(outDir, { recursive: true });
  const entries = annotatedCases().map(classifyReplyClosure);
  writeFileSync(resolve(outDir, "reply-closure-table.json"), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  writeFileSync(resolve(outDir, "reply-closure-log.jsonl"), `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");
  writeFileSync(resolve(outDir, "reply-closure-report.md"), renderReport(entries), "utf8");
  writeFileSync(resolve(outDir, "badcase-bucket-report.md"), renderBucketReport(entries), "utf8");
  writeFileSync(resolve(outDir, "gold-cases-regression.json"), `${JSON.stringify(goldCases(entries), null, 2)}\n`, "utf8");
  writeFileSync(resolve(outDir, "ab-effect-validation.md"), renderAbValidationReport(), "utf8");
  if (hasFlag("live-oms")) await liveEnrichment(entries, outDir);
  console.log(
    JSON.stringify(
      {
        outDir,
        entries: entries.length,
        buckets: Object.fromEntries(
          [...new Set(entries.map((entry) => entry.bucket))].map((bucket) => [
            bucket,
            entries.filter((entry) => entry.bucket === bucket).length,
          ]),
        ),
        liveOms: hasFlag("live-oms"),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
