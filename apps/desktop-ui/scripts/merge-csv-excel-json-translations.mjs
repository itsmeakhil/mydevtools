/**
 * Merges Navigation, Dashboard.tools, and CsvExcelJson from
 * csv-excel-json-i18n-data.json into each locale messages/*.json (except en).
 * Run from repo root: node apps/web/scripts/merge-csv-excel-json-translations.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "csv-excel-json-i18n-data.json");
const messagesDir = path.join(__dirname, "../messages");

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

for (const [locale, payload] of Object.entries(data)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn("skip missing", locale);
    continue;
  }
  const j = JSON.parse(fs.readFileSync(filePath, "utf8"));
  j.Navigation = j.Navigation ?? {};
  j.Navigation.csvExcelJson = payload.nav;
  j.Dashboard = j.Dashboard ?? {};
  j.Dashboard.tools = j.Dashboard.tools ?? {};
  j.Dashboard.tools.csvExcelJson = {
    title: payload.dTitle,
    description: payload.dDesc,
  };
  j.CsvExcelJson = payload.tool;
  fs.writeFileSync(filePath, JSON.stringify(j, null, 2) + "\n");
}

console.log("Updated", Object.keys(data).length, "locale files");
