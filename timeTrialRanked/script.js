const API_URL = "https://timetrial.tchongas.red/api/time-trial/players";
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

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character]);
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

function renderLeaderboard() {
    const query = document.getElementById("player-search").value.trim().toLowerCase();
    const visible = standings().filter(player => player.nickname.toLowerCase().includes(query));
    document.getElementById("leaderboard-body").innerHTML = visible.map((player, index) => `
        <tr class="${player.rankedRuns.length === 1 ? "new-player-row" : ""}" data-player="${escapeHtml(player.uuid)}" tabindex="0">
            <td class="rank">#${player.rank}</td>
            <td><div class="player-cell"><span class="player-name">${escapeHtml(player.nickname)}</span></div></td>
            <td class="time">${formatTime(player.average)}</td>
            <td class="best-time">${formatTime(player.best)}</td>
        </tr>
    `).join("");
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
    const bestPlayers = standings().sort((a, b) => b.best - a.best).slice(0, 4);
    document.getElementById("best-times").innerHTML = bestPlayers.map((player, index) => `
        <button class="best-time-card" data-best-player="${escapeHtml(player.uuid)}" type="button">
            <span class="best-rank">#${index + 1}</span>
            <strong>${escapeHtml(player.nickname)}</strong>
            <span class="best-result">${formatTime(player.best)}</span>
        </button>
    `).join("");
    document.querySelectorAll("[data-best-player]").forEach(card => card.addEventListener("click", () => openPlayer(card.dataset.bestPlayer)));
}

function renderRecentRuns() {
    document.getElementById("recent-runs").innerHTML = allRuns().slice(0, 4).map(run => `
        <article class="run-card ${run.forfeited || !Number.isFinite(run.time) ? "invalid" : ""}">
            <div><div class="run-player">${escapeHtml(run.player.nickname)}</div><div class="run-meta">${escapeHtml(run.seedType)} · ${escapeHtml(run.bastionType)}</div></div>
            <strong class="${Number.isFinite(run.time) ? "time" : "run-status"}">${run.forfeited ? "FORFEIT" : formatTime(run.time)}</strong>
            <span class="run-date">${formatDate(run.date)}</span>
        </article>
    `).join("");
}

function openPlayer(uuid) {
    const player = standings().find(entry => entry.uuid === uuid);
    if (!player) return;
    document.getElementById("player-content").innerHTML = `
        <div class="player-title"><h2>${escapeHtml(player.nickname)}</h2></div>
        <div class="player-summary">
            <div><span>RANK</span><strong>#${player.rank}</strong></div>
            <div><span>20-RUN AVERAGE</span><strong>${formatTime(player.average)}</strong></div>
            <div><span>PERSONAL BEST</span><strong>${formatTime(player.best)}</strong></div>
        </div>
        <div class="player-runs">${player.runs.sort((a, b) => b.date - a.date).map(run => `
            <div class="player-run"><span>${escapeHtml(run.seedType)} · ${escapeHtml(run.bastionType)}</span><strong class="${Number.isFinite(run.time) ? "time" : "run-status"}">${run.forfeited ? "FORFEIT" : formatTime(run.time)}</strong><span>${formatDate(run.date)}</span></div>
        `).join("")}</div>
    `;
    document.getElementById("player-panel").hidden = false;
    history.replaceState(null, "", `?player=${encodeURIComponent(uuid)}`);
}

function closePlayer() {
    document.getElementById("player-panel").hidden = true;
    history.replaceState(null, "", location.pathname);
}

async function loadData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const payload = await response.json();
        players = payload.data;
    } catch (error) {
        players = MOCK_PLAYERS;
    }
    renderLeaderboard();
    renderBestTimes();
    renderRecentRuns();
    const requestedPlayer = new URLSearchParams(location.search).get("player");
    if (requestedPlayer) openPlayer(requestedPlayer);
}

document.getElementById("player-search").addEventListener("input", renderLeaderboard);
document.getElementById("close-player").addEventListener("click", closePlayer);
document.getElementById("player-panel").addEventListener("click", event => {
    if (event.target === event.currentTarget) closePlayer();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePlayer();
});
loadData();
