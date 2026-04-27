(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const els = {
    error: document.getElementById("error-box"),

    currentTitle: document.getElementById("current-title"),
    currentSummary: document.getElementById("current-summary"),
    macroStats: document.getElementById("macro-stats"),
    recentEvents: document.getElementById("recent-events"),

    presidentList: document.getElementById("president-list"),
    governmentList: document.getElementById("government-list"),
    economyList: document.getElementById("economy-list"),
    potusElectionList: document.getElementById("potus-election-list"),
    congressElectionList: document.getElementById("congress-election-list"),
    timelineList: document.getElementById("timeline-list"),
    lawList: document.getElementById("law-list")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      hideError();

      const [
        presidentsRes,
        economyRes,
        eventsRes,
        lawsRes,
        regionsRes,
        governorsRes,
        senateRes,
        houseRes,
        potusRes,
        congressRes
      ] = await Promise.all([
        supabase
          .from("president_entries")
          .select("*")
          .order("display_order", { ascending: true }),

        supabase
          .from("economy_snapshots")
          .select("*")
          .order("year", { ascending: false })
          .order("month", { ascending: false }),

        supabase
          .from("timeline_events")
          .select("*")
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .order("day", { ascending: false })
          .limit(20),

        supabase
          .from("laws")
          .select("*")
          .order("year", { ascending: false })
          .limit(20),

        supabase
          .from("gov_regions")
          .select("*")
          .order("sort_order", { ascending: true }),

        supabase
          .from("gov_governors")
          .select("*"),

        supabase
          .from("gov_senate_seats")
          .select("*"),

        supabase
          .from("gov_house_seats")
          .select("*"),

        supabase
          .from("potus_election_archives")
          .select("*")
          .order("year", { ascending: false }),

        supabase
          .from("congress_election_archives")
          .select("*")
          .order("year", { ascending: false })
      ]);

      [
        presidentsRes,
        economyRes,
        eventsRes,
        lawsRes,
        regionsRes,
        governorsRes,
        senateRes,
        houseRes,
        potusRes,
        congressRes
      ].forEach(throwIf);

      const presidents = presidentsRes.data || [];
      const economy = economyRes.data || [];
      const events = eventsRes.data || [];
      const laws = lawsRes.data || [];
      const regions = regionsRes.data || [];
      const governors = governorsRes.data || [];
      const senate = senateRes.data || [];
      const house = houseRes.data || [];
      const potus = potusRes.data || [];
      const congress = congressRes.data || [];

      renderHero(presidents, economy, events);
      renderPresidents(presidents);
      renderGovernment(regions, governors, senate, house);
      renderEconomy(economy);
      renderPotusElections(potus);
      renderCongressElections(congress);
      renderEvents(events);
      renderLaws(laws);
    } catch (err) {
      showError("Could not load archive data. " + (err.message || err));
    }
  }

  function renderHero(presidents, economy, events) {
    const currentPresident =
      presidents.find(p => String(p.status || "").toLowerCase() === "current") ||
      presidents[presidents.length - 1] ||
      presidents[0];

    const currentEconomy =
      economy.find(e => e.is_current) ||
      economy[0];

    setText(
      els.currentTitle,
      currentPresident ? `${currentPresident.full_name} Administration` : "APRP Current Archive"
    );

    setText(
      els.currentSummary,
      currentPresident?.short_summary ||
        "Current APRP canon, government, economy, events, elections, and historical records."
    );

    setHTML(
      els.macroStats,
      currentEconomy
        ? `
          ${stat("GDP", money(currentEconomy.gdp))}
          ${stat("Growth", pct(currentEconomy.gdp_growth))}
          ${stat("Unemployment", pct(currentEconomy.unemployment))}
          ${stat("Inflation", pct(currentEconomy.inflation))}
          ${stat("Debt", money(currentEconomy.debt))}
          ${stat("Deficit", money(currentEconomy.deficit))}
        `
        : `<p class="muted">No economy snapshot yet.</p>`
    );

    setHTML(
      els.recentEvents,
      events.slice(0, 5).map(e => `
        <div class="mini-item">
          <strong>${esc(e.title)}</strong>
          <span>${esc(e.date_label || e.year || "")} • ${esc(e.category || "general")}</span>
        </div>
      `).join("") || `<p class="muted">No recent events yet.</p>`
    );
  }

  function renderPresidents(rows) {
    setHTML(
      els.presidentList,
      rows.map(p => `
        <article class="record-card">
          ${p.portrait_url ? `<img class="portrait" src="${escAttr(p.portrait_url)}" alt="">` : ""}
          <h3>${esc(p.full_name)}</h3>
          <div class="record-meta">
            <span class="pill">#${esc(p.number || "")}</span>
            <span class="pill">${esc(p.party || "")}</span>
            <span class="pill">${esc(p.term_start || "")}${p.term_end ? "–" + esc(p.term_end) : ""}</span>
          </div>
          <p>${esc(p.short_summary || p.full_summary || "No summary yet.")}</p>
        </article>
      `).join("") || `<p class="muted">No presidents added yet.</p>`
    );
  }

  function renderGovernment(regions, governors, senate, house) {
    setHTML(
      els.governmentList,
      regions.map(r => {
        const gov = governors.find(g => g.region_id === r.id);
        const sens = senate.filter(s => s.region_id === r.id);
        const reps = house.filter(h => h.region_id === r.id);

        return `
          <article class="record-card">
            <h3>${esc(r.name)} ${r.cycle_type ? "|" : ""} ${esc(r.cycle_type || "")}</h3>

            <div class="record-meta">
              <span class="pill">${esc(sens.length)} Senators</span>
              <span class="pill">${esc(reps.length)} House Seats</span>
            </div>

            <p>
              <strong>Governor:</strong>
              ${esc(gov?.governor_name || "Vacant")}
              ${gov?.governor_party ? "— " + esc(gov.governor_party) : ""}
            </p>

            <p>
              <strong>Senate:</strong>
              ${
                sens.map(s => {
                  const seat = s.seat_class || s.custom_class || s.seat_name || "Seat";
                  const filler = s.filler_name || "Vacant";
                  const party = s.filler_party ? ` (${s.filler_party})` : "";
                  return `${seat}: ${filler}${party}`;
                }).join("; ") || "No seats"
              }
            </p>
          </article>
        `;
      }).join("") || `<p class="muted">No government regions yet.</p>`
    );
  }

  function renderEconomy(rows) {
    setHTML(
      els.economyList,
      rows.slice(0, 20).map(e => `
        <article class="record-card wide-card">
          <h3>${esc(e.label || `${e.year}${e.month ? "-" + e.month : ""}`)}</h3>

          <div class="record-meta">
            <span class="pill">${esc(e.period_type || "snapshot")}</span>
            ${e.is_current ? `<span class="pill">Current</span>` : ""}
            <span class="pill">GDP ${money(e.gdp)}</span>
            <span class="pill">Growth ${pct(e.gdp_growth)}</span>
            <span class="pill">Unemployment ${pct(e.unemployment)}</span>
          </div>

          <p>${esc(e.summary || "No summary yet.")}</p>

          ${renderCharts(e.chart_json)}
        </article>
      `).join("") || `<p class="muted">No economy snapshots yet.</p>`
    );
  }

  function renderPotusElections(rows) {
    setHTML(
      els.potusElectionList,
      rows.map(e => `
        <article class="record-card election-card">
          <h3>${esc(e.year)} — ${esc(e.title)}</h3>

          <div class="ev-line">
            <div>
              <strong>${esc(e.winner_ev || 0)}</strong>
              <span>${esc(e.winner_name || "Winner")}</span>
            </div>

            <div class="ev-bar">
              <div style="width:${evPct(e.winner_ev, e.runner_up_ev)}%"></div>
            </div>

            <div>
              <strong>${esc(e.runner_up_ev || 0)}</strong>
              <span>${esc(e.runner_up_name || "Runner-up")}</span>
            </div>
          </div>

          ${e.map_url ? `<img class="election-map-img" src="${escAttr(e.map_url)}" alt="">` : ""}

          <p>${esc(e.summary || "")}</p>

          ${renderStateTable(e.state_results_json)}
        </article>
      `).join("") || `<p class="muted">No presidential election archives yet.</p>`
    );
  }

  function renderCongressElections(rows) {
    setHTML(
      els.congressElectionList,
      rows.map(e => `
        <article class="record-card election-card">
          <h3>${esc(e.year)} — ${esc(e.title)}</h3>

          <div class="record-meta">
            <span class="pill">${esc(e.election_type || "")}</span>
            <span class="pill">House: ${esc(e.house_control || "—")}</span>
            <span class="pill">Senate: ${esc(e.senate_control || "—")}</span>
            <span class="pill">Governors: ${esc(e.governor_control || "—")}</span>
          </div>

          ${e.map_url ? `<img class="election-map-img" src="${escAttr(e.map_url)}" alt="">` : ""}

          <p>${esc(e.summary || "")}</p>

          ${renderCharts(e.control_json)}
        </article>
      `).join("") || `<p class="muted">No congressional election archives yet.</p>`
    );
  }

  function renderEvents(rows) {
    setHTML(
      els.timelineList,
      rows.map(e => `
        <div class="timeline-item">
          <strong>${esc(e.title)}</strong>
          <span>${esc(e.date_label || e.year || "")} • ${esc(e.category || "")}</span>
          <p>${esc(e.summary || "")}</p>
        </div>
      `).join("") || `<p class="muted">No timeline events yet.</p>`
    );
  }

  function renderLaws(rows) {
    setHTML(
      els.lawList,
      rows.map(l => `
        <div class="mini-item">
          <strong>${esc(l.title)}</strong>
          <span>${esc(l.date_signed || l.year || "")} • ${esc(l.status || "")} • ${esc(l.funding || "")}</span>
        </div>
      `).join("") || `<p class="muted">No laws added yet.</p>`
    );
  }

  function renderCharts(chartJson) {
    const charts = chartJson?.charts;
    if (!Array.isArray(charts) || !charts.length) return "";

    return `
      <div class="chart-stack">
        ${charts.map(chart => {
          const points = Array.isArray(chart.points) ? chart.points : [];
          const max = Math.max(...points.map(p => Number(p.value || 0)), 1);

          return `
            <div class="chart-card">
              <h4>${esc(chart.title || "Chart")}</h4>

              <div class="bar-chart">
                ${points.map(p => {
                  const value = Number(p.value || 0);
                  const width = Math.max(2, (value / max) * 100);

                  return `
                    <div class="bar-row">
                      <span>${esc(p.label)}</span>
                      <div class="bar-track">
                        <div class="bar-fill" style="width:${width}%"></div>
                      </div>
                      <strong>${esc(value)}${esc(chart.unit || "")}</strong>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderStateTable(json) {
    const states = json?.states;
    if (!Array.isArray(states) || !states.length) return "";

    return `
      <div class="state-table-wrap">
        <table class="state-table">
          <thead>
            <tr>
              <th>State</th>
              <th>EV</th>
              <th>Winner</th>
              <th>GOP</th>
              <th>DNC</th>
              <th>IND</th>
            </tr>
          </thead>

          <tbody>
            ${states.map(s => `
              <tr>
                <td>${esc(s.state || "")}</td>
                <td>${esc(s.ev || "")}</td>
                <td>${esc(s.winner || "")}</td>
                <td>${esc(s.gop ?? "")}</td>
                <td>${esc(s.dem ?? "")}</td>
                <td>${esc(s.ind ?? "")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function evPct(a, b) {
    const total = Number(a || 0) + Number(b || 0);
    if (!total) return 50;
    return Math.max(0, Math.min(100, (Number(a || 0) / total) * 100));
  }

  function stat(label, value) {
    return `
      <div class="stat-box">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
      </div>
    `;
  }

  function setHTML(el, html) {
    if (!el) return;
    el.innerHTML = html;
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function money(n) {
    if (n === null || n === undefined || n === "") return "—";
    return "$" + Number(n).toLocaleString() + "B";
  }

  function pct(n) {
    if (n === null || n === undefined || n === "") return "—";
    return Number(n).toFixed(1) + "%";
  }

  function throwIf(res) {
    if (res.error) throw res.error;
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
    if (!els.error) return;
    els.error.classList.add("hidden");
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
