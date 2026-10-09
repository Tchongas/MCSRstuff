const API_URL = "https://timetrial.tchongas.red/api/time-trial/players";
const REFRESH_MS = 30000;
const MATCH_API_URL = API_URL.replace(/\/players$/, "/matches");
const MATCH_CONFIGS = {
    HOW_DID_WE_GET_HERE: { label: "STANDARD", start: 100, reward: 20, overview: 15 },
    HIGH: { label: "INSANE", start: 70, reward: 14, overview: 15 }
};
const ADVANCEMENT_NAMES = {
    "story.root": "Minecraft",
    "story.mine_stone": "Stone Age",
    "story.upgrade_tools": "Getting an Upgrade",
    "story.smelt_iron": "Acquire Hardware",
    "story.obtain_armor": "Suit Up",
    "story.lava_bucket": "Hot Stuff",
    "story.iron_tools": "Isn't It Iron Pick",
    "story.deflect_arrow": "Not Today, Thank You",
    "story.form_obsidian": "Ice Bucket Challenge",
    "story.mine_diamond": "Diamonds!",
    "story.enter_the_nether": "We Need to Go Deeper",
    "nether.root": "Nether",
    "nether.find_bastion": "Those Were the Days",
    "nether.obtain_crying_obsidian": "Who Is Cutting Onions?",
    "nether.distract_piglin": "Oh Shiny",
    "nether.loot_bastion": "War Pigs",
    "nether.find_fortress": "A Terrible Fortress",
    "nether.obtain_blaze_rod": "Into Fire",
    "nether.charge_respawn_anchor": "Not Quite Nine Lives",
    "adventure.root": "Adventure",
    "adventure.kill_a_mob": "Monster Hunter",
    "adventure.shoot_arrow": "Take Aim",
    "adventure.sleep_in_bed": "Sweet Dreams",
    "adventure.ol_betsy": "Ol' Betsy",
    "husbandry.root": "Husbandry",
    "husbandry.plant_seed": "A Seedy Place",
    "husbandry.tame_an_animal": "Best Friends Forever",
    "husbandry.fishy_business": "Fishy Business",
    "husbandry.tactical_fishing": "Tactical Fishing"
};
const MOCK_PLAYERS = [
    {
        uuid: "1de9fe3366b54e648e0f7e11676d89cb",
        nickname: "HumorEpiadas",
        country: "br",
        runs: [
            { id: 13575922, time: 194566, date: 1790080519, seedType: "VILLAGE", bastionType: "BRIDGE", forfeited: false },
            { id: 13575801, time: 181202, date: 1790076819, seedType: "SHIPWRECK", bastionType: "HOUSING", forfeited: false },
            { id: 13575440, time: 207811, date: 1790069519, seedType: "VILLAGE", bastionType: "STABLES", forfeited: false },
            { id: 13574912, time: null, date: 1790058719, seedType: "VILLAGE", bastionType: "BRIDGE", forfeited: true }
        ]
    },
    {
        uuid: "77416e995ab44e7c85182053850d4a44",
        nickname: "CubeRunner",
        country: "us",
        runs: [
            { id: 13575021, time: 219442, date: 1790079019, seedType: "VILLAGE", bastionType: "TREASURE", forfeited: false },
            { id: 13574777, time: 204010, date: 1790062019, seedType: "SHIPWRECK", bastionType: "BRIDGE", forfeited: false },
            { id: 13574011, time: 199731, date: 1790012219, seedType: "VILLAGE", bastionType: "HOUSING", forfeited: false }
        ]
    },
    {
        uuid: "ad677c5964c84f3d9c336f66c55dfd88",
        nickname: "NewChallenger",
        country: "ca",
        runs: [{ id: 13575299, time: 231005, date: 1790080019, seedType: "VILLAGE", bastionType: "BRIDGE", forfeited: false }]
    },
    {
        uuid: "4e96c40179e24271a14b93cdb4e23d0a",
        nickname: "EnderAce",
        country: "de",
        runs: [
            { id: 13574320, time: 188410, date: 1790043319, seedType: "SHIPWRECK", bastionType: "STABLES", forfeited: false },
            { id: 13573987, time: 174990, date: 1790021119, seedType: "VILLAGE", bastionType: "BRIDGE", forfeited: false }
        ]
    }
];

