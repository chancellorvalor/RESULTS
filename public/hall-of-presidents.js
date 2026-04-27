(() => {
  const cfg = window.APRP_CONFIG || window.APRP_CONFIG || {};
  const supabaseUrl = cfg.supabaseUrl;
  const supabaseKey = cfg.supabaseAnonKey;

  const els = {
    errorBox: document.getElementById("error-box"),
    sidebarList: document.getElementById("president-sidebar-list"),

    heroCard: document.getElementById("hero-card"),
    portrait: document.getElementById("president-portrait"),
    number: document.getElementById("president-number"),
    partyBadge: document.getElementById("president-party-badge"),
    term: document.getElementById("president-term"),
    name: document.getElementById("president-name"),
    shortSummary: document.getElementById("president-short-summary"),

    summaryText: document.getElementById("summary-text"),
    actionsList: document.getElementById("actions-list"),
    accomplishmentsList: document.getElementById("accomplishments-list"),
    scandalsList: document.getElementById("scandals-list"),
    eventsList: document.getElementById("events-list"),
    timelineList: document.getElementById("timeline-list"),

    vp: document.getElementById("vp-value"),
    spouse: document.getElementById("spouse-value"),
    previousOffices: document.getElementById("previous-offices-value"),
    education: document.getElementById("education-value"),
    dob: document.getElementById("dob-value"),
    pob: document.getElementById("pob-value"),
    homeState: document.getElementById("home-state-value"),
    partyValue: document.getElementById("party-value"),
    ideology: document.getElementById("ideology-value"),
  };

  let supabase = null;
  let presidents = [];
  let activeSlug = new URLSearchParams(window.location.search).get("slug") || "";

  init();

  async function init() {
    try {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase config in shared/config.js");
      }

      supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

      await loadPresidents();
      if (!presidents.length) {
        presidents = fallbackPresidents();
      }

      renderSidebar();

      const first = presidents.find((p) => p.slug === activeSlug) || presidents[0];
      if (first) {
        setActivePresident(first.slug);
      }
    } catch (err) {
      showError("Could not load Hall of Presidents. " + (err.message || err));
      presidents = fallbackPresidents();
      renderSidebar();
      if (presidents[0]) {
        setActivePresident(presidents[0].slug);
      }
    }
  }

  async function loadPresidents() {
    const { data, error } = await supabase
      .from("archive_presidents")
      .select("*")
      .order("display_order", { ascending: true })
      .order("president_number", { ascending: false });

    if (error) throw error;

    presidents = (data || []).map(normalizePresident);
  }

  function normalizePresident(row) {
    return {
      id: row.id,
      slug: row.slug || slugify(row.full_name || "president"),
      full_name: row.full_name || "Unknown President",
      president_number: row.president_number ?? "—",
      party: row.party || "Independent",
      party_short: row.party_short || shortParty(row.party),
      portrait_url: row.portrait_url || "",
      term_start: row.term_start || "",
      term_end: row.term_end || "",
      vice_president: row.vice_president || "—",
      first_lady: row.first_lady || row.spouse || "—",
      ideology: row.ideology || "—",
      home_state: row.home_state || "—",
      place_of_birth: row.place_of_birth || "—",
      date_of_birth: row.date_of_birth || "—",
      education: asArray(row.education),
      previous_offices: asArray(row.previous_offices),
      short_summary: row.short_summary || "No short summary yet.",
      full_summary: row.full_summary || "No summary yet.",
      top_actions: asArray(row.top_actions),
      accomplishments: asArray(row.accomplishments),
      scandals: asArray(row.scandals),
      key_events: asObjectArray(row.key_events),
      timeline_items: asObjectArray(row.timeline_items),
    };
  }

  function renderSidebar() {
    els.sidebarList.innerHTML = presidents
      .map((p) => {
        const years = formatYears(p.term_start, p.term_end);
        const active = p.slug === activeSlug ? "active" : "";
        const img = p.portrait_url || "https://placehold.co/120x120/0f172a/e2e8f0?text=P";
        return `
          <button class="sidebar-item ${active}" data-slug="${escAttr(p.slug)}" type="button">
            <img class="sidebar-thumb" src="${escAttr(img)}" alt="${escAttr(p.full_name)}">
            <div class="sidebar-meta">
              <div class="sidebar-name">${esc(p.full_name)}</div>
              <div class="sidebar-years">${esc(years)}</div>
            </div>
          </button>
        `;
      })
      .join("");

    [...els.sidebarList.querySelectorAll(".sidebar-item")].forEach((btn) => {
      btn.onclick = () => setActivePresident(btn.dataset.slug);
    });
  }

  function setActivePresident(slug) {
    const president = presidents.find((p) => p.slug === slug);
    if (!president) return;

    activeSlug = slug;
    renderSidebar();
    renderPresident(president);

    const url = new URL(window.location.href);
    url.searchParams.set("slug", slug);
    window.history.replaceState({}, "", url);
  }

  function renderPresident(p) {
    document.title = `APRP | ${p.full_name}`;

    els.portrait.src = p.portrait_url || "https://placehold.co/800x1000/0f172a/e2e8f0?text=President";
    els.portrait.onerror = () => {
      els.portrait.src = "https://placehold.co/800x1000/0f172a/e2e8f0?text=President";
    };

    els.number.textContent = `#${p.president_number}`;
    els.partyBadge.textContent = p.party_short || p.party;
    els.term.textContent = `${formatDate(p.term_start)} – ${formatDate(p.term_end)}`;
    els.name.textContent = p.full_name;
    els.shortSummary.textContent = p.short_summary;

    const partyClass = partyClassName(p.party);
    els.heroCard.className = `hero-card ${partyClass}`;
    els.partyBadge.className = `pill party-pill ${partyShortClass(p.party)}`;

    els.summaryText.textContent = p.full_summary;

    renderList(els.actionsList, p.top_actions, "No actions listed.");
    renderList(els.accomplishmentsList, p.accomplishments, "No accomplishments listed.");
    renderList(els.scandalsList, p.scandals, "No scandals listed.");
    renderEvents(els.eventsList, p.key_events);
    renderTimeline(els.timelineList, p.timeline_items);

    els.vp.textContent = p.vice_president || "—";
    els.spouse.textContent = p.first_lady || "—";
    els.previousOffices.textContent = p.previous_offices.length ? p.previous_offices.join("\n") : "—";
    els.education.textContent = p.education.length ? p.education.join("\n") : "—";
    els.dob.textContent = formatDate(p.date_of_birth);
    els.pob.textContent = p.place_of_birth || "—";
    els.homeState.textContent = p.home_state || "—";
    els.partyValue.textContent = p.party || "—";
    els.ideology.textContent = p.ideology || "—";
  }

  function renderList(el, items, emptyMessage) {
    if (!items.length) {
      el.innerHTML = `<li>${esc(emptyMessage)}</li>`;
      return;
    }

    el.innerHTML = items.map((item) => `<li>${esc(item)}</li>`).join("");
  }

  function renderEvents(el, items) {
    if (!items.length) {
      el.innerHTML = `<div class="event-item"><div class="event-year">—</div><div><div class="event-title">No events listed.</div></div><div class="event-tag tag-default">Info</div></div>`;
      return;
    }

    el.innerHTML = items
      .map((item) => {
        const tag = (item.tag || "INFO").toUpperCase();
        return `
          <div class="event-item">
            <div class="event-year">${esc(item.year || item.date || "—")}</div>
            <div>
              <div class="event-title">${esc(item.title || "Untitled Event")}</div>
              <div class="event-desc">${esc(item.description || "")}</div>
            </div>
            <div class="event-tag ${tagClass(tag)}">${esc(tag)}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderTimeline(el, items) {
    if (!items.length) {
      el.innerHTML = `
        <div class="timeline-point">
          <div class="timeline-dot"></div>
          <div class="timeline-date">—</div>
          <div class="timeline-label">No timeline items yet.</div>
        </div>
      `;
      return;
    }

    el.innerHTML = items
      .map((item) => {
        return `
          <div class="timeline-point">
            <div class="timeline-dot"></div>
            <div class="timeline-date">${esc(item.date || item.year || "—")}</div>
            <div class="timeline-label">${esc(item.label || item.title || "Untitled")}</div>
          </div>
        `;
      })
      .join("");
  }

  function showError(msg) {
    els.errorBox.textContent = msg;
    els.errorBox.classList.remove("hidden");
  }

  function asArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch (_) {}
      return value
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [];
  }

  function asObjectArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  }

  function partyClassName(party) {
    const p = String(party || "").toLowerCase();
    if (p.includes("dem")) return "party-dem";
    if (p.includes("rep") || p.includes("gop")) return "party-gop";
    if (p.includes("ind")) return "party-ind";
    return "party-neutral";
  }

  function partyShortClass(party) {
    const p = String(party || "").toLowerCase();
    if (p.includes("dem")) return "dem";
    if (p.includes("rep") || p.includes("gop")) return "gop";
    return "ind";
  }

  function shortParty(party) {
    const p = String(party || "").toLowerCase();
    if (p.includes("dem")) return "DNC";
    if (p.includes("rep") || p.includes("gop")) return "GOP";
    if (p.includes("ind")) return "IND";
    return party || "OTH";
  }

  function tagClass(tag) {
    const t = String(tag || "").toLowerCase();
    if (t.includes("legislation")) return "tag-legislation";
    if (t.includes("crisis")) return "tag-crisis";
    if (t.includes("war")) return "tag-war";
    if (t.includes("scandal")) return "tag-scandal";
    if (t.includes("political")) return "tag-political";
    if (t.includes("economy")) return "tag-economy";
    return "tag-default";
  }

  function formatYears(start, end) {
    const s = String(start || "").slice(0, 4);
    const e = String(end || "").slice(0, 4);
    return [s, e].filter(Boolean).join("–") || "Unknown term";
  }

  function formatDate(value) {
    if (!value) return "—";
    const v = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = new Date(v + "T00:00:00");
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }
    return v;
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[m]));
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }

  function fallbackPresidents() {
    return [
      normalizePresident({
        id: "demo-1",
        slug: "james-knox-sterling",
        full_name: "James Knox Sterling",
        president_number: 43,
        party: "Republican Party",
        party_short: "GOP",
        portrait_url: "https://placehold.co/800x1000/1e293b/e2e8f0?text=Sterling",
        term_start: "2001-01-20",
        term_end: "2005-01-20",
        vice_president: "Richard Hale",
        first_lady: "Margaret Sterling",
        ideology: "Conservative Nationalism",
        home_state: "Texas",
        place_of_birth: "Dallas, Texas, United States",
        date_of_birth: "1954-03-14",
        education: ["University of Texas at Austin", "B.A. in Political Science"],
        previous_offices: ["Governor of Texas (1995–2001)", "U.S. Representative (TX-12) (1991–1995)"],
        short_summary: "Passed sweeping tax cuts and corporate relief legislation. Launched broad deregulation and expanded executive authority.",
        full_summary: "The Sterling administration was defined by aggressive conservatism, hardline nationalism, and escalating executive abuse. He pursued sweeping tax cuts, deregulation, and military-driven policy, while centralizing executive power and pressuring political opponents.",
        top_actions: [
          "Passed sweeping tax cuts and corporate relief legislation.",
          "Launched broad deregulation across energy, banking, and industry.",
          "Expanded military procurement and defense spending.",
          "Centralized executive authority through unilateral orders."
        ],
        accomplishments: [
          "Boosted short-term private investment and corporate confidence.",
          "Expanded energy and industry production through deregulation.",
          "Rebuilt military readiness through accelerated procurement."
        ],
        scandals: [
          "Abused executive power through repeated constitutional overreach.",
          "Oversaw corruption linked to loyalists and politically connected allies.",
          "Used state institutions to pressure rivals and critics."
        ],
        key_events: [
          { year: "2001", title: "Tax Relief Act signed into law", tag: "LEGISLATION", description: "A major tax-cut package reshaped fiscal policy at the start of the term." },
          { year: "2002", title: "Deregulation Expansion Initiative launched", tag: "POLITICAL", description: "The White House accelerated deregulation across several sectors." },
          { year: "2003", title: "Invasion of Iran begins", tag: "CRISIS", description: "A major foreign-policy decision that defined the administration." },
          { year: "2005", title: "Impeached by Congress", tag: "POLITICAL", description: "The administration collapsed amid scandal and institutional crisis." }
        ],
        timeline_items: [
          { date: "January 20, 2001", label: "Inauguration Day" },
          { date: "June 2001", label: "Tax Relief Act Signed" },
          { date: "March 2003", label: "Invasion of Iran Begins" },
          { date: "June 2005", label: "Impeached by Congress" }
        ]
      }),
      normalizePresident({
        id: "demo-2",
        slug: "francis-j-underwood",
        full_name: "Francis J. Underwood",
        president_number: 45,
        party: "Democratic Party",
        party_short: "DNC",
        portrait_url: "https://placehold.co/800x1000/1e293b/e2e8f0?text=Underwood",
        term_start: "2009-01-20",
        term_end: "2013-01-20",
        vice_president: "TBD",
        first_lady: "Claire Underwood",
        ideology: "Pragmatic Liberalism",
        home_state: "South Carolina",
        place_of_birth: "Gaffney, South Carolina, United States",
        date_of_birth: "1959-11-05",
        education: ["The Citadel", "Harvard Law School"],
        previous_offices: ["President pro tempore influence network", "Former House Majority Whip"],
        short_summary: "A ruthless and effective operator who centralized influence while aggressively driving federal action.",
        full_summary: "Underwood’s presidency combined strategic discipline, legislative aggression, and image-conscious executive management. His administration emphasized control, tactical coalition building, and relentless pressure on institutional rivals.",
        top_actions: [
          "Drove a highly centralized White House policy operation.",
          "Expanded federal leverage over industry and labor politics.",
          "Used crisis management aggressively to shape public opinion."
        ],
        accomplishments: [
          "Improved executive message discipline.",
          "Accelerated major legislative bargaining.",
          "Expanded White House operational control."
        ],
        scandals: [
          "Persistent accusations of ruthless power politics.",
          "Concerns over intimidation, pressure campaigns, and manipulation."
        ],
        key_events: [
          { year: "2009", title: "Underwood sworn in", tag: "POLITICAL", description: "Francis J. Underwood begins his administration." },
          { year: "2010", title: "Rail expansion package signed", tag: "LEGISLATION", description: "A large infrastructure push reshaped transport policy." }
        ],
        timeline_items: [
          { date: "January 20, 2009", label: "Inauguration Day" },
          { date: "April 2010", label: "Presidential Succession Amendment Act signed" }
        ]
      })
    ];
  }
})();
