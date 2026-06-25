/**
 * mydevtools companion service worker.
 *
 * Listens for `webRequest.onBeforeSendHeaders` + `onCompleted` and stages the
 * request+response pair. Popup picks one and forwards to the mydevtools tab.
 */

const RECENT_CAP = 50
const recent = []

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.type === "main_frame") return
        if (!details.url.startsWith("http")) return
        const headers = {}
        for (const h of details.requestHeaders ?? []) headers[h.name] = h.value
        recent.unshift({
            id: details.requestId,
            method: details.method,
            url: details.url,
            headers,
            timestamp: Date.now(),
        })
        recent.length = Math.min(recent.length, RECENT_CAP)
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders", "extraHeaders"],
)

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "list-recent") {
        sendResponse({ recent })
        return true
    }
    if (msg?.type === "send-to-mydevtools") {
        forwardToMydevtools(msg.payload).then((ok) => sendResponse({ ok }))
        return true
    }
    return false
})

async function forwardToMydevtools(payload) {
    const tabs = await chrome.tabs.query({ url: ["https://mydevtools.tech/app/api-client*", "http://localhost:*/app/api-client*"] })
    if (tabs.length === 0) {
        await chrome.tabs.create({ url: "https://mydevtools.tech/app/api-client" })
        return false
    }
    const tab = tabs[0]
    await chrome.tabs.sendMessage(tab.id, { type: "mdt-extension-import", payload })
    await chrome.tabs.update(tab.id, { active: true })
    return true
}