let players = [];
let apiOffline = false;
let hasLoaded = false;
let openPlayerUuid = null;
let bestTimesExpanded = false;
const matchDetailsCache = new Map();
const expandedMatches = new Set();
const previousStats = new Map();

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character]);
}

function avatarUrl(uuid, size = 40) {
    return `https://skins.mcstats.com/face/${encodeURIComponent(uuid)}`;
}

function avatarImg(uuid, size, extraClass = "") {
    return `<img class="avatar ${extraClass}" src="${avatarUrl(uuid, size)}" width="${size}" height="${size}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${avatarUrl("MHF_Steve", size)}'">`;
}

function eligibleRuns(player) {
    return player.runs
        .filter(run => !run.forfeited && Number.isFinite(run.time))
        .sort((a, b) => b.date - a.date)
        .slice(0, 7);
}

function average(values) {
    return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatTime(milliseconds) {
    if (!Number.isFinite(milliseconds)) return "—";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const part = value => String(value).padStart(2, "0");
    return `${part(date.getDate())}/${part(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} ${part(date.getHours())}:${part(date.getMinutes())}`;
}

function standings() {
    return players.map(player => {
        const rankedRuns = eligibleRuns(player);
        return {
            ...player,
            rankedRuns,
            average: average(rankedRuns.map(run => run.time)),
            best: Math.max(...rankedRuns.map(run => run.time))
        };
    }).filter(player => player.rankedRuns.length).sort((a, b) => b.average - a.average).map((player, index) => ({ ...player, rank: index + 1 }));
}

/* Players grouped by match id, for the expandable recent-run cards. */
function matchParticipants(matchId) {
    const entries = [];
    for (const player of players) {
        const run = player.runs.find(item => item.id === matchId);
        if (run) entries.push({ player, run });
    }
    return entries.sort((a, b) => (b.run.time || 0) - (a.run.time || 0));
}

function syncUrl() {
    const params = new URLSearchParams();
    const query = document.getElementById("player-search").value.trim();
    const category = document.getElementById("leaderboard-category").value;
    if (category !== "HOW_DID_WE_GET_HERE") params.set("category", category);
    if (query) params.set("search", query);
    if (openPlayerUuid) params.set("player", openPlayerUuid);
    const suffix = params.size ? `?${params}` : location.pathname;
    history.replaceState(null, "", suffix);
}

function renderLeaderboard() {
    const query = document.getElementById("player-search").value.trim().toLowerCase();
    const visible = standings().filter(player => player.nickname.toLowerCase().includes(query));
    const body = document.getElementById("leaderboard-body");
    if (!hasLoaded) {
        body.innerHTML = `<tr class="skeleton-row"><td colspan="4"><span class="skeleton-block"></span><span class="skeleton-block"></span><span class="skeleton-block"></span></td></tr>`;
        return;
    }
    const topAverage = visible[0]?.average || 1;
    body.innerHTML = visible.map(player => {
        const ratio = player.average / topAverage;
        const tier = ratio <= 1.15 ? "tier-1" : ratio <= 1.5 ? "tier-2" : "tier-3";
        const signature = `${player.rank}|${Math.round(player.average)}|${Math.round(player.best)}`;
        const changed = hasLoaded && previousStats.has(player.uuid) && previousStats.get(player.uuid) !== signature;
        previousStats.set(player.uuid, signature);
        return `
        <tr class="${player.rankedRuns.length === 1 ? "new-player-row" : ""} ${player.rank <= 3 ? `podium-${player.rank}` : ""} fade-in" data-player="${escapeHtml(player.uuid)}" tabindex="0" role="button" aria-label="View ${escapeHtml(player.nickname)}'s profile">
            <td class="rank ${changed ? "flash" : ""}">#${player.rank}</td>
            <td><div class="player-cell">${avatarImg(player.uuid, 40)}<span class="player-name">${escapeHtml(player.nickname)}</span></div></td>
            <td class="time ${tier} ${player.rankedRuns.length === 1 ? "single-avg" : ""} ${changed ? "flash" : ""}">${formatTime(player.average)}${player.rankedRuns.length === 1 ? `<span class="avg-question" tabindex="0" role="note" data-tip="Only 1 completed run — average may not reflect true skill">?</span>` : ""}</td>
            <td class="best-time ${changed ? "flash" : ""}">${formatTime(player.best)}</td>
        </tr>`;
    }).join("");
    document.getElementById("empty-ranking").hidden = visible.length !== 0;
    document.querySelectorAll("[data-player]").forEach(row => {
        row.addEventListener("click", () => openPlayer(row.dataset.player));
        row.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") openPlayer(row.dataset.player);
        });
    });
}

