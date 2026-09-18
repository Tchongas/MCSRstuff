const ADVANCEMENT_IDS = [
    "story/root", "story/mine_stone", "story/upgrade_tools", "story/smelt_iron", "story/obtain_armor", "story/lava_bucket", "story/iron_tools", "story/deflect_arrow", "story/form_obsidian", "story/mine_diamond", "story/enter_the_nether", "story/shiny_gear", "story/enchant_item", "story/cure_zombie_villager", "story/follow_ender_eye", "story/enter_the_end",
    "nether/root", "nether/return_to_sender", "nether/find_bastion", "nether/obtain_ancient_debris", "nether/fast_travel", "nether/find_fortress", "nether/obtain_crying_obsidian", "nether/distract_piglin", "nether/ride_strider", "nether/uneasy_alliance", "nether/loot_bastion", "nether/use_lodestone", "nether/netherite_armor", "nether/get_wither_skull", "nether/obtain_blaze_rod", "nether/charge_respawn_anchor", "nether/explore_nether", "nether/summon_wither", "nether/brew_potion", "nether/create_beacon", "nether/all_potions", "nether/create_full_beacon", "nether/all_effects",
    "end/root", "end/kill_dragon", "end/dragon_egg", "end/enter_end_gateway", "end/respawn_dragon", "end/dragon_breath", "end/find_end_city", "end/elytra", "end/levitate",
    "adventure/root", "adventure/voluntary_exile", "adventure/kill_a_mob", "adventure/trade", "adventure/honey_block_slide", "adventure/ol_betsy", "adventure/sleep_in_bed", "adventure/hero_of_the_village", "adventure/shoot_arrow", "adventure/kill_all_mobs", "adventure/totem_of_undying", "adventure/summon_iron_golem", "adventure/two_birds_one_arrow", "adventure/whos_the_pillager_now", "adventure/arbalistic", "adventure/adventuring_time", "adventure/sniper_duel", "adventure/bullseye",
    "husbandry/root", "husbandry/safely_harvest_honey", "husbandry/break_diamond_hoe", "husbandry/breed_an_animal", "husbandry/tame_an_animal", "husbandry/fishy_business", "husbandry/plant_seed", "husbandry/complete_catalogue", "husbandry/tactical_fishing", "husbandry/balanced_diet", "husbandry/obtain_netherite_hoe", "husbandry/bred_all_animals", "husbandry/silk_touch_nest"
];

const MOB_IDS = [
    "bat", "bee", "blaze", "cat", "cave_spider", "chicken", "cod", "cow", "creeper", "dolphin", "donkey", "drowned", "elder_guardian", "ender_dragon", "enderman", "endermite", "evoker", "fox", "ghast", "guardian", "hoglin", "horse", "husk", "iron_golem", "llama", "magma_cube", "mooshroom", "mule", "ocelot", "panda", "parrot", "phantom", "pig", "piglin", "pillager", "polar_bear", "pufferfish", "rabbit", "ravager", "salmon", "sheep", "shulker", "silverfish", "skeleton", "skeleton_horse", "slime", "snow_golem", "spider", "squid", "stray", "strider", "trader_llama", "tropical_fish", "turtle", "vex", "villager", "vindicator", "wandering_trader", "witch", "wither", "wither_skeleton", "wolf", "zoglin", "zombie", "zombie_villager", "zombified_piglin"
].map(id => `minecraft:${id}`);

const PRESET_TEMPLATE = {
    author: "HumorEpiadas",
    name: "TimeTrialPreset",
    option: {
        overworldSeed: "",
        netherSeed: "",
        theEndSeed: "",
        rngSeed: "",
        flag: { list: [{ value: 537411527 }, { value: 5 }] },
        category: "HIGH",
        command: "",
        roomName: "",
        waitingImageUrl: "",
        availableFakePlayer: false,
        fakePlayerLevel: "RANDOM",
        manualMaxPlayers: 32,
        voteCount: 0,
        completions: 99,
        timeLimit: 0,
        timeAttack: 0,
        lowerNodeHeight: 5,
        slowmodeTime: 1,
        seedType: { value: 31 },
        bastionType: { value: 15 },
        gameMode: { type: "default" }
    },
    version: 2
};

function smallCaps(text) {
    const normal = "abcdefghijklmnopqrstuvwxyz";
    const styled = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀѕᴛᴜᴠᴡxʏᴢ";
    return [...text].map(character => {
        const index = normal.indexOf(character.toLowerCase());
        return index === -1 ? character : styled[index];
    }).join("");
}

