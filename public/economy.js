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
      renderCharts(rows, current);
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
        ${statTile("Stock Index", valueOrDash(extra.stock_index), "Monthly market index")}
        ${statTile("Oil Price", moneyPlain(extra.oil_price), "Price per barrel")}
        ${statTile("POTUS Approval", pct(extra.potus_approval), "Current approval")}
        ${statTile("Median Wage", moneyPlain(extra.median_wage), "Median annual wage")}
      `
    );
  }

  function renderCharts(rows, current) {
    const merged = mergeChartData(rows);

    renderLineBarChart(
      els.stockIndex,
      "Monthly Stock Market Index",
      findChart(merged, "stock_index"),
      { suffix: "", valueLabel: "Index" }
    );

    renderLineBarChart(
      els.oilPrice,
      "Monthly Oil Prices",
      findChart(merged, "oil_prices"),
      { prefix: "$", suffix: "", valueLabel: "Oil" }
    );

    renderLineBarChart(
      els.potusApproval,
      "POTUS Approval",
      findChart(merged, "potus_approval"),
      { suffix: "%", valueLabel: "Approval" }
    );

    renderDualChart(
      els.gdpDebt,
      "GDP and Debt",
      findChart(merged, "gdp_debt"),
      { prefix: "$", suffix: "B" }
    );

    renderLineBarChart(
      els.gdpGrowth,
      "GDP Growth",
      findChart(merged, "gdp_growth"),
      { suffix: "%", valueLabel: "Growth" }
    );

    renderMultiChart(
      els.budgetPressure,
      "Interest, Deficit %, and Defense %",
      findChart(merged, "budget_pressure"),
      { suffix: "%" }
    );

    renderLineBarChart(
      els.jobCreation,
      "Yearly Job Creation",
      findChart(merged, "job_creation"),
      { suffix: " jobs", valueLabel: "Jobs" }
    );

    renderLineBarChart(
      els.medianWage,
      "Median Wage",
      findChart(merged, "median_wage"),
      { prefix: "$", suffix: "", valueLabel: "Wage" }
    );
  }

  function mergeChartData(rows) {
    const output = {
      charts: []
    };

    rows.forEach(row => {
      const json = normalizeJson(row.chart_json);
      if (Array.isArray(json.charts)) {
        output.charts.push(...json.charts);
      }
    });

    return output;
  }

  function findChart(json, key) {
    if (!json || !Array.isArray(json.charts)) return null;

    return json.charts.find(c =>
      String(c.key || c.id || c.title || "")
        .toLowerCase()
        .replace(/\s+/g, "_") === key
    );
  }

  function renderLineBarChart(el, title, chart, opts = {}) {
    if (!el) return;

    const points = Array.isArray(chart?.points) ? chart.points : [];

    if (!points.length) {
      el.innerHTML = emptyChart(title);
      return;
    }

    const values = points.map(p => Number(p.value || 0));
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);

    el.innerHTML = `
      <div class="chart-title-row">
        <h3>${esc(chart.title || title)}</h3>
        <span>${esc(opts.valueLabel || "Value")}</span>
      </div>

      <div class="economy-bars">
        ${points.map(p => {
          const value = Number(p.value || 0);
          const height = Math.max(6, Math.abs(value) / max * 100);
          return `
            <div class="econ-bar-wrap">
              <div class="econ-bar-value">${formatValue(value, opts)}</div>
              <div class="econ-bar-track">
                <div class="econ-bar-fill" style="height:${height}%"></div>
              </div>
              <div class="econ-bar-label">${esc(p.label)}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderDualChart(el, title, chart, opts = {}) {
    if (!el) return;

    const points = Array.isArray(chart?.points) ? chart.points : [];

    if (!points.length) {
      el.innerHTML = emptyChart(title);
      return;
    }

    const max = Math.max(
      ...points.flatMap(p => [Number(p.gdp || 0), Number(p.debt || 0)]),
      1
    );

    el.innerHTML = `
      <div class="chart-title-row">
        <h3>${esc(chart.title || title)}</h3>
        <span>GDP vs Debt</span>
      </div>

      <div class="dual-chart-list">
        ${points.map(p => {
          const gdp = Number(p.gdp || 0);
          const debt = Number(p.debt || 0);
          return `
            <div class="dual-row">
              <div class="dual-label">${esc(p.label)}</div>

              <div class="dual-bars">
                <div class="dual-bar-line">
                  <span>GDP</span>
                  <div class="dual-track">
                    <div class="dual-fill gdp-fill" style="width:${Math.max(2, gdp / max * 100)}%"></div>
                  </div>
                  <strong>${formatValue(gdp, opts)}</strong>
                </div>

                <div class="dual-bar-line">
                  <span>Debt</span>
                  <div class="dual-track">
                    <div class="dual-fill debt-fill" style="width:${Math.max(2, debt / max * 100)}%"></div>
                  </div>
                  <strong>${formatValue(debt, opts)}</strong>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderMultiChart(el, title, chart, opts = {}) {
    if (!el) return;

    const points = Array.isArray(chart?.points) ? chart.points : [];

    if (!points.length) {
      el.innerHTML = emptyChart(title);
      return;
    }

    const fields = chart.fields || [
      { key: "interest", label: "Interest" },
      { key: "deficit_pct", label: "Deficit %" },
      { key: "defense_pct", label: "Defense %" }
    ];

    const max = Math.max(
      ...points.flatMap(p => fields.map(f => Number(p[f.key] || 0))),
      1
    );

    el.innerHTML = `
      <div class="chart-title-row">
        <h3>${esc(chart.title || title)}</h3>
        <span>Fiscal pressure</span>
      </div>

      <div class="multi-chart-list">
        ${points.map(p => `
          <div class="multi-row">
            <div class="multi-label">${esc(p.label)}</div>

            <div class="multi-lines">
              ${fields.map(f => {
                const value = Number(p[f.key] || 0);
                return `
                  <div class="multi-line">
                    <span>${esc(f.label)}</span>
                    <div class="multi-track">
                      <div class="multi-fill" style="width:${Math.max(2, value / max * 100)}%"></div>
                    </div>
                    <strong>${formatValue(value, opts)}</strong>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `).join("")}
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
        <p>No chart data yet. Add this chart in the Economy tab using chart JSON.</p>
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
})();
