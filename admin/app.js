(() => {
  const cfg = window.APRP_CONFIG;
  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const els = {
    error: document.getElementById("error-box"),
    title: document.getElementById("election-title"),
    subtitle: document.getElementById("election-subtitle"),
    winThreshold: document.getElementById("win-threshold"),
    totalEv: document.getElementById("total-electoral-votes"),
    saveElection: document.getElementById("save-election"),
    refresh: document.getElementById("refresh-data"),
    search: document.getElementById("state-search"),
    rows: document.getElementById("state-rows"),
  };

  let election;
  let stateRows = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    els.saveElection.onclick = saveElectionSettings;
    els.refresh.onclick = loadData;
    els.search.oninput = renderRows;

    await loadData();
  }

  async function loadData() {
    try {
      hideError();

      const { data: electionData, error: electionError } = await supabase
        .from("elections")
        .select("*")
        .eq("slug", cfg.defaultElectionSlug)
        .single();

      if (electionError) throw electionError;

      election = electionData;

      els.title.value = election.title || "";
      els.subtitle.value = election.subtitle || "";
      els.winThreshold.value = election.win_threshold || 270;
      els.totalEv.value = election.total_electoral_votes || 538;

      const { data: results, error: resultsError } = await supabase
        .from("state_results")
        .select("*")
        .eq("election_id", election.id)
        .order("state_name");

      if (resultsError) throw resultsError;

      stateRows = results || [];
      renderRows();
    } catch (err) {
      showError(
        "Could not load admin data. Check shared/config.js, Supabase SQL setup, and RLS policies. " +
          (err.message || err)
      );
    }
  }

  function renderRows() {
    const q = (els.search.value || "").toLowerCase();

    els.rows.innerHTML = stateRows
      .filter((r) => !q || r.state_name.toLowerCase().includes(q) || r.abbr.toLowerCase().includes(q))
      .map((r) => {
        return `
          <tr data-id="${r.id}">
            <td>${esc(r.state_name)} <small>${esc(r.abbr)}</small></td>
            <td><input data-field="electoral_votes" type="number" value="${num(r.electoral_votes)}"></td>
            <td><input data-field="total_turnout" type="number" value="${num(r.total_turnout)}"></td>
            <td><input data-field="turnout_pct" type="number" step="0.1" min="0" max="100" value="${num(r.turnout_pct)}"></td>
            <td><input data-field="gop_pct" type="number" step="0.1" min="0" max="100" value="${num(r.gop_pct)}"></td>
            <td><input data-field="dem_pct" type="number" step="0.1" min="0" max="100" value="${num(r.dem_pct)}"></td>
            <td><input data-field="ind_pct" type="number" step="0.1" min="0" max="100" value="${num(r.ind_pct)}"></td>
            <td>
              <select data-field="called_party">
                ${option("", "Uncalled", r.called_party)}
                ${option("gop", "GOP", r.called_party)}
                ${option("dem", "DNC", r.called_party)}
                ${option("ind", "IND", r.called_party)}
              </select>
            </td>
            <td><button class="save-state" data-save="${r.id}">Save</button></td>
          </tr>
        `;
      })
      .join("");

    [...els.rows.querySelectorAll("[data-save]")].forEach((btn) => {
      btn.onclick = () => saveState(btn.dataset.save);
    });
  }

  async function saveElectionSettings() {
    try {
      hideError();

      const payload = {
        title: els.title.value.trim(),
        subtitle: els.subtitle.value.trim(),
        win_threshold: Number(els.winThreshold.value || 270),
        total_electoral_votes: Number(els.totalEv.value || 538),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("elections")
        .update(payload)
        .eq("id", election.id);

      if (error) throw error;

      toast("Election settings saved.");
      await loadData();
    } catch (err) {
      showError("Could not save election settings. " + (err.message || err));
    }
  }

  async function saveState(id) {
    try {
      hideError();

      const tr = els.rows.querySelector(`tr[data-id="${id}"]`);
      if (!tr) return;

      const payload = {
        electoral_votes: numberField(tr, "electoral_votes"),
        total_turnout: numberField(tr, "total_turnout"),
        turnout_pct: clamp(numberField(tr, "turnout_pct"), 0, 100),
        gop_pct: clamp(numberField(tr, "gop_pct"), 0, 100),
        dem_pct: clamp(numberField(tr, "dem_pct"), 0, 100),
        ind_pct: clamp(numberField(tr, "ind_pct"), 0, 100),
        called_party: stringField(tr, "called_party") || null,
        updated_at: new Date().toISOString(),
      };

      const totalPct = payload.gop_pct + payload.dem_pct + payload.ind_pct;
      if (totalPct > 100.5) {
        throw new Error("GOP + DNC + IND percentages cannot be above 100%.");
      }

      const { error } = await supabase
        .from("state_results")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      toast("State saved.");
      await loadData();
    } catch (err) {
      showError("Could not save state. " + (err.message || err));
    }
  }

  function numberField(row, field) {
    return Number(row.querySelector(`[data-field="${field}"]`)?.value || 0);
  }

  function stringField(row, field) {
    return row.querySelector(`[data-field="${field}"]`)?.value || "";
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number(n || 0)));
  }

  function option(value, label, current) {
    return `<option value="${value}" ${String(current || "") === value ? "selected" : ""}>${label}</option>`;
  }

  function num(v) {
    return Number(v || 0);
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

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
})();
