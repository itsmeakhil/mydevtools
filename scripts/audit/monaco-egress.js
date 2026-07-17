// Lab-only auth-gate bypass + Monaco egress probe.
// Stubs the Tauri activation call and seeds a persisted Firebase user in
// IndexedDB, loads a Monaco tool page, waits for the editor, and reports
// every third-party host contacted. Usage: node monaco-egress.js <url> <apiKey>
const puppeteer = require("puppeteer-core");

const [url, apiKey] = process.argv.slice(2);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: "new",
  });
  const page = await browser.newPage();

  const hosts = new Map();
  page.on("request", (r) => {
    const h = new URL(r.url()).host;
    hosts.set(h, (hosts.get(h) || 0) + 1);
  });
  // Firebase validates persisted users on init; a network failure keeps the
  // user (offline path). Blocking identitytoolkit keeps the lab user alive.
  const cdp2 = await page.createCDPSession();
  await cdp2.send("Network.enable");
  await cdp2.send("Network.setBlockedURLs", {
    urls: ["*identitytoolkit*", "*securetoken*"],
  });

  // Tauri activation stub on every document
  await page.evaluateOnNewDocument(() => {
    window.__TAURI_INTERNALS__ = {
      invoke: (cmd, args) => {
        if (cmd === "local_api" && args?.path === "/desktop/activation") {
          return Promise.resolve({
            status: 200,
            body: JSON.stringify({ uid: "lab", email: "lab@example.com" }),
          });
        }
        return Promise.resolve({ status: 404, body: "" });
      },
    };
  });

  // Seed the persisted Firebase user on a throwaway same-origin page and wait
  // for the IndexedDB write to land BEFORE the app boots (avoids init race).
  const origin = new URL(url).origin;
  await page.goto(origin + "/robots.txt", { waitUntil: "domcontentloaded" });
  await page.evaluate((key) => {
    const user = {
      uid: "lab",
      email: "lab@example.com",
      emailVerified: true,
      isAnonymous: false,
      providerData: [],
      stsTokenManager: {
        refreshToken: "lab-refresh",
        accessToken: "e30.e30.e30",
        expirationTime: Date.now() + 3600e3,
      },
      createdAt: "0",
      lastLoginAt: "0",
      apiKey: key,
      appName: "[DEFAULT]",
    };
    return new Promise((resolve, reject) => {
      const open = indexedDB.open("firebaseLocalStorageDb", 1);
      open.onupgradeneeded = () =>
        open.result.createObjectStore("firebaseLocalStorage", {
          keyPath: "fbase_key",
        });
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction("firebaseLocalStorage", "readwrite");
        tx.objectStore("firebaseLocalStorage").put({
          fbase_key: `firebase:authUser:${key}:[DEFAULT]`,
          value: user,
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      };
    });
  }, apiKey);
  hosts.clear();

  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  const editorFound = await page
    .waitForSelector(".monaco-editor", { timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  await new Promise((r) => setTimeout(r, 3000));

  const third = [...hosts.entries()].filter(
    ([h]) => !h.startsWith("localhost")
  );
  console.log(
    JSON.stringify(
      {
        url,
        finalUrl: page.url(),
        editorFound,
        thirdPartyHosts: Object.fromEntries(third),
        jsdelivrRequests: [...hosts.entries()]
          .filter(([h]) => h.includes("jsdelivr"))
          .reduce((n, [, c]) => n + c, 0),
      },
      null,
      1
    )
  );
  await browser.close();
})();