function allRuns() {
    return players.flatMap(player => player.runs.map(run => ({ ...run, player }))).sort((a, b) => b.date - a.date);
}

function recentMatches() {
    const matches = new Map();
    for (const run of allRuns()) {
        if (!matches.has(run.id)) {
            matches.set(run.id, {
                id: run.id,
                date: run.date,
                seedType: run.seedType,
                bastionType: run.bastionType,
                forfeited: run.forfeited
            });
        }
    }
    return [...matches.values()].sort((a, b) => b.date - a.date);
}

function renderBestTimes() {
    if (!hasLoaded) return;
    const bestPlayers = standings().sort((a, b) => b.best - a.best);
    const featured = bestPlayers.slice(0, 4);
    const remaining = bestPlayers.slice(4);
    document.getElementById("best-times").innerHTML = featured.map((player, index) => `
        <button class="best-time-card fade-in" data-best-run="${player.rankedRuns.find(run => run.time === player.best)?.id}" type="button" aria-label="View ${escapeHtml(player.nickname)}'s fastest run">
            <span class="best-rank">#${index + 1}</span>
            ${avatarImg(player.uuid, 32)}
            <strong>${escapeHtml(player.nickname)}</strong>
            <span class="best-result">${formatTime(player.best)}</span>
        </button>
    `).join("");
    const moreList = document.getElementById("more-best-times");
    const toggle = document.getElementById("toggle-best-times");
    moreList.hidden = !bestTimesExpanded;
    moreList.innerHTML = remaining.map((player, index) => `
        <button class="more-best-time" data-best-run="${player.rankedRuns.find(run => run.time === player.best)?.id}" type="button">
            <span class="best-rank">#${index + 5}</span>
            ${avatarImg(player.uuid, 28)}
            <strong>${escapeHtml(player.nickname)}</strong>
            <span>${formatTime(player.best)}</span>
        </button>
    `).join("");
    toggle.hidden = remaining.length === 0;
    toggle.textContent = bestTimesExpanded ? "SHOW FEWER TIMES" : `SHOW ${remaining.length} MORE TIMES`;
    toggle.setAttribute("aria-expanded", String(bestTimesExpanded));
    document.querySelectorAll("[data-best-run]").forEach(card => card.addEventListener("click", () => openRun(Number(card.dataset.bestRun))));
}

function renderRecentRuns() {
    if (!hasLoaded) return;
    document.getElementById("recent-runs").innerHTML = recentMatches().map(match => {
        const expanded = expandedMatches.has(match.id);
        const participants = matchParticipants(match.id);
        const completed = participants.filter(entry => Number.isFinite(entry.run.time));
        const leadingTime = completed[0]?.run.time;
        const names = participants.map(entry => entry.player.nickname).join(", ");
        return `
        <article class="run-card ${match.forfeited || !completed.length ? "invalid" : ""} ${expanded ? "expanded" : ""}">
            <button class="run-card-main" type="button" data-match="${match.id}" aria-expanded="${expanded}" aria-label="Show all players in match ${match.id}">
                <div class="run-summary"><div class="run-player">${escapeHtml(names)}</div><div class="run-meta">${escapeHtml(match.seedType)} · ${escapeHtml(match.bastionType)} · ${participants.length} PLAYERS</div></div>
                <strong class="${Number.isFinite(leadingTime) ? "time" : "run-status"}">${match.forfeited ? "FORFEIT" : formatTime(leadingTime)}</strong>
                <span class="run-date">${formatDate(match.date)}</span>
            </button>
            ${expanded ? `<div class="match-players">${participants.map((entry, index) => `
                <button class="match-player ${index === 0 && Number.isFinite(entry.run.time) ? "winner" : ""}" type="button" data-player="${escapeHtml(entry.player.uuid)}">
                    <span class="match-place">#${index + 1}</span>
                    ${avatarImg(entry.player.uuid, 24)}
                    <span class="match-name">${escapeHtml(entry.player.nickname)}</span>
                    <span class="match-time">${Number.isFinite(entry.run.time) ? formatTime(entry.run.time) : "DNF"}</span>
                </button>`).join("")}
                <button class="run-info-button" type="button" data-run="${match.id}">VIEW RUN INFO</button>
            </div>` : ""}
        </article>`;
    }).join("");
    document.querySelectorAll(".run-card-main").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.match);
            expandedMatches.has(id) ? expandedMatches.delete(id) : expandedMatches.add(id);
            renderRecentRuns();
        });
    });
    document.querySelectorAll(".match-player").forEach(button => {
        button.addEventListener("click", () => openPlayer(button.dataset.player));
    });
    document.querySelectorAll(".run-info-button").forEach(button => {
        button.addEventListener("click", () => openRun(Number(button.dataset.run)));
    });
}

