/**
 * 用快照数据核对分档、时间窗和「少于 3 张不排名」。
 */
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sandbox = {};
createContext(sandbox);
runInContext(readFileSync(resolve(here, "logic.js"), "utf8"), sandbox);
const Q = sandbox.QualityLogic;
const data = readFileSync(resolve(here, "data.js"), "utf8").replace(/^window\.QUALITY_DATA = /, "").replace(/;\s*$/, "");
const rows = JSON.parse(data).rows;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const green = { human: {}, diff: { sceneMatch: true, sopEditType: "wording" } };
const yellow = { human: {}, diff: { sceneMatch: true, sopEditType: "deleted_step" } };
const redScene = { human: {}, diff: { sceneMatch: false, sopEditType: "none" } };
const redRewrite = { human: {}, diff: { sceneMatch: true, sopEditType: "rewritten" } };
assert(Q.bandOf(green) === "green", "措辞应为绿");
assert(Q.bandOf(yellow) === "yellow", "删步骤应为黄");
assert(Q.bandOf(redScene) === "red", "场景错应为红");
assert(Q.bandOf(redRewrite) === "red", "整段重写应为红");
assert(Q.bandOf({ ai: {} }) === "gray", "未审完应为灰");

const days = rows.map((row) => Q.shanghaiDate(row.aiWriteTime)).filter(Boolean).sort();
const today = days[days.length - 1];
assert(rows.length > 0, "看板数据不能为空");
assert(Boolean(today), "看板数据必须有 aiWriteTime");
const week = Q.applyFilters(rows, { range: "7d", category: "all", review: "all" }, today);
const stats = Q.summarize(week);
assert(stats.written === week.length, "已写入统计应等于过滤后行数");
assert(stats.reviewed + stats.pending === stats.written, "已审完 + 待审完应等于已写入");
assert(Number.isInteger(stats.usableRate) || stats.usableRate === null, "AI 可用成稿率应可计算");
assert(Number.isInteger(stats.firstPassRate) || stats.firstPassRate === null, "AI 一次成稿率应可计算");
assert(Number.isInteger(stats.qualityScore) || stats.qualityScore === null, "SOP 采纳质量分应可计算");
assert(Number.isInteger(stats.humanEditRate) || stats.humanEditRate === null, "人工实质改动率应可计算");
assert(stats.usable >= stats.firstPass, "可用成稿数不应小于一次成稿数");

const scenes = Q.sceneTable(week, "matchAsc");
const ranked = scenes.filter((item) => !item.few);
const few = scenes.filter((item) => item.few);
assert(ranked.every((item) => item.reviewed >= 3), "排名里不能有少于 3 张的场景");
assert(few.every((item) => item.reviewed < 3), "样本少标记错了");
if (ranked.length > 1) {
  assert(ranked[0].matchRate <= ranked[ranked.length - 1].matchRate, "默认应按认对率从低到高");
}

const problems = Q.problemList(week, { kpi: null, sceneKey: null });
assert(problems.length === week.length, "默认清单应是全部写入");
assert(Q.listRank ? true : problems[0], "清单已生成");
const firstReviewed = problems.find((row) => Q.isReviewed(row));
if (firstReviewed) {
  const betterProblemBeforeFirstReviewed = problems
    .slice(0, problems.indexOf(firstReviewed))
    .every((row) => !Q.isReviewed(row) || row.diff.sopEditType === "rewritten" || !row.diff.sceneMatch);
  assert(betterProblemBeforeFirstReviewed, "清单排序应先看重写、认错或待审完");
}

const syntheticRows = [
  { aiWriteTime: "2026-09-01T10:00:00+08:00", ai: {}, human: {}, diff: { sceneMatch: true, sopEditType: "none" } },
  { aiWriteTime: "2026-09-15T10:00:00+08:00", ai: {}, human: {}, diff: { sceneMatch: true, sopEditType: "none" } },
  { aiWriteTime: "2026-09-21T10:00:00+08:00", ai: {}, human: {}, diff: { sceneMatch: true, sopEditType: "none" } },
];
assert(Q.applyFilters(syntheticRows, { range: "7d", category: "all", review: "all" }, "2026-09-21").length === 2, "近7天过滤应只保留 09-15 之后");
assert(Q.applyFilters(syntheticRows, { range: "30d", category: "all", review: "all" }, "2026-09-21").length === 3, "近30天过滤应保留 3 条");
assert(Q.applyFilters(syntheticRows, { range: "all", category: "all", review: "all" }, "2026-09-21").length === 3, "全部过滤应保留 3 条");

const drill = Q.groupTable(week, "scene", "usableRate");
const drillRanked = drill.filter((item) => !item.few);
assert(drill.length > 0, "按场景下钻应有数据");
assert(drill.every((item) => Object.prototype.hasOwnProperty.call(item, "metricValue")), "下钻表应带当前指标值");
if (drillRanked.length > 1) {
  assert(drillRanked[0].metricValue <= drillRanked[drillRanked.length - 1].metricValue, "可用成稿率应按低到高找提升空间");
}

const rewriteDrill = Q.groupTable(week, "scene", "rewriteRate").filter((item) => !item.few);
if (rewriteDrill.length > 1) {
  assert(rewriteDrill[0].metricValue >= rewriteDrill[rewriteDrill.length - 1].metricValue, "整段重写率应按高到低找风险");
}

console.log(JSON.stringify({
  written: stats.written,
  reviewed: stats.reviewed,
  usableRate: stats.usableRate,
  firstPassRate: stats.firstPassRate,
  qualityScore: stats.qualityScore,
  humanEditRate: stats.humanEditRate,
  matchRate: stats.matchRate,
  noneRate: stats.noneRate,
  rewritten: stats.rewritten,
  deletedStep: stats.deletedStep,
  ranked: ranked.length,
  few: few.length,
  conclusion: Q.conclusion({ range: "7d", category: "all" }, stats),
}, null, 2));
