async function copyDiscord() {
    const button = document.getElementById("discord-button");
    try {
        await navigator.clipboard.writeText("limifaooooo");
    } catch (error) {
        const input = document.createElement("input");
        input.value = "limifaooooo";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
    }
    button.textContent = "Username copied!";
    setTimeout(() => button.textContent = "Discord: limifaooooo", 1500);
}

document.getElementById("discord-button").addEventListener("click", copyDiscord);