function objectiveName(type) {
    if (ADVANCEMENT_NAMES[type]) return ADVANCEMENT_NAMES[type];
    const path = type.split(".").at(-1).replaceAll("_", " ");
    return path.replace(/\b\w/g, character => character.toUpperCase());
}

function playerAdvancements(details, uuid) {
    const seen = new Set();
    return (details.timelines || [])
        .filter(event => event.uuid === uuid && !event.type.startsWith("projectelo.timeline.") && !seen.has(event.type) && seen.add(event.type))
        .sort((a, b) => a.time - b.time);
}

function renderRunPlayer(details, uuid) {
    const config = MATCH_CONFIGS[details.category] || MATCH_CONFIGS.HOW_DID_WE_GET_HERE;
    const player = (details.players || []).find(entry => entry.uuid === uuid);
    const completion = (details.completions || []).find(entry => entry.uuid === uuid);
    const advancements = playerAdvancements(details, uuid);
    const elapsedSeconds = Number.isFinite(completion?.time) ? completion.time / 1000 : null;
    const totalObjectives = elapsedSeconds === null ? null : Math.max(advancements.length, Math.round((elapsedSeconds - config.overview - config.start) / config.reward));
    const inferredMobs = totalObjectives === null ? null : Math.max(0, totalObjectives - advancements.length);
    const selected = document.getElementById("run-player-detail");
    selected.innerHTML = `
        <div class="objective-stats">
            <div><span>FINAL TIME</span><strong>${formatTime(completion?.time)}</strong></div>
            <div><span>ADVANCEMENTS</span><strong>${advancements.length}</strong></div>
            <div class="mob-stat"><span>UNIQUE MOBS</span><strong>${inferredMobs ?? "—"}</strong><small>INFERRED</small></div>
            <div><span>TOTAL GOALS</span><strong>${totalObjectives ?? "—"}</strong></div>
        </div>
        <div class="timeline-heading"><h3>ADVANCEMENT TIMELINE</h3><span>${advancements.length} COMPLETED</span></div>
        <div class="advancement-timeline">${advancements.length ? advancements.map((event, index) => `
            <div class="advancement-event">
                <span class="event-index">${String(index + 1).padStart(2, "0")}</span>
                <div><strong>${escapeHtml(objectiveName(event.type))}</strong></div>
                <time>${formatTime(event.time)}</time>
            </div>`).join("") : `<p class="empty-state">No advancement events were reported for ${escapeHtml(player?.nickname || "this player")}.</p>`}</div>`;
}

