function formatSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
}

browser.runtime.sendMessage({type: "getTimeData"}).then(res => {
    const container = document.getElementById("list");
    const data = res.timeSpent || {};
    Object.keys(data).forEach(site => {
        const div = document.createElement("div");
        div.className = "site";
        div.textContent = `${site}: ${formatSeconds(data[site])}`;
        container.appendChild(div);
    });
});
