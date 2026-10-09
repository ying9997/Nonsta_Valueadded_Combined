/* 看板页面交互：筛选、点大数筛清单、点场景、点开对照。 */
(function () {
  var Q = window.QualityLogic;
  var data = window.QUALITY_DATA || { rows: [], source: "", builtAt: "" };
  var state = {
    range: "7d",
    category: "all",
    review: "all",
    kpi: null,
    sceneKey: null,
    sceneSort: "matchAsc",
    selected: null,
  };

  var BAND_LABEL = { green: "绿 · 可过", yellow: "黄 · 改了步骤", red: "红 · 要盯", gray: "灰 · 待审完" };
  var CONF_LABEL = { high: "高", medium: "中", low: "低" };
  var KPI_LABEL = { reviewed: "只看已审完", match: "只看场景认对", rewritten: "只看整段重写" };
  var RANGE_LABEL = { "7d": "近 7 天", "30d": "近 30 天", all: "全部" };

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function today() {
    var days = (data.rows || [])
      .map(function (row) { return Q.shanghaiDate(row.aiWriteTime); })
      .filter(Boolean)
      .sort();
    return days.length ? days[days.length - 1] : Q.shanghaiDate(new Date().toISOString());
  }

  function dataCoverage() {
    var days = (data.rows || [])
      .map(function (row) { return Q.shanghaiDate(row.aiWriteTime); })
      .filter(Boolean)
      .sort();
    if (!days.length) return { start: "", end: "", dayCount: 0 };
    var unique = days.filter(function (day, i) { return i === 0 || day !== days[i - 1]; });
    return { start: unique[0], end: unique[unique.length - 1], dayCount: unique.length };
  }

  function rangeCount(range) {
    return Q.applyFilters(data.rows, { range: range, category: state.category, review: state.review }, today()).length;
  }

  function baseRows() {
    return Q.applyFilters(data.rows, state, today());
  }

  function setPressed(group, value) {
    document.querySelectorAll('[data-group="' + group + '"]').forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-value") === value);
      if (group === "range") {
        var range = btn.getAttribute("data-value");
        btn.textContent = RANGE_LABEL[range] + " (" + rangeCount(range) + ")";
      }
    });
  }

  function rateText(rate) {
    return rate == null ? "—" : rate + "%";
  }

  function render() {
    var rows = baseRows();
    var stats = Q.summarize(rows);
    var focus = { kpi: state.kpi, sceneKey: state.sceneKey };
    var list = Q.problemList(rows, focus);
    var scenes = Q.sceneTable(rows, state.sceneSort);
    var days = Q.trend(rows);
    var cat = Q.categoryLabel(state.category);
    var coverage = dataCoverage();

    $("conclusion").textContent = Q.conclusion(state, stats);
    setPressed("range", state.range);
    setPressed("category", state.category);
    setPressed("review", state.review);
    $("kpi-written").textContent = String(stats.written);
    $("kpi-reviewed").textContent = String(stats.reviewed);
    $("kpi-match").textContent = rateText(stats.matchRate);
    $("kpi-rewrite").textContent = String(stats.rewritten);
    $("kpi-written-sub").textContent = "其中待审完 " + stats.pending + " 单";
    $("kpi-match-sub").textContent = stats.reviewed ? "认对 " + stats.match + " / " + stats.reviewed : "还没有已审完的单";
    $("side-note").textContent = stats.reviewed
      ? "需求被改 " + stats.requirementRate + "%（先不当红灯） · WI 被改 " + stats.wiRate + "%"
      : "需求被改、WI 被改要等有已审完的单再看";

    document.querySelectorAll(".kpi").forEach(function (card) {
      var key = card.getAttribute("data-kpi");
      var on = key === "written" ? !state.kpi : key === state.kpi;
      card.classList.toggle("active", on);
    });

    var maxWritten = days.reduce(function (max, day) { return Math.max(max, day.written); }, 1);
    $("trend").innerHTML = days.length ? days.map(function (day) {
      var h = Math.max(8, Math.round((day.written / maxWritten) * 120));
      return '<div class="day">' +
        '<div class="bar" style="height:' + h + 'px" title="写入 ' + day.written + '"></div>' +
        '<b>' + esc(day.day.slice(5)) + '</b>' +
        '<span>写入 ' + day.written + '</span>' +
        '<span>审完 ' + day.reviewed + '</span>' +
        '<span>认对 ' + rateText(day.matchRate) + '</span>' +
        '</div>';
    }).join("") : '<p class="empty">这个时间范围里没有写入记录。</p>';

    $("scene-sort").textContent = state.sceneSort === "rewrittenDesc" ? "按整段重写从多到少" : "按认对率从低到高";
    $("scene-body").innerHTML = scenes.length ? scenes.map(function (item) {
      var active = state.sceneKey === item.key ? " active" : "";
      var few = item.few ? '<span class="tag few">样本少</span>' : "";
      return '<tr data-scene="' + esc(item.key) + '" class="' + active + (item.few ? " few" : "") + '">' +
        '<td><div class="scene-name">' + esc(item.name) + few + '</div></td>' +
        '<td>' + item.reviewed + '</td>' +
        '<td>' + rateText(item.matchRate) + '</td>' +
        '<td>' + item.none + '</td>' +
        '<td>' + item.wording + '</td>' +
        '<td>' + item.deletedStep + '</td>' +
        '<td>' + item.addedStep + '</td>' +
        '<td class="' + (item.rewritten ? "down" : "") + '">' + item.rewritten + '</td>' +
        '</tr>';
    }).join("") : '<tr><td colspan="8" class="empty">没有已审完的单，场景表先空着。</td></tr>';

    var tags = [];
    if (state.kpi && KPI_LABEL[state.kpi]) tags.push('<button class="chip active" data-clear="kpi">' + KPI_LABEL[state.kpi] + " ×</button>");
    if (state.sceneKey) {
      var scene = scenes.find(function (item) { return item.key === state.sceneKey; });
      tags.push('<button class="chip active" data-clear="scene">' + esc(Q.shortName(scene ? scene.name : state.sceneKey)) + " ×</button>");
    }
    $("focus-tags").innerHTML = tags.join("");
    $("list-count").textContent = list.length + " 单" + (cat ? " · " + cat : "");

    $("list-body").innerHTML = list.length ? list.map(function (row) {
      var band = Q.bandOf(row);
      var conf = (row.ai && row.ai.confidence) || "";
      var active = state.selected === row.vascNo ? " active" : "";
      return '<tr data-vasc="' + esc(row.vascNo) + '" class="' + active + '">' +
        '<td class="mono">' + esc(row.vascNo) + '</td>' +
        '<td>' + esc(Q.categoryLabel(Q.categoryOf(row)) || "其他") + '</td>' +
        '<td><div class="scene-name">' + esc(Q.shortName(row.ai && row.ai.sceneName)) + '</div></td>' +
        '<td>' + esc(CONF_LABEL[conf] || conf || "—") + '</td>' +
        '<td><span class="band ' + band + '">' + BAND_LABEL[band] + '</span></td>' +
        '<td class="summary">' + esc(Q.diffSummary(row)) + '</td>' +
        '</tr>';
    }).join("") : '<tr><td colspan="6" class="empty">当前筛选下没有单。</td></tr>';

    renderDrawer(list);
    $("meta").textContent =
      "数据 " + (data.rowCount || data.rows.length) + " 条" +
      (coverage.start ? " · 覆盖 " + coverage.start + " ~ " + coverage.end + "（" + coverage.dayCount + " 天）" : "") +
      " · 生成于 " + (data.builtAt || "未知") + " · 路径名 vas-internal-review-dashboard · 本机预览，还没上 40";
  }

  function block(title, text) {
    return '<section><h3>' + title + '</h3><pre>' + esc(text || "（空）") + '</pre></section>';
  }

  function renderDrawer(list) {
    var drawer = $("drawer");
    var row = data.rows.find(function (item) { return item.vascNo === state.selected; });
    if (!row || !list.some(function (item) { return item.vascNo === row.vascNo; })) {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      return;
    }
    var band = Q.bandOf(row);
    var ai = row.ai || {};
    var human = row.human || null;
    $("drawer-title").textContent = row.vascNo;
    $("drawer-band").className = "band " + band;
    $("drawer-band").textContent = BAND_LABEL[band];
    $("drawer-meta").textContent = [
      Q.categoryLabel(Q.categoryOf(row)) || "其他",
      "置信度 " + (CONF_LABEL[ai.confidence] || ai.confidence || "—"),
      "写入 " + (row.aiWriteTime || "—"),
      human && human.auditTime ? "审完 " + human.auditTime : "待审完",
    ].join(" · ");
    $("drawer-summary").textContent = Q.diffSummary(row);
    $("drawer-body").innerHTML =
      block("AI 场景", (ai.sceneName || "") + (ai.sceneCode ? "\n" + ai.sceneCode : "")) +
      block("人工场景", human ? ((human.sceneName || "") + (human.sceneCode ? "\n" + human.sceneCode : "")) : "还没审完") +
      '<div class="pair">' + block("AI 步骤", ai.sopText) + block("人工步骤", human && human.sopText) + '</div>' +
      '<div class="pair">' + block("AI 需求", ai.requirementDesc) + block("人工需求", human && human.requirementDesc) + '</div>';
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }

  document.body.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-group]");
    if (btn) {
      state[btn.getAttribute("data-group")] = btn.getAttribute("data-value");
      setPressed(btn.getAttribute("data-group"), state[btn.getAttribute("data-group")]);
      render();
      return;
    }
    var kpi = event.target.closest("[data-kpi]");
    if (kpi) {
      var key = kpi.getAttribute("data-kpi");
      state.kpi = key === "written" || state.kpi === key ? null : key;
      render();
      $("list").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var sort = event.target.closest("[data-sort]");
    if (sort) {
      state.sceneSort = state.sceneSort === "matchAsc" ? "rewrittenDesc" : "matchAsc";
      render();
      return;
    }
    var clear = event.target.closest("[data-clear]");
    if (clear) {
      if (clear.getAttribute("data-clear") === "kpi") state.kpi = null;
      if (clear.getAttribute("data-clear") === "scene") state.sceneKey = null;
      render();
      return;
    }
    var scene = event.target.closest("[data-scene]");
    if (scene) {
      var key = scene.getAttribute("data-scene");
      state.sceneKey = state.sceneKey === key ? null : key;
      render();
      $("list").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var vasc = event.target.closest("[data-vasc]");
    if (vasc) {
      var no = vasc.getAttribute("data-vasc");
      state.selected = state.selected === no ? null : no;
      render();
    }
  });

  $("drawer-close").addEventListener("click", function () {
    state.selected = null;
    render();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.selected) {
      state.selected = null;
      render();
    }
  });

  var themeBtn = $("theme");
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vas-internal-review-dashboard-theme", theme);
    themeBtn.textContent = theme === "dark" ? "浅色" : "深色";
  }
  themeBtn.addEventListener("click", function () {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  applyTheme(localStorage.getItem("vas-internal-review-dashboard-theme") || "dark");
  render();
})();