function renderRunDetails(details, selectedUuid) {
    const config = MATCH_CONFIGS[details.category] || MATCH_CONFIGS.HOW_DID_WE_GET_HERE;
    const completionTimes = new Map((details.completions || []).map(entry => [entry.uuid, entry.time]));
    const participants = [...(details.players || [])].sort((a, b) => (completionTimes.get(a.uuid) ?? Infinity) - (completionTimes.get(b.uuid) ?? Infinity));
    const activeUuid = participants.some(player => player.uuid === selectedUuid) ? selectedUuid : details.result?.uuid || participants[0]?.uuid;
    document.getElementById("run-content").innerHTML = `
        <div class="run-info-title">
            <span>RUN INFO</span>
            <h2>${config.label} RUN</h2>
            <div class="run-info-meta">${formatDate(details.date)} · ${escapeHtml(details.seedType || details.seed?.overworld)} · ${escapeHtml(details.bastionType || details.seed?.nether)}</div>
        </div>
        <h3>SELECT PLAYER</h3>
        <div class="run-player-tabs">${participants.map((player, index) => `
            <button class="run-player-tab ${player.uuid === activeUuid ? "active" : ""}" type="button" data-run-select="${escapeHtml(player.uuid)}">
                <span class="match-place">#${index + 1}</span>${avatarImg(player.uuid, 32)}
                <span><strong>${escapeHtml(player.nickname)}</strong><small>${formatTime(completionTimes.get(player.uuid))}</small></span>
            </button>`).join("")}</div>
        <div id="run-player-detail"></div>`;
    document.querySelectorAll("[data-run-select]").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll("[data-run-select]").forEach(tab => tab.classList.toggle("active", tab === button));
            renderRunPlayer(details, button.dataset.runSelect);
        });
    });
    if (activeUuid) renderRunPlayer(details, activeUuid);
}

async function openRun(matchId) {
    const match = recentMatches().find(entry => entry.id === matchId);
    if (!match) return;
    document.getElementById("run-backdrop").hidden = false;
    document.getElementById("run-panel").hidden = false;
    document.body.classList.add("modal-open");
    document.getElementById("run-content").innerHTML = `<div class="run-info-title"><span>RUN INFO</span><h2>LOADING RUN</h2></div><div class="run-loading">LOADING MATCH DETAILS...</div>`;
    try {
        const category = document.getElementById("leaderboard-category").value;
        const cacheKey = `${category}:${matchId}`;
        if (!matchDetailsCache.has(cacheKey)) {
            const response = await fetch(`${MATCH_API_URL}/${matchId}?category=${encodeURIComponent(category)}`);
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            const payload = await response.json();
            matchDetailsCache.set(cacheKey, payload.data);
        }
        renderRunDetails(matchDetailsCache.get(cacheKey));
    } catch (error) {
        document.getElementById("run-content").innerHTML = `<div class="run-info-title"><span>RUN INFO</span><h2>RUN UNAVAILABLE</h2></div><div class="run-detail-error">MATCH DETAILS ARE NOT AVAILABLE YET</div>`;
    }
}

function closeRun() {
    document.getElementById("run-backdrop").hidden = true;
    document.getElementById("run-panel").hidden = true;
    if (document.getElementById("player-panel").hidden) document.body.classList.remove("modal-open");
}

