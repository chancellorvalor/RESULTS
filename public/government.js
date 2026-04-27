(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase?.createClient
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  const REGION_COLORS = {
    Columbia: "#ef4444",
    Cambridge: "#60a5fa",
    Yellowstone: "#f59e0b",
    Phoenix: "#fb7185",
    Austin: "#22c55e",
    Superior: "#a855f7",
    Heartland: "#eab308"
  };

  const DEFAULT_REGIONS = [
    {
      name: "Columbia",
      cycle_type: "P",
      color: REGION_COLORS.Columbia,
      states: ["West Virginia", "Virginia", "North Carolina", "Kentucky", "Tennessee", "Alabama", "Mississippi", "Florida", "Georgia", "South Carolina"],
      districts: [
        { code: "CO-1", label: "W. Virginia & Virginia", states: ["West Virginia", "Virginia"] },
        { code: "CO-2", label: "North Carolina", states: ["North Carolina"] },
        { code: "CO-3", label: "Kentucky", states: ["Kentucky"] },
        { code: "CO-4", label: "Tennessee", states: ["Tennessee"] },
        { code: "CO-5", label: "Alabama & Mississippi", states: ["Alabama", "Mississippi"] },
        { code: "CO-6", label: "N. Florida", states: ["Florida"] },
        { code: "CO-7", label: "S. Florida", states: ["Florida"] },
        { code: "CO-8", label: "Georgia", states: ["Georgia"] },
        { code: "CO-9", label: "South Carolina", states: ["South Carolina"] }
      ]
    },
    {
      name: "Cambridge",
      cycle_type: "P",
      color: REGION_COLORS.Cambridge,
      states: ["Delaware", "Pennsylvania", "Rhode Island", "Connecticut", "Vermont", "New Hampshire", "New Jersey", "Maryland", "Massachusetts", "Maine", "New York"],
      districts: [
        { code: "CA-1", label: "Delaware", states: ["Delaware"] },
        { code: "CA-2", label: "Pennsylvania", states: ["Pennsylvania"] },
        { code: "CA-3", label: "R. Island & Connecticut", states: ["Rhode Island", "Connecticut"] },
        { code: "CA-4", label: "Vermont & N. Hampshire", states: ["Vermont", "New Hampshire"] },
        { code: "CA-5", label: "New Jersey", states: ["New Jersey"] },
        { code: "CA-6", label: "Maryland", states: ["Maryland"] },
        { code: "CA-7", label: "Massachusetts", states: ["Massachusetts"] },
        { code: "CA-8", label: "Maine", states: ["Maine"] },
        { code: "CA-9", label: "New York", states: ["New York"] }
      ]
    },
    {
      name: "Yellowstone",
      cycle_type: "M",
      color: REGION_COLORS.Yellowstone,
      states: ["Montana", "Wyoming", "Idaho", "Colorado", "New Mexico", "Utah", "Arizona"],
      districts: [
        { code: "YS-1", label: "MT / WY / Idaho", states: ["Montana", "Wyoming", "Idaho"] },
        { code: "YS-2", label: "CO / NM / UT / Arizona", states: ["Colorado", "New Mexico", "Utah", "Arizona"] }
      ]
    },
    {
      name: "Phoenix",
      cycle_type: "M",
      color: REGION_COLORS.Phoenix,
      states: ["Alaska", "Oregon", "California", "Hawaii", "Nevada", "Washington"],
      districts: [
        { code: "PH-1", label: "Alaska", states: ["Alaska"] },
        { code: "PH-2", label: "Oregon", states: ["Oregon"] },
        { code: "PH-3", label: "N. California", states: ["California"] },
        { code: "PH-4", label: "C. California", states: ["California"] },
        { code: "PH-5", label: "S. California", states: ["California"] },
        { code: "PH-6", label: "Hawaii", states: ["Hawaii"] },
        { code: "PH-7", label: "Nevada", states: ["Nevada"] },
        { code: "PH-8", label: "Washington", states: ["Washington"] }
      ]
    },
    {
      name: "Austin",
      cycle_type: "P",
      color: REGION_COLORS.Austin,
      states: ["Texas", "Oklahoma", "Arkansas", "Louisiana"],
      districts: [
        { code: "AU-1", label: "N. Texas", states: ["Texas"] },
        { code: "AU-2", label: "S. Texas", states: ["Texas"] },
        { code: "AU-3", label: "Oklahoma", states: ["Oklahoma"] },
        { code: "AU-4", label: "Arkansas", states: ["Arkansas"] },
        { code: "AU-5", label: "Louisiana", states: ["Louisiana"] }
      ]
    },
    {
      name: "Superior",
      cycle_type: "M",
      color: REGION_COLORS.Superior,
      states: ["Michigan", "Illinois", "Ohio", "Indiana", "Wisconsin"],
      districts: [
        { code: "SU-1", label: "Michigan", states: ["Michigan"] },
        { code: "SU-2", label: "S. Illinois", states: ["Illinois"] },
        { code: "SU-3", label: "N. Illinois", states: ["Illinois"] },
        { code: "SU-4", label: "Ohio", states: ["Ohio"] },
        { code: "SU-5", label: "Indiana", states: ["Indiana"] },
        { code: "SU-6", label: "Wisconsin", states: ["Wisconsin"] }
      ]
    },
    {
      name: "Heartland",
      cycle_type: "M",
      color: REGION_COLORS.Heartland,
      states: ["Iowa", "Missouri", "North Dakota", "South Dakota", "Minnesota", "Nebraska", "Kansas"],
      districts: [
        { code: "HL-1", label: "Iowa & Missouri", states: ["Iowa", "Missouri"] },
        { code: "HL-2", label: "N/S Dakota - Minnesota", states: ["North Dakota", "South Dakota", "Minnesota"] },
        { code: "HL-3", label: "Nebraska & Kansas", states: ["Nebraska", "Kansas"] }
      ]
    }
  ];

  const STATE_ABBR = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
    FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
    ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
    MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
    NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
    OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
    TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
    VA: "Virginia", WA: "Washington", WV: "West Virginia",
    WI: "Wisconsin", WY: "Wyoming"
  };

  const els = {
    error: document.getElementById("error-box"),
    map: document.getElementById("government-region-map"),
    legend: document.getElementById("region-legend"),
    directory: document.getElementById("region-directory-grid"),
    governmentList: document.getElementById("government-list"),
    modeRegion: document.getElementById("map-mode-region"),
    modeDistrict: document.getElementById("map-mode-district"),
    resetMap: document.getElementById("reset-map-view"),
    stateName: document.getElementById("selected-state-name"),
    stateSummary: document.getElementById("selected-state-summary"),
    region: document.getElementById("selected-region"),
    regionCycle: document.getElementById("selected-region-cycle"),
    district: document.getElementById("selected-district"),
    governor: document.getElementById("selected-governor"),
    governorParty: document.getElementById("selected-governor-party"),
    ltGovernor: document.getElementById("selected-lt-governor"),
    governorStatus: document.getElementById("selected-governor-status"),
    senators: document.getElementById("selected-senators"),
    representative: document.getElementById("selected-representative"),
    representativeParty: document.getElementById("selected-representative-party"),
    representativeStatus: document.getElementById("selected-representative-status")
  };

  let roster = null;
  let stateData = {};
  let map = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      hideError();

      roster = await loadPublicRoster();
      stateData = buildStateData(roster);

      renderLegend();
      renderDirectory();
      renderGovernmentRecords();
      initMap();

      els.modeRegion?.addEventListener("click", () => setMapMode("region"));
      els.modeDistrict?.addEventListener("click", () => setMapMode("district"));
      els.resetMap?.addEventListener("click", resetMapView);
    } catch (err) {
      showError("Could not load public government roster. " + (err.message || err));
      console.error(err);
    }
  }

  async function loadPublicRoster() {
    if (!supabase) return fallbackRoster();

    const { data, error } = await supabase
      .from("government_public_roster")
      .select("data, updated_at")
      .eq("id", "current")
      .maybeSingle();

    if (error || !data?.data) {
      return fallbackRoster();
    }

    return normalizeRoster(data.data);
  }

  function fallbackRoster() {
    return normalizeRoster({
      synced_at: null,
      regions: DEFAULT_REGIONS.map((region, index) => ({
        id: slugify(region.name),
        name: region.name,
        cycle_type: region.cycle_type,
        color: region.color,
        sort_order: index + 1
      })),
      region_states: DEFAULT_REGIONS.flatMap(region =>
        region.states.map(state => ({
          region_id: slugify(region.name),
          state_abbr: abbrByState(state),
          state_name: state
        }))
      ),
      senate_seats: [],
      governors: [],
      house_seats: []
    });
  }

  function normalizeRoster(raw) {
    const regions = (raw.regions || []).map((region, index) => {
      const defaults = DEFAULT_REGIONS.find(r => same(r.name, region.name));

      return {
        id: region.id || slugify(region.name),
        name: region.name || defaults?.name || "Unknown Region",
        cycle_type: region.cycle_type || defaults?.cycle_type || "",
        color: region.color || defaults?.color || "#64748b",
        sort_order: Number(region.sort_order || index + 1),
        districts: defaults?.districts || [],
        states: []
      };
    }).sort((a, b) => a.sort_order - b.sort_order);

    const regionById = Object.fromEntries(regions.map(r => [r.id, r]));

    const regionStates = (raw.region_states || []).map(item => ({
      region_id: item.region_id,
      state_abbr: normalizeAbbr(item.state_abbr),
      state_name: item.state_name || STATE_ABBR[normalizeAbbr(item.state_abbr)] || item.state_abbr
    }));

    regionStates.forEach(item => {
      const region = regionById[item.region_id];
      if (region && item.state_name && !region.states.includes(item.state_name)) {
        region.states.push(item.state_name);
      }
    });

    return {
      synced_at: raw.synced_at || null,
      regions,
      region_states: regionStates,
      senate_seats: raw.senate_seats || [],
      governors: raw.governors || [],
      house_seats: raw.house_seats || []
    };
  }

  function buildStateData(data) {
    const output = {};
    const regionById = Object.fromEntries(data.regions.map(region => [region.id, region]));

    data.region_states.forEach(item => {
      const region = regionById[item.region_id];
      if (!region) return;

      const stateName = item.state_name || STATE_ABBR[item.state_abbr] || item.state_abbr;
      const district = findDistrict(region, stateName);
      const senators = data.senate_seats
        .filter(seat => seat.region_id === region.id)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

      const governor = data.governors.find(gov => gov.region_id === region.id) || null;
      const representative = findRepresentative(data.house_seats, region.id, district, stateName);

      output[stateName] = {
        stateName,
        stateAbbr: item.state_abbr,
        region,
        district,
        senators,
        governor,
        representative
      };
    });

    return output;
  }

  function findDistrict(region, stateName) {
    const matches = (region.districts || []).filter(district =>
      (district.states || []).some(state => same(state, stateName))
    );

    if (matches.length === 1) return matches[0];

    if (matches.length > 1) {
      return {
        code: matches.map(m => m.code).join(" / "),
        label: matches.map(m => `${m.code}: ${m.label}`).join(" | "),
        states: [stateName]
      };
    }

    return {
      code: "Unassigned",
      label: stateName,
      states: [stateName]
    };
  }

  function findRepresentative(houseSeats, regionId, district, stateName) {
    const districtCodes = String(district?.code || "")
      .split("/")
      .map(s => clean(s))
      .filter(Boolean);

    return houseSeats.find(seat => {
      if (seat.region_id !== regionId) return false;

      const code = clean(seat.district_code);
      const area = clean(seat.district_area);
      const state = clean(stateName);

      return districtCodes.includes(code) || area.includes(state);
    }) || null;
  }

  function initMap() {
    if (!els.map || !window.maplibregl) return;

    map = new maplibregl.Map({
      container: "government-region-map",
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#061020" }
          }
        ]
      },
      center: [-96, 38],
      zoom: 3.35,
      minZoom: 2.2,
      maxZoom: 8,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", async () => {
      const geojson = await loadStatesGeojson();

      map.addSource("states", {
        type: "geojson",
        data: geojson
      });

      map.addLayer({
        id: "state-fills",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": [
            "match",
            ["get", "region_name"],
            "Columbia", REGION_COLORS.Columbia,
            "Cambridge", REGION_COLORS.Cambridge,
            "Yellowstone", REGION_COLORS.Yellowstone,
            "Phoenix", REGION_COLORS.Phoenix,
            "Austin", REGION_COLORS.Austin,
            "Superior", REGION_COLORS.Superior,
            "Heartland", REGION_COLORS.Heartland,
            "#334155"
          ],
          "fill-opacity": 0.76
        }
      });

      map.addLayer({
        id: "state-lines",
        type: "line",
        source: "states",
        paint: {
          "line-color": "rgba(226,232,240,.7)",
          "line-width": 1
        }
      });

      map.addLayer({
        id: "state-hover-line",
        type: "line",
        source: "states",
        paint: {
          "line-color": "#ffffff",
          "line-width": 3
        },
        filter: ["==", ["get", "state_name"], ""]
      });

      map.on("mousemove", "state-fills", event => {
        map.getCanvas().style.cursor = "pointer";
        const name = event.features?.[0]?.properties?.state_name;
        if (name) map.setFilter("state-hover-line", ["==", ["get", "state_name"], name]);
      });

      map.on("mouseleave", "state-fills", () => {
        map.getCanvas().style.cursor = "";
        map.setFilter("state-hover-line", ["==", ["get", "state_name"], ""]);
      });

      map.on("click", "state-fills", event => {
        const name = event.features?.[0]?.properties?.state_name;
        if (!name) return;

        selectState(name);

        const details = stateData[name];

        new maplibregl.Popup()
          .setLngLat(event.lngLat)
          .setHTML(`
            <strong>${esc(name)}</strong><br>
            <span>${esc(details?.region?.name || "Unassigned")}</span><br>
            <span>${esc(details?.district?.code || "No district")}</span>
          `)
          .addTo(map);
      });

      const first = Object.keys(stateData)[0];
      if (first) selectState(first);
    });
  }

  async function loadStatesGeojson() {
    const res = await fetch("./data/states.geojson?v=24");
    if (!res.ok) throw new Error("Could not load states.geojson.");

    const geojson = await res.json();

    geojson.features = (geojson.features || []).map(feature => {
      const stateName = getFeatureStateName(feature);
      const details = stateData[stateName];

      feature.properties = {
        ...(feature.properties || {}),
        state_name: stateName,
        region_name: details?.region?.name || "Unassigned",
        district_code: details?.district?.code || "Unassigned"
      };

      return feature;
    });

    return geojson;
  }

  function selectState(stateName) {
    const details = stateData[stateName];

    if (!details) {
      els.stateName.textContent = stateName || "Unknown State";
      els.stateSummary.textContent = "No government assignment found for this state.";
      els.region.textContent = "Unassigned";
      els.regionCycle.textContent = "—";
      els.district.textContent = "—";
      els.governor.textContent = "—";
      els.governorParty.textContent = "—";
      els.ltGovernor.textContent = "—";
      els.governorStatus.textContent = "—";
      els.senators.innerHTML = `<div class="gov-office-row"><span>Senators</span><strong>—</strong></div>`;
      els.representative.textContent = "—";
      els.representativeParty.textContent = "—";
      els.representativeStatus.textContent = "—";
      return;
    }

    els.stateName.textContent = details.stateName;
    els.stateSummary.textContent = `${details.stateName} is assigned to ${details.region.name}. Its district is ${details.district.code} — ${details.district.label}.`;
    els.region.textContent = details.region.name;
    els.regionCycle.textContent = details.region.cycle_type || "—";
    els.district.textContent = `${details.district.code} — ${details.district.label}`;

    els.governor.textContent = details.governor?.governor_name || "Vacant / Unassigned";
    els.governorParty.textContent = details.governor?.governor_party || "—";
    els.ltGovernor.textContent = details.governor?.lt_governor_name || "—";
    els.governorStatus.textContent = prettyStatus(details.governor?.status);

    els.senators.innerHTML = details.senators.length
      ? details.senators.map(seat => `
          <div class="gov-office-row">
            <span>${esc(seat.seat_class || seat.custom_class || seat.seat_name || "Senate")}</span>
            <strong>${esc(seat.holder || "Vacant / Unassigned")} ${seat.party ? `(${esc(seat.party)})` : ""}</strong>
          </div>
        `).join("")
      : `<div class="gov-office-row"><span>Senators</span><strong>Vacant / Unassigned</strong></div>`;

    els.representative.textContent = details.representative?.holder || "Vacant / Unassigned";
    els.representativeParty.textContent = details.representative?.party || "—";
    els.representativeStatus.textContent = prettyStatus(details.representative?.status);
  }

  function setMapMode(mode) {
    els.modeRegion?.classList.toggle("active", mode === "region");
    els.modeDistrict?.classList.toggle("active", mode === "district");

    if (!map?.getLayer("state-fills")) return;

    if (mode === "region") {
      map.setPaintProperty("state-fills", "fill-color", [
        "match",
        ["get", "region_name"],
        "Columbia", REGION_COLORS.Columbia,
        "Cambridge", REGION_COLORS.Cambridge,
        "Yellowstone", REGION_COLORS.Yellowstone,
        "Phoenix", REGION_COLORS.Phoenix,
        "Austin", REGION_COLORS.Austin,
        "Superior", REGION_COLORS.Superior,
        "Heartland", REGION_COLORS.Heartland,
        "#334155"
      ]);
      return;
    }

    map.setPaintProperty("state-fills", "fill-color", [
      "interpolate",
      ["linear"],
      ["to-number", ["coalesce", ["slice", ["get", "district_code"], -1], "0"]],
      1, "#38bdf8",
      3, "#818cf8",
      5, "#f472b6",
      7, "#fb7185",
      9, "#f59e0b"
    ]);
  }

  function resetMapView() {
    map?.flyTo({
      center: [-96, 38],
      zoom: 3.35,
      essential: true
    });
  }

  function renderLegend() {
    if (!els.legend) return;

    els.legend.innerHTML = roster.regions.map(region => `
      <span class="region-legend-item">
        <i class="region-dot" style="background:${escAttr(region.color || "#64748b")}"></i>
        ${esc(region.name)} | ${esc(region.cycle_type || "—")}
      </span>
    `).join("");
  }

  function renderDirectory() {
    if (!els.directory) return;

    els.directory.innerHTML = roster.regions.map(region => `
      <article class="region-directory-card">
        <h3>${esc(region.name)} | ${esc(region.cycle_type || "—")}</h3>
        <p>${esc(region.states.join(", ") || "No states assigned.")}</p>
        <div class="district-pill-list">
          ${(region.districts || []).map(district => `
            <span class="district-pill">${esc(district.code)}: ${esc(district.label)}</span>
          `).join("")}
        </div>
      </article>
    `).join("");
  }

  function renderGovernmentRecords() {
    if (!els.governmentList) return;

    els.governmentList.innerHTML = roster.regions.map(region => {
      const governor = roster.governors.find(g => g.region_id === region.id);
      const senators = roster.senate_seats.filter(s => s.region_id === region.id);
      const house = roster.house_seats.filter(h => h.region_id === region.id);

      return `
        <article class="record-card">
          <h3>${esc(region.name)} Government</h3>
          <div class="record-meta">
            <span class="pill">${esc(region.cycle_type || "—")} Cycle</span>
            <span class="pill">${esc(region.states.length)} States</span>
            <span class="pill">${esc((region.districts || []).length)} Districts</span>
          </div>
          <p><strong>Governor:</strong> ${esc(governor?.governor_name || "Vacant / Unassigned")} ${governor?.governor_party ? `(${esc(governor.governor_party)})` : ""}</p>
          <p><strong>Senate:</strong> ${esc(senators.map(s => `${s.seat_name} — ${s.holder || "Vacant"} (${s.party || "—"})`).join(" | ") || "Vacant / Unassigned")}</p>
          <p><strong>House:</strong> ${esc(house.map(h => `${h.district_code} — ${h.holder || "Vacant"} (${h.party || "—"})`).join(" | ") || "Vacant / Unassigned")}</p>
        </article>
      `;
    }).join("");
  }

  function getFeatureStateName(feature) {
    const p = feature?.properties || {};
    return p.NAME || p.name || p.STATE_NAME || STATE_ABBR[p.STUSPS] || STATE_ABBR[p.postal] || "";
  }

  function abbrByState(name) {
    const found = Object.entries(STATE_ABBR).find(([, value]) => same(value, name));
    return found?.[0] || "";
  }

  function normalizeAbbr(value) {
    return String(value || "").trim().toUpperCase();
  }

  function prettyStatus(value) {
    if (!value) return "—";
    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, m => m.toUpperCase());
  }

  function same(a, b) {
    return clean(a) === clean(b);
  }

  function clean(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function showError(message) {
    if (!els.error) return;
    els.error.textContent = message;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error?.classList.add("hidden");
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }
})();
