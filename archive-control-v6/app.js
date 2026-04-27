(() => {
  const ACCESS_CODE = "39333349";
  const STORAGE_KEY = "aprp_archive_control_v6_unlocked";

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
    potus: "archive_potus_elections",
    congress: "archive_congress_elections"
  };

  const state = {
    edit: {
      president: null,
      economy: null,
      timeline: null,
      law: null,
      potus: null,
      congress: null
    },
    records: {
      presidents: [],
      economy: [],
      timeline: [],
      laws: [],
      potus: [],
      congress: []
    }
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindLogin();
    bindTabs();
    bindActions();

    if (localStorage.getItem(STORAGE_KEY) === "true") {
      unlockApp();
    }
  }

  function bindLogin() {
    const unlockButton = byId("unlock-button");
    const accessInput = byId("access-code");

    unlockButton?.addEventListener("click", tryUnlock);
    accessInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        tryUnlock();
      }
    });
  }

  function tryUnlock() {
    const input = byId("access-code");
    const error = byId("login-error");
    const code = (input?.value || "").trim();

    if (code !== ACCESS_CODE) {
      error?.classList.remove("hidden");
      return;
    }

    error?.classList.add("hidden");
    localStorage.setItem(STORAGE_KEY, "true");
    unlockApp();
  }

  async function unlockApp() {
    byId("login-screen")?.classList.add("hidden");
    byId("app-shell")?.classList.remove("hidden");

    if (!supabase) {
      console.error("Supabase config missing.");
      return;
    }

    await Promise.all([
      loadHubSettings(),
      loadPresidents(),
      loadEconomy(),
      loadTimeline(),
      loadLaws(),
      loadPotusElections(),
      loadCongressElections()
    ]);
  }

  function bindTabs() {
    document.querySelectorAll(".tab-btn").forEach(button => {
      button.addEventListener("click", () => {
        const target = button.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn === button));
        document.querySelectorAll(".admin-panel").forEach(panel => {
          panel.classList.toggle("active", panel.dataset.panel === target);
        });
      });
    });
  }

  function bindActions() {
    byId("save-hub-meta")?.addEventListener("click", saveHubMeta);
    byId("save-hub-schedule")?.addEventListener("click", saveHubSchedule);

    byId("save-president")?.addEventListener("click", savePresident);
    byId("reset-president")?.addEventListener("click", resetPresidentForm);

    byId("save-economy")?.addEventListener("click", saveEconomy);
    byId("reset-economy")?.addEventListener("click", resetEconomyForm);

    byId("save-timeline")?.addEventListener("click", saveTimeline);
    byId("reset-timeline")?.addEventListener("click", resetTimelineForm);

    byId("save-law")?.addEventListener("click", saveLaw);
    byId("reset-law")?.addEventListener("click", resetLawForm);

    byId("save-potus-election")?.addEventListener("click", savePotusElection);
    byId("reset-potus-election")?.addEventListener("click", resetPotusForm);

    byId("save-congress-election")?.addEventListener("click", saveCongressElection);
    byId("reset-congress-election")?.addEventListener("click", resetCongressForm);
  }

  async function loadHubSettings() {
    const meta = await getSetting("hub_meta", {
      kicker: "APRP ARCHIVES",
      title: "American Political Roleplay Archive",
      summary: "Government, elections, economy, presidents, events, laws, and timeline records.",
      heroTitle: "APRP Archive",
      heroDescription: "Government, elections, economy, presidents, events, laws, and timeline records.",
      cycleLabel: "ACTIVE CYCLE"
    });

    const schedule = await getSetting("hub_schedule", []);

    setVal("hub-kicker-input", meta.kicker);
    setVal("hub-title-input", meta.title);
    setVal("hub-summary-input", meta.summary);
    setVal("hero-title-input", meta.heroTitle);
    setVal("hero-description-input", meta.heroDescription);
    setVal("hub-cycle-label-input", meta.cycleLabel);

    try {
      setVal("hub-schedule-json", JSON.stringify(schedule, null, 2));
    } catch {
      setVal("hub-schedule-json", "[]");
    }
  }

  async function saveHubMeta() {
    const statusEl = byId("hub-meta-status");
    setStatus(statusEl, "Saving hub settings...");

    try {
      const payload = {
        kicker: val("hub-kicker-input"),
        title: val("hub-title-input"),
        summary: val("hub-summary-input"),
        heroTitle: val("hero-title-input"),
        heroDescription: val("hero-description-input"),
        cycleLabel: val("hub-cycle-label-input")
      };

      await upsertSetting("hub_meta", payload);
      setStatus(statusEl, "Hub settings saved.", "success");
    } catch (error) {
      console.error(error);
      setStatus(statusEl, `Failed to save hub settings: ${error.message || error}`, "error");
    }
  }

  async function saveHubSchedule() {
    const statusEl = byId("hub-schedule-status");
    setStatus(statusEl, "Saving schedule JSON...");

    try {
      const raw = val("hub-schedule-json");
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        throw new Error("Schedule JSON must be an array.");
      }

      parsed.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          throw new Error(`Schedule item ${index + 1} must be an object.`);
        }
      });

      await upsertSetting("hub_schedule", parsed);
      setStatus(statusEl, "Schedule JSON saved.", "success");
    } catch (error) {
      console.error(error);
      setStatus(statusEl, `Failed to save schedule JSON: ${error.message || error}`, "error");
    }
  }

  async function loadPresidents() {
    const data = await fetchRows(TABLES.presidents, "president_number", false);
    state.records.presidents = data;
    renderPresidentRecords();
  }

  function renderPresidentRecords() {
    const container = byId("president-records");
    const rows = state.records.presidents;

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No president records yet.</div>`;
      return;
    }

    container.innerHTML = rows.map(row => `
      <article class="record-item">
        <div>
          <h3>#${escapeHtml(row.president_number || "—")} — ${escapeHtml(row.full_name || "Untitled President")}</h3>
          <div class="record-meta">
            <span class="meta-pill">${escapeHtml(row.party || "No party")}</span>
            <span class="meta-pill">${escapeHtml(row.term_start || "—")} — ${escapeHtml(row.term_end || "—")}</span>
            <span class="meta-pill">${escapeHtml(row.status || "No status")}</span>
          </div>
          <p>${escapeHtml(row.short_summary || row.full_summary || "No summary added.")}</p>
        </div>
        <div class="record-actions">
          <button class="record-btn edit" type="button" data-type="president" data-id="${row.id}">Edit</button>
          <button class="record-btn delete" type="button" data-type="president" data-id="${row.id}">Delete</button>
        </div>
      </article>
    `).join("");

    bindRecordButtons(container, {
      edit: editPresidentRecord,
      delete: deletePresidentRecord
    });
  }

  function editPresidentRecord(id) {
    const row = state.records.presidents.find(item => String(item.id) === String(id));
    if (!row) return;

    state.edit.president = row.id;
    setVal("pres-number", row.president_number);
    setVal("pres-slug", row.slug);
    setVal("pres-name", row.full_name);
    setVal("pres-party", row.party);
    setVal("pres-ideology", row.ideology);
    setVal("pres-term-start", row.term_start);
    setVal("pres-term-end", row.term_end);
    setVal("pres-status", row.status);
    setVal("pres-vp", row.vice_president);
    setVal("pres-fl", row.first_lady);
    setVal("pres-portrait", row.portrait_url);
    setVal("pres-short-summary", row.short_summary);
    setVal("pres-full-summary", row.full_summary);
    setVal("pres-accomplishments", row.major_accomplishments);
    setVal("pres-scandals", row.scandals);
    setStatus(byId("president-status"), "Editing president record.", "success");
  }

  async function deletePresidentRecord(id) {
    if (!confirm("Delete this president record?")) return;
    await deleteRow(TABLES.presidents, id, "president-status", loadPresidents);
  }

  async function savePresident() {
    const payload = {
      president_number: numberOrNull(val("pres-number")),
      slug: val("pres-slug"),
      full_name: val("pres-name"),
      party: val("pres-party"),
      ideology: val("pres-ideology"),
      term_start: val("pres-term-start"),
      term_end: val("pres-term-end"),
      status: val("pres-status"),
      vice_president: val("pres-vp"),
      first_lady: val("pres-fl"),
      portrait_url: val("pres-portrait"),
      short_summary: val("pres-short-summary"),
      full_summary: val("pres-full-summary"),
      major_accomplishments: val("pres-accomplishments"),
      scandals: val("pres-scandals")
    };

    await saveRow(TABLES.presidents, payload, state.edit.president, "president-status", async () => {
      resetPresidentForm();
      await loadPresidents();
    });
  }

  function resetPresidentForm() {
    state.edit.president = null;
    [
      "pres-number", "pres-slug", "pres-name", "pres-party", "pres-ideology",
      "pres-term-start", "pres-term-end", "pres-status", "pres-vp", "pres-fl",
      "pres-portrait", "pres-short-summary", "pres-full-summary",
      "pres-accomplishments", "pres-scandals"
    ].forEach(id => setVal(id, ""));
    setStatus(byId("president-status"), "Form cleared.");
  }

  async function loadEconomy() {
    const data = await fetchRows(TABLES.economy, "year", false);
    state.records.economy = data.sort((a, b) => {
      const by = Number(b.year || 0);
      const ay = Number(a.year || 0);
      const bm = Number(b.month || 0);
      const am = Number(a.month || 0);
      return by - ay || bm - am;
    });
    renderEconomyRecords();
  }

  function renderEconomyRecords() {
    const container = byId("economy-records");
    const rows = state.records.economy;

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No economy snapshots yet.</div>`;
      return;
    }

    container.innerHTML = rows.map(row => `
      <article class="record-item">
        <div>
          <h3>${escapeHtml(row.label || `${row.year || ""}${row.month ? ` / ${row.month}` : ""}` || "Economy Snapshot")}</h3>
          <div class="record-meta">
            <span class="meta-pill">${escapeHtml(row.period_type || "snapshot")}</span>
            <span class="meta-pill">GDP ${escapeHtml(row.gdp_billions ?? "—")}B</span>
            <span class="meta-pill">Growth ${escapeHtml(row.gdp_growth ?? "—")}%</span>
            <span class="meta-pill">${String(row.is_current).toLowerCase() === "true" || row.is_current === true ? "Current" : "Archive"}</span>
          </div>
          <p>${escapeHtml(row.summary || "No summary added.")}</p>
        </div>
        <div class="record-actions">
          <button class="record-btn edit" type="button" data-type="economy" data-id="${row.id}">Edit</button>
          <button class="record-btn delete" type="button" data-type="economy" data-id="${row.id}">Delete</button>
        </div>
      </article>
    `).join("");

    bindRecordButtons(container, {
      edit: editEconomyRecord,
      delete: deleteEconomyRecord
    });
  }

  function editEconomyRecord(id) {
    const row = state.records.economy.find(item => String(item.id) === String(id));
    if (!row) return;

    state.edit.economy = row.id;
    setVal("econ-period-type", row.period_type);
    setVal("econ-year", row.year);
    setVal("econ-month", row.month);
    setVal("econ-label", row.label);
    setVal("econ-current", row.is_current);
    setVal("econ-gdp", row.gdp_billions);
    setVal("econ-growth", row.gdp_growth);
    setVal("econ-unemployment", row.unemployment);
    setVal("econ-inflation", row.inflation);
    setVal("econ-debt", row.debt_billions);
    setVal("econ-deficit", row.deficit_billions);
    setVal("econ-interest-rate", row.interest_rate);
    setVal("econ-defense-pct", row.defense_pct_gdp);
    setVal("econ-stock-index", row.stock_market_index);
    setVal("econ-oil-price", row.oil_price);
    setVal("econ-approval", row.potus_approval);
    setVal("econ-job-creation", row.job_creation);
    setVal("econ-median-wage", row.median_wage);
    setVal("econ-summary", row.summary);
    setVal("econ-chart-json", formatJsonValue(row.chart_json));
    setStatus(byId("economy-status"), "Editing economy record.", "success");
  }

  async function deleteEconomyRecord(id) {
    if (!confirm("Delete this economy record?")) return;
    await deleteRow(TABLES.economy, id, "economy-status", loadEconomy);
  }

  async function saveEconomy() {
    const payload = {
      period_type: val("econ-period-type"),
      year: numberOrNull(val("econ-year")),
      month: numberOrNull(val("econ-month")),
      label: val("econ-label"),
      is_current: parseLooseBoolean(val("econ-current")),
      gdp_billions: numberOrNull(val("econ-gdp")),
      gdp_growth: numberOrNull(val("econ-growth")),
      unemployment: numberOrNull(val("econ-unemployment")),
      inflation: numberOrNull(val("econ-inflation")),
      debt_billions: numberOrNull(val("econ-debt")),
      deficit_billions: numberOrNull(val("econ-deficit")),
      interest_rate: numberOrNull(val("econ-interest-rate")),
      defense_pct_gdp: numberOrNull(val("econ-defense-pct")),
      stock_market_index: numberOrNull(val("econ-stock-index")),
      oil_price: numberOrNull(val("econ-oil-price")),
      potus_approval: numberOrNull(val("econ-approval")),
      job_creation: numberOrNull(val("econ-job-creation")),
      median_wage: numberOrNull(val("econ-median-wage")),
      summary: val("econ-summary"),
      chart_json: parseJsonOrNull(val("econ-chart-json"))
    };

    await saveRow(TABLES.economy, payload, state.edit.economy, "economy-status", async () => {
      resetEconomyForm();
      await loadEconomy();
    });
  }

  function resetEconomyForm() {
    state.edit.economy = null;
    [
      "econ-period-type", "econ-year", "econ-month", "econ-label", "econ-current",
      "econ-gdp", "econ-growth", "econ-unemployment", "econ-inflation",
      "econ-debt", "econ-deficit", "econ-interest-rate", "econ-defense-pct",
      "econ-stock-index", "econ-oil-price", "econ-approval", "econ-job-creation",
      "econ-median-wage", "econ-summary", "econ-chart-json"
    ].forEach(id => setVal(id, ""));
    setStatus(byId("economy-status"), "Form cleared.");
  }

  async function loadTimeline() {
    const data = await fetchRows(TABLES.timeline, "year", false);
    state.records.timeline = data.sort((a, b) => {
      const by = Number(b.year || 0);
      const ay = Number(a.year || 0);
      const bm = Number(b.month || 0);
      const am = Number(a.month || 0);
      const bd = Number(b.day || 0);
      const ad = Number(a.day || 0);
      return by - ay || bm - am || bd - ad;
    });
    renderTimelineRecords();
  }

  function renderTimelineRecords() {
    const container = byId("timeline-records");
    const rows = state.records.timeline;

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No timeline records yet.</div>`;
      return;
    }

    container.innerHTML = rows.map(row => `
      <article class="record-item">
        <div>
          <h3>${escapeHtml(row.title || "Untitled Event")}</h3>
          <div class="record-meta">
            <span class="meta-pill">${escapeHtml(row.date_label || [row.month, row.day, row.year].filter(Boolean).join(" "))}</span>
            <span class="meta-pill">${escapeHtml(row.category || "general")}</span>
            <span class="meta-pill">Importance ${escapeHtml(row.importance ?? "—")}</span>
          </div>
          <p>${escapeHtml(row.short_summary || row.full_body || "No summary added.")}</p>
        </div>
        <div class="record-actions">
          <button class="record-btn edit" type="button" data-type="timeline" data-id="${row.id}">Edit</button>
          <button class="record-btn delete" type="button" data-type="timeline" data-id="${row.id}">Delete</button>
        </div>
      </article>
    `).join("");

    bindRecordButtons(container, {
      edit: editTimelineRecord,
      delete: deleteTimelineRecord
    });
  }

  function editTimelineRecord(id) {
    const row = state.records.timeline.find(item => String(item.id) === String(id));
    if (!row) return;

    state.edit.timeline = row.id;
    setVal("timeline-title", row.title);
    setVal("timeline-slug", row.slug);
    setVal("timeline-year", row.year);
    setVal("timeline-month", row.month);
    setVal("timeline-day", row.day);
    setVal("timeline-date-label", row.date_label);
    setVal("timeline-category", row.category);
    setVal("timeline-importance", row.importance);
    setVal("timeline-short-summary", row.short_summary);
    setVal("timeline-full-body", row.full_body);
    setStatus(byId("timeline-status"), "Editing timeline record.", "success");
  }

  async function deleteTimelineRecord(id) {
    if (!confirm("Delete this timeline record?")) return;
    await deleteRow(TABLES.timeline, id, "timeline-status", loadTimeline);
  }

  async function saveTimeline() {
    const payload = {
      title: val("timeline-title"),
      slug: val("timeline-slug"),
      year: numberOrNull(val("timeline-year")),
      month: numberOrNull(val("timeline-month")),
      day: numberOrNull(val("timeline-day")),
      date_label: val("timeline-date-label"),
      category: val("timeline-category"),
      importance: numberOrNull(val("timeline-importance")),
      short_summary: val("timeline-short-summary"),
      full_body: val("timeline-full-body")
    };

    await saveRow(TABLES.timeline, payload, state.edit.timeline, "timeline-status", async () => {
      resetTimelineForm();
      await loadTimeline();
    });
  }

  function resetTimelineForm() {
    state.edit.timeline = null;
    [
      "timeline-title", "timeline-slug", "timeline-year", "timeline-month",
      "timeline-day", "timeline-date-label", "timeline-category",
      "timeline-importance", "timeline-short-summary", "timeline-full-body"
    ].forEach(id => setVal(id, ""));
    setStatus(byId("timeline-status"), "Form cleared.");
  }

  async function loadLaws() {
    const data = await fetchRows(TABLES.laws, "year", false);
    state.records.laws = data;
    renderLawRecords();
  }

  function renderLawRecords() {
    const container = byId("law-records");
    const rows = state.records.laws;

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No law records yet.</div>`;
      return;
    }

    container.innerHTML = rows.map(row => `
      <article class="record-item">
        <div>
          <h3>${escapeHtml(row.title || "Untitled Law")}</h3>
          <div class="record-meta">
            <span class="meta-pill">${escapeHtml(row.citation || "No citation")}</span>
            <span class="meta-pill">${escapeHtml(row.status || "No status")}</span>
            <span class="meta-pill">${escapeHtml(row.date_signed || row.year || "No date")}</span>
          </div>
          <p>${escapeHtml(row.summary || "No summary added.")}</p>
        </div>
        <div class="record-actions">
          <button class="record-btn edit" type="button" data-type="law" data-id="${row.id}">Edit</button>
          <button class="record-btn delete" type="button" data-type="law" data-id="${row.id}">Delete</button>
        </div>
      </article>
    `).join("");

    bindRecordButtons(container, {
      edit: editLawRecord,
      delete: deleteLawRecord
    });
  }

  function editLawRecord(id) {
    const row = state.records.laws.find(item => String(item.id) === String(id));
    if (!row) return;

    state.edit.law = row.id;
    setVal("law-title", row.title);
    setVal("law-short-title", row.short_title);
    setVal("law-citation", row.citation);
    setVal("law-author", row.author);
    setVal("law-subject", row.subject);
    setVal("law-funding", row.funding);
    setVal("law-date-signed", row.date_signed);
    setVal("law-year", row.year);
    setVal("law-link", row.bill_link);
    setVal("law-status", row.status);
    setVal("law-summary", row.summary);
    setStatus(byId("law-status-text"), "Editing law record.", "success");
  }

  async function deleteLawRecord(id) {
    if (!confirm("Delete this law record?")) return;
    await deleteRow(TABLES.laws, id, "law-status-text", loadLaws);
  }

  async function saveLaw() {
    const payload = {
      title: val("law-title"),
      short_title: val("law-short-title"),
      citation: val("law-citation"),
      author: val("law-author"),
      subject: val("law-subject"),
      funding: val("law-funding"),
      date_signed: val("law-date-signed"),
      year: numberOrNull(val("law-year")),
      bill_link: val("law-link"),
      status: val("law-status"),
      summary: val("law-summary")
    };

    await saveRow(TABLES.laws, payload, state.edit.law, "law-status-text", async () => {
      resetLawForm();
      await loadLaws();
    });
  }

  function resetLawForm() {
    state.edit.law = null;
    [
      "law-title", "law-short-title", "law-citation", "law-author",
      "law-subject", "law-funding", "law-date-signed", "law-year",
      "law-link", "law-status", "law-summary"
    ].forEach(id => setVal(id, ""));
    setStatus(byId("law-status-text"), "Form cleared.");
  }

  async function loadPotusElections() {
    const data = await fetchRows(TABLES.potus, "year", false);
    state.records.potus = data;
    renderPotusRecords();
  }

  function renderPotusRecords() {
    const container = byId("potus-records");
    const rows = state.records.potus;

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No POTUS election records yet.</div>`;
      return;
    }

    container.innerHTML = rows.map(row => `
      <article class="record-item">
        <div>
          <h3>${escapeHtml(row.title || `POTUS ${row.year || ""}`)}</h3>
          <div class="record-meta">
            <span class="meta-pill">${escapeHtml(row.year || "No year")}</span>
            <span class="meta-pill">${row.map_url ? "Map URL set" : "No map URL"}</span>
          </div>
          <p>${escapeHtml(row.summary || "No summary added.")}</p>
        </div>
        <div class="record-actions">
          <button class="record-btn edit" type="button" data-type="potus" data-id="${row.id}">Edit</button>
          <button class="record-btn delete" type="button" data-type="potus" data-id="${row.id}">Delete</button>
        </div>
      </article>
    `).join("");

    bindRecordButtons(container, {
      edit: editPotusRecord,
      delete: deletePotusRecord
    });
  }

  function editPotusRecord(id) {
    const row = state.records.potus.find(item => String(item.id) === String(id));
    if (!row) return;

    state.edit.potus = row.id;
    setVal("potus-year", row.year);
    setVal("potus-slug", row.slug);
    setVal("potus-title", row.title);
    setVal("potus-map-url", row.map_url);
    setVal("potus-summary", row.summary);
    setVal("potus-results-json", formatJsonValue(row.results_json));
    setStatus(byId("potus-status"), "Editing POTUS election record.", "success");
  }

  async function deletePotusRecord(id) {
    if (!confirm("Delete this POTUS election record?")) return;
    await deleteRow(TABLES.potus, id, "potus-status", loadPotusElections);
  }

  async function savePotusElection() {
    const payload = {
      year: numberOrNull(val("potus-year")),
      slug: val("potus-slug"),
      title: val("potus-title"),
      map_url: val("potus-map-url"),
      summary: val("potus-summary"),
      results_json: parseJsonOrNull(val("potus-results-json"))
    };

    await saveRow(TABLES.potus, payload, state.edit.potus, "potus-status", async () => {
      resetPotusForm();
      await loadPotusElections();
    });
  }

  function resetPotusForm() {
    state.edit.potus = null;
    [
      "potus-year", "potus-slug", "potus-title",
      "potus-map-url", "potus-summary", "potus-results-json"
    ].forEach(id => setVal(id, ""));
    setStatus(byId("potus-status"), "Form cleared.");
  }

  async function loadCongressElections() {
    const data = await fetchRows(TABLES.congress, "year", false);
    state.records.congress = data;
    renderCongressRecords();
  }

  function renderCongressRecords() {
    const container = byId("congress-records");
    const rows = state.records.congress;

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No Congress election records yet.</div>`;
      return;
    }

    container.innerHTML = rows.map(row => `
      <article class="record-item">
        <div>
          <h3>${escapeHtml(row.title || `Congress ${row.year || ""}`)}</h3>
          <div class="record-meta">
            <span class="meta-pill">${escapeHtml(row.year || "No year")}</span>
            <span class="meta-pill">${row.control_chart_json ? "Control chart set" : "No control chart"}</span>
          </div>
          <p>${escapeHtml(row.summary || "No summary added.")}</p>
        </div>
        <div class="record-actions">
          <button class="record-btn edit" type="button" data-type="congress" data-id="${row.id}">Edit</button>
          <button class="record-btn delete" type="button" data-type="congress" data-id="${row.id}">Delete</button>
        </div>
      </article>
    `).join("");

    bindRecordButtons(container, {
      edit: editCongressRecord,
      delete: deleteCongressRecord
    });
  }

  function editCongressRecord(id) {
    const row = state.records.congress.find(item => String(item.id) === String(id));
    if (!row) return;

    state.edit.congress = row.id;
    setVal("congress-year", row.year);
    setVal("congress-slug", row.slug);
    setVal("congress-title", row.title);
    setVal("congress-summary", row.summary);
    setVal("congress-chart-json", formatJsonValue(row.control_chart_json));
    setVal("congress-results-json", formatJsonValue(row.results_json));
    setStatus(byId("congress-status"), "Editing Congress election record.", "success");
  }

  async function deleteCongressRecord(id) {
    if (!confirm("Delete this Congress election record?")) return;
    await deleteRow(TABLES.congress, id, "congress-status", loadCongressElections);
  }

  async function saveCongressElection() {
    const payload = {
      year: numberOrNull(val("congress-year")),
      slug: val("congress-slug"),
      title: val("congress-title"),
      summary: val("congress-summary"),
      control_chart_json: parseJsonOrNull(val("congress-chart-json")),
      results_json: parseJsonOrNull(val("congress-results-json"))
    };

    await saveRow(TABLES.congress, payload, state.edit.congress, "congress-status", async () => {
      resetCongressForm();
      await loadCongressElections();
    });
  }

  function resetCongressForm() {
    state.edit.congress = null;
    [
      "congress-year", "congress-slug", "congress-title",
      "congress-summary", "congress-chart-json", "congress-results-json"
    ].forEach(id => setVal(id, ""));
    setStatus(byId("congress-status"), "Form cleared.");
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

  async function upsertSetting(settingKey, settingValue) {
    const { error } = await supabase
      .from(TABLES.settings)
      .upsert(
        {
          setting_key: settingKey,
          setting_value: settingValue,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "setting_key"
        }
      );

    if (error) throw error;
  }

  async function fetchRows(table, orderBy, ascending = true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderBy, { ascending });

    if (error) {
      if (/does not exist/i.test(error.message || "")) {
        return [];
      }
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async function saveRow(table, payload, editId, statusId, onSuccess) {
    const statusEl = typeof statusId === "string" ? byId(statusId) : statusId;
    setStatus(statusEl, "Saving...");

    try {
      let error;

      if (editId) {
        ({ error } = await supabase.from(table).update(payload).eq("id", editId));
      } else {
        ({ error } = await supabase.from(table).insert(payload));
      }

      if (error) throw error;

      setStatus(statusEl, "Saved successfully.", "success");
      if (typeof onSuccess === "function") await onSuccess();
    } catch (error) {
      console.error(error);
      setStatus(statusEl, `Save failed: ${error.message || error}`, "error");
    }
  }

  async function deleteRow(table, id, statusId, reloadFn) {
    const statusEl = typeof statusId === "string" ? byId(statusId) : statusId;
    setStatus(statusEl, "Deleting...");

    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;

      setStatus(statusEl, "Deleted successfully.", "success");
      if (typeof reloadFn === "function") await reloadFn();
    } catch (error) {
      console.error(error);
      setStatus(statusEl, `Delete failed: ${error.message || error}`, "error");
    }
  }

  function bindRecordButtons(container, handlers) {
    container.querySelectorAll("[data-type][data-id]").forEach(button => {
      const id = button.dataset.id;
      if (button.classList.contains("edit")) {
        button.onclick = () => handlers.edit(id);
      }
      if (button.classList.contains("delete")) {
        button.onclick = () => handlers.delete(id);
      }
    });
  }

  function val(id) {
    return (byId(id)?.value || "").trim();
  }

  function setVal(id, value) {
    const el = byId(id);
    if (!el) return;
    el.value = value ?? "";
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(el, message, type = "") {
    if (!el) return;
    el.textContent = message || "";
    el.className = "status-text" + (type ? ` ${type}` : "");
  }

  function parseLooseBoolean(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return false;
    return ["true", "1", "yes", "y"].includes(normalized);
  }

  function numberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  function parseJsonOrNull(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;
    return JSON.parse(text);
  }

  function formatJsonValue(value) {
    if (!value) return "";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
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
