(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const els = {
    error: document.getElementById("error-box"),
    success: document.getElementById("success-box"),
    refresh: document.getElementById("refresh-data"),
    regionsWrap: document.getElementById("regions-wrap"),
    senateWrap: document.getElementById("senate-wrap"),
    governorWrap: document.getElementById("governor-wrap"),
    houseWrap: document.getElementById("house-wrap")
  };

  let regions = [];
  let regionStates = [];
  let senateSeats = [];
  let governors = [];
  let houseSeats = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    els.refresh.onclick = loadData;
    await loadData();
  }

  async function loadData() {
    try {
      hideBoxes();

      const [regionsRes, statesRes, senateRes, governorsRes, houseRes] = await Promise.all([
        supabase.from("gov_regions").select("*").order("sort_order", { ascending: true }),
        supabase.from("gov_region_states").select("*").order("state_name", { ascending: true }),
        supabase.from("gov_senate_seats").select("*").order("sort_order", { ascending: true }),
        supabase.from("gov_governors").select("*").order("office_name", { ascending: true }),
        supabase.from("gov_house_seats").select("*").order("sort_order", { ascending: true })
      ]);

      if (regionsRes.error) throw regionsRes.error;
      if (statesRes.error) throw statesRes.error;
      if (senateRes.error) throw senateRes.error;
      if (governorsRes.error) throw governorsRes.error;
      if (houseRes.error) throw houseRes.error;

      regions = regionsRes.data || [];
      regionStates = statesRes.data || [];
      senateSeats = senateRes.data || [];
      governors = governorsRes.data || [];
      houseSeats = houseRes.data || [];

      renderAll();
      showSuccess("Government roster loaded.");
    } catch (err) {
      showError("Could not load FEC roster data. " + (err.message || err));
    }
  }

  function renderAll() {
    renderRegions();
    renderSenate();
    renderGovernors();
    renderHouse();
  }

  function renderRegions() {
    els.regionsWrap.innerHTML = regions.map(region => {
      const states = regionStates
        .filter(s => s.region_id === region.id)
        .map(s => `${s.state_name} (${s.state_abbr})`)
        .join(", ");

      return `
        <article class="region-card" data-region-id="${escAttr(region.id)}">
          <div class="region-title-row">
            <div>
              <h3>${esc(region.name)} <span>${esc(region.cycle_type || "")}</span></h3>
              <p>${esc(states || "No states assigned")}</p>
            </div>
            <span class="region-color" style="background:${escAttr(region.color || "#64748b")}"></span>
          </div>

          <div class="grid small-grid">
            <label>
              Region Name
              <input data-region-field="name" value="${escAttr(region.name || "")}">
            </label>

            <label>
              Slug
              <input data-region-field="slug" value="${escAttr(region.slug || "")}">
            </label>

            <label>
              Cycle Type
              <select data-region-field="cycle_type">
                ${option("", "None", region.cycle_type)}
                ${option("P", "P", region.cycle_type)}
                ${option("M", "M", region.cycle_type)}
              </select>
            </label>

            <label>
              Color
              <input data-region-field="color" value="${escAttr(region.color || "")}">
            </label>

            <label>
              Sort Order
              <input data-region-field="sort_order" type="number" value="${num(region.sort_order)}">
            </label>

            <label>
              Active
              <select data-region-field="is_active">
                ${option("true", "Active", String(region.is_active))}
                ${option("false", "Hidden", String(region.is_active))}
              </select>
            </label>
          </div>

          <button class="save-region" data-save-region="${escAttr(region.id)}">Save Region</button>
        </article>
      `;
    }).join("");

    els.regionsWrap.querySelectorAll("[data-save-region]").forEach(btn => {
      btn.onclick = () => saveRegion(btn.dataset.saveRegion);
    });
  }

  function renderSenate() {
    els.senateWrap.innerHTML = regions.map(region => {
      const seats = senateSeats
        .filter(s => s.region_id === region.id)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

      return `
        <article class="office-region-block">
          <div class="office-region-head">
            <h3>${esc(region.name)} Senate</h3>
            <span>${esc(region.cycle_type || "")}</span>
          </div>

          <div class="seat-list">
            ${seats.map(seat => senateSeatHtml(seat)).join("") || `<p class="muted">No senate seats.</p>`}
          </div>
        </article>
      `;
    }).join("");

    els.senateWrap.querySelectorAll("[data-save-senate]").forEach(btn => {
      btn.onclick = () => saveSenateSeat(btn.dataset.saveSenate);
    });
  }

  function senateSeatHtml(seat) {
    return `
      <div class="seat-card" data-senate-id="${escAttr(seat.id)}">
        <div class="seat-title">
          <strong>${esc(seat.seat_name || "Senate Seat")}</strong>
          <span>${esc(seat.seat_class || "")}</span>
        </div>

        <div class="grid">
          <label>
            Seat Name
            <input data-senate-field="seat_name" value="${escAttr(seat.seat_name || "")}">
          </label>

          <label>
            Seat Class
            <select data-senate-field="seat_class">
              ${option("", "None", seat.seat_class)}
              ${option("Class 1", "Class 1", seat.seat_class)}
              ${option("Class 2", "Class 2", seat.seat_class)}
              ${option("Class 3", "Class 3", seat.seat_class)}
              ${option("Special", "Special", seat.seat_class)}
              ${option("Custom", "Custom", seat.seat_class)}
            </select>
          </label>

          <label>
            Filler Name
            <input data-senate-field="filler_name" value="${escAttr(seat.filler_name || "")}">
          </label>

          <label>
            Filler Party
            <input data-senate-field="filler_party" value="${escAttr(seat.filler_party || "")}" placeholder="DNC / GOP / IND">
          </label>

          <label>
            Filler Image URL
            <input data-senate-field="filler_image_url" value="${escAttr(seat.filler_image_url || "")}">
          </label>

          <label>
            Term Start
            <input data-senate-field="term_start" value="${escAttr(seat.term_start || "")}">
          </label>

          <label>
            Term End
            <input data-senate-field="term_end" value="${escAttr(seat.term_end || "")}">
          </label>

          <label>
            Status
            <select data-senate-field="status">
              ${option("occupied", "Occupied", seat.status)}
              ${option("vacant", "Vacant", seat.status)}
              ${option("appointed", "Appointed", seat.status)}
              ${option("special_pending", "Special Pending", seat.status)}
            </select>
          </label>

          <label>
            Sort Order
            <input data-senate-field="sort_order" type="number" value="${num(seat.sort_order)}">
          </label>
        </div>

        <button class="save-seat" data-save-senate="${escAttr(seat.id)}">Save Senate Seat</button>
      </div>
    `;
  }

  function renderGovernors() {
    els.governorWrap.innerHTML = regions.map(region => {
      const governor = governors.find(g => g.region_id === region.id);

      if (!governor) {
        return `
          <article class="office-region-block">
            <div class="office-region-head">
              <h3>${esc(region.name)} Governor</h3>
            </div>
            <p class="muted">No governor row found.</p>
          </article>
        `;
      }

      return `
        <article class="office-region-block" data-governor-id="${escAttr(governor.id)}">
          <div class="office-region-head">
            <h3>${esc(region.name)} Governor</h3>
            <span>${esc(governor.status || "")}</span>
          </div>

          <div class="grid">
            <label>
              Office Name
              <input data-governor-field="office_name" value="${escAttr(governor.office_name || "")}">
            </label>

            <label>
              Governor Name
              <input data-governor-field="governor_name" value="${escAttr(governor.governor_name || "")}">
            </label>

            <label>
              Governor Party
              <input data-governor-field="governor_party" value="${escAttr(governor.governor_party || "")}" placeholder="DNC / GOP / IND">
            </label>

            <label>
              Governor Image URL
              <input data-governor-field="governor_image_url" value="${escAttr(governor.governor_image_url || "")}">
            </label>

            <label>
              Lt. Governor Name
              <input data-governor-field="lt_governor_name" value="${escAttr(governor.lt_governor_name || "")}">
            </label>

            <label>
              Lt. Governor Party
              <input data-governor-field="lt_governor_party" value="${escAttr(governor.lt_governor_party || "")}">
            </label>

            <label>
              Term Start
              <input data-governor-field="term_start" value="${escAttr(governor.term_start || "")}">
            </label>

            <label>
              Term End
              <input data-governor-field="term_end" value="${escAttr(governor.term_end || "")}">
            </label>

            <label>
              Status
              <select data-governor-field="status">
                ${option("occupied", "Occupied", governor.status)}
                ${option("vacant", "Vacant", governor.status)}
                ${option("acting", "Acting", governor.status)}
                ${option("special_pending", "Special Pending", governor.status)}
              </select>
            </label>
          </div>

          <button class="save-seat" data-save-governor="${escAttr(governor.id)}">Save Governor</button>
        </article>
      `;
    }).join("");

    els.governorWrap.querySelectorAll("[data-save-governor]").forEach(btn => {
      btn.onclick = () => saveGovernor(btn.dataset.saveGovernor);
    });
  }

  function renderHouse() {
    els.houseWrap.innerHTML = regions.map(region => {
      const seats = houseSeats
        .filter(s => s.region_id === region.id)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

      return `
        <article class="office-region-block">
          <div class="office-region-head">
            <h3>${esc(region.name)} House Delegation</h3>
            <span>${seats.length} seats</span>
          </div>

          <div class="seat-list">
            ${seats.map(seat => houseSeatHtml(seat)).join("") || `<p class="muted">No House seats.</p>`}
          </div>
        </article>
      `;
    }).join("");

    els.houseWrap.querySelectorAll("[data-save-house]").forEach(btn => {
      btn.onclick = () => saveHouseSeat(btn.dataset.saveHouse);
    });
  }

  function houseSeatHtml(seat) {
    return `
      <div class="seat-card" data-house-id="${escAttr(seat.id)}">
        <div class="seat-title">
          <strong>${esc(seat.district_code || "District")}</strong>
          <span>${esc(seat.district_area || "")}</span>
        </div>

        <div class="grid">
          <label>
            District Code
            <input data-house-field="district_code" value="${escAttr(seat.district_code || "")}">
          </label>

          <label>
            District Name
            <input data-house-field="district_name" value="${escAttr(seat.district_name || "")}">
          </label>

          <label class="wide">
            District Area
            <input data-house-field="district_area" value="${escAttr(seat.district_area || "")}">
          </label>

          <label>
            Filler Name
            <input data-house-field="filler_name" value="${escAttr(seat.filler_name || "")}">
          </label>

          <label>
            Filler Party
            <input data-house-field="filler_party" value="${escAttr(seat.filler_party || "")}" placeholder="DNC / GOP / IND">
          </label>

          <label>
            Filler Image URL
            <input data-house-field="filler_image_url" value="${escAttr(seat.filler_image_url || "")}">
          </label>

          <label>
            Term Start
            <input data-house-field="term_start" value="${escAttr(seat.term_start || "")}">
          </label>

          <label>
            Term End
            <input data-house-field="term_end" value="${escAttr(seat.term_end || "")}">
          </label>

          <label>
            Status
            <select data-house-field="status">
              ${option("occupied", "Occupied", seat.status)}
              ${option("vacant", "Vacant", seat.status)}
              ${option("special_pending", "Special Pending", seat.status)}
            </select>
          </label>

          <label>
            Sort Order
            <input data-house-field="sort_order" type="number" value="${num(seat.sort_order)}">
          </label>
        </div>

        <button class="save-seat" data-save-house="${escAttr(seat.id)}">Save House Seat</button>
      </div>
    `;
  }

  async function saveRegion(id) {
    try {
      hideBoxes();

      const box = document.querySelector(`[data-region-id="${cssEscape(id)}"]`);
      if (!box) return;

      const payload = {
        name: field(box, "region", "name"),
        slug: field(box, "region", "slug"),
        cycle_type: field(box, "region", "cycle_type"),
        color: field(box, "region", "color"),
        sort_order: numberField(box, "region", "sort_order"),
        is_active: field(box, "region", "is_active") === "true",
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("gov_regions").update(payload).eq("id", id);
      if (error) throw error;

      showSuccess("Region saved.");
      await loadData();
    } catch (err) {
      showError("Could not save region. " + (err.message || err));
    }
  }

  async function saveSenateSeat(id) {
    try {
      hideBoxes();

      const box = document.querySelector(`[data-senate-id="${cssEscape(id)}"]`);
      if (!box) return;

      const payload = {
        seat_name: field(box, "senate", "seat_name"),
        seat_class: field(box, "senate", "seat_class"),
        filler_name: field(box, "senate", "filler_name"),
        filler_party: field(box, "senate", "filler_party"),
        filler_image_url: field(box, "senate", "filler_image_url"),
        term_start: field(box, "senate", "term_start"),
        term_end: field(box, "senate", "term_end"),
        status: field(box, "senate", "status"),
        sort_order: numberField(box, "senate", "sort_order"),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("gov_senate_seats").update(payload).eq("id", id);
      if (error) throw error;

      showSuccess("Senate seat saved.");
      await loadData();
    } catch (err) {
      showError("Could not save senate seat. " + (err.message || err));
    }
  }

  async function saveGovernor(id) {
    try {
      hideBoxes();

      const box = document.querySelector(`[data-governor-id="${cssEscape(id)}"]`);
      if (!box) return;

      const payload = {
        office_name: field(box, "governor", "office_name"),
        governor_name: field(box, "governor", "governor_name"),
        governor_party: field(box, "governor", "governor_party"),
        governor_image_url: field(box, "governor", "governor_image_url"),
        lt_governor_name: field(box, "governor", "lt_governor_name"),
        lt_governor_party: field(box, "governor", "lt_governor_party"),
        term_start: field(box, "governor", "term_start"),
        term_end: field(box, "governor", "term_end"),
        status: field(box, "governor", "status"),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("gov_governors").update(payload).eq("id", id);
      if (error) throw error;

      showSuccess("Governor saved.");
      await loadData();
    } catch (err) {
      showError("Could not save governor. " + (err.message || err));
    }
  }

  async function saveHouseSeat(id) {
    try {
      hideBoxes();

      const box = document.querySelector(`[data-house-id="${cssEscape(id)}"]`);
      if (!box) return;

      const payload = {
        district_code: field(box, "house", "district_code"),
        district_name: field(box, "house", "district_name"),
        district_area: field(box, "house", "district_area"),
        filler_name: field(box, "house", "filler_name"),
        filler_party: field(box, "house", "filler_party"),
        filler_image_url: field(box, "house", "filler_image_url"),
        term_start: field(box, "house", "term_start"),
        term_end: field(box, "house", "term_end"),
        status: field(box, "house", "status"),
        sort_order: numberField(box, "house", "sort_order"),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("gov_house_seats").update(payload).eq("id", id);
      if (error) throw error;

      showSuccess("House seat saved.");
      await loadData();
    } catch (err) {
      showError("Could not save House seat. " + (err.message || err));
    }
  }

  function field(box, group, name) {
    return box.querySelector(`[data-${group}-field="${name}"]`)?.value?.trim() || "";
  }

  function numberField(box, group, name) {
    return Number(box.querySelector(`[data-${group}-field="${name}"]`)?.value || 0);
  }

  function option(value, label, current) {
    const selected = String(value) === String(current || "") ? "selected" : "";
    return `<option value="${escAttr(value)}" ${selected}>${esc(label)}</option>`;
  }

  function num(value) {
    return Number(value || 0);
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

  function escAttr(s) {
    return esc(s).replace(/`/g, "&#96;");
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\]/g, "\\$&");
  }
})();
