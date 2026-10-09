/**
 * 质量看板计算。只处理对照记录，不读运行日志。
 * 分档：绿=场景对且步骤原样/只改措辞；黄=场景对但加了或删了步骤；红=场景错或整段重写；灰=还没审完。
 */
(function (root) {
  var EDIT_LABEL = {
    none: "原样通过",
    wording: "改了措辞",
    deleted_step: "删了步骤",
    added_step: "加了步骤",
    rewritten: "整段重写",
  };

  function shanghaiDate(iso) {
    var time = Date.parse(iso || "");
    if (!Number.isFinite(time)) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(time));
  }

  function addDays(ymd, delta) {
    var parts = String(ymd || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some(function (n) { return !Number.isFinite(n); })) return "";
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    dt.setUTCDate(dt.getUTCDate() + delta);
    return dt.toISOString().slice(0, 10);
  }

  function categoryOf(row) {
    var name = (row.ai && row.ai.sceneName) || "";
    var key = (row.ai && row.ai.sceneKey) || "";
    if (name.indexOf("入库") >= 0 || key.indexOf("inbound") === 0) return "inbound";
    if (name.indexOf("库内") >= 0 || key.indexOf("instock") === 0) return "instock";
    if (name.indexOf("出库") >= 0 || key.indexOf("outbound") === 0) return "outbound";
    return "other";
  }

  function isReviewed(row) {
    return Boolean(row && row.human && row.diff && row.diff.sopEditType);
  }

  function bandOf(row) {
    if (!isReviewed(row)) return "gray";
    var diff = row.diff;
    if (!diff.sceneMatch || diff.sopEditType === "rewritten") return "red";
    if (diff.sopEditType === "deleted_step" || diff.sopEditType === "added_step") return "yellow";
    return "green";
  }

  function inRange(row, range, today) {
    if (range === "all") return true;
    var day = shanghaiDate(row.aiWriteTime);
    if (!day || !today) return false;
    var back = range === "30d" ? 29 : 6;
    return day >= addDays(today, -back) && day <= today;
  }

  function applyFilters(rows, filters, today) {
    return (rows || []).filter(function (row) {
      if (!inRange(row, filters.range, today)) return false;
      if (filters.category !== "all" && categoryOf(row) !== filters.category) return false;
      if (filters.review === "done" && !isReviewed(row)) return false;
      if (filters.review === "pending" && isReviewed(row)) return false;
      return true;
    });
  }

  function pct(part, total) {
    if (!total) return null;
    return Math.round((part / total) * 100);
  }

  function summarize(rows) {
    var reviewedRows = rows.filter(isReviewed);
    var reviewed = reviewedRows.length;
    var match = 0;
    var none = 0;
    var wording = 0;
    var deletedStep = 0;
    var addedStep = 0;
    var rewritten = 0;
    var requirementEdited = 0;
    var wiEdited = 0;
    reviewedRows.forEach(function (row) {
      var diff = row.diff;
      if (diff.sceneMatch) match += 1;
      if (diff.sopEditType === "none") none += 1;
      if (diff.sopEditType === "wording") wording += 1;
      if (diff.sopEditType === "deleted_step") deletedStep += 1;
      if (diff.sopEditType === "added_step") addedStep += 1;
      if (diff.sopEditType === "rewritten") rewritten += 1;
      if (diff.requirementEdited) requirementEdited += 1;
      if (diff.wiNumbersEdited) wiEdited += 1;
    });
    return {
      written: rows.length,
      reviewed: reviewed,
      pending: rows.length - reviewed,
      match: match,
      matchRate: pct(match, reviewed),
      none: none,
      noneRate: pct(none, reviewed),
      wording: wording,
      deletedStep: deletedStep,
      addedStep: addedStep,
      rewritten: rewritten,
      requirementEdited: requirementEdited,
      requirementRate: pct(requirementEdited, reviewed),
      wiEdited: wiEdited,
      wiRate: pct(wiEdited, reviewed),
    };
  }

  function rangeLabel(range) {
    if (range === "30d") return "近 30 天";
    if (range === "all") return "全部时间";
    return "近 7 天";
  }

  function categoryLabel(category) {
    if (category === "inbound") return "入库";
    if (category === "instock") return "库内";
    if (category === "outbound") return "出库";
    return "";
  }

  function conclusion(filters, stats) {
    var prefix = rangeLabel(filters.range);
    var cat = categoryLabel(filters.category);
    if (cat) prefix += "（" + cat + "）";
    if (!stats.reviewed) {
      return prefix + "没有已审完的单（已写入 " + stats.written + " 单），还不能算质量。";
    }
    return prefix + "已审完 " + stats.reviewed + " 单：场景认对 " + stats.matchRate + "%，步骤原样通过 " + stats.noneRate + "%，整段重写 " + stats.rewritten + " 单。";
  }

  function trend(rows) {
    var map = {};
    rows.forEach(function (row) {
      var day = shanghaiDate(row.aiWriteTime) || "未知日期";
      if (!map[day]) map[day] = { day: day, written: 0, reviewed: 0, match: 0 };
      map[day].written += 1;
      if (!isReviewed(row)) return;
      map[day].reviewed += 1;
      if (row.diff.sceneMatch) map[day].match += 1;
    });
    return Object.keys(map).sort().map(function (day) {
      var item = map[day];
      item.matchRate = pct(item.match, item.reviewed);
      return item;
    });
  }

  function sceneTable(rows, sort) {
    var map = {};
    rows.filter(isReviewed).forEach(function (row) {
      var key = (row.ai && (row.ai.sceneKey || row.ai.sceneName)) || "unknown";
      if (!map[key]) {
        map[key] = {
          key: key,
          name: (row.ai && row.ai.sceneName) || key,
          reviewed: 0,
          match: 0,
          none: 0,
          wording: 0,
          deletedStep: 0,
          addedStep: 0,
          rewritten: 0,
        };
      }
      var item = map[key];
      var diff = row.diff;
      item.reviewed += 1;
      if (diff.sceneMatch) item.match += 1;
      if (diff.sopEditType === "none") item.none += 1;
      if (diff.sopEditType === "wording") item.wording += 1;
      if (diff.sopEditType === "deleted_step") item.deletedStep += 1;
      if (diff.sopEditType === "added_step") item.addedStep += 1;
      if (diff.sopEditType === "rewritten") item.rewritten += 1;
    });
    var all = Object.keys(map).map(function (key) {
      var item = map[key];
      item.matchRate = pct(item.match, item.reviewed);
      item.few = item.reviewed < 3;
      return item;
    });
    var ranked = all.filter(function (item) { return !item.few; });
    var few = all.filter(function (item) { return item.few; });
    ranked.sort(function (a, b) {
      if (sort === "rewrittenDesc") {
        return b.rewritten - a.rewritten || a.matchRate - b.matchRate || a.name.localeCompare(b.name, "zh");
      }
      return a.matchRate - b.matchRate || b.rewritten - a.rewritten || a.name.localeCompare(b.name, "zh");
    });
    few.sort(function (a, b) { return a.name.localeCompare(b.name, "zh"); });
    return ranked.concat(few);
  }

  function matchesFocus(row, focus) {
    if (focus.kpi === "reviewed" && !isReviewed(row)) return false;
    if (focus.kpi === "match" && !(isReviewed(row) && row.diff.sceneMatch)) return false;
    if (focus.kpi === "rewritten" && !(isReviewed(row) && row.diff.sopEditType === "rewritten")) return false;
    if (focus.sceneKey) {
      var key = (row.ai && (row.ai.sceneKey || row.ai.sceneName)) || "";
      if (key !== focus.sceneKey) return false;
    }
    return true;
  }

  function listRank(row) {
    if (isReviewed(row) && row.diff.sopEditType === "rewritten") return 0;
    if (isReviewed(row) && !row.diff.sceneMatch) return 1;
    if ((row.ai && row.ai.confidence) === "low") return 2;
    if (!isReviewed(row)) return 3;
    return 4;
  }

  function problemList(rows, focus) {
    return rows.filter(function (row) { return matchesFocus(row, focus); }).sort(function (a, b) {
      var rank = listRank(a) - listRank(b);
      if (rank) return rank;
      return String(b.aiWriteTime || "").localeCompare(String(a.aiWriteTime || ""));
    });
  }

  function shortName(name) {
    return String(name || "").replace(/^【[^】]+】/, "");
  }

  function diffSummary(row) {
    if (!isReviewed(row)) return "还没审完，不能评质量";
    var diff = row.diff;
    var scene = diff.sceneMatch ? "场景一致" : "场景认错";
    var edit = EDIT_LABEL[diff.sopEditType] || diff.sopEditType;
    var extra = [];
    if (diff.requirementEdited) extra.push("需求有改");
    if (diff.wiNumbersEdited) extra.push("WI 有改");
    return scene + " · " + edit + (extra.length ? " · " + extra.join("、") : "");
  }

  root.QualityLogic = {
    EDIT_LABEL: EDIT_LABEL,
    shanghaiDate: shanghaiDate,
    addDays: addDays,
    categoryOf: categoryOf,
    isReviewed: isReviewed,
    bandOf: bandOf,
    applyFilters: applyFilters,
    summarize: summarize,
    conclusion: conclusion,
    trend: trend,
    sceneTable: sceneTable,
    problemList: problemList,
    shortName: shortName,
    diffSummary: diffSummary,
    categoryLabel: categoryLabel,
    rangeLabel: rangeLabel,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
