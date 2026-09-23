const API_URL = "https://timetrial.tchongas.red/api/time-trial/players";
const REFRESH_MS = 30000;
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
const expandedMatches = new Set();
const previousStats = new Map();

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character]);
}

function avatarUrl(uuid, size = 40) {
    return `https://mc-heads.net/avatar/${encodeURIComponent(uuid)}/${size}`;
}

function eligibleRuns(player) {
    return player.runs
        .filter(run => !run.forfeited && Number.isFinite(run.time))
        .sort((a, b) => b.date - a.date)
        .slice(0, 20);
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
            <td><div class="player-cell"><img class="avatar" src="${avatarUrl(player.uuid)}" width="40" height="40" alt="" loading="lazy"><span class="player-name">${escapeHtml(player.nickname)}</span></div></td>
            <td class="time ${tier} ${changed ? "flash" : ""}">${formatTime(player.average)}</td>
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

function renderBestTimes() {
    if (!hasLoaded) return;
    const bestPlayers = standings().sort((a, b) => b.best - a.best).slice(0, 4);
    document.getElementById("best-times").innerHTML = bestPlayers.map((player, index) => `
        <button class="best-time-card fade-in" data-best-player="${escapeHtml(player.uuid)}" type="button" aria-label="View ${escapeHtml(player.nickname)}'s profile">
            <span class="best-rank">#${index + 1}</span>
            <img class="avatar" src="${avatarUrl(player.uuid, 32)}" width="32" height="32" alt="" loading="lazy">
            <strong>${escapeHtml(player.nickname)}</strong>
            <span class="best-result">${formatTime(player.best)}</span>
        </button>
    `).join("");
    document.querySelectorAll("[data-best-player]").forEach(card => card.addEventListener("click", () => openPlayer(card.dataset.bestPlayer)));
}

function renderRecentRuns() {
    if (!hasLoaded) return;
    document.getElementById("recent-runs").innerHTML = allRuns().slice(0, 4).map(run => {
        const expanded = expandedMatches.has(run.id);
        const participants = expanded ? matchParticipants(run.id) : [];
        return `
        <article class="run-card ${run.forfeited || !Number.isFinite(run.time) ? "invalid" : ""} ${expanded ? "expanded" : ""} fade-in">
            <button class="run-card-main" type="button" data-match="${run.id}" aria-expanded="${expanded}" aria-label="Show all players in match ${run.id}">
                <div><div class="run-player">${escapeHtml(run.player.nickname)}</div><div class="run-meta">${escapeHtml(run.seedType)} · ${escapeHtml(run.bastionType)}</div></div>
                <strong class="${Number.isFinite(run.time) ? "time" : "run-status"}">${run.forfeited ? "FORFEIT" : formatTime(run.time)}</strong>
                <span class="run-date">${formatDate(run.date)}</span>
            </button>
            ${expanded ? `<div class="match-players">${participants.map((entry, index) => `
                <button class="match-player ${index === 0 && Number.isFinite(entry.run.time) ? "winner" : ""}" type="button" data-player="${escapeHtml(entry.player.uuid)}">
                    <span class="match-place">#${index + 1}</span>
                    <img class="avatar" src="${avatarUrl(entry.player.uuid, 24)}" width="24" height="24" alt="" loading="lazy">
                    <span class="match-name">${escapeHtml(entry.player.nickname)}</span>
                    <span class="match-time">${Number.isFinite(entry.run.time) ? formatTime(entry.run.time) : "DNF"}</span>
                </button>`).join("")}
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
}

function sparklineSvg(times) {
    if (times.length < 2) return "";
    const width = 220;
    const height = 48;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const range = max - min || 1;
    const points = times.map((time, index) => {
        const x = (index / (times.length - 1)) * (width - 8) + 4;
        const y = height - 6 - ((time - min) / range) * (height - 12);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Recent completion times"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function headToHead(player) {
    const counts = new Map();
    const ownMatchIds = new Set(player.runs.map(run => run.id));
    for (const other of players) {
        if (other.uuid === player.uuid) continue;
        const shared = other.runs.filter(run => ownMatchIds.has(run.id)).length;
        if (shared) counts.set(other, shared);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function openPlayer(uuid) {
    const player = standings().find(entry => entry.uuid === uuid) || players.find(entry => entry.uuid === uuid);
    if (!player) return;
    openPlayerUuid = uuid;
    const ranked = player.rankedRuns || eligibleRuns(player);
    const times = [...ranked].sort((a, b) => a.date - b.date).map(run => run.time);
    const rivals = headToHead(player);
    document.getElementById("player-content").innerHTML = `
        <div class="player-title"><img class="avatar avatar-lg" src="${avatarUrl(player.uuid, 56)}" width="56" height="56" alt=""><h2>${escapeHtml(player.nickname)}</h2></div>
        <div class="player-summary">
            <div><span>RANK</span><strong>${player.rank ? `#${player.rank}` : "—"}</strong></div>
            <div><span>20-RUN AVERAGE</span><strong>${formatTime(player.average)}</strong></div>
            <div><span>PERSONAL BEST</span><strong>${formatTime(player.best)}</strong></div>
        </div>
        ${times.length > 1 ? `<div class="player-chart"><span>RECENT TIMES (OLD → NEW)</span>${sparklineSvg(times)}</div>` : ""}
        ${rivals.length ? `<div class="player-rivals"><span>RACED WITH</span>${rivals.map(([other, count]) => `
            <button class="rival" type="button" data-player="${escapeHtml(other.uuid)}"><img class="avatar" src="${avatarUrl(other.uuid, 24)}" width="24" height="24" alt="" loading="lazy">${escapeHtml(other.nickname)}<em>×${count}</em></button>`).join("")}</div>` : ""}
        <div class="player-runs">${[...player.runs].sort((a, b) => b.date - a.date).map(run => `
            <div class="player-run"><span>${escapeHtml(run.seedType)} · ${escapeHtml(run.bastionType)}</span><strong class="${Number.isFinite(run.time) ? "time" : "run-status"}">${run.forfeited ? "FORFEIT" : formatTime(run.time)}</strong><span>${formatDate(run.date)}</span></div>
        `).join("")}</div>
    `;
    document.querySelectorAll(".rival").forEach(button => {
        button.addEventListener("click", () => openPlayer(button.dataset.player));
    });
    document.getElementById("player-panel").hidden = false;
    syncUrl();
}

function closePlayer() {
    openPlayerUuid = null;
    document.getElementById("player-panel").hidden = true;
    syncUrl();
}

function setStatus(message, offline) {
    const banner = document.getElementById("api-status");
    banner.hidden = !message;
    banner.textContent = message || "";
    banner.classList.toggle("offline", Boolean(offline));
}

async function loadData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const payload = await response.json();
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
searchInput.addEventListener("input", () => {
    renderLeaderboard();
    syncUrl();
});
document.getElementById("close-player").addEventListener("click", closePlayer);
document.getElementById("player-panel").addEventListener("click", event => {
    if (event.target === event.currentTarget) closePlayer();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePlayer();
});

const initialParams = new URLSearchParams(location.search);
if (initialParams.get("search")) searchInput.value = initialParams.get("search");
const initialPlayer = initialParams.get("player");

loadData().then(() => {
    if (initialPlayer) openPlayer(initialPlayer);
});
setInterval(loadData, REFRESH_MS);
