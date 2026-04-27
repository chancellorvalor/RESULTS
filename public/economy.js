(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase?.createClient
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  const els = {
    error: document.getElementById("error-box"),
    title: document.getElementById("snapshot-title"),
    summary: document.getElementById("snapshot-summary"),
    macro: document.getElementById("core-macro-grid"),
    list: document.getElementById("snapshot-list")
  };

  const chartRefs = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      hideError();

      if (!supabase) {
        throw new Error("Supabase config missing. Check shared/config.js.");
      }

      const rows = await loadEconomyRows();
      const current = pickCurrent(rows);

      renderCurrent(current);
      renderSnapshotList(rows);
      renderCharts(rows);
    } catch (error) {
      console.error(error);
      showError(`Could not load economy data. ${error.message || error}`);
      renderCurrent(null);
      renderSnapshotList([]);
      renderCharts([]);
    }
  }

  async function loadEconomyRows() {
    const { data, error } = await supabase
      .from("archive_economy")
      .select("*")
      .order("year", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  function pickCurrent(rows) {
    if (!rows.length) return null;

    const current = rows.find(row => {
      const value = row.is_current;
      return value === true || String(value).toLowerCase() === "true";
    });

    if (current) return current;

    return rows
      .slice()
      .sort((a, b) => {
        const ay = Number(a.year || 0);
        const by = Number(b.year || 0);
        const am = Number(a.month || 0);
        const bm = Number(b.month || 0);
        return by - ay || bm - am;
      })[0] || null;
  }

  function renderCurrent(row) {
    if (!row) {
      els.title.textContent = "No Economy Snapshot";
      els.summary.textContent = "Add economy snapshots in Archive Control Center to populate this page.";
      els.macro.innerHTML = defaultMacroCards();
      return;
    }

    els.title.textContent = row.label || buildLabel(row) || "Economic Snapshot";
    els.summary.textContent = row.summary || "Current macroeconomic conditions and fiscal indicators.";

    els.macro.innerHTML = `
      ${macroCard("GDP", formatBillions(row.gdp_billions), "Gross domestic product")}
      ${macroCard("Growth", formatPercent(row.gdp_growth), "Annual GDP growth rate")}
      ${macroCard("Unemployment", formatPercent(row.unemployment), "Headline unemployment")}
      ${macroCard("Inflation", formatPercent(row.inflation), "Consumer price pressure")}
      ${macroCard("Debt", formatBillions(row.debt_billions), "National debt")}
      ${macroCard("Deficit", formatBillions(row.deficit_billions), "Annual budget deficit")}
      ${macroCard("Stock Index", formatNumber(row.stock_market_index), "Market index")}
      ${macroCard("Oil Price", formatDollars(row.oil_price), "Price per barrel")}
      ${macroCard("POTUS Approval", formatPercent(row.potus_approval), "Current approval")}
      ${macroCard("Median Wage", formatDollars(row.median_wage), "Median annual wage")}
      ${macroCard("Jobs", formatNumber(row.job_creation), "Job creation")}
      ${macroCard("Defense", formatPercent(row.defense_pct_gdp), "Defense share of GDP")}
    `;
  }

  function defaultMacroCards() {
    return `
      ${macroCard("GDP", "—", "Gross domestic product")}
      ${macroCard("Growth", "—", "Annual GDP growth")}
      ${macroCard("Unemployment", "—", "Headline unemployment")}
      ${macroCard("Inflation", "—", "Consumer price pressure")}
      ${macroCard("Debt", "—", "National debt")}
      ${macroCard("Deficit", "—", "Annual budget deficit")}
    `;
  }

  function macroCard(label, value, sub) {
    return `
      <div class="macro-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(sub)}</small>
      </div>
    `;
  }

  function renderSnapshotList(rows) {
    if (!els.list) return;

    const sorted = rows.slice().sort((a, b) => {
      const ay = Number(a.year || 0);
      const by = Number(b.year || 0);
      const am = Number(a.month || 0);
      const bm = Number(b.month || 0);
      return by - ay || bm - am;
    });

    if (!sorted.length) {
      els.list.innerHTML = `<div class="empty-state">No economy records added yet.</div>`;
      return;
    }

    els.list.innerHTML = sorted.map(row => `
      <article class="snapshot-row">
        <span class="pill">${escapeHtml(row.period_type || "snapshot")}</span>
        <div>
          <strong>${escapeHtml(row.label || buildLabel(row) || "Economy Snapshot")}</strong>
          <p>${escapeHtml(row.summary || "No summary added.")}</p>
        </div>
        <span class="pill">${escapeHtml(row.year || "—")}${row.month ? ` / ${escapeHtml(row.month)}` : ""}</span>
      </article>
    `).join("");
  }

  function renderCharts(rows) {
    const yearly = rows
      .filter(row => row.year && (!row.month || String(row.period_type).toLowerCase() === "yearly"))
      .sort((a, b) => Number(a.year || 0) - Number(b.year || 0));

    const monthly = rows
      .filter(row => row.year && row.month)
      .sort((a, b) => Number(a.year || 0) - Number(b.year || 0) || Number(a.month || 0) - Number(b.month || 0));

    const monthlyLabels = monthly.map(row => `${row.year}-${String(row.month).padStart(2, "0")}`);
    const yearlyLabels = yearly.map(row => String(row.year));

    drawLineChart("stock-chart", {
      labels: monthlyLabels,
      datasets: [
        dataset("Stock Market Index", monthly.map(row => numOrNull(row.stock_market_index)))
      ]
    });

    drawLineChart("oil-chart", {
      labels: monthlyLabels,
      datasets: [
        dataset("Oil Price", monthly.map(row => numOrNull(row.oil_price)))
      ]
    });

    drawLineChart("approval-chart", {
      labels: rows.map(row => row.month ? `${row.year}-${String(row.month).padStart(2, "0")}` : String(row.year || row.label || "")),
      datasets: [
        dataset("POTUS Approval", rows.map(row => numOrNull(row.potus_approval)))
      ]
    });

    drawLineChart("gdp-debt-chart", {
      labels: yearlyLabels,
      datasets: [
        dataset("GDP", yearly.map(row => numOrNull(row.gdp_billions))),
        dataset("Debt", yearly.map(row => numOrNull(row.debt_billions)))
      ]
    });

    drawLineChart("growth-chart", {
      labels: yearlyLabels,
      datasets: [
        dataset("GDP Growth %", yearly.map(row => numOrNull(row.gdp_growth)))
      ]
    });

    drawLineChart("fiscal-chart", {
      labels: yearlyLabels,
      datasets: [
        dataset("Interest Rate %", yearly.map(row => numOrNull(row.interest_rate))),
        dataset("Deficit", yearly.map(row => numOrNull(row.deficit_billions))),
        dataset("Defense % GDP", yearly.map(row => numOrNull(row.defense_pct_gdp)))
      ]
    });

    drawLineChart("jobs-chart", {
      labels: yearlyLabels,
      datasets: [
        dataset("Job Creation", yearly.map(row => numOrNull(row.job_creation)))
      ]
    });

    drawLineChart("wage-chart", {
      labels: yearlyLabels,
      datasets: [
        dataset("Median Wage", yearly.map(row => numOrNull(row.median_wage)))
      ]
    });
  }

  function dataset(label, data) {
    return {
      label,
      data,
      tension: 0.35,
      borderWidth: 3,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: false
    };
  }

  function drawLineChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    if (chartRefs[canvasId]) {
      chartRefs[canvasId].destroy();
    }

    chartRefs[canvasId] = new Chart(canvas, {
      type: "line",
      data: config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: "#dce8ff",
              font: {
                family: "Inter",
                weight: "700"
              }
            }
          },
          tooltip: {
            enabled: true
          }
        },
        scales: {
          x: {
            ticks: {
              color: "#9fb1d9",
              maxRotation: 0,
              autoSkip: true
            },
            grid: {
              color: "rgba(148, 163, 184, .10)"
            }
          },
          y: {
            ticks: {
              color: "#9fb1d9"
            },
            grid: {
              color: "rgba(148, 163, 184, .12)"
            }
          }
        }
      }
    });
  }

  function buildLabel(row) {
    if (!row) return "";
    if (row.label) return row.label;

    const period = String(row.period_type || "").toLowerCase();

    if (period === "monthly" && row.year && row.month) {
      return `${row.year} Month ${row.month}`;
    }

    if (row.year) {
      return `${row.year} Economic Snapshot`;
    }

    return "Economic Snapshot";
  }

  function numOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  function formatBillions(value) {
    const num = numOrNull(value);
    if (num === null) return "—";
    return `$${num.toLocaleString()}B`;
  }

  function formatPercent(value) {
    const num = numOrNull(value);
    if (num === null) return "—";
    return `${num.toFixed(1)}%`;
  }

  function formatDollars(value) {
    const num = numOrNull(value);
    if (num === null) return "—";
    return `$${num.toLocaleString()}`;
  }

  function formatNumber(value) {
    const num = numOrNull(value);
    if (num === null) return "—";
    return num.toLocaleString();
  }

  function isMissingTableError(error) {
    const msg = String(error?.message || error || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();

    return (
      code === "42p01" ||
      code === "pgrst205" ||
      msg.includes("does not exist") ||
      msg.includes("could not find the table") ||
      msg.includes("schema cache")
    );
  }

  function showError(message) {
    if (!els.error) return;
    els.error.textContent = message;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error?.classList.add("hidden");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }
})();
