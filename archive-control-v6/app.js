/* ECONOMY CHART BUILDER V16 */

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("add-economy-year-row");
  const buildBtn = document.getElementById("build-economy-json");
  const saveBtn = document.getElementById("save-economy");

  if (addBtn) {
    addBtn.onclick = () => addEconomyYearRow();
  }

  if (buildBtn) {
    buildBtn.onclick = () => buildEconomyChartJson();
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      buildEconomyChartJson();
    }, true);
  }

  const rows = document.getElementById("economy-year-rows");
  if (rows && !rows.children.length) {
    addEconomyYearRow({ year: 2008 });
    addEconomyYearRow({ year: 2009 });
    addEconomyYearRow({ year: 2010 });
  }
});

function addEconomyYearRow(data = {}) {
  const tbody = document.getElementById("economy-year-rows");
  if (!tbody) return;

  const tr = document.createElement("tr");

  tr.innerHTML = `
    ${yearCell("year", data.year)}
    ${yearCell("gdp", data.gdp)}
    ${yearCell("debt", data.debt)}
    ${yearCell("growth", data.growth)}
    ${yearCell("interest", data.interest)}
    ${yearCell("deficit_pct", data.deficit_pct)}
    ${yearCell("defense_pct", data.defense_pct)}
    ${yearCell("jobs", data.jobs)}
    ${yearCell("median_wage", data.median_wage)}
    ${yearCell("stock_index", data.stock_index)}
    ${yearCell("oil_price", data.oil_price)}
    ${yearCell("potus_approval", data.potus_approval)}
    <td><button class="remove-year-row" type="button">×</button></td>
  `;

  tr.querySelector(".remove-year-row").onclick = () => tr.remove();

  tbody.appendChild(tr);
}

function yearCell(key, value = "") {
  return `
    <td>
      <input
        class="year-field"
        data-key="${key}"
        type="number"
        step="0.01"
        value="${escapeAttr(value ?? "")}"
      />
    </td>
  `;
}

function collectEconomyYearRows() {
  const tbody = document.getElementById("economy-year-rows");
  if (!tbody) return [];

  return [...tbody.querySelectorAll("tr")]
    .map(tr => {
      const row = {};

      [...tr.querySelectorAll(".year-field")].forEach(input => {
        const key = input.dataset.key;
        const value = input.value;

        if (key === "year") {
          row[key] = value ? String(parseInt(value, 10)) : "";
        } else {
          row[key] = value === "" ? null : Number(value);
        }
      });

      return row;
    })
    .filter(row => row.year);
}

function buildEconomyChartJson() {
  const output = document.getElementById("eco-chart-json");
  if (!output) return;

  const rows = collectEconomyYearRows();

  const currentCore = {
    stock_index: numVal("eco-stock-index"),
    oil_price: numVal("eco-oil-price"),
    potus_approval: numVal("eco-potus-approval"),
    median_wage: numVal("eco-median-wage")
  };

  const json = {
    chart_type: "line",
    core: currentCore,
    charts: [
      {
        key: "stock_index",
        type: "line",
        title: "Monthly / Yearly Stock Market Index",
        y_label: "Index",
        points: rows
          .filter(r => r.stock_index !== null)
          .map(r => ({ label: r.year, value: r.stock_index }))
      },
      {
        key: "oil_prices",
        type: "line",
        title: "Monthly / Yearly Oil Prices",
        y_label: "Dollars per barrel",
        points: rows
          .filter(r => r.oil_price !== null)
          .map(r => ({ label: r.year, value: r.oil_price }))
      },
      {
        key: "potus_approval",
        type: "line",
        title: "POTUS Approval",
        y_label: "Approval %",
        points: rows
          .filter(r => r.potus_approval !== null)
          .map(r => ({ label: r.year, value: r.potus_approval }))
      },
      {
        key: "gdp_debt",
        type: "multi_line",
        title: "GDP and Debt",
        y_label: "Billions",
        series: [
          {
            key: "gdp",
            label: "GDP",
            points: rows
              .filter(r => r.gdp !== null)
              .map(r => ({ label: r.year, value: r.gdp }))
          },
          {
            key: "debt",
            label: "Debt",
            points: rows
              .filter(r => r.debt !== null)
              .map(r => ({ label: r.year, value: r.debt }))
          }
        ]
      },
      {
        key: "gdp_growth",
        type: "line",
        title: "GDP Growth",
        y_label: "Growth %",
        points: rows
          .filter(r => r.growth !== null)
          .map(r => ({ label: r.year, value: r.growth }))
      },
      {
        key: "budget_pressure",
        type: "multi_line",
        title: "Interest, Deficit %, and Defense %",
        y_label: "% of GDP",
        series: [
          {
            key: "interest",
            label: "Interest",
            points: rows
              .filter(r => r.interest !== null)
              .map(r => ({ label: r.year, value: r.interest }))
          },
          {
            key: "deficit_pct",
            label: "Deficit %",
            points: rows
              .filter(r => r.deficit_pct !== null)
              .map(r => ({ label: r.year, value: r.deficit_pct }))
          },
          {
            key: "defense_pct",
            label: "Defense %",
            points: rows
              .filter(r => r.defense_pct !== null)
              .map(r => ({ label: r.year, value: r.defense_pct }))
          }
        ]
      },
      {
        key: "job_creation",
        type: "line",
        title: "Yearly Job Creation",
        y_label: "Jobs",
        points: rows
          .filter(r => r.jobs !== null)
          .map(r => ({ label: r.year, value: r.jobs }))
      },
      {
        key: "median_wage",
        type: "line",
        title: "Median Wage",
        y_label: "Dollars",
        points: rows
          .filter(r => r.median_wage !== null)
          .map(r => ({ label: r.year, value: r.median_wage }))
      }
    ]
  };

  output.value = JSON.stringify(json, null, 2);
}

function numVal(id) {
  const el = document.getElementById(id);
  if (!el || el.value === "") return null;
  return Number(el.value);
}

function escapeAttr(value) {
  return String(value ?? "").replace(/[&<>'"]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[m]));
}
