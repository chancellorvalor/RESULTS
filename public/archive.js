(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase?.createClient
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  const TABLES = {
    settings: "archive_settings",
    presidents: "archive_presidents",
    economy: "archive_economy",
    timeline: "archive_timeline",
    laws: "archive_laws",
    potusElections: "archive_potus_elections",
    congressElections: "archive_congress_elections"
  };

  const els = {
    errorBox: document.getElementById("error-box"),
    hubKicker: document.getElementById("hub-kicker"),
    hubTitle: document.getElementById("hub-title"),
    hubSummary: document.getElementById("hub-summary"),
    heroTitle: document.getElementById("hero-title"),
    heroDescription: document.getElementById("hero-description"),
    cycleLabel: document.getElementById("cycle-label"),
    scheduleList: document.getElementById("schedule-list"),
    macroStats: document.getElementById("macro-stats"),
    recentEvents: document.getElementById("recent-events"),
    featuredPresident: document.getElementById("featured-president"),
    featuredEconomy: document.getElementById("featured-economy"),
    featuredTimeline: document.getElementById("featured-timeline")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    hideError();

    if (!supabase) {
      showError("Supabase config is missing. Check shared/config.js.");
      return;
    }

    try {
      const [
        hubMeta,
        hubSchedule,
        presidents,
        economy,
        timeline,
        laws
      ] = await Promise.all([
        getSetting("hub_meta", {
          kicker: "APRP ARCHIVES",
          title: "American Political Roleplay Archive",
          summary: "Government, elections, economy, presidents, events, laws, and timeline records.",
          heroTitle: "APRP Archive",
          heroDescription: "Government, elections, economy, presidents, events, laws, and timeline records.",
          cycleLabel: "ACTIVE CYCLE"
        }),
        getSetting("hub_schedule", []),
        fetchRows(TABLES.presidents, { orderBy: "president_number", ascending: false }),
        fetchRows(TABLES.economy, { orderBy: "year", ascending: false }),
        fetchRows(TABLES.timeline, { orderBy: "year", ascending: false }),
        fetchRows(TABLES.laws, { orderBy: "year", ascending: false })
      ]);

      const currentEconomy = pickCurrentEconomy(economy);
      const latestPresident = presidents[0] || null;
      const latestTimeline = sortTimelineDesc(timeline)[0] || null;

      renderHubMeta(hubMeta);
      renderSchedule(Array.isArray(hubSchedule) ? hubSchedule : []);
      renderMacroStats(currentEconomy);
      renderRecentEvents(sortTimelineDesc(timeline).slice(0, 5));
      renderPresidentFeature(latestPresident, presidents.length);
      renderEconomyFeature(currentEconomy, economy.length);
      renderTimelineFeature(latestTimeline, timeline.length, laws.length);
    } catch (error) {
      console.error(error);
      showError(`Could not load archive hub data. ${error.message || error}`);
    }
  }

  async function getSetting(key, fallbackValue) {
    const { data, error } = await supabase
      .from(TABLES.settings)
      .select("setting_value")
      .eq("setting_key", key)
      .maybeSingle();

    if (error) {
      if (/does not exist/i.test(error.message || "")) {
        return fallbackValue;
      }
      throw error;
    }

    return data?.setting_value ?? fallbackValue;
  }

  async function fetchRows(table, options = {}) {
    let query = supabase.from(table).select("*");

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: !!options.ascending });
    }

    const { data, error } = await query;

    if (error) {
      if (/does not exist/i.test(error.message || "")) {
        return [];
      }
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  function renderHubMeta(meta) {
    els.hubKicker.textContent = meta?.kicker || "APRP ARCHIVES";
    els.hubTitle.textContent = meta?.title || "American Political Roleplay Archive";
    els.hubSummary.textContent = meta?.summary || "Government, elections, economy, presidents, events, laws, and timeline records.";
    els.heroTitle.textContent = meta?.heroTitle || "APRP Archive";
    els.heroDescription.textContent = meta?.heroDescription || "Government, elections, economy, presidents, events, laws, and timeline records.";
    els.cycleLabel.textContent = meta?.cycleLabel || "ACTIVE CYCLE";
  }

  function renderSchedule(schedule) {
    if (!els.scheduleList) return;

    const cleaned = schedule
      .filter(item => item && (item.date || item.name))
      .map(item => ({
        date: String(item.date || "").trim(),
        name: String(item.name || "").trim()
      }));

    if (!cleaned.length) {
      els.scheduleList.innerHTML = `<div class="empty-state small">No schedule added yet in Archive Control Center.</div>`;
      return;
    }

    els.scheduleList.innerHTML = cleaned.map(item => `
      <article class="schedule-item">
        <div class="schedule-date">${escapeHtml(item.date || "—")}</div>
        <div class="schedule-name">${escapeHtml(item.name || "Untitled schedule item")}</div>
      </article>
    `).join("");
  }

  function renderMacroStats(snapshot) {
    if (!els.macroStats) return;

    if (!snapshot) {
      els.macroStats.innerHTML = `
        <div class="macro-stat"><span>GDP</span><strong>—</strong></div>
        <div class="macro-stat"><span>Growth</span><strong>—</strong></div>
        <div class="macro-stat"><span>Unemployment</span><strong>—</strong></div>
        <div class="macro-stat"><span>Inflation</span><strong>—</strong></div>
        <div class="macro-stat"><span>Debt</span><strong>—</strong></div>
        <div class="macro-stat"><span>Deficit</span><strong>—</strong></div>
      `;
      return;
    }

    els.macroStats.innerHTML = `
      <div class="macro-stat">
        <span>GDP</span>
        <strong>${formatBillions(snapshot.gdp_billions)}</strong>
      </div>
      <div class="macro-stat">
        <span>Growth</span>
        <strong>${formatPercent(snapshot.gdp_growth)}</strong>
      </div>
      <div class="macro-stat">
        <span>Unemployment</span>
        <strong>${formatPercent(snapshot.unemployment)}</strong>
      </div>
      <div class="macro-stat">
        <span>Inflation</span>
        <strong>${formatPercent(snapshot.inflation)}</strong>
      </div>
      <div class="macro-stat">
        <span>Debt</span>
        <strong>${formatBillions(snapshot.debt_billions)}</strong>
      </div>
      <div class="macro-stat">
        <span>Deficit</span>
        <strong>${formatBillions(snapshot.deficit_billions)}</strong>
      </div>
    `;
  }

  function renderRecentEvents(events) {
    if (!els.recentEvents) return;

    if (!events.length) {
      els.recentEvents.innerHTML = `<div class="empty-state small">No recent events yet.</div>`;
      return;
    }

    els.recentEvents.innerHTML = events.map(item => `
      <article class="event-item">
        <time>${escapeHtml(buildTimelineDate(item) || "Archive Event")}</time>
        <p>${escapeHtml(item.title || item.event_title || item.short_summary || "Untitled event")}</p>
      </article>
    `).join("");
  }

  function renderPresidentFeature(record, count) {
    if (!els.featuredPresident) return;

    if (!record) {
      els.featuredPresident.innerHTML = `
        <div>
          <p class="feature-kicker">HALL OF PRESIDENTS</p>
          <h3 class="feature-title">No presidents added yet</h3>
          <p class="feature-body">Add presidents in Archive Control Center to populate the Hall preview.</p>
        </div>
        <a class="feature-link" href="./hall-of-presidents.html">Open Hall</a>
      `;
      return;
    }

    els.featuredPresident.innerHTML = `
      <div>
        <div class="feature-head">
          <div>
            <p class="feature-kicker">HALL OF PRESIDENTS</p>
            <h3 class="feature-title">${escapeHtml(record.full_name || record.name || "President Record")}</h3>
          </div>
        </div>

        <div class="feature-meta">
          <span class="feature-chip">#${escapeHtml(record.president_number || "—")}</span>
          <span class="feature-chip">${escapeHtml(record.party || "No party")}</span>
          <span class="feature-chip">${escapeHtml(record.term_start || "—")} — ${escapeHtml(record.term_end || "—")}</span>
          <span class="feature-chip">${count} record${count === 1 ? "" : "s"}</span>
        </div>

        <p class="feature-body">${escapeHtml(record.short_summary || record.full_summary || "No summary added yet.")}</p>
      </div>

      <a class="feature-link" href="./hall-of-presidents.html">Open Hall</a>
    `;
  }

  function renderEconomyFeature(record, count) {
    if (!els.featuredEconomy) return;

    if (!record) {
      els.featuredEconomy.innerHTML = `
        <div>
          <p class="feature-kicker">ECONOMY</p>
          <h3 class="feature-title">No economy data yet</h3>
          <p class="feature-body">Add yearly or monthly snapshots in Archive Control Center to populate this preview.</p>
        </div>
        <a class="feature-link" href="./economy.html">Open Economy</a>
      `;
      return;
    }

    els.featuredEconomy.innerHTML = `
      <div>
        <p class="feature-kicker">ECONOMY</p>
        <h3 class="feature-title">${escapeHtml(record.label || buildEconomyLabel(record) || "Economy Snapshot")}</h3>

        <div class="feature-meta">
          <span class="feature-chip">GDP ${formatBillions(record.gdp_billions)}</span>
          <span class="feature-chip">Growth ${formatPercent(record.gdp_growth)}</span>
          <span class="feature-chip">Unemployment ${formatPercent(record.unemployment)}</span>
          <span class="feature-chip">${count} snapshot${count === 1 ? "" : "s"}</span>
        </div>

        <p class="feature-body">${escapeHtml(record.summary || record.economy_summary || "No summary added yet.")}</p>
      </div>

      <a class="feature-link" href="./economy.html">Open Economy</a>
    `;
  }

  function renderTimelineFeature(record, timelineCount, lawsCount) {
    if (!els.featuredTimeline) return;

    if (!record) {
      els.featuredTimeline.innerHTML = `
        <div>
          <p class="feature-kicker">TIMELINE</p>
          <h3 class="feature-title">No timeline events yet</h3>
          <p class="feature-body">Add major events, crises, and canon entries in Archive Control Center.</p>
        </div>
        <a class="feature-link" href="./timeline.html">Open Timeline</a>
      `;
      return;
    }

    els.featuredTimeline.innerHTML = `
      <div>
        <p class="feature-kicker">TIMELINE & LAWS</p>
        <h3 class="feature-title">${escapeHtml(record.title || "Latest Archive Event")}</h3>

        <div class="feature-meta">
          <span class="feature-chip">${escapeHtml(buildTimelineDate(record) || "Date unknown")}</span>
          <span class="feature-chip">${timelineCount} timeline entries</span>
          <span class="feature-chip">${lawsCount} law records</span>
        </div>

        <p class="feature-body">${escapeHtml(record.short_summary || record.full_body || "No summary added yet.")}</p>
      </div>

      <a class="feature-link" href="./timeline.html">Open Timeline</a>
    `;
  }

  function pickCurrentEconomy(rows) {
    if (!Array.isArray(rows) || !rows.length) return null;

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

  function sortTimelineDesc(rows) {
    return (rows || []).slice().sort((a, b) => {
      const ay = Number(a.year || 0);
      const by = Number(b.year || 0);
      const am = Number(a.month || 0);
      const bm = Number(b.month || 0);
      const ad = Number(a.day || 0);
      const bd = Number(b.day || 0);
      return by - ay || bm - am || bd - ad;
    });
  }

  function buildEconomyLabel(row) {
    if (!row) return "";
    if (row.label) return row.label;
    if (row.period_type === "monthly") {
      return `${row.year || ""} / Month ${row.month || ""}`;
    }
    return row.year ? `Year ${row.year}` : "Economy Snapshot";
  }

  function buildTimelineDate(row) {
    if (!row) return "";
    if (row.date_label) return row.date_label;

    const parts = [];
    if (row.month) parts.push(row.month);
    if (row.day) parts.push(row.day);
    if (row.year) parts.push(row.year);
    return parts.join(" ");
  }

  function formatBillions(value) {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return `$${num.toLocaleString()}B`;
  }

  function formatPercent(value) {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return `${value}%`;
    return `${num.toFixed(1)}%`;
  }

  function showError(message) {
    if (!els.errorBox) return;
    els.errorBox.textContent = message;
    els.errorBox.classList.remove("hidden");
  }

  function hideError() {
    els.errorBox?.classList.add("hidden");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      "\"": "&quot;"
    }[char]));
  }
})();
