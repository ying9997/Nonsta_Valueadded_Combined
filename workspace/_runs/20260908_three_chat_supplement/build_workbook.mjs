import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "D:/DA/Nonsta_Valueadded_Combined/workspace/_runs/20260908_three_chat_supplement";
const columns = [
  "序号",
  "群名称",
  "群ID",
  "日期",
  "开始时间",
  "结束时间",
  "讨论ID",
  "发起人",
  "增值产品",
  "增值服务",
  "客户/对象",
  "仓库",
  "关联单号",
  "摘要",
  "对话详情",
  "艾特人员",
  "命中艾特人员",
  "参与人",
  "原始消息ID",
  "飞书链接",
  "关键词",
];

async function readJson(name) {
  return JSON.parse(await fs.readFile(`${outputDir}/${name}`, "utf8"));
}

function rowsToMatrix(rows) {
  return [columns, ...rows.map((row) => columns.map((col) => cleanCell(row[col] ?? "")))];
}

function cleanCell(value) {
  if (typeof value !== "string") {
    return value;
  }
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\uFFFE|\uFFFF/g, "");
}

function writeRows(sheet, rows) {
  const matrix = rowsToMatrix(rows);
  sheet.getRangeByIndexes(0, 0, matrix.length, columns.length).values = matrix;
  const header = sheet.getRangeByIndexes(0, 0, 1, columns.length);
  header.format = {
    fill: "#1F4E78",
    font: { name: "Arial", bold: true, color: "#FFFFFF", size: 10 },
  };
  header.format.horizontalAlignment = "center";
  header.format.verticalAlignment = "center";
  const used = sheet.getRangeByIndexes(0, 0, matrix.length, columns.length);
  used.format.font = { name: "Arial", size: 10 };
  used.format.verticalAlignment = "top";
  used.format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  sheet.freezePanes.freezeRows(1);
  sheet.getRangeByIndexes(1, 0, Math.max(matrix.length - 1, 1), 1).format.numberFormat = "0";
  sheet.getRangeByIndexes(1, 3, Math.max(matrix.length - 1, 1), 1).format.numberFormat = "yyyy-mm-dd";
  for (let i = 0; i < columns.length; i += 1) {
    const width = {
      序号: 8,
      群名称: 28,
      群ID: 34,
      日期: 12,
      开始时间: 18,
      结束时间: 18,
      讨论ID: 26,
      发起人: 16,
      增值产品: 18,
      增值服务: 22,
      "客户/对象": 30,
      仓库: 18,
      关联单号: 45,
      摘要: 60,
      对话详情: 95,
      艾特人员: 36,
      命中艾特人员: 24,
      参与人: 36,
      原始消息ID: 32,
      飞书链接: 50,
      关键词: 38,
    }[columns[i]] ?? 16;
    sheet.getRangeByIndexes(0, i, matrix.length, 1).format.columnWidth = width;
  }
  sheet.getRangeByIndexes(1, 13, Math.max(matrix.length - 1, 1), 2).format.wrapText = true;
  sheet.showGridLines = false;
}

function writeSummary(sheet, summary, extractionSummary) {
  const rows = [
    ["指标", "值"],
    ["时间范围", "2026-04-21 00:00 到 2026-08-01 00:00（Asia/Shanghai）"],
    ["第三群", "发货仓入库&增值运营（救火）- IB&VAS"],
    ["第三群 chatID", "oc_5b8848d27b7b3fa4a10eab865c4f9ffc"],
    ["原两群讨论数", summary.source_two_groups_rows],
    ["第三群原始主话题数", summary.third_group_rows_all],
    ["第三群关键词/单号候选数", extractionSummary.discussion_rows_candidate_keyword_or_order],
    ["第三群按既有艾特白名单保留数", summary.third_group_rows_filtered],
    ["三群合并讨论数", summary.combined_rows_filtered],
    ["第三群含 VASC 讨论数", summary.third_rows_with_vasc],
    ["第三群含 EB 讨论数", summary.third_rows_with_eb],
    ["第三群含图片占位符讨论数", summary.third_rows_with_image_marker],
    ["图片处理", "未下载图片资源；对话详情仅保留消息中的 [Image: ...] 占位符"],
    ["过滤说明", "三群讨论明细=原两群既有结果 + 第三群“关键词或单号命中”且“任一艾特命中白名单”的记录"],
    ["白名单", extractionSummary.whitelist.join("、")],
  ];
  sheet.getRangeByIndexes(0, 0, rows.length, 2).values = rows.map((row) => row.map(cleanCell));
  const title = sheet.getRange("A1:B1");
  title.format = {
    fill: "#1F4E78",
    font: { name: "Arial", bold: true, color: "#FFFFFF", size: 10 },
  };
  const used = sheet.getRangeByIndexes(0, 0, rows.length, 2);
  used.format.font = { name: "Arial", size: 10 };
  used.format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  sheet.getRange("A:A").format.columnWidth = 32;
  sheet.getRange("B:B").format.columnWidth = 90;
  sheet.getRange("B:B").format.wrapText = true;
  sheet.showGridLines = false;
}

const combined = await readJson("three_chat_discussions_combined_filtered.json");
const thirdAll = await readJson("third_chat_discussions_all_numbered.json");
const summary = await readJson("workbook_summary.json");
const extractionSummary = await readJson("third_chat_extraction_summary.json");

await fs.mkdir(outputDir, { recursive: true });
const workbook = Workbook.create();
const summarySheet = workbook.worksheets.add("汇总");
const detailSheet = workbook.worksheets.add("三群讨论明细");
const candidatesSheet = workbook.worksheets.add("第三群候选未过滤");

writeSummary(summarySheet, summary, extractionSummary);
writeRows(detailSheet, combined);
writeRows(candidatesSheet, thirdAll);

workbook.recalculate();

await workbook.inspect({
  kind: "table",
  sheetId: "汇总",
  range: "A1:B15",
  include: "values",
  tableMaxRows: 20,
  tableMaxCols: 3,
});
await workbook.inspect({
  kind: "table",
  sheetId: "三群讨论明细",
  range: "A1:U6",
  include: "values",
  tableMaxRows: 6,
  tableMaxCols: 21,
  tableMaxCellChars: 80,
});
await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});

const preview = await workbook.render({ sheetName: "汇总", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/workbook_summary_preview.png`, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/三群_20260421-20260801_群聊讨论补充_不下载图片.xlsx`);