function statisticId(value) {
    return value.replace(":", ".");
}

function advancementSelectorId(value) {
    return value.replace(/^minecraft:/, "");
}

function blockCoords(x, y) {
    return `${x ? `~${x}` : "~"} ${y} ~`;
}

function commandBlockType(repeating, conditional) {
    if (repeating) return "repeating_command_block[facing=up]";
    return conditional
        ? "chain_command_block[facing=up,conditional=true]"
        : "chain_command_block[facing=up]";
}

function createColumnWriter(commands) {
    const placements = [];
    let x = 0;
    return {
        add(entries) {
            entries.forEach((entry, y) => placements.push({
                x,
                y,
                command: typeof entry === "string" ? entry : entry.command,
                block: commandBlockType(y === 0, typeof entry === "object" && entry.conditional)
            }));
            x++;
        },
        finish() {
            const groups = new Map();
            placements.forEach(placement => {
                const key = `${placement.y}|${placement.block}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(placement);
            });
            const direct = new Set();
            groups.forEach(group => {
                group.sort((a, b) => a.x - b.x);
                if (group.length === 1) {
                    const placement = group[0];
                    const escaped = placement.command.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
                    commands.push(`setblock ${blockCoords(placement.x, placement.y)} ${placement.block}{auto:1b,Command:\"${escaped}\"}`);
                    direct.add(placement);
                    return;
                }
                for (let index = 0; index < group.length;) {
                    let end = index;
                    while (end + 1 < group.length && group[end + 1].x === group[end].x + 1 && group[end + 1].command === group[index].command) end++;
                    if (end > index) {
                        const escaped = group[index].command.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
                        const block = `${group[index].block}{auto:1b,Command:\"${escaped}\"}`;
                        commands.push(`fill ${blockCoords(group[index].x, group[index].y)} ${blockCoords(group[end].x, group[index].y)} ${block}`);
                        for (let runIndex = index; runIndex <= end; runIndex++) direct.add(group[runIndex]);
                    }
                    index = end + 1;
                }
                const remaining = group.filter(placement => !direct.has(placement));
                if (!remaining.length) return;
                let start = remaining[0];
                let end = start;
                const flush = () => {
                    const block = `${start.block}{auto:1b}`;
                    if (start.x === end.x) commands.push(`setblock ${blockCoords(start.x, start.y)} ${block}`);
                    else commands.push(`fill ${blockCoords(start.x, start.y)} ${blockCoords(end.x, end.y)} ${block}`);
                };
                for (let index = 1; index < remaining.length; index++) {
                    if (remaining[index].x === end.x + 1) end = remaining[index];
                    else {
                        flush();
                        start = remaining[index];
                        end = start;
                    }
                }
                flush();
            });
            placements.forEach(placement => {
                if (direct.has(placement)) return;
                const escaped = placement.command.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
                commands.push(`data merge block ${blockCoords(placement.x, placement.y)} {Command:\"${escaped}\"}`);
            });
            return { count: placements.length, columns: x };
        }
    };
}

function playerTarget(raw) {
    if (raw.startsWith("@")) return raw;
    return `@a[name=${raw}]`;
}

function withSelectorArgs(selector, args) {
    if (!args) return selector;
    const close = selector.lastIndexOf("]");
    if (close === -1) return `${selector}[${args}]`;
    const separator = selector[close - 1] === "[" ? "" : ",";
    return `${selector.slice(0, close)}${separator}${args}${selector.slice(close)}`;
}

function updateLimitMeter(length) {
    const limit = 32500;
    const ratio = length / limit;
    const meter = document.getElementById("limit-meter");
    const bar = document.getElementById("limit-bar");
    const label = document.getElementById("limit-label");
    meter.classList.toggle("warning", ratio >= 0.8 && ratio <= 1);
    meter.classList.toggle("over", ratio > 1);
    bar.style.width = `${Math.min(100, ratio * 100)}%`;
    label.textContent = ratio > 1
        ? `${length.toLocaleString()} / ${limit.toLocaleString()} — ${(length - limit).toLocaleString()} over`
        : `${length.toLocaleString()} / ${limit.toLocaleString()}`;
}

