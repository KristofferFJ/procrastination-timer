let activeTabId = null;
let activeStartTime = null;
let activeHost = null;
let timeSpent = {};
let lastDate = new Date().toDateString();
let totalSeconds = 0;
drawTimeIcon(totalSeconds, true);
let trackedSites = [];

browser.storage.local.get("userTrackedSites").then(data => {
    trackedSites = data.userTrackedSites;
});

function getHost(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return null;
    }
}

function isTracked(hostname) {
    if (!hostname) return false;

    const normalized = hostname.toLowerCase().replace(/^www\./, "");

    return trackedSites.some(site => {
        const target = site.toLowerCase().replace(/^www\./, "");
        return normalized === target;
    });
}

function handleTabChange(tabId, url) {
    const now = Date.now();
    const today = new Date().toDateString();

    if (today !== lastDate) {
        timeSpent = {};
        lastDate = today;
    }

    if (activeTabId && activeStartTime && activeHost) {
        const delta = Math.floor((now - activeStartTime) / 1000);
        timeSpent[activeHost] = (timeSpent[activeHost] || 0) + delta;
        browser.storage.local.set({timeSpent});
    }

    totalSeconds = Object.entries(timeSpent).reduce((acc, [_, sec]) => acc + sec, 0);

    if (!isTracked(getHost(url))) {
        activeTabId = null;
        activeHost = null;
        activeStartTime = null;
        drawTimeIcon(totalSeconds, true);
        return;
    }

    activeTabId = tabId;
    activeStartTime = now;
    activeHost = getHost(url);
}

setInterval(() => {
    if (!activeTabId) {
        return;
    }

    drawTimeIcon(totalSeconds++);
}, 1000);

function drawTimeIcon(sec, paused = false) {
    const size = 38;
    const borderWidth = 3;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");

    // === 1. Draw solid background (inner box only) ===
    let bgColor = "#00FF00";
    if (sec >= 3600) bgColor = "#FF0000";
    else if (sec >= 1800) bgColor = "#FFFF00";

    ctx.fillStyle = bgColor;
    ctx.fillRect(borderWidth, borderWidth, size - 2 * borderWidth, size - 2 * borderWidth);

    // === 2. Draw striped border if paused ===
    if (paused) {
        const stripeSpacing = 4;
        for (let i = -size; i < size * 2; i += stripeSpacing) {
            ctx.strokeStyle = i % (stripeSpacing * 2) === 0 ? "#FFFFFF" : "#000000";
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i - size, size);
            ctx.stroke();
        }

        // Clip a rectangle inside so we don't stripe over the center
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "black";
        ctx.fillRect(borderWidth, borderWidth, size - 2 * borderWidth, size - 2 * borderWidth);
        ctx.globalCompositeOperation = "source-over";
    } else {
        // Optional solid black border if active
        ctx.strokeStyle = "black";
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(borderWidth / 2, borderWidth / 2, size - borderWidth, size - borderWidth);
    }

    // === 3. Draw the time text ===
    let label = sec >= 3600 ? `${Math.floor(sec / 3600)}h`
        : sec >= 60 ? `${Math.floor(sec / 60)}m`
            : `${sec}s`;

    ctx.fillStyle = "black";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, size / 2, size / 2);

    // === 4. Apply the icon ===
    const imageData = ctx.getImageData(0, 0, size, size);
    browser.browserAction.setIcon({imageData});
}

browser.tabs.onActivated.addListener(async ({tabId}) => {
    const tab = await browser.tabs.get(tabId);
    handleTabChange(tabId, tab.url);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.status === 'complete') {
        handleTabChange(tabId, tab.url);
    }
});

browser.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
        handleTabChange(null, null); // Pause timer
    } else {
        browser.tabs.query({active: true, windowId}).then(tabs => {
            if (tabs.length > 0) handleTabChange(tabs[0].id, tabs[0].url);
        });
    }
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "getTimeData") {
        sendResponse({timeSpent});
    }
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.userTrackedSites) {
        trackedSites = changes.userTrackedSites.newValue || [];
        console.log("Tracked sites updated:", trackedSites);
    }
});

browser.runtime.onInstalled.addListener(({reason}) => {
    if (reason === "install") {
        browser.storage.local.get("userTrackedSites").then(data => {
            if (!data.userTrackedSites) {
                browser.storage.local.set({
                    userTrackedSites: [
                        "reddit.com",
                        "youtube.com",
                        "twitter.com",
                        "x.com",
                        "facebook.com",
                    ]
                });
                console.log("Default tracked sites initialized.");
            }
        });
    }
});
