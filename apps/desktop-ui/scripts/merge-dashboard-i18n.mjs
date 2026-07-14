/**
 * One-off: copy Dashboard.tabs, Dashboard.analytics, Dashboard.ui from en.json into all other locale files.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");
const enPath = path.join(messagesDir, "en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const tabs = en.Dashboard?.tabs;
const analytics = en.Dashboard?.analytics;
const ui = en.Dashboard?.ui;
if (!tabs || !analytics || !ui) {
  console.error("en.json missing Dashboard.tabs/analytics/ui");
  process.exit(1);
}

for (const f of fs.readdirSync(messagesDir)) {
  if (!f.endsWith(".json") || f === "en.json") continue;
  const p = path.join(messagesDir, f);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.Dashboard = j.Dashboard || {};
  j.Dashboard.tabs = { ...tabs };
  j.Dashboard.analytics = { ...analytics };
  j.Dashboard.ui = { ...ui };
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
}
console.log("Merged Dashboard tabs/analytics/ui into all non-en locales.");
