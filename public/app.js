(() => {
  const cfg = window.APRP_CONFIG || {};
  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const els = {
    loader: document.getElementById("loader"),
    title: document.getElementById("election-title"),
    year: document.getElementById("election-year"),
    subtitle: document.getElementById("election-subtitle"),
    error: document.getElementById("error-box"),

    winnerCard: document.getElementById("winner-card"),
    winnerName: document.getElementById("winner-name"),

    leftPhoto: document.getElementById("left-photo"),
    leftParty: document.getElementById("left-party"),
    leftName: document.getElementById("left-name"),
    leftEv: document.getElementById("left-ev"),
    leftVotes: document.getElementById("left-votes"),
    leftShort: document.getElementById("left-short"),

    rightPhoto: document.getElementById("right-photo"),
    rightParty: document.getElementById("right-party"),
    rightName: document.getElementById("right-name"),
    rightEv: document.getElementById("right-ev"),
    rightVotes: document.getElementById("right-votes"),
    rightShort: document.getElementById("right-short"),

    evFillLeft: document.getElementById("ev-fill-left"),
    evFillRight: document.getElementById("ev-fill-right"),
    evThreshold: document.getElementById("ev-threshold"),
    evLeftLabel: document.getElementById("ev-left-label"),
    evRightLabel: document.getElementById("ev-right-label"),
    toWinLabel: document.getElementById("to-win-label"),
    totalEvLabel: document.getElementById("total-ev-label"),

    popularLeftLabel: document.getElementById("popular-left-label"),
    popularRightLabel: document.getElementById("popular-right-label"),
    popularFillLeft: document.getElementById("popular-fill-left"),
    popularFillRight: document.getElementById("popular-fill-right"),
    nationalReporting: document.getElementById("national-reporting"),
    lastUpdated: document.getElementById("last-updated"),

    resetMap: document.getElementById("reset-map"),
    toggleLegend: document.getElementById("toggle-legend"),
    legend: document.getElementById("legend"),

    mapModeCalled: document.getElementById("map-mode-called"),
    mapModeLead: document.getElementById("map-mode-lead"),
    mapModeTurnout: document.getElementById("map-mode-turnout"),

    tableHead: document.getElementById("state-table-head"),
    tableBody: document.getElementById("state-table-body"),
    search: document.getElementById("state-search"),
    ticker: document.getElementById("closest-races"),

    stateModal: document.getElementById("state-modal"),
    modalClose: document.getElementById("modal-close"),
    modalCloseBackdrop: document.getElementById("modal-close-backdrop"),
    modalStateKicker: document.getElementById("modal-state-kicker"),
    modalStateTitle: document.getElementById("modal-state-title"),
    modalStateMeta: document.getElementById("modal-state-meta"),
    modalStatusPill: document.getElementById("modal-status-pill"),

    modalLeftPhoto: document.getElementById("modal-left-photo"),
    modalLeftName: document.getElementById("modal-left-name"),
    modalLeftParty: document.getElementById("modal-left-party"),
    modalLeftPct: document.getElementById("modal-left-pct"),
    modalLeftVotes: document.getElementById("modal-left-votes"),

    modalRightPhoto: document.getElementById("modal-right-photo"),
    modalRightName: document.getElementById("modal-right-name"),
    modalRightParty: document.getElementById("modal-right-party"),
    modalRightPct: document.getElementById("modal-right-pct"),
    modalRightVotes: document.getElementById("modal-right-votes"),

    modalBarLeft: document.getElementById("modal-bar-left"),
    modalBarRight: document.getElementById("modal-bar-right"),
    modalCountedVotes: document.getElementById("modal-counted-votes"),
    modalLeaderName: document.getElementById("modal-leader-name"),
    modalLeadMargin: document.getElementById("modal-lead-margin"),
    modalStatusText: document.getElementById("modal-status-text"),
    modalThirdCandidate: document.getElementById("modal-third-candidate"),

    pathButton: document.getElementById("path-to-victory"),
    pathModal: document.getElementById("path-modal"),
    pathClose: document.getElementById("path-close"),
    pathCloseBackdrop: document.getElementById("path-close-backdrop"),
    pathLeftName: document.getElementById("path-left-name"),
    pathRightName: document.getElementById("path-right-name"),
    pathLeftEv: document.getElementById("path-left-ev"),
    pathRightEv: document.getElementById("path-right-ev"),
  };

  let map;
  let pathMap;
  let geojson;
  let election;
  let rows = [];
  let candidates = [];
  let leftCandidate;
  let rightCandidate;
  let pathSelections = {};
  let mapMode = "called";

  const defaultColors = {
    uncalled: "#425568",
    tossup: "#8b8f98",
  };

  const STATE_NAME_TO_ABBR = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "district of columbia": "DC",
    "d.c.": "DC",
    "dc": "DC",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      wireButtons();
      setMapMode("called", false);
      initMap();
      await loadGeoJson();
      await loadAndRender();

      if (cfg.refreshSeconds) {
        setInterval(loadAndRender, cfg.refreshSeconds * 1000);
      }
    } catch (err) {
      showError("Startup failed: " + (err.message || err));
      if (els.loader) els.loader.style.display = "none";
    }
  }

  function wireButtons() {
    if (els.resetMap) {
      els.resetMap.onclick = () => {
        map?.flyTo({ center: [-98.5795, 39.8283], zoom: 3.45 });
      };
    }

    if (els.toggleLegend) {
      els.toggleLegend.onclick = () => {
        els.legend?.classList.toggle("hidden");
      };
    }

    if (els.mapModeCalled) {
      els.mapModeCalled.onclick = () => setMapMode("called");
    }

    if (els.mapModeLead) {
      els.mapModeLead.onclick = () => setMapMode("lead");
    }

    if (els.mapModeTurnout) {
      els.mapModeTurnout.onclick = () => setMapMode("turnout");
    }

    if (els.search) {
      els.search.oninput = () => renderTable();
    }

    if (els.modalClose) els.modalClose.onclick = closeStateModal;
    if (els.modalCloseBackdrop) els.modalCloseBackdrop.onclick = closeStateModal;

    if (els.pathButton) els.pathButton.onclick = openPathModal;
    if (els.pathClose) els.pathClose.onclick = closePathModal;
    if (els.pathCloseBackdrop) els.pathCloseBackdrop.onclick = closePathModal;
  }

  function setMapMode(mode, redraw = true) {
    mapMode = mode;

    [els.mapModeCalled, els.mapModeLead, els.mapModeTurnout].forEach(btn => {
      if (btn) btn.classList.remove("active-map-mode");
    });

    if (mode === "called" && els.mapModeCalled) {
      els.mapModeCalled.classList.add("active-map-mode");
    }

    if (mode === "lead" && els.mapModeLead) {
      els.mapModeLead.classList.add("active-map-mode");
    }

    if (mode === "turnout" && els.mapModeTurnout) {
      els.mapModeTurnout.classList.add("active-map-mode");
    }

    if (redraw) {
      drawMainMap();
      renderLegend();
    }
  }

  function initMap() {
    if (!document.getElementById("map")) return;

    map = new maplibregl.Map({
      container: "map",
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [-98.5795, 39.8283],
      zoom: 3.45,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      if (geojson) drawMainMap();
    });
  }

  async function loadGeoJson() {
    const res = await fetch("./data/states.geojson");
    if (!res.ok) throw new Error("Could not load states.geojson");
    geojson = await res.json();
  }

  async function loadAndRender() {
    try {
      hideError();

      const { data: electionData, error: electionError } = await supabase
        .from("elections")
        .select("*")
        .eq("slug", cfg.defaultElectionSlug)
        .single();

      if (electionError) throw electionError;

      election = electionData;
      candidates = normalizeCandidates(election.candidates);

      leftCandidate =
        findCandidate("dem") ||
        findCandidate("dnc") ||
        candidates[1] ||
        candidates[0];

      rightCandidate =
        findCandidate("gop") ||
        candidates[0];

      const { data: resultRows, error: resultsError } = await supabase
        .from("state_results")
        .select("*")
        .eq("election_id", election.id)
        .order("state_name");

      if (resultsError) throw resultsError;

      rows = (resultRows || []).map(calculateRow);

      renderAll();
    } catch (err) {
      showError(
        "Could not load live results. Check shared/config.js, Supabase setup, and whether the schema was run. " +
          (err.message || err)
      );
    } finally {
      if (els.loader) els.loader.style.display = "none";
    }
  }

  function normalizeCandidates(raw) {
    let parsed = [];

    try {
      parsed = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
    } catch {
      parsed = [];
    }

    const base = parsed.length
      ? parsed
      : [
          {
            id: "dem",
            party: "DNC",
            name: "Democratic Candidate",
            shortName: "DNC",
            color: "#3498db",
            image: "",
          },
          {
            id: "gop",
            party: "GOP",
            name: "Republican Candidate",
            shortName: "GOP",
            color: "#e74c3c",
            image: "",
          },
          {
            id: "ind",
            party: "IND",
            name: "Independent",
            shortName: "IND",
            color: "#9b59b6",
            image: "",
          },
        ];

    return base.map(c => {
      const id = normalizePartyId(c.id || c.party || "");

      return {
        id,
        party: c.party || id.toUpperCase(),
        name: c.name || c.party || id.toUpperCase(),
        shortName: c.shortName || c.party || c.name || id.toUpperCase(),
        color: c.color || defaultCandidateColor(id),
        image: c.image || "",
      };
    });
  }

  function normalizePartyId(id) {
    const v = String(id || "").trim().toLowerCase();

    if (v === "dnc" || v === "democrat" || v === "democratic") return "dem";
    if (v === "republican" || v === "rep") return "gop";
    if (v === "independent" || v === "other") return "ind";
    if (!v || v === "null" || v === "undefined") return "";

    return v;
  }

  function defaultCandidateColor(id) {
    if (id === "dem") return "#3498db";
    if (id === "gop") return "#e74c3c";
    if (id === "ind") return "#9b59b6";
    return "#64748b";
  }

  function findCandidate(id) {
    const norm = normalizePartyId(id);
    return candidates.find(c => c.id === norm);
  }

  function calculateRow(r) {
    const abbr = normalizeAbbr(r.abbr || r.state_abbr || r.state_code || r.state_name);

    const turnout = Number(r.total_turnout || 0);
    const reportingPct = Number(r.turnout_pct || 0);
    const counted = Math.round((turnout * reportingPct) / 100);

    const votes = {
      gop: Math.round((counted * Number(r.gop_pct || 0)) / 100),
      dem: Math.round((counted * Number(r.dem_pct || r.dnc_pct || 0)) / 100),
      ind: Math.round((counted * Number(r.ind_pct || 0)) / 100),
    };

    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    const leader = sorted[0]?.[0] || "gop";
    const leaderVotes = sorted[0]?.[1] || 0;
    const secondVotes = sorted[1]?.[1] || 0;
    const totalVotes = votes.gop + votes.dem + votes.ind;
    const voteLead = Math.max(0, leaderVotes - secondVotes);
    const marginPct = totalVotes ? (voteLead / totalVotes) * 100 : 0;

    const manualCall = normalizePartyId(r.called_party || "");

    return {
      ...r,
      abbr,
      state_name: r.state_name || r.name || abbr,
      counted_votes: counted,
      votes,
      leader,
      leader_votes: leaderVotes,
      second_votes: secondVotes,
      vote_lead: voteLead,
      called_party: manualCall || "",
      margin_pct: marginPct,
      total_votes: totalVotes,
      status: totalVotes ? statusFromMargin(marginPct) : "Unreported",
    };
  }

  function statusFromMargin(margin) {
    if (margin < 1) return "TCTC";
    if (margin < 3) return "Tilt";
    if (margin < 7) return "Lean";
    if (margin < 12) return "Likely";
    return "Safe";
  }

  function renderAll() {
    if (!election) return;

    setText(els.title, election.title || "Election Results");
    setText(els.subtitle, election.subtitle || "Live map");

    if (els.year) {
      els.year.textContent = election.year || "";
      els.year.classList.toggle("hidden", !election.year);
    }

    document.title = election.title || "Live Results";

    renderScoreboard();
    renderLegend();
    renderTicker();
    renderTable();
    drawMainMap();

    setText(els.lastUpdated, "Updated " + new Date().toLocaleTimeString());
  }

  function totals() {
    const t = {
      ev: {},
      pv: {},
      counted: 0,
      expected: 0,
    };

    candidates.forEach(c => {
      t.ev[c.id] = 0;
      t.pv[c.id] = 0;
    });

    rows.forEach(r => {
      t.counted += Number(r.counted_votes || 0);
      t.expected += Number(r.total_turnout || 0);

      candidates.forEach(c => {
        t.pv[c.id] += r.votes[c.id] || 0;
      });

      if (r.called_party) {
        t.ev[r.called_party] = (t.ev[r.called_party] || 0) + Number(r.electoral_votes || 0);
      }
    });

    return t;
  }

  function renderScoreboard() {
    if (!leftCandidate || !rightCandidate) return;

    const t = totals();
    const totalEv = Number(election.total_electoral_votes || 538);
    const winThreshold = Number(election.win_threshold || 270);
    const totalPv = candidates.reduce((sum, c) => sum + (t.pv[c.id] || 0), 0);
    const reporting = t.expected ? Math.min(100, (t.counted / t.expected) * 100) : 0;

    setCandidateTop("left", leftCandidate, t, totalPv);
    setCandidateTop("right", rightCandidate, t, totalPv);

    setText(els.leftShort, leftCandidate.shortName || leftCandidate.party);
    setText(els.rightShort, rightCandidate.shortName || rightCandidate.party);

    if (els.evFillLeft) {
      els.evFillLeft.style.background = leftCandidate.color;
      els.evFillLeft.style.width = `${pct(t.ev[leftCandidate.id], totalEv)}%`;
    }

    if (els.evFillRight) {
      els.evFillRight.style.background = rightCandidate.color;
      els.evFillRight.style.width = `${pct(t.ev[rightCandidate.id], totalEv)}%`;
    }

    if (els.evThreshold) {
      els.evThreshold.style.left = `${pct(winThreshold, totalEv)}%`;
    }

    setText(els.evLeftLabel, t.ev[leftCandidate.id] || 0);
    setText(els.evRightLabel, t.ev[rightCandidate.id] || 0);
    setText(els.toWinLabel, `${winThreshold} TO WIN`);
    setText(els.totalEvLabel, totalEv);

    setText(els.popularLeftLabel, leftCandidate.party);
    setText(els.popularRightLabel, rightCandidate.party);

    if (els.popularFillLeft) {
      els.popularFillLeft.style.background = leftCandidate.color;
      els.popularFillLeft.style.width = `${pct(t.pv[leftCandidate.id], totalPv)}%`;
    }

    if (els.popularFillRight) {
      els.popularFillRight.style.background = rightCandidate.color;
      els.popularFillRight.style.width = `${pct(t.pv[rightCandidate.id], totalPv)}%`;
    }

    setText(els.nationalReporting, `Estimated reporting: ${reporting.toFixed(1)}%`);

    const winner = candidates.find(c => (t.ev[c.id] || 0) >= winThreshold);

    if (winner) {
      els.winnerCard?.classList.remove("hidden");
      setText(els.winnerName, winner.name);
    } else {
      els.winnerCard?.classList.add("hidden");
    }
  }

  function setCandidateTop(side, c, t, totalPv) {
    const photo = side === "left" ? els.leftPhoto : els.rightPhoto;
    const party = side === "left" ? els.leftParty : els.rightParty;
    const name = side === "left" ? els.leftName : els.rightName;
    const ev = side === "left" ? els.leftEv : els.rightEv;
    const votes = side === "left" ? els.leftVotes : els.rightVotes;

    if (photo) {
      photo.src = c.image || "";
      photo.style.display = c.image ? "block" : "none";
      photo.onerror = () => {
        photo.style.display = "none";
      };
    }

    setText(party, c.party);
    if (party) party.style.color = c.color;

    setText(name, c.name);

    setText(ev, `${t.ev[c.id] || 0} EV`);
    if (ev) ev.style.color = c.color;

    setText(
      votes,
      `${(t.pv[c.id] || 0).toLocaleString()} votes • ${pct(t.pv[c.id], totalPv).toFixed(1)}%`
    );
  }

  function renderLegend() {
    if (!els.legend) return;

    if (mapMode === "turnout") {
      els.legend.innerHTML = `
        <div class="legend-item"><span class="legend-swatch" style="background:#94a3b8"></span>Low reporting</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#64748b"></span>25%+</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#374151"></span>50%+</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#1f2937"></span>75%+</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#111827"></span>95%+</div>
      `;
      return;
    }

    if (mapMode === "lead") {
      els.legend.innerHTML = `
        <div class="legend-item"><span class="legend-swatch" style="background:#8b8f98"></span>TCTC</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#1e3a8a"></span>Tilt/Lean DNC</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#38bdf8"></span>Likely/Safe DNC</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#7f1d1d"></span>Tilt/Lean GOP</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#dc2626"></span>Likely/Safe GOP</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#9333ea"></span>IND Lead</div>
      `;
      return;
    }

    els.legend.innerHTML =
      candidates.map(c => `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${c.color}"></span>
          ${esc(c.party)}
        </div>
      `).join("") +
      `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${defaultColors.uncalled}"></span>
          Uncalled / Unreported
        </div>
      `;
  }

  function renderTicker() {
    if (!els.ticker) return;

    const closest = rows
      .filter(r => r.total_votes > 0)
      .sort((a, b) => a.margin_pct - b.margin_pct)
      .slice(0, 10);

    els.ticker.innerHTML = closest.map(r => {
      const c = findCandidate(r.leader) || candidates[0];

      return `
        <div class="race-card" onclick="window.__openStateResult('${escAttr(r.abbr)}')">
          <strong>
            <span>${esc(r.state_name)}</span>
            <span style="color:${c.color}">${esc(r.status)}</span>
          </strong>
          <span>${esc(c.shortName)} leads by ${r.margin_pct.toFixed(2)}% / ${r.vote_lead.toLocaleString()} votes</span>
        </div>
      `;
    }).join("");
  }

  function renderTable() {
    if (!els.tableHead || !els.tableBody) return;

    const q = (els.search?.value || "").toLowerCase();

    els.tableHead.innerHTML = `
      <tr>
        <th>State</th>
        <th>EV</th>
        <th>Reporting</th>
        ${candidates.map(c => `<th>${esc(c.party)}</th>`).join("")}
        <th>Leader</th>
        <th>Status</th>
        <th>Lead</th>
      </tr>
    `;

    els.tableBody.innerHTML = rows
      .filter(r => !q || r.state_name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q))
      .map(r => {
        const lead = findCandidate(r.leader) || candidates[0];

        return `
          <tr data-abbr="${escAttr(r.abbr)}">
            <td><strong>${esc(r.state_name)}</strong></td>
            <td>${esc(r.electoral_votes)}</td>
            <td>${Number(r.turnout_pct || 0).toFixed(1)}%</td>
            ${candidates.map(c => `
              <td>
                ${(r.votes[c.id] || 0).toLocaleString()}<br>
                <small>${Number(getPctForCandidate(r, c.id) || 0).toFixed(1)}%</small>
              </td>
            `).join("")}
            <td><span class="party-pill" style="background:${lead.color}22;color:${lead.color}">${esc(lead.party)}</span></td>
            <td>${esc(r.status)}</td>
            <td>${r.vote_lead.toLocaleString()}</td>
          </tr>
        `;
      })
      .join("");

    [...els.tableBody.querySelectorAll("tr")].forEach(tr => {
      tr.onclick = () => openStateModal(tr.dataset.abbr);
    });
  }

  function drawMainMap() {
    if (!map?.loaded() || !geojson) return;

    const data = JSON.parse(JSON.stringify(geojson));

    data.features = data.features
      .filter(f => normalizeAbbrFromFeature(f) !== "PR")
      .map(f => {
        const abbr = normalizeAbbrFromFeature(f);
        const r = rowByAbbr(abbr);

        f.properties.abbr = abbr;
        f.properties.fill = r ? colorForRow(r) : defaultColors.uncalled;
        f.properties.label = r
          ? `${r.state_name}: ${r.status} ${candidateName(r.leader)}`
          : f.properties.NAME || f.properties.name || abbr;

        return f;
      });

    if (map.getSource("states")) {
      map.getSource("states").setData(data);
      return;
    }

    map.addSource("states", { type: "geojson", data });

    map.addLayer({
      id: "states-fill",
      type: "fill",
      source: "states",
      paint: {
        "fill-color": ["get", "fill"],
        "fill-opacity": 0.9,
      },
    });

    map.addLayer({
      id: "states-outline",
      type: "line",
      source: "states",
      paint: {
        "line-color": "#ffffff",
        "line-width": 1,
        "line-opacity": 0.84,
      },
    });

    const popup = new maplibregl.Popup({
      closeButton: false,
      offset: 16,
      className: "state-hover-popup",
    });

    map.on("mousemove", "states-fill", e => {
      map.getCanvas().style.cursor = "pointer";

      const abbr = e.features[0].properties.abbr;
      const r = rowByAbbr(abbr);

      popup
        .setLngLat(e.lngLat)
        .setHTML(mapPopupHtml(r, abbr))
        .addTo(map);
    });

    map.on("mouseleave", "states-fill", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("click", "states-fill", e => {
      openStateModal(e.features[0].properties.abbr);
    });
  }

  function colorForRow(r) {
    if (!r || !r.total_votes) {
      return defaultColors.uncalled;
    }

    if (mapMode === "turnout") {
      return turnoutColor(r);
    }

    if (mapMode === "lead") {
      return leadStrengthColor(r);
    }

    const c = findCandidate(r.called_party || r.leader);
    return c?.color || defaultColors.tossup;
  }

  function turnoutColor(r) {
    const turnout = Number(r.turnout_pct || 0);

    if (turnout >= 95) return "#111827";
    if (turnout >= 75) return "#1f2937";
    if (turnout >= 50) return "#374151";
    if (turnout >= 25) return "#64748b";
    if (turnout > 0) return "#94a3b8";

    return defaultColors.uncalled;
  }

  function leadStrengthColor(r) {
    const margin = Number(r.margin_pct || 0);

    if (margin < 1) return "#8b8f98";

    if (r.leader === "gop") {
      if (margin < 3) return "#7f1d1d";
      if (margin < 7) return "#991b1b";
      if (margin < 12) return "#b91c1c";
      return "#dc2626";
    }

    if (r.leader === "dem") {
      if (margin < 3) return "#1e3a8a";
      if (margin < 7) return "#1d4ed8";
      if (margin < 12) return "#2563eb";
      return "#38bdf8";
    }

    if (r.leader === "ind") {
      if (margin < 3) return "#581c87";
      if (margin < 7) return "#7e22ce";
      if (margin < 12) return "#9333ea";
      return "#a855f7";
    }

    return defaultColors.tossup;
  }

  function mapPopupHtml(r, abbr) {
    if (!r) {
      return `
        <div class="map-popup rich-popup">
          <h3>${esc(abbr || "State")}</h3>
          <p>No state result found.</p>
        </div>
      `;
    }

    const gop = findCandidate("gop") || { id: "gop", name: "GOP", party: "GOP", color: "#e74c3c" };
    const dem = findCandidate("dem") || { id: "dem", name: "DNC", party: "DNC", color: "#3498db" };
    const ind = findCandidate("ind") || { id: "ind", name: "Independent", party: "IND", color: "#9b59b6" };

    return `
      <div class="map-popup rich-popup">
        <h3>${esc(r.state_name)}</h3>
        <h4>${esc(r.electoral_votes || 0)} electoral votes</h4>

        <table>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Party</th>
              <th>Votes</th>
              <th>Pct.</th>
            </tr>
          </thead>
          <tbody>
            ${popupCandidateRow(dem, r)}
            ${popupCandidateRow(gop, r)}
            ${popupCandidateRow(ind, r)}
          </tbody>
        </table>

        <p class="popup-foot">
          ${Number(r.turnout_pct || 0).toFixed(1)}% reporting • ${r.counted_votes.toLocaleString()} counted votes
        </p>
      </div>
    `;
  }

  function popupCandidateRow(c, r) {
    const votes = r.votes[c.id] || 0;
    const pctValue = getPctForCandidate(r, c.id);

    return `
      <tr>
        <td style="color:${c.color};font-weight:1000;">${esc(c.name)}</td>
        <td>${esc(c.party)}</td>
        <td>${votes.toLocaleString()}</td>
        <td>${Number(pctValue || 0).toFixed(1)}%</td>
      </tr>
    `;
  }

  function openStateModal(abbr) {
    const r = rowByAbbr(abbr);
    if (!r || !leftCandidate || !rightCandidate) return;

    const leftVotes = r.votes[leftCandidate.id] || 0;
    const rightVotes = r.votes[rightCandidate.id] || 0;
    const leftPct = getPctForCandidate(r, leftCandidate.id);
    const rightPct = getPctForCandidate(r, rightCandidate.id);
    const leader = findCandidate(r.leader) || candidates[0];

    setText(els.modalStateKicker, r.called_party ? "CALLED STATE" : "LIVE STATE RESULT");
    setText(els.modalStateTitle, r.state_name);
    setText(els.modalStateMeta, `${r.electoral_votes} EV • ${Number(r.turnout_pct || 0).toFixed(1)}% reporting`);
    setText(els.modalStatusPill, r.status);
    setText(els.modalStatusText, r.status);

    setModalCandidate("left", leftCandidate, leftPct, leftVotes);
    setModalCandidate("right", rightCandidate, rightPct, rightVotes);

    if (els.modalBarLeft) {
      els.modalBarLeft.style.background = leftCandidate.color;
      els.modalBarLeft.style.width = `${leftPct}%`;
    }

    if (els.modalBarRight) {
      els.modalBarRight.style.background = rightCandidate.color;
      els.modalBarRight.style.width = `${rightPct}%`;
    }

    setText(els.modalCountedVotes, r.counted_votes.toLocaleString());
    setText(els.modalLeaderName, leader.name);
    if (els.modalLeaderName) els.modalLeaderName.style.color = leader.color;
    setText(els.modalLeadMargin, `${r.margin_pct.toFixed(2)}% / ${r.vote_lead.toLocaleString()} votes`);

    const ind = findCandidate("ind");

    if (ind && (r.votes.ind || 0) > 0 && els.modalThirdCandidate) {
      els.modalThirdCandidate.classList.remove("hidden");
      els.modalThirdCandidate.innerHTML = `${esc(ind.name)}: ${Number(r.ind_pct || 0).toFixed(1)}% / ${(r.votes.ind || 0).toLocaleString()} votes`;
    } else {
      els.modalThirdCandidate?.classList.add("hidden");
    }

    els.stateModal?.classList.remove("hidden");
  }

  function setModalCandidate(side, c, candidatePct, candidateVotes) {
    const photo = side === "left" ? els.modalLeftPhoto : els.modalRightPhoto;
    const name = side === "left" ? els.modalLeftName : els.modalRightName;
    const party = side === "left" ? els.modalLeftParty : els.modalRightParty;
    const pctEl = side === "left" ? els.modalLeftPct : els.modalRightPct;
    const votes = side === "left" ? els.modalLeftVotes : els.modalRightVotes;

    if (photo) {
      photo.src = c.image || "";
      photo.style.display = c.image ? "block" : "none";
      photo.onerror = () => {
        photo.style.display = "none";
      };
    }

    setText(name, c.name);
    setText(party, c.party);
    if (party) party.style.color = c.color;

    setText(pctEl, `${candidatePct.toFixed(1)}%`);
    if (pctEl) pctEl.style.color = c.color;

    setText(votes, `${candidateVotes.toLocaleString()} votes`);
  }

  function closeStateModal() {
    els.stateModal?.classList.add("hidden");
  }

  function openPathModal() {
    if (!els.pathModal) return;

    els.pathModal.classList.remove("hidden");
    setText(els.pathLeftName, leftCandidate.shortName || leftCandidate.party);
    setText(els.pathRightName, rightCandidate.shortName || rightCandidate.party);

    if (!pathMap) {
      setTimeout(initPathMap, 80);
    } else {
      setTimeout(() => {
        pathMap.resize();
        drawPathMap();
        updatePathTotals();
      }, 80);
    }
  }

  function closePathModal() {
    els.pathModal?.classList.add("hidden");
  }

  function initPathMap() {
    if (!document.getElementById("path-map")) return;

    pathMap = new maplibregl.Map({
      container: "path-map",
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [-98.5795, 39.8283],
      zoom: 3.15,
    });

    pathMap.on("load", () => {
      drawPathMap();
      updatePathTotals();
    });
  }

  function drawPathMap() {
    if (!pathMap?.loaded() || !geojson) return;

    const data = JSON.parse(JSON.stringify(geojson));

    data.features = data.features
      .filter(f => normalizeAbbrFromFeature(f) !== "PR")
      .map(f => {
        const abbr = normalizeAbbrFromFeature(f);
        const r = rowByAbbr(abbr);

        f.properties.abbr = abbr;
        f.properties.fill = pathColor(abbr, r);

        return f;
      });

    if (pathMap.getSource("path-states")) {
      pathMap.getSource("path-states").setData(data);
      return;
    }

    pathMap.addSource("path-states", { type: "geojson", data });

    pathMap.addLayer({
      id: "path-states-fill",
      type: "fill",
      source: "path-states",
      paint: {
        "fill-color": ["get", "fill"],
        "fill-opacity": 0.9,
      },
    });

    pathMap.addLayer({
      id: "path-states-outline",
      type: "line",
      source: "path-states",
      paint: {
        "line-color": "#fff",
        "line-width": 1,
        "line-opacity": 0.8,
      },
    });

    pathMap.on("click", "path-states-fill", e => {
      cyclePathState(e.features[0].properties.abbr);
    });

    pathMap.on("mousemove", "path-states-fill", () => {
      pathMap.getCanvas().style.cursor = "pointer";
    });

    pathMap.on("mouseleave", "path-states-fill", () => {
      pathMap.getCanvas().style.cursor = "";
    });
  }

  function cyclePathState(abbr) {
    const current = pathSelections[abbr] || "";

    if (!current) {
      pathSelections[abbr] = leftCandidate.id;
    } else if (current === leftCandidate.id) {
      pathSelections[abbr] = rightCandidate.id;
    } else {
      delete pathSelections[abbr];
    }

    drawPathMap();
    updatePathTotals();
  }

  function pathColor(abbr, row) {
    const selected = pathSelections[abbr];

    if (selected) {
      return findCandidate(selected)?.color || defaultColors.tossup;
    }

    return row ? colorForRow(row) : defaultColors.uncalled;
  }

  function updatePathTotals() {
    let leftEv = 0;
    let rightEv = 0;

    rows.forEach(r => {
      const selected = pathSelections[r.abbr];

      if (selected === leftCandidate.id) leftEv += Number(r.electoral_votes || 0);
      if (selected === rightCandidate.id) rightEv += Number(r.electoral_votes || 0);
    });

    setText(els.pathLeftEv, `${leftEv} EV`);
    setText(els.pathRightEv, `${rightEv} EV`);

    if (els.pathLeftEv) els.pathLeftEv.style.color = leftCandidate.color;
    if (els.pathRightEv) els.pathRightEv.style.color = rightCandidate.color;
  }

  function rowByAbbr(abbr) {
    const norm = normalizeAbbr(abbr);
    return rows.find(r => normalizeAbbr(r.abbr) === norm);
  }

  function normalizeAbbrFromFeature(f) {
    return normalizeAbbr(
      f.properties.abbr ||
      f.properties.STUSPS ||
      f.properties.postal ||
      f.properties.STATE_ABBR ||
      f.properties.state ||
      f.properties.STATE ||
      f.properties.NAME ||
      f.properties.name
    );
  }

  function normalizeAbbr(value) {
    const raw = String(value || "").trim();

    if (raw.length === 2) return raw.toUpperCase();

    const lower = raw.toLowerCase();
    return STATE_NAME_TO_ABBR[lower] || raw.toUpperCase();
  }

  function candidateName(id) {
    return findCandidate(id)?.shortName || String(id || "").toUpperCase();
  }

  function getPctForCandidate(r, id) {
    const norm = normalizePartyId(id);
    if (norm === "gop") return Number(r.gop_pct || 0);
    if (norm === "dem") return Number(r.dem_pct || r.dnc_pct || 0);
    if (norm === "ind") return Number(r.ind_pct || 0);
    return 0;
  }

  function pct(a, b) {
    return b ? (Number(a || 0) / Number(b)) * 100 : 0;
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value;
  }

  function showError(msg) {
    if (!els.error) {
      console.error(msg);
      return;
    }

    els.error.textContent = msg;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error?.classList.add("hidden");
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>'"]/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[m]));
  }

  function escAttr(s) {
    return esc(s).replace(/`/g, "&#96;");
  }

  window.__openStateResult = openStateModal;
  window.__setMapMode = setMapMode;

  console.log("APRP app.js loaded. Map mode buttons active.");
})();
