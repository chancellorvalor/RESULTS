(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const els = {
    error: document.getElementById("error-box"),
    title: document.getElementById("economy-title"),
    summary: document.getElementById("economy-summary"),
    coreStats: document.getElementById("core-macro-stats"),

    stockIndex: document.getElementById("stock-index-chart"),
    oilPrice: document.getElementById("oil-price-chart"),
    potusApproval: document.getElementById("potus-approval-chart"),
    gdpDebt: document.getElementById("gdp-debt-chart"),
    gdpGrowth: document.getElementById("gdp-growth-chart"),
    budgetPressure: document.getElementById("budget-pressure-chart"),
    jobCreation: document.getElementById("job-creation-chart"),
    medianWage: document.getElementById("median-wage-chart"),

    records: document.getElementById("economy-records"),
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      hideError();

      const { data, error } = await supabase
        .from("economy_snapshots")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const current = rows.find(r => r.is_current) || rows[0];

      renderHero(current);
      renderCoreStats(current);
      renderCharts(rows);
      renderRecords(rows);
    } catch (err) {
      showError("Could not load economy data. " + (err.message || err));
    }
  }

  function renderHero(current) {
    if (!current) {
      setText(els.title, "No economy data yet");
      setText(els.summary, "Add economy snapshots in Archive Control.");
      return;
    }

    setText(
      els.title,
      current.label || `${current.year || "Current"} Economic Snapshot`
    );

    setText(
      els.summary,
      current.summary || "Current macroeconomic conditions and fiscal indicators."
    );
  }

  function renderCoreStats(current) {
    if (!current) {
      setHTML(els.coreStats, `<p class="muted">No current economy snapshot yet.</p>`);
      return;
    }

    const chartJson = normalizeJson(current.chart_json);
    const extra = chartJson.core || {};

    setHTML(
      els.coreStats,
      `
        ${statTile("GDP", money(current.gdp), "Gross domestic product")}
        ${statTile("GDP Growth", pct(current.gdp_growth), "Annual growth rate")}
        ${statTile("Unemployment", pct(current.unemployment), "Headline unemployment")}
        ${statTile("Inflation", pct(current.inflation), "Consumer price pressure")}
        ${statTile("National Debt", money(current.debt), "Total public debt")}
        ${statTile("Deficit", money(current.deficit), "Annual budget deficit")}
        ${statTile("Stock Index", valueOrDash(extra.stock_index), "Market index")}
        ${statTile("Oil Price", moneyPlain(extra.oil_price), "Price per barrel")}
        ${statTile("POTUS Approval", pct(extra.potus_approval), "Current approval")}
        ${statTile("Median Wage", moneyPlain(extra.median_wage), "Median annual wage")}
      `
    );
  }

  function renderCharts(rows) {
    const merged = mergeChartData(rows);

    renderChartByKey(els.stockIndex, merged, "stock_index", {
      suffix: "",
      title: "Monthly / Yearly Stock Market Index"
    });

    renderChartByKey(els.oilPrice, merged, "oil_prices", {
      prefix: "$",
      title: "Monthly / Yearly Oil Prices"
    });

    renderChartByKey(els.potusApproval, merged, "potus_approval", {
      suffix: "%",
      title: "POTUS Approval"
    });

    renderChartByKey(els.gdpDebt, merged, "gdp_debt", {
      prefix: "$",
      suffix: "B",
      title: "GDP and Debt"
    });

    renderChartByKey(els.gdpGrowth, merged, "gdp_growth", {
      suffix: "%",
      title: "GDP Growth"
    });

    renderChartByKey(els.budgetPressure, merged, "budget_pressure", {
      suffix: "%",
      title: "Interest, Deficit %, and Defense %"
    });

    renderChartByKey(els.jobCreation, merged, "job_creation", {
      title: "Yearly Job Creation"
    });

    renderChartByKey(els.medianWage, merged, "median_wage", {
      prefix: "$",
      title: "Median Wage"
    });
  }

  function mergeChartData(rows) {
    const output = { charts: [] };

    rows.forEach(row => {
      const json = normalizeJson(row.chart_json);
      if (Array.isArray(json.charts)) {
        output.charts.push(...json.charts);
      }
    });

    return output;
  }

  function renderChartByKey(el, json, key, opts = {}) {
    const chart = findChart(json, key);

    if (!chart) {
      el.innerHTML = emptyChart(opts.title || key);
      return;
    }

    if (chart.type === "multi_line" || Array.isArray(chart.series)) {
      renderMultiLineChart(el, chart, opts);
      return;
    }

    renderSingleLineChart(el, chart, opts);
  }

  function findChart(json, key) {
    if (!json || !Array.isArray(json.charts)) return null;

    return json.charts.find(c =>
      String(c.key || c.id || c.title || "")
        .toLowerCase()
        .replace(/\s+/g, "_") === key
    );
  }

  function renderSingleLineChart(el, chart, opts = {}) {
    const points = Array.isArray(chart.points) ? chart.points : [];

    if (!points.length) {
      el.innerHTML = emptyChart(chart.title || opts.title || "Chart");
      return;
    }

    const series = [
      {
        label: chart.y_label || chart.title || "Value",
        className: "line-primary",
        points
      }
    ];

    el.innerHTML = renderSvgLineChart(chart.title || opts.title || "Chart", series, opts, chart.y_label);
  }

  function renderMultiLineChart(el, chart, opts = {}) {
    const series = Array.isArray(chart.series) ? chart.series : [];

    if (!series.length) {
      el.innerHTML = emptyChart(chart.title || opts.title || "Chart");
      return;
    }

    const normalized = series.map((s, index) => ({
      label: s.label || s.key || `Series ${index + 1}`,
      className: index === 0 ? "line-primary" : index === 1 ? "line-secondary" : "line-tertiary",
      points: Array.isArray(s.points) ? s.points : []
    }));

    el.innerHTML = renderSvgLineChart(chart.title || opts.title || "Chart", normalized, opts, chart.y_label);
  }

  function renderSvgLineChart(title, series, opts = {}, yLabel = "") {
    const width = 760;
    const height = 300;
    const pad = { left: 58, right: 22, top: 26, bottom: 48 };

    const allPoints = series.flatMap(s => s.points || []);
    const values = allPoints.map(p => Number(p.value || 0));
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 1;
    if (min === max) {
      min = min - 1;
      max = max + 1;
    }

    const labels = [...new Set(allPoints.map(p => String(p.label)))];
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    const xFor = label => {
      const index = labels.indexOf(String(label));
      if (labels.length <= 1) return pad.left + chartW / 2;
      return pad.left + (index / (labels.length - 1)) * chartW;
    };

    const yFor = value => {
      const pct = (Number(value) - min) / (max - min);
      return pad.top + chartH - pct * chartH;
    };

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const y = pad.top + chartH - t * chartH;
      const value = min + t * (max - min);
      return `
        <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid-line"></line>
        <text x="${pad.left - 10}" y="${y + 4}" class="chart-axis-label" text-anchor="end">${formatCompact(value, opts)}</text>
      `;
    }).join("");

    const xLabels = labels.map(label => {
      const x = xFor(label);
      return `<text x="${x}" y="${height - 18}" class="chart-axis-label" text-anchor="middle">${esc(label)}</text>`;
    }).join("");

    const paths = series.map(s => {
      const clean = (s.points || []).filter(p => p.label !== undefined && p.value !== null && p.value !== undefined);

      const d = clean.map((p, i) => {
        const x = xFor(p.label);
        const y = yFor(p.value);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ");

      const dots = clean.map(p => {
        const x = xFor(p.label);
        const y = yFor(p.value);
        return `
          <circle cx="${x}" cy="${y}" r="4.5" class="chart-dot ${s.className}">
            <title>${esc(s.label)} — ${esc(p.label)}: ${formatValue(p.value, opts)}</title>
          </circle>
        `;
      }).join("");

      return `
        <path d="${d}" class="chart-line ${s.className}"></path>
        ${dots}
      `;
    }).join("");

    const legend = series.map(s => `
      <span class="line-legend-item">
        <i class="${s.className}"></i>
        ${esc(s.label)}
      </span>
    `).join("");

    return `
      <div class="line-chart-card">
        <div class="chart-title-row">
          <h3>${esc(title)}</h3>
          <span>${esc(yLabel || "Line chart")}</span>
        </div>

        <div class="line-legend">${legend}</div>

        <div class="svg-chart-wrap">
          <svg class="svg-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escAttr(title)}">
            <rect x="0" y="0" width="${width}" height="${height}" class="chart-bg"></rect>
            ${gridLines}
            <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="chart-axis-line"></line>
            <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="chart-axis-line"></line>
            ${paths}
            ${xLabels}
          </svg>
        </div>
      </div>
    `;
  }

  function renderRecords(rows) {
    if (!els.records) return;

    if (!rows.length) {
      els.records.innerHTML = `<p class="muted">No economy records yet.</p>`;
      return;
    }

    els.records.innerHTML = rows.map(row => {
      const label = row.label || `${row.year || ""}${row.month ? "-" + row.month : ""}`;
      return `
        <article class="record-card wide-card">
          <h3>${esc(label)}</h3>

          <div class="record-meta">
            <span class="pill">${esc(row.period_type || "snapshot")}</span>
            ${row.is_current ? `<span class="pill">Current</span>` : ""}
            <span class="pill">GDP ${money(row.gdp)}</span>
            <span class="pill">Growth ${pct(row.gdp_growth)}</span>
            <span class="pill">Unemployment ${pct(row.unemployment)}</span>
            <span class="pill">Inflation ${pct(row.inflation)}</span>
          </div>

          <p>${esc(row.summary || "No summary yet.")}</p>
        </article>
      `;
    }).join("");
  }

  function statTile(label, value, sub) {
    return `
      <div class="economy-stat-card">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <small>${esc(sub)}</small>
      </div>
    `;
  }

  function emptyChart(title) {
    return `
      <div class="empty-chart">
        <strong>${esc(title)}</strong>
        <p>No chart data yet. Add this chart in the Economy tab using the chart builder.</p>
      </div>
    `;
  }

  function normalizeJson(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  function formatValue(value, opts = {}) {
    const prefix = opts.prefix || "";
    const suffix = opts.suffix || "";
    return `${prefix}${Number(value).toLocaleString()}${suffix}`;
  }

  function formatCompact(value, opts = {}) {
    const prefix = opts.prefix || "";
    const suffix = opts.suffix || "";
    const n = Number(value);

    if (Math.abs(n) >= 1000000) return `${prefix}${(n / 1000000).toFixed(1)}M${suffix}`;
    if (Math.abs(n) >= 1000) return `${prefix}${(n / 1000).toFixed(1)}K${suffix}`;
    return `${prefix}${n.toFixed(Math.abs(n) < 10 ? 1 : 0)}${suffix}`;
  }

  function money(n) {
    if (n === null || n === undefined || n === "") return "—";
    return "$" + Number(n).toLocaleString() + "B";
  }

  function moneyPlain(n) {
    if (n === null || n === undefined || n === "") return "—";
    return "$" + Number(n).toLocaleString();
  }

  function pct(n) {
    if (n === null || n === undefined || n === "") return "—";
    return Number(n).toFixed(1) + "%";
  }

  function valueOrDash(n) {
    if (n === null || n === undefined || n === "") return "—";
    return Number(n).toLocaleString();
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value;
  }

  function setHTML(el, value) {
    if (!el) return;
    el.innerHTML = value;
  }

  function showError(msg) {
    if (!els.error) {
      console.error(msg);
      return;
    }

    els.error.textContent = msg;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error?.classList.add("hidden");
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>'"]/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[m]));
  }

  function escAttr(s) {
    return esc(s).replace(/`/g, "&#96;");
  }
})();
