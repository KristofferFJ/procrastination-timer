const textarea = document.getElementById("siteList");
const saveButton = document.getElementById("save");

browser.storage.local.get("userTrackedSites").then(data => {
    if (data.userTrackedSites) {
        textarea.value = data.userTrackedSites.join("\n");
    }
});

saveButton.addEventListener("click", () => {
    const list = textarea.value
        .split("\n")
        .map(site => site.trim())
        .filter(site => site.length > 0);

    browser.storage.local.set({userTrackedSites: list});
    alert("Tracked sites saved!");
});
