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
    lawList: document.getElementById("law-list")
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

      const [presRes, ecoRes, eventsRes, lawsRes] = await Promise.all([
        supabase.from("president_entries").select("*").order("display_order", { ascending: true }),
        supabase.from("economy_snapshots").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
        supabase.from("timeline_events").select("*").order("year", { ascending: false }).order("month", { ascending: false }).order("day", { ascending: false }),
        supabase.from("laws").select("*").order("year", { ascending: false })
      ]);

      if (presRes.error) throw presRes.error;
      if (ecoRes.error) throw ecoRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (lawsRes.error) throw lawsRes.error;

      renderPresidents(presRes.data || []);
      renderEconomy(ecoRes.data || []);
      renderEvents(eventsRes.data || []);
      renderLaws(lawsRes.data || []);

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

      const { error } = await supabase
        .from("president_entries")
        .upsert(payload, { onConflict: "slug" });

      if (error) throw error;

      showSuccess("President saved.");
      clearPresidentForm();
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
        updated_at: new Date().toISOString()
      };

      if (!payload.year) throw new Error("Economy year is required.");

      if (payload.is_current) {
        await supabase
          .from("economy_snapshots")
          .update({ is_current: false })
          .eq("period_type", "current");
      }

      const { error } = await supabase.from("economy_snapshots").insert(payload);
      if (error) throw error;

      showSuccess("Economy snapshot saved.");
      clearEconomyForm();
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

      const { error } = await supabase
        .from("timeline_events")
        .upsert(payload, { onConflict: "slug" });

      if (error) throw error;

      showSuccess("Timeline event saved.");
      clearEventForm();
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
      clearLawForm();
      await loadData();
    } catch (err) {
      showError("Could not save law. " + (err.message || err));
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
        <span>${esc(e.period_type)} • GDP ${money(e.gdp)} • Growth ${pct(e.gdp_growth)} • Unemployment ${pct(e.unemployment)}</span>
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

  function clearPresidentForm() {
    [
      "pres-number", "pres-slug", "pres-name", "pres-party", "pres-ideology",
      "pres-term-start", "pres-term-end", "pres-vp", "pres-first-lady",
      "pres-portrait", "pres-status", "pres-summary", "pres-full",
      "pres-accomplishments", "pres-scandals"
    ].forEach(id => setVal(id, ""));
  }

  function clearEconomyForm() {
    [
      "eco-period-type", "eco-year", "eco-month", "eco-label", "eco-current",
      "eco-gdp", "eco-growth", "eco-unemployment", "eco-inflation",
      "eco-debt", "eco-deficit", "eco-summary"
    ].forEach(id => setVal(id, ""));
  }

  function clearEventForm() {
    [
      "event-title", "event-slug", "event-year", "event-month", "event-day",
      "event-date-label", "event-category", "event-importance",
      "event-summary", "event-body"
    ].forEach(id => setVal(id, ""));
  }

  function clearLawForm() {
    [
      "law-title", "law-short", "law-citation", "law-author", "law-subject",
      "law-funding", "law-date", "law-year", "law-link", "law-status",
      "law-summary"
    ].forEach(id => setVal(id, ""));
  }

  function val(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
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
