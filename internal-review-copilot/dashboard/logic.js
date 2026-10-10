/**
 * 质量看板计算。只处理对照记录，不读运行日志。
 * 分档：绿=场景对且步骤原样/只改措辞；黄=场景对但加了或删了步骤；红=场景错或整段重写；灰=还没审完。
 * 当前北极星用“AI 首稿到审核通过稿的距离”近似；真正业务闭环率和 AI 独立完成率需要业务终态事件链。
 */
(function (root) {
  var EDIT_LABEL = {
    none: "原样通过",
    wording: "改了措辞",
    deleted_step: "删了步骤",
    added_step: "加了步骤",
    rewritten: "整段重写",
  };

  var METRICS = {
    usableRate: {
      label: "AI 可用成稿率",
      shortLabel: "可用成稿",
      help: "场景一致，SOP 原样或只改措辞，且 WI 等关键单号未被人工改动。",
      unit: "%",
      good: "high",
      kind: "rate",
    },
    firstPassRate: {
      label: "AI 一次成稿率",
      shortLabel: "一次成稿",
      help: "场景一致，SOP 原样通过，且 WI 等关键单号未被人工改动。",
      unit: "%",
      good: "high",
      kind: "rate",
    },
    qualityScore: {
      label: "SOP 采纳质量分",
      shortLabel: "质量分",
      help: "按场景、步骤、需求、WI 差异折算的 0-100 分，用来衡量 AI 初稿离最终稿有多远。",
      unit: "分",
      good: "high",
      kind: "score",
    },
    humanEditRate: {
      label: "人工实质改动率",
      shortLabel: "实质改动",
      help: "场景、SOP 或关键单号被人工实质改动的比例；越低越好。",
      unit: "%",
      good: "low",
      kind: "rate",
    },
    sceneMatchRate: {
      label: "场景认对率",
      shortLabel: "场景认对",
      help: "AI 场景编码与人工最终场景编码一致的比例，是二级归因指标。",
      unit: "%",
      good: "high",
      kind: "rate",
    },
    sopOriginalRate: {
      label: "SOP 原样率",
      shortLabel: "SOP 原样",
      help: "人工没有修改 SOP 步骤文本的比例。",
      unit: "%",
      good: "high",
      kind: "rate",
    },
    rewriteRate: {
      label: "整段重写率",
      shortLabel: "整段重写",
      help: "SOP 被人工整段重写的比例；越低越好。",
      unit: "%",
      good: "low",
      kind: "rate",
    },
    wiStableRate: {
      label: "关键单号稳定率",
      shortLabel: "单号稳定",
      help: "WI 等关键单号未被人工修改的比例。",
      unit: "%",
      good: "high",
      kind: "rate",
    },
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

  function isFirstPass(row) {
    return isReviewed(row) &&
      row.diff.sceneMatch &&
      row.diff.sopEditType === "none" &&
      !row.diff.wiNumbersEdited;
  }

  function isUsableDraft(row) {
    return isReviewed(row) &&
      row.diff.sceneMatch &&
      (row.diff.sopEditType === "none" || row.diff.sopEditType === "wording") &&
      !row.diff.wiNumbersEdited;
  }

  function hasSubstantiveHumanEdit(row) {
    if (!isReviewed(row)) return false;
    var diff = row.diff;
    return !diff.sceneMatch || diff.sopEditType !== "none" || diff.wiNumbersEdited;
  }

  function qualityScoreOf(row) {
    if (!isReviewed(row)) return null;
    var diff = row.diff;
    var score = 100;
    if (!diff.sceneMatch) score -= 40;
    if (diff.sopEditType === "wording") score -= 5;
    if (diff.sopEditType === "deleted_step" || diff.sopEditType === "added_step") score -= 20;
    if (diff.sopEditType === "rewritten") score -= 45;
    if (diff.requirementEdited) score -= 10;
    if (diff.wiNumbersEdited) score -= 20;
    return Math.max(0, score);
  }

  function average(values) {
    var nums = values.filter(function (value) { return Number.isFinite(value); });
    if (!nums.length) return null;
    return Math.round(nums.reduce(function (sum, value) { return sum + value; }, 0) / nums.length);
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
    var firstPass = 0;
    var usable = 0;
    var substantiveEdit = 0;
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
      if (isFirstPass(row)) firstPass += 1;
      if (isUsableDraft(row)) usable += 1;
      if (hasSubstantiveHumanEdit(row)) substantiveEdit += 1;
    });
    var qualityScore = average(reviewedRows.map(qualityScoreOf));
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
      firstPass: firstPass,
      firstPassRate: pct(firstPass, reviewed),
      usable: usable,
      usableRate: pct(usable, reviewed),
      qualityScore: qualityScore,
      substantiveEdit: substantiveEdit,
      humanEditRate: pct(substantiveEdit, reviewed),
      sopOriginalRate: pct(none, reviewed),
      rewriteRate: pct(rewritten, reviewed),
      wiStableRate: pct(reviewed - wiEdited, reviewed),
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
    return prefix + "已审完 " + stats.reviewed + " 单：AI 可用成稿 " + stats.usableRate + "%，一次成稿 " + stats.firstPassRate + "%，质量分 " + stats.qualityScore + "。";
  }

  function trend(rows) {
    var map = {};
    rows.forEach(function (row) {
      var day = shanghaiDate(row.aiWriteTime) || "未知日期";
      if (!map[day]) map[day] = { day: day, rows: [], written: 0, reviewed: 0, match: 0 };
      map[day].rows.push(row);
      map[day].written += 1;
      if (!isReviewed(row)) return;
      map[day].reviewed += 1;
      if (row.diff.sceneMatch) map[day].match += 1;
    });
    return Object.keys(map).sort().map(function (day) {
      var item = map[day];
      var stats = summarize(item.rows);
      item.matchRate = pct(item.match, item.reviewed);
      Object.keys(METRICS).forEach(function (key) {
        item[key] = stats[key === "sceneMatchRate" ? "matchRate" : key];
      });
      return item;
    });
  }

  function metricValue(stats, metricKey) {
    if (!stats) return null;
    if (metricKey === "sceneMatchRate") return stats.matchRate;
    return stats[metricKey];
  }

  function metricText(value, metricKey) {
    if (value == null) return "—";
    var metric = METRICS[metricKey] || {};
    if (metric.kind === "score") return value + (metric.unit || "");
    return value + (metric.unit || "");
  }

  function groupLabel(dimension, row) {
    if (dimension === "category") return categoryLabel(categoryOf(row)) || "其他";
    if (dimension === "editType") return EDIT_LABEL[row.diff && row.diff.sopEditType] || "待审完";
    if (dimension === "confidence") {
      var conf = row.ai && row.ai.confidence;
      if (conf === "high") return "高置信";
      if (conf === "medium") return "中置信";
      if (conf === "low") return "低置信";
      return "未知置信";
    }
    return (row.ai && (row.ai.sceneName || row.ai.sceneKey)) || "未知场景";
  }

  function groupKey(dimension, row) {
    if (dimension === "category") return categoryOf(row);
    if (dimension === "editType") return row.diff && row.diff.sopEditType || "pending";
    if (dimension === "confidence") return row.ai && row.ai.confidence || "unknown";
    return (row.ai && (row.ai.sceneKey || row.ai.sceneName)) || "unknown";
  }

  function groupTable(rows, dimension, metricKey) {
    var map = {};
    rows.forEach(function (row) {
      var key = groupKey(dimension, row);
      if (!map[key]) map[key] = { key: key, name: groupLabel(dimension, row), rows: [] };
      map[key].rows.push(row);
    });
    var all = Object.keys(map).map(function (key) {
      var item = map[key];
      var stats = summarize(item.rows);
      return {
        key: item.key,
        name: item.name,
        written: stats.written,
        reviewed: stats.reviewed,
        metricValue: metricValue(stats, metricKey),
        firstPassRate: stats.firstPassRate,
        usableRate: stats.usableRate,
        matchRate: stats.matchRate,
        rewriteRate: stats.rewriteRate,
        humanEditRate: stats.humanEditRate,
        few: stats.reviewed < 3,
      };
    });
    var metric = METRICS[metricKey] || { good: "high" };
    var ranked = all.filter(function (item) { return !item.few; });
    var few = all.filter(function (item) { return item.few; });
    ranked.sort(function (a, b) {
      var av = a.metricValue == null ? (metric.good === "low" ? -1 : 101) : a.metricValue;
      var bv = b.metricValue == null ? (metric.good === "low" ? -1 : 101) : b.metricValue;
      if (metric.good === "low") return bv - av || b.reviewed - a.reviewed || a.name.localeCompare(b.name, "zh");
      return av - bv || b.reviewed - a.reviewed || a.name.localeCompare(b.name, "zh");
    });
    few.sort(function (a, b) { return a.name.localeCompare(b.name, "zh"); });
    return ranked.concat(few);
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
    if (focus.groupKey && focus.dimension) {
      if (groupKey(focus.dimension, row) !== focus.groupKey) return false;
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
    METRICS: METRICS,
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
    groupTable: groupTable,
    problemList: problemList,
    shortName: shortName,
    diffSummary: diffSummary,
    categoryLabel: categoryLabel,
    rangeLabel: rangeLabel,
    metricValue: metricValue,
    metricText: metricText,
    isFirstPass: isFirstPass,
    isUsableDraft: isUsableDraft,
    qualityScoreOf: qualityScoreOf,
    hasSubstantiveHumanEdit: hasSubstantiveHumanEdit,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