function headToHead(player) {
    const counts = new Map();
    const ownMatchIds = new Set(player.runs.map(run => run.id));
    for (const other of players) {
        if (other.uuid === player.uuid) continue;
        const shared = other.runs.filter(run => ownMatchIds.has(run.id)).length;
        if (shared) counts.set(other, shared);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
}

function openPlayer(uuid) {
    const player = standings().find(entry => entry.uuid === uuid) || players.find(entry => entry.uuid === uuid);
    if (!player) return;
    openPlayerUuid = uuid;
    const rivals = headToHead(player);
    document.getElementById("player-content").innerHTML = `
        <div class="player-title">${avatarImg(player.uuid, 56, "avatar-lg")}<h2>${escapeHtml(player.nickname)}</h2></div>
        <div class="player-summary">
            <div><span>RANK</span><strong>${player.rank ? `#${player.rank}` : "—"}</strong></div>
            <div><span>7-RUN AVERAGE</span><strong>${formatTime(player.average)}</strong></div>
            <div><span>PERSONAL BEST</span><strong>${formatTime(player.best)}</strong></div>
        </div>
        ${rivals.length ? `<div class="player-rivals"><span>RACED WITH</span>${rivals.map(([other, count]) => `
            <button class="rival" type="button" data-player="${escapeHtml(other.uuid)}">${avatarImg(other.uuid, 24)}${escapeHtml(other.nickname)}<em>×${count}</em></button>`).join("")}</div>` : ""}
        <div class="player-runs">${[...player.runs].sort((a, b) => b.date - a.date).map(run => `
            <button class="player-run" type="button" data-player-run="${run.id}"><span>${escapeHtml(run.seedType)} · ${escapeHtml(run.bastionType)}</span><strong class="${Number.isFinite(run.time) ? "time" : "run-status"}">${run.forfeited ? "FORFEIT" : formatTime(run.time)}</strong><span>${formatDate(run.date)}</span></button>
        `).join("")}</div>
    `;
    document.querySelectorAll(".rival").forEach(button => {
        button.addEventListener("click", () => openPlayer(button.dataset.player));
    });
    document.querySelectorAll("[data-player-run]").forEach(button => {
        button.addEventListener("click", () => {
            closePlayer();
            openRun(Number(button.dataset.playerRun));
        });
    });
    document.getElementById("player-backdrop").hidden = false;
    document.getElementById("player-panel").hidden = false;
    document.body.classList.add("modal-open");
    syncUrl();
}

function closePlayer() {
    openPlayerUuid = null;
    document.getElementById("player-backdrop").hidden = true;
    document.getElementById("player-panel").hidden = true;
    document.body.classList.remove("modal-open");
    syncUrl();
}

function updateCategoryAppearance() {
    const select = document.getElementById("leaderboard-category");
    const insane = select.value === "HIGH";
    select.classList.toggle("insane", insane);
    document.getElementById("leaderboard-kicker").textContent = `${insane ? "INSANE" : "STANDARD"} · 7-RUN AVERAGE`;
    document.getElementById("leaderboard-rules").textContent = `${insane ? "+14S" : "+20S"} · ADVANCEMENTS + UNIQUE KILLS`;
}

function setStatus(message, offline) {
    const banner = document.getElementById("api-status");
    banner.hidden = !message;
    banner.textContent = message || "";
    banner.classList.toggle("offline", Boolean(offline));
}

async function loadData() {
    try {
        const category = document.getElementById("leaderboard-category").value;
        const response = await fetch(`${API_URL}?category=${encodeURIComponent(category)}`);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const payload = await response.json();
        if (category !== document.getElementById("leaderboard-category").value) return;
        players = payload.data;
        apiOffline = false;
        hasLoaded = true;
        setStatus("", false);
    } catch (error) {
        apiOffline = true;
        if (!hasLoaded) {
            players = MOCK_PLAYERS;
            hasLoaded = true;
            setStatus("API OFFLINE — SHOWING PREVIEW DATA", true);
        } else {
            setStatus("API OFFLINE — SHOWING CACHED DATA", true);
        }
    }
    renderLeaderboard();
    renderBestTimes();
    renderRecentRuns();
    if (openPlayerUuid) openPlayer(openPlayerUuid);
}

const searchInput = document.getElementById("player-search");
const categorySelect = document.getElementById("leaderboard-category");
categorySelect.addEventListener("change", () => {
    updateCategoryAppearance();
    expandedMatches.clear();
    closePlayer();
    players = [];
    hasLoaded = false;
    document.getElementById("best-times").innerHTML = "";
    document.getElementById("recent-runs").innerHTML = "";
    renderLeaderboard();
    syncUrl();
    loadData();
});
searchInput.addEventListener("input", () => {
    renderLeaderboard();
    syncUrl();
});
document.getElementById("toggle-best-times").addEventListener("click", () => {
    bestTimesExpanded = !bestTimesExpanded;
    renderBestTimes();
});
document.getElementById("close-player").addEventListener("click", closePlayer);
document.getElementById("player-backdrop").addEventListener("click", closePlayer);
document.getElementById("close-run").addEventListener("click", closeRun);
document.getElementById("run-backdrop").addEventListener("click", closeRun);
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closePlayer();
        closeRun();
    }
});

const initialParams = new URLSearchParams(location.search);
if (["HOW_DID_WE_GET_HERE", "HIGH"].includes(initialParams.get("category"))) categorySelect.value = initialParams.get("category");
updateCategoryAppearance();
if (initialParams.get("search")) searchInput.value = initialParams.get("search");
const initialPlayer = initialParams.get("player");

loadData().then(() => {
    if (initialPlayer) openPlayer(initialPlayer);
});
setInterval(loadData, REFRESH_MS);
