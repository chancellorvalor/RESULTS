(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const ACCESS_CODE = "39333349";
  const STORAGE_KEY = "aprp_archive_control_unlocked";

  const els = {
    loginGate: document.getElementById("login-gate"),
    loginCode: document.getElementById("login-code"),
    loginSubmit: document.getElementById("login-submit"),
    loginError: document.getElementById("login-error"),

    error: document.getElementById("error-box"),
    success: document.getElementById("success-box"),
    refresh: document.getElementById("refresh-data"),

    tabs: document.querySelectorAll(".tab-btn"),
    panels: document.querySelectorAll(".tab-panel"),

    savePresident: document.getElementById("save-president"),
    presidentList: document.getElementById("president-list"),

    saveEconomy: document.getElementById("save-economy"),
    economyList: document.getElementById("economy-list"),

    saveEvent: document.getElementById("save-event"),
    eventList: document.getElementById("event-list"),

    saveLaw: document.getElementById("save-law"),
    lawList: document.getElementById("law-list"),

    savePotusElection: document.getElementById("save-potus-election"),
    potusElectionList: document.getElementById("potus-election-list"),

    saveCongressElection: document.getElementById("save-congress-election"),
    congressElectionList: document.getElementById("congress-election-list")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const unlocked = setupLoginGate();
    if (!unlocked) return;
    wireEvents();
    await loadData();
  }

  function setupLoginGate() {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      els.loginGate.classList.add("hidden");
      return true;
    }

    els.loginGate.classList.remove("hidden");

    const tryLogin = () => {
      if (els.loginCode.value.trim() === ACCESS_CODE) {
        sessionStorage.setItem(STORAGE_KEY, "true");
        els.loginGate.classList.add("hidden");
        wireEvents();
        loadData();
        return true;
      }

      els.loginError.classList.remove("hidden");
      els.loginCode.value = "";
      els.loginCode.focus();
      return false;
    };

    els.loginSubmit.onclick = tryLogin;
    els.loginCode.addEventListener("keydown", e => {
      if (e.key === "Enter") tryLogin();
    });

    setTimeout(() => els.loginCode.focus(), 100);
    return false;
  }

  function wireEvents() {
    els.refresh.onclick = loadData;
    els.savePresident.onclick = savePresident;
    els.saveEconomy.onclick = saveEconomy;
    els.saveEvent.onclick = saveEvent;
    els.saveLaw.onclick = saveLaw;
    els.savePotusElection.onclick = savePotusElection;
    els.saveCongressElection.onclick = saveCongressElection;

    els.tabs.forEach(btn => {
      btn.onclick = () => switchTab(btn.dataset.tab);
    });
  }

  function switchTab(tab) {
    els.tabs.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
    els.panels.forEach(panel => panel.classList.toggle("active", panel.id === `tab-${tab}`));
  }

  async function loadData() {
    try {
      hideBoxes();

      const [presRes, ecoRes, eventsRes, lawsRes, potusRes, congressRes] = await Promise.all([
        supabase.from("president_entries").select("*").order("display_order", { ascending: true }),
        supabase.from("economy_snapshots").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
        supabase.from("timeline_events").select("*").order("year", { ascending: false }).order("month", { ascending: false }).order("day", { ascending: false }),
        supabase.from("laws").select("*").order("year", { ascending: false }),
        supabase.from("potus_election_archives").select("*").order("year", { ascending: false }),
        supabase.from("congress_election_archives").select("*").order("year", { ascending: false })
      ]);

      throwIf(presRes);
      throwIf(ecoRes);
      throwIf(eventsRes);
      throwIf(lawsRes);
      throwIf(potusRes);
      throwIf(congressRes);

      renderPresidents(presRes.data || []);
      renderEconomy(ecoRes.data || []);
      renderEvents(eventsRes.data || []);
      renderLaws(lawsRes.data || []);
      renderPotusElections(potusRes.data || []);
      renderCongressElections(congressRes.data || []);

      showSuccess("Archive data loaded.");
    } catch (err) {
      showError("Could not load archive control data. " + (err.message || err));
    }
  }

  async function savePresident() {
    try {
      hideBoxes();

      const slug = val("pres-slug");
      if (!slug) throw new Error("President slug is required.");
      if (!val("pres-name")) throw new Error("President full name is required.");

      const payload = {
        number: numberOrNull("pres-number"),
        slug,
        full_name: val("pres-name"),
        party: val("pres-party"),
        ideology: val("pres-ideology"),
        term_start: val("pres-term-start"),
        term_end: val("pres-term-end"),
        vice_president: val("pres-vp"),
        first_lady: val("pres-first-lady"),
        portrait_url: val("pres-portrait"),
        status: val("pres-status") || "former",
        short_summary: val("pres-summary"),
        full_summary: val("pres-full"),
        major_accomplishments: val("pres-accomplishments"),
        scandals: val("pres-scandals"),
        display_order: numberOrNull("pres-number") || 0,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("president_entries").upsert(payload, { onConflict: "slug" });
      if (error) throw error;

      showSuccess("President saved.");
      clearFields(["pres-number","pres-slug","pres-name","pres-party","pres-ideology","pres-term-start","pres-term-end","pres-vp","pres-first-lady","pres-portrait","pres-status","pres-summary","pres-full","pres-accomplishments","pres-scandals"]);
      await loadData();
    } catch (err) {
      showError("Could not save president. " + (err.message || err));
    }
  }

  async function saveEconomy() {
    try {
      hideBoxes();

      const payload = {
        period_type: val("eco-period-type") || "yearly",
        year: numberOrNull("eco-year"),
        month: numberOrNull("eco-month"),
        label: val("eco-label"),
        is_current: val("eco-current").toLowerCase() === "true",
        gdp: numberOrNull("eco-gdp"),
        gdp_growth: numberOrNull("eco-growth"),
        unemployment: numberOrNull("eco-unemployment"),
        inflation: numberOrNull("eco-inflation"),
        debt: numberOrNull("eco-debt"),
        deficit: numberOrNull("eco-deficit"),
        summary: val("eco-summary"),
        chart_json: parseJsonField("eco-chart-json"),
        updated_at: new Date().toISOString()
      };

      if (!payload.year) throw new Error("Economy year is required.");

      const { error } = await supabase.from("economy_snapshots").insert(payload);
      if (error) throw error;

      showSuccess("Economy snapshot saved.");
      clearFields(["eco-period-type","eco-year","eco-month","eco-label","eco-current","eco-gdp","eco-growth","eco-unemployment","eco-inflation","eco-debt","eco-deficit","eco-summary","eco-chart-json"]);
      await loadData();
    } catch (err) {
      showError("Could not save economy snapshot. " + (err.message || err));
    }
  }

  async function saveEvent() {
    try {
      hideBoxes();

      const slug = val("event-slug");
      if (!slug) throw new Error("Event slug is required.");
      if (!val("event-title")) throw new Error("Event title is required.");

      const payload = {
        title: val("event-title"),
        slug,
        year: numberOrNull("event-year"),
        month: numberOrNull("event-month"),
        day: numberOrNull("event-day"),
        date_label: val("event-date-label"),
        category: val("event-category") || "general",
        importance: numberOrNull("event-importance") || 0,
        summary: val("event-summary"),
        body: val("event-body"),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("timeline_events").upsert(payload, { onConflict: "slug" });
      if (error) throw error;

      showSuccess("Timeline event saved.");
      clearFields(["event-title","event-slug","event-year","event-month","event-day","event-date-label","event-category","event-importance","event-summary","event-body"]);
      await loadData();
    } catch (err) {
      showError("Could not save event. " + (err.message || err));
    }
  }

  async function saveLaw() {
    try {
      hideBoxes();

      if (!val("law-title")) throw new Error("Law title is required.");

      const payload = {
        title: val("law-title"),
        short_title: val("law-short"),
        citation: val("law-citation"),
        author: val("law-author"),
        subject: val("law-subject"),
        funding: val("law-funding"),
        date_signed: val("law-date"),
        year: numberOrNull("law-year"),
        link_url: val("law-link"),
        status: val("law-status") || "signed",
        summary: val("law-summary"),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("laws").insert(payload);
      if (error) throw error;

      showSuccess("Law saved.");
      clearFields(["law-title","law-short","law-citation","law-author","law-subject","law-funding","law-date","law-year","law-link","law-status","law-summary"]);
      await loadData();
    } catch (err) {
      showError("Could not save law. " + (err.message || err));
    }
  }

  async function savePotusElection() {
    try {
      hideBoxes();

      const slug = val("potus-slug");
      if (!slug) throw new Error("POTUS election slug is required.");
      if (!val("potus-title")) throw new Error("POTUS election title is required.");

      const payload = {
        slug,
        year: numberOrNull("potus-year"),
        title: val("potus-title"),
        winner_name: val("potus-winner-name"),
        winner_party: val("potus-winner-party"),
        winner_ev: numberOrNull("potus-winner-ev") || 0,
        runner_up_name: val("potus-runner-name"),
        runner_up_party: val("potus-runner-party"),
        runner_up_ev: numberOrNull("potus-runner-ev") || 0,
        popular_vote_summary: val("potus-popular-summary"),
        map_url: val("potus-map-url"),
        summary: val("potus-summary"),
        state_results_json: parseJsonField("potus-state-json"),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("potus_election_archives").upsert(payload, { onConflict: "slug" });
      if (error) throw error;

      showSuccess("POTUS election archive saved.");
      clearFields(["potus-slug","potus-year","potus-title","potus-winner-name","potus-winner-party","potus-winner-ev","potus-runner-name","potus-runner-party","potus-runner-ev","potus-popular-summary","potus-map-url","potus-summary","potus-state-json"]);
      await loadData();
    } catch (err) {
      showError("Could not save POTUS election. " + (err.message || err));
    }
  }

  async function saveCongressElection() {
    try {
      hideBoxes();

      const slug = val("cong-slug");
      if (!slug) throw new Error("Congress election slug is required.");
      if (!val("cong-title")) throw new Error("Congress election title is required.");

      const payload = {
        slug,
        year: numberOrNull("cong-year"),
        title: val("cong-title"),
        election_type: val("cong-type") || "midterm",
        house_control: val("cong-house-control"),
        senate_control: val("cong-senate-control"),
        governor_control: val("cong-governor-control"),
        house_summary: val("cong-house-summary"),
        senate_summary: val("cong-senate-summary"),
        map_url: val("cong-map-url"),
        control_json: parseJsonField("cong-control-json"),
        summary: val("cong-summary"),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("congress_election_archives").upsert(payload, { onConflict: "slug" });
      if (error) throw error;

      showSuccess("Congress election archive saved.");
      clearFields(["cong-slug","cong-year","cong-title","cong-type","cong-house-control","cong-senate-control","cong-governor-control","cong-map-url","cong-house-summary","cong-senate-summary","cong-summary","cong-control-json"]);
      await loadData();
    } catch (err) {
      showError("Could not save Congress election. " + (err.message || err));
    }
  }

  function renderPresidents(rows) {
    els.presidentList.innerHTML = rows.map(p => `
      <div class="item-row">
        <strong>#${esc(p.number || "")} ${esc(p.full_name)}</strong>
        <span>${esc(p.party || "")} • ${esc(p.term_start || "")}${p.term_end ? "–" + esc(p.term_end) : ""} • ${esc(p.status || "")}</span>
      </div>
    `).join("") || `<p class="muted">No presidents yet.</p>`;
  }

  function renderEconomy(rows) {
    els.economyList.innerHTML = rows.map(e => `
      <div class="item-row">
        <strong>${esc(e.label || `${e.year}${e.month ? "-" + e.month : ""}`)}</strong>
        <span>${esc(e.period_type)} • GDP ${money(e.gdp)} • Growth ${pct(e.gdp_growth)} • Charts: ${chartCount(e.chart_json)}</span>
      </div>
    `).join("") || `<p class="muted">No economy snapshots yet.</p>`;
  }

  function renderEvents(rows) {
    els.eventList.innerHTML = rows.map(e => `
      <div class="item-row">
        <strong>${esc(e.title)}</strong>
        <span>${esc(e.date_label || e.year || "")} • ${esc(e.category || "")} • Importance ${esc(e.importance || 0)}</span>
      </div>
    `).join("") || `<p class="muted">No events yet.</p>`;
  }

  function renderLaws(rows) {
    els.lawList.innerHTML = rows.map(l => `
      <div class="item-row">
        <strong>${esc(l.title)}</strong>
        <span>${esc(l.date_signed || l.year || "")} • ${esc(l.status || "")} • ${esc(l.funding || "")}</span>
      </div>
    `).join("") || `<p class="muted">No laws yet.</p>`;
  }

  function renderPotusElections(rows) {
    els.potusElectionList.innerHTML = rows.map(e => `
      <div class="item-row">
        <strong>${esc(e.year)} — ${esc(e.title)}</strong>
        <span>${esc(e.winner_name)} ${esc(e.winner_ev)} EV defeated ${esc(e.runner_up_name)} ${esc(e.runner_up_ev)} EV</span>
      </div>
    `).join("") || `<p class="muted">No POTUS election archives yet.</p>`;
  }

  function renderCongressElections(rows) {
    els.congressElectionList.innerHTML = rows.map(e => `
      <div class="item-row">
        <strong>${esc(e.year)} — ${esc(e.title)}</strong>
        <span>House: ${esc(e.house_control)} • Senate: ${esc(e.senate_control)} • Governors: ${esc(e.governor_control)}</span>
      </div>
    `).join("") || `<p class="muted">No Congress election archives yet.</p>`;
  }

  function parseJsonField(id) {
    const raw = val(id);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`${id} contains invalid JSON.`);
    }
  }

  function chartCount(chartJson) {
    const charts = chartJson?.charts;
    return Array.isArray(charts) ? charts.length : 0;
  }

  function throwIf(res) {
    if (res.error) throw res.error;
  }

  function clearFields(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  function val(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function numberOrNull(id) {
    const v = val(id);
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function money(n) {
    if (n === null || n === undefined || n === "") return "—";
    return "$" + Number(n).toLocaleString() + "B";
  }

  function pct(n) {
    if (n === null || n === undefined || n === "") return "—";
    return Number(n).toFixed(1) + "%";
  }

  function showError(msg) {
    els.error.textContent = msg;
    els.error.classList.remove("hidden");
    els.success.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess(msg) {
    els.success.textContent = msg;
    els.success.classList.remove("hidden");
    els.error.classList.add("hidden");
  }

  function hideBoxes() {
    els.error.classList.add("hidden");
    els.success.classList.add("hidden");
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