function updateCharacterDebug() {
    const enabled = document.getElementById("show-limit").checked;
    const output = document.getElementById("output").value;
    const summary = document.getElementById("summary");
    document.getElementById("limit-meter").hidden = !enabled;
    if (enabled) updateLimitMeter(output.length);
    if (summary.dataset.details) {
        summary.textContent = enabled
            ? `${output.length.toLocaleString()} characters · ${summary.dataset.details}`
            : summary.dataset.details;
    }
}

function saveConfig() {
    localStorage.setItem("timeTrialConfig", JSON.stringify({
        start: document.getElementById("start-time").value,
        bonus: document.getElementById("bonus-time").value,
        advancements: document.getElementById("mode-advancements").checked,
        kills: document.getElementById("mode-kills").checked,
        debug: document.getElementById("show-limit").checked,
        separateRewards: document.getElementById("separate-rewards").checked,
        advancementReward: document.getElementById("advancement-reward").value,
        mobReward: document.getElementById("mob-reward").value,
        previewTime: document.getElementById("preview-time").value,
        previewSounds: document.getElementById("preview-sounds").checked,
        creativeAfterLoss: document.getElementById("creative-after-loss").checked
    }));
}

function loadConfig() {
    try {
        const config = JSON.parse(localStorage.getItem("timeTrialConfig"));
        if (!config) return;
        document.getElementById("start-time").value = config.start || 120;
        document.getElementById("bonus-time").value = config.bonus || 20;
        document.getElementById("mode-advancements").checked = config.advancements !== false;
        document.getElementById("mode-kills").checked = Boolean(config.kills);
        document.getElementById("show-limit").checked = Boolean(config.debug);
        document.getElementById("separate-rewards").checked = Boolean(config.separateRewards);
        document.getElementById("advancement-reward").value = config.advancementReward || 20;
        document.getElementById("mob-reward").value = config.mobReward || 10;
        document.getElementById("preview-time").value = config.previewTime ?? 15;
        document.getElementById("preview-sounds").checked = config.previewSounds !== false;
        document.getElementById("creative-after-loss").checked = Boolean(config.creativeAfterLoss);
    } catch (error) {
        localStorage.removeItem("timeTrialConfig");
    }
}

function invalidateGeneratedCommand() {
    const output = document.getElementById("output");
    if (!output.value) return;
    output.value = "";
    output.hidden = true;
    document.getElementById("copy").disabled = true;
    document.getElementById("download-preset").disabled = true;
    document.getElementById("toggle-output").disabled = true;
    document.getElementById("toggle-output").textContent = "SHOW RAW COMMAND";
    document.querySelector(".output-panel").classList.remove("ready");
    const generateButton = document.getElementById("generate");
    generateButton.classList.remove("generated");
    generateButton.querySelector("span").textContent = "GENERATE COMMANDS";
    clearTimeout(generateButton.feedbackTimer);
    const summary = document.getElementById("summary");
    summary.dataset.details = "";
    summary.textContent = "Settings changed. Generate a new command.";
}

function updateAdvancedState() {
    invalidateGeneratedCommand();
    const separate = document.getElementById("separate-rewards").checked;
    document.getElementById("advancement-reward").disabled = !separate;
    document.getElementById("mob-reward").disabled = !separate;
    saveConfig();
}

function updateModeState() {
    invalidateGeneratedCommand();
    const modeInputs = [...document.querySelectorAll(".mode-card input")];
    modeInputs.forEach(input => input.closest(".mode-card").classList.toggle("active", input.checked));
    const enabled = modeInputs.some(input => input.checked);
    const generateButton = document.getElementById("generate");
    generateButton.disabled = !enabled;
    if (!enabled) document.getElementById("summary").textContent = "Select at least one objective type.";
    saveConfig();
}

function handleCommandSettingChange() {
    invalidateGeneratedCommand();
    saveConfig();
}

