  (() => {
  const cfg = window.APRP_CONFIG;
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
  let rowByAbbr = {};
  let candidates = [];
  let leftCandidate;
  let rightCandidate;
  let pathSelections = {};

  const defaultColors = {
    uncalled: "#34495e",
    tossup: "#95a5a6",
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      wireButtons();
      initMap();
      await loadGeoJson();
      await loadAndRender();

      if (cfg.refreshSeconds) {
        setInterval(loadAndRender, cfg.refreshSeconds * 1000);
      }
    } catch (err) {
      showError("Startup failed: " + (err.message || err));
      els.loader.style.display = "none";
    }
  }

  function wireButtons() {
    els.resetMap.onclick = () => {
      map?.flyTo({ center: [-98.5795, 39.8283], zoom: 3.45 });
    };

    els.toggleLegend.onclick = () => {
      els.legend.classList.toggle("hidden");
    };

    els.search.oninput = () => renderTable();

    els.modalClose.onclick = closeStateModal;
    els.modalCloseBackdrop.onclick = closeStateModal;

    els.pathButton.onclick = openPathModal;
    els.pathClose.onclick = closePathModal;
    els.pathCloseBackdrop.onclick = closePathModal;
  }

  function initMap() {
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

      leftCandidate = findCandidate("dem") || findCandidate("dnc") || candidates[1] || candidates[0];
      rightCandidate = findCandidate("gop") || candidates[0];

      const { data: resultRows, error: resultsError } = await supabase
        .from("state_results")
        .select("*")
        .eq("election_id", election.id)
        .order("state_name");

      if (resultsError) throw resultsError;

      rows = (resultRows || []).map(calculateRow);
      rowByAbbr = Object.fromEntries(rows.map((r) => [String(r.abbr).toUpperCase(), r]));

      renderAll();
    } catch (err) {
      showError(
        "Could not load live results. Check shared/config.js, Supabase setup, and whether the schema was run. " +
          (err.message || err)
      );
    } finally {
      els.loader.style.display = "none";
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
          { id: "gop", party: "GOP", name: "Republican Candidate", shortName: "GOP", color: "#e74c3c", image: "" },
          { id: "dem", party: "DNC", name: "Democratic Candidate", shortName: "DNC", color: "#3498db", image: "" },
          { id: "ind", party: "IND", name: "Independent", shortName: "IND", color: "#9b59b6", image: "" },
        ];

    return base.map((c) => ({
      id: c.id,
      party: c.party || c.id?.toUpperCase() || "",
      name: c.name || c.party || "",
      shortName: c.shortName || c.party || c.name || "",
      color: c.color || "#64748b",
      image: c.image || "",
    }));
  }

  function findCandidate(id) {
    return candidates.find((c) => c.id === id);
  }

  function calculateRow(r) {
    const turnout = Number(r.total_turnout || 0);
    const reportingPct = Number(r.turnout_pct || 0);
    const counted = Math.round((turnout * reportingPct) / 100);

    const votes = {
      gop: Math.round((counted * Number(r.gop_pct || 0)) / 100),
      dem: Math.round((counted * Number(r.dem_pct || 0)) / 100),
      ind: Math.round((counted * Number(r.ind_pct || 0)) / 100),
    };

    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    const leader = sorted[0]?.[0] || "gop";
    const leaderVotes = sorted[0]?.[1] || 0;
    const secondVotes = sorted[1]?.[1] || 0;
    const totalVotes = votes.gop + votes.dem + votes.ind;
    const voteLead = Math.max(0, leaderVotes - secondVotes);
    const marginPct = totalVotes ? (voteLead / totalVotes) * 100 : 0;

    return {
      ...r,
      abbr: String(r.abbr).toUpperCase(),
      counted_votes: counted,
      votes,
      leader,
      leader_votes: leaderVotes,
      second_votes: secondVotes,
      vote_lead: voteLead,
      called_party: r.called_party || (reportingPct >= 100 ? leader : ""),
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
    els.title.textContent = election.title || "Election Results";
    els.subtitle.textContent = election.subtitle || "Live map";
    els.year.textContent = election.year || "";
    els.year.classList.toggle("hidden", !election.year);

    document.title = election.title || "APRP Live Results";

    renderScoreboard();
    renderLegend();
    renderTicker();
    renderTable();
    drawMainMap();

    els.lastUpdated.textContent = "Updated " + new Date().toLocaleTimeString();
  }

  function totals() {
    const t = { ev: {}, pv: {}, counted: 0, expected: 0 };

    candidates.forEach((c) => {
      t.ev[c.id] = 0;
      t.pv[c.id] = 0;
    });

    rows.forEach((r) => {
      t.counted += r.counted_votes;
      t.expected += Number(r.total_turnout || 0);

      candidates.forEach((c) => {
        t.pv[c.id] += r.votes[c.id] || 0;
      });

      if (r.called_party) {
        t.ev[r.called_party] = (t.ev[r.called_party] || 0) + Number(r.electoral_votes || 0);
      }
    });

    return t;
  }

  function renderScoreboard() {
    const t = totals();
    const totalEv = Number(election.total_electoral_votes || 538);
    const winThreshold = Number(election.win_threshold || 270);
    const totalPv = candidates.reduce((sum, c) => sum + (t.pv[c.id] || 0), 0);
    const reporting = t.expected ? Math.min(100, (t.counted / t.expected) * 100) : 0;

    setCandidateTop("left", leftCandidate, t, totalPv);
    setCandidateTop("right", rightCandidate, t, totalPv);

    els.leftShort.textContent = leftCandidate.shortName || leftCandidate.party;
    els.rightShort.textContent = rightCandidate.shortName || rightCandidate.party;

    els.evFillLeft.style.background = leftCandidate.color;
    els.evFillRight.style.background = rightCandidate.color;
    els.evFillLeft.style.width = `${pct(t.ev[leftCandidate.id], totalEv)}%`;
    els.evFillRight.style.width = `${pct(t.ev[rightCandidate.id], totalEv)}%`;
    els.evThreshold.style.left = `${pct(winThreshold, totalEv)}%`;

    els.evLeftLabel.textContent = t.ev[leftCandidate.id] || 0;
    els.evRightLabel.textContent = t.ev[rightCandidate.id] || 0;

    els.toWinLabel.textContent = `${winThreshold} TO WIN`;
    els.totalEvLabel.textContent = totalEv;

    els.popularLeftLabel.textContent = leftCandidate.party;
    els.popularRightLabel.textContent = rightCandidate.party;

    els.popularFillLeft.style.background = leftCandidate.color;
    els.popularFillRight.style.background = rightCandidate.color;
    els.popularFillLeft.style.width = `${pct(t.pv[leftCandidate.id], totalPv)}%`;
    els.popularFillRight.style.width = `${pct(t.pv[rightCandidate.id], totalPv)}%`;

    els.nationalReporting.textContent = `Estimated reporting: ${reporting.toFixed(1)}%`;

    const winner = candidates.find((c) => (t.ev[c.id] || 0) >= winThreshold);

    if (winner) {
      els.winnerCard.classList.remove("hidden");
      els.winnerName.textContent = winner.name;
    } else {
      els.winnerCard.classList.add("hidden");
    }
  }

  function setCandidateTop(side, c, t, totalPv) {
    const photo = side === "left" ? els.leftPhoto : els.rightPhoto;
    const party = side === "left" ? els.leftParty : els.rightParty;
    const name = side === "left" ? els.leftName : els.rightName;
    const ev = side === "left" ? els.leftEv : els.rightEv;
    const votes = side === "left" ? els.leftVotes : els.rightVotes;

    photo.src = c.image || "";
    photo.style.display = c.image ? "block" : "none";
    photo.onerror = () => {
      photo.style.display = "none";
    };

    party.textContent = c.party;
    party.style.color = c.color;
    name.textContent = c.name;
    ev.textContent = `${t.ev[c.id] || 0} EV`;
    ev.style.color = c.color;
    votes.textContent = `${(t.pv[c.id] || 0).toLocaleString()} votes • ${pct(t.pv[c.id], totalPv).toFixed(1)}%`;
  }

  function renderLegend() {
    els.legend.innerHTML =
      candidates
        .map(
          (c) => `
            <div class="legend-item">
              <span class="legend-swatch" style="background:${c.color}"></span>
              ${esc(c.party)}
            </div>
          `
        )
        .join("") +
      `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${defaultColors.uncalled}"></span>
          Unreported
        </div>
      `;
  }

  function renderTicker() {
    const closest = rows
      .filter((r) => r.total_votes > 0)
      .sort((a, b) => a.margin_pct - b.margin_pct)
      .slice(0, 10);

    els.ticker.innerHTML = closest
      .map((r) => {
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
      })
      .join("");
  }

  function renderTable() {
    const q = (els.search.value || "").toLowerCase();

    els.tableHead.innerHTML = `
      <tr>
        <th>State</th>
        <th>EV</th>
        <th>Reporting</th>
        ${candidates.map((c) => `<th>${esc(c.party)}</th>`).join("")}
        <th>Leader</th>
        <th>Status</th>
        <th>Lead</th>
      </tr>
    `;

    els.tableBody.innerHTML = rows
      .filter((r) => !q || r.state_name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q))
      .map((r) => {
        const lead = findCandidate(r.leader) || candidates[0];

        return `
          <tr data-abbr="${escAttr(r.abbr)}">
            <td><strong>${esc(r.state_name)}</strong></td>
            <td>${r.electoral_votes}</td>
            <td>${Number(r.turnout_pct || 0).toFixed(1)}%</td>
            ${candidates
              .map(
                (c) => `
                  <td>
                    ${(r.votes[c.id] || 0).toLocaleString()}<br>
                    <small>${Number(r[c.id + "_pct"] || 0).toFixed(1)}%</small>
                  </td>
                `
              )
              .join("")}
            <td><span class="party-pill" style="background:${lead.color}22;color:${lead.color}">${esc(lead.party)}</span></td>
            <td>${esc(r.status)}</td>
            <td>${r.vote_lead.toLocaleString()}</td>
          </tr>
        `;
      })
      .join("");

    [...els.tableBody.querySelectorAll("tr")].forEach((tr) => {
      tr.onclick = () => openStateModal(tr.dataset.abbr);
    });
  }

  function drawMainMap() {
    if (!map?.loaded() || !geojson) return;

    const data = JSON.parse(JSON.stringify(geojson));

    data.features = data.features
      .filter((f) => getFeatureAbbr(f) !== "PR")
      .map((f) => {
        const abbr = String(getFeatureAbbr(f)).toUpperCase();
        const r = rowByAbbr[abbr];

        f.properties.abbr = abbr;
        f.properties.fill = colorForRow(r);
        f.properties.label = r ? `${r.state_name}: ${r.status} ${candidateName(r.leader)}` : f.properties.NAME || abbr;

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
        "fill-opacity": 0.88,
      },
    });

    map.addLayer({
      id: "states-outline",
      type: "line",
      source: "states",
      paint: {
        "line-color": "#ffffff",
        "line-width": 1,
        "line-opacity": 0.82,
      },
    });

    const popup = new maplibregl.Popup({ closeButton: false, offset: 15 });

    map.on("mousemove", "states-fill", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const abbr = String(e.features[0].properties.abbr).toUpperCase();
      const r = rowByAbbr[abbr];

      popup.setLngLat(e.lngLat).setHTML(mapPopupHtml(r)).addTo(map);
    });

    map.on("mouseleave", "states-fill", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("click", "states-fill", (e) => {
      const abbr = String(e.features[0].properties.abbr).toUpperCase();
      openStateModal(abbr);
    });
  }

  function colorForRow(r) {
    if (!r) return defaultColors.uncalled;

    const hasData =
      Number(r.gop_pct || 0) > 0 ||
      Number(r.dem_pct || 0) > 0 ||
      Number(r.ind_pct || 0) > 0 ||
      Number(r.total_votes || 0) > 0;

    if (!hasData) return defaultColors.uncalled;

    const c = findCandidate(r.called_party || r.leader);
    return c?.color || defaultColors.tossup;
  }

  function mapPopupHtml(r) {
    if (!r) {
      return `<div class="map-popup"><h3>No data</h3><p>No state result found.</p></div>`;
    }

    const c = findCandidate(r.leader) || candidates[0];

    return `
      <div class="map-popup">
        <h3>${esc(r.state_name)}</h3>
        <p>${r.electoral_votes} EV • ${r.status} ${esc(c.shortName)} • ${r.margin_pct.toFixed(2)}%</p>
      </div>
    `;
  }

  function openStateModal(abbr) {
    const r = rowByAbbr[String(abbr).toUpperCase()];
    if (!r) return;

    const leftVotes = r.votes[leftCandidate.id] || 0;
    const rightVotes = r.votes[rightCandidate.id] || 0;
    const leftPct = Number(r[leftCandidate.id + "_pct"] || 0);
    const rightPct = Number(r[rightCandidate.id + "_pct"] || 0);
    const leader = findCandidate(r.leader) || candidates[0];

    els.modalStateKicker.textContent = r.called_party ? "CALLED STATE" : "LIVE STATE RESULT";
    els.modalStateTitle.textContent = r.state_name;
    els.modalStateMeta.textContent = `${r.electoral_votes} EV • ${Number(r.turnout_pct || 0).toFixed(1)}% reporting`;
    els.modalStatusPill.textContent = r.status;
    els.modalStatusText.textContent = r.status;

    setModalCandidate("left", leftCandidate, leftPct, leftVotes);
    setModalCandidate("right", rightCandidate, rightPct, rightVotes);

    els.modalBarLeft.style.background = leftCandidate.color;
    els.modalBarRight.style.background = rightCandidate.color;
    els.modalBarLeft.style.width = `${leftPct}%`;
    els.modalBarRight.style.width = `${rightPct}%`;

    els.modalCountedVotes.textContent = r.counted_votes.toLocaleString();
    els.modalLeaderName.textContent = leader.name;
    els.modalLeaderName.style.color = leader.color;
    els.modalLeadMargin.textContent = `${r.margin_pct.toFixed(2)}% / ${r.vote_lead.toLocaleString()} votes`;

    const ind = findCandidate("ind");

    if (ind && (r.votes.ind || 0) > 0) {
      els.modalThirdCandidate.classList.remove("hidden");
      els.modalThirdCandidate.innerHTML = `${esc(ind.name)}: ${Number(r.ind_pct || 0).toFixed(1)}% / ${(r.votes.ind || 0).toLocaleString()} votes`;
    } else {
      els.modalThirdCandidate.classList.add("hidden");
    }

    els.stateModal.classList.remove("hidden");
  }

  function setModalCandidate(side, c, candidatePct, candidateVotes) {
    const photo = side === "left" ? els.modalLeftPhoto : els.modalRightPhoto;
    const name = side === "left" ? els.modalLeftName : els.modalRightName;
    const party = side === "left" ? els.modalLeftParty : els.modalRightParty;
    const pctEl = side === "left" ? els.modalLeftPct : els.modalRightPct;
    const votes = side === "left" ? els.modalLeftVotes : els.modalRightVotes;

    photo.src = c.image || "";
    photo.style.display = c.image ? "block" : "none";
    photo.onerror = () => {
      photo.style.display = "none";
    };

    name.textContent = c.name;
    party.textContent = c.party;
    party.style.color = c.color;
    pctEl.textContent = `${candidatePct.toFixed(1)}%`;
    pctEl.style.color = c.color;
    votes.textContent = `${candidateVotes.toLocaleString()} votes`;
  }

  function closeStateModal() {
    els.stateModal.classList.add("hidden");
  }

  function openPathModal() {
    els.pathModal.classList.remove("hidden");
    els.pathLeftName.textContent = leftCandidate.shortName || leftCandidate.party;
    els.pathRightName.textContent = rightCandidate.shortName || rightCandidate.party;

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
    els.pathModal.classList.add("hidden");
  }

  function initPathMap() {
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
      .filter((f) => getFeatureAbbr(f) !== "PR")
      .map((f) => {
        const abbr = String(getFeatureAbbr(f)).toUpperCase();
        const r = rowByAbbr[abbr];

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

    pathMap.on("click", "path-states-fill", (e) => {
      cyclePathState(String(e.features[0].properties.abbr).toUpperCase());
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

    rows.forEach((r) => {
      const selected = pathSelections[r.abbr];

      if (selected === leftCandidate.id) leftEv += Number(r.electoral_votes || 0);
      if (selected === rightCandidate.id) rightEv += Number(r.electoral_votes || 0);
    });

    els.pathLeftEv.textContent = `${leftEv} EV`;
    els.pathRightEv.textContent = `${rightEv} EV`;

    els.pathLeftEv.style.color = leftCandidate.color;
    els.pathRightEv.style.color = rightCandidate.color;
  }

  function getFeatureAbbr(f) {
    return f.properties.abbr || f.properties.STUSPS || f.properties.postal || f.properties.STATE_ABBR;
  }

  function candidateName(id) {
    return findCandidate(id)?.shortName || id?.toUpperCase() || "";
  }

  function pct(a, b) {
    return b ? (Number(a || 0) / Number(b)) * 100 : 0;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>'"]/g, (m) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[m];
    });
  }

  function escAttr(s) {
    return esc(s).replace(/`/g, "&#96;");
  }

  function showError(msg) {
    els.error.textContent = msg;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error.classList.add("hidden");
  }

  window.__openStateResult = openStateModal;
})();
