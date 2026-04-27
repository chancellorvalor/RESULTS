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

  const REGION_DEFAULTS = [
    {
      name: "Columbia",
      slug: "columbia",
      cycle: "P",
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
      ],
      senateClasses: ["1", "3"]
    },
    {
      name: "Cambridge",
      slug: "cambridge",
      cycle: "P",
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
      ],
      senateClasses: ["2", "3"]
    },
    {
      name: "Yellowstone",
      slug: "yellowstone",
      cycle: "M",
      states: ["Montana", "Wyoming", "Idaho", "Colorado", "New Mexico", "Utah", "Arizona"],
      districts: [
        { code: "YS-1", label: "MT / WY / Idaho", states: ["Montana", "Wyoming", "Idaho"] },
        { code: "YS-2", label: "CO / NM / UT / Arizona", states: ["Colorado", "New Mexico", "Utah", "Arizona"] }
      ],
      senateClasses: ["1", "2"]
    },
    {
      name: "Phoenix",
      slug: "phoenix",
      cycle: "M",
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
      ],
      senateClasses: ["1", "3"]
    },
    {
      name: "Austin",
      slug: "austin",
      cycle: "P",
      states: ["Texas", "Oklahoma", "Arkansas", "Louisiana"],
      districts: [
        { code: "AU-1", label: "N. Texas", states: ["Texas"] },
        { code: "AU-2", label: "S. Texas", states: ["Texas"] },
        { code: "AU-3", label: "Oklahoma", states: ["Oklahoma"] },
        { code: "AU-4", label: "Arkansas", states: ["Arkansas"] },
        { code: "AU-5", label: "Louisiana", states: ["Louisiana"] }
      ],
      senateClasses: ["1", "3"]
    },
    {
      name: "Superior",
      slug: "superior",
      cycle: "M",
      states: ["Michigan", "Illinois", "Ohio", "Indiana", "Wisconsin"],
      districts: [
        { code: "SU-1", label: "Michigan", states: ["Michigan"] },
        { code: "SU-2", label: "S. Illinois", states: ["Illinois"] },
        { code: "SU-3", label: "N. Illinois", states: ["Illinois"] },
        { code: "SU-4", label: "Ohio", states: ["Ohio"] },
        { code: "SU-5", label: "Indiana", states: ["Indiana"] },
        { code: "SU-6", label: "Wisconsin", states: ["Wisconsin"] }
      ],
      senateClasses: ["1", "2"]
    },
    {
      name: "Heartland",
      slug: "heartland",
      cycle: "M",
      states: ["Iowa", "Missouri", "North Dakota", "South Dakota", "Minnesota", "Nebraska", "Kansas"],
      districts: [
        { code: "HL-1", label: "Iowa & Missouri", states: ["Iowa", "Missouri"] },
        { code: "HL-2", label: "N/S Dakota - Minnesota", states: ["North Dakota", "South Dakota", "Minnesota"] },
        { code: "HL-3", label: "Nebraska & Kansas", states: ["Nebraska", "Kansas"] }
      ],
      senateClasses: ["2", "3"]
    }
  ];

  /*
    The public page now attempts the likely FEC/Government Control table names.
    Your admin screenshot has roster-style columns:
    region, seat_name, class, custom_class, holder, party, start, end, status, order
  */
  const TABLE_OPTIONS = {
    regions: [
      "government_regions",
      "gov_regions",
      "roster_regions",
      "fec_regions",
      "regions",
      "region_assignments",
      "government_region_assignments",
      "gov_region_assignments",
      "aprp_regions"
    ],
    governors: [
      "government_governors",
      "gov_governors",
      "roster_governors",
      "fec_governors",
      "governors",
      "government_roster_governors",
      "government_governor_seats",
      "gov_governor_seats",
      "governor_seats",
      "aprp_governors"
    ],
    senators: [
      "government_senate_seats",
      "government_senate",
      "gov_senate_seats",
      "gov_senate",
      "roster_senate_seats",
      "roster_senate",
      "fec_senate_seats",
      "fec_senate",
      "senate_seats",
      "government_senators",
      "gov_senators",
      "senators",
      "aprp_senate_seats",
      "aprp_senators"
    ],
    house: [
      "government_house_seats",
      "government_house",
      "gov_house_seats",
      "gov_house",
      "roster_house_seats",
      "roster_house",
      "fec_house_seats",
      "fec_house",
      "house_seats",
      "government_representatives",
      "gov_representatives",
      "representatives",
      "aprp_house_seats",
      "aprp_representatives"
    ]
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

  let governmentData = null;
  let stateData = {};
  let map;
  let loadedTableNames = {};
  let loadWarnings = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      hideError();

      governmentData = await loadGovernmentData();
      stateData = buildStateData(governmentData);

      renderLegend(governmentData);
      renderDirectory(governmentData);
      renderGovernmentRecords(governmentData);
      renderSourceWarning();
      initMap();

      els.modeRegion?.addEventListener("click", () => setMapMode("region"));
      els.modeDistrict?.addEventListener("click", () => setMapMode("district"));
      els.resetMap?.addEventListener("click", resetMapView);

      console.log("Government map backend source:", loadedTableNames);
      console.log("Government map backend warnings:", loadWarnings);
      console.log("Government map loaded data:", governmentData);
    } catch (err) {
      showError("Could not load government map. " + (err.message || err));
      console.error(err);
    }
  }

  async function loadGovernmentData() {
    const fallback = buildFallbackGovernment();

    if (!supabase) {
      loadedTableNames = {
        regions: "fallback-no-supabase",
        governors: "fallback-no-supabase",
        senators: "fallback-no-supabase",
        house: "fallback-no-supabase"
      };
      return fallback;
    }

    const regionsRaw = await selectFirstWorkingTable("regions", TABLE_OPTIONS.regions);
    const governorsRaw = await selectFirstWorkingTable("governors", TABLE_OPTIONS.governors);
    const senatorsRaw = await selectFirstWorkingTable("senators", TABLE_OPTIONS.senators);
    const houseRaw = await selectFirstWorkingTable("house", TABLE_OPTIONS.house);

    const regions = normalizeRegions(regionsRaw || fallback.regions, fallback.regions);
    const governors = normalizeGovernors(governorsRaw || fallback.governors, fallback.governors);
    const senators = normalizeSenators(senatorsRaw || fallback.senators, fallback.senators);
    const house = normalizeHouse(houseRaw || fallback.house, fallback.house);

    if (!senatorsRaw) {
      loadWarnings.push("Senate roster did not load from backend. Public page is using fallback vacant seats.");
    }

    if (!houseRaw) {
      loadWarnings.push("House roster did not load from backend. Public page is using fallback vacant seats.");
    }

    if (!governorsRaw) {
      loadWarnings.push("Governor roster did not load from backend. Public page is using fallback vacant governors.");
    }

    return { regions, governors, senators, house };
  }

  async function selectFirstWorkingTable(kind, tableNames) {
    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(1000);

        if (!error && Array.isArray(data)) {
          loadedTableNames[kind] = tableName;
          return data;
        }

        if (error) {
          loadWarnings.push(`${kind}: ${tableName} failed: ${error.message}`);
        }
      } catch (err) {
        loadWarnings.push(`${kind}: ${tableName} failed: ${err.message || err}`);
      }
    }

    loadedTableNames[kind] = "fallback";
    return null;
  }

  function buildFallbackGovernment() {
    const regions = REGION_DEFAULTS.map(region => ({
      name: region.name,
      slug: region.slug,
      cycle: region.cycle,
      color: REGION_COLORS[region.name],
      states: region.states,
      districts: region.districts,
      senateClasses: region.senateClasses
    }));

    const governors = REGION_DEFAULTS.map(region => ({
      region: region.name,
      governor: "Vacant / Unassigned",
      party: "—",
      lieutenant_governor: "—",
      status: "No backend record"
    }));

    const senators = REGION_DEFAULTS.flatMap(region =>
      region.senateClasses.map(cls => ({
        region: region.name,
        seat_name: `${region.name} Class ${cls} Senator`,
        class: cls,
        custom_class: cls,
        senator: "Vacant / Unassigned",
        holder: "Vacant / Unassigned",
        party: "—",
        status: "No backend record",
        order: Number(cls)
      }))
    );

    const house = REGION_DEFAULTS.flatMap(region =>
      region.districts.map((district, index) => ({
        region: region.name,
        district_code: district.code,
        seat_name: district.code,
        district_name: district.label,
        representative: "Vacant / Unassigned",
        holder: "Vacant / Unassigned",
        party: "—",
        status: "No backend record",
        order: index + 1
      }))
    );

    return { regions, governors, senators, house };
  }

  function normalizeRegions(rows, fallbackRows) {
    if (!Array.isArray(rows) || !rows.length) return fallbackRows;

    const normalized = rows.map(row => {
      const rowRegion = getAny(row, ["region", "name", "region_name", "slug"]);
      const fallback = findRegionDefault(rowRegion);

      const stateList = normalizeStateList(getAny(row, [
        "states",
        "state_names",
        "assigned_states",
        "states_json",
        "state_list"
      ]));

      return {
        name: getAny(row, ["name", "region", "region_name"]) || fallback?.name || "Unknown Region",
        slug: getAny(row, ["slug"]) || slugify(rowRegion || fallback?.name || "unknown"),
        cycle: getAny(row, ["cycle", "house_cycle", "type"]) || fallback?.cycle || "—",
        color: getAny(row, ["color", "hex_color"]) || fallback?.color || REGION_COLORS[fallback?.name] || "#60a5fa",
        states: stateList.length ? stateList : fallback?.states || [],
        districts: normalizeDistricts(getAny(row, ["districts", "districts_json"]), fallback?.districts || []),
        senateClasses: normalizeClasses(getAny(row, ["senate_classes", "classes"]), fallback?.senateClasses || [])
      };
    });

    return mergeRegionDefaults(normalized, fallbackRows);
  }

  function mergeRegionDefaults(rows, fallbackRows) {
    return fallbackRows.map(fallback => {
      const actual = rows.find(row => sameRegion(row.name, fallback.name));
      if (!actual) return fallback;

      return {
        ...fallback,
        ...actual,
        states: actual.states?.length ? actual.states : fallback.states,
        districts: actual.districts?.length ? actual.districts : fallback.districts,
        senateClasses: actual.senateClasses?.length ? actual.senateClasses : fallback.senateClasses
      };
    });
  }

  function normalizeGovernors(rows, fallbackRows) {
    if (!Array.isArray(rows) || !rows.length) return fallbackRows;

    return rows.map(row => {
      const holder = getAny(row, [
        "holder",
        "governor",
        "office_holder",
        "incumbent",
        "name",
        "governor_name"
      ]);

      return {
        region: cleanRegionName(getAny(row, ["region", "region_name", "state_region", "name"])),
        governor: holder || "Vacant / Unassigned",
        holder: holder || "Vacant / Unassigned",
        party: getAny(row, ["party", "governor_party"]) || "—",
        lieutenant_governor: getAny(row, ["lieutenant_governor", "lt_governor", "ltg", "lieutenant", "deputy"]) || "—",
        start: getAny(row, ["start", "term_start", "start_date"]) || "",
        end: getAny(row, ["end", "term_end", "end_date"]) || "",
        status: getAny(row, ["status", "vacancy_status"]) || (row.vacant ? "Vacant" : holder ? "Occupied" : "Vacant"),
        order: Number(getAny(row, ["order", "display_order", "sort_order"]) || 999)
      };
    }).sort((a, b) => a.order - b.order);
  }

  function normalizeSenators(rows, fallbackRows) {
    if (!Array.isArray(rows) || !rows.length) return fallbackRows;

    return rows.map(row => {
      const region = cleanRegionName(getAny(row, ["region", "region_name", "state_region"]));
      const rawClass = getAny(row, ["custom_class", "class", "senate_class", "seat_class"]);
      const holder = getAny(row, [
        "holder",
        "senator",
        "office_holder",
        "incumbent",
        "name",
        "senator_name"
      ]);

      return {
        region,
        seat_name: getAny(row, ["seat_name", "name", "seat", "office"]) || `${region} Class ${rawClass} Senator`,
        class: normalizeClassValue(rawClass),
        custom_class: normalizeClassValue(rawClass),
        senator: holder || "Vacant / Unassigned",
        holder: holder || "Vacant / Unassigned",
        party: getAny(row, ["party"]) || "—",
        start: getAny(row, ["start", "term_start", "start_date"]) || "",
        end: getAny(row, ["end", "term_end", "end_date"]) || "",
        status: getAny(row, ["status", "vacancy_status"]) || (row.vacant ? "Vacant" : holder ? "Occupied" : "Vacant"),
        order: Number(getAny(row, ["order", "display_order", "sort_order"]) || normalizeClassValue(rawClass) || 999)
      };
    }).sort((a, b) => a.order - b.order);
  }

  function normalizeHouse(rows, fallbackRows) {
    if (!Array.isArray(rows) || !rows.length) return fallbackRows;

    return rows.map(row => {
      const region = cleanRegionName(getAny(row, ["region", "region_name", "state_region"]));
      const code = getAny(row, [
        "district_code",
        "seat_name",
        "seat",
        "code",
        "name",
        "district",
        "district_id"
      ]);

      const holder = getAny(row, [
        "holder",
        "representative",
        "rep",
        "office_holder",
        "incumbent",
        "name",
        "representative_name"
      ]);

      return {
        region,
        district_code: code || "—",
        seat_name: code || "—",
        district_name: getAny(row, ["district_name", "label", "description"]) || code || "—",
        representative: holder || "Vacant / Unassigned",
        holder: holder || "Vacant / Unassigned",
        party: getAny(row, ["party"]) || "—",
        start: getAny(row, ["start", "term_start", "start_date"]) || "",
        end: getAny(row, ["end", "term_end", "end_date"]) || "",
        status: getAny(row, ["status", "vacancy_status"]) || (row.vacant ? "Vacant" : holder ? "Occupied" : "Vacant"),
        order: Number(getAny(row, ["order", "display_order", "sort_order"]) || 999)
      };
    }).sort((a, b) => a.order - b.order);
  }

  function buildStateData(government) {
    const output = {};

    government.regions.forEach(region => {
      region.states.forEach(stateName => {
        const district = findDistrictForState(region, stateName);
        const governor = findGovernor(government.governors, region.name);
        const senators = findSenators(government.senators, region.name);
        const representative = district
          ? findRepresentative(government.house, region.name, district.code)
          : null;

        output[normalizeStateName(stateName)] = {
          state: stateName,
          region,
          district,
          governor,
          senators,
          representative
        };
      });
    });

    return output;
  }

  function findDistrictForState(region, stateName) {
    const normalizedState = normalizeStateName(stateName);

    const matches = (region.districts || []).filter(district =>
      normalizeStateList(district.states || district.state_names || [])
        .map(normalizeStateName)
        .includes(normalizedState)
    );

    if (matches.length === 1) return matches[0];

    if (matches.length > 1) {
      return {
        code: matches.map(d => d.code).join(" / "),
        label: matches.map(d => `${d.code}: ${d.label}`).join(" | "),
        states: [stateName]
      };
    }

    return null;
  }

  function findGovernor(governors, regionName) {
    return governors.find(g => sameRegion(g.region, regionName)) || null;
  }

  function findSenators(senators, regionName) {
    return senators.filter(s => sameRegion(s.region, regionName));
  }

  function findRepresentative(house, regionName, districtCode) {
    const districtCodes = String(districtCode || "")
      .split("/")
      .map(s => normalizeText(s))
      .filter(Boolean);

    return house.find(h => {
      if (!sameRegion(h.region, regionName)) return false;

      const code = normalizeText(h.district_code || h.seat_name);
      return districtCodes.includes(code);
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
            paint: {
              "background-color": "#061020"
            }
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
          "fill-color": getRegionColorExpression(),
          "fill-opacity": 0.72
        }
      });

      map.addLayer({
        id: "state-lines",
        type: "line",
        source: "states",
        paint: {
          "line-color": "rgba(226,232,240,.72)",
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
        filter: ["==", ["get", "name"], ""]
      });

      map.on("mousemove", "state-fills", event => {
        map.getCanvas().style.cursor = "pointer";

        const feature = event.features?.[0];
        const stateName = getFeatureStateName(feature);
        if (stateName) {
          map.setFilter("state-hover-line", ["==", ["get", "name"], stateName]);
        }
      });

      map.on("mouseleave", "state-fills", () => {
        map.getCanvas().style.cursor = "";
        map.setFilter("state-hover-line", ["==", ["get", "name"], ""]);
      });

      map.on("click", "state-fills", event => {
        const feature = event.features?.[0];
        const stateName = getFeatureStateName(feature);
        if (!stateName) return;

        selectState(stateName);

        const details = stateData[normalizeStateName(stateName)];
        const html = `
          <strong>${escapeHtml(stateName)}</strong><br>
          <span>${escapeHtml(details?.region?.name || "Unassigned region")}</span><br>
          <span>${escapeHtml(details?.district?.code || "No district")}</span>
        `;

        new maplibregl.Popup()
          .setLngLat(event.lngLat)
          .setHTML(html)
          .addTo(map);
      });

      selectFirstState();
    });
  }

  async function loadStatesGeojson() {
    const response = await fetch("./data/states.geojson?v=23");
    if (!response.ok) throw new Error("Could not load public/data/states.geojson");

    const geojson = await response.json();

    geojson.features = (geojson.features || []).map(feature => {
      const stateName = getFeatureStateName(feature);
      const details = stateData[normalizeStateName(stateName)];

      feature.properties = {
        ...(feature.properties || {}),
        name: stateName,
        aprp_region: details?.region?.name || "Unassigned",
        aprp_district: details?.district?.code || "Unassigned"
      };

      return feature;
    });

    return geojson;
  }

  function getRegionColorExpression() {
    return [
      "match",
      ["get", "aprp_region"],
      "Columbia", REGION_COLORS.Columbia,
      "Cambridge", REGION_COLORS.Cambridge,
      "Yellowstone", REGION_COLORS.Yellowstone,
      "Phoenix", REGION_COLORS.Phoenix,
      "Austin", REGION_COLORS.Austin,
      "Superior", REGION_COLORS.Superior,
      "Heartland", REGION_COLORS.Heartland,
      "#334155"
    ];
  }

  function setMapMode(mode) {
    els.modeRegion?.classList.toggle("active", mode === "region");
    els.modeDistrict?.classList.toggle("active", mode === "district");

    if (!map?.getLayer("state-fills")) return;

    if (mode === "region") {
      map.setPaintProperty("state-fills", "fill-color", getRegionColorExpression());
      return;
    }

    map.setPaintProperty("state-fills", "fill-color", [
      "interpolate",
      ["linear"],
      ["to-number", ["coalesce", ["slice", ["get", "aprp_district"], -1], "0"]],
      1, "#38bdf8",
      3, "#818cf8",
      5, "#f472b6",
      7, "#fb7185",
      9, "#f59e0b"
    ]);
  }

  function resetMapView() {
    if (!map) return;

    map.flyTo({
      center: [-96, 38],
      zoom: 3.35,
      essential: true
    });
  }

  function selectFirstState() {
    const first = Object.keys(stateData)[0];
    if (!first) return;
    selectState(stateData[first].state);
  }

  function selectState(stateName) {
    const details = stateData[normalizeStateName(stateName)];

    if (!details) {
      setStatePanelUnknown(stateName);
      return;
    }

    els.stateName.textContent = details.state;
    els.stateSummary.textContent = `${details.state} is assigned to ${details.region.name}. Its district is ${details.district?.code || "not assigned"}${details.district?.label ? ` — ${details.district.label}` : ""}.`;

    els.region.textContent = details.region.name || "—";
    els.regionCycle.textContent = details.region.cycle || "—";
    els.district.textContent = details.district
      ? `${details.district.code} — ${details.district.label}`
      : "Unassigned";

    els.governor.textContent = details.governor?.governor || details.governor?.holder || "Vacant / Unassigned";
    els.governorParty.textContent = details.governor?.party || "—";
    els.ltGovernor.textContent = details.governor?.lieutenant_governor || "—";
    els.governorStatus.textContent = details.governor?.status || "—";

    els.senators.innerHTML = details.senators.length
      ? details.senators.map(senator => `
          <div class="gov-office-row">
            <span>${escapeHtml(formatSenateClass(senator.class))}</span>
            <strong>${escapeHtml(senator.senator || senator.holder || "Vacant")} ${senator.party ? `(${escapeHtml(senator.party)})` : ""}</strong>
          </div>
        `).join("")
      : `
          <div class="gov-office-row">
            <span>Senators</span>
            <strong>Vacant / Unassigned</strong>
          </div>
        `;

    els.representative.textContent = details.representative?.representative || details.representative?.holder || "Vacant / Unassigned";
    els.representativeParty.textContent = details.representative?.party || "—";
    els.representativeStatus.textContent = details.representative?.status || "—";
  }

  function setStatePanelUnknown(stateName) {
    els.stateName.textContent = stateName || "Unknown State";
    els.stateSummary.textContent = "This state is not currently assigned to an APRP region.";
    els.region.textContent = "Unassigned";
    els.regionCycle.textContent = "—";
    els.district.textContent = "—";
    els.governor.textContent = "—";
    els.governorParty.textContent = "—";
    els.ltGovernor.textContent = "—";
    els.governorStatus.textContent = "—";
    els.senators.innerHTML = `
      <div class="gov-office-row">
        <span>Senators</span>
        <strong>—</strong>
      </div>
    `;
    els.representative.textContent = "—";
    els.representativeParty.textContent = "—";
    els.representativeStatus.textContent = "—";
  }

  function renderLegend(government) {
    if (!els.legend) return;

    els.legend.innerHTML = government.regions.map(region => `
      <span class="region-legend-item">
        <i class="region-dot" style="background:${region.color || REGION_COLORS[region.name] || "#60a5fa"}"></i>
        ${escapeHtml(region.name)} | ${escapeHtml(region.cycle)}
      </span>
    `).join("");
  }

  function renderDirectory(government) {
    if (!els.directory) return;

    els.directory.innerHTML = government.regions.map(region => `
      <article class="region-directory-card">
        <h3>${escapeHtml(region.name)} | ${escapeHtml(region.cycle || "—")}</h3>
        <p>${escapeHtml(region.states.join(", "))}</p>

        <div class="district-pill-list">
          ${(region.districts || []).map(district => `
            <span class="district-pill">${escapeHtml(district.code)}: ${escapeHtml(district.label)}</span>
          `).join("")}
        </div>
      </article>
    `).join("");
  }

  function renderGovernmentRecords(government) {
    if (!els.governmentList) return;

    els.governmentList.innerHTML = government.regions.map(region => {
      const governor = findGovernor(government.governors, region.name);
      const senators = findSenators(government.senators, region.name);
      const houseSeats = government.house.filter(h => sameRegion(h.region, region.name));

      return `
        <article class="record-card">
          <h3>${escapeHtml(region.name)} Government</h3>

          <div class="record-meta">
            <span class="pill">${escapeHtml(region.cycle || "—")} Cycle</span>
            <span class="pill">${escapeHtml(region.states.length)} States</span>
            <span class="pill">${escapeHtml((region.districts || []).length)} Districts</span>
            <span class="pill">Senate Source: ${escapeHtml(loadedTableNames.senators || "fallback")}</span>
            <span class="pill">House Source: ${escapeHtml(loadedTableNames.house || "fallback")}</span>
          </div>

          <p><strong>Governor:</strong> ${escapeHtml(governor?.governor || governor?.holder || "Vacant")} ${governor?.party ? `(${escapeHtml(governor.party)})` : ""}</p>
          <p><strong>Senate:</strong> ${escapeHtml(senators.map(s => `${formatSenateClass(s.class)} — ${s.senator || s.holder} (${s.party || "—"})`).join(" | ") || "Vacant / Unassigned")}</p>
          <p><strong>House:</strong> ${escapeHtml(houseSeats.map(h => `${h.district_code} — ${h.representative || h.holder} (${h.party || "—"})`).join(" | ") || "Vacant / Unassigned")}</p>
        </article>
      `;
    }).join("");
  }

  function renderSourceWarning() {
    if (!loadWarnings.length) return;

    const criticalFallback =
      loadedTableNames.senators === "fallback" ||
      loadedTableNames.house === "fallback" ||
      loadedTableNames.governors === "fallback";

    if (!criticalFallback) return;

    showError(
      "Public government map is not reading one or more roster tables yet. " +
      "Open browser console to see attempted table names. Current sources: " +
      JSON.stringify(loadedTableNames)
    );
  }

  function normalizeDistricts(value, fallbackDistricts) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return fallbackDistricts;
      }
    }

    return fallbackDistricts;
  }

  function normalizeClasses(value, fallbackClasses) {
    if (Array.isArray(value)) return value.map(normalizeClassValue);

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(normalizeClassValue);
      } catch {
        return value.split(",").map(normalizeClassValue).filter(Boolean);
      }
    }

    return fallbackClasses;
  }

  function normalizeClassValue(value) {
    return String(value || "")
      .replace(/class/gi, "")
      .trim();
  }

  function getFeatureStateName(feature) {
    const props = feature?.properties || {};
    return props.name || props.NAME || props.state || props.STATE_NAME || props.STUSPS || props.postal || "";
  }

  function findRegionDefault(value) {
    const normalized = normalizeText(value);
    return REGION_DEFAULTS.find(region =>
      normalizeText(region.name) === normalized ||
      normalizeText(region.slug) === normalized
    );
  }

  function normalizeStateList(value) {
    if (Array.isArray(value)) return value.map(String);

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return value
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
      }
    }

    return [];
  }

  function normalizeStateName(value) {
    const raw = String(value || "").trim();

    const aliases = {
      "W. Virginia": "West Virginia",
      "WV": "West Virginia",
      "VA": "Virginia",
      "NC": "North Carolina",
      "KY": "Kentucky",
      "TN": "Tennessee",
      "AL": "Alabama",
      "MS": "Mississippi",
      "FL": "Florida",
      "GA": "Georgia",
      "SC": "South Carolina",
      "R. Island": "Rhode Island",
      "N. Hampshire": "New Hampshire",
      "MT": "Montana",
      "WY": "Wyoming",
      "CO": "Colorado",
      "NM": "New Mexico",
      "UT": "Utah",
      "N/S Dakota": "North Dakota",
      "N. California": "California",
      "C. California": "California",
      "S. California": "California",
      "N. Texas": "Texas",
      "S. Texas": "Texas",
      "N. Illinois": "Illinois",
      "S. Illinois": "Illinois"
    };

    return aliases[raw] || raw;
  }

  function cleanRegionName(value) {
    const raw = String(value || "").trim();
    const fallback = findRegionDefault(raw);
    return fallback?.name || raw || "Unknown Region";
  }

  function sameRegion(a, b) {
    return normalizeText(a) === normalizeText(b);
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function formatSenateClass(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Senate";
    if (raw.toLowerCase().includes("class")) return raw;
    return `Class ${raw}`;
  }

  function getAny(row, keys) {
    for (const key of keys) {
      if (row && row[key] !== undefined && row[key] !== null && row[key] !== "") {
        return row[key];
      }
    }

    return "";
  }

  function showError(message) {
    if (!els.error) {
      console.error(message);
      return;
    }

    els.error.textContent = message;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error?.classList.add("hidden");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }
})();
