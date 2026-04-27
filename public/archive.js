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
    timelineList: document.getElementById("timeline-list"),
    lawList: document.getElementById("law-list")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      const [
        presidentsRes,
        economyRes,
        eventsRes,
        lawsRes,
        regionsRes,
        governorsRes,
        senateRes,
        houseRes
      ] = await Promise.all([
        supabase.from("president_entries").select("*").order("display_order", { ascending: true }),
        supabase.from("economy_snapshots").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
        supabase.from("timeline_events").select("*").order("year", { ascending: false }).order("month", { ascending: false }).order("day", { ascending: false }).limit(12),
        supabase.from("laws").select("*").order("year", { ascending: false }).limit(12),
        supabase.from("gov_regions").select("*").order("sort_order", { ascending: true }),
        supabase.from("gov_governors").select("*"),
        supabase.from("gov_senate_seats").select("*"),
        supabase.from("gov_house_seats").select("*")
      ]);

      throwIf(presidentsRes);
      throwIf(economyRes);
      throwIf(eventsRes);
      throwIf(lawsRes);
      throwIf(regionsRes);
      throwIf(governorsRes);
      throwIf(senateRes);
      throwIf(houseRes);

      renderPresidents(presidentsRes.data || []);
      renderEconomy(economyRes.data || []);
      renderEvents(eventsRes.data || []);
      renderLaws(lawsRes.data || []);
      renderGovernment(
        regionsRes.data || [],
        governorsRes.data || [],
        senateRes.data || [],
        houseRes.data || []
      );
      renderHero(presidentsRes.data || [], economyRes.data || [], eventsRes.data || []);
    } catch (err) {
      showError("Could not load archive data. " + (err.message || err));
    }
  }

  function renderHero(presidents, economy, events) {
    const currentPresident = presidents.find(p => p.status === "current") || presidents[presidents.length - 1] || presidents[0];
    const currentEconomy = economy.find(e => e.is_current) || economy[0];
    const latestEvent = events[0];

    els.currentTitle.textContent = currentPresident
      ? `${currentPresident.full_name} Administration`
      : "APRP Current Archive";

    els.currentSummary.textContent = currentPresident?.short_summary ||
      "Current APRP canon, government, economy, events, and historical records.";

    if (currentEconomy) {
      els.macroStats.innerHTML = `
        ${stat("GDP", money(currentEconomy.gdp))}
        ${stat("Growth", pct(currentEconomy.gdp_growth))}
        ${stat("Unemployment", pct(currentEconomy.unemployment))}
        ${stat("Inflation", pct(currentEconomy.inflation))}
        ${stat("Debt", money(currentEconomy.debt))}
        ${stat("Deficit", money(currentEconomy.deficit))}
      `;
    } else {
      els.macroStats.innerHTML = `<p class="muted">No economy snapshot yet.</p>`;
    }

    els.recentEvents.innerHTML = events.slice(0, 4).map(e => `
      <div class="mini-item">
        <strong>${esc(e.title)}</strong>
        <span>${esc(e.date_label || e.year || "")} • ${esc(e.category || "general")}</span>
      </div>
    `).join("") || `<p class="muted">No recent events yet.</p>`;
  }

  function renderPresidents(rows) {
    els.presidentList.innerHTML = rows.map(p => `
      <article class="record-card">
        <h3>${esc(p.full_name)}</h3>
        <div class="record-meta">
          <span class="pill">#${esc(p.number || "")}</span>
          <span class="pill">${esc(p.party || "")}</span>
          <span class="pill">${esc(p.term_start || "")}${p.term_end ? "–" + esc(p.term_end) : ""}</span>
        </div>
        <p>${esc(p.short_summary || p.full_summary || "No summary yet.")}</p>
      </article>
    `).join("") || `<p class="muted">No presidents added yet.</p>`;
  }

  function renderGovernment(regions, governors, senate, house) {
    els.governmentList.innerHTML = regions.map(r => {
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
          <p><strong>Governor:</strong> ${esc(gov?.governor_name || "Vacant")} ${gov?.governor_party ? "— " + esc(gov.governor_party) : ""}</p>
          <p><strong>Senate:</strong> ${sens.map(s => `${s.seat_class || s.custom_class || "Seat"}: ${s.filler_name || "Vacant"}`).join("; ") || "No seats"}</p>
        </article>
      `;
    }).join("") || `<p class="muted">No government regions yet.</p>`;
  }

  function renderEconomy(rows) {
    els.economyList.innerHTML = rows.slice(0, 12).map(e => `
      <article class="record-card">
        <h3>${esc(e.label || `${e.year}${e.month ? "-" + e.month : ""}`)}</h3>
        <div class="record-meta">
          <span class="pill">${esc(e.period_type)}</span>
          ${e.is_current ? `<span class="pill">Current</span>` : ""}
        </div>
        <p>${esc(e.summary || "No summary yet.")}</p>
      </article>
    `).join("") || `<p class="muted">No economy snapshots yet.</p>`;
  }

  function renderEvents(rows) {
    els.timelineList.innerHTML = rows.map(e => `
      <div class="timeline-item">
        <strong>${esc(e.title)}</strong>
        <span>${esc(e.date_label || e.year || "")} • ${esc(e.category || "")}</span>
        <p>${esc(e.summary || "")}</p>
      </div>
    `).join("") || `<p class="muted">No timeline events yet.</p>`;
  }

  function renderLaws(rows) {
    els.lawList.innerHTML = rows.map(l => `
      <div class="mini-item">
        <strong>${esc(l.title)}</strong>
        <span>${esc(l.date_signed || l.year || "")} • ${esc(l.status || "")} • ${esc(l.funding || "")}</span>
      </div>
    `).join("") || `<p class="muted">No laws added yet.</p>`;
  }

  function stat(label, value) {
    return `<div class="stat-box"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
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
    els.error.textContent = msg;
    els.error.classList.remove("hidden");
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
