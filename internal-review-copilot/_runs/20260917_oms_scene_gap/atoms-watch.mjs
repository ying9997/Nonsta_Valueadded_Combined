import { readFileSync } from "node:fs";

const CATCH = new Set(["OW01V1602", "OSF6V1603", "OSF6V1841"]);
const WATCH = [
  "货权转移",
  "审计盘点",
  "代采购包材",
  "上架前自提",
  "无主货",
  "提供入库视频",
  "入库少单品",
  "IT改数",
];

function parseCsv(path) {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows = [];
  for (const line of lines.slice(1)) {
    // naive split is enough for these fields (codes/names rarely have commas in first cols)
    const parts = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) {
        parts.push(cur);
        cur = "";
      } else cur += ch;
    }
    parts.push(cur);
    rows.push({
      service: parts[idx.service_code] || "",
      serviceName: parts[idx.service_name] || "",
      code: parts[idx.scene_overview_code] || "",
      name: parts[idx.scene_overview_name] || "",
    });
  }
  return rows;
}

const path = "D:/DA/Nonsta_Valueadded_Combined/_runs/20260909_inbound_scene_probe/_oms_cache/atoms.csv";
const rows = parseCsv(path);
const catchAll = rows.filter((r) => CATCH.has(r.service));
const dedicated = rows.filter((r) => !CATCH.has(r.service));

function countBy(list, pred) {
  const m = new Map();
  for (const r of list) {
    if (!pred(r)) continue;
    const k = `${r.service}\t${r.serviceName}\t${r.code}\t${r.name}`;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

console.log("atoms", rows.length, "catchAll", catchAll.length, "otherAtom", dedicated.length);
console.log("\n=== 关注名 在 catch-all 上 ===");
for (const [k, n] of countBy(catchAll, (r) => WATCH.some((w) => (r.name + r.serviceName).includes(w)))) {
  console.log(n, k);
}
console.log("\n=== 关注名 在独立原子上 ===");
for (const [k, n] of countBy(dedicated, (r) => WATCH.some((w) => (r.name + r.serviceName).includes(w)))) {
  console.log(n, k);
}

console.log("\n=== catch-all 场景概述 Top 25 ===");
const top = new Map();
for (const r of catchAll) {
  const k = r.name || "(空)";
  top.set(k, (top.get(k) || 0) + 1);
}
console.log(
  [...top.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([k, n]) => `${n}\t${k}`)
    .join("\n"),
);