function generate() {
    const startSeconds = Math.max(1, Number.parseInt(document.getElementById("start-time").value, 10) || 120);
    const bonusSeconds = Math.max(1, Number.parseInt(document.getElementById("bonus-time").value, 10) || 20);
    const separateRewards = document.getElementById("separate-rewards").checked;
    const advancementReward = separateRewards ? Math.max(1, Number.parseInt(document.getElementById("advancement-reward").value, 10) || 20) : bonusSeconds;
    const mobReward = separateRewards ? Math.max(1, Number.parseInt(document.getElementById("mob-reward").value, 10) || 10) : bonusSeconds;
    const previewSeconds = Math.max(0, Number.parseInt(document.getElementById("preview-time").value, 10) || 0);
    const previewSounds = document.getElementById("preview-sounds").checked;
    const creativeAfterLoss = document.getElementById("creative-after-loss").checked;
    const players = "@p";
    const advancementsEnabled = document.getElementById("mode-advancements").checked;
    const killsEnabled = document.getElementById("mode-kills").checked;
    if (!advancementsEnabled && !killsEnabled) return;
    const rewardSources = [advancementsEnabled && "advancements", killsEnabled && "unique mob kills"].filter(Boolean).join(" and ") || "none";
    const rewardDetails = separateRewards
        ? [advancementsEnabled && `Advancements: +${advancementReward}s`, killsEnabled && `Mobs: +${mobReward}s`].filter(Boolean).join("  •  ")
        : `Each goal: +${bonusSeconds}s`;
    const intro = JSON.stringify([
        { text: "\n" },
        { text: smallCaps("TIME TRIAL"), color: "gold", bold: true },
        { text: smallCaps("\nEvery goal you complete adds time to your clock."), color: "white" },
        { text: smallCaps("\nStart: "), color: "green" },
        { text: `${startSeconds}s`, color: "white" },
        { text: smallCaps("  •  Reward: "), color: "green" },
        { text: smallCaps(rewardDetails), color: "white" },
        { text: smallCaps("\nGoals: "), color: "aqua" },
        { text: `${smallCaps(rewardSources)}.\n`, color: "white" }
    ]);
    const commands = [
        "/gamerule sendCommandFeedback false",
        "/gamerule logAdminCommands false",
        "/scoreboard objectives add d dummy",
        "/scoreboard objectives add r dummy",
        "/scoreboard objectives add s dummy",
        "/scoreboard objectives add c dummy",
        "/scoreboard objectives add w dummy",
        "/scoreboard objectives add b dummy",
        "/scoreboard objectives add a dummy",
        "/scoreboard objectives add m dummy",
        `/scoreboard players set ${players} a 0`,
        `/scoreboard players set ${players} m 0`,
        `/scoreboard players set ${players} c 0`,
        `/scoreboard players set ${players} w -1`,
        `/execute as ${players} store result score @s r run speedrunigt get rta second`,
        `/execute as ${players} run scoreboard players operation @s d = @s r`,
        `/scoreboard players add ${players} d ${previewSeconds}`,
        `/tellraw ${players} ${intro}`
    ];

    const events = [];
    if (advancementsEnabled) {
        ADVANCEMENT_IDS.forEach(id => events.push({
            kind: "advancement",
            reward: advancementReward,
            condition: `advancements={${advancementSelectorId(id)}=true}`
        }));
    }
    if (killsEnabled) {
        MOB_IDS.forEach((id, index) => {
            const objective = `k${index}`;
            commands.push(`/scoreboard objectives add ${objective} minecraft.killed:${statisticId(id)}`);
            events.push({ kind: "mob", reward: mobReward, condition: `scores={${objective}=1..}` });
        });
    }

    const columns = createColumnWriter(commands);
    columns.add([
        `execute as ${players} store result score @s r run speedrunigt get rta second`,
        `scoreboard players remove ${withSelectorArgs(players, "scores={c=1..}")} c 1`,
        `scoreboard players remove ${withSelectorArgs(players, "scores={w=1..},tag=!R")} w 1`,
        `execute as ${players} run scoreboard players operation @s s = @s d`,
        `execute as ${players} run scoreboard players operation @s s -= @s r`,
        `execute as ${withSelectorArgs(players, "scores={s=1..},tag=!R,tag=!L")} run title @s actionbar {\"text\":\"${smallCaps("Starting in: ")}\",\"color\":\"green\",\"bold\":true,\"extra\":[{\"score\":{\"name\":\"@s\",\"objective\":\"s\"},\"color\":\"white\",\"bold\":false},{\"text\":\"s\",\"color\":\"gray\",\"bold\":false}]}`,
        ...(previewSounds ? [
            `execute as ${withSelectorArgs(players, "scores={s=1..3,c=..0},tag=!R,tag=!L")} at @s run playsound block.note_block.hat master @s ~ ~ ~ .7 1`,
            { command: `scoreboard players set ${players} c 20`, conditional: true }
        ] : []),
        `execute at ${withSelectorArgs(players, "scores={s=1..},tag=!R,tag=!L,tag=!P")} run fill ~-2 ~30 ~-2 ~2 ~33 ~2 barrier hollow`,
        `execute at ${withSelectorArgs(players, "scores={s=1..},tag=!R,tag=!L,tag=!P")} run tp ${players} ~ ~31 ~`,
        `tag ${withSelectorArgs(players, "scores={s=1..},tag=!R,tag=!L,tag=!P")} add P`,
        `execute at ${withSelectorArgs(players, "scores={s=..0},tag=P")} run tp ${players} ~ ~-31 ~`,
        `execute at ${withSelectorArgs(players, "scores={s=..0},tag=P")} run fill ~-1 ~30 ~-1 ~1 ~33 ~1 air`,
        `tag ${withSelectorArgs(players, "scores={s=..0},tag=P")} remove P`,
        `execute as ${withSelectorArgs(players, "scores={s=..0},tag=!R,tag=!L")} run scoreboard players operation @s b = @s r`,
        `execute as ${withSelectorArgs(players, "scores={s=..0},tag=!R,tag=!L")} run scoreboard players operation @s d = @s r`,
        `scoreboard players add ${withSelectorArgs(players, "scores={s=..0},tag=!R,tag=!L")} d ${startSeconds}`,
        `scoreboard players set ${withSelectorArgs(players, "scores={s=..0},tag=!R,tag=!L")} c 0`,
        `tag ${withSelectorArgs(players, "scores={s=..0},tag=!R,tag=!L")} add R`,
        { command: `scoreboard players set ${players} w -1`, conditional: true },
        `execute as ${players} run scoreboard players operation @s s = @s d`,
        `execute as ${players} run scoreboard players operation @s s -= @s r`,
        `execute as ${withSelectorArgs(players, "tag=R")} run title @s actionbar {\"text\":\"${smallCaps("Time remaining: ")}\",\"color\":\"green\",\"bold\":true,\"extra\":[{\"score\":{\"name\":\"@s\",\"objective\":\"s\"},\"color\":\"white\",\"bold\":false},{\"text\":\"s\",\"color\":\"gray\",\"bold\":false}]}`,
        `execute as ${withSelectorArgs(players, "scores={s=1..5,c=..0},tag=R")} at @s run playsound block.note_block.hat master @s ~ ~ ~ .7 1`,
        { command: `scoreboard players set ${players} c 20`, conditional: true },
        `execute as ${withSelectorArgs(players, "scores={s=..0},tag=R")} run speedrunigt stop`,
        { command: `execute as ${players} run scoreboard players operation @s s = @s r`, conditional: true },
        { command: `execute as ${players} run scoreboard players operation @s s -= @s b`, conditional: true },
        { command: `title ${players} title {\"text\":\"${smallCaps("Time's up!")}\",\"color\":\"red\",\"bold\":true}`, conditional: true },
        { command: `execute as ${players} run tellraw @s [{\"text\":\"\\n${smallCaps("Time Trial Results")}\",\"color\":\"gold\",\"bold\":true},{\"text\":\"\\n${smallCaps("Time survived: ")}\",\"color\":\"green\"},{\"score\":{\"name\":\"@s\",\"objective\":\"s\"},\"color\":\"white\"},{\"text\":\"s\\n${smallCaps("Advancements: ")}\",\"color\":\"green\"},{\"score\":{\"name\":\"@s\",\"objective\":\"a\"},\"color\":\"white\"},{\"text\":\"\\n${smallCaps("Mobs: ")}\",\"color\":\"aqua\"},{\"score\":{\"name\":\"@s\",\"objective\":\"m\"},\"color\":\"white\"},{\"text\":\"\\n\"}]`, conditional: true },
        ...(creativeAfterLoss ? [
            { command: `scoreboard players set ${players} w 100`, conditional: true },
            { command: `tag ${players} add L`, conditional: true }
        ] : []),
        { command: `tag ${players} remove R`, conditional: true },
        ...(creativeAfterLoss ? [
            `execute as ${withSelectorArgs(players, "scores={w=0},tag=L")} run gamemode creative @s`,
            { command: `tellraw ${players} {\"text\":\"${smallCaps("You are now in Creative mode.")}\",\"color\":\"green\"}`, conditional: true },
            { command: `scoreboard players set ${players} w -1`, conditional: true },
            { command: `tag ${players} remove L`, conditional: true }
        ] : [])
    ]);

    events.forEach(event => {
        const mob = event.kind === "mob";
        const color = mob ? "aqua" : "green";
        const sound = mob ? "block.note_block.pling master @p ~ ~ ~ .35 1.2" : "entity.experience_orb.pickup master @p ~ ~ ~ .35 1.4";
        columns.add([
            `scoreboard players add ${withSelectorArgs(players, `${event.condition},tag=R`)} d ${event.reward}`,
            { command: "setblock ~ ~-1 ~ air", conditional: true },
            { command: `scoreboard players add ${players} ${mob ? "m" : "a"} 1`, conditional: true },
            { command: `tellraw ${players} {\"text\":\"+${event.reward} ${smallCaps("seconds")}\",\"color\":\"${color}\"}`, conditional: true },
            { command: `execute at ${players} run playsound ${sound}`, conditional: true },
            { command: `execute as ${withSelectorArgs(players, "scores={s=1..5},tag=R")} run title @s actionbar {\"text\":\"${smallCaps("Clutch!")} +${event.reward}s\",\"color\":\"aqua\",\"bold\":true}`, conditional: true },
            { command: `execute at ${players} run playsound entity.player.levelup master ${players} ~ ~ ~ .55 1.5`, conditional: true }
        ]);
    });

    const gridStats = columns.finish();
    const output = commands.join(";");
    document.getElementById("output").value = output;
    document.getElementById("copy").disabled = false;
    document.getElementById("download-preset").disabled = false;
    document.getElementById("toggle-output").disabled = false;
    document.querySelector(".output-panel").classList.add("ready");
    const summary = document.getElementById("summary");
    summary.dataset.details = `Command ready · ${events.length} rewards · ${gridStats.count} command blocks in ${gridStats.columns} column${gridStats.columns === 1 ? "" : "s"}`;
    updateCharacterDebug();
    const generateButton = document.getElementById("generate");
    const generateLabel = generateButton.querySelector("span");
    generateButton.classList.add("generated");
    generateLabel.textContent = "COMMAND READY!";
    clearTimeout(generateButton.feedbackTimer);
    generateButton.feedbackTimer = setTimeout(() => {
        generateButton.classList.remove("generated");
        generateLabel.textContent = "GENERATE AGAIN";
    }, 1800);
}

