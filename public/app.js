(() => {
  const cfg = window.APRP_CONFIG;
  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const els = {
    loader: document.getElementById("loader"),
    title: document.getElementById("election-title"),
    subtitle: document.getElementById("election-subtitle"),
    scoreboard: document.getElementById("scoreboard"),
    winnerCard: document.getElementById("winner-card"),
    winnerName: document.getElementById("winner-name"),
    lastUpdated: document.getElementById("last-updated"),
    legend: document.getElementById("legend"),
    error: document.getElementById("error-box"),
    tableHead: document.getElementById("state-table-head"),
    tableBody: document.getElementById("state-table-body"),
    search: document.getElementById("state-search"),
    ticker: document.getElementById("closest-races"),
  };

  let map;
  let geojson;
  let election;
  let rows = [];
  let candidates = [];

  const colors = {
    uncalled: "#34495e",
    tossup: "#95a5a6",
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    wireButtons();
    initMap();
    await loadGeoJson();
    await loadAndRender();

    if (cfg.refreshSeconds) {
      setInterval(loadAndRender, cfg.refreshSeconds * 1000);
    }
  }

  function wireButtons() {
    document.getElementById("reset-map").onclick = () => {
      map?.flyTo({ center: [-98.5795, 39.8283], zoom: 3.45 });
    };

    document.getElementById("toggle-legend").onclick = () => {
      els.legend.classList.toggle("hidden");
    };

    els.search.oninput = () => renderTable();
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
      if (geojson) drawMap();
    });
  }

  async function loadGeoJson() {
    const res = await fetch("./data/states.geojson");
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
        "Could not load Supabase results. Check shared/config.js, Supabase URL/key, RLS policies, and that you ran sql/schema.sql. " +
          (err.message || err)
      );
    } finally {
      els.loader.classList.add("hide");
      setTimeout(() => {
        els.loader.style.display = "none";
      }, 300);
    }
  }

  function normalizeCandidates(raw) {
    const c = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");

    return c.length
      ? c
      : [
          {
            id: "gop",
            party: "GOP",
            name: "Republican Candidate",
            shortName: "GOP",
            color: "#e74c3c",
          },
          {
            id: "dem",
            party: "DNC",
            name: "Democratic Candidate",
            shortName: "DNC",
            color: "#3498db",
          },
          {
            id: "ind",
            party: "IND",
            name: "Independent",
            shortName: "IND",
            color: "#9b59b6",
          },
        ];
  }

  function calculateRow(r) {
    const turnout = Number(r.total_turnout || 0);
    const counted = Math.round((turnout * Number(r.turnout_pct || 0)) / 100);

    const vals = {
      gop_pct: Number(r.gop_pct || 0),
      dem_pct: Number(r.dem_pct || 0),
      ind_pct: Number(r.ind_pct || 0),
    };

    const votes = {
      gop: Math.round((counted * vals.gop_pct) / 100),
      dem: Math.round((counted * vals.dem_pct) / 100),
      ind: Math.round((counted * vals.ind_pct) / 100),
    };

    const leader = ["gop", "dem", "ind"].sort((a, b) => votes[b] - votes[a])[0];
    const totalVotes = votes.gop + votes.dem + votes.ind;

    const secondPlace = Math.max(
      ...Object.entries(votes)
        .filter(([key]) => key !== leader)
        .map(([, value]) => value)
    );

    const margin = totalVotes ? (Math.abs(votes[leader] - secondPlace) / totalVotes) * 100 : 0;
    const called = r.called_party || (Number(r.turnout_pct) >= 100 ? leader : "");

    return {
      ...r,
      counted_votes: counted,
      votes,
      leader,
      called_party: called,
      margin_pct: margin,
      total_votes: totalVotes,
    };
  }

  function renderAll() {
    els.title.textContent = election.title;
    els.subtitle.textContent = election.subtitle || "";
    document.title = election.title || "APRP Live Results";

    renderScoreboard();
    buildLegend();
    renderTable();
    renderTicker();
    drawMap();

    els.lastUpdated.textContent = "Updated " + new Date().toLocaleTimeString();
  }

  function totals() {
    const t = {
      ev: {},
      pv: {},
      counted: 0,
      expected: 0,
    };

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
    const [a, b] = candidates;
    const t = totals();
    const totalPv = candidates.reduce((sum, c) => sum + (t.pv[c.id] || 0), 0);
    const reporting = t.expected ? Math.min(100, (t.counted / t.expected) * 100) : 0;

    els.scoreboard.innerHTML = `
      ${candidateCard(a, t, totalPv)}
      <div class="meter-wrap">
        <div class="meter-meta">
          <span>0</span>
          <strong>${election.win_threshold} TO WIN</strong>
          <span>${election.total_electoral_votes}</span>
        </div>
        <div class="ev-meter">
          <div class="ev-fill" style="left:0;background:${a.color};width:${pct(t.ev[a.id], election.total_electoral_votes)}%"></div>
          <div class="ev-fill" style="right:0;background:${b.color};width:${pct(t.ev[b.id], election.total_electoral_votes)}%"></div>
          <div class="ev-threshold" style="left:${pct(election.win_threshold, election.total_electoral_votes)}%"></div>
          <div class="ev-label" style="left:10px">${t.ev[a.id] || 0}</div>
          <div class="ev-label" style="right:10px">${t.ev[b.id] || 0}</div>
        </div>
        <div class="reporting">Estimated reporting: ${reporting.toFixed(1)}%</div>
      </div>
      ${candidateCard(b, t, totalPv)}
    `;

    const winner = candidates.find((c) => (t.ev[c.id] || 0) >= election.win_threshold);

    if (winner) {
      els.winnerCard.classList.remove("hidden");
      els.winnerName.textContent = winner.name;
    } else {
      els.winnerCard.classList.add("hidden");
    }
  }

  function candidateCard(c, t, totalPv) {
    return `
      <article class="candidate" style="--candidate-color:${c.color}">
        <img src="${c.image || ""}" alt="" onerror="this.style.display='none'" />
        <div>
          <div class="candidate-party" style="color:${c.color}">${esc(c.party)}</div>
          <div class="candidate-name">${esc(c.name)}</div>
          <div class="candidate-ev" style="color:${c.color}">${t.ev[c.id] || 0} EV</div>
          <div class="candidate-pv">${(t.pv[c.id] || 0).toLocaleString()} votes · ${pct(t.pv[c.id] || 0, totalPv).toFixed(1)}%</div>
        </div>
      </article>
    `;
  }

  function buildLegend() {
    els.legend.innerHTML = `
      <b>Legend</b><br>
      ${candidates
        .map(
          (c) => `
            <div>
              <i style="--swatch:${c.color}"></i>
              ${esc(c.party)} lead/call
            </div>
          `
        )
        .join("")}
      <div><i style="--swatch:${colors.tossup}"></i>Tossup</div>
      <div><i style="--swatch:${colors.uncalled}"></i>Unreported</div>
    `;
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
        <th>Margin</th>
      </tr>
    `;

    els.tableBody.innerHTML = rows
      .filter((r) => !q || r.state_name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q))
      .map((r) => {
        const lead = candidates.find((c) => c.id === r.leader) || candidates[0];

        return `
          <tr data-abbr="${r.abbr}">
            <td>${esc(r.state_name)}</td>
            <td>${r.electoral_votes}</td>
            <td>${Number(r.turnout_pct).toFixed(1)}%</td>
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
            <td>${r.margin_pct.toFixed(2)}%</td>
          </tr>
        `;
      })
      .join("");

    [...els.tableBody.querySelectorAll("tr")].forEach((tr) => {
      tr.onclick = () => zoomState(tr.dataset.abbr);
    });
  }

  function renderTicker() {
    const items = rows
      .filter((r) => r.total_votes > 0)
      .sort((a, b) => a.margin_pct - b.margin_pct)
      .slice(0, 10)
      .map((r) => {
        const c = candidates.find((x) => x.id === r.leader) || candidates[0];

        return `
          <span class="race-item">
            <b style="color:${c.color}">${esc(r.state_name)}:</b>
            ${esc(c.shortName || c.party)} leads by ${r.margin_pct.toFixed(2)}%
          </span>
        `;
      })
      .join("");

    els.ticker.innerHTML = items + items;
  }

  function drawMap() {
    if (!map?.loaded() || !geojson) return;

    const byAbbr = Object.fromEntries(rows.map((r) => [r.abbr, r]));
    const data = JSON.parse(JSON.stringify(geojson));

    data.features = data.features
      .filter((f) => (f.properties.abbr || f.properties.STUSPS || f.properties.postal) !== "PR")
      .map((f) => {
        const abbr = f.properties.abbr || f.properties.STUSPS || f.properties.postal;
        const r = byAbbr[abbr];

        f.properties.abbr = abbr;
        f.properties.fill = r ? colorFor(r) : colors.uncalled;
        f.properties.label = r ? `${r.state_name}: ${r.turnout_pct}% reporting` : f.properties.NAME || abbr;

        return f;
      });

    if (map.getSource("states")) {
      map.getSource("states").setData(data);
    } else {
      map.addSource("states", { type: "geojson", data });

      map.addLayer({
        id: "states-fill",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": ["get", "fill"],
          "fill-opacity": 0.86,
        },
      });

      map.addLayer({
        id: "states-outline",
        type: "line",
        source: "states",
        paint: {
          "line-color": "#ffffff",
          "line-width": 1,
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, offset: 15 });

      map.on("mousemove", "states-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        popup.setLngLat(e.lngLat).setHTML(popupHtml(byAbbr[e.features[0].properties.abbr])).addTo(map);
      });

      map.on("mouseleave", "states-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      map.on("click", "states-fill", (e) => {
        zoomState(e.features[0].properties.abbr);
      });
    }
  }

  function colorFor(r) {
    const c = candidates.find((x) => x.id === (r.called_party || r.leader));

    if (!r.total_votes) return colors.uncalled;

    return c?.color || colors.tossup;
  }

  function popupHtml(r) {
    if (!r) {
      return `
        <div class="popup">
          <header><h3>No data</h3></header>
        </div>
      `;
    }

    return `
      <div class="popup">
        <header>
          <h3>${esc(r.state_name)}</h3>
          <p>${r.electoral_votes} EV • ${Number(r.turnout_pct).toFixed(1)}% reporting • ${r.counted_votes.toLocaleString()} counted</p>
        </header>
        <div class="rows">
          ${candidates
            .map(
              (c) => `
                <div class="popup-row ${r.leader === c.id ? "winner" : ""}">
                  <div>
                    <strong style="color:${c.color}">${esc(c.name)}</strong>
                    <small>${(r.votes[c.id] || 0).toLocaleString()} votes</small>
                  </div>
                  <b>${Number(r[c.id + "_pct"] || 0).toFixed(1)}%</b>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function zoomState(abbr) {
    const f = geojson.features.find((x) => (x.properties.abbr || x.properties.STUSPS) === abbr);

    if (!f) return;

    const coords = [];
    collect(f.geometry.coordinates, coords);

    const lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

    map.flyTo({ center: [lng, lat], zoom: 5 });
  }

  function collect(a, out) {
    if (typeof a[0] === "number") {
      out.push(a);
    } else {
      a.forEach((x) => collect(x, out));
    }
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

  function showError(msg) {
    els.error.textContent = msg;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error.classList.add("hidden");
  }
})();
