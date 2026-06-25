chrome.runtime.sendMessage({ type: "list-recent" }, (resp) => {
    const list = document.getElementById("list")
    list.innerHTML = ""
    if (!resp?.recent || resp.recent.length === 0) {
        list.textContent = "No captured requests yet. Trigger one in the page."
        return
    }
    for (const r of resp.recent) {
        const row = document.createElement("div")
        row.className = "row"
        row.innerHTML = `
            <span class="method">${r.method}</span>
            <span class="url" title="${r.url}">${r.url}</span>
            <button>Open</button>
        `
        row.querySelector("button").addEventListener("click", () => {
            chrome.runtime.sendMessage({ type: "send-to-mydevtools", payload: r }, (resp) => {
                if (resp?.ok) window.close()
            })
        })
        list.appendChild(row)
    }
})