async function copyDiscord() {
    await navigator.clipboard.writeText("limifaooooo");
    const button = document.getElementById("discord-button");
    button.textContent = "Username copied!";
    setTimeout(() => button.textContent = "Discord: limifaooooo", 1500);
}

function downloadPreset() {
    const command = document.getElementById("output").value;
    if (!command) return;
    const preset = JSON.parse(JSON.stringify(PRESET_TEMPLATE));
    preset.option.command = command;
    const url = URL.createObjectURL(new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "TimeTrialPreset.rsp";
    link.click();
    URL.revokeObjectURL(url);
}

function toggleRawOutput() {
    const output = document.getElementById("output");
    output.hidden = !output.hidden;
    document.getElementById("toggle-output").textContent = output.hidden ? "SHOW RAW COMMAND" : "HIDE RAW COMMAND";
}

async function copyOutput() {
    const output = document.getElementById("output");
    if (!output.value) return;
    try {
        await navigator.clipboard.writeText(output.value);
    } catch (error) {
        const hidden = output.hidden;
        output.hidden = false;
        output.select();
        document.execCommand("copy");
        output.hidden = hidden;
    }
    const button = document.getElementById("copy");
    button.textContent = "COPIED!";
    button.classList.add("copied");
    setTimeout(() => {
        button.textContent = "COPY FOR RANKED";
        button.classList.remove("copied");
    }, 1500);
}

loadConfig();
updateCharacterDebug();
updateAdvancedState();
updateModeState();
document.querySelectorAll(".mode-card input").forEach(input => input.addEventListener("change", updateModeState));
document.querySelectorAll("#start-time, #bonus-time, #advancement-reward, #mob-reward, #preview-time").forEach(input => input.addEventListener("input", handleCommandSettingChange));
document.getElementById("separate-rewards").addEventListener("change", updateAdvancedState);
document.getElementById("preview-sounds").addEventListener("change", handleCommandSettingChange);
document.getElementById("creative-after-loss").addEventListener("change", handleCommandSettingChange);
document.getElementById("show-limit").addEventListener("change", () => {
    updateCharacterDebug();
    saveConfig();
});
document.getElementById("discord-button").addEventListener("click", copyDiscord);
document.getElementById("toggle-output").addEventListener("click", toggleRawOutput);
document.getElementById("download-preset").addEventListener("click", downloadPreset);
document.getElementById("generate").addEventListener("click", generate);
document.getElementById("copy").addEventListener("click", copyOutput);
