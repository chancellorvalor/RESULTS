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
    pathRightEv: document.getElementById("path-right-ev")
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
  let rowByAbbr = {};
  let rowByState = {};
  let currentMapMode = "called";
  let mapPopup;

  const defaultColors = {
    unreported: "#52667d",
    lowTurnout: "#3f4e60",
    tossup: "#7f8c99"
  };

  const palettes = {
    dem: {
      safe: "#167ac6",
      likely: "#2491ea",
      lean: "#5eb5f5",
      tilt: "#98d3fb",
      tctc: "#c9ebff"
    },
    gop: {
      safe: "#d63544",
      likely: "#ef4f5b",
      lean: "#f67a84",
      tilt: "#f9a7ae",
      tctc: "#ffd5d9"
    },
    ind: {
      safe: "#7a42c8",
      likely: "#9158dc",
      lean: "#ae84ea",
      tilt: "#c7a9f4",
      tctc: "#e1d2fb"
    }
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      wireButtons();
      injectMapModeButtons();
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

    if (els.search) {
      els.search.oninput = () => {
        renderTable();
        renderGroupedStates();
      };
    }

    if (els.modalClose) els.modalClose.onclick = closeStateModal;
    if (els.modalCloseBackdrop) els.modalCloseBackdrop.onclick = closeStateModal;

    if (els.pathButton) els.pathButton.onclick = openPathModal;
    if (els.pathClose) els.pathClose.onclick = closePathModal;
    if (els.pathCloseBackdrop) els.pathCloseBackdrop.onclick = closePathModal;
  }

  function injectMapModeButtons() {
    const actions = document.querySelector(".map-actions");
    if (!actions || document.getElementById("map-mode-wrap")) return;

    const wrap = document.createElement("div");
    wrap.id = "map-mode-wrap";
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    wrap.style.flexWrap = "wrap";
    wrap.style.marginRight = "10px";

    wrap.innerHTML = `
      <button class="secondary-btn map-mode-btn active" data-mode="called">Called races</button>
      <button class="secondary-btn map-mode-btn" data-mode="lead">Strength of lead</button>
      <button class="secondary-btn map-mode-btn" data-mode="turnout">Vote count status</button>
    `;

    actions.prepend(wrap);

    wrap.querySelectorAll(".map-mode-btn").forEach(btn => {
      btn.onclick = () => {
        currentMapMode = btn.dataset.mode;
        wrap.querySelectorAll(".map-mode-btn").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        drawMainMap();
        renderLegend();
      };
    });
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
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm"
          }
        ]
      },
      center: [-98.5795, 39.8283],
      zoom: 3.45
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      mapPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        maxWidth: "370px"
      });

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
      buildRowIndexes();
      renderAll();
    } catch (err) {
      showError(
        "Could not load live results. Check config, Supabase schema, slug, and state_results rows. " +
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
            id: "gop",
            party: "GOP",
            name: "Republican Candidate",
            shortName: "GOP",
            color: "#ef5a52",
            image: ""
          },
          {
            id: "dem",
            party: "DNC",
            name: "Democratic Candidate",
            shortName: "DNC",
            color: "#40aaf7",
            image: ""
          },
          {
            id: "ind",
            party: "IND",
            name: "Independent",
            shortName: "IND",
            color: "#9b59b6",
            image: ""
          }
        ];

    return base.map(c => {
      const normalizedId = normalizeCandidateId(c.id || c.party || "");
      return {
        id: normalizedId,
        party: c.party || String(normalizedId).toUpperCase(),
        name: c.name || c.party || "",
        shortName: c.shortName || c.party || c.name || "",
        color: c.color || candidateFallbackColor(normalizedId),
        image: c.image || ""
      };
    });
  }

  function normalizeCandidateId(id) {
    const x = String(id || "").trim().toLowerCase();
    if (["dem", "dnc", "democrat", "democratic"].includes(x)) return "dem";
    if (["gop", "rep", "republican", "rnc"].includes(x)) return "gop";
    if (["ind", "independent", "other"].includes(x)) return "ind";
    return x || "ind";
  }

  function candidateFallbackColor(id) {
    if (id === "dem") return "#40aaf7";
    if (id === "gop") return "#ef5a52";
    if (id === "ind") return "#9b59b6";
    return "#64748b";
  }

  function findCandidate(id) {
    const want = normalizeCandidateId(id);
    return candidates.find(c => c.id === want);
  }

  function calculateRow(r) {
    const turnout = Number(r.total_turnout || 0);
    const reportingPct = clamp(Number(r.turnout_pct || 0), 0, 100);
    const counted = Math.round((turnout * reportingPct) / 100);

    const demPct = clamp(Number(r.dem_pct || 0), 0, 100);
    const gopPct = clamp(Number(r.gop_pct || 0), 0, 100);
    const indPct = clamp(Number(r.ind_pct || 0), 0, 100);

    const votes = {
      dem: Math.round((counted * demPct) / 100),
      gop: Math.round((counted * gopPct) / 100),
      ind: Math.round((counted * indPct) / 100)
    };

    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    const leader = sorted[0]?.[0] || "gop";
    const leaderVotes = sorted[0]?.[1] || 0;
    const secondVotes = sorted[1]?.[1] || 0;
    const totalVotes = votes.dem + votes.gop + votes.ind;
    const voteLead = Math.max(0, leaderVotes - secondVotes);
    const marginPct = totalVotes ? (voteLead / totalVotes) * 100 : 0;

    const calledParty = normalizeCalledParty(r.called_party, leader, reportingPct);

    return {
      ...r,
      state_name: String(r.state_name || "").trim(),
      abbr: normalizeAbbr(r.abbr),
      electoral_votes: Number(r.electoral_votes || 0),
      total_turnout: turnout,
      turnout_pct: reportingPct,

      dem_pct: demPct,
      gop_pct: gopPct,
      ind_pct: indPct,

      counted_votes: counted,
      votes,
      leader,
      leader_votes: leaderVotes,
      second_votes: secondVotes,
      vote_lead: voteLead,
      total_votes: totalVotes,
      margin_pct: marginPct,
      called_party: calledParty,
      status: totalVotes ? statusFromMargin(marginPct) : "Unreported"
    };
  }

  function normalizeCalledParty(calledParty, leader, reportingPct) {
    const normalized = normalizeCandidateId(calledParty);
    if (normalized) return normalized;
    if (reportingPct >= 100) return leader;
    return "";
  }

  function statusFromMargin(margin) {
    if (margin < 1) return "TCTC";
    if (margin < 3) return "Tilt";
    if (margin < 7) return "Lean";
    if (margin < 12) return "Likely";
    return "Safe";
  }

  function buildRowIndexes() {
    rowByAbbr = {};
    rowByState = {};

    rows.forEach(r => {
      if (r.abbr) rowByAbbr[normalizeAbbr(r.abbr)] = r;
      if (r.state_name) rowByState[normalizeName(r.state_name)] = r;
    });
  }

  function renderAll() {
    if (!election) return;

    if (els.title) els.title.textContent = election.title || "Election Results";
    if (els.subtitle) els.subtitle.textContent = election.subtitle || "Live map";

    if (els.year) {
      els.year.textContent = election.year || "";
      els.year.classList.toggle("hidden", !election.year);
    }

    document.title = election.title || "APRP Live Results";

    renderScoreboard();
    renderLegend();
    renderTicker();
    renderTable();
    renderGroupedStates();
    drawMainMap();

    if (els.lastUpdated) {
      els.lastUpdated.textContent = "Updated " + new Date().toLocaleTimeString();
    }
  }

  function totals() {
    const t = {
      ev: {},
      pv: {},
      counted: 0,
      expected: 0
    };

    candidates.forEach(c => {
      t.ev[c.id] = 0;
      t.pv[c.id] = 0;
    });

    rows.forEach(r => {
      t.counted += r.counted_votes;
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
    const t = totals();
    const totalEv = Number(election.total_electoral_votes || 538);
    const winThreshold = Number(election.win_threshold || 270);
    const totalPv = candidates.reduce((sum, c) => sum + (t.pv[c.id] || 0), 0);
    const reporting = t.expected ? Math.min(100, (t.counted / t.expected) * 100) : 0;

    setCandidateTop("left", leftCandidate, t, totalPv);
    setCandidateTop("right", rightCandidate, t, totalPv);

    if (els.leftShort) els.leftShort.textContent = leftCandidate.shortName || leftCandidate.party;
    if (els.rightShort) els.rightShort.textContent = rightCandidate.shortName || rightCandidate.party;

    if (els.evFillLeft) {
      els.evFillLeft.style.background = leftCandidate.color;
      els.evFillLeft.style.width = `${pct(t.ev[leftCandidate.id], totalEv)}%`;
    }

    if (els.evFillRight) {
      els.evFillRight.style.background = rightCandidate.color;
      els.evFillRight.style.width = `${pct(t.ev[rightCandidate.id], totalEv)}%`;
    }

    if (els.evThreshold) els.evThreshold.style.left = `${pct(winThreshold, totalEv)}%`;

    if (els.evLeftLabel) els.evLeftLabel.textContent = t.ev[leftCandidate.id] || 0;
    if (els.evRightLabel) els.evRightLabel.textContent = t.ev[rightCandidate.id] || 0;
    if (els.toWinLabel) els.toWinLabel.textContent = `${winThreshold} TO WIN`;
    if (els.totalEvLabel) els.totalEvLabel.textContent = totalEv;

    if (els.popularLeftLabel) els.popularLeftLabel.textContent = leftCandidate.party;
    if (els.popularRightLabel) els.popularRightLabel.textContent = rightCandidate.party;

    if (els.popularFillLeft) {
      els.popularFillLeft.style.background = leftCandidate.color;
      els.popularFillLeft.style.width = `${pct(t.pv[leftCandidate.id], totalPv)}%`;
    }

    if (els.popularFillRight) {
      els.popularFillRight.style.background = rightCandidate.color;
      els.popularFillRight.style.width = `${pct(t.pv[rightCandidate.id], totalPv)}%`;
    }

    if (els.nationalReporting) {
      els.nationalReporting.textContent = `Estimated reporting: ${reporting.toFixed(1)}%`;
    }

    const winner = candidates.find(c => (t.ev[c.id] || 0) >= winThreshold);

    if (winner) {
      els.winnerCard?.classList.remove("hidden");
      if (els.winnerName) els.winnerName.textContent = winner.name;
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

    if (party) {
      party.textContent = c.party;
      party.style.color = c.color;
    }

    if (name) name.textContent = c.name;

    if (ev) {
      ev.textContent = `${t.ev[c.id] || 0} EV`;
      ev.style.color = c.color;
    }

    if (votes) {
      votes.textContent = `${(t.pv[c.id] || 0).toLocaleString()} votes • ${pct(
        t.pv[c.id],
        totalPv
      ).toFixed(1)}%`;
    }
  }

  function renderLegend() {
    if (!els.legend) return;

    if (currentMapMode === "called") {
      els.legend.innerHTML = `
        <div class="legend-item"><span class="legend-swatch" style="background:${findCandidate("gop")?.color || "#ef5a52"}"></span> GOP called</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${findCandidate("dem")?.color || "#40aaf7"}"></span> DNC called</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${findCandidate("ind")?.color || "#9b59b6"}"></span> IND called</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${defaultColors.unreported}"></span> Uncalled / no vote data</div>
      `;
      return;
    }

    if (currentMapMode === "lead") {
      els.legend.innerHTML = `
        <div class="legend-item"><span class="legend-swatch" style="background:${palettes.dem.safe}"></span> Dem safe</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${palettes.dem.lean}"></span> Dem lead</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${palettes.dem.tctc}"></span> Dem very close</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${palettes.gop.tctc}"></span> GOP very close</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${palettes.gop.lean}"></span> GOP lead</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${palettes.gop.safe}"></span> GOP safe</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${defaultColors.unreported}"></span> No vote data</div>
      `;
      return;
    }

    if (currentMapMode === "turnout") {
      els.legend.innerHTML = `
        <div class="legend-item"><span class="legend-swatch" style="background:#283240"></span> 0–24% reporting</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#3a4758"></span> 25–49% reporting</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#55657a"></span> 50–74% reporting</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#778ba3"></span> 75–94% reporting</div>
        <div class="legend-item"><span class="legend-swatch" style="background:#a4b4c6"></span> 95–100% reporting</div>
      `;
    }
  }

  function renderTicker() {
    if (!els.ticker) return;

    const closest = rows
      .filter(r => r.total_votes > 0)
      .sort((a, b) => a.margin_pct - b.margin_pct)
      .slice(0, 10);

    els.ticker.innerHTML = closest
      .map(r => {
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
    if (!els.tableHead || !els.tableBody) return;

    const q = (els.search?.value || "").toLowerCase();

    els.tableHead.innerHTML = `
      <tr>
        <th>State</th>
        <th>EV</th>
        <th>Reporting</th>
        <th>DNC</th>
        <th>GOP</th>
        <th>IND</th>
        <th>Leader</th>
        <th>Status</th>
        <th>Lead</th>
      </tr>
    `;

    els.tableBody.innerHTML = rows
      .filter(r => !q || r.state_name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q))
      .sort((a, b) => a.state_name.localeCompare(b.state_name))
      .map(r => {
        const lead = findCandidate(r.leader) || candidates[0];

        return `
          <tr data-abbr="${escAttr(r.abbr)}">
            <td><strong>${esc(r.state_name)}</strong></td>
            <td>${r.electoral_votes}</td>
            <td>${Number(r.turnout_pct || 0).toFixed(1)}%</td>
            <td>${Number(r.dem_pct || 0).toFixed(1)}%</td>
            <td>${Number(r.gop_pct || 0).toFixed(1)}%</td>
            <td>${Number(r.ind_pct || 0).toFixed(1)}%</td>
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

  function renderGroupedStates() {
    const tableCard = document.querySelector(".table-card");
    if (!tableCard) return;

    let wrap = document.getElementById("grouped-state-lists");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "grouped-state-lists";
      wrap.style.marginTop = "24px";
      tableCard.appendChild(wrap);
    }

    const q = (els.search?.value || "").trim().toLowerCase();
    const filtered = rows.filter(r => !q || r.state_name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q));

    const groups = {
      "Solid Democrat": [],
      "Lean Democrat": [],
      "Competitive": [],
      "Lean Republican": [],
      "Solid Republican": []
    };

    filtered.forEach(r => {
      const side = r.leader === "dem" ? "dem" : r.leader === "gop" ? "gop" : "ind";

      if (side === "dem" && r.status === "Safe") groups["Solid Democrat"].push(r);
      else if (side === "dem" && ["Likely", "Lean"].includes(r.status)) groups["Lean Democrat"].push(r);
      else if (side === "gop" && ["Likely", "Lean"].includes(r.status)) groups["Lean Republican"].push(r);
      else if (side === "gop" && r.status === "Safe") groups["Solid Republican"].push(r);
      else groups["Competitive"].push(r);
    });

    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => {
        if (group === "Competitive") return a.margin_pct - b.margin_pct;
        return a.state_name.localeCompare(b.state_name);
      });
    });

    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
        ${Object.entries(groups)
          .map(([title, items]) => {
            const headingColor =
              title.includes("Democrat") ? "#40aaf7" :
              title.includes("Republican") ? "#ef5a52" :
              "#d6d6d6";

            return `
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:800;color:${headingColor};">
                  ${esc(title)}
                </div>
                <div style="padding:10px 12px;">
                  <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                      <tr style="opacity:.7;">
                        <th style="text-align:left;padding:6px;">State</th>
                        <th style="text-align:right;padding:6px;">DEM</th>
                        <th style="text-align:right;padding:6px;">GOP</th>
                        <th style="text-align:right;padding:6px;">% Rep.</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        items.length
                          ? items.map(r => `
                              <tr onclick="window.__openStateResult('${escAttr(r.abbr)}')" style="cursor:pointer;border-top:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:7px 6px;">${esc(r.state_name)}</td>
                                <td style="padding:7px 6px;text-align:right;color:#40aaf7;">${Number(r.dem_pct || 0).toFixed(0)}%</td>
                                <td style="padding:7px 6px;text-align:right;color:#ef5a52;">${Number(r.gop_pct || 0).toFixed(0)}%</td>
                                <td style="padding:7px 6px;text-align:right;">${Number(r.turnout_pct || 0).toFixed(0)}%</td>
                              </tr>
                            `).join("")
                          : `<tr><td colspan="4" style="padding:10px 6px;opacity:.6;">No states</td></tr>`
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function drawMainMap() {
    if (!map?.loaded() || !geojson) return;

    const data = JSON.parse(JSON.stringify(geojson));
    data.features = (data.features || [])
      .filter(f => normalizeAbbr(getFeatureAbbr(f)) !== "PR")
      .map(f => {
        const row = findRowForFeature(f);
        const abbr = normalizeAbbr(getFeatureAbbr(f));
        const stateName = getFeatureName(f);

        f.properties = f.properties || {};
        f.properties.aprp_abbr = abbr;
        f.properties.aprp_state_name = stateName;
        f.properties.fill = row ? colorForRow(row) : defaultColors.unreported;
        f.properties.hoverHtml = mapPopupHtml(row, abbr, stateName);

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
        "fill-opacity": 0.88
      }
    });

    map.addLayer({
      id: "states-outline",
      type: "line",
      source: "states",
      paint: {
        "line-color": "#ffffff",
        "line-width": 1.1,
        "line-opacity": 0.86
      }
    });

    map.on("mousemove", "states-fill", e => {
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (!feature) return;

      mapPopup
        .setLngLat(e.lngLat)
        .setHTML(feature.properties?.hoverHtml || `<div class="map-popup"><h3>${esc(feature.properties?.aprp_state_name || "State")}</h3></div>`)
        .addTo(map);
    });

    map.on("mouseleave", "states-fill", () => {
      map.getCanvas().style.cursor = "";
      mapPopup?.remove();
    });

    map.on("click", "states-fill", e => {
      const feature = e.features?.[0];
      if (!feature) return;
      openStateModal(feature.properties?.aprp_abbr);
    });
  }

  function colorForRow(r) {
    if (!r || !r.total_votes) return defaultColors.unreported;

    if (currentMapMode === "called") {
      if (!r.called_party) return defaultColors.unreported;
      return findCandidate(r.called_party)?.color || defaultColors.tossup;
    }

    if (currentMapMode === "lead") {
      const leader = normalizeCandidateId(r.leader);
      const bucket = statusBucketKey(r.status);
      return palettes[leader]?.[bucket] || findCandidate(leader)?.color || defaultColors.tossup;
    }

    if (currentMapMode === "turnout") {
      const x = Number(r.turnout_pct || 0);
      if (x >= 95) return "#a4b4c6";
      if (x >= 75) return "#778ba3";
      if (x >= 50) return "#55657a";
      if (x >= 25) return "#3a4758";
      return "#283240";
    }

    return defaultColors.unreported;
  }

  function statusBucketKey(status) {
    if (status === "Safe") return "safe";
    if (status === "Likely") return "likely";
    if (status === "Lean") return "lean";
    if (status === "Tilt") return "tilt";
    return "tctc";
  }

  function mapPopupHtml(r, abbr = "", fallbackStateName = "") {
    if (!r) {
      return `
        <div class="map-popup" style="background:#f1f1f1;color:#222;border-radius:10px;padding:14px 16px;min-width:260px;">
          <h3 style="margin:0 0 6px 0;font-size:24px;">${esc(fallbackStateName || abbr || "State")}</h3>
          <p style="margin:0;font-size:14px;opacity:.75;">No state result found.</p>
        </div>
      `;
    }

    const ordered = [
      { id: "gop", candidate: findCandidate("gop"), votes: r.votes.gop, pct: r.gop_pct },
      { id: "dem", candidate: findCandidate("dem"), votes: r.votes.dem, pct: r.dem_pct },
      { id: "ind", candidate: findCandidate("ind"), votes: r.votes.ind, pct: r.ind_pct }
    ].filter(x => x.candidate);

    const rowsHtml = ordered
      .sort((a, b) => b.votes - a.votes)
      .map(x => `
        <tr>
          <td style="padding:6px 4px;color:${x.candidate.color};font-weight:800;">${esc(x.candidate.name)}</td>
          <td style="padding:6px 4px;text-align:right;">${esc(x.candidate.party)}</td>
          <td style="padding:6px 4px;text-align:right;">${x.votes.toLocaleString()}</td>
          <td style="padding:6px 4px;text-align:right;">${Number(x.pct).toFixed(1)}%</td>
        </tr>
      `)
      .join("");

    const flipTag = r.called_party ? "" : `<div style="display:inline-block;background:#f3e7e7;color:#972433;font-weight:800;font-size:12px;padding:4px 8px;border-radius:6px;margin-bottom:8px;">LIVE</div>`;

    return `
      <div class="map-popup" style="background:#f1f1f1;color:#222;border-radius:10px;padding:14px 16px;min-width:320px;box-shadow:0 10px 30px rgba(0,0,0,.22);">
        <h3 style="margin:0 0 2px 0;font-size:22px;">${esc(r.state_name)}</h3>
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">${r.electoral_votes} electoral votes</div>
        ${flipTag}
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="opacity:.65;border-bottom:1px solid #d5d5d5;">
              <th style="text-align:left;padding:6px 4px;">Candidate</th>
              <th style="text-align:right;padding:6px 4px;">Party</th>
              <th style="text-align:right;padding:6px 4px;">Votes</th>
              <th style="text-align:right;padding:6px 4px;">Pct.</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="margin-top:8px;font-size:13px;color:#555;">
          ${Number(r.turnout_pct || 0).toFixed(1)}% reporting • ${r.counted_votes.toLocaleString()} counted votes
        </div>
      </div>
    `;
  }

  function openStateModal(abbr) {
    const r = rowByAbbr[normalizeAbbr(abbr)];
    if (!r) return;

    const leftVotes = r.votes[leftCandidate.id] || 0;
    const rightVotes = r.votes[rightCandidate.id] || 0;
    const leftPct = Number(r[leftCandidate.id + "_pct"] || 0);
    const rightPct = Number(r[rightCandidate.id + "_pct"] || 0);
    const leader = findCandidate(r.leader) || candidates[0];

    if (els.modalStateKicker) {
      els.modalStateKicker.textContent = r.called_party ? "CALLED STATE" : "LIVE STATE RESULT";
    }

    if (els.modalStateTitle) els.modalStateTitle.textContent = r.state_name;
    if (els.modalStateMeta) {
      els.modalStateMeta.textContent = `${r.electoral_votes} EV • ${Number(r.turnout_pct || 0).toFixed(1)}% reporting`;
    }

    if (els.modalStatusPill) els.modalStatusPill.textContent = r.status;
    if (els.modalStatusText) els.modalStatusText.textContent = r.status;

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

    if (els.modalCountedVotes) els.modalCountedVotes.textContent = r.counted_votes.toLocaleString();

    if (els.modalLeaderName) {
      els.modalLeaderName.textContent = leader.name;
      els.modalLeaderName.style.color = leader.color;
    }

    if (els.modalLeadMargin) {
      els.modalLeadMargin.textContent = `${r.margin_pct.toFixed(2)}% / ${r.vote_lead.toLocaleString()} votes`;
    }

    const ind = findCandidate("ind");
    if (ind && (r.votes.ind || 0) > 0) {
      els.modalThirdCandidate?.classList.remove("hidden");
      if (els.modalThirdCandidate) {
        els.modalThirdCandidate.innerHTML = `${esc(ind.name)}: ${Number(r.ind_pct || 0).toFixed(1)}% / ${(
          r.votes.ind || 0
        ).toLocaleString()} votes`;
      }
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

    if (name) name.textContent = c.name;
    if (party) {
      party.textContent = c.party;
      party.style.color = c.color;
    }

    if (pctEl) {
      pctEl.textContent = `${candidatePct.toFixed(1)}%`;
      pctEl.style.color = c.color;
    }

    if (votes) votes.textContent = `${candidateVotes.toLocaleString()} votes`;
  }

  function closeStateModal() {
    els.stateModal?.classList.add("hidden");
  }

  function openPathModal() {
    els.pathModal?.classList.remove("hidden");
    if (els.pathLeftName) els.pathLeftName.textContent = leftCandidate.shortName || leftCandidate.party;
    if (els.pathRightName) els.pathRightName.textContent = rightCandidate.shortName || rightCandidate.party;

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
    pathMap = new maplibregl.Map({
      container: "path-map",
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
      zoom: 3.15
    });

    pathMap.on("load", () => {
      drawPathMap();
      updatePathTotals();
    });
  }

  function drawPathMap() {
    if (!pathMap?.loaded() || !geojson) return;

    const data = JSON.parse(JSON.stringify(geojson));
    data.features = (data.features || [])
      .filter(f => normalizeAbbr(getFeatureAbbr(f)) !== "PR")
      .map(f => {
        const abbr = normalizeAbbr(getFeatureAbbr(f));
        const row = findRowForFeature(f);

        f.properties = f.properties || {};
        f.properties.aprp_abbr = abbr;
        f.properties.fill = pathColor(abbr, row);
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
        "fill-opacity": 0.9
      }
    });

    pathMap.addLayer({
      id: "path-states-outline",
      type: "line",
      source: "path-states",
      paint: {
        "line-color": "#fff",
        "line-width": 1,
        "line-opacity": 0.8
      }
    });

    pathMap.on("click", "path-states-fill", e => {
      const abbr = e.features?.[0]?.properties?.aprp_abbr;
      if (abbr) cyclePathState(abbr);
    });

    pathMap.on("mousemove", "path-states-fill", () => {
      pathMap.getCanvas().style.cursor = "pointer";
    });

    pathMap.on("mouseleave", "path-states-fill", () => {
      pathMap.getCanvas().style.cursor = "";
    });
  }

  function cyclePathState(abbr) {
    const key = normalizeAbbr(abbr);
    const current = pathSelections[key] || "";

    if (!current) {
      pathSelections[key] = leftCandidate.id;
    } else if (current === leftCandidate.id) {
      pathSelections[key] = rightCandidate.id;
    } else {
      delete pathSelections[key];
    }

    drawPathMap();
    updatePathTotals();
  }

  function pathColor(abbr, row) {
    const key = normalizeAbbr(abbr);
    const selected = pathSelections[key];

    if (selected) return findCandidate(selected)?.color || defaultColors.tossup;
    return row ? colorForRow(row) : defaultColors.unreported;
  }

  function updatePathTotals() {
    let leftEv = 0;
    let rightEv = 0;

    rows.forEach(r => {
      const selected = pathSelections[normalizeAbbr(r.abbr)];
      if (selected === leftCandidate.id) leftEv += Number(r.electoral_votes || 0);
      if (selected === rightCandidate.id) rightEv += Number(r.electoral_votes || 0);
    });

    if (els.pathLeftEv) {
      els.pathLeftEv.textContent = `${leftEv} EV`;
      els.pathLeftEv.style.color = leftCandidate.color;
    }

    if (els.pathRightEv) {
      els.pathRightEv.textContent = `${rightEv} EV`;
      els.pathRightEv.style.color = rightCandidate.color;
    }
  }

  function findRowForFeature(feature) {
    const abbr = normalizeAbbr(getFeatureAbbr(feature));
    const stateName = normalizeName(getFeatureName(feature));

    return rowByAbbr[abbr] || rowByState[stateName] || null;
  }

  function getFeatureAbbr(f) {
    const p = f?.properties || {};
    return (
      p.abbr ||
      p.STUSPS ||
      p.postal ||
      p.STATE_ABBR ||
      p.state_abbr ||
      p.state ||
      ""
    );
  }

  function getFeatureName(f) {
    const p = f?.properties || {};
    return (
      p.NAME ||
      p.name ||
      p.STATE_NAME ||
      p.state_name ||
      p.State ||
      ""
    );
  }

  function normalizeAbbr(s) {
    return String(s || "").trim().toUpperCase();
  }

  function normalizeName(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ");
  }

  function candidateName(id) {
    return findCandidate(id)?.shortName || String(id || "").toUpperCase();
  }

  function pct(a, b) {
    return b ? (Number(a || 0) / Number(b)) * 100 : 0;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>'"]/g, m => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[m];
    });
  }

  function escAttr(s) {
    return esc(s).replace(/`/g, "&#96;");
  }

  function showError(msg) {
    if (!els.error) return;
    els.error.textContent = msg;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error?.classList.add("hidden");
  }

  window.__openStateResult = openStateModal;
})();
