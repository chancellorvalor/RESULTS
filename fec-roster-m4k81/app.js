(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const els = {
    error: document.getElementById("error-box"),
    success: document.getElementById("success-box"),
    refresh: document.getElementById("refresh-data"),

    tabs: document.querySelectorAll(".tab-btn"),
    panels: document.querySelectorAll(".tab-panel"),

    createRegion: document.getElementById("create-region"),
    selectedRegion: document.getElementById("selected-region"),
    selectedRegionEditor: document.getElementById("selected-region-editor"),
    selectedRegionStates: document.getElementById("selected-region-states"),
    saveStateAssignments: document.getElementById("save-state-assignments"),
    resetMap: document.getElementById("reset-map"),
    legend: document.getElementById("map-legend"),
    regionsTable: document.getElementById("regions-table"),

    senateTable: document.getElementById("senate-table"),
    senateRegionFilter: document.getElementById("senate-region-filter"),
    addSenateSeat: document.getElementById("add-senate-seat"),

    governorTable: document.getElementById("governor-table"),

    houseTable: document.getElementById("house-table"),
    houseRegionFilter: document.getElementById("house-region-filter"),
    addHouseSeat: document.getElementById("add-house-seat")
  };

  let regions = [];
  let regionStates = [];
  let senateSeats = [];
  let governors = [];
  let houseSeats = [];
  let geojson = null;
  let map = null;
  let popup = null;
  let selectedRegionId = "";
  let pendingStateAssignments = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    wireEvents();
    await loadGeoJson();
    initMap();
    await loadData();
  }

  function wireEvents() {
    els.refresh.onclick = loadData;

    els.tabs.forEach(btn => {
      btn.onclick = () => switchTab(btn.dataset.tab);
    });

    els.createRegion.onclick = createRegion;
    els.saveStateAssignments.onclick = saveStateAssignments;

    els.selectedRegion.onchange = () => {
      selectedRegionId = els.selectedRegion.value;
      renderSelectedRegion();
      drawMap();
    };

    els.resetMap.onclick = () => {
      map?.flyTo({ center: [-98.5795, 39.8283], zoom: 3.35 });
    };

    els.senateRegionFilter.onchange = renderSenateTable;
    els.houseRegionFilter.onchange = renderHouseTable;

    els.addSenateSeat.onclick = createSenateSeat;
    els.addHouseSeat.onclick = createHouseSeat;
  }

  function switchTab(tab) {
    els.tabs.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
    els.panels.forEach(panel => panel.classList.toggle("active", panel.id === `tab-${tab}`));

    if (tab === "regions") {
      setTimeout(() => {
        map?.resize();
        drawMap();
      }, 100);
    }
  }

  async function loadGeoJson() {
    const res = await fetch("../public/data/states.geojson?v=2");
    if (!res.ok) throw new Error("Could not load states.geojson from public/data.");
    geojson = await res.json();
  }

  function initMap() {
    map = new maplibregl.Map({
      container: "region-map",
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [-98.5795, 39.8283],
      zoom: 3.35
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      drawMap();
    });
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
      pendingStateAssignments = {};

      if (!selectedRegionId && regions[0]) selectedRegionId = regions[0].id;

      renderAll();
      drawMap();
      showSuccess("Government roster loaded.");
    } catch (err) {
      showError("Could not load FEC roster data. " + (err.message || err));
    }
  }

  function renderAll() {
    renderRegionSelects();
    renderSelectedRegion();
    renderRegionsTable();
    renderSenateTable();
    renderGovernorTable();
    renderHouseTable();
    renderLegend();
  }

  function renderRegionSelects() {
    const allOptions = [
      `<option value="">All Regions</option>`,
      ...regions.map(r => `<option value="${escAttr(r.id)}">${esc(r.name)}</option>`)
    ].join("");

    els.senateRegionFilter.innerHTML = allOptions;
    els.houseRegionFilter.innerHTML = allOptions;

    els.selectedRegion.innerHTML = regions.map(r => {
      const selected = r.id === selectedRegionId ? "selected" : "";
      return `<option value="${escAttr(r.id)}" ${selected}>${esc(r.name)} ${r.cycle_type ? `| ${esc(r.cycle_type)}` : ""}</option>`;
    }).join("");

    if (!regions.find(r => r.id === selectedRegionId) && regions[0]) {
      selectedRegionId = regions[0].id;
      els.selectedRegion.value = selectedRegionId;
    }
  }

  function renderSelectedRegion() {
    const region = regions.find(r => r.id === selectedRegionId);

    if (!region) {
      els.selectedRegionEditor.innerHTML = `<p class="muted">No region selected.</p>`;
      els.selectedRegionStates.innerHTML = "";
      return;
    }

    els.selectedRegionEditor.innerHTML = `
      <div class="compact-edit-box" data-selected-region-id="${escAttr(region.id)}">
        <div class="mini-grid">
          <label>
            Name
            <input data-selected-region-field="name" value="${escAttr(region.name || "")}">
          </label>

          <label>
            Slug
            <input data-selected-region-field="slug" value="${escAttr(region.slug || "")}">
          </label>

          <label>
            Cycle
            <input data-selected-region-field="cycle_type" value="${escAttr(region.cycle_type || "")}" placeholder="P / M / Custom">
          </label>

          <label>
            Label
            <input data-selected-region-field="map_label" value="${escAttr(region.map_label || "")}">
          </label>

          <label>
            Color
            <input data-selected-region-field="color" value="${escAttr(region.color || "")}">
          </label>

          <label>
            Order
            <input data-selected-region-field="sort_order" type="number" value="${num(region.sort_order)}">
          </label>
        </div>

        <label>
          Description
          <input data-selected-region-field="description" value="${escAttr(region.description || "")}">
        </label>

        <div class="button-row">
          <button data-save-selected-region="${escAttr(region.id)}">Save Selected Region</button>
        </div>
      </div>
    `;

    els.selectedRegionEditor.querySelector("[data-save-selected-region]").onclick = () => saveSelectedRegion(region.id);

    const states = getStatesForRegion(region.id);

    els.selectedRegionStates.innerHTML = states.length
      ? states.map(s => `
          <button class="state-chip" data-unassign-state="${escAttr(s.state_abbr)}">
            ${esc(s.state_name)} <span>${esc(s.state_abbr)}</span>
          </button>
        `).join("")
      : `<p class="muted">No states assigned. Click states on the map to assign them here.</p>`;

    els.selectedRegionStates.querySelectorAll("[data-unassign-state]").forEach(btn => {
      btn.onclick = () => unassignState(btn.dataset.unassignState);
    });
  }

  function renderRegionsTable() {
    els.regionsTable.innerHTML = regions.map(region => `
      <tr data-region-id="${escAttr(region.id)}">
        <td><input data-region-field="name" value="${escAttr(region.name || "")}"></td>
        <td><input data-region-field="slug" value="${escAttr(region.slug || "")}"></td>
        <td><input data-region-field="cycle_type" value="${escAttr(region.cycle_type || "")}" placeholder="P/M"></td>
        <td><input data-region-field="map_label" value="${escAttr(region.map_label || "")}"></td>
        <td><input data-region-field="color" value="${escAttr(region.color || "")}"></td>
        <td><input data-region-field="sort_order" type="number" value="${num(region.sort_order)}"></td>
        <td>
          <select data-region-field="is_active">
            ${option("true", "Active", String(region.is_active))}
            ${option("false", "Hidden", String(region.is_active))}
          </select>
        </td>
        <td><button class="tiny-btn" data-save-region="${escAttr(region.id)}">Save</button></td>
      </tr>
    `).join("");

    els.regionsTable.querySelectorAll("[data-save-region]").forEach(btn => {
      btn.onclick = () => saveRegion(btn.dataset.saveRegion);
    });
  }

  function renderSenateTable() {
    const filter = els.senateRegionFilter.value;

    const list = senateSeats
      .filter(s => !filter || s.region_id === filter)
      .sort((a, b) => regionSort(a.region_id, b.region_id) || Number(a.sort_order || 0) - Number(b.sort_order || 0));

    els.senateTable.innerHTML = list.map(seat => {
      const region = regionById(seat.region_id);

      return `
        <tr data-senate-id="${escAttr(seat.id)}">
          <td>
            <select data-senate-field="region_id">
              ${regions.map(r => option(r.id, r.name, seat.region_id)).join("")}
            </select>
          </td>
          <td><input data-senate-field="seat_name" value="${escAttr(seat.seat_name || "")}"></td>
          <td>
            <select data-senate-field="seat_class">
              ${option("", "None", seat.seat_class)}
              ${option("Class 1", "Class 1", seat.seat_class)}
              ${option("Class 2", "Class 2", seat.seat_class)}
              ${option("Class 3", "Class 3", seat.seat_class)}
              ${option("Special", "Special", seat.seat_class)}
              ${option("Custom", "Custom", seat.seat_class)}
            </select>
          </td>
          <td><input data-senate-field="custom_class" value="${escAttr(seat.custom_class || "")}" placeholder="Any custom class"></td>
          <td><input data-senate-field="filler_name" value="${escAttr(seat.filler_name || "")}"></td>
          <td><input data-senate-field="filler_party" value="${escAttr(seat.filler_party || "")}" placeholder="DNC/GOP/IND"></td>
          <td><input data-senate-field="term_start" value="${escAttr(seat.term_start || "")}"></td>
          <td><input data-senate-field="term_end" value="${escAttr(seat.term_end || "")}"></td>
          <td>
            <select data-senate-field="status">
              ${option("occupied", "Occupied", seat.status)}
              ${option("vacant", "Vacant", seat.status)}
              ${option("appointed", "Appointed", seat.status)}
              ${option("special_pending", "Special Pending", seat.status)}
            </select>
          </td>
          <td><input data-senate-field="sort_order" type="number" value="${num(seat.sort_order)}"></td>
          <td><button class="tiny-btn" data-save-senate="${escAttr(seat.id)}">Save</button></td>
        </tr>
      `;
    }).join("");

    els.senateTable.querySelectorAll("[data-save-senate]").forEach(btn => {
      btn.onclick = () => saveSenateSeat(btn.dataset.saveSenate);
    });
  }

  function renderGovernorTable() {
    els.governorTable.innerHTML = governors
      .sort((a, b) => regionSort(a.region_id, b.region_id))
      .map(governor => {
        return `
          <tr data-governor-id="${escAttr(governor.id)}">
            <td>${esc(regionById(governor.region_id)?.name || "Unknown")}</td>
            <td><input data-governor-field="office_name" value="${escAttr(governor.office_name || "")}"></td>
            <td><input data-governor-field="governor_name" value="${escAttr(governor.governor_name || "")}"></td>
            <td><input data-governor-field="governor_party" value="${escAttr(governor.governor_party || "")}" placeholder="DNC/GOP/IND"></td>
            <td><input data-governor-field="lt_governor_name" value="${escAttr(governor.lt_governor_name || "")}"></td>
            <td><input data-governor-field="lt_governor_party" value="${escAttr(governor.lt_governor_party || "")}"></td>
            <td><input data-governor-field="term_start" value="${escAttr(governor.term_start || "")}"></td>
            <td><input data-governor-field="term_end" value="${escAttr(governor.term_end || "")}"></td>
            <td>
              <select data-governor-field="status">
                ${option("occupied", "Occupied", governor.status)}
                ${option("vacant", "Vacant", governor.status)}
                ${option("acting", "Acting", governor.status)}
                ${option("special_pending", "Special Pending", governor.status)}
              </select>
            </td>
            <td><button class="tiny-btn" data-save-governor="${escAttr(governor.id)}">Save</button></td>
          </tr>
        `;
      }).join("");

    els.governorTable.querySelectorAll("[data-save-governor]").forEach(btn => {
      btn.onclick = () => saveGovernor(btn.dataset.saveGovernor);
    });
  }

  function renderHouseTable() {
    const filter = els.houseRegionFilter.value;

    const list = houseSeats
      .filter(s => !filter || s.region_id === filter)
      .sort((a, b) => regionSort(a.region_id, b.region_id) || Number(a.sort_order || 0) - Number(b.sort_order || 0));

    els.houseTable.innerHTML = list.map(seat => `
      <tr data-house-id="${escAttr(seat.id)}">
        <td>
          <select data-house-field="region_id">
            ${regions.map(r => option(r.id, r.name, seat.region_id)).join("")}
          </select>
        </td>
        <td><input data-house-field="district_code" value="${escAttr(seat.district_code || "")}"></td>
        <td><input data-house-field="district_area" value="${escAttr(seat.district_area || "")}"></td>
        <td><input data-house-field="filler_name" value="${escAttr(seat.filler_name || "")}"></td>
        <td><input data-house-field="filler_party" value="${escAttr(seat.filler_party || "")}" placeholder="DNC/GOP/IND"></td>
        <td><input data-house-field="term_start" value="${escAttr(seat.term_start || "")}"></td>
        <td><input data-house-field="term_end" value="${escAttr(seat.term_end || "")}"></td>
        <td>
          <select data-house-field="status">
            ${option("occupied", "Occupied", seat.status)}
            ${option("vacant", "Vacant", seat.status)}
            ${option("special_pending", "Special Pending", seat.status)}
          </select>
        </td>
        <td><input data-house-field="sort_order" type="number" value="${num(seat.sort_order)}"></td>
        <td><button class="tiny-btn" data-save-house="${escAttr(seat.id)}">Save</button></td>
      </tr>
    `).join("");

    els.houseTable.querySelectorAll("[data-save-house]").forEach(btn => {
      btn.onclick = () => saveHouseSeat(btn.dataset.saveHouse);
    });
  }

  function drawMap() {
    if (!map?.loaded() || !geojson) return;

    const data = JSON.parse(JSON.stringify(geojson));

    data.features = (data.features || []).filter(f => getFeatureAbbr(f) !== "PR").map(f => {
      const abbr = getFeatureAbbr(f);
      const stateName = getFeatureName(f);
      const assignment = getStateAssignment(abbr);
      const region = assignment ? regionById(assignment.region_id) : null;
      const isSelected = region && region.id === selectedRegionId;

      f.properties = f.properties || {};
      f.properties.aprp_abbr = abbr;
      f.properties.aprp_name = stateName;
      f.properties.fill = region ? region.color || "#64748b" : "#263244";
      f.properties.outline = isSelected ? "#fbbf24" : "#f8fafc";
      f.properties.hover = `
        <div class="map-popup">
          <h3>${esc(stateName || abbr)}</h3>
          <p>${region ? esc(region.name) : "Unassigned"}</p>
          <small>Click to assign to selected region.</small>
        </div>
      `;

      return f;
    });

    if (map.getSource("regions")) {
      map.getSource("regions").setData(data);
      return;
    }

    map.addSource("regions", { type: "geojson", data });

    map.addLayer({
      id: "regions-fill",
      type: "fill",
      source: "regions",
      paint: {
        "fill-color": ["get", "fill"],
        "fill-opacity": 0.88
      }
    });

    map.addLayer({
      id: "regions-outline",
      type: "line",
      source: "regions",
      paint: {
        "line-color": ["get", "outline"],
        "line-width": [
          "case",
          ["==", ["get", "outline"], "#fbbf24"],
          2.8,
          1
        ],
        "line-opacity": 0.9
      }
    });

    map.on("mousemove", "regions-fill", e => {
      map.getCanvas().style.cursor = "pointer";
      const html = e.features?.[0]?.properties?.hover || "";
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    map.on("mouseleave", "regions-fill", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("click", "regions-fill", e => {
      const abbr = e.features?.[0]?.properties?.aprp_abbr;
      const name = e.features?.[0]?.properties?.aprp_name;
      if (abbr) assignStateToSelectedRegion(abbr, name);
    });
  }

  function renderLegend() {
    els.legend.innerHTML = regions.map(r => `
      <div class="legend-item">
        <span class="legend-swatch" style="background:${escAttr(r.color || "#64748b")}"></span>
        ${esc(r.name)}
      </div>
    `).join("");
  }

  function assignStateToSelectedRegion(abbr, stateName) {
    if (!selectedRegionId) {
      showError("Select a region first.");
      return;
    }

    const cleanAbbr = normalizeAbbr(abbr);
    const existing = getStateAssignment(cleanAbbr);

    if (existing) {
      existing.region_id = selectedRegionId;
      existing.state_name = stateName || existing.state_name || cleanAbbr;
    } else {
      regionStates.push({
        id: `pending-${cleanAbbr}`,
        region_id: selectedRegionId,
        state_abbr: cleanAbbr,
        state_name: stateName || cleanAbbr
      });
    }

    pendingStateAssignments[cleanAbbr] = {
      region_id: selectedRegionId,
      state_abbr: cleanAbbr,
      state_name: stateName || cleanAbbr
    };

    renderSelectedRegion();
    drawMap();
    showSuccess(`${cleanAbbr} assigned locally. Press Save State Assignments to commit.`);
  }

  function unassignState(abbr) {
    const cleanAbbr = normalizeAbbr(abbr);
    const item = getStateAssignment(cleanAbbr);

    if (!item) return;

    regionStates = regionStates.filter(s => normalizeAbbr(s.state_abbr) !== cleanAbbr);
    pendingStateAssignments[cleanAbbr] = {
      region_id: null,
      state_abbr: cleanAbbr,
      state_name: item.state_name || cleanAbbr,
      remove: true
    };

    renderSelectedRegion();
    drawMap();
    showSuccess(`${cleanAbbr} unassigned locally. Press Save State Assignments to commit.`);
  }

  async function saveStateAssignments() {
    try {
      hideBoxes();

      const changes = Object.values(pendingStateAssignments);

      if (!changes.length) {
        showSuccess("No state assignment changes to save.");
        return;
      }

      for (const change of changes) {
        if (change.remove) {
          const { error } = await supabase
            .from("gov_region_states")
            .delete()
            .eq("state_abbr", change.state_abbr);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("gov_region_states")
            .upsert({
              region_id: change.region_id,
              state_abbr: change.state_abbr,
              state_name: change.state_name,
              updated_at: new Date().toISOString()
            }, { onConflict: "state_abbr" });

          if (error) throw error;
        }
      }

      showSuccess("State assignments saved.");
      await loadData();
    } catch (err) {
      showError("Could not save state assignments. " + (err.message || err));
    }
  }

  async function createRegion() {
    try {
      hideBoxes();

      const slugBase = `new-region-${Date.now()}`;

      const { data, error } = await supabase
        .from("gov_regions")
        .insert({
          name: "New Region",
          slug: slugBase,
          cycle_type: "",
          map_label: "New",
          color: "#64748b",
          sort_order: regions.length + 1,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      selectedRegionId = data.id;
      showSuccess("New region created.");
      await loadData();
    } catch (err) {
      showError("Could not create region. " + (err.message || err));
    }
  }

  async function createSenateSeat() {
    try {
      hideBoxes();

      const regionId = els.senateRegionFilter.value || selectedRegionId || regions[0]?.id;
      const region = regionById(regionId);
      if (!regionId) throw new Error("No region exists.");

      const { error } = await supabase.from("gov_senate_seats").insert({
        region_id: regionId,
        seat_name: `${region?.name || "Region"} Senate Seat`,
        seat_class: "Custom",
        custom_class: "",
        filler_name: "",
        filler_party: "",
        status: "vacant",
        sort_order: 99,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      showSuccess("Senate seat created.");
      await loadData();
    } catch (err) {
      showError("Could not create Senate seat. " + (err.message || err));
    }
  }

  async function createHouseSeat() {
    try {
      hideBoxes();

      const regionId = els.houseRegionFilter.value || selectedRegionId || regions[0]?.id;
      const region = regionById(regionId);
      if (!regionId) throw new Error("No region exists.");

      const { error } = await supabase.from("gov_house_seats").insert({
        region_id: regionId,
        district_code: "NEW",
        district_name: "New District",
        district_area: "",
        filler_name: "",
        filler_party: "",
        status: "vacant",
        sort_order: 99,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      showSuccess("House seat created.");
      await loadData();
    } catch (err) {
      showError("Could not create House seat. " + (err.message || err));
    }
  }

  async function saveSelectedRegion(id) {
    const box = document.querySelector(`[data-selected-region-id="${cssEscape(id)}"]`);
    if (!box) return;

    await updateRegionFromBox(id, box, "selected-region");
  }

  async function saveRegion(id) {
    const box = document.querySelector(`tr[data-region-id="${cssEscape(id)}"]`);
    if (!box) return;

    await updateRegionFromBox(id, box, "region");
  }

  async function updateRegionFromBox(id, box, group) {
    try {
      hideBoxes();

      const payload = {
        name: field(box, group, "name"),
        slug: field(box, group, "slug"),
        cycle_type: field(box, group, "cycle_type"),
        map_label: field(box, group, "map_label"),
        color: field(box, group, "color"),
        sort_order: numberField(box, group, "sort_order"),
        is_active: group === "region" ? field(box, group, "is_active") === "true" : true,
        description: group === "selected-region" ? field(box, group, "description") : undefined,
        updated_at: new Date().toISOString()
      };

      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

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

      const box = document.querySelector(`tr[data-senate-id="${cssEscape(id)}"]`);
      if (!box) return;

      const payload = {
        region_id: field(box, "senate", "region_id"),
        seat_name: field(box, "senate", "seat_name"),
        seat_class: field(box, "senate", "seat_class"),
        custom_class: field(box, "senate", "custom_class"),
        filler_name: field(box, "senate", "filler_name"),
        filler_party: field(box, "senate", "filler_party"),
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
      showError("Could not save Senate seat. " + (err.message || err));
    }
  }

  async function saveGovernor(id) {
    try {
      hideBoxes();

      const box = document.querySelector(`tr[data-governor-id="${cssEscape(id)}"]`);
      if (!box) return;

      const payload = {
        office_name: field(box, "governor", "office_name"),
        governor_name: field(box, "governor", "governor_name"),
        governor_party: field(box, "governor", "governor_party"),
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

      const box = document.querySelector(`tr[data-house-id="${cssEscape(id)}"]`);
      if (!box) return;

      const payload = {
        region_id: field(box, "house", "region_id"),
        district_code: field(box, "house", "district_code"),
        district_area: field(box, "house", "district_area"),
        filler_name: field(box, "house", "filler_name"),
        filler_party: field(box, "house", "filler_party"),
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

  function getStateAssignment(abbr) {
    const clean = normalizeAbbr(abbr);
    return regionStates.find(s => normalizeAbbr(s.state_abbr) === clean);
  }

  function getStatesForRegion(regionId) {
    return regionStates
      .filter(s => s.region_id === regionId)
      .sort((a, b) => String(a.state_name || "").localeCompare(String(b.state_name || "")));
  }

  function regionById(id) {
    return regions.find(r => r.id === id);
  }

  function regionSort(a, b) {
    const ar = regionById(a);
    const br = regionById(b);
    return Number(ar?.sort_order || 0) - Number(br?.sort_order || 0);
  }

  function getFeatureAbbr(f) {
    const p = f?.properties || {};
    return normalizeAbbr(p.abbr || p.STUSPS || p.postal || p.STATE_ABBR || p.state_abbr || "");
  }

  function getFeatureName(f) {
    const p = f?.properties || {};
    return p.NAME || p.name || p.STATE_NAME || p.state_name || getFeatureAbbr(f);
  }

  function normalizeAbbr(s) {
    return String(s || "").trim().toUpperCase();
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
