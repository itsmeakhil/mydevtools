/**
 * Content script injected into mydevtools.tech tabs.
 * Relays extension imports to the page via window.postMessage. The web app
 * listens for `kind: "mdt-extension-import"` and stages a new tab.
 */

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "mdt-extension-import") return
    window.postMessage({ kind: "mdt-extension-import", payload: msg.payload }, window.location.origin)
})
