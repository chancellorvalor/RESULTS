(() => {
  const ACCESS_CODE = "39333349";

  const cfg = window.APRP_CONFIG || {};
  const supabaseUrl = cfg.supabaseUrl;
  const supabaseKey = cfg.supabaseAnonKey;

  let supabase = null;
  let presidents = [];
  let activeId = null;

  const els = {
    loginScreen: document.getElementById("login-screen"),
    appShell: document.getElementById("app-shell"),
    accessCode: document.getElementById("access-code"),
    unlockBtn: document.getElementById("unlock-btn"),
    loginError: document.getElementById("login-error"),

    presidentList: document.getElementById("president-list"),
    createBtn: document.getElementById("create-president-btn"),
    saveBtn: document.getElementById("save-btn"),
    deleteBtn: document.getElementById("delete-btn"),
    duplicateBtn: document.getElementById("duplicate-btn"),
    statusPill: document.getElementById("status-pill"),

    addEventBtn: document.getElementById("add-event-btn"),
    addTimelineBtn: document.getElementById("add-timeline-btn"),
    eventsEditor: document.getElementById("events-editor"),
    timelineEditor: document.getElementById("timeline-editor"),

    full_name: document.getElementById("full_name"),
    slug: document.getElementById("slug"),
    president_number: document.getElementById("president_number"),
    party: document.getElementById("party"),
    party_short: document.getElementById("party_short"),
    portrait_url: document.getElementById("portrait_url"),
    term_start: document.getElementById("term_start"),
    term_end: document.getElementById("term_end"),
    display_order: document.getElementById("display_order"),
    vice_president: document.getElementById("vice_president"),
    first_lady: document.getElementById("first_lady"),
    ideology: document.getElementById("ideology"),
    home_state: document.getElementById("home_state"),
    date_of_birth: document.getElementById("date_of_birth"),
    place_of_birth: document.getElementById("place_of_birth"),
    short_summary: document.getElementById("short_summary"),
    full_summary: document.getElementById("full_summary"),
    education: document.getElementById("education"),
    previous_offices: document.getElementById("previous_offices"),
    top_actions: document.getElementById("top_actions"),
    accomplishments: document.getElementById("accomplishments"),
    scandals: document.getElementById("scandals"),
  };

  bindLogin();

  function bindLogin() {
    els.unlockBtn.onclick = unlock;
    els.accessCode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlock();
    });
  }

  async function unlock() {
    if ((els.accessCode.value || "").trim() !== ACCESS_CODE) {
      els.loginError.classList.remove("hidden");
      return;
    }

    els.loginError.classList.add("hidden");
    els.loginScreen.classList.add("hidden");
    els.appShell.classList.remove("hidden");

    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    wireApp();
    await loadPresidents();
  }

  function wireApp() {
    els.createBtn.onclick = createPresident;
    els.saveBtn.onclick = savePresident;
    els.deleteBtn.onclick = deletePresident;
    els.duplicateBtn.onclick = duplicatePresident;
    els.addEventBtn.onclick = () => addEventRow();
    els.addTimelineBtn.onclick = () => addTimelineRow();

    els.full_name.addEventListener("input", () => {
      if (!els.slug.dataset.manual) {
        els.slug.value = slugify(els.full_name.value);
      }
    });

    els.slug.addEventListener("input", () => {
      els.slug.dataset.manual = "1";
    });
  }

  async function loadPresidents() {
    setStatus("Loading presidents...");

    const { data, error } = await supabase
      .from("archive_presidents")
      .select("*")
      .order("display_order", { ascending: true })
      .order("president_number", { ascending: false });

    if (error) {
      setStatus("Error loading presidents");
      console.error(error);
      return;
    }

    presidents = data || [];
    renderPresidentList();

    if (presidents.length) {
      activeId = presidents[0].id;
      loadPresidentIntoForm(presidents[0]);
    } else {
      createPresident();
    }

    setStatus("Ready");
  }

  function renderPresidentList() {
    els.presidentList.innerHTML = presidents
      .map((p) => {
        const active = p.id === activeId ? "active" : "";
        const img = p.portrait_url || "https://placehold.co/100x100/0f172a/e2e8f0?text=P";
        return `
          <button class="president-item ${active}" data-id="${p.id}" type="button">
            <img src="${escAttr(img)}" alt="${escAttr(p.full_name || "President")}">
            <div>
              <div class="president-item-name">${esc(p.full_name || "Untitled President")}</div>
              <div class="president-item-sub">#${esc(p.president_number ?? "—")} • ${esc(p.party_short || p.party || "—")}</div>
            </div>
          </button>
        `;
      })
      .join("");

    [...els.presidentList.querySelectorAll(".president-item")].forEach((btn) => {
      btn.onclick = () => {
        const president = presidents.find((p) => String(p.id) === btn.dataset.id);
        if (!president) return;
        activeId = president.id;
        renderPresidentList();
        loadPresidentIntoForm(president);
      };
    });
  }

  function blankPresident() {
    return {
      id: null,
      slug: "",
      full_name: "",
      president_number: "",
      party: "",
      party_short: "",
      portrait_url: "",
      term_start: "",
      term_end: "",
      display_order: presidents.length + 1,
      vice_president: "",
      first_lady: "",
      ideology: "",
      home_state: "",
      date_of_birth: "",
      place_of_birth: "",
      short_summary: "",
      full_summary: "",
      education: [],
      previous_offices: [],
      top_actions: [],
      accomplishments: [],
      scandals: [],
      key_events: [],
      timeline_items: [],
    };
  }

  function createPresident() {
    activeId = null;
    loadPresidentIntoForm(blankPresident());
    renderPresidentList();
    setStatus("Creating new president");
  }

  function loadPresidentIntoForm(p) {
    els.full_name.value = p.full_name || "";
    els.slug.value = p.slug || "";
    els.slug.dataset.manual = p.slug ? "1" : "";
    els.president_number.value = p.president_number ?? "";
    els.party.value = p.party || "";
    els.party_short.value = p.party_short || "";
    els.portrait_url.value = p.portrait_url || "";
    els.term_start.value = p.term_start || "";
    els.term_end.value = p.term_end || "";
    els.display_order.value = p.display_order ?? "";
    els.vice_president.value = p.vice_president || "";
    els.first_lady.value = p.first_lady || "";
    els.ideology.value = p.ideology || "";
    els.home_state.value = p.home_state || "";
    els.date_of_birth.value = p.date_of_birth || "";
    els.place_of_birth.value = p.place_of_birth || "";
    els.short_summary.value = p.short_summary || "";
    els.full_summary.value = p.full_summary || "";

    els.education.value = arrayToTextarea(p.education);
    els.previous_offices.value = arrayToTextarea(p.previous_offices);
    els.top_actions.value = arrayToTextarea(p.top_actions);
    els.accomplishments.value = arrayToTextarea(p.accomplishments);
    els.scandals.value = arrayToTextarea(p.scandals);

    renderEventsEditor(p.key_events || []);
    renderTimelineEditor(p.timeline_items || []);
  }

  function collectFormData() {
    return {
      full_name: els.full_name.value.trim(),
      slug: (els.slug.value || slugify(els.full_name.value)).trim(),
      president_number: parseNullableInt(els.president_number.value),
      party: els.party.value.trim(),
      party_short: els.party_short.value.trim(),
      portrait_url: els.portrait_url.value.trim(),
      term_start: els.term_start.value || null,
      term_end: els.term_end.value || null,
      display_order: parseNullableInt(els.display_order.value) ?? 999,
      vice_president: els.vice_president.value.trim(),
      first_lady: els.first_lady.value.trim(),
      ideology: els.ideology.value.trim(),
      home_state: els.home_state.value.trim(),
      date_of_birth: els.date_of_birth.value || null,
      place_of_birth: els.place_of_birth.value.trim(),
      short_summary: els.short_summary.value.trim(),
      full_summary: els.full_summary.value.trim(),
      education: textareaToArray(els.education.value),
      previous_offices: textareaToArray(els.previous_offices.value),
      top_actions: textareaToArray(els.top_actions.value),
      accomplishments: textareaToArray(els.accomplishments.value),
      scandals: textareaToArray(els.scandals.value),
      key_events: collectEvents(),
      timeline_items: collectTimeline(),
      updated_at: new Date().toISOString()
    };
  }

  async function savePresident() {
    try {
      setStatus("Saving...");
      const payload = collectFormData();

      if (!payload.full_name) {
        setStatus("Full name required");
        return;
      }

      if (activeId) {
        const { error } = await supabase
          .from("archive_presidents")
          .update(payload)
          .eq("id", activeId);

        if (error) throw error;
      } else {
        payload.created_at = new Date().toISOString();

        const { data, error } = await supabase
          .from("archive_presidents")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        activeId = data.id;
      }

      await loadPresidents();
      setStatus("Saved");
    } catch (err) {
      console.error(err);
      setStatus("Save failed");
      alert("Could not save president: " + (err.message || err));
    }
  }

  async function deletePresident() {
    if (!activeId) {
      alert("No saved president selected.");
      return;
    }

    const current = presidents.find((p) => p.id === activeId);
    if (!current) return;

    if (!confirm(`Delete ${current.full_name}? This cannot be undone.`)) return;

    try {
      setStatus("Deleting...");
      const { error } = await supabase
        .from("archive_presidents")
        .delete()
        .eq("id", activeId);

      if (error) throw error;

      activeId = null;
      await loadPresidents();
      setStatus("Deleted");
    } catch (err) {
      console.error(err);
      setStatus("Delete failed");
      alert("Could not delete president: " + (err.message || err));
    }
  }

  function duplicatePresident() {
    const payload = collectFormData();
    payload.full_name = (payload.full_name || "Untitled President") + " Copy";
    payload.slug = slugify(payload.full_name);
    activeId = null;
    loadPresidentIntoForm(payload);
    setStatus("Duplicated into new unsaved record");
  }

  function renderEventsEditor(events) {
    els.eventsEditor.innerHTML = "";
    if (!events.length) addEventRow();
    else events.forEach((event) => addEventRow(event));
  }

  function renderTimelineEditor(items) {
    els.timelineEditor.innerHTML = "";
    if (!items.length) addTimelineRow();
    else items.forEach((item) => addTimelineRow(item));
  }

  function addEventRow(event = {}) {
    const wrap = document.createElement("div");
    wrap.className = "stack-item";
    wrap.innerHTML = `
      <div class="stack-item-grid">
        <label>
          <span>Year / Date</span>
          <input class="event-year" type="text" value="${escAttr(event.year || event.date || "")}">
        </label>
        <label>
          <span>Title</span>
          <input class="event-title" type="text" value="${escAttr(event.title || "")}">
        </label>
        <label>
          <span>Tag</span>
          <input class="event-tag" type="text" value="${escAttr(event.tag || "")}" placeholder="LEGISLATION / CRISIS">
        </label>
        <button class="remove-btn" type="button">Remove</button>
      </div>
      <label style="margin-top:10px;">
        <span>Description</span>
        <textarea class="event-description" rows="3">${esc(event.description || "")}</textarea>
      </label>
    `;

    wrap.querySelector(".remove-btn").onclick = () => wrap.remove();
    els.eventsEditor.appendChild(wrap);
  }

  function addTimelineRow(item = {}) {
    const wrap = document.createElement("div");
    wrap.className = "stack-item";
    wrap.innerHTML = `
      <div class="stack-item-grid timeline">
        <label>
          <span>Date</span>
          <input class="timeline-date" type="text" value="${escAttr(item.date || item.year || "")}">
        </label>
        <label>
          <span>Label</span>
          <input class="timeline-label" type="text" value="${escAttr(item.label || item.title || "")}">
        </label>
        <button class="remove-btn" type="button">Remove</button>
      </div>
    `;

    wrap.querySelector(".remove-btn").onclick = () => wrap.remove();
    els.timelineEditor.appendChild(wrap);
  }

  function collectEvents() {
    return [...els.eventsEditor.querySelectorAll(".stack-item")]
      .map((row) => ({
        year: row.querySelector(".event-year")?.value.trim() || "",
        title: row.querySelector(".event-title")?.value.trim() || "",
        tag: row.querySelector(".event-tag")?.value.trim() || "",
        description: row.querySelector(".event-description")?.value.trim() || ""
      }))
      .filter((item) => item.year || item.title || item.tag || item.description);
  }

  function collectTimeline() {
    return [...els.timelineEditor.querySelectorAll(".stack-item")]
      .map((row) => ({
        date: row.querySelector(".timeline-date")?.value.trim() || "",
        label: row.querySelector(".timeline-label")?.value.trim() || ""
      }))
      .filter((item) => item.date || item.label);
  }

  function textareaToArray(value) {
    return String(value || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function arrayToTextarea(value) {
    if (!value) return "";
    if (Array.isArray(value)) return value.join("\n");
    return "";
  }

  function setStatus(text) {
    els.statusPill.textContent = text;
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parseNullableInt(value) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[m]));
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }
})();
