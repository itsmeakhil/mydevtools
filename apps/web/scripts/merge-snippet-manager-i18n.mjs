/**
 * Merges snippet-manager i18n: tool page (SnippetManager), sidebar/nav label, and
 * dashboard tool card (Navigation.snippetManager + Dashboard.tools.snippetManager).
 * Run from repo root (after `python3 apps/web/scripts/generate_snippet_manager_patches.py`):
 *   node apps/web/scripts/merge-snippet-manager-i18n.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");
const patchesPath = path.join(__dirname, "snippet-manager-patches.json");
const navDashPath = path.join(__dirname, "snippet-manager-nav-dash-patches.json");

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (
      v != null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof out[k] === "object" &&
      out[k] !== null &&
      !Array.isArray(out[k])
    ) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(path.join(messagesDir, "en.json"), "utf8"));
const base = structuredClone(en.SnippetManager);
const patches = JSON.parse(fs.readFileSync(patchesPath, "utf8"));
const navDashPatches = fs.existsSync(navDashPath)
  ? JSON.parse(fs.readFileSync(navDashPath, "utf8"))
  : {};

let n = 0;
for (const [locale, patch] of Object.entries(patches)) {
  if (locale === "en") continue;
  const fp = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(fp)) {
    console.warn("skip missing", locale);
    continue;
  }
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  j.SnippetManager = deepMerge(structuredClone(base), patch);

  const nd = navDashPatches[locale];
  if (nd) {
    j.Navigation = j.Navigation ?? {};
    j.Navigation.snippetManager = nd.navigation;
    j.Dashboard = j.Dashboard ?? {};
    j.Dashboard.tools = j.Dashboard.tools ?? {};
    j.Dashboard.tools.snippetManager = {
      title: nd.title,
      description: nd.description,
    };
  }

  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n");
  n += 1;
}
console.log("Updated SnippetManager + nav/dashboard snippet card in", n, "locale files");
