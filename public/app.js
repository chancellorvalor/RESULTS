(() => {
  const cfg = window.APRP_CONFIG || {};
  const activeSlug =
    new URLSearchParams(window.location.search).get("slug") ||
    cfg.defaultElectionSlug ||
    "2008-president";

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
    grouped: document.getElementById("grouped-state-lists"),
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
  let popup;
  let geojson;
  let election;
  let rows = [];
  let rowByAbbr = {};
  let rowByName = {};
  let candidates = [];
  let leftCandidate;
  let rightCandidate;
  let currentMapMode = "lead";
  let pathSelections = {};

  const colors = {
    unreported: "#344050",
    locked: "#202936",
    tossup: "#b9a76a",
    gop: {
      tilt: "#4b2a32",
      lean: "#7a3038",
      likely: "#a83843",
      safe: "#d54852"
    },
    dem: {
      tilt: "#233f58",
      lean: "#2d5f86",
      likely: "#287fb8",
      safe: "#28a3ef"
    },
    ind: {
      tilt: "#3d3159",
      lean: "#5c3f82",
      likely: "#8256b3",
      safe: "#a568e0"
    },
    turnout: ["#202936", "#303b4a", "#4a596b", "#718093", "#a0adbb"]
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
      if (els.loader) els.loader.style.display = "none";
    }
  }

  function wireButtons() {
    document.querySelectorAll(".map-mode-btn").forEach(btn => {
      btn.onclick = () => {
        currentMapMode = btn.dataset.mode;
        document.querySelectorAll(".map-mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        drawMainMap();
        renderLegend();
      };
    });

    if (els.resetMap) {
      els.resetMap.onclick = () => map?.flyTo({ center: [-98.5795, 39.8283], zoom: 3.45 });
    }

    if (els.toggleLegend) {
      els.toggleLegend.onclick = () => els.legend?.classList.toggle("hidden");
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
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [-98.5795, 39.8283],
      zoom: 3.45
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        maxWidth: "420px"
      });

      if (geojson) drawMainMap();
    });
  }

  async function loadGeoJson() {
    const res = await fetch("./data/states.geojson?v=12000");
    if (!res.ok) throw new Error("Could not load states.geojson");
    geojson = await res.json();
  }

  async function loadAndRender() {
    try {
      hideError();

      const { data: electionData, error: electionError } = await supabase
        .from("elections")
        .select("*")
        .eq("slug", activeSlug)
        .single();

      if (electionError) throw electionError;

      election = electionData;
      candidates = normalizeCandidates(election.candidates);

      leftCandidate = findCandidate("dem") || candidates[1] || candidates[0];
      rightCandidate = findCandidate("gop") || candidates[0];

      const { data: resultRows, error: resultsError } = await supabase
        .from("state_results")
        .select("*")
        .eq("election_id", election.id)
        .order("poll_close_order", { ascending: true })
        .order("state_name", { ascending: true });

      if (resultsError) throw resultsError;

      rows = (resultRows || []).map(calculateRow);
      buildIndexes();
      renderAll();
    } catch (err) {
      showError("Could not load live results. " + (err.message || err));
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

    if (!parsed.length) {
      parsed = [
        { id: "gop", party: "GOP", name: "Republican Candidate", shortName: "GOP", color: "#d54852", image: "" },
        { id: "dem", party: "DNC", name: "Democratic Candidate", shortName: "DNC", color: "#28a3ef", image: "" },
        { id: "ind", party: "IND", name: "Independent", shortName: "IND", color: "#a568e0", image: "" }
      ];
    }

    return parsed.map(c => {
      const id = normalizeCandidateId(c.id || c.party) || "ind";
      return {
        id,
        party: c.party || id.toUpperCase(),
        name: c.name || c.party || id.toUpperCase(),
        shortName: c.shortName || c.party || c.name || id.toUpperCase(),
        color: c.color || fallbackCandidateColor(id),
        image: c.image || ""
      };
    });
  }

  function normalizeCandidateId(id) {
    const x = String(id || "").trim().toLowerCase();

    if (!x) return "";
    if (["dem", "dnc", "democrat", "democratic"].includes(x)) return "dem";
    if (["gop", "rep", "republican", "rnc"].includes(x)) return "gop";
    if (["ind", "independent", "other"].includes(x)) return "ind";

    return x;
  }

  function fallbackCandidateColor(id) {
    if (id === "dem") return "#28a3ef";
    if (id === "gop") return "#d54852";
    if (id === "ind") return "#a568e0";
    return "#64748b";
  }

  function findCandidate(id) {
    const normalized = normalizeCandidateId(id);
    return candidates.find(c => c.id === normalized);
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
    const leader = sorted[0]?.[0] || "";
    const leaderVotes = sorted[0]?.[1] || 0;
    const secondVotes = sorted[1]?.[1] || 0;
    const totalVotes = votes.dem + votes.gop + votes.ind;
    const voteLead = Math.max(0, leaderVotes - secondVotes);
    const marginPct = totalVotes ? (voteLead / totalVotes) * 100 : 0;

    const calledParty = normalizeCandidateId(r.called_party);

    return {
      ...r,
      abbr: normalizeAbbr(r.abbr),
      state_name: String(r.state_name || "").trim(),
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
      total_votes: totalVotes,
      vote_lead: voteLead,
      margin_pct: marginPct,
      called_party: calledParty,
      status: totalVotes ? statusFromMargin(marginPct) : "Unreported",
      is_poll_closed: r.is_poll_closed !== false,
      poll_close_time: r.poll_close_time || "",
      first_results_time: r.first_results_time || "",
      poll_close_order: Number(r.poll_close_order || 0)
    };
  }

  function statusFromMargin(margin) {
    if (margin < 1) return "Tossup";
    if (margin < 3) return "Tilt";
    if (margin < 7) return "Lean";
    if (margin < 12) return "Likely";
    return "Safe";
  }

  function buildIndexes() {
    rowByAbbr = {};
    rowByName = {};

    rows.forEach(r => {
      rowByAbbr[normalizeAbbr(r.abbr)] = r;
      rowByName[normalizeName(r.state_name)] = r;
    });
  }

  function renderAll() {
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

    if (els.lastUpdated) els.lastUpdated.textContent = "Updated " + new Date().toLocaleTimeString();
  }

  function totals() {
    const t = { ev: {}, pv: {}, counted: 0, expected: 0 };

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

    if (els.nationalReporting) els.nationalReporting.textContent = `Estimated reporting: ${reporting.toFixed(1)}%`;

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
      photo.onerror = () => (photo.style.display = "none");
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
      votes.textContent = `${(t.pv[c.id] || 0).toLocaleString()} votes • ${pct(t.pv[c.id], totalPv).toFixed(1)}%`;
    }
  }

  function renderLegend() {
    if (!els.legend) return;

    if (currentMapMode === "called") {
      els.legend.innerHTML = `
        <div class="legend-item"><span class="legend-swatch" style="background:${findCandidate("gop")?.color || colors.gop.safe}"></span> GOP called</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${findCandidate("dem")?.color || colors.dem.safe}"></span> DNC called</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${findCandidate("ind")?.color || colors.ind.safe}"></span> IND called</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.unreported}"></span> Uncalled</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.locked}"></span> Polls not closed</div>
      `;
      return;
    }

    if (currentMapMode === "lead") {
      els.legend.innerHTML = `
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.dem.safe}"></span> DNC safe</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.dem.likely}"></span> DNC likely</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.dem.lean}"></span> DNC lean</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.dem.tilt}"></span> DNC tilt</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.tossup}"></span> Tossup</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.gop.tilt}"></span> GOP tilt</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.gop.lean}"></span> GOP lean</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.gop.likely}"></span> GOP likely</div>
        <div class="legend-item"><span class="legend-swatch" style="background:${colors.gop.safe}"></span> GOP safe</div>
      `;
      return;
    }

    els.legend.innerHTML = `
      <div class="legend-item"><span class="legend-swatch" style="background:${colors.turnout[0]}"></span> 0–24% reporting</div>
      <div class="legend-item"><span class="legend-swatch" style="background:${colors.turnout[1]}"></span> 25–49% reporting</div>
      <div class="legend-item"><span class="legend-swatch" style="background:${colors.turnout[2]}"></span> 50–74% reporting</div>
      <div class="legend-item"><span class="legend-swatch" style="background:${colors.turnout[3]}"></span> 75–94% reporting</div>
      <div class="legend-item"><span class="legend-swatch" style="background:${colors.turnout[4]}"></span> 95–100% reporting</div>
    `;
  }

  function renderTicker() {
    if (!els.ticker) return;

    const closest = rows
      .filter(r => r.total_votes > 0 && r.is_poll_closed)
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
        <th>Close</th>
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
      .sort((a, b) => a.poll_close_order - b.poll_close_order || a.state_name.localeCompare(b.state_name))
      .map(r => {
        const lead = findCandidate(r.leader) || candidates[0];

        return `
          <tr data-abbr="${escAttr(r.abbr)}">
            <td><strong>${esc(r.state_name)}</strong></td>
            <td>${r.electoral_votes}</td>
            <td>${esc(r.poll_close_time || "—")}</td>
            <td>${r.is_poll_closed ? `${r.turnout_pct.toFixed(1)}%` : "Polls open"}</td>
            <td>${r.dem_pct.toFixed(1)}%</td>
            <td>${r.gop_pct.toFixed(1)}%</td>
            <td>${r.ind_pct.toFixed(1)}%</td>
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
    if (!els.grouped) return;

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
      if (!r.total_votes || !r.is_poll_closed) {
        groups["Competitive"].push(r);
        return;
      }

      if (r.leader === "dem" && r.status === "Safe") groups["Solid Democrat"].push(r);
      else if (r.leader === "dem") groups["Lean Democrat"].push(r);
      else if (r.leader === "gop" && r.status === "Safe") groups["Solid Republican"].push(r);
      else if (r.leader === "gop") groups["Lean Republican"].push(r);
      else groups["Competitive"].push(r);
    });

    Object.values(groups).forEach(list => {
      list.sort((a, b) => a.poll_close_order - b.poll_close_order || a.state_name.localeCompare(b.state_name));
    });

    els.grouped.innerHTML = `
      <div class="state-groups">
        ${Object.entries(groups).map(([title, list]) => stateGroupHtml(title, list)).join("")}
      </div>
    `;
  }

  function stateGroupHtml(title, list) {
    return `
      <div class="state-group-card">
        <h3>${esc(title)}</h3>
        <table>
          <thead>
            <tr>
              <th>State</th>
              <th>DEM</th>
              <th>GOP</th>
              <th>% EXP.</th>
            </tr>
          </thead>
          <tbody>
            ${
              list.length
                ? list.map(r => `
                    <tr onclick="window.__openStateResult('${escAttr(r.abbr)}')">
                      <td>${esc(r.state_name)}</td>
                      <td class="blue-cell">${r.dem_pct.toFixed(0)}%</td>
                      <td class="red-cell">${r.gop_pct.toFixed(0)}%</td>
                      <td>${r.is_poll_closed ? r.turnout_pct.toFixed(0) + "%" : "Open"}</td>
                    </tr>
                  `).join("")
                : `<tr><td colspan="4" class="empty-cell">No states</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function drawMainMap() {
    if (!map?.loaded() || !geojson) return;

    const data = JSON.parse(JSON.stringify(geojson));

    data.features = (data.features || []).filter(f => normalizeAbbr(getFeatureAbbr(f)) !== "PR").map(f => {
      const row = findRowForFeature(f);
      const abbr = normalizeAbbr(getFeatureAbbr(f));
      const stateName = getFeatureName(f);

      f.properties = f.properties || {};
      f.properties.aprp_abbr = abbr;
      f.properties.aprp_state_name = stateName;
      f.properties.fill = row ? colorForRow(row) : colors.unreported;
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
        "fill-opacity": 0.92
      }
    });

    map.addLayer({
      id: "states-outline",
      type: "line",
      source: "states",
      paint: {
        "line-color": "#f4f7fb",
        "line-width": 1.08,
        "line-opacity": 0.88
      }
    });

    map.on("mousemove", "states-fill", e => {
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (!feature) return;

      popup.setLngLat(e.lngLat).setHTML(feature.properties.hoverHtml || "").addTo(map);
    });

    map.on("mouseleave", "states-fill", () => {
      map.getCanvas().style.cursor = "";
      popup?.remove();
    });

    map.on("click", "states-fill", e => {
      const abbr = e.features?.[0]?.properties?.aprp_abbr;
      if (abbr) openStateModal(abbr);
    });
  }

  function colorForRow(r) {
    if (!r) return colors.unreported;

    if (!r.is_poll_closed) return colors.locked;

    if (currentMapMode === "called") {
      if (!r.called_party) return colors.unreported;
      return findCandidate(r.called_party)?.color || colors.unreported;
    }

    if (currentMapMode === "turnout") {
      const x = Number(r.turnout_pct || 0);
      if (x >= 95) return colors.turnout[4];
      if (x >= 75) return colors.turnout[3];
      if (x >= 50) return colors.turnout[2];
      if (x >= 25) return colors.turnout[1];
      return colors.turnout[0];
    }

    if (!r.total_votes) return colors.unreported;

    if (r.status === "Tossup") return colors.tossup;

    const leader = r.leader;
    const bucket = statusBucket(r.status);

    return colors[leader]?.[bucket] || colors.unreported;
  }

  function statusBucket(status) {
    if (status === "Safe") return "safe";
    if (status === "Likely") return "likely";
    if (status === "Lean") return "lean";
    return "tilt";
  }

  function mapPopupHtml(r, abbr = "", fallbackStateName = "") {
    if (!r) {
      return `
        <div class="map-popup">
          <h3>${esc(fallbackStateName || abbr || "State")}</h3>
          <p>No state result found.</p>
        </div>
      `;
    }

    const candidateRows = [
      { id: "gop", c: findCandidate("gop"), votes: r.votes.gop, pct: r.gop_pct },
      { id: "dem", c: findCandidate("dem"), votes: r.votes.dem, pct: r.dem_pct },
      { id: "ind", c: findCandidate("ind"), votes: r.votes.ind, pct: r.ind_pct }
    ].filter(x => x.c).sort((a, b) => b.votes - a.votes);

    return `
      <div class="map-popup">
        <h3>${esc(r.state_name)}</h3>
        <div class="popup-sub">${r.electoral_votes} electoral votes</div>
        <div class="popup-tag ${r.called_party ? "called" : "live"}">${r.called_party ? "CALLED" : "LIVE"}</div>
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
            ${candidateRows.map(x => `
              <tr>
                <td style="color:${x.c.color};font-weight:900;">${esc(x.c.name)}</td>
                <td>${esc(x.c.party)}</td>
                <td>${x.votes.toLocaleString()}</td>
                <td>${x.pct.toFixed(1)}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="popup-foot">
          ${r.is_poll_closed ? `${r.turnout_pct.toFixed(1)}% reporting • ${r.counted_votes.toLocaleString()} counted votes` : `Polls close ${esc(r.poll_close_time || "later")}`}
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

    els.modalStateKicker.textContent = r.called_party ? "CALLED STATE" : "LIVE STATE RESULT";
    els.modalStateTitle.textContent = r.state_name;
    els.modalStateMeta.textContent = `${r.electoral_votes} EV • ${r.is_poll_closed ? `${r.turnout_pct.toFixed(1)}% reporting` : `Polls close ${r.poll_close_time || "later"}`}`;
    els.modalStatusPill.textContent = r.status;
    els.modalStatusText.textContent = r.status;

    setModalCandidate("left", leftCandidate, leftPct, leftVotes);
    setModalCandidate("right", rightCandidate, rightPct, rightVotes);

    els.modalBarLeft.style.background = leftCandidate.color;
    els.modalBarRight.style.background = rightCandidate.color;
    els.modalBarLeft.style.width = `${leftPct}%`;
    els.modalBarRight.style.width = `${rightPct}%`;

    els.modalCountedVotes.textContent = r.counted_votes.toLocaleString();
    els.modalLeaderName.textContent = leader ? leader.name : "—";
    els.modalLeaderName.style.color = leader ? leader.color : "#fff";
    els.modalLeadMargin.textContent = `${r.margin_pct.toFixed(2)}% / ${r.vote_lead.toLocaleString()} votes`;

    const ind = findCandidate("ind");
    if (ind && r.votes.ind > 0) {
      els.modalThirdCandidate.classList.remove("hidden");
      els.modalThirdCandidate.innerHTML = `${esc(ind.name)}: ${r.ind_pct.toFixed(1)}% / ${r.votes.ind.toLocaleString()} votes`;
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
    photo.onerror = () => (photo.style.display = "none");

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
      style: map.getStyle(),
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

    data.features = data.features.filter(f => normalizeAbbr(getFeatureAbbr(f)) !== "PR").map(f => {
      const row = findRowForFeature(f);
      const abbr = normalizeAbbr(getFeatureAbbr(f));

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
        "fill-opacity": 0.92
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
  }

  function cyclePathState(abbr) {
    const key = normalizeAbbr(abbr);
    const current = pathSelections[key] || "";

    if (!current) pathSelections[key] = leftCandidate.id;
    else if (current === leftCandidate.id) pathSelections[key] = rightCandidate.id;
    else delete pathSelections[key];

    drawPathMap();
    updatePathTotals();
  }

  function pathColor(abbr, row) {
    const selected = pathSelections[normalizeAbbr(abbr)];
    if (selected) return findCandidate(selected)?.color || colors.unreported;
    return row ? colorForRow(row) : colors.unreported;
  }

  function updatePathTotals() {
    let leftEv = 0;
    let rightEv = 0;

    rows.forEach(r => {
      const selected = pathSelections[normalizeAbbr(r.abbr)];
      if (selected === leftCandidate.id) leftEv += r.electoral_votes;
      if (selected === rightCandidate.id) rightEv += r.electoral_votes;
    });

    els.pathLeftEv.textContent = `${leftEv} EV`;
    els.pathRightEv.textContent = `${rightEv} EV`;
    els.pathLeftEv.style.color = leftCandidate.color;
    els.pathRightEv.style.color = rightCandidate.color;
  }

  function findRowForFeature(feature) {
    const abbr = normalizeAbbr(getFeatureAbbr(feature));
    const name = normalizeName(getFeatureName(feature));
    return rowByAbbr[abbr] || rowByName[name] || null;
  }

  function getFeatureAbbr(f) {
    const p = f?.properties || {};
    return p.abbr || p.STUSPS || p.postal || p.STATE_ABBR || p.state_abbr || "";
  }

  function getFeatureName(f) {
    const p = f?.properties || {};
    return p.NAME || p.name || p.STATE_NAME || p.state_name || "";
  }

  function normalizeAbbr(s) {
    return String(s || "").trim().toUpperCase();
  }

  function normalizeName(s) {
    return String(s || "").trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  }

  function pct(a, b) {
    return b ? (Number(a || 0) / Number(b)) * 100 : 0;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
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

  function showError(msg) {
    els.error.textContent = msg;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error.classList.add("hidden");
  }

  window.__openStateResult = openStateModal;
})();
